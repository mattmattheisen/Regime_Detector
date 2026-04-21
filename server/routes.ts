import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchAllTickers } from "./tiingo";
import { buildClassification, buildHistory } from "./classifier";
import { filterPriceMap, getOutlierFilterConfig } from "./outlier-filter";
import { DEFAULT_TICKERS } from "@shared/schema";
import type { TickerConfig, DashboardData } from "@shared/schema";
import { log } from "./index";

function getTickerList(config: TickerConfig): string[] {
  return Object.values(config).map((t) => t.toUpperCase());
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fiveYearsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return formatDate(d);
}

async function refreshData(config: TickerConfig): Promise<void> {
  const tickerList = getTickerList(config);
  const today = formatDate(new Date());
  const defaultStart = fiveYearsAgo();

  const fetchRequests: { ticker: string; startDate: string }[] = [];

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const todayDate = new Date();
  const lastTradingDay = new Date(todayDate);
  while (isWeekend(lastTradingDay)) {
    lastTradingDay.setDate(lastTradingDay.getDate() - 1);
  }
  const lastTradingDayStr = formatDate(lastTradingDay);

  for (const ticker of tickerList) {
    const lastDate = await storage.getLastFetchedDate(ticker);
    if (lastDate) {
      if (lastDate >= lastTradingDayStr) {
        log(`${ticker} already up to date (${lastDate})`, "refresh");
        continue;
      }
      const nextDay = new Date(lastDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const startDate = formatDate(nextDay);
      if (startDate <= today) {
        fetchRequests.push({ ticker, startDate });
      }
    } else {
      fetchRequests.push({ ticker, startDate: defaultStart });
    }
  }

  if (fetchRequests.length === 0) {
    log("All tickers up to date, no fetch needed", "refresh");
    return;
  }

  log(`Refreshing ${fetchRequests.length} tickers`, "refresh");
  const results = await fetchAllTickers(fetchRequests, today);

  for (const [ticker, bars] of results.entries()) {
    if (bars.length > 0) {
      await storage.upsertPrices(bars);
      const maxDate = bars.reduce((max, b) => (b.date > max ? b.date : max), bars[0].date);
      await storage.updateLastFetchedDate(ticker, maxDate);
      log(`Stored ${bars.length} bars for ${ticker}, latest: ${maxDate}`, "refresh");
    }
  }
}

async function getDashboardData(
  config: TickerConfig,
  frequency: "weekly" | "daily"
): Promise<DashboardData> {
  const tickerMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    tickerMap[key] = value.toUpperCase();
  }

  log(`[DIAG] Reading prices from DB for frequency: ${frequency}`, "api");
  const priceData = new Map<string, { date: string; close: number }[]>();

  for (const ticker of Object.values(tickerMap)) {
    try {
      const rows =
        frequency === "weekly"
          ? await storage.getWeeklyPrices(ticker)
          : await storage.getPrices(ticker);
      log(`[DIAG] DB read OK for ${ticker}: ${rows.length} rows`, "api");
      priceData.set(
        ticker,
        rows.map((r) => ({ date: r.date, close: r.close }))
      );
    } catch (err: any) {
      log(`[DIAG] DB read FAILED for ${ticker}: ${err.message}`, "api");
      throw err;
    }
  }

  const filterConfig = getOutlierFilterConfig();
  const { priceData: filteredPriceData } = filterPriceMap(priceData, filterConfig);

  const history = buildHistory(filteredPriceData, tickerMap, frequency);
  const previousState = history.length > 0 ? history[history.length - 1].state : null;
  const classification = buildClassification(filteredPriceData, tickerMap, frequency, previousState);

  const tickerList = getTickerList(config);
  const dataStatus = await storage.getDataStatus(tickerList);

  return {
    classification,
    history,
    lastRefresh: new Date().toISOString(),
    dataStatus,
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/dashboard", async (req, res) => {
    try {
      const frequency = (req.query.frequency || "weekly") as "weekly" | "daily";
      const config = DEFAULT_TICKERS;
      const data = await getDashboardData(config, frequency);
      res.json(data);
    } catch (err: any) {
      log(`Dashboard error: ${err.message}`, "api");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/dashboard/:frequency", async (req, res) => {
    try {
      const frequency = (req.params.frequency || "weekly") as "weekly" | "daily";
      const config = DEFAULT_TICKERS;
      const data = await getDashboardData(config, frequency);
      res.json(data);
    } catch (err: any) {
      log(`Dashboard error: ${err.message}`, "api");
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/refresh", async (req, res) => {
    try {
      const config = DEFAULT_TICKERS;
      await refreshData(config);
      const frequency = (req.body?.frequency || "weekly") as "weekly" | "daily";
      const data = await getDashboardData(config, frequency);
      res.json(data);
    } catch (err: any) {
      log(`Refresh error: ${err.message}`, "api");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      const frequency = (req.query.frequency || "weekly") as "weekly" | "daily";
      const config = DEFAULT_TICKERS;
      const data = await getDashboardData(config, frequency);

      const exportData = {
        currentState: data.classification.currentState,
        confidence: data.classification.confidence,
        asOfDate: data.classification.asOfDate,
        frequency: data.classification.frequency,
        runnerUp: data.classification.runnerUp,
        runnerUpConfidence: data.classification.runnerUpConfidence,
        scores: data.classification.scores,
        features: data.classification.features,
        exportedAt: new Date().toISOString(),
      };

      res.json(exportData);
    } catch (err: any) {
      log(`Export error: ${err.message}`, "api");
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/data-status", async (req, res) => {
    try {
      const tickers = getTickerList(DEFAULT_TICKERS);
      const status = await storage.getDataStatus(tickers);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
