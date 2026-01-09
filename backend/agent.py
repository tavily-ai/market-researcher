import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Callable, Dict, List, TypeVar

from dotenv import load_dotenv
from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from models import (Source, State, StockDigestOutput, StockReport,
                    TavilyMetrics, get_stock_report_schema)
from prompts import METRICS_PROMPT, RESEARCH_PROMPT
from tavily import TavilyClient

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

T = TypeVar("T")


def _create_error_report(ticker: str) -> StockReport:
    """Create a fallback report when research fails."""
    return StockReport(
        ticker=ticker,
        company_name=ticker,
        summary=f"Research failed for {ticker}",
        current_performance="Unable to analyze",
        key_insights=[],
        recommendation="Unable to provide recommendation",
        risk_assessment="Unable to assess risks",
        price_outlook="Unable to provide outlook",
        sources=[],
    )


class StockDigestAgent:
    def __init__(self, research_model: str = "mini"):
        api_key = os.getenv("OPENAI_API_KEY")
        self.openai_llm = ChatOpenAI(model="gpt-5-mini", api_key=api_key)
        self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        self.current_date = datetime.now().strftime("%Y-%m-%d")
        self.research_model = research_model  # "mini" or "pro"

    def _poll_research(self, request_id: str, poll_interval: int = 10, max_poll_time: int = 300) -> dict:
        """Poll Tavily research endpoint until completion or failure.
        
        Args:
            request_id: The Tavily research request ID to poll.
            poll_interval: Seconds between poll attempts (default: 10).
            max_poll_time: Maximum seconds to poll before timeout (default: 300).
            
        Raises:
            TimeoutError: If polling exceeds max_poll_time.
            RuntimeError: If research status is "failed".
        """
        start_time = time.monotonic()
        response = self.tavily_client.get_research(request_id)
        while response["status"] not in ("completed", "failed"):
            elapsed = time.monotonic() - start_time
            if elapsed >= max_poll_time:
                raise TimeoutError(
                    f"Research polling timed out after {max_poll_time}s. "
                    f"Last status: {response.get('status', 'unknown')}"
                )
            logger.info(f"Research status: {response['status']}... polling in {poll_interval}s")
            time.sleep(poll_interval)
            response = self.tavily_client.get_research(request_id)
        if response["status"] == "failed":
            raise RuntimeError(f"Research failed: {response.get('error', 'Unknown error')}")
        return response

    def _research_ticker(self, ticker: str) -> tuple[str, StockReport]:
        """Research a single ticker using Tavily Research endpoint."""
        try:
            response = self.tavily_client.research(
                input=RESEARCH_PROMPT.format(ticker=ticker, date=self.current_date),
                output_schema=get_stock_report_schema(),
                model=self.research_model
            )
            response = self._poll_research(response["request_id"])
            result = response["content"]

            sources = [
                Source(
                    url=src.get("url", ""),
                    title=src.get("title", ""),
                    source=src.get("source"),
                    domain=src.get("domain"),
                    published_date=src.get("published_date"),
                    score=src.get("score", 0.0)
                )
                for src in response.get("sources", [])
            ]

            report = StockReport(
                ticker=ticker,
                company_name=result.get("company_name", ticker),
                summary=result.get("summary", f"Research completed for {ticker}"),
                current_performance=result.get("current_performance", "Performance data not available"),
                key_insights=result.get("key_insights", []),
                recommendation=result.get("recommendation", "Unable to provide recommendation"),
                risk_assessment=result.get("risk_assessment", "Risk assessment not available"),
                price_outlook=result.get("price_outlook", "Outlook not available"),
                market_cap=result.get("market_cap"),
                pe_ratio=result.get("pe_ratio"),
                sources=sources,
            )
            logger.info(f"Research completed for {ticker}")
            return ticker, report

        except Exception as e:
            logger.error(f"Error researching {ticker}: {e}")
            return ticker, _create_error_report(ticker)

    def _fetch_metrics(self, ticker: str) -> tuple[str, TavilyMetrics]:
        """Fetch stock metrics using Tavily search and OpenAI extraction."""
        search_results = self.tavily_client.search(
            query=f"Tell me about the stock {ticker}",
            search_depth="basic",
            max_results=5,
            chunks_per_source=5,
            topic="finance",
        )

        yahoo_results = [
            r for r in search_results["results"]
            if r["url"].startswith("https://finance.yahoo.com/quote")
        ]

        if yahoo_results:
            content = "\n".join(
                f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\nContent: {r.get('content', '')}\n"
                for r in yahoo_results
            )
        else:
            content = f"No Yahoo Finance data found for {ticker}. Extract from general results."

        metrics = self.openai_llm.with_structured_output(TavilyMetrics).invoke(
            METRICS_PROMPT.format(ticker=ticker, content=content)
        )
        return ticker, metrics

    def _run_parallel(
        self,
        tickers: List[str],
        func: Callable[[str], tuple[str, T]],
        event_name: str,
        fallback: Callable[[str], T],
    ) -> Dict[str, T]:
        """Run a function in parallel for all tickers with progress events."""
        results: Dict[str, T] = {}
        total = len(tickers)
        if total == 0:
            return results

        with ThreadPoolExecutor(max_workers=min(total, 4)) as executor:
            futures = {executor.submit(func, t): t for t in tickers}
            for i, future in enumerate(as_completed(futures), 1):
                ticker = futures[future]
                try:
                    _, result = future.result()
                    results[ticker] = result
                    dispatch_custom_event(event_name, f"Completed {ticker} ({i}/{total})")
                except Exception as e:
                    logger.warning(f"Error for {ticker}: {e}")
                    results[ticker] = fallback(ticker)
                    dispatch_custom_event(event_name, f"Failed {ticker} ({i}/{total})")
        return results

    def stock_metrics_node(self, state: State) -> Dict:
        """Fetch stock metrics for all tickers."""
        dispatch_custom_event("stock_metrics_status", "Fetching stock metrics...")
        metrics = self._run_parallel(
            state["tickers"],
            self._fetch_metrics,
            "finance_ticker",
            lambda _: TavilyMetrics(),
        )
        return {"tavily_metrics": metrics}

    def stock_research_node(self, state: State) -> Dict:
        """Research all tickers using Tavily Research endpoint."""
        dispatch_custom_event("stock_research_status", "Performing deep research on stocks...")
        reports = self._run_parallel(
            state["tickers"],
            self._research_ticker,
            "stock_research_ticker",
            _create_error_report,
        )
        return {"structured_reports": StockDigestOutput(reports=reports)}

    def merge_metrics_node(self, state: State) -> Dict:
        """Merge Tavily metrics into stock reports."""
        structured_reports = state["structured_reports"]
        tavily_metrics = state.get("tavily_metrics", {})
        for ticker, report in structured_reports.reports.items():
            if ticker in tavily_metrics:
                report.tavily_metrics = tavily_metrics[ticker]
        return {"structured_reports": structured_reports}

    def build_graph(self):
        """Build the LangGraph workflow."""
        graph = StateGraph(State)
        graph.add_node("StockResearch", self.stock_research_node)
        graph.add_node("StockMetrics", self.stock_metrics_node)
        graph.add_node("MergeMetrics", self.merge_metrics_node)

        # Run research and metrics in parallel, then merge
        graph.add_edge(START, "StockResearch")
        graph.add_edge(START, "StockMetrics")
        graph.add_edge("StockResearch", "MergeMetrics")
        graph.add_edge("StockMetrics", "MergeMetrics")
        graph.add_edge("MergeMetrics", END)

        return graph.compile()

    async def run_digest(self, tickers: List[str]) -> StockDigestOutput:
        """Run the stock digest workflow for given tickers."""
        logger.info(f"Starting stock digest for tickers: {tickers}")
        graph = self.build_graph()
        final_state = await graph.ainvoke({"tickers": tickers, "date": self.current_date})
        return final_state["structured_reports"]
