'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, Search, TrendingUp, TrendingDown,
  DollarSign, Activity, Scale, Droplets, AlertCircle, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { translations } from '@/utils/translations';
import { FinancialData } from '@/utils/types';
import { US_STOCK_POOL, TH_STOCK_POOL } from './StockSelector';

interface FinancialStatementProps {
  lang: 'en' | 'th';
}

type TabKey = 'income' | 'balance' | 'cashflow';

const METRIC_CARD_CONFIG = [
  { key: 'peRatio', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', format: (v: number) => v.toFixed(2) + 'x' },
  { key: 'pbRatio', icon: Scale, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', format: (v: number) => v.toFixed(2) + 'x' },
  { key: 'roe', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', format: (v: number) => (v * 100).toFixed(1) + '%' },
  { key: 'beta', icon: Droplets, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20', format: (v: number) => v.toFixed(2) },
  { key: 'eps', icon: DollarSign, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', format: (v: number) => v.toFixed(2) },
  { key: 'dividendYield', icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20', format: (v: number) => (v * 100).toFixed(2) + '%' },
  { key: 'marketCap', icon: BarChart2, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', format: (v: number) => formatLarge(v) },
];

function formatLarge(v: number): string {
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  return v.toLocaleString();
}

function formatBar(v: number | null): string {
  if (v === null || v === undefined) return 'N/A';
  return formatLarge(v);
}

const CHART_COLORS = ['#facc15', '#fb923c', '#34d399', '#60a5fa', '#a78bfa'];

export default function FinancialStatement({ lang }: FinancialStatementProps) {
  const t = translations[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ ticker: string; name: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<'US' | 'TH'>('US');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('income');
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateSuggestions = (val: string) => {
    setSearchQuery(val);
    const query = val.toUpperCase().trim();
    if (!query) { setSuggestions([]); setShowSuggestions(false); return; }
    if (selectedMarket === 'US') {
      const filtered = US_STOCK_POOL.filter(
        (s) => s.ticker.includes(query) || s.name.toUpperCase().includes(query)
      );
      setSuggestions(filtered.slice(0, 7));
      setShowSuggestions(filtered.length > 0);
    } else {
      const filtered = TH_STOCK_POOL.filter(
        (s) => s.ticker.includes(query) || s.name.toUpperCase().includes(query)
      ).map((s) => ({ ticker: s.fullTicker, name: s.name }));
      setSuggestions(filtered.slice(0, 7));
      setShowSuggestions(filtered.length > 0);
    }
  };

  const fetchFinancials = async (ticker: string) => {
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      let symbol = ticker.toUpperCase().trim();
      if (selectedMarket === 'TH' && !symbol.endsWith('.BK')) symbol = `${symbol}.BK`;
      const res = await fetch(`/api/financials?ticker=${symbol}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch');
      }
      const data: FinancialData = await res.json();
      setFinancialData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
      setFinancialData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (item: { ticker: string; name: string }) => {
    setSearchQuery(item.ticker.replace('.BK', ''));
    setShowSuggestions(false);
    fetchFinancials(item.ticker);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchFinancials(searchQuery);
    setSearchQuery('');
  };

  // ── Build chart data ──────────────────────────────────────────────────────
  const incomeChartData = financialData?.incomeStatement.slice().reverse().map((p) => ({
    year: p.date,
    Revenue: p.revenue,
    'Gross Profit': p.grossProfit,
    'Net Income': p.netIncome,
  })) ?? [];

  const balanceChartData = financialData?.balanceSheet.slice().reverse().map((p) => ({
    year: p.date,
    Assets: p.totalAssets,
    Liabilities: p.totalLiabilities,
    Equity: p.totalEquity,
  })) ?? [];

  const cashChartData = financialData?.cashFlow.slice().reverse().map((p) => ({
    year: p.date,
    'Operating CF': p.operatingCashFlow,
    'Free CF': p.freeCashFlow,
    CapEx: p.capitalExpenditures,
  })) ?? [];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'income', label: t.incomeStatement },
    { key: 'balance', label: t.balanceSheet },
    { key: 'cashflow', label: t.cashFlow },
  ];

  // ── Table rows config ─────────────────────────────────────────────────────
  const incomeRows = [
    { label: t.revenue, key: 'revenue' as const },
    { label: t.grossProfit, key: 'grossProfit' as const },
    { label: t.operatingIncome, key: 'operatingIncome' as const },
    { label: t.netIncome, key: 'netIncome' as const },
    { label: t.ebitda, key: 'ebitda' as const },
  ];

  const balanceRows = [
    { label: t.totalAssets, key: 'totalAssets' as const },
    { label: t.totalLiabilities, key: 'totalLiabilities' as const },
    { label: t.totalEquity, key: 'totalEquity' as const },
    { label: t.totalDebt, key: 'totalDebt' as const },
    { label: t.cash, key: 'cash' as const },
  ];

  const cashRows = [
    { label: t.operatingCF, key: 'operatingCashFlow' as const },
    { label: t.freeCF, key: 'freeCashFlow' as const },
    { label: t.capEx, key: 'capitalExpenditures' as const },
    { label: t.investingCF, key: 'investingCashFlow' as const },
  ];

  const periodDates = (data: FinancialData) => {
    if (activeTab === 'income') return data.incomeStatement.map((p) => p.date);
    if (activeTab === 'balance') return data.balanceSheet.map((p) => p.date);
    return data.cashFlow.map((p) => p.date);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            <span>{t.financialStatement}</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5 ml-7">{t.financialSubtitle}</p>
        </div>

        {/* Market toggle */}
        <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-800/80">
          <button
            onClick={() => setSelectedMarket('US')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
              selectedMarket === 'US' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            US Market
          </button>
          <button
            onClick={() => setSelectedMarket('TH')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-300 ${
              selectedMarket === 'TH' ? 'bg-cyan-400 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            TH Market
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div ref={autocompleteRef} className="relative mb-6">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => updateSuggestions(e.target.value)}
            onFocus={() => searchQuery && suggestions.length > 0 && setShowSuggestions(true)}
            placeholder={t.searchFinancialsPlaceholder}
            autoComplete="off"
            className="w-full bg-gray-950/80 border border-gray-800 focus:border-cyan-400/50 rounded-xl py-3 pl-10 pr-28 text-sm text-gray-200 outline-none transition-all duration-300 placeholder-gray-500"
          />
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-400 hover:text-black text-cyan-400 border border-cyan-400/30 rounded-lg transition-all duration-300"
          >
            {t.analyzeStock}
          </button>
        </form>
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
                  className="px-3 py-2 hover:bg-gray-900 cursor-pointer flex items-center justify-between text-xs transition-colors border-b border-gray-900 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{item.ticker.replace('.BK', '')}</span>
                    <span className="text-[10px] text-gray-500">{item.name}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-400 rounded font-bold uppercase">{selectedMarket}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-gray-400">{t.loadingFinancials}</span>
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <span className="text-sm text-rose-400 max-w-md">{t.financialError}</span>
          <span className="text-xs text-gray-600">{error}</span>
        </div>
      )}

      {!loading && !error && !financialData && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border border-dashed border-gray-800 rounded-xl">
          <BarChart2 className="w-10 h-10 text-gray-700 stroke-1" />
          <span className="text-sm text-gray-500">{t.noFinancialData}</span>
        </div>
      )}

      {!loading && !error && financialData && (
        <AnimatePresence mode="wait">
          <motion.div
            key={financialData.ticker}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            {/* Stock Name Header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <span className="text-xs font-black text-cyan-400">{financialData.ticker.slice(0, 2)}</span>
              </div>
              <div>
                <h3 className="font-bold text-white">{financialData.ticker} – {financialData.name}</h3>
                <span className="text-[10px] text-gray-500">{financialData.market} · {financialData.currency} · {t.annual}</span>
              </div>
            </div>

            {/* ── Key Metrics Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {METRIC_CARD_CONFIG.map(({ key, icon: Icon, color, bg, border, format }) => {
                const rawVal = financialData[key as keyof FinancialData] as number | null;
                return (
                  <div key={key} className={`${bg} border ${border} rounded-xl p-3 flex flex-col gap-1`}>
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${color}`} />
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${color}`}>
                        {t[key as keyof typeof t] as string}
                      </span>
                    </div>
                    <span className="text-sm font-black text-white">
                      {rawVal !== null && rawVal !== undefined ? format(rawVal) : t.noData}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-gray-950/60 p-1 rounded-xl border border-gray-900 w-fit">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${
                    activeTab === tab.key
                      ? 'bg-cyan-400 text-black shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5"
              >
                {/* Chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(activeTab === 'income' ? incomeChartData : activeTab === 'balance' ? balanceChartData : cashChartData) as Record<string, unknown>[]}
                      barSize={14}
                    >
                      <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickFormatter={formatBar} axisLine={false} tickLine={false} width={55} />
                      <Tooltip
                        contentStyle={{ background: '#030712', border: '1px solid #1f2937', borderRadius: 8, fontSize: 11 }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(value) => [typeof value === 'number' ? formatBar(value) : String(value ?? 'N/A'), '']}
                      />
                      {(activeTab === 'income'
                        ? ['Revenue', 'Gross Profit', 'Net Income']
                        : activeTab === 'balance'
                        ? ['Assets', 'Liabilities', 'Equity']
                        : ['Operating CF', 'Free CF', 'CapEx']
                      ).map((key, i) => (
                        <Bar key={key} dataKey={key} fill={CHART_COLORS[i]} radius={[3, 3, 0, 0]}>
                          {(activeTab === 'income' ? incomeChartData : activeTab === 'balance' ? balanceChartData : cashChartData).map((_, j) => (
                            <Cell key={j} fill={CHART_COLORS[i]} opacity={0.85} />
                          ))}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-900">
                        <th className="text-left text-gray-500 font-bold uppercase tracking-wide pb-2 pr-4 w-48">{t.annual}</th>
                        {periodDates(financialData).map((d) => (
                          <th key={d} className="text-right text-gray-400 font-bold pb-2 px-3">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(activeTab === 'income' ? incomeRows : activeTab === 'balance' ? balanceRows : cashRows).map(({ label, key }) => (
                        <tr key={key} className="border-b border-gray-900/50 hover:bg-gray-900/20 transition-colors">
                          <td className="py-2.5 pr-4 text-gray-400 font-medium">{label}</td>
                          {(activeTab === 'income'
                            ? financialData.incomeStatement
                            : activeTab === 'balance'
                            ? financialData.balanceSheet
                            : financialData.cashFlow
                          ).map((period, i) => {
                            const v = (period as unknown as Record<string, number | null>)[key];
                            const isNeg = v !== null && v < 0;
                            return (
                              <td
                                key={i}
                                className={`py-2.5 px-3 text-right font-semibold ${
                                  v === null ? 'text-gray-700' : isNeg ? 'text-rose-400' : 'text-gray-200'
                                }`}
                              >
                                {v !== null ? formatBar(v) : t.noData}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
