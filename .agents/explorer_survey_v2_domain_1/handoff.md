# V2 Domain Architecture Survey & Handoff Report

## Executive Summary
This report presents a thorough, read-only architectural investigation of the **European Biomethane Desk Cockpit** codebase to support the implementation of **V2 features**:
1. **R1: European Registry & Balance of Trade Hub** (dena, VertiCer, Energinet, Enagás, GSE, injection volumes, cancelations, cross-border transfers, mockable connector interfaces, baseline datasets, UDB title transfer verification).
2. **R2: Biomethane vs. TTF Natural Gas Spread & Forward Curve Analytics** (TTF M+1, Quarterly, Calendar curves, basis spreads vs German THG, Dutch ERE, French CPB, Italian CIC, UK RTFO, pure `computeNetback` integration).
3. **R4: Multi-Branch What-If Sensitivity Simulator** (TTF shocks ±10%/±20%, German THG double-counting repeal, UK UDB recognition, quota cap modifications, non-destructive execution under single pricing authority invariants).
4. **Invariants Verification**: 100% pass rate across all 160 tests, 0 React dependencies in `src/domain/`, strict enforcement of zero unsourced decimal coefficients and zero synthetic fallback pricing.

---

## 1. Observation

### 1.1 Test Suite & Baseline Integrity
Execution of the project test runner (`npx.cmd vitest run`) reveals:
```
 RUN  v3.2.7 C:/Users/Chris's PC/OneDrive/Desktop/Biomethane Tool (Gemini)

 ✓ src/domain/__tests__/logistics.test.ts (10 tests) 41ms
 ✓ src/domain/__tests__/challenger_regulatory_stress.test.ts (21 tests) 63ms
 ✓ src/domain/__tests__/adversarial-stress.test.ts (24 tests) 91ms
 ✓ src/domain/__tests__/e2e_trading_workflows.test.ts (34 tests) 175ms
 ✓ src/domain/__tests__/sourcingAdapter.test.ts (8 tests) 649ms
 ✓ src/domain/__tests__/engine.test.ts (56 tests) 111ms
 ✓ src/domain/__tests__/architecture.test.ts (7 tests) 66ms

 Test Files  7 passed (7)
      Tests  160 passed (160)
   Duration  4.40s
```

### 1.2 Existing Registry Models vs R1 Requirements
- **Jurisdiction Registry Registry Data**: In `src/domain/markets/registry.ts`, 24 European jurisdictions have metadata attributes:
  - Germany: `registry: 'dena Biogasregister / UBA'` (line 31)
  - Netherlands: `registry: 'NEa REV / myVertiCer'` (line 54)
  - France: `registry: 'EEX'` (line 77)
  - Italy: `registry: 'GSE'` (line 123)
  - Denmark: `registry: 'Energinet'` (line 146)
  - Spain: `registry: 'Enagás GTS'` (line 261)
  - United Kingdom: `registry: 'DfT RTFO Registry / GGCS'` (line 445)
- **Plant Data**: `src/domain/plants/registry.ts` (65,886 lines, 1,975 plant entries) and `src/domain/plants/verifiedPlants.ts` store plant-level registry information (`networkOperator`, `certificationAndRegistry`, `gridConnectionType`, `primaryFeedstockCategory`).
- **Origin Profiles**: `src/domain/arbitrage/origins.ts` (lines 3–115) defines `PRODUCING_ORIGINS` for DK, DE, FR, NL, ES, IT, GB, SE, FI, AT, BE, PL, CZ, HU, IE, PT, RO, BG with `primaryRegistry` and `gridZone: 'EU_INTERCONNECTED' | 'NON_EU_ISOLATED'`.
- **UDB Eligibility Gate**: `src/domain/eligibility/gates/udb.ts` evaluates consignment `injectionIsEU` and `udbStatus` (`RECORDED` | `PENDING` | `NOT_RECORDED`). Lines 29–40 enforce a strict `HARD_BLOCK` if `!consignment.injectionIsEU` under Regulation (EU) 2024/2792 & RED III Art. 31a.
- **R1 Gaps Identified**:
  - No domain abstraction for registry certificate lifecycles (issuance, transfer, cancellation/retirement, balance of trade).
  - No normalized data structures for batch injection volume data (MWh, Nm³, heating value, injection point TSO/DSO).
  - No inter-registry transfer protocol models (ERGaR, EECS-Gas, bilateral recognition).
  - No mockable connector interface (`IRegistryConnector`) or realistic baseline dataset for registry transactions.
  - No explicit multi-stage UDB title transfer verification state machine (`DRAFT` -> `SUBMITTED` -> `ESCROW_LOCKED` -> `TRANSFERRED` | `REJECTED`).

### 1.3 Basis Spreads & Forward Curve Analytics vs R2 Requirements
- **Gas Index & Marks State**: `src/domain/netback/types.ts` (lines 106–136) defines `GasIndexMark` (`bid`, `offer`, `mid`, `updatedAt`, `provenance`), `FxMark`, and `MarksState`.
- **Valuation Engine**: `src/domain/netback/engine.ts` (lines 111–270) computes `computeCertificateValue` across 6 units of account:
  - `EUR_PER_TCO2E` (Germany THG, EU ETS1) via `tCO2ePerMWh(ci)`: `((94.0 - ci) * 3600) / 1,000,000`
  - `EUR_PER_KG_CO2E` (Netherlands ERE): `co2eTonnes * 1000`
  - `EUR_PER_MWH` (France CPB with €100.00/MWh ceiling clamping, Austria, Spain, Denmark, Sweden, Poland)
  - `EUR_PER_CIC` (Italy CIC): 5.815 MWh/CIC for Annex IX-A advanced vs 11.63 MWh/CIC for conventional
  - `GBP_PER_DRTFC` (UK RTFO): 72.0 kg/MWh biomethane LHV derivation (144.0 dRTFC/MWh for double-counted waste) with GBP/EUR FX conversion
  - `EUR_PER_TCO2E_DEFICIT` (FuelEU Maritime): Deficit-closure model per Reg (EU) 2023/1805
- **Netback Calculation**: `computeNetback` (lines 276–601) calculates `netNetback = certVal + moleculeVal - totalCosts` at chosen pricing sides (`bid`, `mid`, `offer`), deriving `producerPayable`, `deskMargin`, `marginPercent`, `deskPnL`, and `uncertaintyBranches`.
- **R2 Gaps Identified**:
  - `MarksState` only holds a single prompt TTF Month+1 mark; no forward curve matrix exists for M+1, M+2, Quarterly (Q1, Q2, Q3, Q4), or Calendar (Cal+1, Cal+2, Cal+3) tenors.
  - Forward curve basis spread analytics across delivery periods are not structured into a pure domain function.
  - No forward delivered value stack decomposition model (Molecule + Certificate - Logistics Tariff = Delivered Value) across forward tenors.

### 1.4 What-If Sensitivity Simulation Mechanics vs R4 Requirements
- **Existing Scenario Support**: `src/domain/arbitrage/types.ts` (lines 93–98) and `engine.ts` (lines 15–20) define `RegulatoryWhatIfScenario`:
  - `deDoubleCounting: 'DC_OFF' | 'DC_ON'`
  - `ukUdbRecognition: boolean`
  - `fuelEUEscalationYears: 1 | 2 | 3 | 4`
  - `frCpbPenaltyCap: number`
- **Existing Uncertainty Branches**: `src/domain/netback/engine.ts` (lines 425–548) generates `uncertaintyBranches` for German THG (`DC_OFF` vs `DC_ON`) when compliance year >= 2026.
- **R4 Gaps Identified**:
  - No multi-variable sensitivity simulator for TTF gas price shocks (±10%, ±20%), statutory quota adjustments, or macroeconomic FX swings.
  - What-if logic is partially coupled to `arbitrage/engine.ts` rather than a unified, stand-alone sensitivity simulation engine.
  - Simulator must be purely functional: accepts base marks, applies parameter perturbations without mutating store state, and runs all evaluations through `computeNetback`.

### 1.5 Architecture & Purity Invariants
- **Architecture Test Inspection**: `src/domain/__tests__/architecture.test.ts` actively guards:
  - Line 98: Banning certificate value arithmetic outside `domain/netback/` (`/(certificateValue|valueEurPerMWh)\s*\)?\s*[*+\-/]\s*[\w(]/`).
  - Line 107: Banning `deskMargin` assignment outside `domain/netback/`.
  - Line 119: Banning all React imports inside `domain/` (`/\bfrom\s+['"]react(-dom)?['"]/`).
  - Line 157: Banning unsourced decimal coefficients (exempting documented constants in `ALLOWED_COEFFICIENTS`).
  - Line 173: Banning manufactured fallbacks in null-coalescing (`/\?\?[^;\n]*[*/]\s*\d/`).
  - Line 185: Banning price-shaped literal substitution (`/\?\?\s*-?\d+\.\d+/`).

---

## 2. Logic Chain

```
[Observation 1.1: 160 passing tests & strict architecture test suite]
  └── Invariant integrity is 100% intact; new V2 domain engines must be pure functions co-located in `src/domain/` with zero React dependencies and zero unsourced constants.

[Observation 1.2: Registries exist only as metadata strings in Market/Plant/Origin definitions]
  └── R1 requires a dedicated European Registry Hub domain model:
      ├── Define `src/domain/registries/types.ts` (Certificate issuance, injection batches, cancellation/retirement, balance of trade, UDB title transfer statuses).
      ├── Define normalized connector interface `RegistryConnector` with mockable implementations (dena, VertiCer, Energinet, Enagás, GSE).
      ├── Supply realistic European baseline datasets (`src/domain/registries/baselineData.ts`).
      └── Implement UDB title transfer verification logic (`verifyUDBTransfer()`).

[Observation 1.3: TTF is a single scalar prompt mark in `MarksState`; `computeNetback` is the sole pricing authority]
  └── R2 requires a dynamic Forward Curve & Basis Spread domain module:
      ├── Define forward curve data structures (`ForwardCurveTenor`: M+1, M+2, Q1..Q4, Cal+1..Cal+3; `ForwardCurveMatrix`).
      ├── Create pure domain engine `src/domain/curves/engine.ts` that iterates tenors and computes basis spreads via `computeNetback`.
      └── Maintain zero client-side arithmetic: UI screens simply render the curve structures returned by the domain engine.

[Observation 1.4: Scenario modeling exists as fragmented overrides in `arbitrage/engine.ts`]
  └── R4 requires a generalized Multi-Branch Sensitivity Simulator:
      ├── Define `src/domain/sensitivity/types.ts` (TTF shocks ±10%/±20%, DE double-counting toggle, UK UDB treaty toggle, quota cap shifts).
      ├── Implement `src/domain/sensitivity/engine.ts` to generate non-destructive scenario matrices.
      └── Ensure every scenario evaluation invokes `computeNetback` on isolated input copies, preserving single pricing authority and immutability.
```

---

## 3. Detailed Survey & Architectural Recommendations

### 3.1 R1: Registry & Balance of Trade Hub
To fulfill R1 without disrupting existing models, introduce `src/domain/registries/`:

```
src/domain/registries/
├── types.ts              # Core registry types, transfer schemas, issuance batches, UDB statuses
├── connectors.ts         # Mockable connector interface & registry-specific adapters (dena, VertiCer, Energinet, Enagás, GSE)
├── baselineData.ts       # Realistic European registry transaction datasets
├── udbVerification.ts    # UDB title transfer verification & cross-border compatibility validator
└── index.ts              # Clean barrel exports
```

#### Core Schema Design:
```typescript
export type RegistryId = 'DENA' | 'VERTICER' | 'ENERGINET' | 'ENAGAS' | 'GSE' | 'EEX' | 'AGCS' | 'GGCS_UK';

export type CertificateTransferProtocol = 
  | 'ERGAR_COO'          // European Renewable Gas Registry Scheme
  | 'AIB_EECS_GAS'       // Association of Issuing Bodies
  | 'UDB_DIRECT_TRANSFER'// Union Database mass balance single area
  | 'BILATERAL_RECOGNITION'
  | 'DOMESTIC_ONLY';

export type UDBTitleTransferStatus = 
  | 'NOT_APPLICABLE'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ESCROW_LOCKED'
  | 'TITLE_TRANSFERRED'
  | 'REJECTED_BOUNDARY_VIOLATION'
  | 'REJECTED_DISCREPANCY';

export interface RegistryAccount {
  registryId: RegistryId;
  registryName: string;
  countryCode: string;
  accountHolderId: string;
  accountHolderName: string;
  currentBalanceMWh: number;
  availableForExportMWh: number;
  reservedEscrowMWh: number;
}

export interface InjectionBatch {
  id: string;
  plantId: string;
  plantName: string;
  originCountry: string;
  registryId: RegistryId;
  injectionPointId: string;
  meteringPeriod: { startDate: string; endDate: string };
  volumeMWh: number;
  volumeNm3: number;
  grossCalorificValueKwhNm3: number;
  feedstockCategory: string;
  feedstockDetails: string;
  annexClassification: 'IX_A' | 'IX_B' | 'CROP' | 'OTHER';
  verifiedCI: number; // gCO2e/MJ
  sustainabilityProofId: string;
  certificationScheme: string;
  udbRegistrationId: string | null;
  gridInterconnectionStatus: 'TSO_HIGH_PRESSURE' | 'DSO_DISTRIBUTION' | 'OFF_GRID_SEGREGATED';
  issuedAt: string;
  status: 'ISSUED' | 'TRANSFERRED' | 'CANCELLED_RETIRED' | 'SURRENDERED_COMPLIANCE';
}

export interface CrossBorderTransferRequest {
  id: string;
  sourceRegistry: RegistryId;
  sourceAccountId: string;
  targetRegistry: RegistryId;
  targetAccountId: string;
  targetMarketId: string;
  batchIds: string[];
  totalVolumeMWh: number;
  transferProtocol: CertificateTransferProtocol;
  udbTitleTransferRequired: boolean;
  requestedAt: string;
}

export interface RegistryTransferVerification {
  isCompatible: boolean;
  protocol: CertificateTransferProtocol;
  udbTitleTransferStatus: UDBTitleTransferStatus;
  blockingReasons: string[];
  auditNotes: string[];
}
```

---

### 3.2 R2: Basis Spreads & Forward Curve Analytics
To fulfill R2, expand `src/domain/curves/` or `src/domain/netback/curves.ts`:

```
src/domain/curves/
├── types.ts              # Forward tenors (Prompt M+1, M+2, Q1..Q4, Cal+1..Cal+3), ForwardCurveMatrix
├── forwardMarks.ts       # Forward marks structure and market baseline forward curves
├── engine.ts             # Multi-tenor forward netback and basis spread calculator
└── index.ts
```

#### Tenor & Forward Curve Structure:
```typescript
export type DeliveryTenor = 
  | 'M_PLUS_1' 
  | 'M_PLUS_2' 
  | 'Q1' 
  | 'Q2' 
  | 'Q3' 
  | 'Q4' 
  | 'CAL_PLUS_1' 
  | 'CAL_PLUS_2' 
  | 'CAL_PLUS_3';

export interface TenorDefinition {
  tenor: DeliveryTenor;
  label: string;
  category: 'PROMPT' | 'QUARTER' | 'CALENDAR';
  deliveryYear: number;
  quarter?: number;
  month?: number;
}

export interface TenorBasisSpread {
  tenor: DeliveryTenor;
  tenorLabel: string;
  deliveryYear: number;
  gasIndexPriceEurPerMwh: number;     // TTF Forward Mark
  certificateValueEurPerMwh: number;  // Evaluated via computeCertificateValue
  logisticsTariffEurPerMwh: number;
  totalDeliveredValueEurPerMwh: number; // Molecule + Cert - Logistics
  commercialBasisSpreadEurPerMwh: number; // Delivered Value - TTF Base
  deskMarginEurPerMwh: number | null;
  uncertaintySpreadEurPerMwh?: number | null; // e.g. DE THG 1x vs 2x delta
}
```

---

### 3.3 R4: Multi-Branch Sensitivity Simulator
To fulfill R4, introduce `src/domain/sensitivity/`:

```
src/domain/sensitivity/
├── types.ts              # Shock parameters, sensitivity branch definitions, simulation result matrices
├── engine.ts             # Pure functional simulation evaluator calling computeNetback across parameter space
└── index.ts
```

#### Simulation Parameter & Matrix Structure:
```typescript
export interface SensitivityShockConfig {
  ttfPriceShockPercent: -20 | -10 | 0 | 10 | 20;
  deDoubleCounting: 'DC_OFF' | 'DC_ON';
  ukUdbRecognition: boolean;
  frCpbCeilingEurMwh: number; // e.g. 80, 100, 120
  nlEreQuotaMultiplier: number; // e.g. 1.0, 1.2
  fxShockPercent: number; // e.g. -5, 0, +5%
}

export interface MarketSensitivityResult {
  marketId: string;
  marketName: string;
  baselineNetback: number | null;
  shockedNetback: number | null;
  netbackDeltaEurPerMwh: number | null;
  baselineDeskMargin: number | null;
  shockedDeskMargin: number | null;
  marginDeltaEurPerMwh: number | null;
  notionalDeltaEur: number | null;
  isTradeable: boolean;
  verdict: string;
}
```

---

## 4. Caveats
1. **Read-Only Scope**: This survey makes zero modifications to application code. All blueprints and interfaces proposed are structured for implementation subagents.
2. **Architecture Test Invariants**: Any new calculation or coefficient added during V2 implementation must either:
   - Reside strictly in `src/domain/netback/engine.ts` or approved domain engines; OR
   - Be registered with statutory rationale in `architecture.test.ts:ALLOWED_COEFFICIENTS`.
3. **Synthetic vs Researched Data**: All baseline datasets for forward curves and registry batches must be stamped with provenance `sourceType: 'ESTIMATE'` or `sourceName: 'SIMULATED'` unless backed by verified statutory/exchange sources.

---

## 5. Conclusion
- The domain core is in state: 160/160 tests passing, 0 React dependencies in `src/domain/`, strict single pricing authority enforcement.
- The path to V2 is clearly mapped across 3 modular additions:
  1. `src/domain/registries/`: Data models, connectors, baseline batches, and UDB verification (R1).
  2. `src/domain/curves/`: Forward curve tenors, forward marks, and basis spread waterfall (R2).
  3. `src/domain/sensitivity/`: Functional scenario stress-testing engine (R4).

---

## 6. Verification Method
To independently verify this investigation:
1. **Run Test Suite**:
   ```powershell
   npx.cmd vitest run
   ```
   *Expected result*: 7 passed files, 160 passed tests.
2. **Verify Architecture Invariants**:
   ```powershell
   npx.cmd vitest run src/domain/__tests__/architecture.test.ts
   ```
   *Expected result*: 7 passed tests confirming domain purity, zero React in domain, single pricing authority.
3. **Inspect Domain Files**:
   - `src/domain/markets/registry.ts`
   - `src/domain/netback/engine.ts`
   - `src/domain/eligibility/gates/udb.ts`
   - `src/domain/arbitrage/engine.ts`
