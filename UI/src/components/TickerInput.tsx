
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, TrendingUp, X } from 'lucide-react';
import React, { KeyboardEvent, useState } from 'react';

export type ResearchModel = 'mini' | 'pro';

interface TickerInputProps {
  tickers: string[];
  onTickersChange: (tickers: string[]) => void;
  onGenerateReport: (model: ResearchModel) => void;
  isGenerating: boolean;
}

export const TickerInput: React.FC<TickerInputProps> = ({
  tickers,
  onTickersChange,
  onGenerateReport,
  isGenerating,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [researchModel, setResearchModel] = useState<ResearchModel>('mini');

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
    
    toast({
      title: "Ticker added",
      description: `${ticker} has been added to your list`,
    });
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

  const popularTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];

  const addPopularTicker = (ticker: string) => {
    if (!tickers.includes(ticker) && tickers.length < 5) {
      onTickersChange([...tickers, ticker]);
      toast({
        title: "Ticker added",
        description: `${ticker} has been added to your list`,
      });
    }
  };

  return (
    <div className="space-y-6">
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
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Popular Tickers */}
      <div>
        <p className="text-sm text-gray-600 mb-2">Popular stocks:</p>
        <div className="flex flex-wrap gap-2">
          {popularTickers.map((ticker) => (
            <Button
              key={ticker}
              variant="ghost"
              size="sm"
              onClick={() => addPopularTicker(ticker)}
              disabled={tickers.includes(ticker) || tickers.length >= 5 || isGenerating}
              className="text-xs h-7 bg-gray-100 hover:bg-gray-200"
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
                className="flex items-center gap-1 px-3 py-1 bg-tavily-blue/10 text-tavily-blue hover:bg-tavily-blue/20 transition-colors"
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
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
        onClick={() => onGenerateReport(researchModel)}
        disabled={tickers.length === 0 || isGenerating}
        className="w-full bg-gradient-to-r from-tavily-blue to-tavily-light-blue hover:from-tavily-blue/90 hover:to-tavily-light-blue/90 text-white text-lg py-6"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <TrendingUp className="mr-2 h-5 w-5" />
            Get Daily Digest ({tickers.length} {tickers.length === 1 ? 'ticker' : 'tickers'})
          </>
        )}
      </Button>
    </div>
  );
};
