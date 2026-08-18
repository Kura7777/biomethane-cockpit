# E2E Test Strategy & 5-Tier Verification Framework: V2

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived strictly from `ORIGINAL_REQUEST.md` and user-facing trading/regulatory invariants.
- **Methodology**: Category-Partition + Boundary Value Analysis + Pairwise Combinatorial Testing + Real-World Workload Testing + White-Box Adversarial Fuzzing.
- **Zero Regression**: All 160 baseline domain, logistics, and architecture tests must pass at every iteration.

## Feature Inventory & Test Matrix
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Workload) | Tier 5 (Adversarial) |
|---|---------|-------------|:----------------:|:-----------------:|:-----------------:|:-----------------:|:--------------------:|
| 1 | R1: European Registry Data Models | dena, VertiCer, Energinet, Enagás, GSE schemas | 5 | 5 | ✓ | ✓ | ✓ |
| 2 | R1: Mockable Connectors & Baseline Datasets | Connector interface, batch queries, normalizations | 5 | 5 | ✓ | ✓ | ✓ |
| 3 | R1: UDB Title Transfer State Machine | DRAFT -> TRANSFERRED, RED III Art. 31a non-EU block | 5 | 5 | ✓ | ✓ | ✓ |
| 4 | R1: Balance of Trade Hub UI | Overview cards, matrix, ledger, export/import balances | 5 | 5 | ✓ | ✓ | ✓ |
| 5 | R2: Forward Curve Data Models & Tenors | Prompt M+1/M+2, Q1..Q4, Cal+1..Cal+3 | 5 | 5 | ✓ | ✓ | ✓ |
| 6 | R2: Dynamic Forward Basis Spread Engine | Delivered value stack, pure computeNetback calls | 5 | 5 | ✓ | ✓ | ✓ |
| 7 | R2: Forward Curve Visualizer & UI | Step/line visualizer, waterfall breakdown | 5 | 5 | ✓ | ✓ | ✓ |
| 8 | R3: Daily Morning Market Briefing Engine | Overnight movers, mark staleness, regulatory alerts | 5 | 5 | ✓ | ✓ | ✓ |
| 9 | R3: Top-3 Arbitrage Corridors & Origination | Live scan, margin ranking, origination queue | 5 | 5 | ✓ | ✓ | ✓ |
| 10 | R3: 1-Click Deal Structuring Action | Parameter pass-through to Trade Builder, term sheets | 5 | 5 | ✓ | ✓ | ✓ |
| 11 | R4: Multi-Branch Sensitivity Engine | TTF shocks ±10%/±20%, DE 1x/2x, UK UDB treaty | 5 | 5 | ✓ | ✓ | ✓ |
| 12 | R4: Single Pricing Authority Invariant | Immutability, zero client arithmetic shortcuts | 5 | 5 | ✓ | ✓ | ✓ |
| 13 | R4: Sensitivity Simulator UI | Control bar, presets, sliders, comparison matrix | 5 | 5 | ✓ | ✓ | ✓ |
| 14 | Architecture & Purity Invariants | Zero React in domain, zero unsourced literals, <100ms load | 5 | 5 | ✓ | ✓ | ✓ |

## Test Tier Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 test cases per feature covering standard operational happy paths.
- **Tier 2 (Boundary & Corner Cases)**: ≥5 test cases per feature covering boundary limits, empty inputs, non-EU grid blocks, negative CI, price caps.
- **Tier 3 (Cross-Feature Combinations)**: Combinatorial pairwise tests combining registry flows, forward curve tenors, and sensitivity shocks.
- **Tier 4 (Real-World Application Scenarios)**: Realistic end-to-end trading workflows (e.g. Danish manure export to German THG under Q3 forward curve with TTF +20% shock; UK food waste virtual pipeline to Dutch ERE).
- **Tier 5 (Adversarial Stress & Fuzzing)**: Fuzzing random market combinations, extreme commodity price spikes, deep negative carbon intensities (-150 gCO2e/MJ), and malformed registry payloads.
