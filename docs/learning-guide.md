# Build walkthrough

## Phase 1: foundation

The empty workspace became a Next.js frontend and FastAPI backend. `frontend/app/layout.tsx` provides the persistent shell; `components/shell.tsx` implements actual navigation; `app/globals.css` supplies design tokens and responsive layout; `backend/app/main.py` exposes `/health` and OpenAPI. Frontend calls cross origins, so the backend explicitly permits only configured frontend origins.

Start commands are in the README under “Run on this Windows workspace”. Two processes are needed: Next.js serves pages on 3000; FastAPI computes data on 8000. Verify `/health` in PowerShell and open `/overview`. Local socket and Node path restrictions required the available execution approval path; Python temporary files were moved into the workspace to resolve a bootstrap permission error.

## Phase 2: data pipeline

`scripts/prepare_data.py` downloads/reads Excel once and calls the same cleaner used by uploads. It generates full cleaned output and original/sample quality reports. The API uses prepared CSV, avoiding expensive Excel work on every request. `services/validation.py` makes exclusions explicit; `services/analytics.py` separates valid purchases from signed returns and counts invoices rather than rows. Tests check these decisions using small manually calculable examples.

Reproduce with `.\.venv\Scripts\python.exe scripts\prepare_data.py --download`; inspect `data/processed/quality.json` and `data/sample/demo.json`. Raw/full files are intentionally Git ignored. The fallback generator is explicit and labels its output synthetic.

## Phase 3: functional dashboard

`lib/types.ts` describes JSON responses; `lib/api.ts` centralizes request URLs, errors, timeouts and downloads. `components/data-provider.tsx` manages the current filters/dataset and cancels obsolete requests. Recharts components use backend series rather than hardcoded chart points. Date presets, date inputs, country selection, interval selection, product search and sorting update actual analysis.

Verify by applying a new date range, selecting another country and inspecting the KPI/chart data table. Loading skeletons replace old results during requests. API errors provide retry; empty ranges show zero totals and N/A when a denominator is absent. A slow full-range request led to vectorized product grouping, improving fresh aggregation.

## Phase 4: business intelligence

`services/segmentation.py` calculates RFM from identified purchases. `services/insights.py` creates deterministic observations whose evidence is shown in the UI. These rules are understandable and testable without requiring ML. CSV endpoints reuse the same filtered aggregate objects, helping keep reports consistent with the dashboard.

Verify Customer segments and their methodology; expand View calculation in Insights; download each report in Reports and compare with active filters. Use the revenue chart download icon for an SVG image. Full metric and threshold definitions are in `docs/metrics.md`.

## Phase 5: import and polish

`components/import-data.tsx` validates files, uploads them to the API and displays preview/quality counts. `core/store.py` gives accepted data an unpredictable expiring token. Each token has its own dataframe/cache; another token never falls back to it. `core/middleware.py` bounds request bodies before parsing. UI session deletion waits for API confirmation, and expired/unavailable tokens return a helpful error.

Download the CSV template, import it, and navigate by sidebar links to view its small dataset. Reloading clears the browser's memory-only token. Compare active data quality and use the deletion control. Responsive charts, horizontally scrollable tables, an inert/focus-trapped mobile drawer, Escape/keyboard support, focus indicators and draft trust pages complete the interface.

## Phase 6: deployment preparation

`render.yaml`, `.python-version`, environment examples and lockfiles describe reproducible hosting configuration. Public uploads are disabled there. `docs/deployment.md` records current provider restrictions, potential costs and a live verification procedure. No account access, paid service, GitHub push or live deployment occurred in this build.

Review the code and documents, choose approved hosting/account settings, deploy both services, configure HTTPS API/CORS URLs and perform the documented smoke test before calling the hosted demo complete. A future commercial upload service needs authentication, retention agreements and a security review.
