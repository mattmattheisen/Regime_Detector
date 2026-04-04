# Macro State Router

A Bloomberg-terminal style dashboard that classifies the current market environment into one of four macro regimes using a deterministic, rule-based scoring classifier. Built with a React frontend, Express backend, and PostgreSQL caching layer.

---

## Overview

The Macro State Router continuously monitors eight ETF proxies and computes feature z-scores across volatility, credit, breadth, rates, USD, and correlation dimensions. It then scores and softmax-ranks four macro states, applies a hysteresis filter to prevent rapid state switching, and presents the result in a compact, information-dense terminal-style dashboard.

### Four Macro States

| State | Conditions | Positioning Edge |
|---|---|---|
| **EQUITY_TREND** | Low vol, stable credit, strong breadth | Momentum / beta expansion |
| **VOLATILITY_SHOCK** | Vol spike, credit widening, rising correlations | Hedges / defense |
| **RATE_SHOCK** | Duration weakness, commodities supportive | Short duration / value tilt |
| **LIQUIDITY_SQUEEZE** | Strong USD, weak credit | Quality / cash / low gross |

---

## Data Sources

All price data is sourced from the [Tiingo EOD API](https://www.tiingo.com/) (free tier).

| Role | Ticker |
|---|---|
| Equity benchmark | SPY |
| Breadth proxy | RSP |
| High-yield credit | HYG |
| Investment-grade credit | LQD |
| US Dollar | UUP |
| Duration | TLT |
| Commodities | DBC |
| VIX proxy | VIXY |

---

## Classifier Design

- **Rolling z-scores**: 104-week lookback window for all signal normalization
- **Momentum windows**: 12-week primary, 4-week short-term
- **Correlation window**: 26-week rolling SPY/TLT correlation
- **VIXY bias correction**: A `VIXY_BIAS_SCALAR = 0.70` is applied at the price level before z-score computation to correct for VIXY's systematic overstatement of spot VIX during stress regimes
- **Hysteresis**: Entry threshold 60%, exit threshold 40% — prevents whipsawing between states
- **No lookahead bias**: Historical state classification slices data by cutoff date at each step

---

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS (dark terminal theme), shadcn/ui components
- **Backend**: Express.js REST API
- **Database**: PostgreSQL (price caching and metadata)
- **Fonts**: IBM Plex Sans / IBM Plex Mono

---

## Architecture

```
client/                  # React frontend
  src/
    pages/dashboard.tsx  # Main dashboard page
    components/          # UI components

server/
  classifier.ts          # Deterministic state classifier
  tiingo.ts              # Tiingo API fetcher (rate-limited, exponential backoff)
  storage.ts             # PostgreSQL storage layer
  routes.ts              # API endpoints
  db.ts                  # Database connection

shared/
  schema.ts              # Data models and types (shared frontend/backend)
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/:frequency` | Dashboard data (`weekly` or `daily`) |
| POST | `/api/refresh` | Trigger incremental data refresh from Tiingo |
| GET | `/api/export` | Export current state as JSON |
| GET | `/api/data-status` | Check cached data status per ticker |

---

## Caching Strategy

- PostgreSQL `prices` table stores OHLCV bars per ticker/date
- `metadata` table tracks the last fetched date per ticker
- Incremental updates: only fetches bars after the last cached date
- Rate limiting: 1.5s delay between Tiingo requests, exponential backoff on 429 errors

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `TIINGO_API_KEY` | Your Tiingo API key ([free tier](https://www.tiingo.com/)) |
| `SESSION_SECRET` | Session secret |

---

## Running Locally

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5000` — the Express server serves both the API and the Vite-built frontend.

---

*Matt Mattheisen · Shomer Analytics*
