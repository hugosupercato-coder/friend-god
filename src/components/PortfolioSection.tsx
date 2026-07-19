'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw, Info, Check } from 'lucide-react';
import { PortfolioItem } from '@/utils/types';
import { translations } from '@/utils/translations';

interface PortfolioSectionProps {
  onSelectStock: (ticker: string) => void;
  lang: 'en' | 'th';
}

const USD_TO_THB = 35.0; // Fixed exchange rate

const TICKER_POOL = [
  // US
  { ticker: 'AAPL', name: 'Apple Inc.', market: 'US' as const },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', market: 'US' as const },
  { ticker: 'TSLA', name: 'Tesla Inc.', market: 'US' as const },
  { ticker: 'MSFT', name: 'Microsoft Corp.', market: 'US' as const },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', market: 'US' as const },
  { ticker: 'AMD', name: 'Advanced Micro Devices', market: 'US' as const },
  { ticker: 'META', name: 'Meta Platforms', market: 'US' as const },
  { ticker: 'GOOG', name: 'Alphabet Inc.', market: 'US' as const },
  { ticker: 'NFLX', name: 'Netflix Inc.', market: 'US' as const },
  { ticker: 'COIN', name: 'Coinbase Global', market: 'US' as const },
  { ticker: 'PLTR', name: 'Palantir Technologies', market: 'US' as const },
  // TH
  { ticker: 'PTT', name: 'PTT PCL', market: 'TH' as const },
  { ticker: 'CPALL', name: 'CP ALL PCL', market: 'TH' as const },
  { ticker: 'ADVANC', name: 'Advanced Info Service', market: 'TH' as const },
  { ticker: 'BDMS', name: 'Bangkok Dusit Medical', market: 'TH' as const },
  { ticker: 'AOT', name: 'Airports of Thailand', market: 'TH' as const },
  { ticker: 'KBANK', name: 'Kasikornbank PCL', market: 'TH' as const },
  { ticker: 'SCB', name: 'SCB X PCL', market: 'TH' as const },
  { ticker: 'DELTA', name: 'Delta Electronics', market: 'TH' as const },
  { ticker: 'TRUE', name: 'True Corporation', market: 'TH' as const },
  { ticker: 'GULF', name: 'Gulf Energy Development', market: 'TH' as const },
];

export default function PortfolioSection({ onSelectStock, lang }: PortfolioSectionProps) {
  const t = translations[lang];

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [market, setMarket] = useState<'US' | 'TH'>('US');
  const [inputCurrency, setInputCurrency] = useState<'USD' | 'THB'>('USD');
  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'THB'>('THB'); // Default THB display
  
  const [prices, setPrices] = useState<Record<string, { price: number; name: string }>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Autocomplete state
  const [suggestions, setSuggestions] = useState<typeof TICKER_POOL>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Close suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load portfolio from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('friend_god_portfolio');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as PortfolioItem[];
        setPortfolio(parsed);
      } catch (e) {
        console.error('Error parsing portfolio', e);
      }
    }
  }, []);

  // Fetch prices when portfolio changes
  useEffect(() => {
    if (portfolio.length === 0) return;
    fetchAllPrices();
  }, [portfolio]);

  const savePortfolio = (updated: PortfolioItem[]) => {
    setPortfolio(updated);
    localStorage.setItem('friend_god_portfolio', JSON.stringify(updated));
  };

  const fetchAllPrices = async () => {
    setLoadingPrices(true);
    const newPrices: Record<string, { price: number; name: string }> = { ...prices };
    
    try {
      const promises = portfolio.map(async (item) => {
        const symbol = item.market === 'TH' && !item.ticker.endsWith('.BK') 
          ? `${item.ticker}.BK` 
          : item.ticker;

        try {
          const res = await fetch(`/api/stock?ticker=${symbol}`);
          if (res.ok) {
            const data = await res.json();
            newPrices[item.ticker] = {
              price: data.price,
              name: data.name
            };
          }
        } catch (err) {
          console.error(`Error fetching price for ${item.ticker}`, err);
        }
      });

      await Promise.all(promises);
      setPrices(newPrices);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleTickerChange = (val: string) => {
    setTicker(val);
    const query = val.toUpperCase().trim();
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter suggestions from pool
    const filtered = TICKER_POOL.filter(
      item => item.ticker.startsWith(query) || item.name.toUpperCase().includes(query)
    );
    setSuggestions(filtered.slice(0, 5));
    setShowSuggestions(filtered.length > 0);
  };

  const handleSelectSuggestion = (item: typeof TICKER_POOL[0]) => {
    setTicker(item.ticker);
    setMarket(item.market);
    setInputCurrency(item.market === 'US' ? 'USD' : 'THB');
    setShowSuggestions(false);
  };

  const handleMarketChange = (val: 'US' | 'TH') => {
    setMarket(val);
    setInputCurrency(val === 'US' ? 'USD' : 'THB');
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!ticker || !quantity || !purchasePrice) {
      setErrorMessage(t.fillAllFields);
      return;
    }

    const cleanTicker = ticker.toUpperCase().trim();
    const qty = parseFloat(quantity);
    let priceInput = parseFloat(purchasePrice);

    if (isNaN(qty) || qty <= 0) {
      setErrorMessage(t.qtyError);
      return;
    }

    if (isNaN(priceInput) || priceInput <= 0) {
      setErrorMessage(t.priceError);
      return;
    }

    // Convert input price to stock's native currency if necessary
    // Stock native currency: US -> USD, TH -> THB
    let finalPurchasePrice = priceInput;
    if (market === 'US' && inputCurrency === 'THB') {
      // User entered THB for US stock. Convert to USD.
      finalPurchasePrice = priceInput / USD_TO_THB;
    } else if (market === 'TH' && inputCurrency === 'USD') {
      // User entered USD for Thai stock. Convert to THB.
      finalPurchasePrice = priceInput * USD_TO_THB;
    }

    const symbol = market === 'TH' ? `${cleanTicker}.BK` : cleanTicker;
    
    setLoadingPrices(true);
    try {
      const res = await fetch(`/api/stock?ticker=${symbol}`);
      if (!res.ok) {
        setErrorMessage(t.tickerNotFound);
        setLoadingPrices(false);
        return;
      }
      
      const data = await res.json();
      
      const newItem: PortfolioItem = {
        id: Math.random().toString(36).substring(2, 9),
        ticker: cleanTicker,
        name: data.name,
        quantity: qty,
        purchasePrice: finalPurchasePrice,
        market
      };

      const updated = [...portfolio, newItem];
      savePortfolio(updated);
      
      setPrices(prev => ({
        ...prev,
        [cleanTicker]: { price: data.price, name: data.name }
      }));

      // Reset form
      setTicker('');
      setQuantity('');
      setPurchasePrice('');
    } catch (err) {
      setErrorMessage(t.connError);
    } finally {
      setLoadingPrices(false);
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = portfolio.filter(item => item.id !== id);
    savePortfolio(updated);
  };

  // Convert USD <-> THB helper
  const convertValue = (val: number, from: 'USD' | 'THB', to: 'USD' | 'THB') => {
    if (from === to) return val;
    if (from === 'USD' && to === 'THB') return val * USD_TO_THB;
    return val / USD_TO_THB; // THB -> USD
  };

  // Calculations in display currency
  const calculatePortfolioTotals = () => {
    let totalCost = 0;
    let totalValue = 0;

    portfolio.forEach(item => {
      const livePriceUSDOrTHB = prices[item.ticker]?.price || item.purchasePrice;
      const nativeCurrency: 'USD' | 'THB' = item.market === 'US' ? 'USD' : 'THB';
      
      // Cost & Value in item's native currency
      const costNative = item.purchasePrice * item.quantity;
      const valueNative = livePriceUSDOrTHB * item.quantity;

      // Convert to selected display currency
      const costConverted = convertValue(costNative, nativeCurrency, displayCurrency);
      const valueConverted = convertValue(valueNative, nativeCurrency, displayCurrency);

      totalCost += costConverted;
      totalValue += valueConverted;
    });

    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    return {
      totalCost,
      totalValue,
      pnl,
      pnlPercent
    };
  };

  const totals = calculatePortfolioTotals();

  // Helper formatting numbers
  const formatVal = (val: number, currency: 'USD' | 'THB') => {
    return new Intl.NumberFormat(lang === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col gap-6">
      {/* Header & Display Currency Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-yellow-400" />
          <span>{t.myPortfolio}</span>
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Display Currency Toggle */}
          <div className="flex bg-gray-900/60 p-1 rounded-xl border border-gray-800/80 text-xs items-center">
            <span className="text-[10px] text-gray-500 font-semibold px-2 uppercase">{t.displayCurrency}</span>
            <button
              onClick={() => setDisplayCurrency('THB')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                displayCurrency === 'THB'
                  ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              THB
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                displayCurrency === 'USD'
                  ? 'bg-yellow-400 text-black shadow-md shadow-yellow-400/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              USD
            </button>
          </div>

          <button
            onClick={fetchAllPrices}
            disabled={loadingPrices || portfolio.length === 0}
            className="p-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPrices ? 'animate-spin' : ''}`} />
            {loadingPrices ? t.syncing : t.syncPrices}
          </button>
        </div>
      </div>

      {/* Portfolio Value Summary Stats */}
      {portfolio.length > 0 && (
        <div className="p-5 bg-gray-950/40 border border-gray-900 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t.overallPnl} ({displayCurrency})</span>
            <span className="text-2xl font-black text-white mt-1">
              {formatVal(totals.totalValue, displayCurrency)}
            </span>
            <span className="text-[10px] text-gray-600 mt-0.5">
              {t.exchangeRate}
            </span>
          </div>
          
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-xs text-gray-500 font-semibold uppercase">{t.allTimePnl}</span>
            <div className="flex items-center gap-1.5 mt-1">
              {totals.pnl >= 0 ? (
                <span className="flex items-center text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/10">
                  <TrendingUp className="w-3.5 h-3.5 mr-1 animate-bounce" />
                  +{formatVal(totals.pnl, displayCurrency)} (+{totals.pnlPercent.toFixed(2)}%)
                </span>
              ) : (
                <span className="flex items-center text-sm font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/10">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {formatVal(totals.pnl, displayCurrency)} ({totals.pnlPercent.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Form */}
      <form onSubmit={handleAddStock} className="flex flex-col gap-4 bg-gray-950/50 p-4 rounded-xl border border-gray-900">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t.addNewHolding}</span>
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Ticker input with Autocomplete */}
          <div ref={autocompleteRef} className="md:col-span-3 relative">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => handleTickerChange(e.target.value)}
              onFocus={() => ticker && suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={t.tickerPlaceholder}
              className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none placeholder-gray-600"
              autoComplete="off"
            />
            {/* Autocomplete Dropdown */}
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
                        <span className="font-bold text-white">{item.ticker}</span>
                        <span className="text-[10px] text-gray-500 line-clamp-1">{item.name}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-400 rounded font-bold uppercase">
                        {item.market}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quantity */}
          <div className="md:col-span-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">{t.sharesPlaceholder}</label>
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 10"
              className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none placeholder-gray-600"
            />
          </div>

          {/* Average price */}
          <div className="md:col-span-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">{t.avgPricePlaceholder}</label>
            <input
              type="number"
              step="any"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              placeholder="e.g. 150"
              className="w-full bg-gray-950 border border-gray-800 focus:border-yellow-400/50 rounded-lg px-3 py-2 text-sm text-gray-200 outline-none placeholder-gray-600"
            />
          </div>

          {/* Input Currency Toggle */}
          <div className="md:col-span-2">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">{t.inputCurrency}</label>
            <div className="flex bg-gray-950 border border-gray-800 rounded-lg p-0.5 h-[38px] items-center">
              <button
                type="button"
                onClick={() => setInputCurrency('THB')}
                className={`flex-1 h-full text-xs font-bold rounded-md transition-all ${
                  inputCurrency === 'THB' ? 'bg-gray-800 text-yellow-400' : 'text-gray-500'
                }`}
              >
                THB
              </button>
              <button
                type="button"
                onClick={() => setInputCurrency('USD')}
                className={`flex-1 h-full text-xs font-bold rounded-md transition-all ${
                  inputCurrency === 'USD' ? 'bg-gray-800 text-yellow-400' : 'text-gray-500'
                }`}
              >
                USD
              </button>
            </div>
          </div>

          {/* Market selector & Submit button */}
          <div className="md:col-span-3 flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Market</label>
              <select
                value={market}
                onChange={(e) => handleMarketChange(e.target.value as 'US' | 'TH')}
                className="w-full bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg px-2 h-[38px] outline-none cursor-pointer"
              >
                <option value="US">{t.usMarket}</option>
                <option value="TH">{t.thMarket}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loadingPrices}
              className="w-16 btn-neon-gold text-black rounded-lg h-[38px] flex items-center justify-center gap-1 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <span className="text-xs text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            {errorMessage}
          </span>
        )}
      </form>

      {/* Holdings List */}
      <div className="flex-1 max-h-[350px] overflow-y-auto no-scrollbar space-y-2.5">
        {portfolio.length === 0 ? (
          <div className="h-32 border border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
            <Briefcase className="w-6 h-6 stroke-1 text-gray-600" />
            <span className="text-xs px-4 text-center">{t.emptyPortfolio}</span>
          </div>
        ) : (
          <AnimatePresence>
            {portfolio.map((item) => {
              const livePriceNative = prices[item.ticker]?.price || item.purchasePrice;
              const name = prices[item.ticker]?.name || item.name;
              
              const itemNativeCurrency = item.market === 'US' ? 'USD' : 'THB';
              
              // Value & Cost converted to current global DISPLAY currency
              const purchaseCostConverted = convertValue(item.purchasePrice * item.quantity, itemNativeCurrency, displayCurrency);
              const currentValueConverted = convertValue(livePriceNative * item.quantity, itemNativeCurrency, displayCurrency);
              
              const pnl = currentValueConverted - purchaseCostConverted;
              const pnlPercent = purchaseCostConverted > 0 ? (pnl / purchaseCostConverted) * 100 : 0;
              const isProfit = pnl >= 0;

              // Helper for showing hover info of input currency if different
              const displayPurchasePriceConverted = convertValue(item.purchasePrice, itemNativeCurrency, displayCurrency);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    const fullSymbol = item.market === 'TH' ? `${item.ticker}.BK` : item.ticker;
                    onSelectStock(fullSymbol);
                  }}
                  className="p-4 bg-gray-950/20 border border-gray-900 hover:border-gray-800 rounded-xl cursor-pointer flex items-center justify-between group transition-all duration-300"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white tracking-wide">{item.ticker}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-900 text-gray-500 rounded font-bold uppercase">
                        {item.market}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 line-clamp-1 max-w-[150px] sm:max-w-[220px]">
                      {name}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {item.quantity} {t.shares} @ {formatVal(displayPurchasePriceConverted, displayCurrency)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Value and P&L */}
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-white">
                        {formatVal(currentValueConverted, displayCurrency)}
                      </span>
                      <span className={`text-xs font-semibold flex items-center ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%
                      </span>
                    </div>

                    {/* Delete Action */}
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-2 bg-gray-950/50 hover:bg-rose-500/20 text-gray-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
