from datetime import datetime
from typing import Dict, List
from typing import Optional as OptionalType
from pydantic import BaseModel, Field
from typing_extensions import TypedDict


class Source(BaseModel):
    url: str = Field(description="URL of the source")
    title: str = Field(description="Title of the source")
    date: OptionalType[str] = Field(default=None, description="Date of the source")


class StockFinanceData(BaseModel):
    ticker: str = Field(description="Stock ticker symbol")
    current_price: float = Field(description="Current stock price")
    market_cap: OptionalType[float] = Field(default=None, description="Market capitalization")
    company_name: str = Field(description="Company name")
    price_to_earnings_ratio: OptionalType[str] = Field(default=None, description="P/E ratio")
    eps: OptionalType[str] = Field(default=None, description="Earnings per share")
    dividend_yield: OptionalType[str] = Field(default=None, description="Dividend yield")

class TavilyMetrics(BaseModel):
    sharpe_ratio: OptionalType[float] = Field(default=None, description="Sharpe ratio")
    annualized_cagr: OptionalType[float] = Field(default=None, description="Annualized CAGR")
    latest_open_price: OptionalType[float] = Field(default=None, description="Latest open price")
    latest_close_price: OptionalType[float] = Field(default=None, description="Latest close price")
    trading_volume: OptionalType[float] = Field(default=None, description="Trading volume")
    two_year_price_high: OptionalType[float] = Field(default=None, description="2-year price high")
    two_year_price_low: OptionalType[float] = Field(default=None, description="2-year price low")
    max_drawdown: OptionalType[float] = Field(default=None, description="Max drawdown")
    market_cap: OptionalType[float] = Field(default=None, description="Market capitalization")
    

class StockResearch(BaseModel):
    ticker: str = Field(description="Stock ticker symbol")
    news_summary: str = Field(description="Summary of recent news")
    key_developments: List[str] = Field(default_factory=list, description="Key developments")
    analyst_sentiment: str = Field(description="Analyst sentiment")
    risk_factors: List[str] = Field(default_factory=list, description="Risk factors")
    price_targets: OptionalType[str] = Field(default=None, description="Price targets")
    sources: List[Source] = Field(default_factory=list, description="Sources of information")


class TargetedResearch(BaseModel):
    ticker: str = Field(description="Stock ticker symbol")
    earnings_news: List[Dict] = Field(default_factory=list, description="Earnings related news")
    analyst_ratings: List[Dict] = Field(default_factory=list, description="Analyst ratings")
    insider_trading: List[Dict] = Field(default_factory=list, description="Insider trading information")
    technical_analysis: List[Dict] = Field(default_factory=list, description="Technical analysis")
    sector_news: List[Dict] = Field(default_factory=list, description="Sector related news")


class StockReport(BaseModel):
    ticker: str = Field(description="Stock ticker symbol")
    company_name: str = Field(description="Company name")
    summary: str = Field(description="Summary of the stock analysis")
    current_performance: str = Field(description="Current performance analysis")
    key_insights: List[str] = Field(default_factory=list, description="Key insights from analysis")
    recommendation: str = Field(description="Investment recommendation")
    risk_assessment: str = Field(description="Risk assessment")
    price_outlook: str = Field(description="Price outlook")
    sources: List[Source] = Field(default_factory=list, description="Sources of information")
    finance_data: OptionalType[StockFinanceData] = Field(default=None, description="Financial data")
    tavily_metrics: OptionalType[TavilyMetrics] = Field(default=None, description="Tavily financial metrics")


class StockDigestOutput(BaseModel):
    reports: Dict[str, StockReport] = Field(default_factory=dict, description="Stock reports by ticker")
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="Generation timestamp")
    market_overview: OptionalType[str] = Field(default=None, description="Market overview")
    ticker_suggestions: Dict[str, str] = Field(description="Suggested tickers with reasons")


class PDFData(BaseModel):
    pdf_base64: str = Field(description="Base64 encoded PDF data")
    filename: str = Field(description="PDF filename")


class State(TypedDict):
    tickers: List[str]
    finance_data: Dict[str, StockFinanceData]
    tavily_metrics: Dict[str, TavilyMetrics]
    research_data: Dict[str, StockResearch]
    targeted_research: Dict[str, TargetedResearch]
    all_news_stories: List[tuple]
    structured_reports: StockDigestOutput
    pdf_data: OptionalType[PDFData]
    date: str
    recommendations_raw_text: str
    ticker_suggestions: Dict[str, str] 