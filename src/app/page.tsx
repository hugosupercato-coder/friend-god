'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cpu, RefreshCw, Globe, Clock } from 'lucide-react';
import StockSelector from '@/components/StockSelector';
import AreaChartSR from '@/components/AreaChartSR';
import PortfolioSection from '@/components/PortfolioSection';
import RecommendationList from '@/components/RecommendationList';
import WatchlistSection from '@/components/WatchlistSection';
import FinancialStatement from '@/components/FinancialStatement';
import { StockData, WatchlistItem, RankedStock } from '@/utils/types';
import { translations } from '@/utils/translations';

const WATCHLIST_KEY = 'friend_god_watchlist';
const CHART_REFRESH_MS = 30_000; // 30 seconds

export default function Home() {
  const [lang, setLang] = useState<'en' | 'th'>('th');
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [silentRefreshing, setSilentRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(CHART_REFRESH_MS / 1000);

  const tickerRef = useRef(selectedTicker);
  tickerRef.current = selectedTicker;
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load lang + watchlist ─────────────────────────────────────────────────
  useEffect(() => {
    const savedLang = localStorage.getItem('friend_god_lang');
    if (savedLang === 'en' || savedLang === 'th') setLang(savedLang);
    const savedWL = localStorage.getItem(WATCHLIST_KEY);
    if (savedWL) {
      try { setWatchlist(JSON.parse(savedWL)); } catch { /* ignore */ }
    }
  }, []);

  // ── Watchlist helpers ─────────────────────────────────────────────────────
  const handleToggleWatchlist = useCallback((stock: RankedStock) => {
    setWatchlist((prev) => {
      const exists = prev.some((w) => w.ticker === stock.ticker);
      const updated: WatchlistItem[] = exists
        ? prev.filter((w) => w.ticker !== stock.ticker)
        : [...prev, { ticker: stock.ticker, displayTicker: stock.displayTicker, name: stock.name, market: stock.market, addedAt: Date.now() }];
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleRemoveFromWatchlist = useCallback((ticker: string) => {
    setWatchlist((prev) => {
      const updated = prev.filter((w) => w.ticker !== ticker);
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ── Fetch chart data ──────────────────────────────────────────────────────
  const fetchStockDetails = useCallback(async (silent = false) => {
    if (silent) {
      setSilentRefreshing(true);
    } else {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(`/api/stock?ticker=${tickerRef.current}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch');
      }
      const data = await res.json();
      setStockData(data);
      setLastUpdated(new Date());
      setCountdown(CHART_REFRESH_MS / 1000);
    } catch (err: unknown) {
      if (!silent) setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
      setSilentRefreshing(false);
    }
  }, []);

  // ── On ticker change: fetch immediately + restart auto-refresh ────────────
  useEffect(() => {
    fetchStockDetails(false);

    // Clear existing timers
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Auto-refresh every 30s (silent, no loading spinner)
    refreshTimerRef.current = setInterval(() => {
      if (!document.hidden) fetchStockDetails(true);
    }, CHART_REFRESH_MS);

    // Countdown timer (ticks every second)
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) return CHART_REFRESH_MS / 1000;
        return c - 1;
      });
    }, 1000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicker]);

  const handleSelectStock = (ticker: string) => setSelectedTicker(ticker);
  const handleLanguageChange = (newLang: 'en' | 'th') => {
    setLang(newLang);
    localStorage.setItem('friend_god_lang', newLang);
  };

  const t = translations[lang];
  const priceColor = stockData ? (stockData.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-gray-400';

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-10">

      {/* ════ HEADER ════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-900">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-400/20">
              <span className="font-extrabold text-black text-xl">FG</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              <span className="text-gradient-gold">{t.title}</span>
            </h1>
          </div>
          <p className="text-xs text-gray-500 font-semibold tracking-wider uppercase ml-1">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Language */}
          <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-800/80 items-center">
            <Globe className="w-3.5 h-3.5 text-gray-500 mx-2" />
            <button
              onClick={() => handleLanguageChange('th')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all duration-300 ${lang === 'th' ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20' : 'text-gray-400 hover:text-white'}`}
            >TH</button>
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-all duration-300 ${lang === 'en' ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20' : 'text-gray-400 hover:text-white'}`}
            >EN</button>
          </div>

          {/* Live Price Ticker for selected stock */}
          {stockData && (
            <motion.div
              key={stockData.ticker}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-950/80 border border-gray-800"
            >
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-white text-sm">{stockData.ticker.replace('.BK', '')}</span>
                  {silentRefreshing && (
                    <RefreshCw className="w-2.5 h-2.5 text-yellow-400 animate-spin" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{stockData.currency === 'THB' ? '฿' : '$'}{stockData.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={`font-bold ${priceColor}`}>
                    {stockData.changePercent >= 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Live status + countdown */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-950/60 border border-gray-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-bold text-gray-300">{t.liveServer}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-950/60 border border-gray-900 text-gray-500">
            <Clock className="w-3 h-3 text-yellow-400/70" />
            <span className="font-mono text-[10px] font-bold text-yellow-400/80">
              {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-950/60 border border-gray-900 text-gray-400">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>{t.aiScoring}</span>
          </div>
        </div>
      </header>

      {/* ════ SECTION 1: ตลาดหุ้น + กราฟ ════ */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4">
            <StockSelector
              onSelectStock={handleSelectStock}
              selectedTicker={selectedTicker}
              lang={lang}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
            />
          </div>
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="glass-panel w-full h-[450px] rounded-2xl flex items-center justify-center"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-12 h-12">
                      <div className="absolute w-full h-full border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin" />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">{t.loadingChart}</span>
                  </div>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="glass-panel p-8 rounded-2xl text-center flex flex-col items-center justify-center gap-4 min-h-[300px]"
                >
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="max-w-md">
                    <h3 className="text-lg font-bold text-white mb-1">Failed to Load Ticker</h3>
                    <p className="text-sm text-gray-400">{error}</p>
                  </div>
                  <button
                    onClick={() => fetchStockDetails(false)}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs font-semibold rounded-lg border border-gray-800 flex items-center gap-2 transition-all duration-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </motion.div>
              ) : stockData ? (
                <motion.div
                  key={stockData.ticker}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Last updated + manual refresh */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                      <Clock className="w-3 h-3" />
                      {lastUpdated && (
                        <span>
                          {lang === 'th' ? 'อัปเดตล่าสุด: ' : 'Last update: '}
                          {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => fetchStockDetails(false)}
                      className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-yellow-400 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${silentRefreshing ? 'animate-spin text-yellow-400' : ''}`} />
                      {lang === 'th' ? 'รีเฟรช' : 'Refresh'}
                    </button>
                  </div>
                  <AreaChartSR stock={stockData} lang={lang} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ════ SECTION 2: WatchList ════ */}
      <section>
        <WatchlistSection
          watchlist={watchlist}
          onRemove={handleRemoveFromWatchlist}
          onSelectStock={handleSelectStock}
          lang={lang}
        />
      </section>

      {/* ════ SECTION 3: Today's Picks + Portfolio ════ */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <RecommendationList onSelectStock={handleSelectStock} lang={lang} />
          </div>
          <div className="lg:col-span-8">
            <PortfolioSection onSelectStock={handleSelectStock} lang={lang} />
          </div>
        </div>
      </section>

      {/* ════ SECTION 4: Financial Statement ════ */}
      <section>
        <FinancialStatement lang={lang} />
      </section>

      {/* ════ FOOTER ════ */}
      <footer className="mt-4 text-center text-[10px] text-gray-600 flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-gray-900 pt-6 gap-3">
        <span className="font-semibold tracking-wider">
          {t.footerText.replace('{year}', new Date().getFullYear().toString())}
        </span>
        <span className="flex items-center justify-center gap-1">
          <Shield className="w-3.5 h-3.5 text-gray-600" />
          {t.footerDisclaimer}
        </span>
      </footer>
    </div>
  );
}
