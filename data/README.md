# Demonstration data

The bundled `sample/demo.csv` is **real processed data**, a deterministic 1/10 invoice sample of UCI Online Retail. It contains 49,086 rows and 2,376 invoices after cleaning. Figures in the dashboard describe this sample only. The selection uses the first eight SHA-256 hex digits of the invoice ID (without cancellation C) modulo 10; invoices with remainder zero are retained with all their lines. No weighting or full-population inference is applied. Customer IDs are replaced by stable SHA-256 aliases, preserving equality for descriptive customer analysis.

Citation: Chen, D. (2015). **Online Retail** [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5BW33.

Source: https://archive.ics.uci.edu/dataset/352/online+retail. License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/). Original period: 1 December 2010 to 9 December 2011. Unit prices are sterling.

Changes: type/whitespace normalization; duplicate removal; documented invalid-row exclusions; transaction-value calculation; whole-invoice sampling; customer-ID pseudonymization. See `docs/metrics.md`. These changes are adaptations under CC BY 4.0. Software's MIT license does not replace the dataset license.

Reproduce from the project root:

```powershell
.\.venv\Scripts\python.exe scripts\prepare_data.py --download
# Or an already downloaded workbook:
.\.venv\Scripts\python.exe scripts\prepare_data.py --input 'C:\path\Online Retail.xlsx'
```

`data/raw/` holds the original XLSX and `data/processed/` holds the full cleaned CSV and quality JSON. Both are ignored by Git. `sample/demo.json` records provenance and original/sample quality reports. The backend reads the sample CSV only; it does not re-open Excel on each request.

If download is unavailable, explicitly generate a synthetic replacement:

```powershell
.\.venv\Scripts\python.exe scripts\generate_sample.py
```

This command replaces `sample/demo.csv` and provenance with a seed-42 synthetic dataset. The application visibly labels it synthetic. It never silently substitutes synthetic numbers when the API is unavailable. Restart the API after replacing prepared data.
