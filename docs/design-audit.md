# InsightFlow UI/UX redesign

Implemented and reviewed locally on 10 October 2026, within the existing application.

## Findings from the existing interface

- Small controls, labels and supporting text made the analytics unnecessarily difficult to scan.
- Similar visual emphasis across metrics, charts and explanatory content weakened the overview hierarchy.
- Filters did not distinguish draft edits from the applied selection or indicate the selected date shortcut.
- Downloads lacked useful completion feedback. Search and empty selections lacked a direct recovery action.
- Table navigation, chart controls and metric explanations needed clearer keyboard access.
- Dense desktop arrangements needed deliberate tablet and phone layouts.

## Implemented design system

The interface uses warm off-white surfaces, charcoal text/navigation, muted teal for primary actions and restrained sage and copper for data and status. Self-hosted IBM Plex Sans handles interface text; IBM Plex Mono handles dates and compact technical labels. Flat sections, thin rules and restrained 3 px control radii replace repeated decorative containers.

Source locations:

- `frontend/app/design-tokens.css`: semantic colors, typography, spacing, radii and transition duration.
- `frontend/app/editorial.css`: page hierarchy and responsive editorial layouts.
- `frontend/app/components.css`: shared controls, tables, feedback and accessibility rules.
- `frontend/lib/design-system.ts`: chart colors and stable segment colors by name. Literal SVG colors keep chart downloads self-contained.
- `frontend/components/ui.tsx`: reusable Button, StatusMessage, FeedbackState, AnalyticsSkeleton and TableViewport components.

The original 30 design restrictions remain respected. The product has no decorative gradients, glows, glass effects, pricing blocks, fabricated testimonials, emoji UI or decorative card shadows.

## Product changes

| Area | Result |
| --- | --- |
| Overview | Gross sales lead the KPI hierarchy. Revenue has a wide primary chart; customer and return metrics form a supporting rail. Product rankings, market totals, observations and the full product table remain available. |
| Revenue | Readable axes, consistent tooltips, selected interval states, exact-value tables and SVG download feedback. A single time bucket renders a visible point. Duplicate area/line tooltip entries are suppressed. |
| Products | Readable rankings and ledger tables, aligned numeric values, accessible scrolling, captions, clear-search actions, sorting and pagination. |
| Customers | Stable segment colors shared between the distribution and table, aggregate data, clear definitions and readable responsive KPIs. |
| Insights | Business-oriented titles, calculation disclosures, related-analysis links and an expandable explanation of the existing rules. |
| Import | Clear file guidance, validation alerts, pending feedback, file removal, template feedback, successful-import confirmation, data quality and protected record preview. |
| Reports | Existing filtered CSV reports retain their values and fields, with pending, error, dismiss and successful-download feedback. |
| About, Privacy, Terms | Consistent typography, spacing, readable disclosures and responsive legal/definition layouts. Provenance and draft legal status remain explicit. |
| Navigation | Custom icons, active text/underline/marker, `aria-current`, mobile drawer focus handling, Escape dismissal and menu control association. |
| Filters | Pressed date presets, unapplied-change status, validation associations, explicit reset and date/market context. Phone date fields share a row; market selection remains full width. |
| Feedback | Layout-aware static loading skeletons, actionable empty selections, retryable errors and status announcements. Transitions are short; reduced-motion preferences disable them. |

Metric explanations support keyboard activation through native disclosures. Inputs and search text have readable contrast. Shared focus indicators cover links, buttons, inputs, disclosures and table regions. Phone controls generally use 44 px targets.

## Data and functionality preservation

No backend calculations, preparation scripts or packaged transaction data were changed for this redesign. Existing API paths, request parameters and successful response schemas remain intact. The frontend continues to render actual API aggregates and user-imported data. CSV and SVG exports, session isolation/deletion, RFM, data-quality summaries and all ten routes remain functional.

The complete response for `/api/dashboard?start=2011-09-11&end=2011-12-09&interval=weekly` exactly matched the snapshot captured before the redesign. The canonical sorted-JSON SHA-256 is:

`1800a26d5f0a8cb488a6df77802ad8d195b81703e175af25445e1e43d7f900c0`

## Verification

- ESLint and strict TypeScript checks passed.
- The production Next.js build passed and generated all ten section routes.
- All **32 backend tests** passed, with the existing Starlette/httpx migration warning.
- All **21 browser integration tests** passed on the final production build: seven scenarios at desktop, tablet and phone sizes. This includes real API value comparisons, uploads, deletion, filters, loading/errors/empty data, search recovery, keyboard explanations, CSV/SVG downloads and failed-download retry.
- A final skeleton-only CSS correction was rebuilt and verified with **three additional loading/error/empty workflow checks**. Updated state captures were visually reviewed at desktop and phone sizes.
- All ten pages were rendered at **320, 390, 768, 1024, 1440 and 1920 px** widths. All **60 page layouts** had no page-wide overflow or detected metric container overflow. Screenshots were reviewed for representative pages and sizes; horizontal table scrolling is intentional on small screens.
- Core contrast measurements: body text 11.18:1; secondary text 4.85:1; primary button text 8.61:1; navigation text 7.51:1; chart bars 3.44:1; input boundaries 3.22:1.

Screenshots and machine-readable layout results are in `docs/screenshots/audit/`. Run `node scripts/ui_audit.cjs`, `node scripts/ui_audit.cjs --edges` and `node scripts/ui_state_audit.cjs` with both services running to reproduce the visual captures. These scripts use the installed Microsoft Edge channel from the existing Playwright dependency.

## Remaining limitations

This redesign improves the existing product interface; its original MVP limits remain. Uploads are temporary process-memory sessions, normally 30 minutes, and browser reload clears the token. There is no authentication, permanent workspace storage or scheduled reporting. Public uploads remain disabled in deployment configuration. Authentication and security/legal review are required before commercial use with confidential records.

The demo remains a historical UCI invoice sample in GBP; RFM is descriptive. Chart export supports SVG, while tabular reports use CSV. Hosted deployment was not performed. Browser verification used Edge/Chromium, rather than a cross-browser or formal WCAG certification audit. Existing ESLint peer-version constraints and the backend TestClient migration warning are documented in the verification record.
