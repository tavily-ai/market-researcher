import { DailyDigestReport } from '@/components/DailyDigestReport';
import Header from '@/components/Header';
import { TickerInput } from '@/components/TickerInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StockDigestResponse } from '@/types/stock-digest';
import { BarChart3, CheckCircle2, ChevronDown, ChevronUp, DollarSign, Eye, EyeOff, KeyRound, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const Index = () => {
  const [tickers, setTickers] = useState<string[]>([]);
  const [stockDigest, setStockDigest] = useState<StockDigestResponse | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://0.0.0.0:8080';

  const handleGenerateReport = async () => {
    if (tickers.length === 0) return;

    setIsGenerating(true);

    
    const apiUrl = `${BASE_URL}/api/stock-digest`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tickers }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStockDigest(data);
      setIsGenerating(false);
      setShowReport(true);
    } catch (error) {
      console.error('API request failed:', error);
      setIsGenerating(false);
      // You might want to show an error message to the user here
    }
  };

  const handleReset = () => {
    setShowReport(false);
    setTickers([]);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-white relative">
      <Header />
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_1px_1px,rgba(70,139,255,0.35)_1px,transparent_0)] bg-[length:24px_24px] bg-center pointer-events-none -z-10"></div>
      {showReport ? (<DailyDigestReport tickers={tickers} onReset={handleReset} stockDigest={stockDigest} />) : (
        <>
          <div className="container mx-auto px-4 pb-4 pt-12 w-4/5">
            {/* Header */}
            <div className="text-center mb-8">
              {/* <div className="flex items-center justify-center mb-2">
                <img src={logo} alt="Tavily Logo" className="size-9" />
              </div> */}
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                Stock Portoflio Researcher
              </h1>
              <p className="text-lg text-gray-600 mx-auto">
                Get comprehensive market insights and analysis for your favorite stocks, plus personalized recommendations.
              </p>
            </div>

            {/* Main Input Card */}
            <Card className="max-w-2xl mx-auto border-0 shadow-xl bg-white/90 backdrop-blur-sm mb-8">
              <CardHeader className="text-center">
                <CardTitle className="text-xl">Enter Stock Tickers</CardTitle>
                <CardDescription className="text-base">
                  Add the stock symbols you want to analyze (e.g., AAPL, GOOGL, MSFT)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TickerInput
                  tickers={tickers}
                  onTickersChange={setTickers}
                  onGenerateReport={handleGenerateReport}
                  isGenerating={isGenerating}
                />
              </CardContent>
            </Card>

            {/* Features Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="bg-tavily-blue/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <BarChart3 className="h-6 w-6 text-tavily-blue" />
                  </div>
                  <CardTitle className="text-lg">Market Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get detailed price movements, volume analysis, and trend indicators
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="bg-tavily-light-yellow/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <DollarSign className="h-6 w-6 text-tavily-red" />
                  </div>
                  <CardTitle className="text-lg">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Track daily returns, volatility, and key performance indicators
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="text-center border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-lg">Trend Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Identify market trends and get actionable insights for your portfolio
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
