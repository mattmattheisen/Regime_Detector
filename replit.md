# Macro State Router

## Overview
Bloomberg-terminal style dashboard that classifies the current market environment into one of four macro states using a deterministic, rule-based scoring classifier. Uses Tiingo EOD data with PostgreSQL caching.

## Architecture
- **Frontend**: React + Vite + Tailwind (dark terminal theme), shadcn/ui components
- **Backend**: Express.js API with Tiingo data fetching, PostgreSQL caching, incremental updates
- **Database**: PostgreSQL (Replit native) for price data caching and metadata

## Key Files
- `shared/schema.ts` - Data models, state definitions, types
- `server/tiingo.ts` - Tiingo API fetcher with rate-limit queue and exponential backoff
- `server/outlier-filter.ts` - MAD/Hampel-style data-quality filter for isolated return outliers before classification
- `server/classifier.ts` - Deterministic state classifier with z-scores, scoring, hysteresis
- `server/storage.ts` - Database storage layer for prices and metadata
- `server/routes.ts` - API endpoints (dashboard, refresh, export, data-status)
- `server/db.ts` - Database connection
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/components/` - UI components (state-header, probabilities-table, rationale-panel, playbook-panel, state-history, data-status, settings-panel)

## Four Macro States
1. **EQUITY_TREND** - Low vol, stable credit, strong breadth → momentum/beta expansion
2. **VOLATILITY_SHOCK** - Vol spike, credit widening, correlations rising → hedges/defense
3. **RATE_SHOCK** - Duration weak, commodities supportive → short duration/value
4. **LIQUIDITY_SQUEEZE** - USD strong, credit weak → quality/cash/low gross

## Data Sources (Tiingo EOD)
Tickers: SPY, RSP, HYG, LQD, UUP, TLT, DBC, VIXY

## API Endpoints
- `GET /api/dashboard/:frequency` - Get dashboard data (weekly/daily)
- `POST /api/refresh` - Trigger data refresh from Tiingo
- `GET /api/export?frequency=` - Export current state as JSON
- `GET /api/data-status` - Check cached data status

## Caching Strategy
- PostgreSQL `prices` table stores OHLCV bars per ticker/date
- `metadata` table tracks last_fetched_date per ticker
- Incremental updates: only fetches bars after last cached date
- Rate limiting: 1.5s delay between requests, exponential backoff on 429

## Data Quality
- Cached Tiingo price series are preprocessed with a conservative MAD/Hampel-style filter on log returns before feature calculations
- The filter targets isolated bad ticks only and preserves sustained same-direction moves
- Config flags: `OUTLIER_FILTER_ENABLED`, `OUTLIER_FILTER_VERBOSE`, `OUTLIER_FILTER_WINDOW`, `OUTLIER_FILTER_THRESHOLD`, `OUTLIER_FILTER_MAD_FLOOR`
- MAD filtering is not a displayed regime signal and is not part of the scoring model

## User Preferences
- Dark terminal theme (Bloomberg-style)
- IBM Plex Sans / IBM Plex Mono fonts
- Weekly frequency default
- Compact, information-dense layout
