from typing import Literal
from pydantic import BaseModel


class Quality(BaseModel):
    input_rows: int
    duplicate_rows: int
    invalid_rows: int
    missing_customer_rows: int
    missing_description_rows: int
    missing_country_rows: int
    purchase_rows: int
    return_rows: int
    retained_rows: int
    invalid_date_rows: int = 0
    invalid_price_rows: int = 0
    invalid_quantity_rows: int = 0
    missing_invoice_rows: int = 0
    missing_stockcode_rows: int = 0


class Metadata(BaseModel):
    name: str
    source: str
    synthetic: bool
    start: str
    end: str
    countries: list[str]
    quality: Quality
    uploads_enabled: bool
    session_ttl_seconds: int


class Metric(BaseModel):
    key: str
    title: str
    value: float | None
    unit: Literal['currency', 'number', 'percent']
    description: str
    change: float | None = None


class Overview(BaseModel):
    metrics: list[Metric]
    comparison_available: bool
    previous_start: str
    previous_end: str
    rows: int


class RevenuePoint(BaseModel):
    date: str
    gross: float
    net: float
    returns: float
    orders: int
    rows: int
    aov: float | None


class Country(BaseModel):
    country: str
    revenue: float
    share: float
    orders: int


class Revenue(BaseModel):
    series: list[RevenuePoint]
    countries: list[Country]


class Product(BaseModel):
    code: str
    description: str
    revenue: float
    quantity: int
    orders: int
    share: float


class Products(BaseModel):
    products: list[Product]
    ranked_revenue: float
    excluded_revenue: float


class Segment(BaseModel):
    segment: str
    customers: int
    revenue: float
    share: float
    avg_recency: float
    avg_frequency: float


class Customers(BaseModel):
    identified: int
    repeat: int
    repeat_percent: float | None
    revenue: float
    revenue_per_customer: float | None
    anonymous_revenue: float
    segments: list[Segment]
    reference_date: str
    methodology: str


class Insight(BaseModel):
    category: str
    title: str
    detail: str
    evidence: str


class Insights(BaseModel):
    insights: list[Insight]
    methodology: str


class UploadResult(BaseModel):
    token: str
    expires_in: int
    metadata: Metadata
    preview: list[dict[str, str | int | float | None]]
