# Verification record

Verified locally on 10 October 2026, Windows, Node 24.19.0, Python 3.12.6. Commands were executed; the results below are not estimated.

| Check | Result |
| --- | --- |
| Python backend suite | **32 passed**, one Starlette/httpx migration deprecation warning |
| Python dependency consistency (`pip check`) | No broken requirements found |
| Python syntax (`compileall`) | Passed for backend application and scripts |
| Frontend ESLint | Passed, zero errors/warnings in final run |
| TypeScript strict checking | Passed |
| Next.js production build | Passed, all ten section routes generated plus root/not-found |
| Desktop/tablet/mobile browser integration suite | **24 passed** in 1.5 minutes with the enhanced chart system |
| Final chart refinements | Rebuilt; **3 focused chart checks passed** with gross/net hover labels, returns totals, comparison toggling and matching product colors |
| Chart visual audit | **24 chart-page layouts** at six widths, 320–1920 px, without overflow or page errors; hover states and standalone SVG exports reviewed |
| Loading skeleton visual correction | Rebuilt successfully; **3 loading/error/empty workflow checks passed** and refreshed desktop/mobile state captures reviewed |
| Responsive page audit | **60 layouts** across all ten pages at six widths, 320–1920 px; no page-wide or detected metric container overflow |
| Data preservation | Complete selected-period dashboard response matches the pre-redesign snapshot; canonical SHA-256 recorded in the design audit |
| Local connectivity | API `/health` returns `{status: "ok", version: "1.0.0"}`; frontend serves `/overview` |
| Frontend dependency peers | No peer dependency issues found |
| Git ignore checks | Raw Excel, full processed CSV, virtual environment and Next build artifacts ignored |
| Hosted deployment / GitHub CI execution | Not performed |

The browser suite ran against the production Next.js server and real FastAPI server, with installed Microsoft Edge. Eight scenarios ran at desktop 1280×720, tablet 1024×900 and mobile 390×844:

1. Dashboard/chart rendering, full/custom date ranges, Germany market selection checked against the live API, product navigation/search, customer segments, no page errors, no page-wide overflow. Mobile additionally tests Escape and focus return for the drawer.
2. Visible loading skeleton, controlled API failure, useful error, retry, and an actual empty future date range.
3. Valid CSV import powers £50 gross/£40 net analytics through Link navigation, reload clears browser token, filtered CSV download, SVG export filename/content and browser image decoding, and deletion returns to demo.
4. Invalid extension and invalid-schema CSV produce useful errors without switching the active dataset.
5. Screenshot capture and functional Insights, Reports, Privacy, Terms and About pages.
6. Draft versus applied filter state, reset, pressed interval state, keyboard metric disclosures, accessible table focus, sorting and search recovery.
7. Controlled report-download failure, dismissible alert and successful retry with a real CSV download.
8. Actual API return totals, gross/net comparison controls, full metric names in hover tooltips, and matching product colors between revenue and quantity rankings. SVG downloads contain the displayed legends.

The [design audit](design-audit.md) documents the visual review, reusable design system, contrast measurements and preserved API behavior. Final page screenshots include 1440×1000 desktop, 1024×900 tablet and 390×844 phone views, plus 320, 768 and 1920 px edge widths. State screenshots exercise controlled service failure and empty date selections; ordinary analytics and downloads use the real demo dataset.

The [analytical color system](chart-system.md) records the later chart enhancement. All seven palette foregrounds pass 4.5:1 contrast against the chart background. The complete dashboard response still matches its pre-change baseline. Current chart, hover and exported-image captures are in `docs/screenshots/charts/`; reproduce with `node scripts/chart_visual_audit.cjs`. The final hover-label refinement passed the focused chart workflow at desktop, tablet and mobile sizes.

Backend assertions cover gross/net/return values, distinct invoice counts, AOV, missing customer/description/country values, inclusive dates/country filtering, duplicate/invalid-row accounting, reason counts, all five RFM segments, preceding-period eligibility, empty results, zero-filled time buckets, CSV alias/schema validation, file/body limits including chunked requests, token isolation/expiry/deletion/capacity, public upload disabling, filtered export consistency, spreadsheet-formula escaping, insight evidence, CORS and private-response cache headers.

## Performance observations

The first implementation's selected-period HTTP request took 6,362 ms and its cached repeat took 248 ms. Product grouping was subsequently vectorized.

An isolated measurement of the optimized code recorded 560 ms to load the sample and 258 ms for a fresh selected-period aggregation. The cached in-process lookup was approximately 14 microseconds; this excludes HTTP, serialization and browser work.

Live HTTP benchmark, including response JSON parsing, with `scripts/benchmark_api.py`:

```json
{
  "range": "2011-09-11 to 2011-12-09",
  "interval": "weekly",
  "qualifying_rows": 18650,
  "runs_ms": [2928.5, 34.7, 35.64, 34.72, 47.59],
  "subsequent_median_ms": 35.18
}
```

These are local measurements under the build/test machine's load. They are not deployment, concurrency, service-level or commercial performance guarantees. The first request is slower due to loading/aggregation; cached requests satisfy the under-one-second local goal for this measured selection.

## Reproduce

From the project root, with services running for the benchmark/browser checks:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m compileall -q backend\app scripts
.\.venv\Scripts\python.exe scripts\benchmark_api.py
Set-Location frontend
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

Use the bundled full pnpm executable path from the README if `pnpm` is not on PATH. Do not rebuild into `.next` while running a browser verification; finish the build, restart the frontend, then run the suite.

## Remaining limits

ESLint 9 is retained for compatible Next plugin peers, although the registry marks it deprecated. Starlette currently emits a TestClient `httpx` migration warning. The exact installed dependencies are locked. Screenshots were visually reviewed. Browser checks use Edge/Chromium and do not constitute formal accessibility certification or cross-browser testing. No paid hosting, account access, deployment, GitHub push or live production smoke test has been claimed.
