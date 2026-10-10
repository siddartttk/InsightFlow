"""Explicitly synthetic fallback. No fabricated historical claims."""
import json
import sys
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.services.validation import COLUMNS, normalize


def generate():
    rng = np.random.default_rng(42)
    products = [('S001', 'Ceramic breakfast mug', 4.95), ('S002', 'Linen market tote', 8.5), ('S003', 'Brass candle holder', 12.75), ('S004', 'Botanical notebook', 3.95), ('S005', 'Oak serving board', 18.5), ('S006', 'Glass bud vase', 6.25), ('S007', 'Cotton tea towel', 4.25), ('S008', 'Porcelain bowl', 9.5), ('S009', 'Woven storage basket', 16.5), ('S010', 'Recycled gift wrap', 2.25), ('S011', 'Garden twine', 3.25), ('S012', 'Stoneware jug', 15.75)]
    rows = []
    for i in range(4500):
        day = pd.Timestamp('2010-12-01') + pd.Timedelta(days=int(rng.integers(0, 374)))
        customer = str(10000 + int(rng.integers(0, 600))) if rng.random() > .12 else None
        country = rng.choice(['United Kingdom', 'France', 'Germany', 'Netherlands', 'Spain', 'Ireland'], p=[.68, .08, .08, .06, .06, .04])
        for j in rng.choice(len(products), size=int(rng.integers(1, 6)), replace=False):
            code, description, price = products[j]
            qty = int(rng.integers(1, 20))
            rows.append([str(500000 + i), code, description, qty, day, price, customer, country])
            if rng.random() < .04:
                rows.append(['C' + str(500000 + i), code, description, -qty, day, price, customer, country])
    frame = pd.DataFrame(rows, columns=COLUMNS)
    _, quality = normalize(frame)
    path = ROOT / 'data' / 'sample' / 'demo.csv'
    path.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(path, index=False)
    path.with_suffix('.json').write_text(json.dumps({'name': 'Synthetic retail demonstration', 'source': 'Deterministic synthetic transactions, seed 42. Not actual UCI business outcomes.', 'synthetic': True, 'quality': quality.model_dump()}, indent=2), encoding='utf-8')
    print(f'Generated {len(frame):,} explicitly synthetic rows with seed 42.')


if __name__ == '__main__':
    generate()
