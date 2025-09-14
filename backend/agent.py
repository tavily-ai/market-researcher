import logging
import os
from datetime import datetime
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
from langchain_core.callbacks.manager import dispatch_custom_event
from langchain_core.prompts import PromptTemplate
from langgraph.graph import END, START, StateGraph
from tavily import TavilyClient
import json
import re
from langchain_groq import ChatGroq
from prompts import get_stock_analysis_prompt, get_market_overview_summary_prompt, get_stock_recommendations_extraction_prompt
from models import (
    TargetedResearch, StockReport,
    StockDigestOutput, State, TavilyMetrics
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StockDigestAgent:
    def __init__(self):
        self.report_llm = ChatGroq(
        model="moonshotai/kimi-k2-instruct", api_key=os.getenv("GROQ_API_KEY")
        )

        self.metrics_llm = ChatGroq(
        model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY")
        )

        self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        self.current_date = datetime.now().strftime("%Y-%m-%d")
    
    def fetch_tavily_metrics(self, ticker: str) -> tuple[str, TavilyMetrics]:
        search_results = self.tavily_client.search(
                query=f"Tell me about the stock {ticker}",
                search_depth="basic",
                max_results=5,
                chunks_per_source=5,
                topic='finance',
        )

        results = search_results['results']
        yahoo_results = [x for x in results if x['url'].startswith("https://finance.yahoo.com/quote")]

        # Format the content for the LLM
        if yahoo_results:
            # Extract and format the content from Yahoo Finance results
            formatted_content = []
            for result in yahoo_results:
                content = result.get('content', '')
                title = result.get('title', '')
                url = result.get('url', '')
                formatted_content.append(f"Title: {title}\nURL: {url}\nContent: {content}\n")
            
            combined_content = "\n".join(formatted_content)

        metrics_llm = self.metrics_llm.with_structured_output(TavilyMetrics)

        # Create a proper message for the LLM
        prompt = f"""Extract financial metrics for {ticker} from the following information:

{combined_content}

Please extract the following metrics if available:
- Sharpe ratio
- Annualized CAGR
- Latest open and close prices
- Trading volume
- 2-year price high and low
- Max drawdown
- Market capitalization

If any metric is not available in the data, set it to None."""

        metrics = metrics_llm.invoke(prompt)
        return ticker, metrics



    def stock_metrics_node(self, state: State) -> Dict:
        tickers = state["tickers"]
        tavily_metrics_data = {}

        with ThreadPoolExecutor(max_workers=min(len(tickers), 4)) as executor:
            future_to_ticker = {
                executor.submit(self.fetch_tavily_metrics, ticker): ticker
                for ticker in tickers
            }

            completed_count = 0
            for future in as_completed(future_to_ticker):
                ticker = future_to_ticker[future]
                try:
                    _, metrics = future.result()
                    metrics.market_cap = metrics.latest_open_price * metrics.trading_volume
                except Exception as e:
                    logger.warning(f"Error fetching Tavily metrics for {ticker}: {e}")
                    metrics = TavilyMetrics()
                tavily_metrics_data[ticker] = metrics
                completed_count += 1
                dispatch_custom_event("finance_ticker", f"Completed {ticker} ({completed_count}/{len(tickers)})")

        return {"tavily_metrics": tavily_metrics_data}

    def _fetch_ticker_research(self, ticker: str) -> tuple[str, TargetedResearch]:
        query = f"{ticker} earnings analyst ratings insider trading technical analysis sector news {self.current_date}"
        search_results = {"results": []}
        
        try:
            search_results = self.tavily_client.search(
                query=query,
                search_depth="advanced",
                max_results=10,
                chunks_per_source=5,
                topic='news',
                include_domains=["reuters.com", "bloomberg.com", "cnbc.com", "marketwatch.com", "yahoo.com", "seekingalpha.com", "wsj.com", "ft.com"]
            )
        except Exception as e:
            logger.warning(f"Error fetching research for {ticker}: {e}")

        stories = [{
            'title': r.get('title', ''),
            'content': r.get('content', ''),
            'url': r.get('url', ''),
            'published_date': r.get('published_date', ''),
            'source': r.get('source', ''),
            'score': r.get('score', 0),
            'domain': r.get('domain', ''),
            'keyword': 'comprehensive'
        } for r in search_results.get('results', [])]

        categorized = {
            "earnings_news": [],
            "analyst_ratings": [],
            "insider_trading": [],
            "technical_analysis": [],
            "sector_news": []
        }

        keywords = {
            "earnings_news": {"earnings", "quarterly", "revenue", "profit", "guidance", "results"},
            "analyst_ratings": {"analyst", "rating", "target", "upgrade", "downgrade", "recommendation"},
            "insider_trading": {"insider", "sec", "filing", "executive", "form 4"},
            "technical_analysis": {"technical", "support", "resistance", "rsi", "macd", "chart"}
        }

        for story in stories:
            content = (story['content'] + ' ' + story['title']).lower()
            assigned = False
            for category, keys in keywords.items():
                if any(k in content for k in keys):
                    categorized[category].append(story)
                    assigned = True
                    break
            if not assigned:
                categorized["sector_news"].append(story)

        research = TargetedResearch(ticker=ticker, **categorized)
        logger.info(f"Research completed for {ticker} with {len(stories)} stories")
        return ticker, research

    def targeted_research_node(self, state: State) -> Dict:
        dispatch_custom_event("targeted_research_status", "Performing comprehensive research...")
        tickers = state["tickers"]
        research_data = {}

        # Parallelize ticker research
        with ThreadPoolExecutor(max_workers=min(len(tickers), 4)) as executor:
            # Submit all tasks
            future_to_ticker = {
                executor.submit(self._fetch_ticker_research, ticker): ticker 
                for ticker in tickers
            }
            
            # Process completed tasks
            completed_count = 0
            for future in as_completed(future_to_ticker):
                ticker = future_to_ticker[future]
                try:
                    ticker, research = future.result()
                    research_data[ticker] = research
                    completed_count += 1
                    dispatch_custom_event("targeted_research_ticker", f"Completed {ticker} ({completed_count}/{len(tickers)})")
                except Exception as e:
                    logger.error(f"Error researching ticker {ticker}: {e}")
                    # Create a default research object for failed ticker
                    research_data[ticker] = TargetedResearch(
                        ticker=ticker,
                        earnings_news=[],
                        analyst_ratings=[],
                        insider_trading=[],
                        technical_analysis=[],
                        sector_news=[]
                    )
                    completed_count += 1
                    dispatch_custom_event("targeted_research_ticker", f"Failed {ticker} ({completed_count}/{len(tickers)})")

        return {"targeted_research": research_data}

    def _analyze_ticker(self, ticker: str, targeted_research: Dict, finance_data: Dict, tavily_metrics: Dict, all_stories: List) -> tuple[str, StockReport]:
        research = targeted_research.get(ticker, {})
        finance = finance_data.get(ticker)
        ticker_tavily_metrics = tavily_metrics.get(ticker)
        ticker_stories = [story for t, story in all_stories if t == ticker]

        try:
            structured_llm = self.report_llm.with_structured_output(StockReport)
            prompt = get_stock_analysis_prompt(ticker, research, ticker_stories, self.current_date)
            report = structured_llm.invoke(prompt)
            
            # The report is already a StockReport object, just add the additional fields
            if hasattr(report, 'model_dump'):
                report_dict = report.model_dump()
            else:
                report_dict = dict(report)
            
            report_dict['sources'] = ticker_stories
            report_dict['finance_data'] = finance
            report_dict['tavily_metrics'] = ticker_tavily_metrics
            return ticker, StockReport(**report_dict)
        except Exception as e:
            logger.warning(f"Groq model failed for ticker {ticker}: {e}.")

    def analysis_formatter_node(self, state: State) -> Dict:
        dispatch_custom_event("gemini_analysis_status", "Generating structured stock reports...")
        tickers = state["tickers"]
        targeted_research = state.get("targeted_research", {})
        finance_data = state.get("finance_data", {})
        tavily_metrics = state.get("tavily_metrics", {})
        

        all_stories = []
        for ticker in tickers:
            research = targeted_research.get(ticker, {})
            if isinstance(research, dict):
                research_dict = research
            elif hasattr(research, 'model_dump'):
                research_dict = research.model_dump()
            else:
                research_dict = {}
            
            for category, stories in research_dict.items():
                if category != 'ticker' and stories:
                    all_stories.extend((ticker, story.copy()) for story in stories)

        reports = {}
        
        # Parallelize ticker analysis
        with ThreadPoolExecutor(max_workers=min(len(tickers), 4)) as executor:
            # Submit all tasks
            future_to_ticker = {
                executor.submit(self._analyze_ticker, ticker, targeted_research, finance_data, tavily_metrics, all_stories): ticker 
                for ticker in tickers
            }
            
            # Process completed tasks
            completed_count = 0
            for future in as_completed(future_to_ticker):
                ticker = future_to_ticker[future]
                try:
                    ticker, report = future.result()
                    reports[ticker] = report
                    completed_count += 1
                    dispatch_custom_event("analysis_ticker", f"Completed {ticker} ({completed_count}/{len(tickers)})")
                except Exception as e:
                    logger.error(f"Error analyzing ticker {ticker}: {e}")
                    # Create a default report for failed ticker
                    reports[ticker] = StockReport(
                        ticker=ticker,
                        company_name=ticker,
                        summary=f"Analysis failed for {ticker}",
                        current_performance="Unable to analyze",
                        key_insights=[],
                        recommendation="Unable to provide recommendation",
                        risk_assessment="Unable to assess risks",
                        price_outlook="Unable to provide outlook",
                        sources=[],
                        finance_data=finance_data.get(ticker),
                        tavily_metrics=tavily_metrics.get(ticker)
                    )
                    completed_count += 1
                    dispatch_custom_event("analysis_ticker", f"Failed {ticker} ({completed_count}/{len(tickers)})")

        return {
            "structured_reports": StockDigestOutput(
                reports=reports,
                market_overview="",
                generated_at=datetime.now().isoformat(),
                ticker_suggestions={}
            )
        }

    def market_overview_summary_node(self, state: State) -> Dict:
        dispatch_custom_event("market_overview_summary_status", "Creating detailed market overview...")
        structured_reports = state["structured_reports"]
        finance_data = state.get("finance_data", {})

        comprehensive_texts = []
        for ticker, report in structured_reports.reports.items():
            finance = finance_data.get(ticker)
            company = finance.company_name if finance else ticker
            market_cap = f"${finance.market_cap/1e9:.2f}B" if finance and finance.market_cap else "N/A"
            text = (
                f"TICKER: {ticker}\n"
                f"COMPANY: {company}\n"
                f"CURRENT PRICE: ${finance.current_price if finance else 'N/A'}\n"
                f"MARKET CAP: {market_cap}\n"
                f"SUMMARY: {report.summary}\n"
                f"CURRENT PERFORMANCE: {report.current_performance}\n"
                f"KEY INSIGHTS: {report.key_insights}\n"
                f"RECOMMENDATION: {report.recommendation}\n"
                f"RISK ASSESSMENT: {report.risk_assessment}\n"
                f"PRICE OUTLOOK: {report.price_outlook}\n"
            )
            comprehensive_texts.append(text)

        concatenated = "\n\n".join(comprehensive_texts)
        refine_prompt = PromptTemplate(input_variables=["text"], template=get_market_overview_summary_prompt())
        
        # Direct report_llm call using the prompt
        overview_result = self.report_llm.invoke(refine_prompt.format(text=concatenated))

        updated_reports = StockDigestOutput(
            reports=structured_reports.reports,
            market_overview=overview_result.content,
            generated_at=structured_reports.generated_at,
            ticker_suggestions=structured_reports.ticker_suggestions
        )
        return {"structured_reports": updated_reports}

    def stock_recommendations_research_node(self, state: State) -> Dict:
        dispatch_custom_event("stock_recommendations_status", "Finding current stock recommendations...")
        
        # Get user's existing tickers to exclude them from recommendations
        user_tickers = state["tickers"]
        user_tickers_str = " ".join(user_tickers)
        
        # Create a query that excludes user's existing tickers and focuses on finding new opportunities
        query = f"top stock picks 2025 analyst buy recommendations emerging growth stocks undervalued opportunities NOT {user_tickers_str}"
        
        try:
            search_results = self.tavily_client.search(
                query=query,
                search_depth="advanced",
                topic="news",
                max_results=8,  # Increased to get more diverse results
            )
            
            # Extract text from search results
            answer_text = search_results.get("answer", "")
            if not answer_text and "results" in search_results:
                results_content = []
                for result in search_results["results"][:6]:
                    if "content" in result:
                        results_content.append(result["content"])
                answer_text = " ".join(results_content)
            
            logger.info(f"Returning state with text length: {len(answer_text)}")
            
            return {"recommendations_raw_text": answer_text}
            
        except Exception as e:
            logger.error(f"Error in stock recommendations research: {e}")
            return {"recommendations_raw_text": ""}

    def recommendation_formatting_node(self, state: State) -> Dict:
        dispatch_custom_event("recommendation_formatting_status", "Formatting stock recommendations...")
        
        raw_text = state.get("recommendations_raw_text", "")
        user_tickers = state["tickers"]  # Get user's existing tickers to exclude them
        logger.info(f"Formatting node received text length: {len(raw_text)}")
        
        ticker_suggestions = {}
        
        if raw_text and len(raw_text.strip()) >= 50:
            extraction_prompt = get_stock_recommendations_extraction_prompt(raw_text, exclude_tickers=user_tickers)
            response = self.report_llm.invoke(extraction_prompt)
            response_text = str(response.content)
            # Extract JSON from response
            json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response_text, re.DOTALL) or re.search(r'\{.*\}', response_text, re.DOTALL)
            
            if json_match:
                try:
                    extracted_data = json.loads(json_match.group())
                    logger.info(f"Successfully parsed JSON")
                    
                    # Validate and extract tickers from JSON, excluding user's existing tickers
                    for ticker, reason in extracted_data.items():
                        if (re.match(r'^[A-Z]{2,5}$', ticker) and reason.strip() and 
                            ticker not in user_tickers):  # Exclude user's existing tickers
                            ticker_suggestions[ticker] = reason.strip()
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON from response: {e}")
                    logger.error(f"Response text: {response_text}")
        
        logger.info(f"Final ticker suggestions (excluding user's {user_tickers})")
        
        return {"ticker_suggestions": ticker_suggestions}

    def final_assembly_node(self, state: State) -> Dict:
        """Combine structured reports with ticker suggestions"""
        dispatch_custom_event("final_assembly_status", "Assembling final report...")
        
        structured_reports = state.get("structured_reports")
        ticker_suggestions = state.get("ticker_suggestions", {})
        
        if structured_reports:
            # Update the structured_reports with the ticker_suggestions
            updated_reports = StockDigestOutput(
                reports=structured_reports.reports,
                market_overview=structured_reports.market_overview,
                generated_at=structured_reports.generated_at,
                ticker_suggestions=ticker_suggestions
            )
            return {"structured_reports": updated_reports}
        else:
            # Fallback if structured_reports is not available
            return {"structured_reports": StockDigestOutput(
                reports={},
                market_overview="",
                generated_at=datetime.now().isoformat(),
                ticker_suggestions=ticker_suggestions
            )}

    def build_graph(self):
        graph_builder = StateGraph(State)
        graph_builder.add_node("StockMetrics", self.stock_metrics_node)
        graph_builder.add_node("TargetedResearch", self.targeted_research_node)
        graph_builder.add_node("AnalysisFormatter", self.analysis_formatter_node)
        graph_builder.add_node("StockRecommendationsResearch", self.stock_recommendations_research_node)
        graph_builder.add_node("RecommendationFormatting", self.recommendation_formatting_node)
        graph_builder.add_node("MarketOverviewSummary", self.market_overview_summary_node)
        graph_builder.add_node("FinalAssembly", self.final_assembly_node)

        # Create parallel execution by running both nodes from START
        graph_builder.add_edge(START, "StockMetrics")
        graph_builder.add_edge("StockMetrics", "AnalysisFormatter")

        graph_builder.add_edge(START, "TargetedResearch")
        graph_builder.add_edge("TargetedResearch", "AnalysisFormatter")
        graph_builder.add_edge("AnalysisFormatter", "MarketOverviewSummary")
        
        graph_builder.add_edge(START, "StockRecommendationsResearch")
        graph_builder.add_edge("StockRecommendationsResearch", "RecommendationFormatting")
        graph_builder.add_edge("RecommendationFormatting", "MarketOverviewSummary")

        graph_builder.add_edge("MarketOverviewSummary", "FinalAssembly")        
        
        graph_builder.add_edge("FinalAssembly", END)

        return graph_builder.compile()

    async def run_digest(self, tickers: List[str]) -> StockDigestOutput:
        logger.info(f"Starting stock digest for tickers: {tickers}")
        graph = self.build_graph()
        initial_state = {"tickers": tickers, "date": self.current_date}
        final_state = await graph.ainvoke(initial_state)
        return final_state["structured_reports"]