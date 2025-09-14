export interface StockFinanceData {
  ticker: string;
  current_price: number;
  company_name: string;
  market_cap?: number;
  price_to_earnings_ratio?: string;
  eps?: string;
  dividend_yield?: string;
}

export interface TavilyStockMetrics {
  sharpe_ratio?: number;
  annualized_cagr?: number;
  latest_open_price?: number;
  latest_close_price?: number;
  trading_volume?: number;
  two_year_price_high?: number;
  two_year_price_low?: number;
  max_drawdown?: number;
  market_cap?: number;
}

export interface StockReport {
  ticker: string;
  company_name: string;
  summary: string;  // Step 1 from prompt: summary of most important insights
  current_performance: string;  // Step 2 from prompt
  key_insights: string[];  // Step 3 from prompt
  recommendation: string;  // Step 4 from prompt
  risk_assessment: string;  // Step 5 from prompt
  price_outlook: string;  // Step 6 from prompt
  sources: Source[];
  finance_data?: StockFinanceData;
  tavily_metrics?: TavilyStockMetrics;
}

export interface Source {
  ticker: string;
  title: string;
  url: string;
  source: string;
  domain: string;
  published_date: string;
  score: number;
}

export interface PDFData {
  pdf_base64: string;
  filename: string;
}

export interface StockDigestResponse {
  reports: Record<string, StockReport>;
  generated_at: string;
  market_overview: string;
  ticker_suggestions?: Record<string, string>;
  pdf_data?: PDFData;
}

export interface StockDigestRequest {
  tickers: string[];
} 