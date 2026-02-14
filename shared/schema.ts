import { sql } from "drizzle-orm";
import { pgTable, text, varchar, date, real, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prices = pgTable("prices", {
  ticker: text("ticker").notNull(),
  date: date("date").notNull(),
  open: real("open"),
  high: real("high"),
  low: real("low"),
  close: real("close").notNull(),
  volume: real("volume"),
  source: text("source").default("tiingo"),
}, (table) => ({
  pk: primaryKey({ columns: [table.ticker, table.date] }),
}));

export const metadata = pgTable("metadata", {
  ticker: text("ticker").primaryKey(),
  lastFetchedDate: date("last_fetched_date"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPriceSchema = createInsertSchema(prices).omit({});
export const insertMetadataSchema = createInsertSchema(metadata).omit({ updatedAt: true });

export type Price = typeof prices.$inferSelect;
export type InsertPrice = z.infer<typeof insertPriceSchema>;
export type Metadata = typeof metadata.$inferSelect;
export type InsertMetadata = z.infer<typeof insertMetadataSchema>;

export const MACRO_STATES = ["EQUITY_TREND", "VOLATILITY_SHOCK", "RATE_SHOCK", "LIQUIDITY_SQUEEZE"] as const;
export type MacroState = typeof MACRO_STATES[number];

export const STATE_LABELS: Record<MacroState, string> = {
  EQUITY_TREND: "Equity Trend",
  VOLATILITY_SHOCK: "Volatility Shock",
  RATE_SHOCK: "Rate Shock",
  LIQUIDITY_SQUEEZE: "Liquidity Squeeze",
};

export const STATE_DESCRIPTIONS: Record<MacroState, string> = {
  EQUITY_TREND: "Low volatility, credit stable, breadth strong. Edge: momentum / trend-following, beta expansion.",
  VOLATILITY_SHOCK: "Volatility spike, credit widening, correlations rising. Edge: hedges, defensive rotation, long-vol.",
  RATE_SHOCK: "Duration weak, commodities supportive. Edge: short duration, value tilt, commodities / inflation-aware.",
  LIQUIDITY_SQUEEZE: "USD strengthening, credit weak. Edge: quality bias, cash/treasuries, lower gross exposure.",
};

export const STATE_PLAYBOOKS: Record<MacroState, string[]> = {
  EQUITY_TREND: [
    "Momentum / trend-following strategies",
    "Beta expansion plays",
    "Growth factor tilt",
    "Risk-on positioning",
  ],
  VOLATILITY_SHOCK: [
    "Hedges (puts / collars)",
    "Defensive sector rotation",
    "Long-volatility expressions",
    "Reduce gross exposure",
  ],
  RATE_SHOCK: [
    "Short duration bias",
    "Value factor tilt",
    "Commodities / inflation-aware positioning",
    "Avoid long-duration bonds",
  ],
  LIQUIDITY_SQUEEZE: [
    "Quality factor bias",
    "Cash / short-term treasuries",
    "Lower gross exposure",
    "Avoid illiquid / leveraged names",
  ],
};

export interface FeatureReadings {
  volatility: {
    vixProxyLevel: number;
    vixProxyZScore: number;
    realizedVolZScore: number;
  };
  credit: {
    creditRatio: number;
    creditMomentum: number;
    creditZScore: number;
  };
  breadth: {
    breadthRatio: number;
    breadthMomentum: number;
    breadthZScore: number;
  };
  rates: {
    tltMomentum: number;
    dbcMomentum: number;
  };
  usd: {
    uupMomentum: number;
    uupZScore: number;
  };
  correlation: {
    spyTltCorrelation: number;
    correlationChange: number;
  };
  equityTrend: {
    spyMomentum: number;
    spyTrendZScore: number;
  };
}

export interface StateScore {
  state: MacroState;
  score: number;
  probability: number;
}

export interface ClassificationResult {
  currentState: MacroState;
  confidence: number;
  runnerUp: MacroState;
  runnerUpConfidence: number;
  asOfDate: string;
  scores: StateScore[];
  features: FeatureReadings;
  frequency: "weekly" | "daily";
}

export interface StateHistoryEntry {
  date: string;
  state: MacroState;
  confidence: number;
}

export interface DashboardData {
  classification: ClassificationResult;
  history: StateHistoryEntry[];
  lastRefresh: string;
  dataStatus: {
    ticker: string;
    lastDate: string | null;
    barCount: number;
  }[];
}

export const DEFAULT_TICKERS = {
  equity: "SPY",
  breadth: "RSP",
  creditHigh: "HYG",
  creditQuality: "LQD",
  usd: "UUP",
  duration: "TLT",
  commodities: "DBC",
  vixProxy: "VIXY",
};

export type TickerConfig = typeof DEFAULT_TICKERS;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
