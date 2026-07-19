'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, TrendingUp, TrendingDown, X, RefreshCw, Eye, Clock } from 'lucide-react';
import { translations } from '@/utils/translations';
import { WatchlistItem } from '@/utils/types';

interface LivePrice {
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

interface WatchlistSectionProps {
  watchlist: WatchlistItem[];
  onRemove: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  lang: 'en' | 'th';
}

export default function WatchlistSection({
  watchlist,
  onRemove,
  onSelectStock,
  lang,
}: WatchlistSectionProps) {
  const t = translations[lang];
  const REFRESH_MS = 30_000;
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(false);
  const [silentLoading, setSilentLoading] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  const fetchPrices = useCallback(async (silent = false) => {
    if (watchlistRef.current.length === 0) return;
    if (silent) setSilentLoading(true);
    else setLoading(true);
    const newPrices: Record<string, LivePrice> = {};

    await Promise.allSettled(
      watchlistRef.current.map(async (item) => {
        try {
          const res = await fetch(`/api/stock?ticker=${item.ticker}`);
          if (!res.ok) return;
          const data = await res.json();
          newPrices[item.ticker] = {
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            currency: data.currency,
          };
        } catch { /* skip */ }
      })
    );

    setPrices(newPrices);
    setCountdown(REFRESH_MS / 1000);
    setLoading(false);
    setSilentLoading(false);
  }, []);

  // Fetch on watchlist change + auto-refresh every 30s
  useEffect(() => {
    fetchPrices(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (cdRef.current) clearInterval(cdRef.current);

    if (watchlist.length > 0) {
      timerRef.current = setInterval(() => {
        if (!document.hidden) fetchPrices(true);
      }, REFRESH_MS);

      cdRef.current = setInterval(() => {
        setCountdown((c) => (c <= 1 ? REFRESH_MS / 1000 : c - 1));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cdRef.current) clearInterval(cdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length]);

  return (
    <div className="glass-panel p-6 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-rose-400" />
            <span>{t.watchlist}</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5 ml-7">{t.watchlistSubtitle}</p>
        </div>

        {watchlist.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Countdown */}
            <div className="flex items-center gap-1 text-[10px] font-mono">
              {silentLoading
                ? <RefreshCw className="w-2.5 h-2.5 text-rose-400 animate-spin" />
                : <Clock className="w-2.5 h-2.5 text-rose-400/60" />}
              <span className="text-rose-400/70 font-bold">
                {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={() => fetchPrices(false)}
              disabled={loading || silentLoading}
              className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? t.watchlistUpdating : t.syncPrices}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {watchlist.length === 0 ? (
        <div className="h-24 border border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-600">
          <Bookmark className="w-6 h-6 stroke-1" />
          <span className="text-xs text-center px-4">{t.watchlistEmpty}</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <AnimatePresence>
            {watchlist.map((item) => {
              const lp = prices[item.ticker];
              const isDown = lp ? lp.changePercent < 0 : false;

              return (
                <motion.div
                  key={item.ticker}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="relative bg-gray-950/50 border border-gray-900 hover:border-gray-700 rounded-xl p-3 cursor-pointer group transition-all duration-300"
                  onClick={() => onSelectStock(item.ticker)}
                >
                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(item.ticker); }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-gray-900 hover:bg-rose-500/30 text-gray-600 hover:text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {/* Content */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="font-black text-sm text-white">{item.displayTicker}</span>
                      <span className="text-[8px] px-1 py-0.5 bg-gray-900 text-gray-500 rounded font-bold">{item.market}</span>
                    </div>
                    <span className="text-[9px] text-gray-600 line-clamp-1">{item.name}</span>

                    {lp ? (
                      <>
                        <span className="text-xs font-bold text-gray-200 mt-1">
                          {lp.currency === 'THB' ? '฿' : '$'}{lp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isDown ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isDown ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                          {isDown ? '' : '+'}{lp.changePercent.toFixed(2)}%
                        </span>
                      </>
                    ) : (
                      <div className="mt-1 h-8 flex items-center">
                        <div className="w-full h-2 bg-gray-900 rounded animate-pulse" />
                      </div>
                    )}

                    {/* View chart hint */}
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <Eye className="w-2.5 h-2.5 text-yellow-400" />
                      <span className="text-[9px] text-yellow-400 font-semibold">Chart</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
