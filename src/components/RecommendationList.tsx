'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { StockData } from '@/utils/types';
import { translations } from '@/utils/translations';

interface RecommendationListProps {
  onSelectStock: (ticker: string) => void;
  lang: 'en' | 'th';
}

const DEFAULT_POOL = [
  'AAPL', 'NVDA', 'TSLA', 'AMD', 'MSFT',
  'PTT.BK', 'CPALL.BK', 'ADVANC.BK', 'BDMS.BK', 'KBANK.BK'
];

export default function RecommendationList({ onSelectStock, lang }: RecommendationListProps) {
  const t = translations[lang];
  const [recommendations, setRecommendations] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scanMarket();
  }, []);

  const scanMarket = async () => {
    setLoading(true);
    const scanned: StockData[] = [];
    
    try {
      const promises = DEFAULT_POOL.map(async (ticker) => {
        try {
          const res = await fetch(`/api/stock?ticker=${ticker}`);
          if (res.ok) {
            const data = (await res.json()) as StockData;
            scanned.push(data);
          }
        } catch (e) {
          console.error(`Error scanning ${ticker}`, e);
        }
      });

      await Promise.all(promises);
      
      scanned.sort((a, b) => b.technicalSignals.score - a.technicalSignals.score);
      setRecommendations(scanned);
    } catch (err) {
      console.error('Failed to complete market technical scan', err);
    } finally {
      setLoading(false);
    }
  };

  const getRatingTranslation = (rating: string) => {
    if (rating === 'Strong Buy') return t.strongBuy;
    if (rating === 'Buy') return t.buy;
    if (rating === 'Hold') return t.hold;
    return t.avoid;
  };

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
            <span>{t.todayPicks}</span>
          </h2>
          <span className="text-xs text-gray-500">{t.scanning}</span>
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[90px] bg-gray-950/40 border border-gray-900 rounded-xl animate-pulse flex items-center justify-between p-4">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-800 rounded"></div>
                <div className="h-3 w-32 bg-gray-900 rounded"></div>
              </div>
              <div className="h-6 w-16 bg-gray-800 rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const buyPicks = recommendations.filter(
    r => r.technicalSignals.rating === 'Strong Buy' || r.technicalSignals.rating === 'Buy'
  );
  
  const displayPicks = buyPicks.length > 0 ? buyPicks.slice(0, 4) : recommendations.slice(0, 3);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span>{t.todayPicks}</span>
        </h2>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/10">
          {t.aiScan}
        </span>
      </div>

      <div className="space-y-3">
        {displayPicks.map((stock, idx) => {
          const isStrong = stock.technicalSignals.rating === 'Strong Buy';
          const isBuy = stock.technicalSignals.rating === 'Buy';
          const score = stock.technicalSignals.score;
          const ratingText = getRatingTranslation(stock.technicalSignals.rating);
          
          return (
            <motion.div
              key={stock.ticker}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => {
                const fullSymbol = stock.market === 'TH' ? `${stock.ticker}.BK` : stock.ticker;
                onSelectStock(fullSymbol);
              }}
              className="p-4 bg-gray-950/20 border border-gray-900 hover:border-gray-800 rounded-xl cursor-pointer transition-all duration-300 group flex flex-col gap-3"
            >
              {/* Top row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white tracking-wide text-base group-hover:text-yellow-400 transition-colors">
                    {stock.ticker}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-500 rounded font-bold uppercase">
                    {stock.market}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isStrong 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' 
                      : isBuy 
                      ? 'bg-green-500/15 text-green-400 border border-green-500/10'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    {ratingText}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{t.score}:</span>
                  <span className={`text-sm font-extrabold ${
                    score >= 75 ? 'text-emerald-400' : score >= 55 ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {score}/100
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    score >= 75 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                      : score >= 55 
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                      : 'bg-gray-700'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>

              {/* Reasons row */}
              <div className="flex flex-col gap-1.5 text-xs text-gray-500">
                {stock.technicalSignals.reasons.slice(0, 2).map((reason, ridx) => (
                  <div key={ridx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
