# Metrics and cleaning rules

All currency is GBP. These rules apply identically to the prepared demonstration and uploaded CSVs.

## Cleaning

Eight required fields: InvoiceNo, StockCode, Description, Quantity, InvoiceDate, UnitPrice, CustomerID, Country. Column casing, whitespace and punctuation are normalized. Limited aliases are listed in the import page and `backend/app/services/validation.py`.

IDs are strings, including numeric IDs loaded from Excel. Whitespace is trimmed; numeric IDs ending in `.0` are normalized. Invoice IDs are uppercased. Blank customer IDs and `0` are treated as unidentified. Dates must be timezone-free; ISO dates are recommended. Legacy day-first dates are accepted. Ambiguous slash dates are interpreted day-first. Monetary amounts are rounded to two decimals per transaction before aggregation.

Exact duplicate rows after type normalization are removed once. Rows are excluded if the date is invalid, invoice/product code is absent, price is not finite or is non-positive, quantity is not finite, is zero or fractional, or absolute quantity/price exceeds 1,000,000. Upload dates must be within 1901-01-01 to 2099-12-30. Excluded rows and duplicate rows are counted. Invalid-reason counts can overlap and should not be added to calculate total exclusions.

Missing CustomerID remains in financial analysis but not customer counts/RFM. Missing Description remains in financial totals but not product rankings. Missing Country becomes Unknown. Missing-value counts describe retained records. The original workbook quality report is separate from the active prepared-sample quality report.

## Financial metrics

| Metric | Definition |
| --- | --- |
| Purchase | Valid positive quantity and positive price, invoice not prefixed C |
| Gross sales | Sum of rounded Quantity × UnitPrice for purchases |
| Return | Invoice prefixed C **or** negative quantity; signed value is −abs(Quantity × UnitPrice) |
| Return/cancellation value | Positive absolute sum of return values |
| Net sales | Sum of all signed transaction values, equivalent to gross less returns |
| Purchase orders | Distinct purchase invoice IDs, independent of row counts |
| Average order value | Gross sales ÷ purchase orders; null when no purchase orders |
| Identified customers | Distinct non-missing customer IDs on purchase transactions |
| Returning customer % | Identified customers with ≥2 distinct purchase invoices ÷ identified purchasing customers ×100 |

C-prefixed invoices with positive quantities still count as negative returns. This makes the documented cancellation rule explicit. Returns are booked on their own invoice date. There is no invoice reconciliation, tax/cost treatment or accounting claim. A return-only period may have negative net sales and null AOV/customer rates.

## Filtering, comparisons and time buckets

Start/end calendar dates are inclusive: start ≤ InvoiceDate < end+1 day. Country matches exactly. Unknown markets produce an empty result. Maximum range is ten years. Unrecorded dates are assumed to have no recorded activity; completeness is not guaranteed.

The preceding comparison ends the day before the selected start and contains exactly as many calendar days. Comparison indicators appear only when the preceding range lies entirely within the dataset date bounds. Change = (current−previous)/abs(previous) ×100; null if previous=0 or either metric has no denominator. Repeat-rate changes are relative percentages, not percentage points. Sample membership and repeat rates should not be generalized to the complete UCI population.

Daily buckets use calendar days. Weekly buckets begin Monday. Monthly buckets use calendar months. Boundary weeks/months can be partial and their label is the calendar bucket start. The revenue-movement insight excludes first/last buckets to avoid comparing partial boundaries. Time series include zero-activity buckets. Orders per bucket count invoices appearing in that bucket; if an uploaded invoice spans periods, the summed bucket order counts may exceed the whole-period distinct count.

Products are grouped by stock code. The most frequent valid description within the selection is used; ties use alphabetical order. Product/country revenue uses qualifying purchases, not net sales. Product contribution divides each named product's gross sales by all gross sales, including unnamed products. Shares are rounded to two decimals, so totals may differ slightly from 100%.

All valid named stock codes are ranked, including described shipping/service/manual line items present in UCI. A merchandise-only catalog classification is not implemented; the original description makes these entries visible rather than silently excluding their revenue.

## RFM

Use only filtered, identified purchase transactions. Reference date is the selected end date + one calendar day. Recency = reference−latest purchase calendar date. Frequency = distinct purchase invoices. Monetary = gross qualifying purchase value. Returns are excluded.

| Score | Recency days | Frequency invoices | Monetary GBP |
| --- | --- | --- | --- |
| 5 | ≤30 | ≥10 | ≥2,000 |
| 4 | ≤60 | ≥5 | ≥1,000 |
| 3 | ≤90 | ≥3 | ≥500 |
| 2 | ≤180 | ≥2 | ≥200 |
| 1 | >180 | 1 | <200 |

Scores are assigned by the first qualifying threshold, independently. Segments are assigned in order: Champions (R≥4, F≥4, M≥4), Loyal Customers (R≥3, F≥3), Potential Loyalists (R≥3), At Risk (R≤2, F≥2), Hibernating (otherwise). Empty segments remain visible. Rules describe observed activity, are illustrative, and are not ML predictions. Short filters restrict the observed history.

## Insights and exports

The insight engine reports top product/market shares, top-five product concentration, the largest period-to-period gross-sales movement among non-boundary buckets, AOV/repeat-rate relative changes of at least 5%, and the At Risk customer count. Each insight includes its calculation evidence. No LLM or forecasting is involved.

KPI, product and segment CSV reports reuse the exact filtered dashboard aggregates. Customer identifiers are excluded. Text cells beginning with spreadsheet formula characters are escaped with an apostrophe. Revenue charts export as SVG images of the current metric/interval/filter selection. Chart numerical tables are also available for accessibility.
