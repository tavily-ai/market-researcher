# Stock Portfolio Researcher

Research a small portfolio of stocks with Tavily, then review a grounded daily digest with financial metrics, key risks, price outlooks, and linked sources.

![Stock Portfolio Researcher interface](UI/public/portfolio-researcher.png)

## What it does

- Research up to five tickers at a time from a curated picker or a custom symbol.
- Stream live Tavily Research activity to the interface, including planning, searches, and report generation.
- Produce structured per-stock reports: current performance, key insights, risk assessment, recommendation, and price outlook.
- Enrich reports with finance-oriented search results and OpenAI structured extraction for metrics such as current price, CAGR, Sharpe ratio, drawdown, and two-year highs/lows.
- Show source links, company icons, and export the completed digest as a PDF.

## Requirements

- Python 3.9+
- Node.js 20+
- A [Tavily API key](https://app.tavily.com/home)
- An OpenAI API key

## Quick start

1. Create a root `.env` file from the sample.

   ```bash
   cp .env-sample .env
   ```

2. Add the OpenAI key required by the backend for metrics extraction.

   ```dotenv
   OPENAI_API_KEY=sk-...
   ```

   The live UI requires each user to enter their Tavily API key before starting research. The key is sent only with that request and is not saved by the app.

3. Start the backend.

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   uvicorn app:app --reload --host 127.0.0.1 --port 8080
   ```

4. In a second terminal, start the frontend.

   ```bash
   cd UI
   npm install
   npm run dev
   ```

5. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

The frontend targets `http://127.0.0.1:8080` by default. To use another backend, create `UI/.env` with:

```dotenv
VITE_BACKEND_URL=http://your-host:8080
```

## How research works

The primary UI workflow uses `POST /api/stock-digest/stream`, an SSE endpoint. The backend starts up to five Tavily Research streams concurrently, forwards their interleaved planning/search/report events to the browser, and sends the completed structured digest as the final event.

```text
Browser
  │ POST /api/stock-digest/stream
  ▼
FastAPI SSE endpoint
  ├── Tavily Research stream ──► live progress events
  ├── Tavily finance search
  └── OpenAI structured metric extraction
  ▼
Completed portfolio digest + source links
```

Tavily Research receives a JSON schema generated from the `StockReport` Pydantic model. This keeps the report fields consistent while grounding the research in sourced web results. The current streaming event flow follows Tavily's [Research streaming documentation](https://docs.tavily.com/documentation/api-reference/endpoint/research-streaming).

## API

### `POST /api/stock-digest/stream`

Primary endpoint used by the UI. Responds as `text/event-stream`.

```json
{
  "tickers": ["AAPL", "MSFT"],
  "research_model": "mini"
}
```

The stream emits `progress`, `complete`, and `error` events. The `complete` event contains the digest payload.

### `POST /api/stock-digest`

Non-streaming endpoint retained for direct API consumers. It runs the LangGraph workflow and returns the completed digest as JSON.

### `GET /`

Health check. Returns:

```json
{ "message": "Alive" }
```

## Project structure

```text
market-researcher/
├── backend/
│   ├── app.py          # FastAPI and SSE endpoints
│   ├── agent.py        # Tavily, OpenAI, LangGraph, and streaming logic
│   ├── models.py       # Pydantic output models and Tavily schema
│   ├── prompts.py      # Research and metric-extraction prompts
│   └── requirements.txt
├── UI/
│   ├── public/         # Tavily visual assets and README screenshot
│   └── src/            # React interface and PDF export utility
├── .env-sample
└── README.md
```

## Notes

- Research can take a few minutes, particularly when using the `pro` model.
- Financial information is generated from live web research and should be independently verified before making investment decisions.
- API usage can incur charges from Tavily and OpenAI.
