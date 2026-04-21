# MAD/Hampel Outlier Filter Spec

## Goal
Add a conservative data-quality preprocessing layer that filters obvious bad ticks before the existing Regime Detector calculations run.

The filter should improve input cleanliness without redefining the regime model.

## Scope
Implement a rolling MAD/Hampel-style filter for market data series used by the app:

- SPY
- RSP
- HYG
- LQD
- UUP
- TLT
- DBC
- VIXY

## Pipeline Placement
Current intended pipeline:

```text
Tiingo raw/cached prices
-> outlier filter
-> returns / ratios / momentum / z-scores
-> state scores / probabilities
-> dashboard / JSON output
```

Recommended insertion point:

- After price rows are loaded from storage/API
- Before `computeFeatures` calculates returns, ratios, momentum, z-scores, and correlations

## Important Constraints
- Do not add MAD as a displayed dashboard signal.
- Do not add MAD as a fifth regime input.
- Do not change the four-state regime framework.
- Do not rewrite the classifier unless strictly necessary.
- Do not filter raw nonstationary prices directly except as a reconstruction step after return filtering.
- Preserve current app behavior as much as possible, aside from cleaning obvious data errors.

## Filter Method
Use a Hampel-style rolling median and MAD threshold on log returns:

```text
r_t = ln(P_t / P_{t-1})
```

For each return:

1. Compute rolling median of nearby historical returns.
2. Compute rolling MAD.
3. Convert MAD to robust standard-deviation scale where useful:

```text
robust_sigma = 1.4826 * MAD
```

4. Flag returns where:

```text
abs(r_t - rolling_median) > threshold_multiplier * max(robust_sigma, mad_floor)
```

5. Replace only isolated suspicious returns using a conservative method, such as median replacement or bounded interpolation.
6. Reconstruct filtered prices from the filtered return series.

## False-Positive Protections
The filter should primarily catch one-bar garbage prints, not real market regime shifts.

Required protections:

- Conservative default threshold.
- Minimum MAD floor to avoid excessive filtering in quiet periods.
- Do not automatically suppress large moves that persist across multiple bars.
- If a suspicious move is followed by continuation or confirmation, allow it through.
- Keep cross-asset confirmation modular and optional.

Simple persistence rule:

- If one extreme return is isolated, it may be filtered.
- If two or more consecutive large returns occur in the same direction, treat as potentially legitimate and do not filter automatically.

## Configuration
Create a small config object, optionally env-driven, with defaults similar to:

```ts
{
  enabled: true,
  verboseLogging: false,
  rollingWindow: 21,
  thresholdMultiplier: 6,
  madFloor: 0.0025,
  preservePersistentMoves: true,
  persistenceBars: 2
}
```

Potential environment variables:

```text
OUTLIER_FILTER_ENABLED=true
OUTLIER_FILTER_VERBOSE=false
OUTLIER_FILTER_WINDOW=21
OUTLIER_FILTER_THRESHOLD=6
OUTLIER_FILTER_MAD_FLOOR=0.0025
```

## Logging / Observability
When verbose logging is enabled, log each flagged point with:

- symbol
- date
- original price
- filtered price
- original return
- replacement return
- rolling median
- MAD / robust sigma
- threshold
- reason

Logs should be readable in deployment logs and easy to search.

Suggested log prefix:

```text
[OUTLIER_FILTER]
```

## Recommended Files
Likely files to add or modify:

- `server/outlier-filter.ts` — new reusable filtering logic
- `server/classifier.ts` — apply filtering before feature computation, or receive already-filtered data
- `server/routes.ts` — optionally apply preprocessing immediately after loading price rows
- `script/test-mad-filter.ts` — lightweight validation harness
- `replit.md` — document the new data-quality preprocessing layer after implementation

## Implementation Preference
Prefer a modular backend implementation:

```ts
filterPriceSeries(symbol, rows, config)
filterPriceMap(priceData, config)
```

The classifier should not need to know whether a point was filtered unless future observability requires it.

## Acceptance Criteria
The implementation is complete when:

1. Existing dashboard still loads normally.
2. Existing regime states still compute without schema/UI changes.
3. A one-bar bad tick is flagged and filtered.
4. A sustained multi-bar move is not automatically filtered.
5. Downstream z-scores, ratios, momentum, and probabilities still compute correctly.
6. Filter can be disabled by config.
7. Verbose logs can be toggled on/off.

## Suggested Validation Harness
Create a small script that runs without the full app server and checks:

### Test 1: Single Bad Tick
- Generate a smooth price series.
- Inject one extreme one-bar spike.
- Confirm exactly that isolated point is flagged.
- Confirm reconstructed prices normalize afterward.

### Test 2: Sustained Move
- Generate a price series with a legitimate two- or three-bar move.
- Confirm the persistence rule allows it through.

### Test 3: Classifier Compatibility
- Run filtered price data into existing feature/classification functions.
- Confirm outputs are finite numbers.
- Confirm all four regime probabilities are present and sum close to 1.

## Do Not Do
- Do not expose a MAD score on the dashboard.
- Do not make MAD part of the regime scoring model.
- Do not remove volatility spikes just because they are large.
- Do not make the filter overly aggressive.
- Do not perform a broad app rewrite.
