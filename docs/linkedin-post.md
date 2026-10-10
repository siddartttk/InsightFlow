# LinkedIn project draft

I built InsightFlow to explore a practical question: how can a small retailer turn transaction spreadsheets into decisions without writing code?

The working application includes date and market filters, revenue trends, product rankings, repeat-purchase analysis, transparent RFM customer segments and downloadable reports. Business insights link back to calculations rather than generated predictions.

The stack is Next.js, React and TypeScript on the frontend, with FastAPI and Pandas on the backend. I used an attributed, reproducible sample of UCI Online Retail and documented how duplicates, returns and missing customer IDs affect the metrics. CSV uploads power the same dashboard through temporary, isolated sessions.

The main engineering lesson: getting the definitions right matters as much as drawing the charts. Order counts must use invoices, missing IDs must not become invented customers, and historical sample totals must be labelled accurately.

Local verification results are documented in the repository. Public deployment is prepared but has not been published yet.

Before posting, add your actual GitHub repository link and attach the captured dashboard screenshot or the demo recording. Replace the deployment sentence only after a hosted demo has been verified.

#RetailAnalytics #DataEngineering #NextJS #FastAPI #Python #PortfolioProject
