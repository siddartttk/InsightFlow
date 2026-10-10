# Analytical color system

The chart enhancement keeps the existing neutral interface, layout and real analytics. Color is applied to plotted data, legends, small data highlights and KPI accents. No new pie/donut charts, gradients, decorative effects or fabricated series were added.

## Shared theme

`frontend/lib/design-system.ts` is the source for all chart palette colors, semantic series, segment colors, comparison palettes, line configuration and chart CSS variables. `frontend/components/chart-primitives.tsx` provides shared legends and tooltips. `frontend/app/chart-system.css` styles analytical marks and data accents without recoloring page surfaces or tables.

| Color | Hex | Analytical use |
| --- | --- | --- |
| Deep teal | `#176f67` | Net sales, positive change, Champions |
| Muted blue | `#426b92` | Gross sales/comparisons, leading market, Loyal Customers |
| Copper | `#985928` | Leading product and categorical comparison highlights |
| Olive | `#60712f` | Purchase orders, Potential Loyalists |
| Burgundy | `#a13f56` | Returns, negative performance/net loss, At Risk |
| Plum | `#7c5b86` | Average order value and categorical comparison highlights |
| Slate | `#5e6c77` | Secondary comparison entries, Hibernating |

Product and market colors highlight the five largest gross-sales contributors in the current selection. Remaining entries use slate. This is an explicit revenue-rank rule, rather than random assignment. Product colors are calculated before sorting by units, so the same stock code has the same color in revenue and quantity rankings. Overview and detailed pages use the same rules and source data. A new date/market selection can change the highlighted contributors.

Customer segment colors are fixed by segment name. Performance chips use teal for favorable changes and burgundy for unfavorable changes; a rise in returns remains unfavorable. Arrows and text preserve the direction independently of color.

## Chart experience

- Revenue defaults to solid teal net sales and a dashed blue gross-sales comparison. The comparison checkbox hides/restores the second series. Selecting gross sales reverses the selected/comparison roles.
- Returns & cancellations is available as a burgundy series using the existing API `returns` values. Negative total net sales use burgundy; a zero reference line appears when a plotted series includes negative values.
- Orders use olive and average order value uses plum. Area fills are flat at 9% opacity, with no gradient or animation.
- Lines use 2.6 px primary strokes and 1.9 px dashed comparison strokes, with outlined active points and a subdued crosshair. Country hover states outline the selected bar.
- Shared tooltips show exact amounts, deduplicate area/line entries and preserve missing averages as N/A. Market tooltips also show the actual revenue share and order count.
- Axis currency abbreviations retain up to two decimal places. For example, £1,650 and £2,200 display as £1.65k and £2.2k instead of duplicate £2k labels.
- Legends name the series and use solid/dashed samples. Segment legends include actual percentages. Product/market comparisons retain category labels and exact-value tables.
- SVG downloads include the visible legend and palette. Small-screen SVG legends stack vertically, and exports remain self-contained and browser-decodable.

## Preservation and verification

No backend files, calculations or successful API contracts were changed. The complete default selected-period dashboard response still matches the aggregate snapshot taken before this chart enhancement. Revenue-point values remain the source for every line, fill and tooltip; no synthetic comparison data is introduced.

All seven foreground palette colors have at least 4.5:1 contrast against the warm chart background: teal 5.25, blue 4.91, copper 4.85, olive 4.72, burgundy 5.48, plum 4.98 and slate 4.74. Legends, direct labels, line patterns, directional arrows and numerical tables ensure color is not the sole source of meaning. This is not a formal WCAG or cross-browser certification.

The browser suite checks returns against actual API totals, gross/net comparison toggling, matching product colors across rankings, and readable SVG downloads containing both legends. Visual captures at six widths from 320 to 1920 px are saved in `docs/screenshots/charts/`, including real hover states, returns, orders, basket value, customer segments and standalone SVG previews. Reproduce with both services running:

```powershell
node scripts/chart_visual_audit.cjs
Set-Location frontend
pnpm test
```

Lint, TypeScript and the production build passed. All 32 backend tests and 24 browser integration tests passed; three focused chart checks passed after final axis/tooltip refinements. All 24 chart-page layouts passed the visual audit, and refreshed desktop/mobile hover and SVG captures were inspected. Current results are recorded in [verification.md](verification.md). The existing temporary-upload, historical-sample and deployment limitations are unchanged.
