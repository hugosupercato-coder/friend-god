import { NextRequest, NextResponse } from 'next/server';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getCrumb() {
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
    return { cookie, crumb };
  } catch { return { cookie: '', crumb: '' }; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || 'AAPL').toUpperCase().trim();

  const { cookie, crumb } = await getCrumb();

  // Test 1: quoteSummary balance sheet raw fields
  const summaryUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=balanceSheetHistory,incomeStatementHistory,cashflowStatementHistory${crumb ? `&crumb=${encodeURIComponent(crumb)}` : ''}`;
  let summaryData: unknown = null;
  let summaryStatus = 0;
  try {
    const r = await fetch(summaryUrl, { headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'application/json' } });
    summaryStatus = r.status;
    summaryData = await r.json();
  } catch(e) { summaryData = String(e); }

  // Test 2: timeseries API
  const period1 = Math.floor(Date.now() / 1000) - 5 * 365 * 24 * 3600;
  const tsUrl = `https://query2.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${ticker}?type=annualTotalRevenue,annualNetIncome,annualOperatingCashFlow,annualFreeCashFlow,annualTotalAssets&period1=${period1}&period2=9999999999`;
  let tsData: unknown = null;
  let tsStatus = 0;
  try {
    const r = await fetch(tsUrl, { headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'application/json' } });
    tsStatus = r.status;
    const text = await r.text();
    tsData = { status: tsStatus, preview: text.slice(0, 1500) };
  } catch(e) { tsData = String(e); }

  // Extract balance sheet sample fields
  type YFSummary = { quoteSummary: { result: Array<{
    balanceSheetHistory?: { balanceSheetStatements?: Record<string, unknown>[] };
    incomeStatementHistory?: { incomeStatementHistory?: Record<string, unknown>[] };
    cashflowStatementHistory?: { cashflowStatements?: Record<string, unknown>[] };
  }> } };
  const parsed = summaryData as unknown as YFSummary;
  const bal = parsed?.quoteSummary?.result?.[0]?.balanceSheetHistory?.balanceSheetStatements?.[0];
  const inc = parsed?.quoteSummary?.result?.[0]?.incomeStatementHistory?.incomeStatementHistory?.[0];
  const cf  = parsed?.quoteSummary?.result?.[0]?.cashflowStatementHistory?.cashflowStatements?.[0];

  return NextResponse.json({
    ticker,
    crumb_ok: !!crumb,
    summary_status: summaryStatus,
    balance_sheet_sample_keys: bal ? Object.keys(bal) : [],
    income_stmt_sample_keys: inc ? Object.keys(inc) : [],
    cashflow_sample_keys: cf ? Object.keys(cf) : [],
    balance_sheet_sample_values: bal,
    timeseries_status: tsStatus,
    timeseries_data: tsData,
  });
}
