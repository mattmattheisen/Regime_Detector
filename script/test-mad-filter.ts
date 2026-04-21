import { buildClassification } from "../server/classifier";
import { filterPriceMap, filterPriceSeries, type PriceRow } from "../server/outlier-filter";
import { DEFAULT_TICKERS } from "../shared/schema";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeRows(days: number, start = 100, dailyReturn = 0.001): PriceRow[] {
  const rows: PriceRow[] = [];
  let close = start;
  for (let i = 0; i < days; i++) {
    const date = new Date("2024-01-01");
    date.setDate(date.getDate() + i);
    close = i === 0 ? start : close * Math.exp(dailyReturn);
    rows.push({ date: date.toISOString().split("T")[0], close });
  }
  return rows;
}

function testSingleBadTick() {
  const rows = makeRows(90);
  rows[55] = { ...rows[55], close: rows[55].close * 1.5 };
  const result = filterPriceSeries("SPY", rows, {
    enabled: true,
    verboseLogging: false,
    rollingWindow: 21,
    thresholdMultiplier: 6,
    madFloor: 0.0025,
    preservePersistentMoves: true,
    persistenceBars: 2,
  });

  assert(result.flags.length >= 1, "single bad tick should be flagged");
  assert(result.rows[55].close < rows[55].close * 0.9, "bad tick price should be reduced");
}

function testSustainedMove() {
  const rows = makeRows(90);
  rows[55] = { ...rows[55], close: rows[54].close * Math.exp(0.08) };
  rows[56] = { ...rows[56], close: rows[55].close * Math.exp(0.07) };
  rows[57] = { ...rows[57], close: rows[56].close * Math.exp(0.06) };
  for (let i = 58; i < rows.length; i++) {
    rows[i] = { ...rows[i], close: rows[i - 1].close * Math.exp(0.001) };
  }

  const result = filterPriceSeries("SPY", rows, {
    enabled: true,
    verboseLogging: false,
    rollingWindow: 21,
    thresholdMultiplier: 6,
    madFloor: 0.0025,
    preservePersistentMoves: true,
    persistenceBars: 2,
  });

  assert(result.flags.length === 0, "sustained same-direction move should not be filtered");
}

function testClassifierCompatibility() {
  const priceData = new Map<string, PriceRow[]>();
  Object.values(DEFAULT_TICKERS).forEach((ticker, index) => {
    priceData.set(ticker, makeRows(180, 80 + index * 10, 0.0005 + index * 0.0001));
  });

  const filtered = filterPriceMap(priceData, {
    enabled: true,
    verboseLogging: false,
    rollingWindow: 21,
    thresholdMultiplier: 6,
    madFloor: 0.0025,
    preservePersistentMoves: true,
    persistenceBars: 2,
  }).priceData;

  const classification = buildClassification(filtered, DEFAULT_TICKERS, "daily", null);
  const probabilitySum = classification.scores.reduce((sum, score) => sum + score.probability, 0);

  assert(classification.scores.length === 4, "classifier should return four state scores");
  assert(classification.scores.every((score) => Number.isFinite(score.score) && Number.isFinite(score.probability)), "scores should be finite");
  assert(Math.abs(probabilitySum - 1) < 0.000001, "probabilities should sum to 1");
}

testSingleBadTick();
testSustainedMove();
testClassifierCompatibility();

console.log("MAD/Hampel filter harness passed");