from datetime import date, timedelta
import pandas as pd
from app.schemas import Overview, Metric, Revenue, RevenuePoint, Country, Products, Product


def filter_data(frame: pd.DataFrame, start: date, end: date, country: str | None = None) -> pd.DataFrame:
    mask = (frame.InvoiceDate >= pd.Timestamp(start)) & (frame.InvoiceDate < pd.Timestamp(end + timedelta(days=1)))
    if country:
        mask &= frame.Country == country
    return frame.loc[mask]


def values(frame: pd.DataFrame) -> dict[str, float | None]:
    purchases = frame.loc[~frame.IsReturn]
    known = purchases.loc[purchases.CustomerID.notna()]
    counts = known.groupby('CustomerID').InvoiceNo.nunique()
    gross = round(float(purchases.Value.sum()), 2)
    orders = int(purchases.InvoiceNo.nunique())
    return dict(gross=gross, net=round(float(frame.Value.sum()), 2), orders=orders,
                aov=round(gross / orders, 2) if orders else None, customers=len(counts),
                repeat=round(float((counts >= 2).sum()) / len(counts) * 100, 2) if len(counts) else None,
                returns=round(float(-frame.loc[frame.IsReturn, 'Value'].sum()), 2))


def overview(all_data: pd.DataFrame, start: date, end: date, country: str | None) -> Overview:
    current = filter_data(all_data, start, end, country)
    duration = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    previous_start = start - timedelta(days=duration)
    available = not all_data.empty and pd.Timestamp(previous_start) >= all_data.InvoiceDate.min().normalize() and pd.Timestamp(previous_end) <= all_data.InvoiceDate.max().normalize()
    now = values(current)
    previous = values(filter_data(all_data, previous_start, previous_end, country))
    definitions = [
        ('gross', 'Gross sales', 'currency', 'Positive purchase value, excluding cancellations.'),
        ('net', 'Net sales', 'currency', 'Gross sales less the absolute value of returns and cancellations.'),
        ('orders', 'Purchase orders', 'number', 'Distinct qualifying purchase invoices, not transaction rows.'),
        ('aov', 'Average order value', 'currency', 'Gross sales divided by distinct purchase invoices.'),
        ('customers', 'Identified customers', 'number', 'Distinct known customer IDs with qualifying purchases.'),
        ('repeat', 'Returning customers', 'percent', 'Identified customers with at least two distinct purchase invoices.'),
        ('returns', 'Returns & cancellations', 'currency', 'Absolute value of cancellation invoices and negative quantities.'),
    ]
    metrics = []
    for key, title, unit, description in definitions:
        change = None
        a, b = now[key], previous[key]
        if available and a is not None and b is not None and b != 0:
            change = round((a - b) / abs(b) * 100, 2)
        metrics.append(Metric(key=key, title=title, value=a, unit=unit, description=description, change=change))
    return Overview(metrics=metrics, comparison_available=available, previous_start=previous_start.isoformat(), previous_end=previous_end.isoformat(), rows=len(current))


def revenue(frame: pd.DataFrame, start: date, end: date, interval: str) -> Revenue:
    frequencies = {'daily': 'D', 'weekly': 'W-SUN', 'monthly': 'M'}
    freq = frequencies[interval]
    periods = pd.period_range(start=start, end=end, freq=freq)
    grouped = {period: g for period, g in frame.groupby(frame.InvoiceDate.dt.to_period(freq))}
    series = []
    for period in periods:
        g = grouped.get(period, frame.iloc[:0])
        v = values(g)
        series.append(RevenuePoint(date=period.start_time.date().isoformat(), gross=v['gross'], net=v['net'], returns=v['returns'], orders=int(v['orders']), rows=len(g), aov=v['aov']))
    purchases = frame.loc[~frame.IsReturn]
    total = float(purchases.Value.sum())
    countries = []
    for country, g in purchases.groupby('Country'):
        val = round(float(g.Value.sum()), 2)
        countries.append(Country(country=country, revenue=val, share=round(val / total * 100, 2) if total else 0, orders=g.InvoiceNo.nunique()))
    return Revenue(series=series, countries=sorted(countries, key=lambda c: c.revenue, reverse=True))


def products(frame: pd.DataFrame) -> Products:
    purchases = frame.loc[~frame.IsReturn]
    ranked = purchases.loc[purchases.Description.notna()]
    gross = float(purchases.Value.sum())
    result = []
    if not ranked.empty:
        totals = ranked.groupby('StockCode').agg(revenue=('Value', 'sum'), quantity=('Quantity', 'sum'), orders=('InvoiceNo', 'nunique'))
        counts = ranked.groupby(['StockCode', 'Description']).size().reset_index(name='count')
        labels = counts.sort_values(['count', 'Description'], ascending=[False, True]).drop_duplicates('StockCode').set_index('StockCode').Description
        totals['description'] = labels
        for row in totals.itertuples():
            val = round(float(row.revenue), 2)
            result.append(Product(code=str(row.Index), description=str(row.description), revenue=val,
                                  quantity=int(row.quantity), orders=int(row.orders), share=round(val / gross * 100, 2) if gross else 0))
    return Products(products=sorted(result, key=lambda p: p.revenue, reverse=True), ranked_revenue=round(float(ranked.Value.sum()), 2), excluded_revenue=round(float(purchases.loc[purchases.Description.isna(), 'Value'].sum()), 2))
