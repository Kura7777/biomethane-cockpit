# Milestone 2 (R2) Handoff Report: Biomethane vs. TTF Spread & Curve Analytics

## 1. Observation

### 1.1 Domain Architecture & Implementation
The pure functional domain module `src/domain/curves/` has been implemented with 0 React dependencies, preserving single pricing authority and deterministic RED III calculation integrity:

1. **`src/domain/curves/types.ts`**:
   - `DeliveryTenor`: `'M_PLUS_1' | 'M_PLUS_2' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'CAL_PLUS_1' | 'CAL_PLUS_2' | 'CAL_PLUS_3'`
   - `TenorCategory`: `'PROMPT' | 'QUARTER' | 'CALENDAR'`
   - `TenorDefinition`: `tenor`, `label`, `shortLabel`, `category`, `deliveryYear`, `quarter`, `month`, `deliveryPeriod`, `startDate`, `endDate`, `description`.
   - `ForwardGasMark`: High-density forward TTF gas mark with bid, offer, mid, and provenance.
   - `ForwardCertificateMark`: Per-market forward certificate marks with provenance.
   - `ForwardFxMark`: Forward FX cross marks (GBP/EUR, CHF/EUR) with provenance.
   - `ForwardCurveMatrix`: Composite mapping of gas forward curve, certificate forward curves, and FX forward curves.
   - `TenorBasisSpread`: Comprehensive forward basis spread structure holding TTF gas index, certificate value, logistics tariff, gross delivered value, commercial basis spread vs TTF, desk margin, producer payable, policy uncertainty spread, and detailed breakdown.
   - `DeliveredValueBreakdown`: Waterfall component values (`moleculeValueEurPerMwh`, `certificateValueEurPerMwh`, `logisticsEurPerMwh`, `transferAndRegistryFeesEurPerMwh`, `otherCostsEurPerMwh`, `totalCostsEurPerMwh`, `grossDeliveredValueEurPerMwh`, `ttfBaseEurPerMwh`, `basisSpreadEurPerMwh`).
   - `ForwardCurveParams`: Parameter contract for forward evaluations.

2. **`src/domain/curves/forwardMarks.ts`**:
   - `TENOR_DEFINITIONS`: Complete list of 9 delivery tenor definitions across prompt months (Sep/Oct 2026), quarterly contracts (Q1..Q4 2027), and calendar baseload strips (Cal 2027..2029).
   - Baseline realistic forward curves:
     - TTF Natural Gas Forward Curve (€/MWh): M+1 (€33.50), M+2 (€34.20), Q1 (€36.80 winter peak), Q2 (€31.20), Q3 (€30.80), Q4 (€35.40), Cal+1 (€33.60), Cal+2 (€31.50), Cal+3 (€29.80).
     - DE THG Quota Forward Curve (€/tCO2e): M+1 (€340) to Cal+3 (€400) reflecting §37a BImSchG statutory quota escalations.
     - NL ERE Renewable Energy Units (€/kgCO2e): M+1 (€0.350) to Cal+3 (€0.410).
     - FR CPB French Transport Biométhane (€/MWh): M+1 (€82.50) to Cal+3 (€90.00) respecting the €100.00/MWh statutory ceiling.
     - IT CIC Quota (€/CIC): M+1 (€325) to Cal+3 (€375).
     - UK RTFO (GBP/dRTFC): M+1 (£0.225) to Cal+3 (£0.275).
     - Additional active markets: DK GO, ES GO, AT GO, EU ETS1.
     - Forward FX crosses: GBP/EUR (1.172..1.180), CHF/EUR (1.058..1.068).
     - Explicit provenance tags: `sourceType: 'ESTIMATE' | 'EXCHANGE_AUCTION' | 'PRICE_REPORTING'`, `sourceName: 'SIMULATED' | 'EEX_HISTORICAL'`.
   - Utility functions: `getDefaultForwardCurveMatrix()`, `buildForwardCurveMatrix()`, `getTenorDefinition()`, `getTenorsByCategory()`.

3. **`src/domain/curves/engine.ts`**:
   - `computeForwardBasisSpreads(params: ForwardCurveParams): TenorBasisSpread[]`:
     - Builds isolated, tenor-specific `MarksState` structures and routes all valuations strictly through `computeNetback(market, consignment, tenorMarksState, costs, pricingSides)`.
     - Derives `commercialBasisSpreadEurPerMwh = Delivered Netback - TTF Gas Index Price`.
     - Decomposes delivered value into molecule base, certificate premium, logistics tariffs, and registry fees.
     - Extracts policy uncertainty spreads (e.g. German THG double-counting 1x vs 2x branches).
   - `computeAllMarketsForwardSpreads()`: Evaluates multi-market forward spreads in bulk.
   - `buildDeliveredValueBreakdown()`: Generates normalized waterfall breakdown objects.

4. **`src/domain/curves/index.ts`**:
   - Clean barrel export of all curve types, constants, and engines.

### 1.2 Unit & Architecture Test Results
Unit tests in `src/domain/__tests__/curves.test.ts` (10 tests) and the full test suite were executed via `npx.cmd vitest run`:
```
 RUN  v3.2.7 C:/Users/Chris's PC/OneDrive/Desktop/Biomethane Tool (Gemini)

 ✓ src/domain/__tests__/logistics.test.ts (10 tests)
 ✓ src/domain/__tests__/registries.test.ts (14 tests)
 ✓ src/domain/__tests__/curves.test.ts (10 tests)
 ✓ src/domain/__tests__/challenger_regulatory_stress.test.ts (21 tests)
 ✓ src/domain/__tests__/adversarial-stress.test.ts (24 tests)
 ✓ src/domain/__tests__/e2e_trading_workflows.test.ts (34 tests)
 ✓ src/domain/__tests__/sourcingAdapter.test.ts (8 tests)
 ✓ src/domain/__tests__/engine.test.ts (56 tests)
 ✓ src/domain/__tests__/architecture.test.ts (7 tests)

 Test Files  9 passed (9)
      Tests  184 passed (184)
```

### 1.3 UI Integration & Design System Compliance
1. **`src/features/marks/ForwardCurveAnalytics.tsx`**:
   - Segmented Tenor Selector (`All (9 Tenors)`, `PROMPT`, `QUARTER`, `CALENDAR`).
   - Target Market quick filter buttons (DE THG, NL ERE, FR CPB, IT CIC, UK RTFO, DK GO, ES GO, AT GO).
   - Pricing Side Selector (BID / MID / OFFER) and Consignment indicator.
   - 4 KPI cards: TTF Gas Curve Structure (Contango/Backwardation index), Selected Market Prompt Delivered Netback, Prompt Basis Spread (+€/MWh over TTF), Desk Margin & Cal+1 Outlook.
   - **Forward Curve Step/Line Visualizer**: SVG multi-curve graph comparing TTF forward curve against Green Biomethane delivered value curves across delivery tenors with interactive data points.
   - **Delivered Value Stack & Waterfall**: Detailed decomposition panel showing `[+] TTF Molecule`, `[+] Certificate Value`, `[-] Logistics`, `[-] Registry Fees`, `[=] Delivered Netback Value`, `[=] Commercial Basis Spread (vs Brown TTF)`, policy uncertainty spread, and 1-click "Structure Forward Trade ➔" action.
   - **Cross-Market Forward Basis Spread Matrix**: High-density table sorting delivery tenors, categories, periods, TTF gas marks, certificate values, delivered netbacks, commercial basis spreads, desk margins, and uncertainty ranges.
2. **`src/features/marks/MarksScreen.tsx`**:
   - Integrated dual-mode toolbar switch between `MARKS MATRIX` and `CURVE & SPREAD ANALYTICS`.
3. **Design System**: Strict stone dark palette (`stone-950/900/800`), `.font-num` on tabular figures, `text-micro` floor, zero raw hex, full WCAG contrast.
4. **Build Compilation**: `npm.cmd run build` passes cleanly with code-split Vite production bundles.

---

## 2. Logic Chain

```
[Requirement R2: TTF vs Biomethane Forward Spread & Curve Analytics]
  │
  ├── 1. Pure Functional Domain Core (`src/domain/curves/`)
  │      ├── `types.ts`: Defined 9 standard tenors ('M_PLUS_1'..'CAL_PLUS_3'), ForwardCurveMatrix, TenorBasisSpread, DeliveredValueBreakdown.
  │      ├── `forwardMarks.ts`: Realistic baseline forward curves for TTF, DE THG, NL ERE, FR CPB, IT CIC, UK RTFO with explicit provenance tags.
  │      └── `engine.ts`: Pure `computeForwardBasisSpreads` iterating tenors, constructing isolated MarksState, and delegating all pricing directly to `computeNetback`.
  │
  ├── 2. Architecture & Purity Invariants
  │      ├── Single Pricing Authority: Zero certificate value arithmetic in UI or curves engine; all economics produced by `computeNetback`.
  │      ├── Zero React in Domain: `src/domain/curves/` contains 0 React imports.
  │      └── Zero Fabricated Fallbacks: All marks tagged with genuine provenance (`EEX_HISTORICAL`, `PRICE_REPORTING`, `SIMULATED`).
  │
  ├── 3. Comprehensive Unit Testing (`src/domain/__tests__/curves.test.ts`)
  │      ├── Multi-tenor coverage across Prompt, Quarter, and Calendar.
  │      ├── French CPB statutory ceiling (€100/MWh) clamping verified.
  │      ├── German THG dual counting uncertainty branches (DC_OFF vs DC_ON) verified.
  │      ├── UK RTFO GBP/EUR forward FX handling verified.
  │      └── Missing mark and null safety verified (10/10 tests pass).
  │
  └── 4. High-Density UI Terminal Integration (`src/features/marks/`)
         ├── `MarksScreen.tsx`: Dual-mode toggle between `MARKS MATRIX` and `CURVE & SPREAD ANALYTICS`.
         └── `ForwardCurveAnalytics.tsx`: Interactive SVG forward curve chart, delivered value waterfall stack, and cross-market basis spread matrix.
```

---

## 3. Caveats

1. **Synthetic vs Researched Forward Marks**: Forward curves for compliance certificates (THG, ERE, CPB, CIC, RTFO) represent realistic European market estimates and are stamped with provenance `sourceType: 'ESTIMATE' | 'PRICE_REPORTING'`, `sourceName: 'SIMULATED' | 'EEX_HISTORICAL'`. When live broker API feeds or exchange hooks become available, `buildForwardCurveMatrix` accepts custom real-time curve feeds seamlessly.
2. **Deterministic RED III Invariant**: Forward curve analytics compute delivered netback for a specific consignment profile (e.g. Danish Manure -100 CI), dynamically adapting certificate values per MWh according to statutory greenhouse gas savings formulas.

---

## 4. Conclusion

- Milestone 2 (R2: Biomethane vs. TTF Natural Gas Spread & Curve Analytics) is complete.
- Pure domain engine `src/domain/curves/` provides 100% React-free forward curve modeling across all 9 European delivery tenors.
- UI in `src/features/marks/` delivers interactive forward curve step/line visualizers, delivered value waterfall stacks, and cross-market basis spread matrices.
- 100% test pass rate across all 184 tests (including all 7 architecture invariant guards) and 0 TypeScript compilation errors.

---

## 5. Verification Method

To independently verify this milestone:
1. **Run Full Test Suite**:
   ```powershell
   npx.cmd vitest run
   ```
   *Expected result*: 9 test files passed, 184 tests passed.

2. **Verify Architecture Invariants**:
   ```powershell
   npx.cmd vitest run src/domain/__tests__/architecture.test.ts
   ```
   *Expected result*: 7/7 architecture tests passed (single pricing authority, zero React in domain, zero unsourced coefficients).

3. **Verify Forward Curve Unit Tests**:
   ```powershell
   npx.cmd vitest run src/domain/__tests__/curves.test.ts
   ```
   *Expected result*: 10/10 curve tests passed.

4. **Verify TypeScript Compilation & Production Build**:
   ```powershell
   npm.cmd run build
   ```
   *Expected result*: Clean Vite bundle emitted in `dist/` with 0 type errors.
