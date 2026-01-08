RESEARCH_PROMPT = """Do a comprehensive stock analysis for {ticker} as of {date}:
- Current stock price and recent price performance
- Market capitalization and key financial metrics
- Latest earnings results and guidance
- Recent news and developments
- Analyst ratings, upgrades/downgrades, and price targets
- Key risks and opportunities
- Investment recommendation with reasoning
Focus on all the recent updates about the company.
"""

METRICS_PROMPT = """Extract financial metrics for {ticker} from the following information:

{content}

Extract these metrics if available (set to None if unavailable):
- Sharpe ratio, Annualized CAGR, Max drawdown
- Latest open/close prices, Current price, Trading volume
- 2-year price high and low"""
