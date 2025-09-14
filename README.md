# Stock Portoflio Researcher

A comprehensive stock analysis and digest generation system that provides detailed market insights, financial data, and research for your portfolio.

![Stock Portfolio Researcher Demo](market_researcher.gif)


## Setup and Installation

### Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8080 or python app.py
```

```bash
cd UI
npm install
npm run dev
```
### Environment Variables
Create a `.env` file in the backend directory:
```
TAVILY_API_KEY=
GROQ_API_KEY=
VITE_APP_URL=
```

## Backend Features

### Core Functionality
- **Real-time Financial Data**: Fetch current metrics from Tavily Search with topic="Finance"
- **Comprehensive Research**: Gather news and analysis from multiple financial sources using Tavily
- **AI-Powered Analysis**: Generate insights using GROQ Kimi-k2
- **Targeted Research**: Perform comprehensive searches for earnings, analyst ratings, insider trading, technical analysis, and sector news
- **Market Overview**: Create comprehensive market summaries using LangChain's refine summarization chain
- **Stock Recommendations**: Research and extract current analyst picks and trending stocks, excluding user's existing tickers
- **Parallel Processing**: Efficient processing of multiple tickers using ThreadPoolExecutor

### Targeted Research Categories
The system performs comprehensive searches for each ticker and categorizes results across these areas:

1. **Earnings News**: Quarterly results, revenue growth, profit margins, guidance
2. **Analyst Ratings**: Price targets, upgrades, downgrades, buy/sell recommendations
3. **Insider Trading**: SEC filings, executive stock transactions, Form 4 reports
4. **Technical Analysis**: Support/resistance levels, moving averages, RSI, MACD
5. **Sector News**: Industry trends, competitor analysis, regulatory updates

## Project Structure

```
financial-research-agent/
├── agent.py              # Main agent with LangGraph workflow
├── app.py                # FastAPI server
├── models.py             # Pydantic data models
├── prompts.py            # AI prompt templates
├── requirements.txt      # Python dependencies
└── README.md            # Project documentation
```

## Backend Architecture

### LangGraph Workflow
The system uses LangGraph to orchestrate a 7-step workflow with real-time progress tracking. Multiple nodes run in parallel for improved performance:

1. **StockMetrics Node**: 
   - Fetches financial data using Tavily Search with topic="Finance"
   - Gets the latest financial data like annualized CAGR, Sharpe ratio, max drawdown, price high (2-year), price low (2 year)

2. **TargetedResearch Node**: 
   - Performs comprehensive keyword searches for each ticker using Tavily
   - Categorizes results into earnings, analyst ratings, insider trading, technical analysis, and sector news
   - Implements parallel processing with ThreadPoolExecutor for efficiency
   - Targets specific financial domains (Reuters, Bloomberg, CNBC, etc.)

3. **AnalysisFormatter Node**: 
   - Generates structured stock reports using Groq's Kimi-k2 model
   - Creates comprehensive analysis with summary, performance, insights, recommendations, and risk assessment
   - Uses Pydantic models for consistent structured output
   - Implements parallel processing for multiple tickers

4. **MarketOverviewSummary Node**: 
   - Creates comprehensive market overview using LangChain's refine summarization chain
   - Aggregates all ticker data into a holistic market perspective
   - Combines financial metrics, analysis, and insights across all stocks

5. **StockRecommendationsResearch Node**: 
   - Searches for current stock recommendations and analyst picks using Tavily
   - Focuses on trending stocks, upgrades, and buy ratings
   - Excludes user's existing tickers from recommendations
   - Targets financial news domains for quality recommendations

6. **RecommendationFormatting Node**: 
   - Uses Groq models to extract and format stock recommendations from research
   - Parses JSON responses to identify ticker symbols and reasoning
   - Validates ticker format and reasoning quality
   - Excludes user's existing tickers from suggestions

7. **FinalAssembly Node**: 
   - Combines structured reports with ticker suggestions
   - Assembles the final StockDigestOutput with all components
   - Ensures data consistency across the workflow

### Data Models
- `StockFinanceData`: Financial metrics using Tavily topic 'finance'
- `TargetedResearch`: Categorized research results from Tavily searches
- `StockReport`: Complete analysis with recommendations and insights
- `StockDigestOutput`: Complete digest with reports, market overview, and recommendations
- `State`: LangGraph state management for workflow coordination

## API Endpoint

### POST /api/stock-digest
Generate a complete stock digest for multiple tickers.

## Frontend Features

### User Flow
1. **Ticker Input**: Users enter up to 5 stock ticker symbols (e.g., AAPL, GOOGL, MSFT) using the intuitive input interface
2. **Report Generation**: Click "Generate Report" to trigger comprehensive analysis via the backend API
3. **Portfolio Overview**: View detailed reports for each ticker with performance metrics, insights, and recommendations
4. **Market Analysis**: Access comprehensive market overview and trending stock recommendations
5. **Export Options**: Download complete reports as PDF for offline viewing and sharing

### Key Components
- **TickerInput**: Smart input validation with popular ticker suggestions and duplicate prevention
- **DailyDigestReport**: Comprehensive report viewer with tabbed navigation for individual stocks
- **Portfolio Overview**: Aggregated view showing performance across all selected tickers
- **Stock Recommendations**: AI-powered suggestions for new investment opportunities
- **PDF Export**: Professional PDF generation with formatted reports, charts, and analysis

### Features
- **Real-time Validation**: Instant feedback on ticker input with error handling
- **Responsive Design**: Modern UI with mobile-friendly interface using Tailwind CSS
- **Interactive Charts**: Visual representation of stock performance and trends
- **Source Attribution**: Transparent display of research sources and data origins
- **Export Functionality**: Professional PDF reports with company branding and formatting

### Report Sections
Each stock report includes comprehensive analysis across these key sections:

1. **Stock Overview**: Company summary and general market position
2. **Key Insights**: Bullet-pointed list of critical findings and developments
3. **Current Performance**: Analysis of recent performance trends and metrics
4. **Risk Assessment**: Evaluation of investment risks and volatility factors
5. **Price Outlook**: Future price projections and market sentiment
6. **Final Recommendation**: Clear buy/hold/sell recommendation with reasoning

### Key Performance Metrics
The system tracks and displays essential financial metrics for each stock:

- **Annualized CAGR**: Compound Annual Growth Rate showing long-term performance
- **Sharpe Ratio**: Risk-adjusted return measure (higher is better)
- **Max Drawdown**: Largest peak-to-trough decline percentage
- **Price High/Low (2-Year)**: Historical price range over the past 2 years
- **Trading Volume**: Market activity and liquidity indicators
- **Market Cap**: Company valuation and size classification