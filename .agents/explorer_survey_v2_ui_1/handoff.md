# Frontend & UI Architecture Survey Report — Biomethane Trading Intelligence Platform V2

## 1. Observation

### 1.1 Application Shell, Routing & Keyboard Navigation
- **File**: `src/app/App.tsx` (Lines 6–45)
  - Uses `HashRouter` with `React.lazy` and `<Suspense fallback={<LoadingScreen />}>` code-splitting across all modules.
  - Currently defines 10 core routes:
    - `/` → `MapScreen`
    - `/sourcing` → `SourcingScreen`
    - `/trade` → `TradeBuilderScreen`
    - `/scanner` → `ScannerScreen`
    - `/agents` → `ArbitrageAgentsScreen`
    - `/plants` → `PlantsScreen`
    - `/marks` → `MarksScreen`
    - `/library` → `LibraryScreen`
    - `/citations` → `CitationsScreen`
    - `/settings` → `SettingsScreen`
- **File**: `src/app/Layout.tsx` (Lines 16–70, 105–252)
  - Keyboard listener handles hotkeys `1` to `0` when not typing in form controls:
    ```typescript
    if (e.key === '1') navigate('/sourcing');
    if (e.key === '2') navigate('/scanner');
    if (e.key === '3') navigate('/');
    if (e.key === '4') navigate('/trade');
    if (e.key === '5') navigate('/agents');
    if (e.key === '6') navigate('/plants');
    if (e.key === '7') navigate('/marks');
    if (e.key === '8') navigate('/library');
    if (e.key === '9') navigate('/citations');
    if (e.key === '0') navigate('/settings');
    ```
  - Layout includes:
    - Sticky Header (52px) with Brand Block, Nav Tabs with hotkey hints, Pricing Side Selector (BID/MID/OFFER), and Staleness counts (>30d red, >7d amber, fresh green).
    - Ticker Strip (28px) with TTF M+1, DE THG, NL ERE, FR CPB, IT CIC, GBP/EUR, CI ACTIVE, MARKS FRESH.
    - Main Viewport (`<Outlet />` inside `<ErrorBoundary>`).
    - Global `<FloatingAgentDrawer />`.
    - Footer (26px) with regulatory baseline references and navigation reminders.

### 1.2 Styling, Theme & Design System Tokens
- **File**: `src/index.css` (Lines 13–47, 68–128) & `design-system/MASTER.md`
  - Strict dark theme using only the `stone` neutral ramp:
    - `--color-surface-base`: `stone-950`
    - `--color-surface-raised`: `stone-900`
    - `--color-surface-overlay`: `stone-800`
    - `--color-border-subtle`: `stone-800`
    - `--color-border-default`: `stone-700`
    - `--color-content-primary`: `stone-100`
    - `--color-content-secondary`: `stone-400`
    - `--color-content-muted`: `stone-500` (decorative only; WCAG AA floor requires >= `stone-400` for readable text)
  - Semantic accents:
    - `teal`: Interactive CTA / active nav / focus rings
    - `emerald`: Favourable outcome / PASS / ELIGIBLE / Fresh mark / in-the-money
    - `amber`: Warning / CONDITIONAL / >7d stale
    - `red`: Blocking / HARD_BLOCK / >30d stale / loss
    - `sky`: Unresolved / informational
  - Typography:
    - Prose: `Inter`
    - Numeric data & tables: `JetBrains Mono` with `.font-num` (`font-variant-numeric: tabular-nums; letter-spacing: -0.02em;`)
    - Scale floor: `text-micro` (10px), `text-meta` (11px), `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (18px), `text-xl` (20px), `text-2xl` (24px). No arbitrary pixel sizes.
    - Radii: panels square (0px), buttons/chips `rounded` (4px), dots `rounded-full`.

### 1.3 State Management & Domain Architecture Invariants
- **File**: `src/store/context.tsx` (Lines 30–56, 95–317)
  - `AppState` manages schema version (currently v8), marks, consignments, active consignment, cost inputs, saved assessments, and selected market.
  - State auto-syncs to `localStorage` with migration pipelines.
- **File**: `src/domain/__tests__/architecture.test.ts` (Lines 94–191)
  - Architectural guards strictly verify:
    1. Single pricing authority: `computeNetback` is the ONLY function that calculates certificate values and netbacks.
    2. React-free purity: `src/domain/` contains zero React imports.
    3. No unsourced decimal coefficients.
    4. No manufactured values in null-coalescing fallbacks.
    5. No price-shaped literal fallbacks outside `domain/marks/simulate.ts`.
- **Test execution**: All 160 domain and architecture tests pass in `vitest run` (`npm.cmd test`).

---

## 2. Logic Chain & Architecture Mapping for V2 Requirements

### 2.1 R1: European Registry & Balance of Trade Hub UI
- **Objective**: Track certificate issuance, injection volumes, cancelations, and cross-border transfers across European registries (dena Biogasregister, VertiCer, Energinet, Enagás, GSE) with normalized flow schemas and UDB status indicators.
- **Frontend Integration Point**:
  - Extend `src/features/plants/PlantsScreen.tsx` (or add a dedicated sub-view) with a 4th tab: **`REGISTRIES` / `BALANCE OF TRADE`**.
- **Component Architecture**:
  1. `RegistryOverviewCards`: Metric cards showing Total Certificate Issuance (TWh), Domestic Injection (TWh), Active Cancellations (TWh), and Net Cross-Border Trade Balance (Net Exporter / Importer status).
  2. `BalanceOfTradeMatrix`: High-density tabular and comparative bar view showing net balances across DK (Net Exporter), DE (Net Importer), NL (Net Importer), FR (Balanced), IT (Emerging Importer), ES (Net Exporter).
  3. `RegistryFlowLedger`: Filterable table of realistic verified registry flow batches with columns:
     - Registry ID & Operator (e.g. `DENA-DE-2026-X1`, `VERTICER-NL-2026-F4`, `ENERGINET-DK-2026-B2`)
     - Feedstock Category chip (Manure, Food waste, Agricultural residues, Sewage sludge, Crops)
     - Injection Grid Type (`INTERCONNECTED_TSO`, `DISTRIBUTION`, `VIRTUAL`)
     - Volume (MWh / GWh)
     - UDB Title Transfer Status badge (`RECORDED`, `PENDING_INGESTION`, `CROSS_BORDER_TRANSIT`, `BLOCKED`)
     - Mutual Recognition Protocol (`ERGaR`, `BILATERAL`, `UDB_DIRECT`)
  4. `CrossBorderCompatibilityMatrix`: Visual grid indicating transfer feasibility between each origin and destination registry.

### 2.2 R2: Biomethane vs. TTF Spread & Curve Analytics UI
- **Objective**: Model and visualize the dynamic commercial basis spread between natural gas molecule indices (TTF M+1, Q1..Q4, Cal+1..Cal+3 forward curves) and compliance certificates over prompt and forward delivery periods.
- **Frontend Integration Point**:
  - Extend `src/features/marks/MarksScreen.tsx` with a dual-mode view: **`MARKS MATRIX`** and **`CURVE & SPREAD ANALYTICS`**.
- **Component Architecture**:
  1. `ForwardPeriodSelector`: Segmented switch for `Prompt (M+1)` | `Quarterly (Q1, Q2, Q3, Q4)` | `Calendar (Cal 2026, Cal 2027, Cal 2028)`.
  2. `ForwardCurveVisualizer`:
     - Comparative step/line chart rendering TTF brown gas forward curve vs Green Biomethane delivered value curves across target markets (DE THG, NL ERE, FR CPB, IT CIC, UK RTFO).
  3. `DeliveredValueStack`:
     - High-density stacked breakdown bar / waterfall:
       - Baseline Gas Molecule (TTF forward mark)
       - Certificate Value (€/MWh derived strictly via `computeNetback`)
       - GHG Savings Bonus
       - Minus: Logistics & Interconnection Tariffs
       - Minus: Registry & Transfer Fees
       - Net Delivered Basis Spread (Spread vs Brown Gas = `Netback - TTF`)
  4. `MarketSpreadTable`: High-density table sorting markets by Gross Delivered Value, Basis Spread (€/MWh), and Desk Margin.

### 2.3 R3: Morning Market Briefing & Actionable Origination Desk
- **Objective**: Deliver an automated daily morning briefing synthesizing overnight price movements, fresh mark staleness warnings, regulatory consultation updates, top 3 arbitrage corridors, and 1-click deal structuring.
- **Frontend Integration Point**:
  - Can be surfaced as an executive top-level briefing widget / modal or integrated into the landing workflow (e.g. at `SourcingScreen` top rail or a dedicated `MorningBriefing` overlay accessible via hotkey / header button).
- **Component Architecture**:
  1. `MorningBriefingHeader`: Date stamp, desk status, and macro summary (TTF overnight movement, FX cross delta).
  2. `OvernightMoversGrid`: Scannable cards highlighting 24h delta in TTF, German THG, Dutch ERE, French CPB, Italian CIC, UK RTFO.
  3. `MarkFreshnessAlerts`: Real-time tally of fresh vs warning vs critically stale marks with quick "Refresh Mark" trigger.
  4. `RegulatoryConsultationTracker`: Card stream tracking key regulatory milestones (e.g. 38. BImSchV German double-counting draft status, UK UDB agreement negotiations, FuelEU 2025 enforcement rules).
  5. `Top3ArbitrageCorridors`: Sourced live from `scanEuropeanArbitrage`:
     - Corridor 1: e.g. DK Manure ➔ DE THG (Desk Margin: €17.77/MWh)
     - Corridor 2: e.g. DK Manure ➔ NL ERE (Desk Margin: €16.93/MWh)
     - Corridor 3: e.g. ES Slurry ➔ FR CPB (Desk Margin: €2.61/MWh)
  6. `OneClickDealStructuringAction`:
     - "Structure Trade" button on each corridor executing `navigate('/trade?originCountry=DK&feedstock=manure&ci=-100&marketId=DE_THG&volume=120000')`, instantly opening the Trade Builder pre-filled with parameters and generating a formal term sheet and sourcing note.

### 2.4 R4: Multi-Branch What-If Sensitivity Simulator UI
- **Objective**: Enable instant scenario stress-testing for trading decisions (TTF gas price shocks ±10% / ±20%, German THG double counting repeal, UK UDB recognition agreement, statutory quota cap modifications, FuelEU penalty escalation) with live netback recalculation while preserving the single pricing authority.
- **Frontend Integration Point**:
  - Integrated into `src/features/trade-builder/TradeBuilderScreen.tsx` and `src/features/sourcing/SourcingScreen.tsx` as an interactive **Sensitivity & Scenario Simulator Panel**.
- **Component Architecture**:
  1. `ScenarioControlBar`:
     - Quick Preset Chips: `Base Case`, `TTF Bull (+20%)`, `TTF Bear (-20%)`, `DE DC Repeal (1x)`, `UK UDB Accord`, `FuelEU Yr 2 (+10%)`.
  2. `InteractiveScenarioSliders`:
     - TTF Gas Price Shock: Slider `[-30% ... +30%]` with step buttons `±10%`, `±20%`.
     - German THG Multiplier: Segmented toggle `1× Single Count` vs `2× Double Count`.
     - UK UDB Interconnection Accord: Boolean toggle.
     - French CPB Statutory Ceiling: Number input / presets (`€80`, `€100`, `€120/MWh`).
     - FuelEU Non-Compliance Escalation: Year selector (Yr 1: 0%, Yr 2: +10%, Yr 3: +20%, Yr 4: +30%).
  3. `SensitivityComparisonMatrix`:
     - Side-by-side comparison table: Base Value vs Simulated Value vs Net Variance (Δ €/MWh and Δ Total P&L).
  4. `UncertaintyRangeBar`:
     - Visual min/max valuation corridor bar displaying the spread between conservative and upside policy branches.

### 2.5 Performance & UX Architecture
- **Performance**:
  - Load time < 100ms achieved through lightweight bundling, zero heavy UI frameworks, native CSS variables via Tailwind v4 `@theme`, lazy-loaded route splits, and memoized pure arithmetic calls.
  - Tabular figure numbers with `.font-num` ensure column stability without jitter during fast updates.
- **Accessibility & Theme Compliance**:
  - Strict compliance with `design-system/MASTER.md`:
    - Strict `stone` neutral palette (no `slate`, `gray`, `zinc`).
    - Minimum 10px text size (`text-micro`).
    - Explicit `aria-label` on all interactive controls.
    - Keyboard hotkeys `1` to `0` mapped across primary screens.
    - Escape closes modals and drawers.

---

## 3. Caveats

1. **Deterministic Single Pricing Authority**:
   - The frontend must NEVER perform certificate-value or netback arithmetic in React components. All scenario recalculations must pass scenario-adjusted parameters through `computeNetback` or `scanEuropeanArbitrage`.
2. **Mark Provenance & Synthetic Baselines**:
   - Baseline registry data and forward curve marks must be tagged with explicit provenance (`sourceType: 'ESTIMATE' | 'PRICE_REPORTING' | 'EXCHANGE_AUCTION'`, `sourceName: 'SIMULATED' | 'PLATFORM_HISTORY'`) to maintain transparency.
3. **No Unlicensed Third-Party Pricing Data**:
   - Public forward curve structures and registry datasets must use realistic, defensible European industry benchmarks (e.g. GIE/EBA 2026, EEX, VertiCer, Energinet public statistics) without infringing on proprietary PRA redistribution restrictions.

---

## 4. Conclusion & Recommended Implementation Blueprint

The existing V1 frontend architecture is solid, highly modular, strictly typed, and cleanly decoupled from the pure domain core. Implementing V2 involves straightforward, high-value extensions:

| Requirement | Target Feature & UI Modules | Core Architectural Changes |
|---|---|---|
| **R1: European Registry Hub** | `src/features/plants/` + `src/domain/plants/` | Add Registry Hub tab, European Balance of Trade visual matrix, Registry Flow ledger, and UDB Title Transfer status tracking. |
| **R2: Spread & Curve Analytics** | `src/features/marks/` + `src/domain/netback/` | Add Forward Curve Visualizer (M+1, Q1..Q4, Cal+1..Cal+3), Delivered Value Stack waterfall, and Basis Spread comparison tables. |
| **R3: Morning Market Briefing** | `src/features/sourcing/` / `src/features/briefing/` + `src/features/trade-builder/` | Add automated Morning Briefing screen/widget with overnight movers, staleness warnings, regulatory tracker, top 3 corridors, and 1-click deal structuring. |
| **R4: What-If Sensitivity Simulator** | `src/features/trade-builder/` + `src/features/sourcing/` | Add interactive Scenario Simulator panel with TTF gas shock sliders, policy toggles, live netback recalculation via `computeNetback`, and comparison matrices. |
| **UX & Performance** | `src/app/Layout.tsx`, `src/index.css`, `src/shared/` | Maintain <100ms load time, strict stone dark palette, high-density terminal typography (`.font-num`, `text-micro` floor), and full keyboard navigation (1–0). |

---

## 5. Verification Method

To independently verify the frontend architecture and system integrity:
1. **Automated Test Suite**:
   ```powershell
   npm.cmd test
   ```
   *Expected outcome*: All 160 domain, logistics, arbitrage, and architecture invariant tests pass with 0 failures.
2. **Architecture Guards Inspection**:
   - Inspect `src/domain/__tests__/architecture.test.ts` to confirm zero React imports in `src/domain/`, zero certificate arithmetic in UI layers, and zero unsourced coefficients.
3. **TypeScript Compilation & Build Verification**:
   ```powershell
   npm.cmd run build
   ```
   *Expected outcome*: Zero type errors, clean Vite production bundle generated in `<dist/` with code-split chunks.
4. **Design System Linting**:
   - Verify all CSS classes in UI components adhere to `design-system/MASTER.md` (no raw hex codes, strict `stone` palette, no `text-[Npx]`, no `py-0.2`, `.font-num` on numeric figures).
