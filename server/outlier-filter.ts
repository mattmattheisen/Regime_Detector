export interface PriceRow {
  date: string;
  close: number;
}

export interface OutlierFilterConfig {
  enabled: boolean;
  verboseLogging: boolean;
  rollingWindow: number;
  thresholdMultiplier: number;
  madFloor: number;
  preservePersistentMoves: boolean;
  persistenceBars: number;
}

export interface OutlierFlag {
  symbol: string;
  date: string;
  originalPrice: number;
  filteredPrice: number;
  originalReturn: number;
  replacementReturn: number;
  rollingMedian: number;
  mad: number;
  robustSigma: number;
  threshold: number;
  reason: string;
}

export interface FilteredSeries {
  rows: PriceRow[];
  flags: OutlierFlag[];
  enabled: boolean;
}

const DEFAULT_CONFIG: OutlierFilterConfig = {
  enabled: true,
  verboseLogging: false,
  rollingWindow: 21,
  thresholdMultiplier: 6,
  madFloor: 0.0025,
  preservePersistentMoves: true,
  persistenceBars: 2,
};

function dataQualityLog(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [data-quality] ${message}`);
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return !["false", "0", "off", "no"].includes(value.toLowerCase());
}

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getOutlierFilterConfig(): OutlierFilterConfig {
  return {
    enabled: readBoolean(process.env.OUTLIER_FILTER_ENABLED, DEFAULT_CONFIG.enabled),
    verboseLogging: readBoolean(process.env.OUTLIER_FILTER_VERBOSE, DEFAULT_CONFIG.verboseLogging),
    rollingWindow: Math.max(5, Math.floor(readNumber(process.env.OUTLIER_FILTER_WINDOW, DEFAULT_CONFIG.rollingWindow))),
    thresholdMultiplier: Math.max(1, readNumber(process.env.OUTLIER_FILTER_THRESHOLD, DEFAULT_CONFIG.thresholdMultiplier)),
    madFloor: Math.max(0, readNumber(process.env.OUTLIER_FILTER_MAD_FLOOR, DEFAULT_CONFIG.madFloor)),
    preservePersistentMoves: DEFAULT_CONFIG.preservePersistentMoves,
    persistenceBars: DEFAULT_CONFIG.persistenceBars,
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function logReturns(rows: PriceRow[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1].close;
    const current = rows[i].close;
    returns.push(prev > 0 && current > 0 ? Math.log(current / prev) : 0);
  }
  return returns;
}

function hasPersistentSameDirection(
  index: number,
  candidates: boolean[],
  returns: number[],
  config: OutlierFilterConfig
): boolean {
  if (!config.preservePersistentMoves || !candidates[index]) return false;
  const direction = Math.sign(returns[index]);
  if (direction === 0) return false;

  let count = 1;
  for (let i = index - 1; i >= 0 && candidates[i] && Math.sign(returns[i]) === direction; i--) {
    count++;
  }
  for (let i = index + 1; i < candidates.length && candidates[i] && Math.sign(returns[i]) === direction; i++) {
    count++;
  }

  return count >= config.persistenceBars;
}

export function filterPriceSeries(
  symbol: string,
  rows: PriceRow[],
  config: OutlierFilterConfig = getOutlierFilterConfig()
): FilteredSeries {
  if (!config.enabled || rows.length < config.rollingWindow + 2) {
    return { rows, flags: [], enabled: config.enabled };
  }

  const returns = logReturns(rows);
  const replacementReturns = [...returns];
  const candidates = new Array(returns.length).fill(false);
  const stats = returns.map(() => ({
    rollingMedian: 0,
    mad: 0,
    robustSigma: 0,
    threshold: 0,
  }));

  for (let i = 0; i < returns.length; i++) {
    const start = Math.max(0, i - config.rollingWindow);
    const window = returns.slice(start, i);
    if (window.length < Math.min(10, config.rollingWindow)) continue;

    const rollingMedian = median(window);
    const deviations = window.map((value) => Math.abs(value - rollingMedian));
    const mad = median(deviations);
    const robustSigma = 1.4826 * mad;
    const threshold = config.thresholdMultiplier * Math.max(robustSigma, config.madFloor);
    const distance = Math.abs(returns[i] - rollingMedian);

    stats[i] = { rollingMedian, mad, robustSigma, threshold };
    candidates[i] = distance > threshold;
  }

  const filteredIndexes: number[] = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i] && !hasPersistentSameDirection(i, candidates, returns, config)) {
      replacementReturns[i] = stats[i].rollingMedian;
      filteredIndexes.push(i);
    }
  }

  if (filteredIndexes.length === 0) {
    return { rows, flags: [], enabled: true };
  }

  const filteredRows: PriceRow[] = [{ ...rows[0] }];
  for (let i = 0; i < replacementReturns.length; i++) {
    filteredRows.push({
      date: rows[i + 1].date,
      close: filteredRows[i].close * Math.exp(replacementReturns[i]),
    });
  }

  const flags = filteredIndexes.map((i) => {
    const s = stats[i];
    return {
      symbol,
      date: rows[i + 1].date,
      originalPrice: rows[i + 1].close,
      filteredPrice: filteredRows[i + 1].close,
      originalReturn: returns[i],
      replacementReturn: replacementReturns[i],
      rollingMedian: s.rollingMedian,
      mad: s.mad,
      robustSigma: s.robustSigma,
      threshold: s.threshold,
      reason: "isolated_return_outlier",
    };
  });

  if (config.verboseLogging) {
    for (const flag of flags) {
      dataQualityLog(`[OUTLIER_FILTER] ${JSON.stringify(flag)}`);
    }
  }

  return { rows: filteredRows, flags, enabled: true };
}

export function filterPriceMap(
  priceData: Map<string, PriceRow[]>,
  config: OutlierFilterConfig = getOutlierFilterConfig()
): { priceData: Map<string, PriceRow[]>; flags: OutlierFlag[] } {
  const filtered = new Map<string, PriceRow[]>();
  const allFlags: OutlierFlag[] = [];

  for (const [symbol, rows] of priceData.entries()) {
    const result = filterPriceSeries(symbol, rows, config);
    filtered.set(symbol, result.rows);
    allFlags.push(...result.flags);
  }

  if (config.enabled && allFlags.length > 0) {
    dataQualityLog(`[OUTLIER_FILTER] flagged ${allFlags.length} isolated return outlier(s)`);
  }

  return { priceData: filtered, flags: allFlags };
}