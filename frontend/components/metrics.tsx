import type { Metric } from "@/lib/types";
import { money, number, percent } from "@/lib/formatters";
import type { CSSProperties } from "react";
import { metricColors, chartPalette } from "@/lib/design-system";
export function Metrics({
  metrics,
  primary = false,
}: {
  metrics: Metric[];
  primary?: boolean;
}) {
  return (
    <section
      className={`metrics ${primary ? "primary-metrics" : ""}`}
      aria-label="Key performance indicators"
    >
      {metrics.map((m) => (
        <article
          className="metric"
          key={m.key}
          data-metric={m.key}
          style={
            {
              "--metric-accent":
                m.key === "net" && (m.value ?? 0) < 0
                  ? chartPalette.burgundy
                  : metricColors[m.key] || chartPalette.slate,
            } as CSSProperties
          }
        >
          <div className="metric-title">
            <span className="metric-label">
              <i className="metric-accent" aria-hidden="true" />
              {m.title}
            </span>
            <details className="metric-help">
              <summary
                className="metric-info"
                aria-label={`How ${m.title.toLowerCase()} is calculated`}
              >
                i
              </summary>
              <p>{m.description}</p>
            </details>
          </div>
          <strong className="metric-value">
            {m.unit === "currency"
              ? money(m.value)
              : m.unit === "percent"
                ? percent(m.value)
                : number(m.value)}
          </strong>
          <div
            className={`metric-change ${m.change === null ? "unavailable" : (m.key === "returns" ? m.change <= 0 : m.change >= 0) ? "positive" : "negative"}`}
          >
            {m.change === null ? (
              <span>Comparison unavailable</span>
            ) : (
              <>
                <span className="trend-badge">
                  <span aria-hidden="true">{m.change >= 0 ? "↗" : "↘"}</span>
                  <span className="sr-only">
                    {m.change >= 0 ? "Increased" : "Decreased"} by{" "}
                  </span>
                  {Math.abs(m.change).toFixed(1)}%
                </span>
                <span className="comparison-note">vs. prior period</span>
              </>
            )}
          </div>
          <p className="metric-description">{m.description}</p>
        </article>
      ))}
    </section>
  );
}
