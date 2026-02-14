import { db } from "./db";
import { prices, metadata } from "@shared/schema";
import type { Price, InsertPrice, Metadata } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import type { PriceBar } from "./tiingo";

export interface IStorage {
  getPrices(ticker: string): Promise<Price[]>;
  getLastFetchedDate(ticker: string): Promise<string | null>;
  upsertPrices(bars: PriceBar[]): Promise<void>;
  updateLastFetchedDate(ticker: string, date: string): Promise<void>;
  getDataStatus(tickers: string[]): Promise<{ ticker: string; lastDate: string | null; barCount: number }[]>;
  getWeeklyPrices(ticker: string): Promise<Price[]>;
}

export class DatabaseStorage implements IStorage {
  async getPrices(ticker: string): Promise<Price[]> {
    return db
      .select()
      .from(prices)
      .where(eq(prices.ticker, ticker.toUpperCase()))
      .orderBy(prices.date);
  }

  async getWeeklyPrices(ticker: string): Promise<Price[]> {
    const allPrices = await this.getPrices(ticker);
    const weekly: Price[] = [];

    function getISOWeekKey(dateStr: string): string {
      const d = new Date(dateStr + "T00:00:00Z");
      const dayOfWeek = d.getUTCDay();
      const thursday = new Date(d);
      thursday.setUTCDate(d.getUTCDate() + (4 - (dayOfWeek || 7)));
      const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      return `${thursday.getUTCFullYear()}-W${weekNo}`;
    }

    const weekMap = new Map<string, Price>();
    for (const p of allPrices) {
      const weekKey = getISOWeekKey(p.date);
      weekMap.set(weekKey, p);
    }

    const sortedWeeks = [...weekMap.keys()].sort();
    for (const wk of sortedWeeks) {
      weekly.push(weekMap.get(wk)!);
    }

    return weekly;
  }

  async getLastFetchedDate(ticker: string): Promise<string | null> {
    const result = await db
      .select()
      .from(metadata)
      .where(eq(metadata.ticker, ticker.toUpperCase()))
      .limit(1);
    return result.length > 0 ? result[0].lastFetchedDate : null;
  }

  async upsertPrices(bars: PriceBar[]): Promise<void> {
    if (bars.length === 0) return;

    const BATCH_SIZE = 100;
    for (let i = 0; i < bars.length; i += BATCH_SIZE) {
      const batch = bars.slice(i, i + BATCH_SIZE);
      await db
        .insert(prices)
        .values(
          batch.map((b) => ({
            ticker: b.ticker.toUpperCase(),
            date: b.date,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
            volume: b.volume,
            source: "tiingo",
          }))
        )
        .onConflictDoUpdate({
          target: [prices.ticker, prices.date],
          set: {
            open: sql`EXCLUDED.open`,
            high: sql`EXCLUDED.high`,
            low: sql`EXCLUDED.low`,
            close: sql`EXCLUDED.close`,
            volume: sql`EXCLUDED.volume`,
          },
        });
    }
  }

  async updateLastFetchedDate(ticker: string, date: string): Promise<void> {
    await db
      .insert(metadata)
      .values({
        ticker: ticker.toUpperCase(),
        lastFetchedDate: date,
      })
      .onConflictDoUpdate({
        target: metadata.ticker,
        set: {
          lastFetchedDate: date,
          updatedAt: new Date(),
        },
      });
  }

  async getDataStatus(tickers: string[]): Promise<{ ticker: string; lastDate: string | null; barCount: number }[]> {
    const results: { ticker: string; lastDate: string | null; barCount: number }[] = [];

    for (const ticker of tickers) {
      const t = ticker.toUpperCase();
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(prices)
        .where(eq(prices.ticker, t));

      const lastResult = await db
        .select({ maxDate: sql<string>`max(date)` })
        .from(prices)
        .where(eq(prices.ticker, t));

      results.push({
        ticker: t,
        lastDate: lastResult[0]?.maxDate || null,
        barCount: countResult[0]?.count || 0,
      });
    }

    return results;
  }
}

export const storage = new DatabaseStorage();
