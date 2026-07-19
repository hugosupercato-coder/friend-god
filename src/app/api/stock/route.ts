import { NextRequest, NextResponse } from 'next/server';
import { calculatePivotPoints, findSwingLevels, generateTechnicalRecommendation } from '@/utils/formulas';
import { StockData, HistoricalDataPoint } from '@/utils/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let ticker = searchParams.get('ticker');

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    ticker = ticker.toUpperCase().trim();
    // Automatically determine market based on ticker
    const isThai = ticker.endsWith('.BK') || ticker.includes(':') || /^[A-Z0-9]+$/.test(ticker) && false; // We default to TH for BK
    const market = ticker.endsWith('.BK') ? 'TH' : 'US';

    // Yahoo Finance API URL - 6 months history to have ample data for EMA 50, MACD, and Swing Levels
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=6mo`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Cache results for 60 seconds
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch data from Yahoo Finance: ${response.statusText}` }, { status: response.status });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: 'No stock data found for ticker' }, { status: 404 });
    }

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];
    
    if (!quote || timestamps.length === 0) {
      return NextResponse.json({ error: 'Stock data has empty indicators or history' }, { status: 404 });
    }

    // Clean and rebuild historical data array
    const history: HistoricalDataPoint[] = [];
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const closes = quote.close || [];
    const volumes = quote.volume || [];

    for (let i = 0; i < timestamps.length; i++) {
      // Filter out days where values are null (e.g. holidays, bad data)
      if (
        opens[i] !== null &&
        highs[i] !== null &&
        lows[i] !== null &&
        closes[i] !== null &&
        opens[i] !== undefined &&
        highs[i] !== undefined &&
        lows[i] !== undefined &&
        closes[i] !== undefined
      ) {
        history.push({
          timestamp: timestamps[i],
          open: opens[i],
          high: highs[i],
          low: lows[i],
          close: closes[i],
          volume: volumes[i] || 0
        });
      }
    }

    if (history.length === 0) {
      return NextResponse.json({ error: 'No valid historical data points found after cleaning' }, { status: 404 });
    }

    const latestPoint = history[history.length - 1];
    const currentPrice = meta.regularMarketPrice || latestPoint.close;
    const previousClose = meta.chartPreviousClose || (history.length > 1 ? history[history.length - 2].close : latestPoint.close);
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Get overall High/Low/Open for current day
    const high = meta.regularMarketDayHigh || latestPoint.high;
    const low = meta.regularMarketDayLow || latestPoint.low;
    const open = meta.regularMarketDayOpen || latestPoint.open;

    // Calculate Pivot Points
    const pivotPoints = calculatePivotPoints(high, low, currentPrice);

    // Calculate Swing Support/Resistance levels (window size 4 for daily chart)
    const { supports, resistances } = findSwingLevels(history, 4);

    // Generate recommendations and other indicators
    const technical = generateTechnicalRecommendation(currentPrice, history, supports, resistances);

    // Format display name
    let displayName = ticker;
    if (market === 'TH') {
      displayName = ticker.replace('.BK', '');
    }

    const stockData: StockData = {
      ticker: displayName,
      name: meta.longName || displayName,
      market,
      price: currentPrice,
      currency: meta.currency || (market === 'TH' ? 'THB' : 'USD'),
      change,
      changePercent,
      high,
      low,
      open,
      previousClose,
      history,
      supportLevels: supports,
      resistanceLevels: resistances,
      pivotPoints,
      technicalSignals: technical
    };

    return NextResponse.json(stockData);
  } catch (error: any) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
