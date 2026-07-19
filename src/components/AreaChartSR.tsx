'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { StockData } from '@/utils/types';
import { ArrowUpRight, ArrowDownRight, Layers, Sliders } from 'lucide-react';
import { translations } from '@/utils/translations';

interface AreaChartSRProps {
  stock: StockData;
  lang: 'en' | 'th';
}

export default function AreaChartSR({ stock, lang }: AreaChartSRProps) {
  const t = translations[lang];
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M'>('3M');
  const [isMounted, setIsMounted] = useState(false);
  const [showPivotLines, setShowPivotLines] = useState(true);
  const [showSwingLines, setShowSwingLines] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getFilteredData = () => {
    const totalPoints = stock.history.length;
    let daysToKeep = 90;
    if (timeframe === '1M') daysToKeep = 30;
    if (timeframe === '6M') daysToKeep = 180;

    return stock.history.slice(-daysToKeep).map((point) => {
      const date = new Date(point.timestamp * 1000);
      return {
        ...point,
        formattedDate: date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' }),
      };
    });
  };

  if (!isMounted) {
    return (
      <div className="glass-panel w-full h-[450px] rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin"></div>
          <span className="text-sm text-gray-400">{t.loadingChart}</span>
        </div>
      </div>
    );
  }

  const chartData = getFilteredData();
  const isPositive = stock.change >= 0;
  
  const formatPrice = (val: number) => {
    return new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: stock.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const s1 = stock.pivotPoints.s1;
  const s2 = stock.pivotPoints.s2;
  const r1 = stock.pivotPoints.r1;
  const r2 = stock.pivotPoints.r2;

  const swingSupports = stock.supportLevels.filter(s => s < stock.price).slice(0, 2);
  const swingResistances = stock.resistanceLevels.filter(r => r > stock.price).slice(0, 2);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{stock.ticker}</h1>
            <span className="text-xs px-2.5 py-1 rounded bg-gray-900 text-gray-400 font-semibold tracking-wider uppercase">
              {stock.name}
            </span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-white">{formatPrice(stock.price)}</span>
            <span className={`flex items-center text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
              {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* S/R toggles */}
          <div className="flex bg-gray-950/60 p-1 rounded-xl border border-gray-900 text-xs">
            <button
              onClick={() => setShowSwingLines(!showSwingLines)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                showSwingLines ? 'bg-gray-800 text-white font-medium' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t.swingSR}
            </button>
            <button
              onClick={() => setShowPivotLines(!showPivotLines)}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                showPivotLines ? 'bg-gray-800 text-white font-medium' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {t.pivotSR}
            </button>
          </div>

          {/* Timeframe selector */}
          <div className="flex bg-gray-950/60 p-1 rounded-xl border border-gray-900 text-xs">
            {(['1M', '3M', '6M'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  timeframe === tf 
                    ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-[320px] sm:h-[360px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
            <XAxis 
              dataKey="formattedDate" 
              stroke="#6b7280" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 15, 30, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                fontFamily: 'inherit',
              }}
              formatter={(value: any) => [formatPrice(Number(value)), 'Price']}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#a78bfa"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorPrice)"
            />

            {/* Current Price reference line */}
            <ReferenceLine 
              y={stock.price} 
              stroke="#fbbf24" 
              strokeWidth={1.5} 
              strokeDasharray="2 2"
              label={{
                value: `${t.live}: ${stock.price.toFixed(2)}`,
                fill: '#fbbf24',
                fontSize: 10,
                position: 'right',
                fontWeight: 600
              }}
            />

            {/* Pivot Support levels */}
            {showPivotLines && (
              <>
                <ReferenceLine 
                  y={r1} 
                  stroke="#ef4444" 
                  strokeWidth={1} 
                  strokeDasharray="4 4" 
                  label={{ value: `R1: ${r1.toFixed(2)}`, fill: '#ef4444', fontSize: 9, position: 'insideBottomLeft' }}
                />
                <ReferenceLine 
                  y={s1} 
                  stroke="#10b981" 
                  strokeWidth={1} 
                  strokeDasharray="4 4" 
                  label={{ value: `S1: ${s1.toFixed(2)}`, fill: '#10b981', fontSize: 9, position: 'insideTopLeft' }}
                />
                <ReferenceLine 
                  y={r2} 
                  stroke="#b91c1c" 
                  strokeWidth={1} 
                  strokeDasharray="5 5" 
                  label={{ value: `R2: ${r2.toFixed(2)}`, fill: '#b91c1c', fontSize: 9, position: 'insideBottomLeft' }}
                />
                <ReferenceLine 
                  y={s2} 
                  stroke="#047857" 
                  strokeWidth={1} 
                  strokeDasharray="5 5" 
                  label={{ value: `S2: ${s2.toFixed(2)}`, fill: '#047857', fontSize: 9, position: 'insideTopLeft' }}
                />
              </>
            )}

            {/* Swing S/R lines */}
            {showSwingLines && (
              <>
                {swingSupports.map((lvl, idx) => (
                  <ReferenceLine 
                    key={`ss-${idx}`}
                    y={lvl} 
                    stroke="#059669" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3"
                    label={{ value: `Support: ${lvl.toFixed(2)}`, fill: '#34d399', fontSize: 9, position: 'insideTopRight' }}
                  />
                ))}
                {swingResistances.map((lvl, idx) => (
                  <ReferenceLine 
                    key={`sr-${idx}`}
                    y={lvl} 
                    stroke="#dc2626" 
                    strokeWidth={1.5} 
                    strokeDasharray="3 3"
                    label={{ value: `Resistance: ${lvl.toFixed(2)}`, fill: '#f87171', fontSize: 9, position: 'insideBottomRight' }}
                  />
                ))}
              </>
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* S/R Legend Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-900 text-sm">
        <div className="p-3 bg-rose-950/15 border border-rose-500/10 rounded-xl">
          <span className="text-xs text-rose-400 block font-medium mb-1">{t.pivotRes}</span>
          <span className="font-bold text-white">{formatPrice(r1)} / {formatPrice(r2)}</span>
        </div>
        <div className="p-3 bg-emerald-950/15 border border-emerald-500/10 rounded-xl">
          <span className="text-xs text-emerald-400 block font-medium mb-1">{t.pivotSup}</span>
          <span className="font-bold text-white">{formatPrice(s1)} / {formatPrice(s2)}</span>
        </div>
        
        <div className="p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
          <span className="text-xs text-red-400 block font-medium mb-1">{t.swingRes}</span>
          <span className="font-bold text-white">
            {swingResistances[0] ? formatPrice(swingResistances[0]) : t.noneDetected}
          </span>
        </div>
        <div className="p-3 bg-gray-950/40 border border-gray-800 rounded-xl">
          <span className="text-xs text-green-400 block font-medium mb-1">{t.swingSup}</span>
          <span className="font-bold text-white">
            {swingSupports[0] ? formatPrice(swingSupports[0]) : t.noneDetected}
          </span>
        </div>
      </div>
    </div>
  );
}
