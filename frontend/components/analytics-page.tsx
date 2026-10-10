"use client";
import Link from "next/link";
import { useState } from "react";
import { useData } from "./data-provider";
import { Filters } from "./filters";
import { Metrics } from "./metrics";
import { TrendChart, ProductBars, CountryBars } from "./charts";
import { ProductTable } from "./product-table";
import { ImportData, QualitySummary } from "./import-data";
import {
  AnalyticsSkeleton,
  Button,
  FeedbackState,
  StatusMessage,
  TableViewport,
} from "./ui";
import { segmentColors } from "@/lib/design-system";
import { ChartLegend } from "./chart-primitives";
import { dateLabel, money, number, percent } from "@/lib/formatters";
import { downloadReport } from "@/lib/api";
import type { Insight, Metric } from "@/lib/types";

const titles: Record<string, [string, string]> = {
  overview: [
    "Business overview",
    "Sales performance, customer activity and the products behind the numbers.",
  ],
  revenue: [
    "Revenue",
    "Understand how sales, order volume and basket value change over time.",
  ],
  products: [
    "Products",
    "Revenue, units sold and contribution for each stock code.",
  ],
  customers: [
    "Customers",
    "Repeat purchasing and customer segments for the selected period.",
  ],
  insights: [
    "Business insights",
    "Observations from your data, with the calculation behind each one.",
  ],
  import: [
    "Import data",
    "Validate a transaction CSV and explore it in your workspace.",
  ],
  reports: [
    "Reports",
    "Download the analysis for the dates and market you have selected.",
  ],
  about: [
    "About the data",
    "Where the data comes from, how it is prepared and what the numbers mean.",
  ],
  privacy: [
    "Privacy Policy",
    "Draft policy for this demonstration application.",
  ],
  terms: ["Terms of Use", "Draft terms for this demonstration application."],
};
export function AnalyticsPage({ section }: { section: string }) {
  const {
    meta,
    data,
    filters,
    setFilters,
    loading,
    error,
    retry,
    token,
    switchToDemo,
  } = useData();
  const [exporting, setExporting] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState("");
  const title = titles[section];
  const analyticsSection = [
    "overview",
    "revenue",
    "products",
    "customers",
    "insights",
    "reports",
  ].includes(section);
  async function exportData(report: "kpis" | "products" | "segments") {
    setExportError("");
    setExportSuccess("");
    setExporting(report);
    try {
      await downloadReport(report, filters, token);
      setExportSuccess(
        `${{ kpis: "KPI summary", products: "Product performance", segments: "Customer segment summary" }[report]} download prepared for ${dateLabel(filters.start)} – ${dateLabel(filters.end)}. Check your browser downloads.`,
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setExporting("");
    }
  }
  const primary =
    data?.overview.metrics.filter((m) =>
      ["gross", "net", "orders", "aov"].includes(m.key),
    ) || [];
  const secondary =
    data?.overview.metrics.filter((m) =>
      ["customers", "repeat", "returns"].includes(m.key),
    ) || [];
  return (
    <>
      <div
        className={`page-heading ${section === "overview" ? "overview-heading" : ""}`}
      >
        <div>
          <p className="eyebrow">
            {section === "overview"
              ? "EXECUTIVE OVERVIEW"
              : section === "import"
                ? "DATA IMPORT"
                : section.toUpperCase()}
          </p>
          <h1>{title[0]}</h1>
          <p className="page-description">{title[1]}</p>
        </div>
        {analyticsSection && (
          <Button
            className="export-summary"
            icon="download"
            pending={exporting === "kpis"}
            disabled={!!exporting || loading || !data}
            onClick={() => void exportData("kpis")}
          >
            {exporting === "kpis" ? "Preparing…" : "Export summary"}
          </Button>
        )}
      </div>
      {exportError && (
        <StatusMessage tone="error" onDismiss={() => setExportError("")}>
          {exportError}
        </StatusMessage>
      )}
      {exportSuccess && (
        <StatusMessage tone="success" onDismiss={() => setExportSuccess("")}>
          {exportSuccess}
        </StatusMessage>
      )}
      {analyticsSection && meta && (
        <Filters
          key={`${meta.name}-${token || "demo"}-${filters.start}-${filters.end}-${filters.country}`}
        />
      )}
      {section === "privacy" || section === "terms" ? (
        <Legal section={section} />
      ) : (
        <>
          {meta && (
            <div
              className={`data-notice ${meta.synthetic ? "synthetic-notice" : ""}`}
            >
              <span>
                <span className="status-dot" />
                {token
                  ? "PRIVATE UPLOAD"
                  : meta.synthetic
                    ? "SYNTHETIC DEMONSTRATION"
                    : "UCI ONLINE RETAIL"}
              </span>
              <p>
                {token
                  ? "An isolated, temporary dataset session. Customer identifiers stay out of reports."
                  : meta.synthetic
                    ? "Generated with seed 42. These are not actual historical business outcomes."
                    : "Historical sample. Totals describe selected invoices, not the full retailer."}
              </p>
              <Link href="/about">About the data ↗</Link>
            </div>
          )}
          {error && (
            <FeedbackState
              tone="error"
              title="Analysis is currently unavailable"
              actions={
                <>
                  <Button variant="primary" onClick={retry}>
                    Try again
                  </Button>
                  {token && (
                    <Button onClick={switchToDemo}>Switch to demo data</Button>
                  )}
                  <Link href="/about">View methodology</Link>
                </>
              }
            >
              {error}
            </FeedbackState>
          )}
          {section === "import" ? (
            <ImportData />
          ) : section === "about" ? (
            <About />
          ) : loading ? (
            <AnalyticsSkeleton />
          ) : (
            data && (
              <>
                <div className="selection-caption">
                  <span>
                    {dateLabel(filters.start)} – {dateLabel(filters.end)}{" "}
                    <span className="caption-separator">/</span>{" "}
                    {filters.country || "All markets"}
                  </span>
                  <span>
                    {number(data.overview.rows)} qualifying transaction rows
                  </span>
                </div>
                {data.overview.rows === 0 && (
                  <FeedbackState
                    tone="empty"
                    title="No activity in this selection"
                    actions={
                      meta && (
                        <Button
                          onClick={() =>
                            setFilters({
                              ...filters,
                              start: meta.start,
                              end: meta.end,
                              country: "",
                            })
                          }
                        >
                          View all data
                        </Button>
                      )
                    }
                  >
                    No transactions match these filters. Totals are zero;
                    averages and percentages without a denominator show N/A.
                  </FeedbackState>
                )}
                {section === "overview" && (
                  <div className="overview-layout">
                    <Metrics metrics={primary} primary />
                    <div className="performance-layout">
                      <TrendChart series={data.revenue.series} />
                      <aside
                        className="performance-sidebar"
                        aria-label="Customer and return metrics"
                      >
                        <div className="rail-heading">
                          <span className="eyebrow">SELECTED PERIOD</span>
                          <h2>Customers & returns</h2>
                        </div>
                        <Metrics metrics={secondary} />
                        <Link className="rail-link" href="/customers">
                          View customer analysis{" "}
                          <span aria-hidden="true">↗</span>
                        </Link>
                      </aside>
                    </div>
                    <div className="two-columns">
                      <ProductBars products={data.products.products} />
                      <CountryBars countries={data.revenue.countries} />
                    </div>
                    <div className="section-heading">
                      <div>
                        <h2>Business observations</h2>
                      </div>
                      <Link href="/insights" className="text-link">
                        Explore all insights ↗
                      </Link>
                    </div>
                    <InsightList
                      insights={data.insights.insights.slice(0, 3)}
                      compact
                    />
                    <ProductTable products={data.products.products} />
                  </div>
                )}
                {section === "revenue" && (
                  <>
                    <Metrics metrics={primary} primary />
                    <Comparison />
                    <TrendChart series={data.revenue.series} />
                    <TrendChart series={data.revenue.series} volume />
                    <CountryBars countries={data.revenue.countries} />
                  </>
                )}
                {section === "products" && (
                  <>
                    <Metrics
                      metrics={[
                        {
                          key: "products",
                          title: "Named products sold",
                          value: data.products.products.length,
                          unit: "number",
                          description:
                            "Distinct stock codes with a valid product description.",
                          change: null,
                        },
                        {
                          key: "ranked",
                          title: "Ranked product revenue",
                          value: data.products.ranked_revenue,
                          unit: "currency",
                          description:
                            "Gross sales from transactions with a known description.",
                          change: null,
                        },
                        {
                          key: "excluded",
                          title: "Unranked revenue",
                          value: data.products.excluded_revenue,
                          unit: "currency",
                          description:
                            "Valid purchases lacking a description. Included in gross sales.",
                          change: null,
                        },
                      ]}
                    />
                    <div className="two-columns">
                      <ProductBars
                        products={data.products.products}
                        limit={10}
                      />
                      <ProductBars
                        products={data.products.products}
                        quantity
                        limit={10}
                      />
                    </div>
                    <section className="panel prose-panel">
                      <h2>Product revenue distribution</h2>
                      <p>
                        The top 10 named products contribute{" "}
                        {percent(
                          data.products.products
                            .slice(0, 10)
                            .reduce((sum, p) => sum + p.share, 0),
                        )}{" "}
                        of gross sales. Other named products contribute{" "}
                        {percent(
                          data.products.products
                            .slice(10)
                            .reduce((sum, p) => sum + p.share, 0),
                        )}
                        . Unnamed-product sales of{" "}
                        {money(data.products.excluded_revenue)} remain in
                        financial totals. The table shows each product’s
                        contribution.
                      </p>
                    </section>
                    <ProductTable products={data.products.products} />
                  </>
                )}
                {section === "customers" && <CustomerView />}
                {section === "insights" && (
                  <>
                    <section className="panel prose-panel methodology">
                      <h2>How to use these insights</h2>
                      <p>
                        Review the observations below, open their calculations
                        and explore the related analysis before deciding on your
                        next step.
                      </p>
                      <details>
                        <summary>How observations are generated</summary>
                        <p>{data.insights.methodology}</p>
                      </details>
                    </section>
                    <InsightList insights={data.insights.insights} />
                  </>
                )}
                {section === "reports" && (
                  <>
                    <section className="panel report-panel">
                      <div className="panel-header">
                        <div>
                          <p className="eyebrow">EXPORT CENTRE</p>
                          <h2>Reports for your selected period</h2>
                        </div>
                        <span className="panel-badge">CSV</span>
                      </div>
                      {(
                        [
                          [
                            "kpis",
                            "Executive KPI summary",
                            "Seven documented metrics, current values and available prior-period comparisons.",
                          ],
                          [
                            "products",
                            "Product performance",
                            "All ranked products, gross sales, units sold, order counts and contribution.",
                          ],
                          [
                            "segments",
                            "Customer segment summary",
                            "Aggregate RFM segments, customer counts, revenue and average recency. No customer IDs.",
                          ],
                        ] as const
                      ).map(([slug, name, description], i) => (
                        <div className="report-row" key={slug}>
                          <span className="report-index">0{i + 1}</span>
                          <div>
                            <h3>{name}</h3>
                            <p>{description}</p>
                          </div>
                          <Button
                            icon="download"
                            pending={exporting === slug}
                            disabled={!!exporting}
                            onClick={() => void exportData(slug)}
                          >
                            {exporting === slug ? "Preparing…" : "Download CSV"}
                          </Button>
                        </div>
                      ))}
                    </section>
                    <section className="panel prose-panel">
                      <h2>Charts you can share</h2>
                      <p>
                        Use the download icon on a revenue chart to save the
                        current chart as an SVG image. It preserves the selected
                        metric, interval, dates and market. SVG opens in a
                        browser and scales without losing detail.
                      </p>
                      <Link href="/revenue" className="text-link">
                        Open revenue charts ↗
                      </Link>
                    </section>
                  </>
                )}
              </>
            )
          )}
        </>
      )}
    </>
  );
}
function Comparison() {
  const { data } = useData();
  if (!data) return null;
  return (
    <p className="comparison-caption">
      {data.overview.comparison_available
        ? `KPI changes compare with ${dateLabel(data.overview.previous_start)} to ${dateLabel(data.overview.previous_end)}. Relative changes are omitted when the previous value is zero.`
        : "An entire preceding equal-length date range is not available in this dataset. Prior-period changes are omitted."}
    </p>
  );
}
function InsightList({
  insights,
  compact = false,
}: {
  insights: Insight[];
  compact?: boolean;
}) {
  const titles: Record<string, string> = {
    "Your leading product": "Largest product contribution",
    "Where revenue is concentrated": "Top-five product share",
    "Your strongest market": "Leading market",
    "Customers to reconnect with": "At-risk customer count",
  };
  return (
    <section className={`insight-list ${compact ? "compact" : ""}`}>
      {insights.length ? (
        insights.map((insight, i) => (
          <article className="insight" key={insight.title}>
            <span className="insight-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="eyebrow">{insight.category}</p>
              <h3>{titles[insight.title] || insight.title}</h3>
              <p>{insight.detail}</p>
              <details>
                <summary>View calculation</summary>
                <p>{insight.evidence}</p>
                <Link
                  className="text-link"
                  href={
                    /product|concentration/i.test(insight.category)
                      ? "/products"
                      : /customer/i.test(insight.category)
                        ? "/customers"
                        : "/revenue"
                  }
                >
                  Open related analysis ↗
                </Link>
              </details>
            </div>
          </article>
        ))
      ) : (
        <div className="panel prose-panel">
          <h2>No observations for this selection</h2>
          <p>
            Choose a period with qualifying purchase activity to generate
            insights.
          </p>
        </div>
      )}
    </section>
  );
}
function CustomerView() {
  const { data } = useData();
  if (!data) return null;
  const c = data.customers;
  const metrics: Metric[] = [
    {
      key: "identified",
      title: "Identified customers",
      value: c.identified,
      unit: "number",
      change: null,
      description: "Known customer IDs with qualifying purchases.",
    },
    {
      key: "repeat",
      title: "Repeat purchase rate",
      value: c.repeat_percent,
      unit: "percent",
      change: null,
      description: `${number(c.repeat)} customers placed two or more purchase invoices.`,
    },
    {
      key: "per",
      title: "Revenue per customer",
      value: c.revenue_per_customer,
      unit: "currency",
      change: null,
      description:
        "Identified-customer gross sales divided by known customers.",
    },
    {
      key: "anonymous",
      title: "Unidentified sales",
      value: c.anonymous_revenue,
      unit: "currency",
      change: null,
      description:
        "Valid purchase value with no customer ID. Excluded from RFM.",
    },
  ];
  return (
    <>
      <Metrics metrics={metrics} primary />
      <section className="panel segments-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">RECENCY · FREQUENCY · MONETARY VALUE</p>
            <h2>Your customer segments</h2>
          </div>
          <span className="panel-badge">RULE-BASED RFM</span>
        </div>
        <div
          className="segment-distribution"
          aria-label="Customer segment distribution"
        >
          {c.segments
            .filter((s) => s.customers > 0)
            .map((s) => (
              <div
                key={s.segment}
                style={{
                  width: `${s.share}%`,
                  background: segmentColors[s.segment],
                }}
                title={`${s.segment}: ${s.customers}`}
              />
            ))}
        </div>
        <ChartLegend
          label="Customer segment legend"
          entries={c.segments.map((segment) => ({
            key: segment.segment,
            label: `${segment.segment} · ${percent(segment.share)}`,
            color: segmentColors[segment.segment],
            shape: "square",
          }))}
        />
        <TableViewport label="Customer segments table, scroll horizontally for all columns">
          <table>
            <caption className="sr-only">
              Aggregate customer segments for the selected dates and market.
            </caption>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Customers</th>
                <th>Share</th>
                <th>Gross sales</th>
                <th>Avg. recency</th>
                <th>Avg. orders</th>
              </tr>
            </thead>
            <tbody>
              {c.segments.map((s) => (
                <tr key={s.segment}>
                  <td>
                    <span
                      className="segment-dot"
                      style={{ background: segmentColors[s.segment] }}
                    />
                    {s.segment}
                  </td>
                  <td>{number(s.customers)}</td>
                  <td>{percent(s.share)}</td>
                  <td>{money(s.revenue)}</td>
                  <td>{s.customers ? `${s.avg_recency} days` : "N/A"}</td>
                  <td>{s.customers ? s.avg_frequency : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
      </section>
      <section className="panel prose-panel">
        <p className="eyebrow">TRANSPARENT BY DESIGN</p>
        <h2>How to read RFM</h2>
        <p>
          Recency measures days since the most recent qualifying purchase.
          Frequency counts distinct purchase invoices. Monetary value sums
          qualifying purchase value. Reference date:{" "}
          {dateLabel(c.reference_date)}.
        </p>
        <p>{c.methodology}</p>
        <p>
          These thresholds are illustrative retail rules. They should be
          calibrated with a business owner before operational use. Selecting a
          short date range reduces the observed purchase history and can change
          a customer’s segment.
        </p>
      </section>
    </>
  );
}
function About() {
  const { meta, token } = useData();
  return (
    <>
      <section className="panel prose-panel">
        <p className="eyebrow">PROVENANCE</p>
        <h2>{meta?.name || "UCI Online Retail"}</h2>
        <p>
          {meta?.source ||
            "Chen, D. (2015). Online Retail. UCI Machine Learning Repository. DOI: 10.24432/C5BW33. CC BY 4.0."}
        </p>
        {!token && (
          <>
            <p>
              The original dataset records transactions from 1 December 2010 to
              9 December 2011 for a UK online retailer. The demo selects whole
              invoices using a deterministic SHA-256 hash. Cancellation invoices
              use the same hash input as their original invoice. It is a sample
              without statistical weighting; totals must not be presented as
              full-dataset revenue. Customer IDs are pseudonymized in the
              processed sample.
            </p>
            <p>
              <a
                href="https://archive.ics.uci.edu/dataset/352/online+retail"
                target="_blank"
                rel="noreferrer"
              >
                UCI dataset source ↗
              </a>{" "}
              <span className="caption-separator">/</span>{" "}
              <a
                href="https://doi.org/10.24432/C5BW33"
                target="_blank"
                rel="noreferrer"
              >
                Dataset DOI ↗
              </a>{" "}
              <span className="caption-separator">/</span>{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY 4.0 ↗
              </a>
            </p>
          </>
        )}
        {meta?.synthetic && (
          <p className="notice">
            This installation uses a deterministic synthetic fallback. Its
            figures are generated examples and are not real UCI historical
            outcomes.
          </p>
        )}
      </section>
      {meta && (
        <section className="panel prose-panel">
          <p className="eyebrow">ACTIVE DATASET</p>
          <h2>Data quality</h2>
          <QualitySummary quality={meta.quality} />
          <p>
            Counts describe cleaning of the active sample or upload. The full
            source-workbook quality report is generated separately by the
            preparation script in data/processed/quality.json. Missing-value
            counts are for retained records. Exclusions apply before filters.
          </p>
        </section>
      )}
      <section className="panel prose-panel">
        <p className="eyebrow">METRIC DEFINITIONS</p>
        <h2>Numbers with a clear meaning</h2>
        <dl className="definition-list">
          <div>
            <dt>Gross sales</dt>
            <dd>
              Sum of Quantity × UnitPrice for valid positive purchases that are
              not cancellation invoices.
            </dd>
          </div>
          <div>
            <dt>Returns & net sales</dt>
            <dd>
              C-prefixed invoices or negative quantities contribute −|Quantity ×
              UnitPrice|. Net sales sum all signed values. Returns show their
              positive absolute value. Returns are booked on their own invoice
              date, without matching to an original purchase.
            </dd>
          </div>
          <div>
            <dt>Orders & basket value</dt>
            <dd>
              Orders count distinct qualifying purchase invoices. Average order
              value is gross sales ÷ purchase orders. An absent denominator
              returns N/A.
            </dd>
          </div>
          <div>
            <dt>Customer behaviour</dt>
            <dd>
              Only identified customers with purchases are counted. Returning
              customer percentage is customers with two or more distinct
              purchase invoices ÷ all identified purchasing customers × 100.
            </dd>
          </div>
          <div>
            <dt>Filters & comparisons</dt>
            <dd>
              Start and end dates are inclusive, in the dataset’s timezone-free
              retail calendar. Markets match exactly. Comparisons use the
              preceding equal number of calendar days when the whole date range
              lies within the dataset bounds. Changes are relative percentages
              and are omitted when the previous value is zero. Internal gaps are
              assumed to mean no recorded activity, not guaranteed coverage.
            </dd>
          </div>
          <div>
            <dt>Product rankings</dt>
            <dd>
              Group by stock code. Use the most frequent non-missing description
              in the selected period. Missing descriptions are excluded from
              rankings but stay in financial totals. Contribution divides each
              named product’s gross sales by all gross sales.
            </dd>
          </div>
        </dl>
      </section>
      <section className="panel prose-panel">
        <h2>A portfolio demonstration, with practical limits</h2>
        <p>
          This project demonstrates analytics engineering and interface design.
          It does not provide financial advice, tax reporting, predictions or
          accounting reconciliation. RFM is descriptive. Uploads are temporary,
          unauthenticated bearer-token sessions; public deployments should
          disable uploads until a security review. No external analytics,
          advertising or LLM calls are implemented.
        </p>
        <p>
          <Link href="/privacy">Privacy Policy</Link>{" "}
          <span className="caption-separator">/</span>{" "}
          <Link href="/terms">Terms of Use</Link>
        </p>
      </section>
    </>
  );
}
function Legal({ section }: { section: string }) {
  return (
    <section className="panel prose-panel legal-panel">
      <p className="notice">
        Draft requiring legal and security review before commercial deployment.
        Compliance has not been independently verified.
      </p>
      <p className="eyebrow">LAST UPDATED 10 OCTOBER 2026</p>
      {section === "privacy" ? (
        <>
          <h2>Data we process</h2>
          <p>
            The demonstration uses an attributed, processed UCI Online Retail
            sample, or an explicitly labelled synthetic fallback. Uploaded CSVs
            are transmitted to the configured FastAPI backend. They may include
            transaction dates, product details, country and customer
            identifiers. Upload only data you are authorized to process and
            avoid personal names, email addresses, payment data or other
            sensitive records.
          </p>
          <h2>Storage and retention</h2>
          <p>
            The application holds accepted uploads in API process memory in
            isolated sessions, using an unpredictable bearer token. Tokens are
            held in frontend memory and cleared on page reload. Sessions expire
            after the configured lifetime, normally 30 minutes. Expired records
            are removed during the next session-store operation; process
            restarts also remove them. You can delete the session using “Delete
            session & use demo”. Temporary multipart buffers may be managed by
            the server framework and operating system during a request. The
            application does not permanently save raw uploads.
          </p>
          <h2>Service providers and logs</h2>
          <p>
            Your browser connects to the frontend host and API host. Hosting
            providers may collect access logs, IP addresses and technical
            metadata under their own policies. Application code does not log raw
            transaction records. This project adds no advertising trackers,
            third-party analytics or LLM service calls. Self-hosted font files
            are included in the frontend.
          </p>
          <h2>Sharing and control</h2>
          <p>
            Anyone possessing an upload session token can access its data until
            expiration or deletion. The UI and exports expose aggregate customer
            segments, not individual customer identifiers. CSV product exports
            may contain product descriptions from your data. The demonstration
            has no account system or permanent customer database.
          </p>
          <h2>Before launch</h2>
          <p>
            The deployer must provide an operator identity and contact address,
            identify hosting providers and regions, review retention and
            security controls, and update this policy to reflect the actual
            deployment. Do not use the public demo for confidential commercial
            records.
          </p>
        </>
      ) : (
        <>
          <h2>Purpose and permitted use</h2>
          <p>
            InsightFlow is a portfolio and educational demonstration of retail
            analytics. You may explore the demonstration data and, where uploads
            are enabled, analyze compatible data you have permission to process.
            You remain responsible for the accuracy, authorization and
            suitability of uploaded information.
          </p>
          <h2>Interpretation and limitations</h2>
          <p>
            Results use the documented cleaning and calculation rules. A
            historical sample does not represent full business accounts. Returns
            are not reconciled to original invoices. Customer segments describe
            selected purchase history and do not predict future behaviour.
            Insights are deterministic observations. Nothing in the application
            constitutes financial, legal, tax or investment advice.
          </p>
          <h2>Availability and retention</h2>
          <p>
            The demo is provided as available, with no service-level guarantee.
            Upload sessions are temporary and may disappear on expiration or
            server restart. Export reports before the session expires if you
            need to retain analysis. Validate all outputs before making
            operational decisions.
          </p>
          <h2>Dataset and software</h2>
          <p>
            UCI Online Retail is attributed to Daqing Chen (2015), DOI
            10.24432/C5BW33, under CC BY 4.0. Software is licensed separately
            under the repository’s MIT license. The dataset’s license and
            attribution requirements continue to apply to redistributed data.
          </p>
          <h2>Commercial use</h2>
          <p>
            Before offering this as a commercial service, the operator must
            review security, hosting terms, contracts, privacy obligations and
            these draft terms. Operator identity, jurisdiction, dispute
            provisions and contact details must be supplied during that review.
          </p>
        </>
      )}
    </section>
  );
}
