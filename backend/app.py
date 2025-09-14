from typing import List

from fastapi import Cookie, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from agent import StockDigestAgent
import os

app = FastAPI()


load_dotenv()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("VITE_APP_URL") if os.getenv("VITE_APP_URL") else []
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StockDigestRequest(BaseModel):
    tickers: List[str]

@app.get("/")
async def ping():
    return {"message": "Alive"}


@app.post("/api/stock-digest")
async def analyze_stocks(request: StockDigestRequest):
    try:
        # Create and initialize the stock digest agent with the provided API key
        agent = StockDigestAgent()

        # Run the stock digest workflow
        final_state = await agent.run_digest(request.tickers)
        
        # Convert the result to a dictionary for JSON serialization
        response_data = {
            "reports": {},
            "generated_at": final_state.generated_at,
            "market_overview": final_state.market_overview,
            "ticker_suggestions": final_state.ticker_suggestions,
        }
        
        # Convert each stock report to a dictionary
        for ticker, report in final_state.reports.items():
            response_data["reports"][ticker] = {
                "ticker": report.ticker,
                "company_name": report.company_name,
                "summary": report.summary,
                "current_performance": report.current_performance,
                "key_insights": report.key_insights,
                "recommendation": report.recommendation,
                "risk_assessment": report.risk_assessment,
                "price_outlook": report.price_outlook,
                "sources": report.sources,
                "finance_data": report.finance_data,
                "tavily_metrics": report.tavily_metrics
            }
        
        return response_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=8080)