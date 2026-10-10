"use client";
import { useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Country, Product, RevenuePoint } from "@/lib/types";
import { dateLabel, money, number, shortMoney } from "@/lib/formatters";
import { saveBlob } from "@/lib/api";
import { useData } from "./data-provider";
import { Icon } from "./icon";
import { StatusMessage, TableViewport } from "./ui";
import {
  chartPalette,
  chartSeries,
  chartTheme,
  chartWashes,
  revenueRankColors,
  type ChartMeasure,
} from "@/lib/design-system";
import { ChartLegend, ChartTooltip } from "./chart-primitives";
export function TrendChart({
  series,
  volume = false,
}: {
  series: RevenuePoint[];
  volume?: boolean;
}) {
  const { filters, setFilters } = useData();
  const [view, setView] = useState<ChartMeasure>(volume ? "orders" : "net");
  const container = useRef<HTMLDivElement>(null);
  const [exported, setExported] = useState(false);
  const [compare, setCompare] = useState(true);
  const isCount = view === "orders";
  const sum = series.reduce((total, p) => total + (p[view] || 0), 0);
  const financial = view === "net" || view === "gross";
  const comparison = view === "gross" ? "net" : "gross";
  const measure = {
    ...chartSeries[view],
    color:
      view === "net" && sum < 0
        ? chartPalette.burgundy
        : chartSeries[view].color,
    wash:
      view === "net" && sum < 0 ? chartWashes.burgundy : chartSeries[view].wash,
  };
  const legend = [
    { key: view, ...measure },
    ...(financial && compare
      ? [{ key: comparison, ...chartSeries[comparison], dashed: true }]
      : []),
  ];
  function exportChart() {
    const svg = container.current?.querySelector("svg.recharts-surface");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute(
      "style",
      `background:${chartTheme.background};font-family:Arial,sans-serif`,
    );
    const title = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "title",
    );
    title.textContent = `${legend.map((entry) => entry.label).join(" and ")} from ${filters.start} to ${filters.end}, ${filters.country || "all markets"}`;
    clone.prepend(title);
    // Include the visible legend in the downloaded SVG, above the chart plot.
    const width = Number(clone.getAttribute("width"));
    const height = Number(clone.getAttribute("height"));
    const stackedLegend = width < 420;
    const legendHeight = stackedLegend ? 12 + legend.length * 24 : 36;
    const plot = document.createElementNS("http://www.w3.org/2000/svg", "g");
    while (clone.firstChild) plot.append(clone.firstChild);
    plot.setAttribute("transform", `translate(0,${legendHeight})`);
    clone.append(plot);
    clone.setAttribute("height", String(height + legendHeight));
    clone.setAttribute("viewBox", `0 0 ${width} ${height + legendHeight}`);
    legend.forEach((entry, index) => {
      const offset = stackedLegend ? 15 : 15 + index * 200;
      const legendY = stackedLegend ? 18 + index * 24 : 18;
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", String(offset));
      line.setAttribute("x2", String(offset + 20));
      line.setAttribute("y1", String(legendY));
      line.setAttribute("y2", String(legendY));
      line.setAttribute("stroke", entry.color);
      line.setAttribute("stroke-width", "2.6");
      if ("dashed" in entry && entry.dashed)
        line.setAttribute("stroke-dasharray", chartTheme.line.comparisonDash);
      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", String(offset + 28));
      text.setAttribute("y", String(legendY + 4));
      text.setAttribute("fill", chartTheme.text);
      text.setAttribute("font-size", "12");
      text.textContent = entry.label;
      clone.append(line, text);
    });
    saveBlob(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: "image/svg+xml",
      }),
      `insightflow-${view}-${filters.start}-${filters.end}.svg`,
    );
    setExported(true);
  }
  return (
    <section
      className="panel trend-panel"
      data-chart={volume ? "volume" : "revenue"}
      data-measure={view}
    >
      <div className="panel-header">
        <div>
          <p className="eyebrow">PERFORMANCE OVER TIME</p>
          <h2>{volume ? "Order volume & basket value" : "Revenue trend"}</h2>
        </div>
        <div className="chart-controls">
          <div
            className="segmented-control"
            role="group"
            aria-label="Chart interval"
          >
            {(["daily", "weekly", "monthly"] as const).map((interval) => (
              <button
                key={interval}
                className={filters.interval === interval ? "selected" : ""}
                aria-pressed={filters.interval === interval}
                onClick={() => setFilters({ ...filters, interval })}
              >
                {interval[0].toUpperCase() + interval.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="icon-button chart-export"
            aria-label="Download chart as SVG image"
            disabled={!series.some((point) => point.rows > 0)}
            onClick={exportChart}
          >
            <Icon name="download" size={17} />
          </button>
        </div>
      </div>
      {exported && (
        <StatusMessage tone="success" onDismiss={() => setExported(false)}>
          Chart download prepared. Check your browser downloads.
        </StatusMessage>
      )}
      <div className="chart-summary">
        <div className="chart-series">
          <span
            className="legend-swatch"
            style={{ background: measure.color }}
          />
          <label htmlFor={volume ? "volume-measure" : "revenue-measure"}>
            Measure
          </label>
          <select
            id={volume ? "volume-measure" : "revenue-measure"}
            value={view}
            onChange={(event) => setView(event.target.value as typeof view)}
          >
            {volume ? (
              <>
                <option value="orders">Purchase orders</option>
                <option value="aov">Average order value</option>
              </>
            ) : (
              <>
                <option value="net">Net sales</option>
                <option value="gross">Gross sales</option>
                <option value="returns">Returns & cancellations</option>
              </>
            )}
          </select>
        </div>
        <span
          className="chart-total data-highlight"
          style={{ background: measure.wash }}
        >
          {view === "aov"
            ? "Per-period average"
            : `${isCount ? number(sum) : money(sum)} in selected period`}
        </span>
      </div>
      <div className="chart-key-row">
        <ChartLegend entries={legend} />
        {financial && (
          <label className="chart-compare">
            <input
              type="checkbox"
              checked={compare}
              onChange={(event) => setCompare(event.target.checked)}
            />
            Compare gross & net
          </label>
        )}
      </div>
      <div
        className="chart-area"
        ref={container}
        role="img"
        aria-label={`${legend.map((entry) => entry.label).join(" and ")} by ${filters.interval} period. Exact values are available in the data table below.`}
      >
        {series.some((p) => p.rows > 0) ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 12, right: 15, bottom: 4, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid
                stroke={chartTheme.grid}
                vertical={false}
                strokeDasharray="2 6"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v + "T12:00:00").toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })
                }
                axisLine={false}
                tickLine={false}
                minTickGap={45}
                tick={{
                  fontSize: chartTheme.axis.fontSize,
                  fill: chartTheme.muted,
                }}
                dy={8}
              />
              <YAxis
                width={65}
                tickFormatter={isCount ? number : shortMoney}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: chartTheme.axis.fontSize,
                  fill: chartTheme.muted,
                }}
              />
              <Tooltip
                filterNull={false}
                cursor={{
                  stroke: chartTheme.axis.line,
                  strokeWidth: 1,
                  strokeDasharray: "3 4",
                }}
                content={(props) => (
                  <ChartTooltip
                    {...props}
                    formatLabel={dateLabel}
                    formatValue={isCount ? number : money}
                  />
                )}
              />
              {series.some((point) => (point[view] || 0) < 0) && (
                <ReferenceLine
                  y={0}
                  stroke={chartTheme.axis.line}
                  strokeDasharray="3 4"
                />
              )}
              <Area
                tooltipType="none"
                dataKey={view}
                type="linear"
                fill={measure.color}
                fillOpacity={chartTheme.line.fillOpacity}
                stroke="none"
                isAnimationActive={false}
              />
              <Line
                className="chart-line-primary"
                dataKey={view}
                name={measure.label}
                type="linear"
                stroke={measure.color}
                strokeWidth={chartTheme.line.width}
                dot={
                  series.length === 1 ? { r: 4, fill: measure.color } : false
                }
                activeDot={{
                  r: chartTheme.line.activeRadius,
                  stroke: measure.color,
                  strokeWidth: 2.5,
                  fill: chartTheme.background,
                }}
                isAnimationActive={false}
              />
              {financial && compare && (
                <Line
                  className="chart-line-comparison"
                  dataKey={comparison}
                  name={chartSeries[comparison].label}
                  type="linear"
                  stroke={chartSeries[comparison].color}
                  strokeWidth={chartTheme.line.comparisonWidth}
                  strokeDasharray={chartTheme.line.comparisonDash}
                  dot={
                    series.length === 1
                      ? { r: 3, fill: chartSeries[comparison].color }
                      : false
                  }
                  activeDot={{
                    r: 4,
                    stroke: chartSeries[comparison].color,
                    strokeWidth: 2,
                    fill: chartTheme.background,
                  }}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            No transactions in this selection. Try another date range or market.
          </div>
        )}
      </div>
      <div className="chart-footer">
        <span>
          {filters.interval === "weekly"
            ? "Weeks begin Monday. Boundary periods may be partial."
            : filters.interval === "monthly"
              ? "Calendar months. Boundary periods may be partial."
              : "Calendar days. Dates are inclusive."}
        </span>
        <details>
          <summary>View chart data</summary>
          <TableViewport label="Revenue chart data, scroll horizontally for all columns">
            <table>
              <caption className="sr-only">
                Exact revenue, order and basket values by period.
              </caption>
              <thead>
                <tr>
                  <th>Period start</th>
                  <th>Gross sales</th>
                  <th>Net sales</th>
                  <th>Returns</th>
                  <th>Orders</th>
                  <th>AOV</th>
                </tr>
              </thead>
              <tbody>
                {series.map((p) => (
                  <tr key={p.date}>
                    <td>{p.date}</td>
                    <td>{money(p.gross)}</td>
                    <td>{money(p.net)}</td>
                    <td>{money(p.returns)}</td>
                    <td>{number(p.orders)}</td>
                    <td>{money(p.aov)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableViewport>
        </details>
      </div>
    </section>
  );
}
export function ProductBars({
  products,
  quantity = false,
  limit = 5,
}: {
  products: Product[];
  quantity?: boolean;
  limit?: number;
}) {
  const colors = revenueRankColors(
    [...products]
      .sort((a, b) => b.revenue - a.revenue)
      .map((product) => product.code),
    "products",
  );
  const rows = [...products]
    .sort((a, b) =>
      quantity ? b.quantity - a.quantity : b.revenue - a.revenue,
    )
    .slice(0, limit);
  return (
    <section
      className="panel product-ranking"
      data-ranking={quantity ? "quantity" : "revenue"}
    >
      <div className="panel-header">
        <div>
          <p className="eyebrow">PRODUCT PERFORMANCE</p>
          <h2>{quantity ? "Best sellers by quantity" : "Leading products"}</h2>
        </div>
        <span className="panel-badge">TOP {limit}</span>
      </div>
      {rows.length ? (
        <div className="ranked-products">
          {rows.map((p, i) => (
            <div
              className="ranked-product"
              key={p.code}
              data-product-code={p.code}
            >
              <span
                className="rank-number"
                style={{ color: colors.get(p.code) }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="rank-body">
                <div className="rank-label">
                  <span title={p.description}>
                    {p.description.toLowerCase()}
                  </span>
                  <strong>
                    {quantity ? number(p.quantity) : money(p.revenue)}
                  </strong>
                </div>
                <div className="rank-track">
                  <span
                    style={{
                      width: `${(quantity ? p.quantity / rows[0].quantity : p.revenue / rows[0].revenue) * 100}%`,
                      background: colors.get(p.code),
                    }}
                  />
                </div>
                <div className="rank-meta">
                  <span>{p.code}</span>
                  <span>
                    {quantity
                      ? "units sold"
                      : `${p.share.toFixed(1)}% of gross sales`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-chart">No named products in this selection.</div>
      )}
      {rows.length > 0 && (
        <p className="chart-color-note">
          Colors highlight the top five products by gross sales; other products
          use slate.
        </p>
      )}
    </section>
  );
}
export function CountryBars({ countries }: { countries: Country[] }) {
  const colors = revenueRankColors(
    countries.map((country) => country.country),
    "countries",
  );
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">MARKET PERFORMANCE</p>
          <h2>Revenue by country</h2>
        </div>
        <div
          className="market-heading-stat data-highlight"
          style={{ background: chartWashes.blue }}
        >
          <strong>
            {countries.length ? `${countries[0].share.toFixed(1)}%` : "N/A"}
          </strong>
          <span>{countries[0]?.country || "No purchases"}</span>
        </div>
      </div>
      <div
        className="country-chart"
        role="img"
        aria-label="Top six countries by gross sales"
      >
        {countries.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={countries.slice(0, 6)}
              layout="vertical"
              margin={{ left: 0, right: 24, top: 8, bottom: 0 }}
              accessibilityLayer
            >
              <CartesianGrid stroke={chartTheme.grid} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={shortMoney}
                tick={{
                  fontSize: chartTheme.axis.fontSize,
                  fill: chartTheme.muted,
                }}
                minTickGap={24}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="country"
                type="category"
                width={115}
                tick={{
                  fontSize: chartTheme.axis.fontSize,
                  fill: chartTheme.text,
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: chartTheme.hover }}
                content={(props) => {
                  const point = props.payload?.[0]?.payload as
                    Country | undefined;
                  return (
                    <ChartTooltip
                      {...props}
                      formatValue={money}
                      colorOverride={
                        point ? colors.get(point.country) : undefined
                      }
                      footer={
                        point
                          ? `${point.share.toFixed(1)}% of gross sales · ${number(point.orders)} orders`
                          : undefined
                      }
                    />
                  );
                }}
              />
              <Bar
                dataKey="revenue"
                name="Gross sales"
                fill={chartPalette.blue}
                barSize={21}
                radius={[0, 2, 2, 0]}
                activeBar={{ stroke: chartTheme.text, strokeWidth: 1.3 }}
                isAnimationActive={false}
              >
                {countries.slice(0, 6).map((country) => (
                  <Cell
                    key={country.country}
                    fill={colors.get(country.country)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">
            No market revenue in this selection.
          </div>
        )}
      </div>
      <div className="chart-footer">
        <span className="chart-color-note">
          Colors highlight the top five markets by gross sales; other markets
          use slate.
        </span>
        <details>
          <summary>View all market totals</summary>
          <TableViewport label="Market revenue table, scroll horizontally for all columns">
            <table>
              <caption className="sr-only">
                Gross sales, contribution and orders by country.
              </caption>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Gross sales</th>
                  <th>Share</th>
                  <th>Orders</th>
                </tr>
              </thead>
              <tbody>
                {countries.map((c) => (
                  <tr key={c.country}>
                    <td>{c.country}</td>
                    <td>{money(c.revenue)}</td>
                    <td>{c.share.toFixed(1)}%</td>
                    <td>{number(c.orders)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableViewport>
        </details>
      </div>
    </section>
  );
}
