import type { CSSProperties } from "react";

// One palette for SVG, HTML chart legends, data accents and exported images.
export const chartPalette = {
  teal: "#176f67",
  blue: "#426b92",
  copper: "#985928",
  olive: "#60712f",
  burgundy: "#a13f56",
  plum: "#7c5b86",
  slate: "#5e6c77",
} as const;

export const chartWashes = {
  teal: "#e1eeea",
  blue: "#e4ebf2",
  copper: "#f2e7da",
  olive: "#e8ecdc",
  burgundy: "#f2e2e7",
  plum: "#ece4ef",
  slate: "#e6ebee",
} as const;

export const chartTheme = {
  background: "#f2f0e9",
  tooltipBackground: "#faf8f1",
  text: "#25362f",
  muted: "#5e6c62",
  grid: "#d7ddd0",
  border: "#a7b3ad",
  hover: "#e8ece2",
  positive: chartPalette.teal,
  negative: chartPalette.burgundy,
  axis: { fontSize: 12, line: chartPalette.slate },
  line: {
    width: 2.6,
    comparisonWidth: 1.9,
    comparisonDash: "6 4",
    fillOpacity: 0.09,
    activeRadius: 5,
  },
} as const;

export const chartSeries = {
  net: { label: "Net sales", color: chartPalette.teal, wash: chartWashes.teal },
  gross: {
    label: "Gross sales",
    color: chartPalette.blue,
    wash: chartWashes.blue,
  },
  orders: {
    label: "Purchase orders",
    color: chartPalette.olive,
    wash: chartWashes.olive,
  },
  aov: {
    label: "Average order value",
    color: chartPalette.plum,
    wash: chartWashes.plum,
  },
  returns: {
    label: "Returns & cancellations",
    color: chartPalette.burgundy,
    wash: chartWashes.burgundy,
  },
} as const;
export type ChartMeasure = keyof typeof chartSeries;

const comparisonPalettes = {
  products: [
    chartPalette.copper,
    chartPalette.blue,
    chartPalette.olive,
    chartPalette.plum,
    chartPalette.teal,
  ],
  countries: [
    chartPalette.blue,
    chartPalette.teal,
    chartPalette.copper,
    chartPalette.olive,
    chartPalette.plum,
  ],
} as const;

// Highlight the top five revenue contributors; all remaining entries use slate.
// Product colors are derived before quantity sorting, so both rankings agree.
export function revenueRankColors(
  keys: readonly string[],
  kind: keyof typeof comparisonPalettes,
) {
  return new Map(
    keys.map((key, index) => [
      key,
      comparisonPalettes[kind][index] || chartPalette.slate,
    ]),
  );
}

export const segmentColors: Record<string, string> = {
  Champions: chartPalette.teal,
  "Loyal Customers": chartPalette.blue,
  "Potential Loyalists": chartPalette.olive,
  "At Risk": chartPalette.burgundy,
  Hibernating: chartPalette.slate,
};

export const metricColors: Record<string, string> = {
  gross: chartSeries.gross.color,
  net: chartSeries.net.color,
  orders: chartSeries.orders.color,
  aov: chartSeries.aov.color,
  returns: chartSeries.returns.color,
  customers: chartPalette.teal,
  identified: chartPalette.teal,
  repeat: chartPalette.olive,
  products: chartPalette.copper,
  ranked: chartPalette.copper,
  excluded: chartPalette.slate,
  anonymous: chartPalette.slate,
};

export const chartCssVariables = {
  "--chart-positive": chartTheme.positive,
  "--chart-negative": chartTheme.negative,
  "--chart-positive-wash": chartWashes.teal,
  "--chart-negative-wash": chartWashes.burgundy,
  "--chart-slate": chartPalette.slate,
  "--chart-background": chartTheme.tooltipBackground,
  "--chart-border": chartTheme.border,
  "--chart-net": chartSeries.net.color,
  "--chart-gross": chartSeries.gross.color,
} as CSSProperties;
