
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound, Loader2, Plus, TrendingUp, X } from 'lucide-react';
import React, { KeyboardEvent, useEffect, useMemo, useState } from 'react';

export type ResearchModel = 'mini' | 'pro';

interface TickerInputProps {
  tickers: string[];
  onTickersChange: (tickers: string[]) => void;
  onGenerateReport: (model: ResearchModel, tavilyApiKey: string) => void;
  isGenerating: boolean;
  generationStatus?: string | null;
}

export const TickerInput: React.FC<TickerInputProps> = ({
  tickers,
  onTickersChange,
  onGenerateReport,
  isGenerating,
  generationStatus,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [researchModel, setResearchModel] = useState<ResearchModel>('mini');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [showTavilyApiKey, setShowTavilyApiKey] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = useMemo(() => [
    'Starting portfolio research…',
    `Researching ${tickers[0] || 'your selected stocks'}…`,
    'Gathering market performance and financial data…',
    'Reviewing risks, catalysts, and price outlook…',
    'Compiling your portfolio digest…',
  ], [tickers]);

  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((step) => (step + 1) % loadingMessages.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [isGenerating, loadingMessages.length]);

  const addTicker = () => {
    const ticker = inputValue.trim().toUpperCase();
    
    if (!ticker) {
      toast({
        title: "Invalid ticker",
        description: "Please enter a valid stock ticker symbol",
        variant: "destructive",
      });
      return;
    }

    if (ticker.length > 10) {
      toast({
        title: "Ticker too long",
        description: "Ticker symbols should be 10 characters or less",
        variant: "destructive",
      });
      return;
    }

    if (tickers.includes(ticker)) {
      toast({
        title: "Duplicate ticker",
        description: `${ticker} is already in your list`,
        variant: "destructive",
      });
      return;
    }

    if (tickers.length >= 5) {
      toast({
        title: "Too many tickers",
        description: "You can add up to 5 tickers maximum",
        variant: "destructive",
      });
      return;
    }

    onTickersChange([...tickers, ticker]);
    setInputValue('');
  };

  const removeTicker = (tickerToRemove: string) => {
    onTickersChange(tickers.filter(ticker => ticker !== tickerToRemove));
    toast({
      title: "Ticker removed",
      description: `${tickerToRemove} has been removed from your list`,
    });
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTicker();
    }
  };

  const popularTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX',
    'AMD', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'INTC', 'QCOM', 'IBM',
    'JPM', 'V', 'MA', 'BRK.B', 'JNJ', 'UNH', 'XOM', 'CVX',
    'WMT', 'COST', 'KO', 'PEP', 'DIS', 'NKE', 'MCD', 'BA',
    'CAT', 'GE', 'PLTR',
  ];

  const addPopularTicker = (ticker: string) => {
    if (!tickers.includes(ticker) && tickers.length < 5) {
      onTickersChange([...tickers, ticker]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="api-key-field">
        <Label htmlFor="tavily-api-key" className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4" />
          Tavily API key <span className="api-key-required">Required</span>
        </Label>
        <div className="api-key-input-wrap">
          <Input
            id="tavily-api-key"
            type={showTavilyApiKey ? 'text' : 'password'}
            value={tavilyApiKey}
            onChange={(event) => setTavilyApiKey(event.target.value)}
            placeholder="tvly-..."
            autoComplete="off"
            spellCheck={false}
            required
            aria-required="true"
            disabled={isGenerating}
          />
          <button
            type="button"
            className="api-key-visibility"
            onClick={() => setShowTavilyApiKey((shown) => !shown)}
            aria-label={showTavilyApiKey ? 'Hide Tavily API key' : 'Show Tavily API key'}
            disabled={isGenerating}
          >
            {showTavilyApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p>Required to run research. Used only for this request and never saved by this app.</p>
      </div>

      {/* Input Section */}
      <div className="flex gap-2">
        <Input
          placeholder="Enter ticker symbol (e.g., AAPL)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 text-lg"
          disabled={isGenerating}
        />
        <Button 
          onClick={addTicker} 
          variant="outline"
          disabled={!inputValue.trim() || isGenerating}
          className="rounded-xl border-[color:var(--tavily-line)] bg-[#fffcf699] hover:bg-[#ede6db]"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Popular Tickers */}
      <div>
        <p className="mb-3 text-center text-sm text-[color:var(--tavily-ink-muted)]">Explore popular stocks</p>
        <div className="ticker-cloud">
          {popularTickers.map((ticker) => (
            <Button
              key={ticker}
              variant="ghost"
              size="sm"
              onClick={() => addPopularTicker(ticker)}
              disabled={tickers.includes(ticker) || tickers.length >= 5 || isGenerating}
              className="ticker-chip h-8 px-3 text-xs hover:text-[color:var(--tavily-ink)]"
            >
              {ticker}
            </Button>
          ))}
        </div>
      </div>

      {/* Selected Tickers */}
      {tickers.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Selected tickers ({tickers.length}/5):
          </p>
          <div className="flex flex-wrap gap-2">
            {tickers.map((ticker) => (
              <Badge
                key={ticker}
                variant="secondary"
                className="ticker-selected flex items-center gap-1 px-3 py-1 transition-colors"
              >
                {ticker}
                <button
                  onClick={() => removeTicker(ticker)}
                  disabled={isGenerating}
                  className="ml-1 hover:text-tavily-blue/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Research Model Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-[color:var(--tavily-line)] bg-[#0b09070d] p-4">
        <div className="space-y-0.5">
          <Label htmlFor="research-model" className="text-sm font-medium">
            Research Model
          </Label>
          <p className="text-xs text-gray-500">
            {researchModel === 'pro' ? 'Pro: Deeper analysis, slower' : 'Mini: Fast analysis'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${researchModel === 'mini' ? 'font-medium' : 'text-gray-400'}`}>Mini</span>
          <Switch
            id="research-model"
            checked={researchModel === 'pro'}
            onCheckedChange={(checked) => setResearchModel(checked ? 'pro' : 'mini')}
            disabled={isGenerating}
          />
          <span className={`text-xs ${researchModel === 'pro' ? 'font-medium' : 'text-gray-400'}`}>Pro</span>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={() => onGenerateReport(researchModel, tavilyApiKey.trim())}
        disabled={tickers.length === 0 || !tavilyApiKey.trim() || isGenerating}
        className="research-submit h-12 w-full text-base"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {generationStatus || loadingMessages[loadingStep]}
          </>
        ) : (
          <>
            <TrendingUp className="mr-2 h-5 w-5" />
            Get Daily Digest ({tickers.length} {tickers.length === 1 ? 'ticker' : 'tickers'})
          </>
        )}
      </Button>
      {isGenerating && (
        <p className="loading-status" role="status" aria-live="polite">
          This may take a few minutes while we research each selected stock.
        </p>
      )}
    </div>
  );
};
