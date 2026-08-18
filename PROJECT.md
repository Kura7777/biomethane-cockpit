# Project: Biomethane Trading Intelligence Platform V2

## Architecture
The European Biomethane Desk Cockpit V2 is a high-density, professional-grade trading terminal, deterministic RED III regulatory compliance engine, and decision support operating system for biomethane sales traders, originators, and compliance desks across 24 European jurisdictions.

```
src/
├── app/                  # Routing (HashRouter), Lazy Loading, Terminal Shell Layout, Hotkeys (1-0)
├── domain/               # 100% Pure Functional Domain Engines (Zero React dependencies):
│   ├── eligibility/      # 6 Regulatory Gates (Scheme, UDB, CoC, Feedstock, GHG, Market)
│   ├── netback/          # Single Pricing Authority (computeNetback, FX, Multipliers, Ceilings)
│   ├── logistics/        # Interconnection Point Tariffs, Pipeline Shrinkage, Virtual Bio-LNG
│   ├── markets/          # 24 Jurisdictions, 32 Market Frameworks & Statutory Quotas
│   ├── consignment/      # Feedstock Registry, CI Defaults, Sustainability Proofs
│   ├── citations/        # Statutory Legal Citation Registry (30+ enacted articles)
│   ├── arbitrage/        # Commercial Margin Models, Multi-Agent Desk Copilot
│   ├── registries/       # R1: European Registry Hub (dena, VertiCer, Energinet, Enagás, GSE, UDB title transfer)
│   ├── curves/           # R2: Forward Curve & Basis Spread Analytics (Prompt M+1/M+2, Q1..Q4, Cal+1..Cal+3)
│   ├── briefing/         # R3: Daily Morning Market Briefing & Overnight Movers Synthesis
│   └── sensitivity/      # R4: Multi-Branch What-If Sensitivity Simulator (TTF shocks, Regulatory toggles)
├── features/             # Interactive High-Density Terminal Screens:
│   ├── sourcing/         # Screen 1: Sourcing Desk & Morning Market Briefing Overlay
│   ├── scanner/          # Screen 2: Opportunity Scanner / Arbitrage Ladder
│   ├── map/              # Screen 3: Pan-European Compliance & Trade Flow Map
│   ├── trade-builder/    # Screen 4: Trade Builder, Term Sheet & What-If Simulator Panel
│   ├── arbitrage-agents/ # Screen 5: Desk Copilot / Multi-Agent Assistant Drawer
│   ├── plants/           # Screen 6: 1,975 Verified Plants Registry & European Registry Hub
│   ├── marks/            # Screen 7: Forward Marks Matrix & Curve/Spread Analytics
│   ├── trade-library/    # Screen 8: Trade Library, Dossiers & Audit Packs
│   ├── citations/        # Screen 9: Statutory Legal Citations Library
│   └── settings/         # Screen 10: Desk Settings, FX & Engine Configuration
├── shared/               # Reusable UI Components (ErrorBoundary, Chips, Modals, Drawer)
└── store/                # Multi-version state store with version migrations & quarantine
```

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | R1: European Registry Data Models | Transaction lifecycles (issuance batches, cancellations, retirements, cross-border flows) for Germany (dena), Netherlands (VertiCer), Denmark (Energinet), Spain (Enagás), Italy (GSE) | M1 | Survey (Domain) | VERIFIED |
| 2 | R1: Mockable Connector Interfaces | `IRegistryConnector` interface and mockable connector adapters for dena, VertiCer, Energinet, Enagás, GSE | M1 | Survey (Domain) | VERIFIED |
| 3 | R1: Baseline Registry Datasets | Realistic, verified European baseline injection and certificate datasets | M1 | Survey (Domain) | VERIFIED |
| 4 | R1: UDB Title Transfer Verification | Multi-stage title transfer state machine (`DRAFT` -> `SUBMITTED` -> `ESCROW_LOCKED` -> `TRANSFERRED` / `BLOCKED`) adhering to RED III Art. 31a & Reg (EU) 2024/2792 | M1 | Survey (Domain/Reg) | VERIFIED |
| 5 | R1: Balance of Trade Hub UI | High-density visual matrix, overview cards, and flow ledger tracking net exporter/importer flows in `PlantsScreen` | M1 | Survey (UI) | VERIFIED |
| 6 | R2: Forward Curve Data Models | Tenor structures for Prompt (M+1, M+2), Quarterly (Q1..Q4), and Calendar (Cal+1..Cal+3) forward curves | M2 | Survey (Domain) | VERIFIED |
| 7 | R2: Dynamic Forward Basis Spread Engine | Pure functional waterfall computing delivered value stacks and basis spreads via `computeNetback` | M2 | Survey (Domain) | VERIFIED |
| 8 | R2: Forward Curve Visualizer | Comparative step/line chart rendering TTF vs delivered value curves across target markets in `MarksScreen` | M2 | Survey (UI) | VERIFIED |
| 9 | R2: Delivered Value Stack Breakdown | High-density waterfall breakdown (Molecule + Certificate - Logistics - Fees) over forward tenors | M2 | Survey (UI) | VERIFIED |
| 10 | R3: Morning Market Briefing Engine | Automated synthesis of 24h overnight price movements, mark staleness alerts, and regulatory consultation updates | M3 | Survey (Domain/Reg) | VERIFIED |
| 11 | R3: Top-3 Arbitrage Corridors & Origination | Live scan of top-margin European arbitrage corridors linked to origination queue | M3 | Survey (Domain) | VERIFIED |
| 12 | R3: 1-Click Deal Structuring | Instant parameter pass-through from briefing/scanner to Trade Builder pre-filling deal structuring and term sheets | M3 | Survey (UI) | VERIFIED |
| 13 | R3: Morning Briefing Desk UI | High-density morning briefing screen/modal with scannable mover cards, freshness alerts, and action triggers | M3 | Survey (UI) | VERIFIED |
| 14 | R4: Multi-Branch Sensitivity Engine | Pure functional simulator evaluating TTF shocks (±10%, ±20%), DE THG double counting repeal (1x/2x), UK UDB treaty, and statutory caps without mutating base state | M4 | Survey (Domain) | VERIFIED |
| 15 | R4: Single Pricing Authority Invariant | Strict routing of all scenario calculations through `computeNetback` with zero client-side math shortcuts | M4 | Survey (Domain/Arch) | VERIFIED |
| 16 | R4: What-If Sensitivity Simulator UI | Interactive scenario control bar, preset chips, live parameter sliders, and comparison matrix in Trade Builder & Sourcing | M4 | Survey (UI) | VERIFIED |
| 17 | UX: High-Density Terminal Aesthetics | Dark stone palette, Inter/JetBrains Mono typography, `.font-num` tabular figures, <100ms load time, hotkeys 1-0 | M1..M4 | Survey (UI) | VERIFIED |
| 18 | Dual-Track 5-Tier Test Suite | 5-tier requirement-driven and adversarial stress test suite covering R1-R4 features + 160 baseline tests (248/248 passing) | M5 | Survey (All) | VERIFIED |
| 19 | Forensic Integrity Audit & Certification | Forensic integrity audit certifying zero cheating, 100% domain purity, and production readiness | M6 | Survey (All) | VERIFIED |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | R1: European Registry & Balance of Trade Hub | Domain models (`src/domain/registries/`), mockable connectors (dena, VertiCer, Energinet, Enagás, GSE), baseline datasets, UDB title transfer verification, Registry Hub & Balance of Trade UI in `PlantsScreen` | none | DONE |
| M2 | R2: Biomethane vs. TTF Spread & Curve Analytics | Forward curve tenors (M+1/M+2, Q1..Q4, Cal+1..Cal+3), forward marks, pure basis spread engine (`src/domain/curves/`), forward curve visualizer & delivered value stack in `MarksScreen` | M1 | DONE |
| M3 | R3: Morning Market Briefing & Origination Desk | Morning briefing synthesis engine (`src/domain/briefing/`), overnight movers, staleness warnings, regulatory tracker, top 3 corridors, 1-click deal structuring action to Trade Builder | M2 | DONE |
| M4 | R4: Multi-Branch What-If Sensitivity Simulator | Stand-alone pure sensitivity engine (`src/domain/sensitivity/`), TTF price shocks (±10%, ±20%), regulatory toggles, What-If scenario control bar & comparison matrix in Trade Builder | M2, M3 | DONE |
| M5 | E2E Testing Track & 5-Tier Stress Hardening | 5-Tier comprehensive E2E test suite (Feature coverage, Boundary cases, Combinatorial, Real-world scenarios, Adversarial fuzzing) verifying R1-R4 + 160 baseline tests (248/248 passing) | M1, M2, M3, M4 | DONE |
| M6 | Forensic Integrity Audit & Production Readiness | Forensic integrity verification (`teamwork_preview_auditor`), zero-cheating attestation, React-free domain purity check, build & latency verification | M5 | DONE |

## Interface Contracts
### Registry Engine (`src/domain/registries/`) ↔ UI & Trade Systems
- `verifyRegistryTransfer(req: CrossBorderTransferRequest): RegistryTransferVerification`
  - Validates transfer protocol compatibility (ERGaR, EECS-Gas, UDB Direct, Bilateral) between source and target registries.
  - Returns `isCompatible`, `udbTitleTransferStatus`, `blockingReasons`, `auditNotes`.
- `IRegistryConnector.fetchInjectionBatches(filter?: BatchFilter): Promise<InjectionBatch[]>`
  - Returns normalized batch records with origin country, plant ID, volume MWh/Nm3, GCV, feedstock, verified CI, UDB status.

### Forward Curve Engine (`src/domain/curves/`) ↔ Marks & Scanner Screens
- `computeForwardBasisSpreads(params: ForwardCurveParams): TenorBasisSpread[]`
  - Computes delivered value stacks and commercial basis spreads across all delivery tenors (M+1, M+2, Q1..Q4, Cal+1..Cal+3) strictly using `computeNetback`.

### What-If Sensitivity Engine (`src/domain/sensitivity/`) ↔ Trade Builder & Sourcing
- `evaluateSensitivityScenario(consignment: Consignment, market: Market, shock: SensitivityShockConfig, marks: MarksState): MarketSensitivityResult`
  - Evaluates non-destructive scenario shocks without mutating base marks or state store.
  - Returns baseline vs shocked netback, delta €/MWh, delta desk margin, and notional P&L delta.

## Code Layout
- Domain logic: `src/domain/` (pure functions, zero React dependencies)
  - `src/domain/registries/` (R1)
  - `src/domain/curves/` (R2)
  - `src/domain/briefing/` (R3)
  - `src/domain/sensitivity/` (R4)
  - `src/domain/netback/` (Single pricing authority)
  - `src/domain/eligibility/` (6 Regulatory gates)
- Feature UI: `src/features/`
  - `src/features/plants/` (Plants & Registry Hub)
  - `src/features/marks/` (Marks Matrix & Forward Curve Analytics)
  - `src/features/sourcing/` & `src/features/briefing/` (Sourcing & Morning Briefing)
  - `src/features/trade-builder/` (Trade Builder & What-If Simulator)
- Store & Context: `src/store/`
- Test Suites: `src/domain/__tests__/` and `src/__tests__/`
