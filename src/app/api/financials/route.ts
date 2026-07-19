import { NextRequest, NextResponse } from 'next/server';
import { FinancialData, FinancialPeriod, BalanceSheetPeriod, CashFlowPeriod } from '@/utils/types';

// ─── Crumb cache ─────────────────────────────────────────────────────────────
let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (crumbCache && Date.now() < crumbCache.expiresAt) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }
  try {
    const r1 = await fetch('https://fc.yahoo.com', { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const parts: string[] = [];
    r1.headers.forEach((val, key) => {
      if (key.toLowerCase() === 'set-cookie') parts.push(val.split(';')[0]);
    });
    const cookie = parts.join('; ');
    const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    const crumb = (await r2.text()).trim();
    if (crumb && crumb.length < 100 && crumb !== 'Unauthorized') {
      crumbCache = { crumb, cookie, expiresAt: Date.now() + 3_600_000 };
      return { crumb, cookie };
    }
  } catch { /* ignore */ }
  return { crumb: '', cookie: '' };
}

const rawVal = (obj: Record<string, unknown> | undefined, key: string): number | null => {
  const v = (obj?.[key] as { raw?: number } | undefined)?.raw;
  return v !== undefined && v !== null ? v : null;
};

const yearOf = (obj: Record<string, unknown>): string => {
  const ts = (obj['endDate'] as { raw?: number } | undefined)?.raw;
  return ts ? new Date(ts * 1000).getFullYear().toString() : '';
};

// ─── Yahoo Finance quoteSummary ──────────────────────────────────────────────
async function fetchQuoteSummary(ticker: string, crumb: string, cookie: string) {
  const modules = 'defaultKeyStatistics,financialData,summaryDetail,price,incomeStatementHistory';
  for (const host of ['query2', 'query1']) {
    try {
      const url = `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}${crumb ? `&crumb=${encodeURIComponent(crumb)}` : ''}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json', Cookie: cookie },
        next: { revalidate: 300 },
      });
      if (!res.ok) continue;
      const data = await res.json();
      const r = data?.quoteSummary?.result?.[0];
      if (r) return r as Record<string, Record<string, unknown>>;
    } catch { continue; }
  }
  return null;
}

// ─── v7/quote fallback ────────────────────────────────────────────────────────
async function fetchV7Quote(ticker: string): Promise<Record<string, number | null>> {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const q = data?.quoteResponse?.result?.[0] ?? {};
    return {
      trailingPE: q.trailingPE ?? null,
      forwardPE: q.forwardPE ?? null,
      priceToBook: q.priceToBook ?? null,
      eps: q.epsTrailingTwelveMonths ?? null,
      dividendYield: q.trailingAnnualDividendYield ?? null,
      beta: q.beta ?? null,
      marketCap: q.marketCap ?? null,
      returnOnEquity: q.returnOnEquity ?? null,
    };
  } catch { return {}; }
}

// ─── SEC EDGAR: ticker → CIK ─────────────────────────────────────────────────
let cikMap: Record<string, string> | null = null;
let cikMapFetchedAt = 0;

async function getCIK(ticker: string): Promise<string | null> {
  const now = Date.now();
  // Cache CIK map for 1 day
  if (!cikMap || now - cikMapFetchedAt > 86_400_000) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'friend-god-app/1.0 contact@example.com' },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = await res.json() as Record<string, { cik_str: number; ticker: string; title: string }>;
        cikMap = {};
        for (const item of Object.values(data)) {
          cikMap[item.ticker.toUpperCase()] = String(item.cik_str);
        }
        cikMapFetchedAt = now;
      }
    } catch { /* ignore */ }
  }
  return cikMap?.[ticker.toUpperCase()] ?? null;
}

// ─── SEC EDGAR XBRL: parse financial facts ───────────────────────────────────
type XbrlUnit = { end: string; val: number; form: string; frame?: string; filed: string };

function pickAnnualFacts(units: XbrlUnit[] | undefined, limit = 4): { year: string; val: number }[] {
  if (!units) return [];
  // Filter to 10-K annual reports, get most recent 4 unique fiscal years
  const annual = units.filter(u => u.form === '10-K');
  const seen = new Set<string>();
  const result: { year: string; val: number }[] = [];
  // Sort newest first
  annual.sort((a, b) => b.end.localeCompare(a.end));
  for (const u of annual) {
    const year = u.end.slice(0, 4);
    if (!seen.has(year)) {
      seen.add(year);
      result.push({ year, val: u.val });
    }
    if (result.length >= limit) break;
  }
  return result;
}

async function fetchEdgarFinancials(cik: string): Promise<{
  balanceSheet: BalanceSheetPeriod[];
  cashFlow: CashFlowPeriod[];
} | null> {
  try {
    const cikPadded = cik.padStart(10, '0');
    const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cikPadded}.json`, {
      headers: { 'User-Agent': 'friend-god-app/1.0 contact@example.com', Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      facts: {
        'us-gaap': Record<string, { units: { USD?: XbrlUnit[] } }>;
      };
    };

    const gaap = data?.facts?.['us-gaap'];
    if (!gaap) return null;

    // Helper: pick the first available concept
    const pick = (concepts: string[]) => {
      for (const c of concepts) {
        const units = gaap[c]?.units?.USD;
        if (units?.length) return units;
      }
      return undefined;
    };

    // Balance Sheet concepts
    const totalAssetsUnits     = pick(['Assets']);
    const totalLiabUnits       = pick(['Liabilities', 'LiabilitiesAndStockholdersEquity']);
    const equityUnits          = pick(['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest']);
    const longTermDebtUnits    = pick(['LongTermDebt', 'LongTermDebtNoncurrent', 'LongTermNotesPayable']);
    const cashUnits            = pick(['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsAndShortTermInvestments', 'Cash']);

    // Cash Flow concepts
    const opCFUnits            = pick(['NetCashProvidedByUsedInOperatingActivities']);
    const capExUnits           = pick(['PaymentsToAcquirePropertyPlantAndEquipment', 'CapitalExpenditures']);
    const investingCFUnits     = pick(['NetCashProvidedByUsedInInvestingActivities']);
    const freeCFUnits          = pick(['FreeCapitalDistributed']); // may not exist, compute from opCF - capEx

    // Gather annual data for all concepts
    const totalAssets    = pickAnnualFacts(totalAssetsUnits);
    const totalLiab      = pickAnnualFacts(totalLiabUnits);
    const equity         = pickAnnualFacts(equityUnits);
    const longTermDebt   = pickAnnualFacts(longTermDebtUnits);
    const cash           = pickAnnualFacts(cashUnits);
    const opCF           = pickAnnualFacts(opCFUnits);
    const capEx          = pickAnnualFacts(capExUnits);
    const investingCF    = pickAnnualFacts(investingCFUnits);
    const freeCF         = pickAnnualFacts(freeCFUnits);

    // Build year-indexed maps
    const toMap = (arr: { year: string; val: number }[]) =>
      new Map(arr.map(e => [e.year, e.val]));

    const assetsMap    = toMap(totalAssets);
    const liabMap      = toMap(totalLiab);
    const equityMap    = toMap(equity);
    const debtMap      = toMap(longTermDebt);
    const cashMap      = toMap(cash);
    const opCFMap      = toMap(opCF);
    const capExMap     = toMap(capEx);
    const investMap    = toMap(investingCF);
    const freeCFMap    = toMap(freeCF);

    // Get union of years (up to 4 most recent)
    const allYears = Array.from(
      new Set([...assetsMap.keys(), ...opCFMap.keys()])
    ).sort((a, b) => b.localeCompare(a)).slice(0, 4);

    const balanceSheet: BalanceSheetPeriod[] = allYears.map(year => ({
      date: year,
      totalAssets:      assetsMap.get(year) ?? null,
      totalLiabilities: liabMap.get(year) ?? null,
      totalEquity:      equityMap.get(year) ?? null,
      totalDebt:        debtMap.get(year) ?? null,
      cash:             cashMap.get(year) ?? null,
    }));

    const cashFlow: CashFlowPeriod[] = allYears.map(year => {
      const ocf  = opCFMap.get(year) ?? null;
      const capx = capExMap.get(year) ?? null;
      // Free cash flow = operating CF - capEx (capEx in XBRL is usually positive outflow)
      const fcf  = freeCFMap.get(year) ?? (ocf !== null && capx !== null ? ocf - capx : null);
      return {
        date:               year,
        operatingCashFlow:  ocf,
        freeCashFlow:       fcf,
        capitalExpenditures: capx !== null ? -capx : null, // show as negative (outflow)
        investingCashFlow:  investMap.get(year) ?? null,
      };
    });

    return { balanceSheet, cashFlow };
  } catch {
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let ticker = searchParams.get('ticker');
  if (!ticker) return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });

  ticker = ticker.toUpperCase().trim();
  const market = ticker.endsWith('.BK') ? 'TH' : 'US';
  const displayTicker = ticker.replace('.BK', '');

  const { crumb, cookie } = await getYahooCrumb();

  // Fetch in parallel
  const [summary, v7, cik] = await Promise.all([
    fetchQuoteSummary(ticker, crumb, cookie),
    fetchV7Quote(ticker),
    market === 'US' ? getCIK(displayTicker) : Promise.resolve(null),
  ]);

  // SEC EDGAR (US only) — fetch separately after we have CIK
  let edgarData: { balanceSheet: BalanceSheetPeriod[]; cashFlow: CashFlowPeriod[] } | null = null;
  if (cik) {
    edgarData = await fetchEdgarFinancials(cik);
  }

  // ── Key metrics ─────────────────────────────────────────────────────────────
  const stats  = (summary?.['defaultKeyStatistics'] ?? {}) as Record<string, unknown>;
  const fin    = (summary?.['financialData']         ?? {}) as Record<string, unknown>;
  const sumDet = (summary?.['summaryDetail']         ?? {}) as Record<string, unknown>;
  const priceD = (summary?.['price']                 ?? {}) as Record<string, unknown>;

  const peRatio     = rawVal(sumDet, 'trailingPE') ?? rawVal(stats, 'forwardPE') ?? (v7.trailingPE ?? null);
  const pbRatio     = rawVal(stats, 'priceToBook') ?? (v7.priceToBook ?? null);
  const roe         = rawVal(fin,   'returnOnEquity') ?? (v7.returnOnEquity ?? null);
  const beta        = rawVal(stats, 'beta') ?? (v7.beta ?? null);
  const marketCap   = rawVal(sumDet, 'marketCap') ?? (v7.marketCap ?? null);
  const eps         = rawVal(stats, 'trailingEps') ?? (v7.eps ?? null);
  const dividendYield = rawVal(sumDet, 'dividendYield') ?? (v7.dividendYield ?? null);
  const name        = (priceD['longName'] as string) || (priceD['shortName'] as string) || displayTicker;
  const currency    = (priceD['currency'] as string) || (market === 'TH' ? 'THB' : 'USD');

  // ── Income Statement (Yahoo Finance quoteSummary — works well) ───────────────
  const incHistory = (summary?.['incomeStatementHistory'] as
    { incomeStatementHistory?: Record<string, unknown>[] } | undefined
  )?.incomeStatementHistory ?? [];

  const incomeStatement: FinancialPeriod[] = incHistory.slice(0, 4).map((p) => ({
    date:            yearOf(p),
    revenue:         rawVal(p, 'totalRevenue'),
    grossProfit:     rawVal(p, 'grossProfit'),
    operatingIncome: rawVal(p, 'operatingIncome') ?? rawVal(p, 'ebit'),
    netIncome:       rawVal(p, 'netIncome') ?? rawVal(p, 'netIncomeFromContinuingOps'),
    ebitda:          rawVal(p, 'ebitda'),
  }));

  // ── Balance Sheet & Cash Flow ────────────────────────────────────────────────
  // US stocks → SEC EDGAR (official, free, complete)
  // TH stocks → empty (Yahoo Finance doesn't provide it)
  const balanceSheet: BalanceSheetPeriod[] = edgarData?.balanceSheet ?? [];
  const cashFlow: CashFlowPeriod[] = edgarData?.cashFlow ?? [];

  const financialData: FinancialData = {
    ticker: displayTicker,
    name,
    market,
    currency,
    peRatio,
    pbRatio,
    roe,
    beta,
    marketCap,
    eps,
    dividendYield,
    incomeStatement,
    balanceSheet,
    cashFlow,
  };

  return NextResponse.json(financialData);
}
