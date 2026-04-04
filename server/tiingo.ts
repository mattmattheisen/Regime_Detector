import { log } from "./index";

const TIINGO_BASE = "https://api.tiingo.com/tiingo/daily";
const REQUEST_DELAY_MS = 1500;
const MAX_RETRIES = 3;

interface TiingoBar {
  date: string;
  close: number;
  high: number;
  low: number;
  open: number;
  volume: number;
  adjClose: number;
  adjHigh: number;
  adjLow: number;
  adjOpen: number;
  adjVolume: number;
}

export interface PriceBar {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      log(`[DIAG] Fetching URL: ${url} (attempt ${attempt + 1})`, "tiingo");
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${process.env.TIINGO_API_KEY}`,
        },
      });
      log(`[DIAG] Tiingo response status: ${res.status}`, "tiingo");

      if (res.status === 429) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        log(`Rate limited (429). Backing off ${backoff}ms (attempt ${attempt + 1}/${retries})`, "tiingo");
        await sleep(backoff);
        continue;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Tiingo API error ${res.status}: ${text}`);
      }

      return res;
    } catch (err: any) {
      log(`[DIAG] Fetch error (attempt ${attempt + 1}): ${err.message} | code: ${err.code} | type: ${err.constructor?.name}`, "tiingo");
      if (attempt === retries) throw err;
      const backoff = Math.pow(2, attempt) * 1000;
      log(`Request failed: ${err.message}. Retrying in ${backoff}ms`, "tiingo");
      await sleep(backoff);
    }
  }
  throw new Error("Max retries exceeded");
}

export async function fetchTickerPrices(
  ticker: string,
  startDate: string,
  endDate: string
): Promise<PriceBar[]> {
  const url = `${TIINGO_BASE}/${ticker}/prices?startDate=${startDate}&endDate=${endDate}&format=json&resampleFreq=daily`;

  log(`Fetching ${ticker} from ${startDate} to ${endDate}`, "tiingo");

  const res = await fetchWithRetry(url);
  const data: TiingoBar[] = await res.json();

  return data.map((bar) => ({
    ticker: ticker.toUpperCase(),
    date: bar.date.split("T")[0],
    open: bar.adjOpen,
    high: bar.adjHigh,
    low: bar.adjLow,
    close: bar.adjClose,
    volume: bar.adjVolume,
  }));
}

export async function fetchAllTickers(
  tickers: { ticker: string; startDate: string }[],
  endDate: string
): Promise<Map<string, PriceBar[]>> {
  const results = new Map<string, PriceBar[]>();

  for (let i = 0; i < tickers.length; i++) {
    const { ticker, startDate } = tickers[i];

    try {
      const bars = await fetchTickerPrices(ticker, startDate, endDate);
      results.set(ticker.toUpperCase(), bars);
      log(`Fetched ${bars.length} bars for ${ticker}`, "tiingo");
    } catch (err: any) {
      log(`Failed to fetch ${ticker}: ${err.message}`, "tiingo");
      results.set(ticker.toUpperCase(), []);
    }

    if (i < tickers.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return results;
}
