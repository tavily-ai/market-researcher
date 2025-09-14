def get_stock_analysis_prompt(ticker: str, research_data: dict | object, ticker_stories: list, current_date: str) -> str:
    # Handle both dict and Pydantic model types
    if isinstance(research_data, dict):
        research_str = str(research_data)
    elif hasattr(research_data, 'model_dump'):
        research_str = str(research_data.model_dump())  # type: ignore
    else:
        research_str = str(research_data)
    
    return f"""
    You are a professional portfolio analyst providing concise updates on stock positions based on recent news and market developments.
    
    Analyze the following data for {ticker}:
    
    Research Data: {research_str}
    
    Recent News Stories for {ticker}:
    {chr(10).join([f"Title: {story['title']}{chr(10)}Content: {story['content']}{chr(10)}Source: {story['source']}{chr(10)}Date: {story['published_date']}{chr(10)}Relevance Score: {story.get('score', 'N/A')}{chr(10)}" for story in ticker_stories[:5]])}
    
    Current date: {current_date}
    
    Create a portfolio-focused report with the following fields:
    1. summary: In 5-6 sentences, summarize the most important details from the research data for this stock along with other important market details.
    2. current_performance: 2-3 sentences on recent price action and key metrics
    3. key_insights: List of 5-8 important insights from the latest news. Focus on specific events, earnings, analyst insights, analyst actions, or significant changes with the market or business related to this stock. Include relevant analyst insights mentioning specific company or analyst names when available.
    4. recommendation: Investment recommendation (Buy/Hold/Sell with brief reasoning)
    5. risk_assessment: 2-3 sentences identifying key risks from news
    6. price_outlook: 1-2 sentences on near-term expectations

    **Key-Insights formatting rules**  
    • Return as separate bullet strings.  
    • Be explicit: numbers, dates, names.  
    • Prioritise high-relevance stories and analysts.
    
    Provide the ticker symbol as: {ticker}
    Use a generic company name if not available in the data.
    """


def get_market_overview_prompt(tickers: list, all_news_stories: list, current_date: str) -> str:
    return f"""
    You are a senior market analyst creating a concise market overview that connects individual stock developments to broader market trends.
    
    Analyze the following news stories from the past few days for these stocks: {', '.join(tickers)}
    
    News Stories Summary:
    {chr(10).join([f"Ticker: {ticker}{chr(10)}Title: {story['title']}{chr(10)}Content: {story['content'][:300]}...{chr(10)}Source: {story['source']}{chr(10)}Date: {story['published_date']}{chr(10)}" for ticker, story in all_news_stories[:15]])}
    
    Current date: {current_date}
    
    Create a concise market overview (5-7 sentences) covering overall market environemnt, trends and sentiment.
    
    """

def get_stock_metrics_prompt(extract_results: str) -> str:
    return f"""
    Given this website data extract the following metrics:
    {extract_results}
    
    - Current Price or price
    - Market Cap
    - Company Name
    - Price to Earnings Ratio or PE Ratio
    - EPS (Earnings Per Share)
    - Dividend or Dividend Yield percentage
    """

def get_market_overview_summary_prompt() -> str:
    return """
    You are a senior portfolio strategist writing a polished, professional market overview for an investor.

    Write a comprehensive market analysis and portfolio overview using the provided research data.

    Your analysis should include TWO key components:

    1. MARKET OVERVIEW: Analyze broader market conditions, trends, and sentiment. Identify key market drivers, sector performance, and macroeconomic factors affecting the overall investment landscape.

    2. PORTFOLIO ANALYSIS: Evaluate how the current market environment impacts portfolio positioning, risk exposure, and strategic opportunities. Assess portfolio performance relative to market conditions and identify areas for optimization.

    Focus on connecting individual stock developments to broader market trends, providing context for how portfolio holdings relate to the overall market environment. Address current market positioning, potential risks, and strategic opportunities.

    Use clear, professional language suitable for an investor newsletter. Ensure each paragraph flows naturally into the next, creating a cohesive narrative that bridges market analysis with portfolio implications.

    Analyze and incorporate the following research data:

    GUIDELINES:
    - Structure your response in 1-3 well-developed paragraphs with new lines
    - It must be only 150-200 words total!
    - Balance market overview with portfolio analysis
    - Connect market trends to portfolio implications

    {text}
    """

def get_stock_recommendations_prompt() -> str:
    return """
    You are a senior investment analyst tasked with identifying 6 promising stock opportunities for portfolio diversification.
    
    Research and analyze current market conditions, sector trends, and emerging opportunities to recommend 6 stocks that offer strong growth potential, solid fundamentals, or strategic positioning.
    
    Focus on:
    - Companies with strong recent performance or positive catalysts
    - Undervalued stocks with growth potential
    - Emerging market leaders or disruptors
    - Stocks with favorable analyst coverage or upgrades
    - Companies with upcoming catalysts (earnings, product launches, etc.)
    
    Provide detailed reasoning for each recommendation including:
    - Key business drivers and competitive advantages
    - Recent developments or catalysts
    - Financial strength and growth prospects
    - Risk factors to consider
    
    Return exactly 6 stock recommendations with comprehensive analysis for each.
    """

def get_stock_recommendations_extraction_prompt(raw_text: str, exclude_tickers: list | None = None) -> str:
    exclude_text = ""
    if exclude_tickers:
        exclude_text = f"\n\nIMPORTANT: Do NOT include any of these tickers in your recommendations: {', '.join(exclude_tickers)}"
    
    return f"""
    Extract exactly 6 stock ticker symbols and their detailed investment reasons from the following text.
    Only return actual stock ticker symbols (2-5 letter codes) and specific, detailed reasons.
    
    Text: {raw_text}{exclude_text}
    
    Return as a JSON object with exactly 6 ticker symbols as keys and detailed reasons as values.
    Example format: {{
        "ticker": "reason (2-3 sentences)",
        "ticker": "reason (2-3 sentences)",
        "ticker": "reason (2-3 sentences)",
        "ticker": "reason (2-3 sentences)",
        "ticker": "reason (2-3 sentences)",
        "ticker": "reason (2-3 sentences)",
        }}
    
    IMPORTANT: Return exactly 6 stock recommendations, no more, no less.
    Make the reasons specific and detailed (2-3 sentences) rather than generic phrases like "Top pick" or "Key stock".
    Only include real stock tickers, not words like "AI", "Tech", etc.
    Focus on concrete business drivers, financial metrics, or strategic advantages.
    """