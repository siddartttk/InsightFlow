import type { TooltipContentProps } from "recharts";
import { chartPalette, chartTheme } from "@/lib/design-system";

export interface ChartLegendEntry {
  key: string;
  label: string;
  color: string;
  dashed?: boolean;
  shape?: "line" | "square";
}

export function ChartLegend({
  entries,
  label = "Chart legend",
}: {
  entries: ChartLegendEntry[];
  label?: string;
}) {
  return (
    <div className="chart-legend" role="list" aria-label={label}>
      {entries.map((entry) => (
        <span key={entry.key} role="listitem">
          <svg
            width={entry.shape === "square" ? 10 : 22}
            height="10"
            aria-hidden="true"
          >
            {entry.shape === "square" ? (
              <rect
                x="1"
                y="1"
                width="8"
                height="8"
                rx="1"
                fill={entry.color}
              />
            ) : (
              <line
                x1="1"
                y1="5"
                x2="21"
                y2="5"
                stroke={entry.color}
                strokeWidth="2.6"
                strokeDasharray={
                  entry.dashed ? chartTheme.line.comparisonDash : undefined
                }
              />
            )}
          </svg>
          {entry.label}
        </span>
      ))}
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatLabel = String,
  formatValue,
  footer,
  colorOverride,
}: TooltipContentProps & {
  formatLabel?: (value: string) => string;
  formatValue: (value: number | null) => string;
  footer?: string;
  colorOverride?: string;
}) {
  if (!active || !payload?.length) return null;
  // Area and line layers can share a key. Announce each actual series only once.
  const visible = payload.filter(
    (entry) => entry.type !== "none" && !entry.hide,
  );
  const unique = visible.filter(
    (entry, index, entries) =>
      entries.findIndex((other) => other.dataKey === entry.dataKey) === index,
  );
  if (!unique.length) return null;
  return (
    <div className="data-tooltip" role="tooltip">
      <p className="data-tooltip-heading">{formatLabel(String(label ?? ""))}</p>
      <div className="data-tooltip-values">
        {unique.map((entry, index) => (
          <div key={`${String(entry.dataKey)}-${index}`}>
            <span>
              <i
                style={{
                  background:
                    colorOverride || entry.color || chartPalette.slate,
                }}
                aria-hidden="true"
              />
              {entry.name}
            </span>
            <strong>
              {formatValue(
                typeof entry.value === "number" ? entry.value : null,
              )}
            </strong>
          </div>
        ))}
      </div>
      {footer && <p className="data-tooltip-footer">{footer}</p>}
    </div>
  );
}
