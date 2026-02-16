import type {
  MacroState,
  FeatureReadings,
  StateScore,
  ClassificationResult,
  StateHistoryEntry,
} from "@shared/schema";
import { MACRO_STATES } from "@shared/schema";

interface PriceRow {
  date: string;
  close: number;
}

type PriceMap = Map<string, PriceRow[]>;

function returns(prices: PriceRow[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    r.push((prices[i].close - prices[i - 1].close) / prices[i - 1].close);
  }
  return r;
}

function momentum(prices: PriceRow[], window: number): number {
  if (prices.length < window + 1) return 0;
  const recent = prices[prices.length - 1].close;
  const past = prices[prices.length - 1 - window].close;
  return (recent - past) / past;
}

function rollingStd(values: number[], window: number): number {
  if (values.length < window) return 0;
  const slice = values.slice(-window);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance);
}

function zScore(value: number, values: number[], window: number): number {
  if (values.length < window) return 0;
  const slice = values.slice(-window);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const std = rollingStd(slice, slice.length);
  if (std === 0) return 0;
  return (value - mean) / std;
}

function rollingCorrelation(x: number[], y: number[], window: number): number {
  if (x.length < window || y.length < window) return 0;
  const xSlice = x.slice(-window);
  const ySlice = y.slice(-window);
  const n = Math.min(xSlice.length, ySlice.length);
  if (n < 2) return 0;

  const xArr = xSlice.slice(0, n);
  const yArr = ySlice.slice(0, n);

  const xMean = xArr.reduce((a, b) => a + b, 0) / n;
  const yMean = yArr.reduce((a, b) => a + b, 0) / n;

  let cov = 0, xVar = 0, yVar = 0;
  for (let i = 0; i < n; i++) {
    const dx = xArr[i] - xMean;
    const dy = yArr[i] - yMean;
    cov += dx * dy;
    xVar += dx * dx;
    yVar += dy * dy;
  }

  const denom = Math.sqrt(xVar * yVar);
  if (denom === 0) return 0;
  return cov / denom;
}

function ratio(a: PriceRow[], b: PriceRow[]): PriceRow[] {
  const bMap = new Map(b.map((r) => [r.date, r.close]));
  return a
    .filter((r) => bMap.has(r.date))
    .map((r) => ({
      date: r.date,
      close: r.close / (bMap.get(r.date) || 1),
    }));
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

const LOOKBACK = 104;
const MOM_WINDOW = 12;
const SHORT_MOM = 4;
const CORR_WINDOW = 26;
const CORR_SHORT = 8;

export function computeFeatures(
  priceData: PriceMap,
  tickers: Record<string, string>
): FeatureReadings {
  const spy = priceData.get(tickers.equity) || [];
  const rsp = priceData.get(tickers.breadth) || [];
  const hyg = priceData.get(tickers.creditHigh) || [];
  const lqd = priceData.get(tickers.creditQuality) || [];
  const uup = priceData.get(tickers.usd) || [];
  const tlt = priceData.get(tickers.duration) || [];
  const dbc = priceData.get(tickers.commodities) || [];
  const vixy = priceData.get(tickers.vixProxy) || [];

  const vixLevels = vixy.map((r) => r.close);
  const vixLevel = vixLevels.length > 0 ? vixLevels[vixLevels.length - 1] : 0;
  const vixZScore = vixLevels.length >= LOOKBACK
    ? zScore(vixLevel, vixLevels, LOOKBACK)
    : 0;

  const spyReturns = returns(spy);
  const realizedVol = rollingStd(spyReturns, MOM_WINDOW);
  const rollingVols: number[] = [];
  for (let i = MOM_WINDOW; i <= spyReturns.length; i++) {
    rollingVols.push(rollingStd(spyReturns.slice(0, i), MOM_WINDOW));
  }
  const realizedVolZ = rollingVols.length >= LOOKBACK
    ? zScore(realizedVol, rollingVols, LOOKBACK)
    : 0;

  const creditRatioSeries = ratio(hyg, lqd);
  const creditRatioVal = creditRatioSeries.length > 0
    ? creditRatioSeries[creditRatioSeries.length - 1].close
    : 1;
  const creditMom = momentum(creditRatioSeries, SHORT_MOM);
  const creditLevels = creditRatioSeries.map((r) => r.close);
  const creditZ = creditLevels.length >= LOOKBACK
    ? zScore(creditRatioVal, creditLevels, LOOKBACK)
    : 0;

  const breadthRatioSeries = ratio(rsp, spy);
  const breadthRatioVal = breadthRatioSeries.length > 0
    ? breadthRatioSeries[breadthRatioSeries.length - 1].close
    : 1;
  const breadthMom = momentum(breadthRatioSeries, SHORT_MOM);
  const breadthLevels = breadthRatioSeries.map((r) => r.close);
  const breadthZ = breadthLevels.length >= LOOKBACK
    ? zScore(breadthRatioVal, breadthLevels, LOOKBACK)
    : 0;

  const tltMom = momentum(tlt, MOM_WINDOW);
  const dbcMom = momentum(dbc, MOM_WINDOW);

  const uupMom = momentum(uup, MOM_WINDOW);
  const uupLevels = uup.map((r) => r.close);
  const uupVal = uupLevels.length > 0 ? uupLevels[uupLevels.length - 1] : 0;
  const uupZ = uupLevels.length >= LOOKBACK
    ? zScore(uupVal, uupLevels, LOOKBACK)
    : 0;

  const tltReturns = returns(tlt);
  const minLen = Math.min(spyReturns.length, tltReturns.length);
  const spyRetAligned = spyReturns.slice(-minLen);
  const tltRetAligned = tltReturns.slice(-minLen);

  const corrLong = rollingCorrelation(spyRetAligned, tltRetAligned, CORR_WINDOW);
  const corrShort = rollingCorrelation(spyRetAligned, tltRetAligned, CORR_SHORT);
  const corrChange = corrShort - corrLong;

  const spyMom = momentum(spy, MOM_WINDOW);
  const spyMomValues: number[] = [];
  for (let i = MOM_WINDOW; i < spy.length; i++) {
    spyMomValues.push((spy[i].close - spy[i - MOM_WINDOW].close) / spy[i - MOM_WINDOW].close);
  }
  const spyTrendZ = spyMomValues.length >= LOOKBACK
    ? zScore(spyMom, spyMomValues, LOOKBACK)
    : 0;

  return {
    volatility: {
      vixProxyLevel: vixLevel,
      vixProxyZScore: vixZScore,
      realizedVolZScore: realizedVolZ,
    },
    credit: {
      creditRatio: creditRatioVal,
      creditMomentum: creditMom,
      creditZScore: creditZ,
    },
    breadth: {
      breadthRatio: breadthRatioVal,
      breadthMomentum: breadthMom,
      breadthZScore: breadthZ,
    },
    rates: {
      tltMomentum: tltMom,
      dbcMomentum: dbcMom,
    },
    usd: {
      uupMomentum: uupMom,
      uupZScore: uupZ,
    },
    correlation: {
      spyTltCorrelation: corrLong,
      correlationChange: corrChange,
    },
    equityTrend: {
      spyMomentum: spyMom,
      spyTrendZScore: spyTrendZ,
    },
  };
}

export function computeStateScores(features: FeatureReadings): StateScore[] {
  const f = features;

  const equityTrendScore =
    1.5 * f.equityTrend.spyTrendZScore +
    1.0 * f.breadth.breadthZScore +
    0.8 * f.breadth.breadthMomentum * 10 +
    -1.0 * f.volatility.vixProxyZScore +
    0.5 * f.credit.creditZScore +
    -0.5 * f.usd.uupZScore +
    -0.3 * f.correlation.correlationChange * 10;

  const volShockScore =
    1.5 * f.volatility.vixProxyZScore +
    1.0 * f.volatility.realizedVolZScore +
    -1.0 * f.credit.creditZScore +
    -0.8 * f.credit.creditMomentum * 10 +
    0.8 * f.correlation.correlationChange * 10 +
    -0.5 * f.equityTrend.spyTrendZScore +
    -0.3 * f.breadth.breadthZScore;

  const rateShockScore =
    -1.5 * f.rates.tltMomentum * 10 +
    1.0 * f.rates.dbcMomentum * 10 +
    0.5 * f.volatility.vixProxyZScore +
    -0.3 * f.equityTrend.spyTrendZScore;

  const liqSqueezeScore =
    1.5 * f.usd.uupZScore +
    1.0 * f.usd.uupMomentum * 10 +
    -1.0 * f.credit.creditZScore +
    -0.5 * f.credit.creditMomentum * 10 +
    0.5 * f.volatility.vixProxyZScore +
    -0.5 * f.breadth.breadthZScore +
    -0.3 * f.equityTrend.spyTrendZScore;

  const rawScores = [equityTrendScore, volShockScore, rateShockScore, liqSqueezeScore];
  const probabilities = softmax(rawScores);

  return MACRO_STATES.map((state, i) => ({
    state,
    score: rawScores[i],
    probability: probabilities[i],
  }));
}

const ENTRY_THRESHOLD = 0.55;
const EXIT_THRESHOLD = 0.45;

export function classifyWithHysteresis(
  scores: StateScore[],
  previousState: MacroState | null
): { state: MacroState; confidence: number } {
  const sorted = [...scores].sort((a, b) => b.probability - a.probability);
  const top = sorted[0];

  if (!previousState) {
    return { state: top.state, confidence: top.probability };
  }

  if (top.state === previousState) {
    return { state: top.state, confidence: top.probability };
  }

  const prevScore = scores.find((s) => s.state === previousState);
  if (prevScore && prevScore.probability >= EXIT_THRESHOLD) {
    return { state: previousState, confidence: prevScore.probability };
  }

  if (top.probability >= ENTRY_THRESHOLD) {
    return { state: top.state, confidence: top.probability };
  }

  return { state: previousState, confidence: prevScore?.probability || top.probability };
}

export function buildClassification(
  priceData: PriceMap,
  tickers: Record<string, string>,
  frequency: "weekly" | "daily",
  previousState: MacroState | null
): ClassificationResult {
  const features = computeFeatures(priceData, tickers);
  const scores = computeStateScores(features);
  const { state, confidence } = classifyWithHysteresis(scores, previousState);

  const sorted = [...scores].sort((a, b) => b.probability - a.probability);
  const runnerUp = sorted[0].state === state ? sorted[1] : sorted[0];

  const spy = priceData.get(tickers.equity) || [];
  const asOfDate = spy.length > 0 ? spy[spy.length - 1].date : new Date().toISOString().split("T")[0];

  return {
    currentState: state,
    confidence,
    runnerUp: runnerUp.state,
    runnerUpConfidence: runnerUp.probability,
    asOfDate,
    scores,
    features,
    frequency,
  };
}

export function buildHistory(
  priceData: PriceMap,
  tickers: Record<string, string>,
  frequency: "weekly" | "daily",
  maxPeriods: number = 80
): StateHistoryEntry[] {
  const spy = priceData.get(tickers.equity) || [];
  if (spy.length < 60) return [];

  const step = frequency === "weekly" ? 5 : 1;
  const history: StateHistoryEntry[] = [];
  let previousState: MacroState | null = null;

  const minDataPoints = LOOKBACK + MOM_WINDOW;
  const startIdx = Math.max(minDataPoints, spy.length - maxPeriods * step);

  for (let i = startIdx; i < spy.length; i += step) {
    const slicedData = new Map<string, { date: string; close: number }[]>();
    for (const [key, rows] of priceData.entries()) {
      const cutoffDate = spy[i].date;
      slicedData.set(key, rows.filter((r) => r.date <= cutoffDate));
    }

    const features = computeFeatures(slicedData, tickers);
    const scores = computeStateScores(features);
    const { state, confidence } = classifyWithHysteresis(scores, previousState);

    history.push({
      date: spy[i].date,
      state,
      confidence,
    });

    previousState = state;
  }

  return history;
}
