export interface HistoricalDataPoint {
  timestamp: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  ticker: string;
  name: string;
  market: 'US' | 'TH';
  price: number;
  currency: string;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  history: HistoricalDataPoint[];
  supportLevels: number[];
  resistanceLevels: number[];
  pivotPoints: {
    pivot: number;
    s1: number;
    s2: number;
    s3: number;
    r1: number;
    r2: number;
    r3: number;
  };
  technicalSignals: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    ema20: number;
    ema50: number;
    score: number; // 0-100 technical rating
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid';
    reasons: string[];
  };
}

export interface PortfolioItem {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  market: 'US' | 'TH';
}

// ------ New Types ------

export interface RankedStock {
  ticker: string;
  displayTicker: string; // without .BK suffix
  name: string;
  market: 'US' | 'TH';
  price: number;
  change: number;
  changePercent: number;
  currency: string;
}

export interface WatchlistItem {
  ticker: string;       // full ticker e.g. AAPL or PTT.BK
  displayTicker: string; // short e.g. PTT
  name: string;
  market: 'US' | 'TH';
  addedAt: number;      // Unix timestamp
}

export interface FinancialPeriod {
  date: string;
  revenue: number | null;
  grossProfit: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
}

export interface BalanceSheetPeriod {
  date: string;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  totalDebt: number | null;
  cash: number | null;
}

export interface CashFlowPeriod {
  date: string;
  operatingCashFlow: number | null;
  freeCashFlow: number | null;
  capitalExpenditures: number | null;
  investingCashFlow: number | null;
}

export interface FinancialData {
  ticker: string;
  name: string;
  market: 'US' | 'TH';
  currency: string;
  peRatio: number | null;
  pbRatio: number | null;
  roe: number | null;
  beta: number | null;
  marketCap: number | null;
  eps: number | null;
  dividendYield: number | null;
  incomeStatement: FinancialPeriod[];
  balanceSheet: BalanceSheetPeriod[];
  cashFlow: CashFlowPeriod[];
}
