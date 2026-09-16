import json
import os
from typing import List

import uvicorn
from agent import StockDigestAgent
from dotenv import load_dotenv
from fastapi import Cookie, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

app = FastAPI()


load_dotenv()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StockDigestRequest(BaseModel):
    tickers: List[str]
    research_model: str = "mini"  # "mini" or "pro"

@app.get("/")
async def ping():
    return {"message": "Alive"}


@app.post("/api/stock-digest")
async def analyze_stocks(request: StockDigestRequest):
    try:
        # Validate tickers is non-empty
        if not request.tickers:
            raise HTTPException(status_code=400, detail="tickers must be a non-empty list")
            
        # Validate research model
        if request.research_model not in ("mini", "pro"):
            raise HTTPException(status_code=400, detail="research_model must be 'mini' or 'pro'")
        
        # Create and initialize the stock digest agent
        agent = StockDigestAgent(research_model=request.research_model)

        # Run the stock digest workflow
        final_state = await agent.run_digest(request.tickers)
        
        # Convert to dict for JSON serialization
        return final_state.model_dump()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stock-digest/stream")
async def stream_stock_digest(request: StockDigestRequest):
    """Stream real Tavily Research progress events and the completed digest over SSE."""
    if not request.tickers:
        raise HTTPException(status_code=400, detail="tickers must be a non-empty list")
    if request.research_model not in ("mini", "pro"):
        raise HTTPException(status_code=400, detail="research_model must be 'mini' or 'pro'")

    async def events():
        try:
            agent = StockDigestAgent(research_model=request.research_model)
            async for event in agent.stream_digest(request.tickers):
                event_type = event.pop("type")
                yield f"event: {event_type}\ndata: {json.dumps(event)}\n\n"
        except Exception as error:
            yield f"event: error\ndata: {json.dumps({'message': str(error)})}\n\n"

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    uvicorn.run(app=app, host="0.0.0.0", port=8080)
