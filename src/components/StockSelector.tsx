'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, Compass, Globe, Heart, ArrowDownUp, RefreshCw } from 'lucide-react';
import { translations } from '@/utils/translations';
import { RankedStock, WatchlistItem } from '@/utils/types';

interface StockSelectorProps {
  onSelectStock: (ticker: string) => void;
  selectedTicker: string;
  lang: 'en' | 'th';
  watchlist: WatchlistItem[];
  onToggleWatchlist: (stock: RankedStock) => void;
}

// ── Stock Pools ────────────────────────────────────────────────────────────────
export const US_STOCK_POOL = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'TSLA', name: 'Tesla, Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.' },
  { ticker: 'AMD', name: 'Advanced Micro Devices' },
  { ticker: 'META', name: 'Meta Platforms, Inc.' },
  { ticker: 'GOOG', name: 'Alphabet Inc.' },
  { ticker: 'NFLX', name: 'Netflix, Inc.' },
  { ticker: 'COIN', name: 'Coinbase Global' },
  { ticker: 'PLTR', name: 'Palantir Technologies' },
  { ticker: 'UBER', name: 'Uber Technologies' },
  { ticker: 'SNAP', name: 'Snap Inc.' },
  { ticker: 'SPOT', name: 'Spotify Technology' },
  { ticker: 'RBLX', name: 'Roblox Corporation' },
  { ticker: 'SOFI', name: 'SoFi Technologies' },
  { ticker: 'HOOD', name: 'Robinhood Markets' },
  { ticker: 'RIVN', name: 'Rivian Automotive' },
  { ticker: 'NIO', name: 'NIO Inc.' },
  { ticker: 'INTC', name: 'Intel Corporation' },
  { ticker: 'BABA', name: 'Alibaba Group' },
  { ticker: 'JD', name: 'JD.com, Inc.' },
  { ticker: 'PDD', name: 'PDD Holdings Inc.' },
  { ticker: 'MELI', name: 'MercadoLibre, Inc.' },
  { ticker: 'SQ', name: 'Block, Inc.' },
  { ticker: 'PYPL', name: 'PayPal Holdings' },
  { ticker: 'SHOP', name: 'Shopify Inc.' },
  { ticker: 'NET', name: 'Cloudflare, Inc.' },
  { ticker: 'DDOG', name: 'Datadog, Inc.' },
  { ticker: 'ZS', name: 'Zscaler, Inc.' },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings' },
  { ticker: 'PANW', name: 'Palo Alto Networks' },
  { ticker: 'SNOW', name: 'Snowflake Inc.' },
  { ticker: 'MDB', name: 'MongoDB, Inc.' },
  { ticker: 'TWLO', name: 'Twilio Inc.' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.' },
  { ticker: 'BAC', name: 'Bank of America' },
  { ticker: 'GS', name: 'Goldman Sachs Group' },
  { ticker: 'V', name: 'Visa Inc.' },
  { ticker: 'MA', name: 'Mastercard Incorporated' },
  { ticker: 'COST', name: 'Costco Wholesale' },
  { ticker: 'WMT', name: 'Walmart Inc.' },
  { ticker: 'DIS', name: 'The Walt Disney Company' },
  { ticker: 'NKE', name: 'Nike, Inc.' },
  { ticker: 'SBUX', name: 'Starbucks Corporation' },
  { ticker: 'ORCL', name: 'Oracle Corporation' },
  { ticker: 'QCOM', name: 'Qualcomm Incorporated' },
  { ticker: 'TXN', name: 'Texas Instruments' },
  { ticker: 'LLY', name: 'Eli Lilly and Company' },
  { ticker: 'AVGO', name: 'Broadcom Inc.' },
];

export const TH_STOCK_POOL = [
  { ticker: 'PTT', name: 'PTT PCL', fullTicker: 'PTT.BK' },
  { ticker: 'CPALL', name: 'CP ALL PCL', fullTicker: 'CPALL.BK' },
  { ticker: 'ADVANC', name: 'Advanced Info Service', fullTicker: 'ADVANC.BK' },
  { ticker: 'BDMS', name: 'Bangkok Dusit Medical', fullTicker: 'BDMS.BK' },
  { ticker: 'AOT', name: 'Airports of Thailand', fullTicker: 'AOT.BK' },
  { ticker: 'KBANK', name: 'Kasikornbank PCL', fullTicker: 'KBANK.BK' },
  { ticker: 'SCB', name: 'SCB X PCL', fullTicker: 'SCB.BK' },
  { ticker: 'DELTA', name: 'Delta Electronics (TH)', fullTicker: 'DELTA.BK' },
  { ticker: 'TRUE', name: 'True Corporation PCL', fullTicker: 'TRUE.BK' },
  { ticker: 'GULF', name: 'Gulf Energy Development', fullTicker: 'GULF.BK' },
  { ticker: 'BBL', name: 'Bangkok Bank PCL', fullTicker: 'BBL.BK' },
  { ticker: 'KTB', name: 'Krungthai Bank PCL', fullTicker: 'KTB.BK' },
  { ticker: 'BAY', name: 'Bank of Ayudhya PCL', fullTicker: 'BAY.BK' },
  { ticker: 'PTTEP', name: 'PTT Exploration & Prod.', fullTicker: 'PTTEP.BK' },
  { ticker: 'IRPC', name: 'IRPC PCL', fullTicker: 'IRPC.BK' },
  { ticker: 'TOP', name: 'Thai Oil PCL', fullTicker: 'TOP.BK' },
  { ticker: 'BCP', name: 'Bangchak Corporation', fullTicker: 'BCP.BK' },
  { ticker: 'HMPRO', name: 'Home Product Center', fullTicker: 'HMPRO.BK' },
  { ticker: 'CRC', name: 'Central Retail Corp.', fullTicker: 'CRC.BK' },
  { ticker: 'BJC', name: 'Berli Jucker PCL', fullTicker: 'BJC.BK' },
  { ticker: 'TU', name: 'Thai Union Group PCL', fullTicker: 'TU.BK' },
  { ticker: 'CPF', name: 'Charoen Pokphand Foods', fullTicker: 'CPF.BK' },
  { ticker: 'MINT', name: 'Minor International', fullTicker: 'MINT.BK' },
  { ticker: 'INTUCH', name: 'Intouch Holdings', fullTicker: 'INTUCH.BK' },
  { ticker: 'IVL', name: 'Indorama Ventures', fullTicker: 'IVL.BK' },
  { ticker: 'SCC', name: 'Siam Cement Group', fullTicker: 'SCC.BK' },
  { ticker: 'PTTGC', name: 'PTT Global Chemical', fullTicker: 'PTTGC.BK' },
  { ticker: 'BANPU', name: 'Banpu PCL', fullTicker: 'BANPU.BK' },
  { ticker: 'RATCH', name: 'Ratch Group PCL', fullTicker: 'RATCH.BK' },
  { ticker: 'OSP', name: 'Osotspa PCL', fullTicker: 'OSP.BK' },
];

// Default 6 shown (will be sorted by % change after fetch)
const DEFAULT_US_6 = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META'];
const DEFAULT_TH_6 = ['PTT.BK', 'CPALL.BK', 'ADVANC.BK', 'KBANK.BK', 'AOT.BK', 'SCB.BK'];

export default function StockSelector({
  onSelectStock,
  selectedTicker,
  lang,
  watchlist,
  onToggleWatchlist,
}: StockSelectorProps) {
  const RANK_REFRESH_MS = 30_000;
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [marketTab, setMarketTab] = useState<'US' | 'TH'>('US');
  const [suggestions, setSuggestions] = useState<typeof US_STOCK_POOL>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [rankedStocks, setRankedStocks] = useState<RankedStock[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);
  const [silentRanking, setSilentRanking] = useState(false);
  const [rankLastUpdated, setRankLastUpdated] = useState<Date | null>(null);
  const [rankCountdown, setRankCountdown] = useState(RANK_REFRESH_MS / 1000);
  const rankTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rankCdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch + rank stocks
  const fetchAndRankStocks = useCallback(async (silent = false) => {
    if (silent) setSilentRanking(true);
    else setLoadingRank(true);
    const tickers = marketTab === 'US' ? DEFAULT_US_6 : DEFAULT_TH_6;
    const results: RankedStock[] = [];

    await Promise.allSettled(
      tickers.map(async (ticker) => {
        try {
          const res = await fetch(`/api/stock?ticker=${ticker}`);
          if (!res.ok) return;
          const data = await res.json();
          const displayTicker = ticker.replace('.BK', '');
          results.push({
            ticker,
            displayTicker,
            name: data.name || displayTicker,
            market: marketTab,
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            currency: data.currency,
          });
        } catch { /* skip failed */ }
      })
    );

    results.sort((a, b) => a.changePercent - b.changePercent);
    setRankedStocks(results);
    setRankLastUpdated(new Date());
    setRankCountdown(RANK_REFRESH_MS / 1000);
    setLoadingRank(false);
    setSilentRanking(false);
  }, [marketTab]);

  // On market tab change: fetch immediately + start auto-refresh
  useEffect(() => {
    fetchAndRankStocks(false);

    if (rankTimerRef.current) clearInterval(rankTimerRef.current);
    if (rankCdRef.current) clearInterval(rankCdRef.current);

    rankTimerRef.current = setInterval(() => {
      if (!document.hidden) fetchAndRankStocks(true);
    }, RANK_REFRESH_MS);

    rankCdRef.current = setInterval(() => {
      setRankCountdown((c) => (c <= 1 ? RANK_REFRESH_MS / 1000 : c - 1));
    }, 1000);

    return () => {
      if (rankTimerRef.current) clearInterval(rankTimerRef.current);
      if (rankCdRef.current) clearInterval(rankCdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketTab]);

  // Autocomplete filtering
  const updateSuggestions = (val: string) => {
    setSearchQuery(val);
    const query = val.toUpperCase().trim();
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (marketTab === 'US') {
      const filtered = US_STOCK_POOL.filter(
        (s) => s.ticker.includes(query) || s.name.toUpperCase().includes(query)
      );
      setSuggestions(filtered.slice(0, 7));
      setShowSuggestions(filtered.length > 0);
    } else {
      // Map TH pool to same shape
      const filtered = TH_STOCK_POOL.filter(
        (s) => s.ticker.includes(query) || s.name.toUpperCase().includes(query)
      ).map((s) => ({ ticker: s.fullTicker, name: s.name }));
      setSuggestions(filtered.slice(0, 7));
      setShowSuggestions(filtered.length > 0);
    }
  };

  const handleSelectSuggestion = (item: { ticker: string; name: string }) => {
    onSelectStock(item.ticker);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    let ticker = searchQuery.toUpperCase().trim();
    if (marketTab === 'TH' && !ticker.endsWith('.BK')) ticker = `${ticker}.BK`;
    onSelectStock(ticker);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const isInWatchlist = (ticker: string) =>
    watchlist.some((w) => w.ticker === ticker);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Compass className="w-5 h-5 text-yellow-400" />
          <span>{t.markets}</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* Countdown */}
          <div className="flex items-center gap-1 text-[10px] text-gray-600 font-mono">
            {silentRanking
              ? <RefreshCw className="w-2.5 h-2.5 text-yellow-400 animate-spin" />
              : <span className="text-yellow-400/70">⟳</span>}
            <span className="text-yellow-400/70 font-bold">
              {String(Math.floor(rankCountdown / 60)).padStart(2, '0')}:{String(rankCountdown % 60).padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={() => fetchAndRankStocks(false)}
            disabled={loadingRank || silentRanking}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-all disabled:opacity-50"
            title="Refresh rankings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRank ? 'animate-spin' : ''}`} />
          </button>
          {/* Market toggle */}
          <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-800/80">
            <button
              onClick={() => { setMarketTab('US'); setShowSuggestions(false); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                marketTab === 'US'
                  ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              {t.usMarket}
            </button>
            <button
              onClick={() => { setMarketTab('TH'); setShowSuggestions(false); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 flex items-center gap-1.5 ${
                marketTab === 'TH'
                  ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {t.thMarket}
            </button>
          </div>
        </div>
      </div>

      {/* Search with Autocomplete */}
      <div ref={autocompleteRef} className="mb-4 relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateSuggestions(e.target.value)}
            onFocus={() => searchQuery && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={marketTab === 'US' ? t.searchUsPlaceholder : t.searchThPlaceholder}
            className="w-full bg-gray-950/80 border border-gray-800 focus:border-yellow-400/50 rounded-xl py-3 pl-10 pr-16 text-sm text-gray-200 outline-none transition-all duration-300 placeholder-gray-500"
            autoComplete="off"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold bg-gray-800 hover:bg-yellow-400 hover:text-black text-gray-300 rounded-lg transition-all duration-300"
          >
            {t.go}
          </button>
        </form>
        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {showSuggestions && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-30 left-0 right-0 mt-1 bg-gray-950 border border-gray-800 rounded-lg shadow-xl overflow-hidden"
            >
              {suggestions.map((item) => (
                <div
                  key={item.ticker}
                  onClick={() => handleSelectSuggestion(item)}
                  className="px-3 py-2 hover:bg-gray-900 cursor-pointer flex items-center justify-between text-xs transition-colors duration-200 border-b border-gray-900 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{item.ticker.replace('.BK', '')}</span>
                    <span className="text-[10px] text-gray-500 line-clamp-1">{item.name}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-400 rounded font-bold uppercase">
                    {marketTab}
                  </span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ranking label */}
      <div className="flex items-center gap-1.5 mb-3">
        <ArrowDownUp className="w-3 h-3 text-yellow-400" />
        <span className="text-[10px] font-bold text-yellow-400/80 uppercase tracking-wider">{t.sortedByDrop}</span>
      </div>

      {/* Ranked Stock Cards */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {loadingRank ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-950/40 border border-gray-900 rounded-xl animate-pulse" />
          ))
        ) : rankedStocks.length > 0 ? (
          rankedStocks.map((stock, idx) => {
            const isSelected = selectedTicker === stock.ticker || selectedTicker === stock.displayTicker;
            const isWatched = isInWatchlist(stock.ticker);
            const isDown = stock.changePercent < 0;
            const rankLabel = idx === 0 ? '🔥 #1' : `#${idx + 1}`;

            return (
              <motion.div
                key={stock.ticker}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelectStock(stock.ticker)}
                className={`p-3.5 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-300 border group ${
                  isSelected
                    ? 'bg-yellow-400/10 border-yellow-400/50 shadow-md shadow-yellow-400/5'
                    : 'bg-gray-950/30 border-gray-900 hover:border-gray-800 hover:bg-gray-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black text-gray-600 w-6 text-center">{rankLabel}</span>
                  <div className="flex flex-col">
                    <span className={`font-bold tracking-wide transition-colors text-sm ${isSelected ? 'text-yellow-400' : 'text-white'}`}>
                      {stock.displayTicker}
                    </span>
                    <span className="text-[10px] text-gray-500 line-clamp-1 max-w-[120px]">{stock.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-300">
                      {stock.currency === 'THB' ? '฿' : '$'}{stock.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isDown ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isDown ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                      {isDown ? '' : '+'}{stock.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Watchlist heart button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleWatchlist(stock); }}
                    className={`p-1.5 rounded-lg transition-all duration-300 ${
                      isWatched
                        ? 'text-rose-400 bg-rose-400/10'
                        : 'text-gray-600 hover:text-rose-400 opacity-0 group-hover:opacity-100'
                    }`}
                    title={t.addToWatchlist}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWatched ? 'fill-rose-400' : ''}`} />
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          // Fallback: no data
          <div className="text-center text-gray-600 text-xs py-8">{t.loadingRanking}</div>
        )}
      </div>
    </div>
  );
}