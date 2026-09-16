import { DailyDigestReport } from '@/components/DailyDigestReport';
import Header from '@/components/Header';
import { ResearchModel, TickerInput } from '@/components/TickerInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StockDigestResponse } from '@/types/stock-digest';
import { useState } from 'react';

const Index = () => {
  const [tickers, setTickers] = useState<string[]>([]);
  const [stockDigest, setStockDigest] = useState<StockDigestResponse | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationEvents, setGenerationEvents] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8080';

  const handleGenerateReport = async (researchModel: ResearchModel) => {
    if (tickers.length === 0) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStatus('Opening Tavily research stream…');
    setGenerationEvents(['Opening Tavily research stream…']);

    
    const apiUrl = `${BASE_URL}/api/stock-digest/stream`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tickers, research_model: researchModel }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.detail || `Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('The research stream did not return a response body.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let digest: StockDigestResponse | null = null;

      const processEvent = (rawEvent: string) => {
        const eventType = rawEvent.split(/\r?\n/).find((line) => line.startsWith('event:'))?.slice(6).trim();
        const data = rawEvent.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
        if (!data) return;
        const payload = JSON.parse(data);
        if (eventType === 'progress') {
          setGenerationStatus(payload.message);
          setGenerationEvents((events) => {
            if (events[events.length - 1] === payload.message) return events;
            return [...events, payload.message].slice(-12);
          });
        } else if (eventType === 'complete') {
          digest = payload.digest;
        } else if (eventType === 'error') {
          throw new Error(payload.message || 'The research stream failed.');
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';
        events.forEach(processEvent);
        if (done) break;
      }

      if (!digest) {
        throw new Error('The research stream ended before a digest was returned.');
      }
      setStockDigest(digest);
      setShowReport(true);
    } catch (error) {
      console.error('API request failed:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unable to generate the stock digest.');
    } finally {
      setIsGenerating(false);
      setGenerationStatus(null);
    }
  };

  const handleReset = () => {
    setShowReport(false);
    setTickers([]);
  };

  return (
    <div className="app-shell">
      <div className="landscape-background" aria-hidden="true">
        <img src="/tavily-landscape.webp" alt="" />
      </div>
      <div className="research-workspace">
      <Header />
      {showReport ? (<DailyDigestReport tickers={tickers} onReset={handleReset} stockDigest={stockDigest} />) : (
        <>
          <main>
            {/* Header */}
            <div className="portfolio-hero">
              <h1>Stock Portfolio Researcher</h1>
              <p>Get a grounded, daily view of the stocks you follow: market performance, key risks, and actionable research in one place.</p>
            </div>

            {/* Main Input Card */}
            <Card className="research-surface portfolio-form mb-8">
              <CardHeader className="p-0 pb-6 text-center">
                <CardTitle className="text-xl font-medium">Enter stock tickers</CardTitle>
                <CardDescription className="mt-2 text-base text-[color:var(--tavily-ink-muted)]">
                  Add the stock symbols you want to analyze (e.g., AAPL, GOOGL, MSFT)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <TickerInput
                  tickers={tickers}
                  onTickersChange={setTickers}
                  onGenerateReport={handleGenerateReport}
                  isGenerating={isGenerating}
                  generationStatus={generationStatus}
                />
                {generationError && (
                  <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {generationError}
                  </p>
                )}
                {isGenerating && (
                  <section className="research-stream-output" aria-labelledby="research-stream-title" aria-live="polite">
                    <div className="research-stream-heading">
                      <span className="research-stream-indicator" aria-hidden="true" />
                      <h2 id="research-stream-title">Live research activity</h2>
                    </div>
                    <ol>
                      {generationEvents.map((event, index) => (
                        <li key={`${index}-${event}`} className={index === generationEvents.length - 1 ? 'is-current' : ''}>
                          <span>{event}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
              </CardContent>
            </Card>

          </main>
        </>
      )}
      </div>
    </div>
  );
};

export default Index;
