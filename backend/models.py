from datetime import datetime
from typing import Dict, List
from typing import Optional as OptionalType

from pydantic import BaseModel, Field
from typing_extensions import TypedDict


class Source(BaseModel):
    url: str = Field(description="URL of the source")
    title: str = Field(description="Title of the source")
    source: OptionalType[str] = Field(default=None, description="Source name/publisher")
    domain: OptionalType[str] = Field(default=None, description="Domain of the source")
    published_date: OptionalType[str] = Field(default=None, description="Publication date of the source")
    score: OptionalType[float] = Field(default=0.0, description="Relevance score")


class TavilyMetrics(BaseModel):
    annualized_cagr: OptionalType[float] = Field(default=None, description="Annualized CAGR percentage")
    sharpe_ratio: OptionalType[float] = Field(default=None, description="Sharpe ratio")
    max_drawdown: OptionalType[float] = Field(default=None, description="Maximum drawdown percentage")
    two_year_price_high: OptionalType[float] = Field(default=None, description="2-year price high in dollars")
    two_year_price_low: OptionalType[float] = Field(default=None, description="2-year price low in dollars")
    latest_open_price: OptionalType[float] = Field(default=None, description="Latest open price")
    current_price: OptionalType[float] = Field(default=None, description="Current/latest stock price")
    trading_volume: OptionalType[float] = Field(default=None, description="Trading volume")


class StockReport(BaseModel):
    ticker: str = Field(description="Stock ticker symbol")
    company_name: str = Field(description="Company name")
    summary: str = Field(description="Summary of the stock analysis")
    current_performance: str = Field(description="Current performance analysis")
    key_insights: List[str] = Field(default_factory=list, description="Key insights from analysis")
    recommendation: str = Field(description="Investment recommendation")
    risk_assessment: str = Field(description="Risk assessment")
    price_outlook: str = Field(description="Price outlook")
    market_cap: OptionalType[float] = Field(default=None, description="Market capitalization in dollars")
    pe_ratio: OptionalType[float] = Field(default=None, description="Price-to-earnings ratio")
    sources: List[Source] = Field(default_factory=list, description="Sources of information")
    tavily_metrics: OptionalType[TavilyMetrics] = Field(default=None, description="Tavily stock metrics")


class StockDigestOutput(BaseModel):
    reports: Dict[str, StockReport] = Field(default_factory=dict, description="Stock reports by ticker")
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Generation timestamp")


class State(TypedDict):
    tickers: List[str]
    structured_reports: StockDigestOutput
    tavily_metrics: Dict[str, TavilyMetrics]
    date: str

def get_stock_report_schema() -> dict:
    """Generate Tavily output schema from StockReport model, excluding ticker, sources, and tavily_metrics."""
    schema = StockReport.model_json_schema()
    excluded = ("ticker", "sources", "tavily_metrics")
    properties = {}
    for k, v in schema.get("properties", {}).items():
        if k in excluded:
            continue
        # Handle Optional types that generate anyOf schema
        if "anyOf" in v:
            # Extract the non-null type from anyOf
            for option in v["anyOf"]:
                if option.get("type") != "null":
                    v = {**option, "description": v.get("description", "")}
                    break
        properties[k] = v
    required = [f for f in schema.get("required", []) if f not in excluded]
    return {"properties": properties, "required": required}