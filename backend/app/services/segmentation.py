from datetime import date, timedelta
import numpy as np
import pandas as pd
from app.schemas import Customers, Segment

METHODOLOGY = ('RFM uses purchases by identified customers within the active filters. Recency is days '
               'before the selected end date plus one day. R scores: <=30:5, <=60:4, <=90:3, <=180:2, else:1. '
               'F scores: >=10:5, >=5:4, >=3:3, >=2:2, else:1. M scores (GBP): >=2000:5, >=1000:4, '
               '>=500:3, >=200:2, else:1. Champions R>=4/F>=4/M>=4; Loyal R>=3/F>=3; '
               'Potential Loyalists R>=3; At Risk R<=2/F>=2; otherwise Hibernating. Rules are applied in order. '
               'These descriptive rules are not predictions. Returns are excluded from RFM monetary value.')


def customers(frame: pd.DataFrame, end: date) -> Customers:
    purchases = frame.loc[~frame['IsReturn']]
    known = purchases.loc[purchases['CustomerID'].notna()]
    reference = pd.Timestamp(end + timedelta(days=1))
    grouped = known.groupby('CustomerID').agg(last=('InvoiceDate', 'max'), frequency=('InvoiceNo', 'nunique'), monetary=('Value', 'sum'))
    grouped['recency'] = (reference - grouped['last'].dt.normalize()).dt.days
    r = np.select([grouped.recency <= 30, grouped.recency <= 60, grouped.recency <= 90, grouped.recency <= 180], [5, 4, 3, 2], default=1)
    f = np.select([grouped.frequency >= 10, grouped.frequency >= 5, grouped.frequency >= 3, grouped.frequency >= 2], [5, 4, 3, 2], default=1)
    m = np.select([grouped.monetary >= 2000, grouped.monetary >= 1000, grouped.monetary >= 500, grouped.monetary >= 200], [5, 4, 3, 2], default=1)
    grouped['segment'] = np.select([(r >= 4) & (f >= 4) & (m >= 4), (r >= 3) & (f >= 3), r >= 3, (r <= 2) & (f >= 2)],
                                   ['Champions', 'Loyal Customers', 'Potential Loyalists', 'At Risk'], default='Hibernating')
    count = len(grouped)
    repeat = int((grouped.frequency >= 2).sum())
    segments = []
    for name in ['Champions', 'Loyal Customers', 'Potential Loyalists', 'At Risk', 'Hibernating']:
        g = grouped.loc[grouped.segment == name]
        segments.append(Segment(segment=name, customers=len(g), revenue=round(float(g.monetary.sum()), 2),
                                share=round(len(g) / count * 100, 2) if count else 0,
                                avg_recency=round(float(g.recency.mean()), 1) if len(g) else 0,
                                avg_frequency=round(float(g.frequency.mean()), 1) if len(g) else 0))
    revenue = round(float(known.Value.sum()), 2)
    return Customers(identified=count, repeat=repeat, repeat_percent=round(repeat / count * 100, 2) if count else None,
                     revenue=revenue, revenue_per_customer=round(revenue / count, 2) if count else None,
                     anonymous_revenue=round(float(purchases.loc[purchases.CustomerID.isna(), 'Value'].sum()), 2),
                     segments=segments, reference_date=reference.date().isoformat(), methodology=METHODOLOGY)
