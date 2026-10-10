import io
from datetime import date
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.store import store, Dataset, Store
from app.services.validation import normalize, COLUMNS
from app.services.analytics import values, filter_data, overview, revenue, products
from app.services.segmentation import customers


def raw_rows():
    return [
        ['100', 'A', 'Mug', 2, '2024-01-01 10:00', 10, '1', 'UK'],
        ['100', 'B', 'Bowl', 1, '2024-01-01 10:00', 5, '1', 'UK'],
        ['101', 'A', 'Mug', 3, '2024-01-02 23:59', 10, '1', 'UK'],
        ['102', 'A', 'Mug', 1, '2024-01-03', 10, None, 'France'],
        ['103', 'B', 'Bowl', 2, '2024-01-03', 5, '2', 'UK'],
        ['C100', 'A', 'Mug', -1, '2024-01-04', 10, '1', 'UK'],
        ['104', 'A', 'Mug', -1, '2024-01-04', 10, '1', 'UK'],
        ['C105', 'B', 'Bowl', 1, '2024-01-04', 5, '2', 'UK'],
    ]


@pytest.fixture
def frame():
    return normalize(pd.DataFrame(raw_rows(), columns=COLUMNS))[0]


@pytest.fixture
def client(frame):
    old_demo = store._demo
    _, quality = normalize(pd.DataFrame(raw_rows(), columns=COLUMNS))
    store._demo = Dataset(frame, quality, 'Test dataset', 'Testing only', True)
    store.sessions.clear()
    with TestClient(app) as client:
        yield client
    store._demo = old_demo
    store.sessions.clear()


def test_gross_net_and_returns(frame):
    v = values(frame)
    assert v['gross'] == 75
    assert v['returns'] == 25
    assert v['net'] == 50


def test_distinct_orders_aov_and_missing_customers(frame):
    v = values(frame)
    assert v['orders'] == 4
    assert v['aov'] == 18.75
    assert v['customers'] == 2
    assert v['repeat'] == 50


def test_inclusive_filter_and_country(frame):
    filtered = filter_data(frame, date(2024, 1, 2), date(2024, 1, 3), 'UK')
    assert values(filtered)['gross'] == 40
    assert len(filtered) == 2


def test_empty_dataset(frame):
    empty = frame.iloc[:0]
    v = values(empty)
    assert v['net'] == 0 and v['orders'] == 0
    assert v['aov'] is None and v['repeat'] is None
    assert customers(empty, date(2024, 1, 4)).identified == 0
    assert not products(empty).products
    r = revenue(empty, date(2024, 1, 1), date(2024, 1, 3), 'daily')
    assert len(r.series) == 3 and all(p.net == 0 for p in r.series)


def test_duplicates_and_invalid_rows():
    rows = raw_rows()
    rows += [rows[0], ['BAD', 'A', 'Bad', 0, '2024-01-01', 10, '1', 'UK'], ['BAD2', 'A', 'Bad', 1, 'oops', 10, '1', 'UK'], ['BAD3', 'A', 'Bad', 1, '2024-01-01', -10, '1', 'UK'], ['BAD4', 'A', 'Bad', 1.5, '2024-01-01', 10, '1', 'UK'], ['BAD5', 'A', 'Bad', 1, '2024-01-01', float('inf'), '1', 'UK']]
    cleaned, q = normalize(pd.DataFrame(rows, columns=COLUMNS))
    assert q.duplicate_rows == 1
    assert q.invalid_rows == 5
    assert q.invalid_date_rows == 1
    assert q.invalid_price_rows == 2
    assert q.invalid_quantity_rows == 2
    assert q.retained_rows == 8
    assert q.input_rows == q.duplicate_rows + q.invalid_rows + q.retained_rows
    assert values(cleaned)['gross'] == 75


def test_missing_description_and_country_retained():
    cleaned, quality = normalize(pd.DataFrame([['100', 'A', None, 2, '2024-01-01', 10, None, None]], columns=COLUMNS))
    assert quality.missing_description_rows == quality.missing_country_rows == quality.missing_customer_rows == 1
    assert values(cleaned)['gross'] == 20
    assert products(cleaned).excluded_revenue == 20
    assert not products(cleaned).products
    assert cleaned.Country.iloc[0] == 'Unknown'


def test_rfm_recency_and_frequency(frame):
    result = customers(frame, date(2024, 1, 4))
    assert result.identified == 2 and result.repeat == 1
    assert result.revenue == 65 and result.anonymous_revenue == 10
    segment = next(s for s in result.segments if s.segment == 'Potential Loyalists')
    assert segment.customers == 2 and segment.avg_frequency == 1.5
    assert segment.avg_recency == 2.5


def test_all_rfm_segments():
    specs = [('champion', 10, '2024-12-20', 250), ('loyal', 3, '2024-12-20', 10), ('potential', 1, '2024-12-20', 10), ('risk', 2, '2024-04-01', 10), ('sleep', 1, '2024-04-01', 10)]
    rows = [[f'INV-{name}-{i}', 'A', 'Mug', 1, day, value, name, 'UK'] for name, count, day, value in specs for i in range(count)]
    frame, _ = normalize(pd.DataFrame(rows, columns=COLUMNS))
    result = customers(frame, date(2024, 12, 31))
    assert all(s.customers == 1 for s in result.segments)


def test_comparison_requires_full_previous_range(frame):
    result = overview(frame, date(2024, 1, 3), date(2024, 1, 4), None)
    assert result.comparison_available
    gross = next(m for m in result.metrics if m.key == 'gross')
    assert gross.change == pytest.approx(-63.64)
    unavailable = overview(frame, date(2024, 1, 1), date(2024, 1, 4), None)
    assert not unavailable.comparison_available
    assert all(m.change is None for m in unavailable.metrics)


def test_period_totals_consistent(frame):
    for interval in ['daily', 'weekly', 'monthly']:
        r = revenue(frame, date(2024, 1, 1), date(2024, 1, 4), interval)
        assert sum(p.gross for p in r.series) == 75
        assert sum(p.net for p in r.series) == 50
    p = products(frame)
    assert sum(item.revenue for item in p.products) == 75
    assert sum(item.quantity for item in p.products) == 9


@pytest.mark.parametrize('content,name', [(b'bad,csv\n1,2', 'bad.csv'), (b'', 'empty.csv'), (b'a', 'file.xlsx'), (','.join(COLUMNS).encode(), 'header.csv'), (b'\xff\xfe', 'bad.csv')])
def test_invalid_uploads(client, content, name):
    response = client.post('/api/upload', files={'file': (name, content, 'text/csv')})
    assert response.status_code == 422


def upload(client, rows):
    return client.post('/api/upload', files={'file': ('retail.csv', pd.DataFrame(rows, columns=COLUMNS).to_csv(index=False), 'text/csv')})


def test_session_isolation_preview_and_deletion(client):
    a = upload(client, raw_rows()[:2]).json()
    b = upload(client, raw_rows()[2:3]).json()
    assert a['token'] != b['token']
    assert 'CustomerID' not in a['preview'][0]
    def gross(token=None):
        response = client.get('/api/overview', headers={'Authorization': 'Bearer ' + token} if token else {})
        return response.json()['metrics'][0]['value']
    assert gross(a['token']) == 25
    assert gross(b['token']) == 30
    assert gross() == 75
    assert client.get('/api/meta', headers={'Authorization': 'Bearer invalid'}).status_code == 401
    assert client.delete('/api/session', headers={'Authorization': 'Bearer ' + a['token']}).status_code == 204
    assert client.get('/api/meta', headers={'Authorization': 'Bearer ' + a['token']}).status_code == 401
    assert gross(b['token']) == 30


def test_session_expiration(client):
    result = upload(client, raw_rows()[:2]).json()
    token = result['token']
    store.sessions[token] = (0, store.sessions[token][1])
    assert client.get('/api/meta', headers={'Authorization': 'Bearer ' + token}).status_code == 401
    assert token not in store.sessions


def test_upload_limits(client):
    response = client.post('/api/upload', files={'file': ('large.csv', b'a' * (5 * 1024 * 1024 + 1), 'text/csv')})
    assert response.status_code == 413


def test_alias_mapping(client):
    csv = 'order_id,sku,product_name,qty,order_date,price,customer_id,market\n1,A,Mug,2,2024-01-01,10,,UK\n'
    response = client.post('/api/upload', files={'file': ('aliases.csv', csv, 'text/csv')})
    assert response.status_code == 200
    assert response.json()['metadata']['quality']['missing_customer_rows'] == 1


def test_export_consistency(client):
    filters = {'start': '2024-01-02', 'end': '2024-01-03', 'country': 'UK'}
    overview_response = client.get('/api/overview', params=filters).json()
    exported = client.get('/api/export', params={**filters, 'report': 'kpis'})
    csv = pd.read_csv(io.StringIO(exported.text)).set_index('key')
    assert csv.loc['gross', 'value'] == overview_response['metrics'][0]['value'] == 40
    products_csv = pd.read_csv(io.StringIO(client.get('/api/export', params={**filters, 'report': 'products'}).text))
    assert products_csv.revenue.sum() == 40
    segments_csv = pd.read_csv(io.StringIO(client.get('/api/export', params={**filters, 'report': 'segments'}).text))
    assert segments_csv.customers.sum() == 2


def test_formula_injection_escaped(client):
    rows = [['1', '=CODE()', '=HYPERLINK("bad")', 1, '2024-01-01', 10, None, 'UK']]
    token = upload(client, rows).json()['token']
    response = client.get('/api/export?report=products', headers={'Authorization': 'Bearer ' + token})
    csv = pd.read_csv(io.StringIO(response.text))
    assert csv.code.iloc[0].startswith("'=") and csv.description.iloc[0].startswith("'=")


@pytest.mark.parametrize('params', [{'start': '2024-02-01', 'end': '2024-01-01'}, {'start': 'not-a-date'}, {'interval': 'yearly'}, {'start': '1901-01-01', 'end': '2024-01-01'}])
def test_invalid_filters(client, params):
    assert client.get('/api/dashboard', params=params).status_code == 422


def test_empty_exports_have_headers(client):
    response = client.get('/api/export?start=2025-01-01&end=2025-01-02&report=products')
    assert 'code,description,revenue,quantity,orders,share' in response.text


def test_health_and_explicit_cors(client):
    assert client.get('/health').json()['status'] == 'ok'
    assert client.get('/health', headers={'Origin': 'http://localhost:3000'}).headers['access-control-allow-origin'] == 'http://localhost:3000'
    assert 'access-control-allow-origin' not in client.get('/health', headers={'Origin': 'https://unknown.example'}).headers


def test_response_cache_protection(client):
    response = client.get('/api/overview')
    assert response.headers['cache-control'] == 'no-store'
    assert response.headers['x-content-type-options'] == 'nosniff'


def test_chunked_body_limit_before_parsing(client):
    chunks = iter([b'a' * (1024 * 1024)] * 6)
    response = client.post('/api/upload', content=chunks, headers={'content-type': 'application/octet-stream'})
    assert response.status_code == 413


def test_public_upload_disable(client, monkeypatch):
    import app.main as api_module
    monkeypatch.setattr(api_module, 'UPLOADS_ENABLED', False)
    assert upload(client, raw_rows()).status_code == 403


def test_session_capacity_does_not_overwrite(client, monkeypatch):
    import app.core.store as store_module
    monkeypatch.setattr(store_module, 'MAX_SESSIONS', 1)
    first = upload(client, raw_rows()[:2]).json()
    assert upload(client, raw_rows()[2:3]).status_code == 503
    assert client.get('/api/overview', headers={'Authorization': 'Bearer ' + first['token']}).json()['metrics'][0]['value'] == 25


def test_insight_evidence_uses_aggregates(client):
    result = client.get('/api/insights').json()
    product = next(i for i in result['insights'] if i['category'] == 'Product performance')
    assert '80.0%' in product['detail'] and '60.00' in product['evidence']
