# Deployment guide

Status: configuration is prepared and the production build has been tested locally. **No hosted deployment has been made or verified.** Account access and any costs require the owner's approval.

## Hosting and costs

Provider restrictions were checked on 10 October 2026. Recheck before purchase or launch.

- [Vercel Hobby](https://vercel.com/docs/plans/hobby) is restricted to non-commercial personal use. A portfolio or freelance lead-generation use should be reviewed against its terms; choose an eligible paid plan or another host for commercial use. Do not assume a free account covers client work.
- [Render free web services](https://render.com/docs/free) sleep after 15 minutes without inbound traffic. The first request after idle time can be slow; the interface displays loading and connection recovery states. Free service capacity/quotas are unsuitable for a promised service-level agreement.
- Frontend and API hosting are separate costs if paid plans are selected. A custom domain is optional and has registration/renewal costs set by the registrar. No database or AI API charges are incurred by this MVP. Future databases, AI API calls, backups and monitoring introduce additional costs.

## Backend on Render

1. Push the repository to your own GitHub account after reviewing staged files. The bundled processed sample is included; original and full cleaned customer-level files are ignored.
2. Create a Render service from `render.yaml` at repository root. Build: `pip install -r backend/requirements-lock.txt`. Start: `uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT --workers 1`.
3. Set `ALLOWED_ORIGINS` to the exact frontend production origin and any explicitly trusted preview origins, separated by commas. No wildcard is used.
4. Keep `ENABLE_UPLOADS=false` for public deployment. The UI will explain that uploads are disabled while template download and demo exploration remain available.
5. The root `.python-version` selects the latest available 3.12 patch on Render. [Render supports omitting the patch in this file](https://render.com/docs/python-version). Local testing used Python 3.12.6; the hosted patch has not been tested here. Verify the service health endpoint and OpenAPI after deployment.

## Frontend on Vercel

1. Import the repository with **Root Directory `frontend`** and framework Next.js.
2. Select Node 24 if available; local tests used Node 24.19.0. The package lock and packageManager field identify pnpm 11.25.0. Use `pnpm install --frozen-lockfile`, `pnpm build` and the provider's Next.js runtime.
3. Set `NEXT_PUBLIC_API_URL` to the deployed HTTPS backend URL, without a trailing slash. It is a public build-time value, not a secret. Redeploy the frontend after changing it.
4. Confirm the Render CORS origin exactly matches the final Vercel domain. HTTPS pages must call HTTPS APIs.

## Production smoke test

Open Overview without uploading data. Confirm populated KPIs and a revenue chart; choose a different date range and market; navigate to Products, Customers and Insights; export each report and inspect its values; download an SVG chart; inspect About, Privacy and Terms; check mobile navigation and empty results. Confirm public uploads are disabled, then test failure/retry by temporarily stopping the API in a controlled environment.

Health check from PowerShell (substitute your actual domain):

```powershell
Invoke-RestMethod 'https://YOUR-API-HOST/health'
```

## Before handling commercial records

Review the draft legal text, identify the actual operator/contact/providers, add authentication and authorization, rate limits and monitoring, review retention and security, and establish appropriate business contracts. In-memory sessions need one worker; multi-instance upload deployments require a redesigned storage/session approach. Bearer-token isolation is tested locally but is not a claim of production security certification.
