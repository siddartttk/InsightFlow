"""One documented cleaning policy shared by preparation and uploads."""
import re
import numpy as np
import pandas as pd
from app.schemas import Quality

COLUMNS = ['InvoiceNo', 'StockCode', 'Description', 'Quantity', 'InvoiceDate', 'UnitPrice', 'CustomerID', 'Country']
ALIASES = {
    'invoice': 'InvoiceNo', 'invoiceid': 'InvoiceNo', 'orderid': 'InvoiceNo',
    'productid': 'StockCode', 'sku': 'StockCode', 'product': 'Description',
    'productname': 'Description', 'date': 'InvoiceDate', 'orderdate': 'InvoiceDate',
    'price': 'UnitPrice', 'customer': 'CustomerID', 'customerid': 'CustomerID',
    'qty': 'Quantity', 'market': 'Country',
}


def normalize(frame: pd.DataFrame) -> tuple[pd.DataFrame, Quality]:
    frame = frame.copy()
    canonical = {re.sub(r'[^a-z0-9]', '', c.lower()): c for c in COLUMNS}
    names = []
    for column in frame.columns:
        key = re.sub(r'[^a-z0-9]', '', str(column).strip().lower())
        names.append(canonical.get(key, ALIASES.get(key, str(column).strip())))
    if len(names) != len(set(names)):
        raise ValueError('Multiple columns map to the same field. Use one column per expected field.')
    frame.columns = names
    missing = [c for c in COLUMNS if c not in frame.columns]
    if missing:
        raise ValueError('Missing required columns: ' + ', '.join(missing))
    frame = frame[COLUMNS].copy()
    original_count = len(frame)
    for c in ['InvoiceNo', 'StockCode', 'CustomerID', 'Description', 'Country']:
        frame[c] = frame[c].astype('string').str.strip().replace({'': pd.NA, 'nan': pd.NA, 'None': pd.NA})
    for c in ['InvoiceNo', 'StockCode', 'CustomerID']:
        frame[c] = frame[c].str.replace(r'^(\d+)\.0$', r'\1', regex=True)
    frame['InvoiceNo'] = frame['InvoiceNo'].str.upper()
    # Excel supplies datetimes. Text accepts ISO or day-first retail dates.
    frame['InvoiceDate'] = pd.to_datetime(frame['InvoiceDate'], errors='coerce', format='mixed', dayfirst=True)
    if not pd.api.types.is_datetime64_any_dtype(frame['InvoiceDate']) or getattr(frame['InvoiceDate'].dt, 'tz', None) is not None:
        raise ValueError('Use timezone-free invoice dates (YYYY-MM-DD HH:MM:SS).')
    for c in ['Quantity', 'UnitPrice']:
        frame[c] = pd.to_numeric(frame[c], errors='coerce')
    duplicates = int(frame.duplicated().sum())
    frame = frame.drop_duplicates()
    invalid_dates = int(frame['InvoiceDate'].isna().sum())
    invalid_prices = int((~np.isfinite(frame['UnitPrice']) | (frame['UnitPrice'] <= 0) | (frame['UnitPrice'] > 1_000_000)).sum())
    invalid_quantities = int((~np.isfinite(frame['Quantity']) | (frame['Quantity'] == 0) | (frame['Quantity'] % 1 != 0) | (frame['Quantity'].abs() > 1_000_000)).sum())
    missing_invoices = int(frame['InvoiceNo'].isna().sum())
    missing_codes = int(frame['StockCode'].isna().sum())
    numeric_valid = np.isfinite(frame['Quantity']) & np.isfinite(frame['UnitPrice'])
    valid = (numeric_valid & (frame['Quantity'] != 0) & (frame['Quantity'] % 1 == 0)
             & (frame['Quantity'].abs() <= 1_000_000) & (frame['UnitPrice'] > 0)
             & (frame['UnitPrice'] <= 1_000_000) & frame['InvoiceDate'].notna()
             & frame['InvoiceNo'].notna() & frame['StockCode'].notna())
    invalid = int((~valid).sum())
    frame = frame.loc[valid].copy()
    frame['Quantity'] = frame['Quantity'].astype('int64')
    frame['CustomerID'] = frame['CustomerID'].replace({'0': pd.NA})
    missing_customer = int(frame['CustomerID'].isna().sum())
    missing_description = int(frame['Description'].isna().sum())
    missing_country = int(frame['Country'].isna().sum())
    frame['Country'] = frame['Country'].fillna('Unknown')
    frame['IsReturn'] = frame['InvoiceNo'].str.startswith('C') | (frame['Quantity'] < 0)
    values = (frame['Quantity'].abs() * frame['UnitPrice']).round(2)
    frame['Value'] = np.where(frame['IsReturn'], -values, values)
    quality = Quality(input_rows=original_count, duplicate_rows=duplicates, invalid_rows=invalid,
                      missing_customer_rows=missing_customer, missing_description_rows=missing_description,
                      missing_country_rows=missing_country, purchase_rows=int((~frame['IsReturn']).sum()),
                      return_rows=int(frame['IsReturn'].sum()), retained_rows=len(frame),
                      invalid_date_rows=invalid_dates, invalid_price_rows=invalid_prices,
                      invalid_quantity_rows=invalid_quantities, missing_invoice_rows=missing_invoices,
                      missing_stockcode_rows=missing_codes)
    return frame.reset_index(drop=True), quality
