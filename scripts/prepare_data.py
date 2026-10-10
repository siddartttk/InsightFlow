"""Download UCI workbook once; prepare a deterministic whole-invoice sample."""
import argparse
import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.services.validation import normalize, COLUMNS


def prepare(path: Path, denominator: int = 10):
    frame, quality = normalize(pd.read_excel(path, engine='openpyxl'))
    processed = ROOT / 'data' / 'processed'
    processed.mkdir(parents=True, exist_ok=True)
    frame.to_csv(processed / 'cleaned.csv', index=False)
    (processed / 'quality.json').write_text(quality.model_dump_json(indent=2), encoding='utf-8')
    # Keep all lines of selected invoices; C-prefix shares its purchase's hash.
    invoices = frame.InvoiceNo.unique()
    selected = {v for v in invoices if int(hashlib.sha256(v.removeprefix('C').encode()).hexdigest()[:8], 16) % denominator == 0}
    sample = frame.loc[frame.InvoiceNo.isin(selected), COLUMNS].copy()
    sample['CustomerID'] = sample.CustomerID.map(lambda v: 'customer-' + hashlib.sha256(str(v).encode()).hexdigest()[:16] if pd.notna(v) else None)
    _, sample_quality = normalize(sample)
    output = ROOT / 'data' / 'sample' / 'demo.csv'
    output.parent.mkdir(parents=True, exist_ok=True)
    sample.to_csv(output, index=False)
    metadata = {'name': f'UCI Online Retail · 1/{denominator} invoice sample', 'source': 'Chen, D. (2015). Online Retail. UCI Machine Learning Repository. DOI: 10.24432/C5BW33. CC BY 4.0. Deterministic SHA-256 invoice sample; customer IDs pseudonymized. Sample totals are not full-dataset totals.', 'synthetic': False, 'denominator': denominator, 'original_quality': quality.model_dump(), 'quality': sample_quality.model_dump()}
    output.with_suffix('.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
    print(f'Prepared {len(sample):,} rows, {sample.InvoiceNo.nunique():,} invoices. Full quality report: data/processed/quality.json')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path)
    parser.add_argument('--download', action='store_true')
    parser.add_argument('--denominator', type=int, default=10)
    args = parser.parse_args()
    if args.denominator < 1:
        parser.error('--denominator must be positive')
    if args.download:
        raw = ROOT / 'data' / 'raw'
        raw.mkdir(parents=True, exist_ok=True)
        workbook = raw / 'Online Retail.xlsx'
        if not workbook.exists():
            url = 'https://archive.ics.uci.edu/static/public/352/online+retail.zip'
            print('Downloading original UCI Online Retail workbook...')
            with urllib.request.urlopen(url, timeout=120) as response:
                content = response.read(30 * 1024 * 1024 + 1)
            if len(content) > 30 * 1024 * 1024:
                raise ValueError('Dataset archive exceeds expected size.')
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                with archive.open('Online Retail.xlsx') as source:
                    workbook.write_bytes(source.read())
        prepare(workbook, args.denominator)
    elif args.input:
        prepare(args.input, args.denominator)
    else:
        parser.error('Choose --download or --input path.xlsx. For an explicit fallback run generate_sample.py.')
