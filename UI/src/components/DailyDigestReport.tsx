import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { generateStockDigestPDF } from '@/lib/utils';
import { StockDigestResponse } from '@/types/stock-digest';
import { AlertTriangle, ArrowLeft, BarChart3, ChevronDown, Circle, DollarSign, Download, ExternalLink, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';

interface DailyDigestReportProps {
  tickers: string[];
  stockDigest: StockDigestResponse;
  onReset: () => void;
}

export const DailyDigestReport: React.FC<DailyDigestReportProps> = ({
  tickers,
  onReset,
  stockDigest
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string>(tickers[0] || '');
  const [showSources, setShowSources] = useState(false);

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
    <div className="min-h-screen py-12 w-4/5 mx-auto">
      <div className="container mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative">
          <Button
            onClick={onReset}
            variant="outline"
            className="flex items-center gap-2 hover:bg-white/80 transition-all duration-200 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Input
          </Button>
          <div className="flex items-center gap-4 absolute left-1/2 transform -translate-x-1/2">
            <div className="p-3 bg-gradient-to-r from-tavily-blue to-tavily-light-blue rounded-full shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                <span className="text-tavily-blue">
                  Portfolio Digest for{' '}
                </span>
                <span className="text-tavily-blue">
                  {currentDate}
                </span>
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            className="flex items-center gap-2 hover:bg-white/80 transition-all duration-200 shadow-sm"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6 mt-5">
            {/* Stock Selector */}
            <div className="w-1/3 mx-auto">
              <Card className="border-0 shadow-lg bg-tavily-blue/10 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-2">
                  <Select value={selectedTicker} onValueChange={setSelectedTicker}>
                    <SelectTrigger className="w-full h-9 text-base bg-white/80 border-2 border-tavily-light-blue hover:border-tavily-blue focus:border-tavily-blue transition-all duration-200 shadow-sm">
                      <SelectValue placeholder="Choose a ticker" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border border-tavily-light-blue shadow-lg">
                      {tickers.map((ticker) => (
                        <SelectItem
                          key={ticker}
                          value={ticker}
                          className="hover:bg-tavily-blue/5 focus:bg-tavily-blue/5 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-tavily-blue to-tavily-light-blue rounded-full"></div>
                            <span className="font-medium">{ticker}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* Individual Stock Report */}
            {selectedStock && (
              <div className="space-y-8">
                {/* Stock Header Card */}
                <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm hover:shadow-3xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-gray-50 via-tavily-blue/5 to-tavily-light-blue/5 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">{selectedStock.ticker}</CardTitle>
                          <CardDescription className="text-lg text-gray-600">{selectedStock.company_name}</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* StockFinanceData Section */}
                    {selectedStock.tavily_metrics && (
                      <div className="mb-8">
                        {/* <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-tavily-blue" />
                          Financial Metrics
                        </h4> */}
                        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {/* Current Price */}
                          {selectedStock.tavily_metrics?.current_price && (
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Current Price:</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics?.current_price?.toFixed(2)}</div>
                            </div>
                          )}

                          {/* Open Price */}
                          {selectedStock.tavily_metrics?.latest_open_price && (
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Open Price:</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics?.latest_open_price?.toFixed(2)}</div>
                            </div>
                          )}

                          {/* Latest Close Price */}
                          {selectedStock.tavily_metrics?.latest_close_price && (
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Close Price</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics?.latest_close_price?.toFixed(2)}</div>
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
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
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
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">P/E Ratio:</div>
                              <div className="text-base font-bold text-gray-900">{selectedStock.pe_ratio?.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tavily Metrics Section */}
                    {/* {selectedStock.tavily_metrics && (
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <BarChart3 className="h-5 w-5 text-tavily-blue" />
                          Advanced Metrics
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          {selectedStock.tavily_metrics.sharpe_ratio !== undefined && (
                            <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 p-4 rounded-xl border border-tavily-light-blue shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Sharpe Ratio</div>
                              <div className="text-base font-bold text-gray-900">{selectedStock.tavily_metrics.sharpe_ratio.toFixed(2)}</div>
                            </div>
                          )}
                          {selectedStock.tavily_metrics.annualized_cagr !== undefined && (
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Annualized CAGR</div>
                              <div className="text-base font-bold text-gray-900">{(selectedStock.tavily_metrics.annualized_cagr * 100).toFixed(2)}%</div>
                            </div>
                          )}
                          {selectedStock.tavily_metrics.latest_open_price !== undefined && (
                            <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 p-4 rounded-xl border border-tavily-light-blue shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Latest Open</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics.latest_open_price.toFixed(2)}</div>
                            </div>
                          )}
                          {selectedStock.tavily_metrics.latest_close_price !== undefined && (
                            <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 p-4 rounded-xl border border-tavily-light-blue shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Latest Close</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics.latest_close_price.toFixed(2)}</div>
                            </div>
                          )}
                          {selectedStock.tavily_metrics.trading_volume !== undefined && (
                            <div className="bg-tavily-light-yellow/20 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">Trading Volume</div>
                              <div className="text-base font-bold text-gray-900">{selectedStock.tavily_metrics.trading_volume.toLocaleString()}</div>
                            </div>
                          )}
                          {(selectedStock.tavily_metrics.two_year_price_high !== undefined) && (
                            <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 p-4 rounded-xl border border-tavily-light-blue shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">2-Year High</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics.two_year_price_high.toFixed(2)}</div>
                            </div>
                          )}
                          {(selectedStock.tavily_metrics.two_year_price_low !== undefined) && (
                            <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 p-4 rounded-xl border border-tavily-light-blue shadow-sm hover:shadow-md transition-all duration-200">
                              <div className="text-base text-gray-600 font-medium mb-1">2-Year Low</div>
                              <div className="text-base font-bold text-gray-900">${selectedStock.tavily_metrics.two_year_price_low.toFixed(2)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )} */}

                  </CardContent>
                </Card>

                {/* Key Insights - Not in a card */}
                <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 px-6 py-4 rounded-xl border border-tavily-light-blue shadow-lg">
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
                          <Circle className="h-5 w-5 text-tavily-blue flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-700 leading-relaxed text-base">{selectedStock.key_insights}</p>
                  )}
                </div>

                {/* Analysis Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Current Performance */}
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-blue/10 rounded-lg">
                          <TrendingUp className="h-5 w-5 text-tavily-blue" />
                        </div>
                        Current Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-tavily-blue/5 to-tavily-light-blue/5 p-4 rounded-xl border border-tavily-light-blue shadow-sm">
                        <p className="text-gray-700 leading-relaxed text-sm mb-4">{selectedStock.current_performance}</p>
                        <p className="text-gray-700 leading-relaxed text-sm"><span className="font-bold">Annualized CAGR</span>: {selectedStock.tavily_metrics?.annualized_cagr}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Assessment */}
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-red/10 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-tavily-red" />
                        </div>
                        Risk Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-tavily-red/5 to-tavily-light-red/5 p-4 rounded-xl border border-tavily-light-red shadow-sm">
                        <p className="text-gray-700 leading-relaxed text-sm mb-4">{selectedStock.risk_assessment}</p>
                        <p className="text-gray-700 leading-relaxed text-sm"><span className="font-bold">Sharpe Ratio</span>: {selectedStock.tavily_metrics?.sharpe_ratio}</p>
                        <p className="text-gray-700 leading-relaxed text-sm"><span className="font-bold">Max Drawdown</span>: {selectedStock.tavily_metrics?.max_drawdown}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Price Outlook */}
                  <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-light-yellow/20 rounded-lg">
                          <DollarSign className="h-5 w-5 text-tavily-light-yellow" />
                        </div>
                        Price Outlook
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-r from-tavily-light-yellow/10 to-tavily-light-yellow/5 p-4 rounded-xl border border-tavily-light-yellow/30 shadow-sm">
                        <p className="text-gray-700 leading-relaxed text-sm mb-4">{selectedStock.price_outlook}</p>
                        <p className="text-gray-700 leading-relaxed text-sm"><span className="font-bold">Price High (2-Year)</span>: ${selectedStock.tavily_metrics?.two_year_price_high}</p>
                        <p className="text-gray-700 leading-relaxed text-sm"><span className="font-bold">Price Low (2-Year)</span>: ${selectedStock.tavily_metrics?.two_year_price_low}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sources Panel for this Stock */}
                <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <button
                      onClick={() => setShowSources(!showSources)}
                      className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    >
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="p-2 bg-tavily-blue/10 rounded-lg">
                          <ExternalLink className="h-5 w-5 text-tavily-blue" />
                        </div>
                        Research Sources ({selectedStock.sources?.length || 0})
                      </CardTitle>
                      <ChevronDown
                        className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${showSources ? 'rotate-180' : ''
                          }`}
                      />
                    </button>
                  </CardHeader>
                  {showSources && (
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-gray-600 text-sm">
                          Sources used for {selectedStock.ticker} analysis, sorted by relevance and recency:
                        </p>
                        <div className="grid gap-4">
                          {selectedStock.sources && selectedStock.sources.length > 0 ? (
                            selectedStock.sources
                              .sort((a, b) => b.score - a.score) // Sort by relevance score
                              .map((source, index) => (
                                <div
                                  key={index}
                                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-gray-500">
                                          {source.published_date}
                                        </span>
                                      </div>
                                      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-xs">
                                        {source.title}
                                      </h4>
                                      <p className="text-sm text-gray-600 mb-2">
                                        {source.source}
                                      </p>
                                      {source.url && (
                                        <p className="text-xs text-tavily-blue mb-0 truncate">
                                          {formatUrlForDisplay(source.url)}
                                        </p>
                                      )}
                                    </div>
                                    {source.url && (
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-4 p-2 text-tavily-blue hover:text-tavily-blue/80 hover:bg-tavily-blue/10 rounded-lg transition-colors flex-shrink-0"
                                        title="Open source"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p>No sources available for {selectedStock.ticker} analysis.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>
            )}
        </div>


      </div>
    </div>
  );
};
