# Biomethane Desk Cockpit — Remediation Implementation Plan

**Target repo:** `Biomethane Tool (Gemini)` · branch `main` · baseline commit `ede1771`
**Written:** 6 September 2026
**Audience:** an engineering agent with no prior context on this repository.

---

## 0. Read this first

### 0.1 What this codebase is

A React 18 + TypeScript + Vite single-page application that models European biomethane
trading: regulatory eligibility, certificate valuation, netback/margin, logistics and a
plant registry. ~131k LOC across 168 files. HashRouter, Tailwind v4, no backend in the
default dev path (there is an optional Express-ish server under `src/server/`).

The domain layer (`src/domain/`) is pure TypeScript with zero React imports and is
enforced as such by `src/domain/__tests__/architecture.test.ts`. **Preserve that
property.** All pricing flows through a single function, `computeNetback` in
`src/domain/netback/engine.ts`. **Preserve that too** — it is why this codebase is
fixable.

### 0.2 What is wrong with it

The engine is well built. The data it is fed is largely fabricated, and the UI presents
that fabricated data with the visual authority of a real trading terminal. Specifically:

- The gas index is a random draw between 26 and 34 €/MWh; the real front-month TTF on
  3 September 2026 was **€73.55/MWh**. The UI badges this random number "ICE / EEX SPOT".
- All 1,975 plants share `commissioningYear: 2021`; 217 have template-generated
  operators and legal entities; 98.5% have no contact details. All carry a provenance
  string claiming GIE/EBA census origin.
- The connector "test" returns success for authenticated endpoints without making a
  request.
- The desk margin is definitionally a fixed fraction of the netback and therefore can
  never be negative.

### 0.3 Rules of engagement

1. **Do not invent data.** If a real value is not available, the field is `null` and the
   UI renders an explicit "unset" state. This codebase already has excellent precedent
   for this — `computeCertificateValue` returns `null` rather than `0` when no mark
   exists. Follow that pattern everywhere. Never substitute a plausible-looking number
   for a missing one.
2. **Do not add features before Phase 0 and Phase 1 are complete.** The application's
   failure mode is that it is persuasive. New capability layered on unreliable inputs
   makes a more convincing wrong answer.
3. **Every task below has an acceptance criterion.** Do not mark a task done without
   satisfying it. Where a test is specified, write the test.
4. **Run `npx vitest run` after every task.** Baseline is 408 passing across 30 files.
   If a test breaks, decide deliberately whether the test encoded the bug — several do —
   and update it with a comment explaining why, rather than working around it.
5. **Do not reformat, rename or restructure files you are not otherwise changing.**
   Diffs should be reviewable.
6. **Commit per task**, message format `fix(<area>): <what>` or `feat(<area>): <what>`.

---

## Phase 0 — Stop the application asserting what it does not know

**Goal:** every number on screen is either real, or visibly labelled as not real.
**Estimated effort:** 2–3 days. **Nothing in Phase 0 requires external data.**

---

### Task 0.1 — Remove the fake connector handshake

**File:** `src/domain/api/connectorConfig.ts`

At lines 216–222, `testConnectorPing` short-circuits for any connector with
`requiresAuth: true` and returns a fabricated success:

```ts
// Simulate ping for authenticated enterprise endpoints with dummy check
const latency = 140 + Math.floor(Math.random() * 80);
return {
  success: true,
  latencyMs: latency,
  message: `Credentials configured. Gateway handshake validated (${latency}ms)`,
};
```

This affects Argus, ICIS, EEX, the UDB gateway, dena Biogasregister and VertiCer — every
paid feed in the application.

**Change:**
- Delete the simulated branch entirely.
- Perform a real `fetch` against `endpointUrl` with the credential attached as a
  `Authorization: Bearer <apiKey>` header (and `X-Client-Id: <clientId>` where present),
  same 4s `AbortSignal.timeout` as the unauthenticated path.
- Report the actual outcome. A network error, a 401, a 403 and a CORS failure are all
  **failures** and must say which. Do not collapse them into a generic message.
- Because these are browser-side calls to third-party hosts, CORS will block most of
  them. That is a true result and must be reported truthfully, e.g.
  `"Blocked by CORS — this endpoint requires a server-side proxy."` Add a
  `requiresServerProxy: boolean` field to `ApiConnectorEntry` and set it on the
  connectors where this is expected, so the UI can explain rather than just fail.

**Also in the same file:** `DEFAULT_CONNECTORS` hardcodes `status: 'CONNECTED'` with
`latencyMs: 120` / `185` at lines 77 and 91, before any ping has run. Change both to
`status: 'DISCONNECTED'`, `lastPingTimestamp: null`, `latencyMs: null`. Status must only
ever be set by an actual ping result.

**Acceptance:** With no credentials configured, every connector reads `DISCONNECTED`.
With a junk API key entered for Argus, the panel reports a real HTTP or network error,
not success. No code path returns `success: true` without a completed `fetch`.

**Test:** `src/domain/__tests__/connectorPing.test.ts` — mock `fetch`; assert that a
rejected fetch, a 401 and a 500 each produce `success: false` with distinguishable
messages, and that `testConnectorPing` calls `fetch` exactly once for an authenticated
connector with a key present.

---

### Task 0.2 — Fix the broken France connector URL

**File:** `src/domain/api/connectorConfig.ts` line 89

The configured endpoint returns `{"error_code":"NotFoundResource"}` — the dataset
`points-dinjection-de-biomethane` does not exist. Verified 6 Sep 2026.

**Replace with the working dataset** (verified live, free, no authentication):

```
https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/production-annuelle-de-biomethane-par-site-raccorde-au-reseau-de-transport-et-de/records?limit=100
```

Full field mapping is in **Appendix A**. This dataset is also the input to Task 3.1, so
do not treat it as a throwaway fix.

**Acceptance:** The France connector pings green against a live network, and the response
parses to a non-empty record array.

---

### Task 0.3 — Stop labelling simulated marks as exchange data

**Files:** `src/features/marks/MarksScreen.tsx`, `src/features/marks/DetailedPricingScreen.tsx`,
`src/app/Header.tsx`

The Pricing Desk renders the TTF tile with the badge **"ICE / EEX SPOT"** and a
bid/offer of `30.86 / 31.36`, and the global header shows `TTF M+1 €31.11 · SIDE BID`.
The underlying value is `simulateDesk()`'s random draw and is correctly stamped
`provenance.sourceType === 'ESTIMATE'`, `sourceName === 'SIMULATED'`. The presentation
contradicts the provenance.

**Change:**
- Derive every source badge from `provenance.sourceType`. Never hardcode a source label
  in JSX. Map `ESTIMATE` + `sourceName === SIMULATED_SOURCE_NAME` to a badge reading
  **`SIMULATED`** in the warning colour.
- The same rule applies to the FX tile (`ECB SPOT`) and to the per-row
  `PRICE DERIVED FROM` column on the Pricing Desk.
- In `Header.tsx`, when the gas index is simulated, render the price in the muted/warning
  token and append the `SIMULATED` chip. Do not hide the number — hiding it makes screens
  look broken, which is the problem the seeding was introduced to solve. Label it.
- Audit for any other hardcoded provenance strings:
  `grep -rn "ICE\|EEX SPOT\|ECB SPOT\|100% ACTIVE" src/features/`.

**Acceptance:** On a fresh profile (cleared `localStorage`), no badge anywhere in the
application claims an exchange, PRA or central-bank source. Entering a real mark on the
Marks screen flips that row's badge to the entered source.

---

### Task 0.4 — Purge fabricated fields from the plant registry

**File:** `src/domain/plants/plantsData.ts` (76,855 lines — script this, do not hand-edit)

Verified by parsing the array directly:

| Field | Problem | Rows affected |
|---|---|---|
| `commissioningYear` | Constant `2021` for every plant | 1,975 / 1,975 (100%) |
| `operator` | Template `"{Country} BioEnergy ({PlantName})"` | 217 (11%) |
| `legalEntityName` | Template ending `"Ltd/SA"` — not a real corporate form | 217 (11%) |
| `contactEmail` / `contactPhone` / `companyRegistrationId` / `corporateWebsite` | Absent | 1,946 (98.5%) |
| `provenance` | Claims `"GIE/EBA European Biomethane Map 2026 (Official Census)"` for fields GIE/EBA does not publish | all |

`commissioningYear` is not cosmetic: it feeds `consignment.commissioningDateRange`, which
selects the GHG threshold tier in `src/domain/eligibility/gates/ghg-threshold.ts`. A
constant makes every plant in Europe evaluate at the same tier.

**Change — write a one-off script under `scripts/`:**
1. Set `commissioningYear: null` on all rows. (Task 3.1 repopulates France with real
   dates from ODRE.)
2. Where `operator` matches `/BioEnergy \(/` set it to `null`. Where `legalEntityName`
   ends `"Ltd/SA"` set it to `null`.
3. Rewrite `provenance` to claim only what the source publishes:
   `"GIE/EBA European Biomethane Map 2026 — name, location and capacity only"`.
4. Recompute `fieldsUnverified` per row so it lists every field that is actually null.

**Then make the UI honest about it.** In `PlantsScreen.tsx` and `PlantScannerTable.tsx`,
render `null` as an explicit `—` with an "unverified" affordance, never as a blank cell
or a fallback string. Add a persistent count to the screen header:
`"1,975 plants · 29 verified · operator known for N"`.

**Acceptance:** No plant row contains a value that was not derived from a named external
source. `grep -c "BioEnergy (" src/domain/plants/plantsData.ts` returns 0.

**Test:** `src/domain/__tests__/plantsDataIntegrity.test.ts` — assert that
`commissioningYear` is not constant across the dataset (guards against reintroduction),
that no `legalEntityName` ends in `"Ltd/SA"`, and that no `operator` matches
`/BioEnergy \(/`.

---

### Task 0.5 — Reconcile the two conflicting plant counts

`src/domain/markets/registry.ts` carries `productionPlants` per market;
`src/domain/plants/plantsData.ts` carries actual rows. They disagree:

| Market | `registry.ts` | `plantsData.ts` | Divergence |
|---|---|---|---|
| Italy | 135 | 273 | +102% |
| France | 652 | 829 | +27% |
| Austria | 16 | 20 | +25% |
| Germany | 242 | 282 | +17% |
| Netherlands | 82 | 92 | +12% |
| Sweden | 72 | 67 | −7% |
| Denmark | 64 | 61 | −5% |

**Change:** Delete `productionPlants` from the `Market` interface in
`src/domain/markets/types.ts` and from all 38 market entries. Replace call sites with a
derived selector:

```ts
// src/domain/plants/registry.ts
export function countPlantsByCountry(iso2: string): number
```

`annualProductionTWh` has the same problem and should be handled the same way once
production data exists (Task 3.1); until then leave it but mark it `// UNVERIFIED —
secondary source, not derived` in the type.

**Acceptance:** Exactly one code path answers "how many plants are in country X".

**Test:** Add to `src/domain/__tests__/cross_screen_consistency.test.ts`: for every
market with a country code present in the plant registry, any count surfaced in the UI
resolves through `countPlantsByCountry`.

---

### Task 0.6 — Correct the Netherlands ERE naming

**File:** `src/domain/markets/marketBenchmarks.ts` line 55

Reads `"Netherlands ERE (Hernieuwbare Energie-eenheden)"`. That is the old HBE
construction. ERE is an **emission reduction unit** — 1 ERE = 1 kg CO₂e avoided — which
is the substance of the 1 January 2026 reform. `registry.ts` line 52 already gets this
right.

**Change:** `"Netherlands ERE (Emissiereductie-eenheden)"`. One line. The structural
problem with the ERE model is Task 4.3.

---

### Task 0.7 — Retire the German double-counting scenario branch

**File:** `src/domain/markets/registry.ts` lines 3–14

The `deDoubleCounting` uncertainty reads *"Cabinet draft, 10 December 2025 … remains
unresolved"* with `lastUpdated: '2026-08-16'`, and drives a live dual-branch 1× / 2×
fork through the Trade Builder and Scanner. Double counting for advanced biofuels was
abolished with effect from the 2026 compliance year. Nine months into that year this is
settled fact, not a live scenario.

**Change:**
- Set the `DC_OFF` (1×) branch as the sole active branch; move `DC_ON` behind a
  `historical: true` flag so it remains available for backtesting pre-2026 vintages but
  does not appear as an unresolved risk on a 2026 ticket.
- Update `description` and `lastUpdated`.
- **Keep `persistentNote` exactly as written.** The distinction it draws — that double
  counting is a policy multiplier being removed, whereas manure's negative CI is a
  property of the GHG calculation and is unaffected — is correct, well expressed, and
  the single most commonly misunderstood point in this market.
- The Trade Builder's `germanCliffImpactEurMwh` / `germanCliffNotionalEur` in
  `PrincipalRiskMetrics` should now report against pre-2026 vintages only.

**Acceptance:** A 2026-vintage ticket shows no `UNRESOLVED · DUAL BRANCH` chip for
Germany.

---

### Task 0.8 — Make PROJECT.md describe what exists

**File:** `PROJECT.md`

It documents `src/domain/briefing/` (R3) and `src/domain/sensitivity/` (R4) with
interface contracts, marks milestones M3 and M4 **DONE** and eight feature rows
**VERIFIED**. Neither directory exists. A row (M6) certifies "zero cheating" over this.

**Change:** Rewrite to reflect the actual tree. Delete the self-certification rows —
a document cannot audit itself. Where functionality exists but elsewhere (sensitivity
toggles are wired into the Trade Builder), say where.

---

## Phase 1 — Make one price real, end to end

**Goal:** the application prices off observed data with a visible timestamp.
**Estimated effort:** 2–3 weeks. **Depends on:** Phase 0.

> **Context for the implementing agent.** Biomethane certificate prices are genuinely
> private — bilateral, unpublished. The Green Gas Certification Scheme states it does not
> collect or share transfer prices. There is no free public tape and no amount of
> searching will produce one. The realistic paths are (a) broker runs, which are free and
> which this repo already has a parser for, and (b) a PRA subscription. Do not spend time
> hunting for a free certificate price API; it does not exist.

---

### Task 1.1 — Promote broker-run import to the primary input path

**Files:** `src/domain/marks/brokerParser.ts` (511 lines, already written and good),
`src/features/marks/BrokerRunImporterModal.tsx`, `src/features/marks/MarksScreen.tsx`

`parseBrokerRunText` already exists and works. It is buried behind a modal. Brokers
(STX, ACT Commodities, AFS Energy, Vertis, Marex, Landwärme) distribute indicative runs
by email free to anyone plausibly in the market. This is how a real desk gets prices, and
it is more defensible than a scraped index because every mark carries a named source.

**Change:**
- Surface paste-a-run as a primary action on the Marks screen and in the command palette,
  not a secondary modal button.
- On import, set `provenance.sourceType = 'BROKER_INDICATION'`,
  `sourceName = <broker>`, `observedAt = <run date, not import date>`. The distinction
  matters: `getMarkAgeDays` already prefers `observedAt`.
- Show a parse preview with per-row accept/reject before committing to the store.
- Persist the raw run text alongside the marks for audit.

**Acceptance:** A pasted broker run produces marks whose age, source and staleness are
correct on the Pricing Desk without any further input.

---

### Task 1.2 — One live TTF feed

**Files:** new `src/domain/markets/gasIndexFeed.ts`; `src/domain/marks/simulate.ts:91`

`const ttfMid = between(26, 34);` — replace as the default source. Actual TTF front-month
was €72–74/MWh in early September 2026, so the seeded band is wrong by roughly 2.3×, and
this single input flows into every netback in the application.

**Change:**
- Implement a `GasIndexFeed` interface with one concrete adapter. Options, in order of
  preference: **Databento** (ICE Endex TFM, proper market data, paid), **OilPriceAPI**
  (free tier, 10k requests, TTF covered), or a manual daily entry field. Any of the three
  is acceptable; the interface matters more than the vendor.
- Stamp `provenance.sourceType = 'EXCHANGE_AUCTION'` or `'PRICE_REPORTING'` as
  appropriate, with the real observation timestamp.
- **Keep `simulateDesk` as an explicit, labelled fallback** for offline development —
  do not delete it. Widen the band to `between(60, 85)` so that even the fallback is not
  absurd, and add a comment stating it is not a market view.
- Add a plausibility guard in the netback engine: if the gas index is outside
  €5–200/MWh, surface a warning rather than computing silently.

**Acceptance:** With the feed configured, the header TTF matches the exchange to within
the feed's own latency, and is badged with its real source and time.

**Test:** `src/domain/__tests__/gasIndexFeed.test.ts` — mock the adapter; assert
provenance is stamped, the plausibility guard trips outside the band, and the simulated
fallback is stamped `ESTIMATE`.

---

### Task 1.3 — Timestamp the order book and default to live vintages

**File:** `src/features/marks/DetailedPricingScreen.tsx`

The 69-row book shows provenance and volume per line but no observation time in the
visible columns, so a mark taken this morning is indistinguishable from one taken in
March. `getMarkStaleness` already exists in `src/domain/markets/types.ts` and bands at
7 and 30 days; it is simply not surfaced here. Separately, 2024 and 2025 vintages appear
in the default view alongside 2026/2027.

**Change:**
- Add an `AS OF` column bound to `provenance.observedAt`, with the existing
  green/amber/red staleness banding.
- Default the vintage filter to current and forward vintages. Past vintages reachable
  behind an explicit toggle.
- Sort by vintage then country by default, not file order.

**Acceptance:** No quote is displayed without an age. The default view contains no
expired vintage.

---

### Task 1.4 — Demote the compiled benchmark file

**File:** `src/domain/markets/marketBenchmarks.ts` (855 lines, `observedAt` 10–21 Aug 2026)

The values are defensible — DE THG at €285/tCO₂e is credible given the 2025 rally, FR CPB
at €78.50 sits just under the €80–100 launch range — but a file that only updates on
redeploy cannot be a desk's pricing spine.

**Change:** Keep it, relabel it. It becomes a clearly-marked cold-start fallback used
only where no mark exists, always rendered with its true `observedAt` and staleness. It
must never take precedence over an imported or fed mark. Add a banner when any priced
screen is relying on it for more than a quarter of its rows.

---

## Phase 2 — Fix the engine defects

**Goal:** correct arithmetic and correct regulatory logic.
**Estimated effort:** 1–2 weeks. **Depends on:** nothing; can run parallel to Phase 1.

---

### Task 2.1 — Grade heat and grid markets against the heat rules

**Files:** `src/domain/eligibility/gates/ghg-threshold.ts:36`,
`src/domain/markets/types.ts`, `src/domain/markets/registry.ts`,
`src/domain/markets/constants.ts:58`

**This is the highest-severity correctness bug in the application.** Line 36 reads:

```ts
const isHeatPowerMarket = market.id === 'AT_EGG' || market.id === 'VOL_SCOPE1' || market.id === 'EU_ETS1';
```

Every other non-transport market — `FR_CPB`, `DK_GO`, `SE_TAX`, `ES_GDO`, `IE_RHO`,
`PL_OZE`, `CZ_POZE` and others — is therefore graded against the **road transport**
comparator of 94 gCO₂e/MJ and the **transport** threshold of 65%. The heat comparator is
80 gCO₂e/MJ and the heat/power threshold is 70% for post-2021 installations, rising to
80% from 2026.

Both errors push the same way. A larger comparator inflates the computed saving; a lower
threshold lowers the bar. **The gate is systematically too permissive** — a consignment
can pass here and fail the real rule. That is the one direction a compliance gate must
never fail in.

**Change:**
1. Add to the `Market` interface:
   ```ts
   sector: 'TRANSPORT' | 'HEAT_POWER' | 'VOLUNTARY' | 'MARITIME';
   ```
2. Populate it explicitly for all 38 markets. Do not infer it from `unitOfAccount` or
   from the market id — that is how the current bug arose. Cross-check each against its
   `legalBasis` field.
3. Drive comparator and threshold selection from `market.sector`.
4. Note that `VOL_SCOPE1` currently appears in both the `isVoluntaryOrGO` early return
   (line ~20) and `isHeatPowerMarket` — the second reference is dead code. Remove it.
5. In `constants.ts`, `GHG_THRESHOLDS_HEAT_POWER` defines `PRE_OCT_2015: 0.50` and
   `OCT_2015_TO_2020: 0.60`. RED III sets heat/power thresholds only from 2021 (70%) and
   2026 (80%); those two tiers appear copied from the transport ladder. Replace with an
   explicit `NOT_APPLICABLE` sentinel that produces an `UNKNOWN` verdict rather than a
   false `PASS`.

**Acceptance:** A consignment at 25 gCO₂e/MJ into `FR_CPB` is graded against 80 g and the
70% threshold — saving 68.75%, verdict `HARD_BLOCK` — where it currently returns `PASS`
at 73.4% against 65%.

**Test:** extend `src/domain/__tests__/challenger_regulatory_stress.test.ts` with a
table-driven case asserting the comparator and threshold applied for **every** market in
the registry, keyed on `sector`. This is the test whose absence allowed the bug.

---

### Task 2.2 — Separate dRTFCs from double-counted RTFCs

**File:** `src/domain/netback/engine.ts:253` (`case 'GBP_PER_DRTFC'`)

The engine issues `2 × 72 = 144 dRTFC/MWh` for manure, food waste, sewage sludge, UCO and
landfill gas via the `isRtfoDevelopmentFuel` predicate, and the Pricing Desk carries a row
reading *"Manure & Slurry (Double Counting) · £0.205/dRTFC"*.

These are two different instruments under the RTFO. Waste-derived biomethane earns
**double-counted standard RTFCs**. **Development fuel certificates (dRTFCs)** are a
separate, narrower category and anaerobic-digestion biomethane is generally not on that
list. dRTFCs have historically traded at roughly double the standard certificate, so
pricing double-counted volume at the dRTFC mark overstates UK netback materially —
plausibly €15–20/MWh.

**Change:**
- Split `UK_RTFO` into two priced instruments: `UK_RTFC` (standard, with a 1× / 2×
  counting multiplier driven by feedstock) and `UK_DRTFC` (development fuel).
- Add `GBP_PER_RTFC` to `UnitOfAccount`.
- Drive development-fuel eligibility from an explicit allow-list constant with a citation
  to the RTFO Renewable Fuel Feedstock List, not from a feedstock-string heuristic. AD
  biomethane defaults **out** of development fuel; anything moving in requires a source.
- The energy conversion is correct and should be preserved: biomethane LHV 50 MJ/kg →
  13.889 kWh/kg → 72.0 kg/MWh.

**Acceptance:** A manure consignment into the UK prices at the standard RTFC mark with a
2× counting multiplier, not at the dRTFC mark. Both instruments carry separate marks.

---

### Task 2.3 — Make the netback waterfall sum to its own total

**File:** `src/features/trade-builder/TradeBuilderScreen.tsx`

Observed on `#/trade`, the waterfall draws:

| Bar as drawn | €/MWh | In the stated total? |
|---|---|---|
| Certificate value | +194.16 | yes |
| Delivered cost | −137.89 | **no** |
| Transfer & registry | −1.43 | yes |
| Certification | −0.69 | yes |
| Transit DK → DE | −0.49 | yes |
| **Net netback (shown)** | **+222.41** | = 194.16 + 31.11 TTF − 2.61 |

The visible bars sum to +53.66. The stated total of +222.41 adds the TTF molecule value,
which is **not drawn**, and excludes the delivered cost, which **is**.

The two figures are individually defensible — netback is the revenue side, desk margin
(€84.52) is netback less producer payable — but a waterfall containing a bar its own
total excludes will be read wrong, and this is the chart shown in a credit meeting.

**Change:** Two separate waterfalls, or one with an explicit subtotal:
```
  Certificate value        +194.16
  Molecule value (TTF)      +31.11    ← currently missing from the chart
  Transfer & registry        −1.43
  Certification              −0.69
  Transit DK → DE            −0.49
  ─────────────────────────────────
  Net netback              +222.66
  Producer payable         −137.89    ← relabel from "Delivered cost"
  ─────────────────────────────────
  Desk margin               +84.77
```
Rename "Delivered cost" to "Producer payable" throughout — it is what is paid to the
producer, not a delivery cost, and the current label is actively misleading.

**Acceptance:** The bars sum to the stated total, verified numerically in a test rather
than by eye.

**Test:** assert `sum(waterfall.bars) === waterfall.total` for a matrix of consignments
and markets.

---

### Task 2.4 — Stop the margin model from being unable to lose money

**Files:** `src/domain/netback/engine.ts:400–408`, `src/domain/marks/simulate.ts:131`

In `INDEX_LINKED` mode:

```ts
producerPayable = netNetback * share;
deskMargin      = netNetback - producerPayable;   // ≡ netNetback * (1 - share)
```

and `simulate.ts:131` seeds `indexLinkedShare: round(between(0.55, 0.75), 2)`.

**Consequences.** Desk margin is a fixed fraction of the netback, so margin% is always
`(1 − share)` regardless of market conditions, and **the desk can never post a loss in
index-linked mode**. The €84.52/MWh margin on the default ticket is not an economic
result; it is a random 0.62 share draw applied to an inflated netback. A P&L model that
cannot produce a loss is not a risk tool.

There is a second-order problem behind it. `computeNetback` calculates the **theoretical
compliance ceiling** — the full value of the quota obligation avoided. In practice the
obligated party retains most of that spread. Market assessments put manure biomethane for
2026 delivery around €142–147/MWh **all-in, molecule and certificate together**, while
this engine values the certificate leg alone at €194/MWh. The modelled certificate is
worth ~35% more than the whole product trades for.

**Change:**
1. `indexLinkedShare` must be a **negotiated contractual term entered by the user**, not
   seeded. Where unset, `producerPayable` is `null` and `missingInputs` gains
   `'producerPricing'` — the engine already does exactly this for the unset case, so
   simply stop seeding it.
2. Make `FIXED_PRICE` the default posture in the UI. A real offtake has a price, and
   fixed-price mode can produce a loss, which is the point.
3. **Add a market-clearing sanity check.** Introduce an optional
   `observedBundlePriceEurPerMwh` on the consignment. When present and
   `netNetback > observedBundlePrice`, attach a warning to the result:
   *"Modelled netback exceeds observed traded price of the bundle — value is not all
   accruing to this trade."* Surface it as a chip on the Trade Builder and Scanner.
   This is a free reality test that requires no subscription and would have caught the
   inflation above.
4. Expose margin in €/MWh **and** as a share of the bundle price, so an implausible
   margin is obvious.

**Acceptance:** With producer pricing unset, the Trade Builder reports desk margin as
unset rather than computing one. A fixed-price ticket above netback shows a negative
margin. The clearing-price warning fires on the default Danish-manure-into-Germany ticket
at current marks.

**Test:** assert `deskMargin < 0` is reachable in `FIXED_PRICE` mode; assert
`missingInputs` contains `'producerPricing'` on a fresh state.

---

### Task 2.5 — Add the tests that would have caught all of the above

**Directory:** `src/domain/__tests__/`

The suite is real — 30 files, 408 tests, adversarial fuzzing, architecture purity — and
entirely self-referential. It asserts the engine matches its own constants. Every finding
in this document survived a green suite.

**Add `src/domain/__tests__/reality_checks.test.ts`:**

| Check | Assertion |
|---|---|
| Gas index plausibility | The seeded/fed TTF falls within €5–200/MWh |
| Comparator by sector | Every market applies the comparator its `sector` requires (Task 2.1) |
| Count reconciliation | No two modules report different plant counts for one country |
| No template data | No `operator` matches `/BioEnergy \(/`; no `legalEntityName` ends `"Ltd/SA"` |
| Commissioning variance | `commissioningYear` is not constant across the plant registry |
| Waterfall closure | Waterfall bars sum to the stated total (Task 2.3) |
| Margin sign reachability | A loss is representable in `FIXED_PRICE` mode (Task 2.4) |
| Citation resolvability | Every `sourceUrl` is a deep link, not a bare domain root (Task 4.4) |

Run these in CI. They are cheap and they are the difference between a suite that proves
internal consistency and one that catches fabrication.

---

## Phase 3 — Rebuild the registry as an origination pipeline

**Goal:** the plant registry generates calls instead of listing names.
**Estimated effort:** 4–6 weeks. **Depends on:** Phase 0.

> **Commercial context.** Germany is removing biomethane from EEG support under the
> EEG 2027 reform, effective 1 January 2027, with dedicated biomethane tenders scrapped
> and no successor mechanism announced. Of roughly 6.6 GW of installed biomass capacity,
> about **5.1 GW comes off its guaranteed twenty-year payment after 2025, falling to
> 2.3 GW by 2030**. Power generation consumed 45% of German biomethane in 2024, a share
> falling since 2017 as volume moves to heat and transport.
>
> That is the deal flow: hundreds of plants losing a subsidy floor on a known clock in
> Europe's largest compliance market. An originator's first question about any plant is
> *"when does its support scheme expire and what does it need to clear afterwards?"* —
> and the registry has no subsidy field at all. This phase is what turns a directory into
> a pipeline, and no competing product has it.

---

### Task 3.1 — Rebuild France from real open data

**Source (verified live, free, no authentication, 6 Sep 2026):** see **Appendix A**.
3,560 records; **800 French sites with 2025 production**. France is 829 of 1,975 rows
(42%) — the largest single fleet in the registry.

**Change:** Write `scripts/ingest_france_odre.py` (or `.ts`) that pulls the dataset,
maps it per Appendix A, and regenerates the French rows of `plantsData.ts`. Match to
existing rows on name + commune, or coordinates where present. Every ingested field
carries `provenance: 'ODRE / GRTgaz — Production annuelle de biométhane par site'` and
the ingestion date.

This yields real legal entities (`METHAMODE SAS`, `Biométhane du Chaunois`), **real
commissioning dates** (`date_de_mes`), and **actual annual production** rather than
nameplate — fixing Task 0.4's `null` for 42% of the registry.

**Acceptance:** ≥750 French plants carry a real `commissioningYear` and a real
`annualEnergyGWh` sourced from ODRE. Re-running the script is idempotent.

---

### Task 3.2 — Extend the plant schema for origination

**File:** `src/domain/plants/types.ts`

Add to `BiomethanePlant`, all nullable, all requiring a source:

```ts
supportScheme?: string | null;              // 'EEG' | 'SDE++' | 'FR_TARIF_ACHAT' | 'CfD' | 'NONE'
supportExpiryDate?: string | null;          // ISO — the origination clock
verifiedCarbonIntensity?: number | null;    // gCO2e/MJ, from the certificate not a default
certificationScheme?: string | null;        // 'ISCC_EU' | 'REDCERT_EU' | 'ISCC_PLUS' | null
certificateNumber?: string | null;
currentOfftakeStatus?: 'CONTRACTED' | 'UNCONTRACTED' | 'PARTIAL' | 'UNKNOWN' | null;
offtakeContractEnd?: string | null;
sourceRefs?: { field: string; source: string; retrievedAt: string }[];
```

`verifiedCarbonIntensity` is the single most commercially important attribute of a
biomethane molecule and the registry currently has no CI field at all — a manure molecule
at −100 and a waste molecule at +20 are entirely different products.

`sourceRefs` is the mechanism that prevents Task 0.4 recurring: a field without a source
entry is not displayed as fact.

---

### Task 3.3 — Build the post-EEG pipeline view

**New:** `src/features/plants/OriginationPipelineScreen.tsx`

German plants ordered by `supportExpiryDate` against the EEG 2027 cliff. Columns:
plant, operator, capacity, feedstock, verified CI, support scheme, **months to expiry**,
current offtake status, best netback across markets (via `computeNetback`), contact.
Filter by expiry window, feedstock and CI band. Export to CSV for call-list use.

This is the screen that generates calls. Prioritise it over further breadth.

**Acceptance:** A trader can answer "which German plants lose support in the next 18
months, have CI below −50, and are uncontracted" in one interaction.

---

### Task 3.4 — Narrow the market coverage

Cross-border traded volume was roughly 2.7 TWh in 2024 — about **5% of EU production**.
There is no Bulgarian, Croatian or Slovenian biomethane market to arbitrage. The current
38 markets across 28 jurisdictions costs depth in the five that carry the volume.

**Change:** Demote markets with `status !== 'ACTIVE'` and negligible volume to a
clearly-labelled "Emerging / not traded" section, excluded from scanner ranking and
netback comparison by default. Concentrate modelling effort on **Germany, France, Italy,
Denmark and the United Kingdom**. Do not delete the others — label them.

---

### Task 3.5 — Give the corridor scanner an origin-specific supply cost

**Files:** `src/domain/arbitrage/engine.ts`, `src/domain/logistics/corridors.ts`

On `#/sourcing`, seven of the top ten corridors into Germany return an **identical**
result: €1.80 transit, €138.58 delivered, +€83.83 margin, €838,300 profit. Denmark,
France, Netherlands, Austria, Czechia, Luxembourg and Poland are indistinguishable,
because the only differentiating variable is a coarse distance-banded transit tariff.

Real origin spreads between these markets are worth €10–30/MWh; transit is worth €1–3.
The scanner sorts on the small term and ignores the large one, so the ranking carries no
information and the headline "peak arbitrage margin" is an artefact of the tariff table.

**Change:**
- Add a per-origin plant-gate cost curve, sourced from Task 3.1/3.2 data plus entered
  marks. Where no origin cost exists, the corridor must rank as `UNPRICEABLE` and sort
  last — **not** default to a shared value.
- Replace the frozen `HUB_BASIS_SPREADS` constants (`corridors.ts:389` — PSV +1.60,
  PVB +1.35, CEGH +1.20, NBP −0.60) with dated marks. PSV–TTF has ranged from under €1
  to over €5/MWh and PVB inverted during the LNG glut; freezing them makes cross-border
  economics wrong in exactly the periods when the arbitrage is worth doing.
- Keep the existing discipline of `null` / `UNVERIFIED` on the six interconnection points
  (8 of 14 tariff records are null). Do not fill them with estimates. Surface the gap.

**Acceptance:** No two corridors with different origins return an identical margin unless
their inputs are genuinely identical.

---

## Phase 4 — Close the loop on a trade

**Goal:** the application can tell you which trades you have already done.
**Estimated effort:** 4–6 weeks. **Depends on:** Phases 1–2.

---

### Task 4.1 — Counterparty master and credit

Current state: `creditLimit` — **zero** occurrences in the codebase. `KYC` — one.
`sanction` — one. There is no counterparty record, no exposure check, no onboarding
state. The app will structure an €845,000 ticket against a counterparty it has never
heard of, while computing a "Delivery Default Replacement Exposure" of €1,763,900 it
cannot attribute to anyone.

**Build** `src/domain/counterparty/`:
- Counterparty record: legal entity, LEI, jurisdiction, onboarding status, master
  agreement in place (EFET / GTMA / other) and its date, credit limit, current exposure,
  sanctions-screening status and screening date.
- Exposure roll-up across open trades; hard block on structuring against a counterparty
  that is unapproved or over limit. **Block, not warn** — a warning is a thing traders
  click through.
- Wire the existing `PrincipalRiskMetrics.replacementCostExposureEur` to the counterparty.

---

### Task 4.2 — Blotter, position and a double-sell guard

**Build** `src/domain/book/`:
- Trade records written on execution: what, with whom, at what price, against which
  mass-balance batch, settling when.
- Certificate inventory by batch with issued / allocated / transferred / retired states.
- **A hard guard preventing the same batch being sold twice.** For a mass-balance product
  this is the cardinal sin, and the application currently has no concept of inventory at
  all.
- Position and mark-to-market by market and vintage. `src/domain/risk/mtmEngine.ts` and
  `varEngine.ts` already exist but their screens are unreachable — `/risk` and `/library`
  both `Navigate` away in `src/app/App.tsx:60,62`. Either wire them up here or delete them.

---

### Task 4.3 — Model the Dutch ERE properly, and add quota trajectories

**ERE.** `NL_ERE` is a single market with one €/kgCO₂e mark. The scheme that replaced HBE
on 1 January 2026 expands four HBE categories into **sixteen ERE ticket types**,
segmented by transport sector — road, inland waterways, maritime — and by feedstock, with
maritime and inland navigation newly in scope. These do not trade at one price, and a
single blended mark cannot answer the first question a Dutch obligated party asks, which
is *which* ticket the molecule generates.

Model the sixteen types with independent marks and a mapping from
`(sector, feedstock, annexClassification)` to ticket type.

**Quota trajectories.** `grep -n "quota\|obligation" src/domain/markets/types.ts` returns
nothing. There is no demand-side model anywhere, yet the trajectories are public:

- **France CPB:** 0.41% of gas sales in 2026 → 1.82% in 2027 → 4.15% in 2028; penalty
  capped at €100/MWh (already correctly modelled as `ceilingEurMwh`).
- **Austria EGG:** rising to 7.7% by 2030, ~7.5 TWh.
- **Germany THG:** GHG-reduction quota trajectory per §37a BImSchG.

Add `quotaTrajectory: { year: number; obligationPct: number; basis: string }[]` to
`Market`. This is what lets the application size the buy side and name who is short —
the question that opens a conversation with an obligated party.

---

### Task 4.4 — Repair the citation library

**Files:** `src/domain/citations/registry.ts`, `src/domain/eligibility/citations.ts`,
`src/domain/offtake/commercialGates.ts`

Of 66 `sourceUrl` values, EU-level citations are properly deep-linked — the RED III ELI,
FuelEU 2023/1805 and the ETS directive all resolve to the instrument. National law
largely does not: Légifrance, Wetten.overheid, Gazzetta Ufficiale, Riksdagen, Finlex and
roughly a dozen others resolve only to the site root. A compliance officer cannot verify
the claim from the link, which is the entire function of a citation library.

More seriously, nine citations point at `efet.org` and six at bilateral trading desks. The heating-value
gate cites *"EFET General Agreement Annex & Institutional Indicative Term Sheet §25.2"* — a specific
section number attached to a document that is not public and, for EFET, does not appear
to have a §25.2 on calorific basis. Precise-looking references to unverifiable documents
survive review unchallenged, which makes them worse than an honest label.

**Change:**
- Deep-link every national citation to the article, or mark it `UNVERIFIED` and drop the
  false precision.
- Replace private-document citations with `"Market convention — not a public instrument"`
  unless the document can actually be produced.
- Add the CI check from Task 2.5 asserting no `sourceUrl` is a bare domain root.

The **substance** of the twelve commercial gates is excellent and must be preserved —
HHV/LHV basis, index specification and discount factor, the CI slider and its α, cost
allocation, conditions precedent, granted options, change in law, each with a quantified
€/MWh impact and the question to put to the counterparty. Very few commercial products
model unpriced optionality in a term sheet. Only the citations need repair, not the logic.

---

## Appendix A — Verified free data sources

All verified working on **6 September 2026**. None require authentication.

### A.1 France — per-site annual biomethane production (ODRE / GRTgaz)

```
GET https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/
    production-annuelle-de-biomethane-par-site-raccorde-au-reseau-de-transport-et-de/records
    ?limit=100&offset=0
```
3,560 records total · **800 sites with 2025 data** · paginate with `limit` / `offset`.

| ODRE field | Type | → `BiomethanePlant` | Notes |
|---|---|---|---|
| `nom_du_site` | string | `name`, `legalEntityName` | **Real legal entities** — `"METHAMODE SAS - SAINT CYR SUR MENTHON - 01"` |
| `date_de_mes` | ISO date | `commissioningYear` | **Real commissioning date** — `"2019-12-05"`. Fixes the constant-2021 fabrication |
| `production_de_biomethane_annuel_mwh_an` | number | `annualEnergyGWh` (÷1000) | **Actual production**, not nameplate |
| `capacite_de_production_gwh_an` | number | — (add `capacityGWhYear`) | Nameplate |
| `commune`, `departement`, `region` | string | `region`, `headquartersAddress` | |
| `grx_demandeur` | string | `networkOperator` | `GRDF` / `GRTgaz` / `Teréga` |
| `type_de_reseau` | string | `gridConnectionType` | `Distribution` / `Transport` |
| `site` | string | `primaryFeedstockCategory` (partial) | e.g. `"Agricole autonome"` |
| `annee` | number | — | Filter to latest year per site |
| `id`, `codepcr` | string | stable join key | Use for idempotent re-ingestion |

Note `erreur_annee: true` appears on some rows — inspect before trusting `annee`.

### A.2 Denmark — daily gas flows including biogas injection (Energinet)

```
GET https://api.energidataservice.dk/dataset/Gasflow?limit=50
```
Verified response for GasDay `2026-09-05`: `KWhFromBiogas: 25,633,271` (≈25.6 GWh/day,
≈9.4 TWh/yr). Also carries `KWhToOrFromGermany`, `KWhToSweden`, `KWhToPoland`,
`KWhFromNorthSea`, `KWhToOrFromStorage` — usable for the corridor and flow screens.
This connector is already correctly configured in `connectorConfig.ts`.

### A.3 Others worth wiring

| Source | What it gives | Access |
|---|---|---|
| **GGCS** (`greengas.org.uk`) | Registered UK green gas producer list, ~120 real company names | Public web page, scrape |
| **AGCS** (`biomethanregister.at`) | Austrian biomethane register statistics | Public |
| **ENTSOG Transparency Platform** | Cross-border flows, IP capacity and tariffs | Free, registration required |
| **GIE / EBA European Biomethane Map** | Plant name, location, capacity — *and nothing else* | Public; note the limit |

### A.4 Price data — the honest position

There is **no free source for biomethane certificate prices**. GGCS states plainly that
contracts and prices for RGGO transfers are arranged privately between counterparties and
that it does not collect, hold or share them. Do not spend engineering time searching for
a public tape; there isn't one.

| Path | Cost | Notes |
|---|---|---|
| **Broker runs** | Free | STX, ACT Commodities, AFS Energy, Vertis, Marex, Landwärme. Get on the distribution lists. Parser already exists — Task 1.1 |
| **Quantum Commodity Intelligence** / **Veyt** | Low–mid | Biomethane and European certificate coverage at a fraction of Argus/Platts. Buy first |
| **Argus Renewable Gas & Power** / **Platts** | High | Once volume justifies it |
| **TTF only** — Databento (ICE Endex TFM) or OilPriceAPI (free tier, 10k requests) | Free–low | Task 1.2 |

### A.5 Reference values for sanity-checking

| Quantity | Value | As of |
|---|---|---|
| TTF front-month | **€72–74/MWh** | 3–4 Sep 2026 |
| German THG 2026 (THG-Other) | ~€260/tCO₂e, having rallied ~55% then a further ~20% in Jun 2025 | 2025–26 |
| Manure biomethane, 2026 delivery, all-in | **€142–147/MWh** (molecule + certificate) | 2026 assessment |
| French CPB expected market price | €80–100/MWh, hard-capped at €100 penalty | 2026 launch |
| AD biomethane production cost | €50–175/MWh | Range across Europe |
| EU cross-border traded biomethane | ~2.7 TWh, ~5% of production | 2024, ERGaR |
| EU biogas + biomethane production | 22 bcm (EU-27: 19 bcm) | 2024, EBA |

Use A.5 as the basis for the plausibility guards in Task 2.5.

---

## Appendix B — Sequencing and effort

| Phase | Effort | Depends on | External spend |
|---|---|---|---|
| 0 — Truth in labelling | 2–3 days | — | €0 |
| 1 — Real prices | 2–3 weeks | Phase 0 | €0 (broker runs) – low (TTF feed) |
| 2 — Engine defects | 1–2 weeks | — (parallel with 1) | €0 |
| 3 — Origination pipeline | 4–6 weeks | Phase 0 | €0 (open data) |
| 4 — Trade lifecycle | 4–6 weeks | Phases 1–2 | — |

**Minimum credible milestone — roughly two weeks, no spend:** Tasks 0.1–0.8, 0.2's ODRE
fix extended into 3.1, 1.1 broker-run import, 1.2 TTF feed, and 2.4's market-clearing
check. That produces an application whose every displayed number is either real or
labelled, priced off broker runs a desk actually receives, with France rebuilt from
government open data.

**Do not start at Phase 3 or 4.** The visible new capability is there, which is exactly
why it is the wrong place to begin. Every hour spent on features while Phase 0 stands is
an hour spent making a more convincing wrong answer.
