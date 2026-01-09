# Stock Portfolio Researcher

A comprehensive stock analysis and digest generation system powered by Tavily's Research endpoint. The system uses schema-driven research to gather grounded web data, fill structured reports, and return verified sources.

![Stock Portfolio Researcher Demo](market_researcher.gif)

## Setup and Installation

### Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8080
```

### Frontend Setup
```bash
cd UI
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in the backend directory:
```
TAVILY_API_KEY=your_tavily_api_key
OPENAI_API_KEY=your_openai_api_key
```

## How It Works: Tavily Research Endpoint

The core of this system is **Tavily's Research endpoint**, which provides schema-driven, grounded research. Here's how it works:

### 1. Define an Output Schema

We define a Pydantic model (`StockReport`) that describes the structure we want:

```python
class StockReport(BaseModel):
    company_name: str
    summary: str
    current_performance: str
    key_insights: List[str]
    recommendation: str
    risk_assessment: str
    price_outlook: str
    market_cap: Optional[float]
    pe_ratio: Optional[float]
```

The `get_stock_report_schema()` function converts this to a JSON schema that Tavily understands.

### 2. Send Research Request with Schema

```python
response = tavily_client.research(
    input=RESEARCH_PROMPT.format(ticker=ticker, date=current_date),
    output_schema=get_stock_report_schema(),
    model="mini"  # or "pro" for deeper research
)
```

### 3. Tavily Researches the Web

Tavily's Research endpoint:
- Searches multiple authoritative sources (Reuters, Bloomberg, Yahoo Finance, etc.)
- Extracts relevant information matching your schema fields
- Grounds all data in real web sources
- Returns structured content that fills your schema

### 4. Get Structured Data + Sources

The response contains:
- **`content`**: Structured data matching your schema (company name, summary, insights, etc.)
- **`sources`**: List of sources with URLs, titles, domains, published dates, and relevance scores

```python
result = response["content"]  # Your filled schema
sources = response["sources"]  # Grounded sources for verification

report = StockReport(
    ticker=ticker,
    company_name=result.get("company_name"),
    summary=result.get("summary"),
    key_insights=result.get("key_insights"),
    # ... etc
    sources=[Source(url=s["url"], title=s["title"], ...) for s in sources]
)
```

This approach ensures:
- ✅ **Structured output** - Data comes back in your exact format
- ✅ **Grounded facts** - All information is sourced from real web data
- ✅ **Source transparency** - Every claim can be traced to its origin
- ✅ **No hallucinations** - Content is extracted, not generated

## Project Structure

```
stock-portfolio-researcher/
├── backend/
│   ├── agent.py          # LangGraph agent with Tavily Research
│   ├── app.py            # FastAPI server
│   ├── models.py         # Pydantic models & schema generation
│   ├── prompts.py        # Research prompts
│   └── requirements.txt  # Python dependencies
├── UI/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── lib/utils.ts  # PDF generation
│   │   └── types/        # TypeScript types
│   └── package.json
└── README.md
```

## Backend Architecture

### LangGraph Workflow

The system uses LangGraph to orchestrate a parallel workflow:

```
                    ┌─────────────────┐
                    │      START      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                              ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  StockResearch  │            │  StockMetrics   │
    │ (Tavily Research│            │ (Tavily Search  │
    │    Endpoint)    │            │  topic=finance) │
    └────────┬────────┘            └────────┬────────┘
              │                              │
              └──────────────┬───────────────┘
                             ▼
                    ┌─────────────────┐
                    │  MergeMetrics   │
                    │ (Combine data)  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │       END       │
                    └─────────────────┘
```

### Node Details

#### 1. StockResearch Node
Uses Tavily's Research endpoint for deep, schema-driven analysis:

```python
def _research_ticker(self, ticker: str) -> tuple[str, StockReport]:
    response = self.tavily_client.research(
        input=RESEARCH_PROMPT.format(ticker=ticker, date=self.current_date),
        output_schema=get_stock_report_schema(),
        model=self.research_model
    )
    response = self._poll_research(response["request_id"])
    
    # Extract structured content
    result = response["content"]
    
    # Extract sources for transparency
    sources = [Source(...) for src in response.get("sources", [])]
    
    return ticker, StockReport(
        company_name=result.get("company_name"),
        summary=result.get("summary"),
        sources=sources,
        # ...
    )
```

The research prompt asks for:
- Current stock price and performance
- Market cap and financial metrics
- Earnings results and guidance
- Recent news and developments
- Analyst ratings and price targets
- Risks and opportunities
- Investment recommendation

#### 2. StockMetrics Node
Uses Tavily Search with `topic="finance"` for real-time financial data:

```python
def _fetch_metrics(self, ticker: str) -> tuple[str, TavilyMetrics]:
    search_results = self.tavily_client.search(
        query=f"Tell me about the stock {ticker}",
        topic="finance",  # Finance-specific search
        search_depth="basic",
        max_results=5,
    )
    
    # Extract from Yahoo Finance results
    metrics = self.openai_llm.with_structured_output(TavilyMetrics).invoke(
        METRICS_PROMPT.format(ticker=ticker, content=content)
    )
    return ticker, metrics
```

Extracts metrics like:
- Sharpe Ratio
- Annualized CAGR
- Max Drawdown
- 2-Year Price High/Low
- Trading Volume
- Current Price

#### 3. MergeMetrics Node
Combines research reports with financial metrics:

```python
def merge_metrics_node(self, state: State) -> Dict:
    for ticker, report in state["structured_reports"].reports.items():
        if ticker in state["tavily_metrics"]:
            report.tavily_metrics = state["tavily_metrics"][ticker]
    return {"structured_reports": state["structured_reports"]}
```

### Parallel Processing

Both StockResearch and StockMetrics run in parallel using `ThreadPoolExecutor`:

```python
def _run_parallel(self, tickers, func, event_name, fallback):
    with ThreadPoolExecutor(max_workers=min(len(tickers), 4)) as executor:
        futures = {executor.submit(func, t): t for t in tickers}
        for future in as_completed(futures):
            ticker, result = future.result()
            results[ticker] = result
    return results
```

### Polling for Async Research

Since Tavily Research is asynchronous, the agent polls until completion:

```python
def _poll_research(self, request_id: str, poll_interval: int = 10) -> dict:
    response = self.tavily_client.get_research(request_id)
    while response["status"] not in ("completed", "failed"):
        time.sleep(poll_interval)
        response = self.tavily_client.get_research(request_id)
    return response
```

## Data Models

### StockReport
Complete analysis for a single stock:
- `ticker`, `company_name` - Stock identification
- `summary` - Executive summary of findings
- `current_performance` - Recent performance analysis
- `key_insights` - Bullet points of important findings
- `recommendation` - Buy/hold/sell with reasoning
- `risk_assessment` - Key risks
- `price_outlook` - Future price expectations
- `sources` - Grounded sources from Tavily

### TavilyMetrics
Real-time financial data:
- `sharpe_ratio`, `annualized_cagr`, `max_drawdown`
- `current_price`, `latest_open_price`
- `two_year_price_high`, `two_year_price_low`
- `trading_volume`

### Source
Attribution for transparency:
- `url`, `title`, `domain`
- `published_date`, `score`

## API Endpoint

### POST /api/stock-digest
Generate a complete stock digest for multiple tickers.

**Request:**
```json
{
  "tickers": ["AAPL", "GOOGL", "MSFT"]
}
```

**Response:**
```json
{
  "reports": {
    "AAPL": {
      "ticker": "AAPL",
      "company_name": "Apple Inc.",
      "summary": "...",
      "key_insights": ["...", "..."],
      "sources": [{"url": "...", "title": "..."}],
      "tavily_metrics": {"sharpe_ratio": 1.2, ...}
    }
  },
  "generated_at": "2026-01-08T..."
}
```

## Frontend Features

### User Flow
1. **Ticker Input** - Enter up to 5 stock symbols
2. **Report Generation** - Triggers backend research via API
3. **Portfolio Overview** - View detailed reports for each ticker
4. **Source Verification** - See all sources used for each analysis
5. **PDF Export** - Download professional reports

### Key Components
- **TickerInput** - Smart input with validation and suggestions
- **DailyDigestReport** - Tabbed report viewer with all analysis sections
- **PDF Export** - Professional formatted reports with all data

### Report Sections
1. **Summary** - Executive overview of the stock
2. **Financial Metrics** - Key numbers in a clean table
3. **Key Insights** - Bullet points of important findings
4. **Current Performance** - Recent price and market performance
5. **Risk Assessment** - Key risks to consider
6. **Price Outlook** - Future price expectations
7. **Recommendation** - Clear buy/hold/sell with reasoning
8. **Sources** - All sources used for the analysis

## Key Technologies

- **Tavily Research API** - Schema-driven, grounded web research
- **Tavily Search API** - Real-time financial data with topic="finance"
- **LangGraph** - Workflow orchestration with parallel execution
- **OpenAI GPT** - Structured extraction from search results
- **FastAPI** - Async Python backend
- **React + TypeScript** - Modern frontend
- **jsPDF** - Client-side PDF generation
