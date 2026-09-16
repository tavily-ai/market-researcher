import asyncio
import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Callable, Dict, List, Optional, TypeVar

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from models import (Source, State, StockDigestOutput, StockReport,
                    TavilyMetrics, get_stock_report_schema)
from prompts import METRICS_PROMPT, RESEARCH_PROMPT
from tavily import AsyncTavilyClient, TavilyClient

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
        self.async_tavily_client = AsyncTavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
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

        results_to_use = yahoo_results if yahoo_results else search_results["results"]
        content = "\n".join(
            f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\nContent: {r.get('content', '')}\n"
            for r in results_to_use
        )

        metrics = self.openai_llm.with_structured_output(TavilyMetrics).invoke(
            METRICS_PROMPT.format(ticker=ticker, content=content)
        )
        return ticker, metrics

    def _run_parallel(
        self,
        tickers: List[str],
        func: Callable[[str], tuple[str, T]],
        fallback: Callable[[str], T],
    ) -> Dict[str, T]:
        """Run a function in parallel for all tickers."""
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
                    logger.info("Completed %s (%s/%s)", ticker, i, total)
                except Exception as e:
                    logger.warning(f"Error for {ticker}: {e}")
                    results[ticker] = fallback(ticker)
                    logger.info("Failed %s (%s/%s)", ticker, i, total)
        return results

    def stock_metrics_node(self, state: State) -> Dict:
        """Fetch stock metrics for all tickers."""
        metrics = self._run_parallel(
            state["tickers"],
            self._fetch_metrics,
            lambda _: TavilyMetrics(),
        )
        return {"tavily_metrics": metrics}

    def stock_research_node(self, state: State) -> Dict:
        """Research all tickers using Tavily Research endpoint."""
        reports = self._run_parallel(
            state["tickers"],
            self._research_ticker,
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

    @staticmethod
    def _stream_event_payload(raw_event: str) -> Optional[dict]:
        """Extract a JSON payload from one Tavily SSE event."""
        data_lines = [line[5:].strip() for line in raw_event.splitlines() if line.startswith("data:")]
        if not data_lines:
            return None
        try:
            return json.loads("\n".join(data_lines))
        except json.JSONDecodeError:
            return None

    @staticmethod
    def _report_from_stream(ticker: str, content: object, sources: list[dict]) -> StockReport:
        """Build the existing report shape from Tavily's final streamed content."""
        if isinstance(content, str):
            try:
                content = json.loads(content)
            except json.JSONDecodeError:
                content = {}
        content = content if isinstance(content, dict) else {}
        return StockReport(
            ticker=ticker,
            company_name=content.get("company_name", ticker),
            summary=content.get("summary", f"Research completed for {ticker}"),
            current_performance=content.get("current_performance", "Performance data not available"),
            key_insights=content.get("key_insights", []),
            recommendation=content.get("recommendation", "Unable to provide recommendation"),
            risk_assessment=content.get("risk_assessment", "Risk assessment not available"),
            price_outlook=content.get("price_outlook", "Outlook not available"),
            market_cap=content.get("market_cap"),
            pe_ratio=content.get("pe_ratio"),
            sources=[
                Source(
                    url=source.get("url", ""),
                    title=source.get("title", source.get("url", "")),
                    source=source.get("source") or source.get("domain"),
                    domain=source.get("domain"),
                    published_date=source.get("published_date"),
                    score=source.get("score", 0.0),
                )
                for source in sources
            ],
        )

    async def stream_digest(self, tickers: List[str]):
        """Yield real Tavily Research stream events followed by the completed digest."""
        reports: Dict[str, StockReport] = {}

        for ticker in tickers:
            yield {"type": "progress", "message": f"Starting research for {ticker}…"}
            content: object = {}
            sources: list[dict] = []
            buffer = ""

            try:
                stream = await self.async_tavily_client.research(
                    input=RESEARCH_PROMPT.format(ticker=ticker, date=self.current_date),
                    output_schema=get_stock_report_schema(),
                    model=self.research_model,
                    stream=True,
                )
                async for chunk in stream:
                    buffer += chunk.decode("utf-8")
                    while "\n\n" in buffer:
                        raw_event, buffer = buffer.split("\n\n", 1)
                        payload = self._stream_event_payload(raw_event)
                        if not payload:
                            continue
                        if payload.get("object") == "error":
                            raise RuntimeError(payload.get("error", "Tavily research failed"))
                        delta = (payload.get("choices") or [{}])[0].get("delta", {})
                        tool_calls = delta.get("tool_calls", {})
                        for tool_call in tool_calls.get("tool_call", []):
                            name = tool_call.get("name", "Research")
                            detail = tool_call.get("arguments", "")
                            yield {"type": "progress", "message": f"{ticker}: {name} — {detail}"}
                        for tool_response in tool_calls.get("tool_response", []):
                            name = tool_response.get("name", "Research")
                            yield {"type": "progress", "message": f"{ticker}: {name} completed"}
                        if "content" in delta:
                            content = delta["content"]
                        if "sources" in delta:
                            sources = delta["sources"]
            except Exception as error:
                logger.exception("Streaming research failed for %s", ticker)
                yield {"type": "progress", "message": f"{ticker}: research unavailable; preparing available results…"}
                reports[ticker] = _create_error_report(ticker)
                continue

            report = self._report_from_stream(ticker, content, sources)
            yield {"type": "progress", "message": f"{ticker}: extracting financial metrics…"}
            try:
                _, metrics = await asyncio.to_thread(self._fetch_metrics, ticker)
                report.tavily_metrics = metrics
            except Exception:
                logger.exception("Metrics retrieval failed for %s", ticker)
            reports[ticker] = report

        yield {"type": "complete", "digest": StockDigestOutput(reports=reports).model_dump()}
