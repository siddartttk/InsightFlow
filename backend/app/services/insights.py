from app.schemas import Overview, Revenue, Products, Customers, Insights, Insight


def insights(overview: Overview, revenue: Revenue, products: Products, customers: Customers) -> Insights:
    result = []
    if products.products:
        top = products.products[0]
        result.append(Insight(category='Product performance', title='Your leading product', detail=f'{top.description} contributes {top.share:.1f}% of gross sales.', evidence=f'Sum of purchase value for stock code {top.code}: GBP {top.revenue:,.2f}.'))
        share = round(sum(p.share for p in products.products[:5]), 2)
        result.append(Insight(category='Sales concentration', title='Where revenue is concentrated', detail=f'The top five products account for {share:.1f}% of gross sales.', evidence='Sum of the five largest product revenue shares. Unnamed products are excluded from rankings.'))
    if revenue.countries:
        c = revenue.countries[0]
        result.append(Insight(category='Market contribution', title='Your strongest market', detail=f'{c.country} generates {c.share:.1f}% of gross sales.', evidence=f'Qualifying purchase revenue: GBP {c.revenue:,.2f} across {c.orders:,} distinct invoices.'))
    # Avoid comparing unequal partial buckets at the boundaries.
    points = revenue.series[1:-1]
    growth = [(a, b, (b.gross - a.gross) / a.gross * 100) for a, b in zip(points, points[1:]) if a.gross > 0]
    if growth:
        a, b, delta = max(growth, key=lambda item: item[2])
        result.append(Insight(category='Revenue movement', title='Largest period-to-period movement', detail=f'The period starting {b.date} changed by {delta:+.1f}% from the previous period.', evidence=f'Gross sales: GBP {a.gross:,.2f} to GBP {b.gross:,.2f}. Boundary buckets are excluded.'))
    for metric in overview.metrics:
        if metric.key in ['aov', 'repeat'] and metric.change is not None and abs(metric.change) >= 5:
            result.append(Insight(category='Period comparison', title=metric.title + ' changed', detail=f'{metric.change:+.1f}% relative change against the previous equal-length date range.', evidence=f'Current value {metric.value:,.2f}; comparison {overview.previous_start} to {overview.previous_end}. Threshold: absolute relative change of at least 5%.'))
    if customers.identified:
        at_risk = next(s for s in customers.segments if s.segment == 'At Risk')
        result.append(Insight(category='Customer activity', title='Customers to reconnect with', detail=f'{at_risk.customers:,} identified customers fall in the At Risk segment.', evidence='Recency score <=2 and frequency score >=2, using purchases in the active filters. This is a descriptive segment, not a churn prediction.'))
    return Insights(insights=result, methodology='Deterministic rules on filtered aggregates. Product and country shares use gross sales. Temporal comparisons exclude partial boundary buckets; a minimum 5% relative change triggers AOV and repeat-rate observations. No LLM or predictive model is used.')
