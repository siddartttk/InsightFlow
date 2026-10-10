import io
from datetime import date
from typing import Annotated, Literal
import os
import pandas as pd
from fastapi import FastAPI, Header, Query, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from app.schemas import Metadata, Overview, Revenue, Products, Customers, Insights, UploadResult, Segment
from app.core.store import store, Dataset, TTL, UPLOADS_ENABLED
from app.services.validation import normalize, COLUMNS
from app.services import analytics, segmentation, insights
from app.core.middleware import RequestLimits

app = FastAPI(title='InsightFlow API', version='1.0.0', description='Retail analytics with documented metrics and isolated ephemeral CSV sessions.')
origins = [o.strip() for o in os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',') if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=['GET', 'POST', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])
app.add_middleware(RequestLimits)


class Dashboard(BaseModel):
    overview: Overview
    revenue: Revenue
    products: Products
    customers: Customers
    insights: Insights


def dataset(authorization: Annotated[str | None, Header()] = None) -> Dataset:
    return store.get(authorization)


def dashboard(
    data: Annotated[Dataset, Depends(dataset)],
    start: date | None = None, end: date | None = None,
    country: Annotated[str | None, Query(max_length=100)] = None,
    interval: Literal['daily', 'weekly', 'monthly'] = 'monthly',
) -> Dashboard:
    start = start or data.frame.InvoiceDate.min().date()
    end = end or data.frame.InvoiceDate.max().date()
    if start > end:
        raise HTTPException(422, 'Start date must be on or before end date.')
    if (end - start).days > 3660:
        raise HTTPException(422, 'Choose a date range of at most ten years.')
    if start < date(1901, 1, 1) or end > date(2099, 12, 30):
        raise HTTPException(422, 'Choose dates between 1901-01-01 and 2099-12-30.')
    key = (start, end, country, interval)
    with data.lock:
        if key in data.cache:
            return data.cache[key]
    frame = analytics.filter_data(data.frame, start, end, country)
    o = analytics.overview(data.frame, start, end, country)
    r = analytics.revenue(frame, start, end, interval)
    p = analytics.products(frame)
    c = segmentation.customers(frame, end)
    result = Dashboard(overview=o, revenue=r, products=p, customers=c, insights=insights.insights(o, r, p, c))
    with data.lock:
        if len(data.cache) >= 32:
            data.cache.pop(next(iter(data.cache)))
        data.cache[key] = result
    return result


@app.get('/health')
def health():
    return {'status': 'ok', 'version': '1.0.0'}


@app.get('/api/meta', response_model=Metadata)
def meta(data: Annotated[Dataset, Depends(dataset)]):
    return data.metadata()


@app.get('/api/dashboard', response_model=Dashboard)
def get_dashboard(result: Annotated[Dashboard, Depends(dashboard)]):
    return result


@app.get('/api/overview', response_model=Overview)
def get_overview(result: Annotated[Dashboard, Depends(dashboard)]):
    return result.overview


@app.get('/api/revenue', response_model=Revenue)
def get_revenue(result: Annotated[Dashboard, Depends(dashboard)]):
    return result.revenue


@app.get('/api/products', response_model=Products)
def get_products(result: Annotated[Dashboard, Depends(dashboard)]):
    return result.products


@app.get('/api/customers', response_model=Customers)
def get_customers(result: Annotated[Dashboard, Depends(dashboard)]):
    return result.customers


@app.get('/api/segments', response_model=list[Segment])
def get_segments(result: Annotated[Dashboard, Depends(dashboard)]):
    return result.customers.segments


@app.get('/api/insights', response_model=Insights)
def get_insights(result: Annotated[Dashboard, Depends(dashboard)]):
    return result.insights


@app.post('/api/upload', response_model=UploadResult)
def upload(file: UploadFile):
    if not UPLOADS_ENABLED:
        raise HTTPException(403, 'Private uploads are disabled on this deployment. Explore the demonstration dataset.')
    if not (file.filename or '').lower().endswith('.csv'):
        raise HTTPException(422, 'Please upload a UTF-8 CSV file.')
    content = file.file.read(5 * 1024 * 1024 + 1)
    file.file.close()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, 'CSV files must be 5 MB or smaller.')
    try:
        raw = pd.read_csv(io.BytesIO(content), dtype='string', encoding='utf-8-sig', nrows=100_001)
        if len(raw) > 100_000:
            raise ValueError('Upload at most 100,000 transaction rows.')
        frame, quality = normalize(raw)
        if frame.empty:
            raise ValueError('No valid transactions remain after validation. Check dates, positive prices, nonzero integer quantities and invoice/product IDs.')
        if frame.InvoiceDate.min() < pd.Timestamp('1901-01-01') or frame.InvoiceDate.max() > pd.Timestamp('2099-12-30'):
            raise ValueError('Invoice dates must be between 1901-01-01 and 2099-12-30.')
    except (ValueError, UnicodeError, pd.errors.ParserError, pd.errors.EmptyDataError) as exc:
        # Do not echo parser errors that might contain private records.
        detail = str(exc) if type(exc) is ValueError else 'CSV could not be read. Use UTF-8 encoding and consistent columns.'
        raise HTTPException(422, detail) from None
    data = Dataset(frame, quality, 'Your uploaded dataset', 'Private CSV upload. Stored in API process memory only.', False)
    token = store.add(data)
    preview = frame[[c for c in COLUMNS if c != 'CustomerID']].head(5).copy()
    preview['InvoiceDate'] = preview.InvoiceDate.dt.strftime('%Y-%m-%d %H:%M')
    records = preview.astype(object).where(pd.notna(preview), None).to_dict('records')
    return UploadResult(token=token, expires_in=TTL, metadata=data.metadata(), preview=records)


@app.delete('/api/session', status_code=204)
def delete_session(authorization: Annotated[str | None, Header()] = None):
    store.delete(authorization)
    return Response(status_code=204)


def safe_csv(frame: pd.DataFrame) -> str:
    # Protect spreadsheet users against formula injection in uploaded text fields.
    for column in frame.select_dtypes(include=['object', 'string']).columns:
        frame[column] = frame[column].map(lambda v: "'" + v if isinstance(v, str) and v.lstrip().startswith(('=', '+', '-', '@', '\t', '\r')) else v)
    return frame.to_csv(index=False)


@app.get('/api/export')
def export(result: Annotated[Dashboard, Depends(dashboard)], report: Literal['kpis', 'products', 'segments'] = 'kpis'):
    if report == 'kpis':
        records = [m.model_dump() for m in result.overview.metrics]
    elif report == 'products':
        records = [p.model_dump() for p in result.products.products]
    else:
        records = [s.model_dump() for s in result.customers.segments]
    columns = {'products': ['code', 'description', 'revenue', 'quantity', 'orders', 'share'], 'segments': ['segment', 'customers', 'revenue', 'share', 'avg_recency', 'avg_frequency']}
    frame = pd.DataFrame(records, columns=columns.get(report))
    return Response(safe_csv(frame), media_type='text/csv', headers={'Content-Disposition': f'attachment; filename="insightflow-{report}.csv"', 'Cache-Control': 'no-store'})
