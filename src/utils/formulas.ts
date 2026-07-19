import { HistoricalDataPoint } from './types';

// Calculate Classic Pivot Points
export function calculatePivotPoints(high: number, low: number, close: number) {
  const pivot = (high + low + close) / 3;
  
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);

  return { pivot, s1, s2, s3, r1, r2, r3 };
}

// Find key Support and Resistance levels from historical data (Swing Highs and Lows)
export function findSwingLevels(history: HistoricalDataPoint[], window = 3) {
  const supports: number[] = [];
  const resistances: number[] = [];

  if (history.length < window * 2 + 1) {
    return { supports, resistances };
  }

  for (let i = window; i < history.length - window; i++) {
    const currentLow = history[i].low;
    const currentHigh = history[i].high;
    
    let isSwingLow = true;
    let isSwingHigh = true;

    for (let j = 1; j <= window; j++) {
      if (history[i - j].low < currentLow || history[i + j].low < currentLow) {
        isSwingLow = false;
      }
      if (history[i - j].high > currentHigh || history[i + j].high > currentHigh) {
        isSwingHigh = false;
      }
    }

    if (isSwingLow) {
      supports.push(currentLow);
    }
    if (isSwingHigh) {
      resistances.push(currentHigh);
    }
  }

  // Deduplicate and group S/R levels that are very close (within 1% of each other)
  const filterAndCluster = (levels: number[], type: 'support' | 'resistance') => {
    if (levels.length === 0) return [];
    
    // Sort
    levels.sort((a, b) => a - b);
    
    const clustered: number[] = [];
    let currentCluster = [levels[0]];

    for (let i = 1; i < levels.length; i++) {
      const lastVal = currentCluster[currentCluster.length - 1];
      const percentDiff = Math.abs(levels[i] - lastVal) / lastVal;
      
      if (percentDiff < 0.012) {
        currentCluster.push(levels[i]);
      } else {
        // Average the cluster
        const avg = currentCluster.reduce((sum, v) => sum + v, 0) / currentCluster.length;
        clustered.push(avg);
        currentCluster = [levels[i]];
      }
    }
    // Add last cluster
    const avg = currentCluster.reduce((sum, v) => sum + v, 0) / currentCluster.length;
    clustered.push(avg);

    // If resistance, sort descending. If support, sort descending too, but keep closest to current price first.
    return clustered;
  };

  return {
    supports: filterAndCluster(supports, 'support'),
    resistances: filterAndCluster(resistances, 'resistance')
  };
}

// Calculate Relative Strength Index (RSI 14)
export function calculateRSI(prices: number[], period = 14): number {
  if (prices.length <= period) return 50; // Default fallback

  let gains = 0;
  let losses = 0;

  // First RSI value
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Subsequent values using Wilder's smoothing
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Calculate Exponential Moving Average (EMA)
export function calculateEMA(prices: number[], period: number): number[] {
  const emaValues: number[] = [];
  if (prices.length < period) return Array(prices.length).fill(prices[prices.length - 1] || 0);

  const k = 2 / (period + 1);
  
  // Start with SMA as first EMA value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let currentEma = sum / period;
  
  // Fill initial points with SMA or fallback
  for (let i = 0; i < period - 1; i++) {
    emaValues.push(prices[i]);
  }
  emaValues.push(currentEma);

  for (let i = period; i < prices.length; i++) {
    currentEma = prices[i] * k + currentEma * (1 - k);
    emaValues.push(currentEma);
  }

  return emaValues;
}

// Calculate MACD
export function calculateMACD(prices: number[]) {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  
  const signalLine = calculateEMA(macdLine, 9);
  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  const len = prices.length - 1;
  return {
    macd: macdLine[len] || 0,
    signal: signalLine[len] || 0,
    histogram: histogram[len] || 0
  };
}

// Determine technical buy/sell recommendation score and details
export function generateTechnicalRecommendation(
  currentPrice: number,
  history: HistoricalDataPoint[],
  supports: number[],
  resistances: number[]
) {
  const closePrices = history.map(h => h.close);
  const rsi = calculateRSI(closePrices);
  const macd = calculateMACD(closePrices);
  
  const ema20Arr = calculateEMA(closePrices, 20);
  const ema50Arr = calculateEMA(closePrices, 50);
  
  const ema20 = ema20Arr[ema20Arr.length - 1] || currentPrice;
  const ema50 = ema50Arr[ema50Arr.length - 1] || currentPrice;

  let score = 0;
  const reasons: string[] = [];

  // 1. RSI Scoring (Max 25 pts)
  if (rsi <= 30) {
    score += 25;
    reasons.push(`RSI is oversold (${rsi.toFixed(1)}) indicating high bounce potential`);
  } else if (rsi < 45) {
    score += 18;
    reasons.push(`RSI is in accumulation zone (${rsi.toFixed(1)})`);
  } else if (rsi <= 60) {
    score += 10;
    reasons.push(`RSI is neutral (${rsi.toFixed(1)})`);
  } else if (rsi > 70) {
    score += 0;
    reasons.push(`RSI is overbought (${rsi.toFixed(1)}), risk of correction`);
  } else {
    score += 5;
  }

  // 2. MACD Scoring (Max 25 pts)
  if (macd.histogram > 0) {
    score += 15;
    reasons.push('MACD is positive/bullish');
    if (macd.macd < 0) {
      score += 10;
      reasons.push('MACD histogram is rising from below zero (reversal pattern)');
    }
  } else {
    if (macd.histogram > (history.length > 2 ? calculateMACD(closePrices.slice(0, -1)).histogram : -1)) {
      score += 8;
      reasons.push('MACD bearish momentum is weakening');
    } else {
      reasons.push('MACD is in a bearish/sell momentum');
    }
  }

  // 3. EMA/Trend Scoring (Max 25 pts)
  if (currentPrice > ema20 && ema20 > ema50) {
    score += 25;
    reasons.push('Stock is in a strong uptrend (Price > EMA20 > EMA50)');
  } else if (currentPrice > ema50) {
    score += 15;
    reasons.push('Price is trading above 50-day EMA (medium-term support)');
  } else if (currentPrice < ema50 && currentPrice > ema20) {
    score += 10;
    reasons.push('Price is reclaiming short-term EMA20 (potential trend shift)');
  } else {
    reasons.push('Price is in a downtrend (Price < EMA20 < EMA50)');
  }

  // 4. Support Proximity (Max 25 pts)
  // Find closest support level below current price
  const supportsBelow = supports.filter(s => s < currentPrice).sort((a, b) => b - a); // Closest first
  
  if (supportsBelow.length > 0) {
    const closestSupport = supportsBelow[0];
    const distanceToSupport = (currentPrice - closestSupport) / closestSupport;
    
    if (distanceToSupport <= 0.02) {
      score += 25;
      reasons.push(`Price is resting near major support at ${closestSupport.toFixed(2)} (within 2% deviation)`);
    } else if (distanceToSupport <= 0.05) {
      score += 15;
      reasons.push(`Price is pulling back close to support at ${closestSupport.toFixed(2)} (within 5% deviation)`);
    } else {
      reasons.push('Price is hovering mid-range, far from support entry points');
    }
  } else {
    // If no support below (all-time low or similar), check if close to pivot support
    reasons.push('No historical support level detected below current price');
  }

  // Determine Rating
  let rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Avoid' = 'Hold';
  if (score >= 75) rating = 'Strong Buy';
  else if (score >= 55) rating = 'Buy';
  else if (score >= 35) rating = 'Hold';
  else rating = 'Avoid';

  return {
    rsi,
    macd,
    ema20,
    ema50,
    score,
    rating,
    reasons
  };
}
