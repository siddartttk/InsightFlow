export interface Quality {
  input_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
  missing_customer_rows: number;
  missing_description_rows: number;
  missing_country_rows: number;
  purchase_rows: number;
  return_rows: number;
  retained_rows: number;
}
export interface Metadata {
  name: string;
  source: string;
  synthetic: boolean;
  start: string;
  end: string;
  countries: string[];
  quality: Quality;
  uploads_enabled: boolean;
  session_ttl_seconds: number;
}
export interface Metric {
  key: string;
  title: string;
  value: number | null;
  unit: "currency" | "number" | "percent";
  description: string;
  change: number | null;
}
export interface RevenuePoint {
  date: string;
  gross: number;
  net: number;
  returns: number;
  orders: number;
  rows: number;
  aov: number | null;
}
export interface Country {
  country: string;
  revenue: number;
  share: number;
  orders: number;
}
export interface Product {
  code: string;
  description: string;
  revenue: number;
  quantity: number;
  orders: number;
  share: number;
}
export interface Segment {
  segment: string;
  customers: number;
  revenue: number;
  share: number;
  avg_recency: number;
  avg_frequency: number;
}
export interface Customers {
  identified: number;
  repeat: number;
  repeat_percent: number | null;
  revenue: number;
  revenue_per_customer: number | null;
  anonymous_revenue: number;
  segments: Segment[];
  reference_date: string;
  methodology: string;
}
export interface Insight {
  category: string;
  title: string;
  detail: string;
  evidence: string;
}
export interface Dashboard {
  overview: {
    metrics: Metric[];
    comparison_available: boolean;
    previous_start: string;
    previous_end: string;
    rows: number;
  };
  revenue: { series: RevenuePoint[]; countries: Country[] };
  products: {
    products: Product[];
    ranked_revenue: number;
    excluded_revenue: number;
  };
  customers: Customers;
  insights: { insights: Insight[]; methodology: string };
}
export interface Filters {
  start: string;
  end: string;
  country: string;
  interval: "daily" | "weekly" | "monthly";
}
export interface UploadResult {
  token: string;
  expires_in: number;
  metadata: Metadata;
  preview: Record<string, string | number | null>[];
}
