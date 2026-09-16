import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { generateStockDigestPDF } from '@/lib/utils';
import { StockDigestResponse } from '@/types/stock-digest';
import { AlertTriangle, ArrowLeft, BarChart3, ChevronRight, DollarSign, Download, ExternalLink, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

interface DailyDigestReportProps {
  tickers: string[];
  stockDigest: StockDigestResponse;
  onReset: () => void;
}

const companyDomains: Record<string, string> = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', AMZN: 'amazon.com',
  NVDA: 'nvidia.com', META: 'meta.com', TSLA: 'tesla.com', NFLX: 'netflix.com',
  AMD: 'amd.com', AVGO: 'broadcom.com', ORCL: 'oracle.com', CRM: 'salesforce.com',
  ADBE: 'adobe.com', INTC: 'intel.com', QCOM: 'qualcomm.com', IBM: 'ibm.com',
  JPM: 'jpmorganchase.com', V: 'visa.com', MA: 'mastercard.com', 'BRK.B': 'berkshirehathaway.com',
  JNJ: 'jnj.com', UNH: 'unitedhealthgroup.com', XOM: 'corporate.exxonmobil.com', CVX: 'chevron.com',
  WMT: 'walmart.com', COST: 'costco.com', KO: 'coca-colacompany.com', PEP: 'pepsico.com',
  DIS: 'thewaltdisneycompany.com', NKE: 'nike.com', MCD: 'mcdonalds.com', BA: 'boeing.com',
  CAT: 'caterpillar.com', GE: 'ge.com', PLTR: 'palantir.com',
};

export const DailyDigestReport: React.FC<DailyDigestReportProps> = ({
  tickers,
  onReset,
  stockDigest
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string>(tickers[0] || '');

  const formatUrlForDisplay = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);
      const hostname = parsed.hostname.replace(/^www\./, '');
      const segments = parsed.pathname.split('/').filter(Boolean);
      const shortPath = segments.slice(0, 2).join('/');
      return shortPath ? `${hostname}/${shortPath}` : hostname;
    } catch {
      const withoutProtocol = rawUrl
        .replace(/^https?:\/\//, '')
        .replace(/#.*$/, '')
        .replace(/\?.*$/, '');
      const parts = withoutProtocol.split('/');
      const host = parts.shift() || '';
      const shortPath = parts.slice(0, 2).join('/');
      return shortPath ? `${host}/${shortPath}` : host;
    }
  };

  const currentDate = new Date(stockDigest.generated_at).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const stockReports = Object.entries(stockDigest.reports).map(([ticker, report]) => ({
    ticker,
    ...report
  }));

  const selectedStock = stockReports.find(stock => stock.ticker === selectedTicker);

  const downloadPDF = async () => {
    try {
      await generateStockDigestPDF(stockDigest);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  return (
    <div className="report-shell min-h-screen pb-12">
      <div className="px-4 pt-8">
        {/* Header */}
        <div className="digest-page-header">
          <Button
            onClick={onReset}
            variant="outline"
            className="digest-action digest-back-action flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="digest-page-title">
            <h1>Portfolio Digest for {currentDate}</h1>
          </div>
          <Button
            variant="outline"
            className="digest-action flex items-center gap-2"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6 mt-5">
            <div className="digest-ticker-tabs" role="tablist" aria-label="Portfolio stocks">
              {stockReports.map((stock) => (
                <button
                  key={stock.ticker}
                  type="button"
                  role="tab"
                  aria-selected={selectedTicker === stock.ticker}
                  className={selectedTicker === stock.ticker ? 'is-active' : ''}
                  onClick={() => setSelectedTicker(stock.ticker)}
                >
                  {companyDomains[stock.ticker] ? (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${companyDomains[stock.ticker]}&sz=64`}
                      alt=""
                      className="digest-ticker-icon"
                    />
                  ) : (
                    <span className="digest-ticker-initial" aria-hidden="true">{stock.company_name?.charAt(0) || stock.ticker.charAt(0)}</span>
                  )}
                  {stock.ticker}
                </button>
              ))}
            </div>

            {/* Individual Stock Report */}
            {selectedStock && (
              <div className="space-y-8">
                {/* Stock Header Card */}
                <Card className="digest-panel digest-company-card">
                  <CardHeader className="border-b border-[color:var(--tavily-line)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">{selectedStock.ticker}</CardTitle>
                          <CardDescription className="text-lg text-gray-600">{selectedStock.company_name}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* StockFinanceData Section */}
                    {selectedStock.tavily_metrics && (
                      <div>
                        {/* <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-tavily-blue" />
                          Financial Metrics
                        </h4> */}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                          {/* Current Price */}
                          {selectedStock.tavily_metrics?.current_price && (
                            <div className="digest-metric">
                              <div className="text-base text-gray-600 font-medium mb-1">Current Price:</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics?.current_price?.toFixed(2)}</div>
                            </div>
                          )}

                          {/* Open Price */}
                          {selectedStock.tavily_metrics?.latest_open_price && (
                            <div className="digest-metric">
                              <div className="text-base text-gray-600 font-medium mb-1">Open Price:</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics?.latest_open_price?.toFixed(2)}</div>
                            </div>
                          )}

                          {/* Trading Volume */}
                          {/* {selectedStock.tavily_metrics?.trading_volume && (
                          <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="text-base text-gray-600 font-medium mb-1">Trading Volume</div>
                            <div className="text-base font-bold text-gray-900">{selectedStock.tavily_metrics?.trading_volume?.toLocaleString()}</div>
                          </div>
                          )} */}

                          {/* Market Cap */}
                          {selectedStock.market_cap && (
                            <div className="digest-metric">
                              <div className="text-base text-gray-600 font-medium mb-1">Market Cap:</div>
                              <div className="text-base font-bold text-gray-900">
                                {(() => {
                                  const cap = selectedStock.market_cap;
                                  if (cap == null) return "-";
                                  if (cap >= 1e12) {
                                    return `$${(cap / 1e12).toFixed(2)}T`;
                                  } else if (cap >= 1e9) {
                                    return `$${(cap / 1e9).toFixed(2)}B`;
                                  } else if (cap >= 1e6) {
                                    return `$${(cap / 1e6).toFixed(2)}M`;
                                  } else {
                                    return `$${cap.toLocaleString()}`;
                                  }
                                })()}
                              </div>
                            </div>
                          )}

                          {/* P/E Ratio */}
                          {selectedStock.pe_ratio && (
                            <div className="digest-metric">
                              <div className="text-base text-gray-600 font-medium mb-1">P/E Ratio:</div>
                              <div className="text-base font-bold text-gray-900">{selectedStock.pe_ratio?.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </CardContent>
                </Card>

                {/* Key Insights - Not in a card */}
                <div className="digest-panel px-6 py-5">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-3 text-lg">
                    <div className="p-2 bg-tavily-blue/10 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-tavily-blue" />
                    </div>
                    Key Insights
                  </h4>
                  {Array.isArray(selectedStock.key_insights) && selectedStock.key_insights.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedStock.key_insights.map((insight, index) => (
                        <li key={index} className="text-gray-700 leading-relaxed flex items-center gap-3">
                          <ChevronRight className="h-5 w-5 text-tavily-blue flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700 leading-relaxed text-base">{selectedStock.key_insights}</p>
                  )}
                </div>

                {/* Analysis Grid */}
                <div className="space-y-4">
                  {/* Current Performance */}
                  <Card className="digest-panel digest-analysis-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-blue/10 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-tavily-blue" />
                        </div>
                        Current Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="digest-inset">
                        <p className="digest-copy">{selectedStock.current_performance}</p>
                        {selectedStock.tavily_metrics?.annualized_cagr && <p className="digest-detail"><span>Annualized CAGR</span>{selectedStock.tavily_metrics?.annualized_cagr}%</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Assessment */}
                  <Card className="digest-panel digest-analysis-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-red/10 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-tavily-red" />
                        </div>
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="digest-inset">
                        <p className="digest-copy">{selectedStock.risk_assessment}</p>
                        {selectedStock.tavily_metrics?.sharpe_ratio && <p className="digest-detail"><span>Sharpe Ratio</span>{selectedStock.tavily_metrics?.sharpe_ratio}</p>}
                        {selectedStock.tavily_metrics?.max_drawdown && <p className="digest-detail"><span>Max Drawdown</span>{selectedStock.tavily_metrics?.max_drawdown}%</p>}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Price Outlook */}
                  <Card className="digest-panel digest-analysis-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-light-yellow/20 rounded-lg">
                          <DollarSign className="h-5 w-5 text-tavily-light-yellow" />
                        </div>
                        Price Outlook
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="digest-inset">
                        <p className="digest-copy">{selectedStock.price_outlook}</p>
                        {selectedStock.tavily_metrics?.two_year_price_high && <p className="digest-detail"><span>2-year high</span>${selectedStock.tavily_metrics?.two_year_price_high}</p>}
                        {selectedStock.tavily_metrics?.two_year_price_low && <p className="digest-detail"><span>2-year low</span>${selectedStock.tavily_metrics?.two_year_price_low}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <section className="digest-sources" aria-labelledby="sources-heading">
                  <div className="digest-sources-heading">
                    <h2 id="sources-heading">Research sources</h2>
                    <span>{selectedStock.sources?.length || 0} sources</span>
                  </div>
                  {selectedStock.sources?.length ? (
                    <div className="digest-source-list">
                      {[...selectedStock.sources]
                        .sort((a, b) => b.score - a.score)
                        .map((source, index) => (
                          <a
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="digest-source"
                          >
                            <span className="digest-source-meta">{source.source || formatUrlForDisplay(source.url)} · {source.published_date || 'Source'}</span>
                            <span className="digest-source-title">{source.title || formatUrlForDisplay(source.url)}</span>
                            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                          </a>
                        ))}
                    </div>
                  ) : (
                    <p className="digest-sources-empty">No sources available for {selectedStock.ticker}.</p>
                  )}
                </section>
              </div>
            )}
        </div>


      </div>
    </div>
  );
};
