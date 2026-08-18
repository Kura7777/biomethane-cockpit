# BRIEFING — 2026-08-17T21:03:45+07:00

## Mission
Survey all mathematical engines, formulas, pricing mechanisms, tariffs, FX, commodity indices, multipliers, netbacks, and test suites in the European Biomethane Cockpit codebase.

## 🔒 My Identity
- Archetype: explorer
- Roles: math_engines_surveyor
- Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_math_1\
- Original parent: cc02f76f-3415-41e8-82df-f038a1212d8f
- Milestone: milestone_1_survey

## 🔒 Key Constraints
- Read-only investigation — do NOT modify production source code
- Produce structured 5-component handoff report
- Check tests, vulnerabilities, unit mismatches, formula fidelity

## Current Parent
- Conversation ID: cc02f76f-3415-41e8-82df-f038a1212d8f
- Updated: 2026-08-17T21:03:45+07:00

## Investigation State
- **Explored paths**:
  - `src/domain/netback/engine.ts`, `src/domain/netback/ranking.ts`, `src/domain/netback/types.ts`
  - `src/domain/logistics/engine.ts`, `src/domain/logistics/corridors.ts`, `src/domain/logistics/types.ts`
  - `src/domain/markets/registry.ts`, `src/domain/markets/constants.ts`, `src/domain/markets/types.ts`
  - `src/domain/arbitrage/engine.ts`, `src/domain/arbitrage/origins.ts`, `src/domain/arbitrage/types.ts`
  - `src/domain/marks/simulate.ts`
  - `src/domain/trade/summary.ts`, `src/domain/trade/licensing.ts`, `src/domain/trade/types.ts`
  - `src/domain/consignment/feedstocks.ts`, `src/domain/consignment/types.ts`
  - `src/domain/eligibility/gates/ghg-threshold.ts`, `src/domain/eligibility/gates/market-specific.ts`
  - `src/domain/__tests__/engine.test.ts`, `src/domain/__tests__/logistics.test.ts`
  - `src/features/trade-builder/TradeBuilderScreen.tsx`, `src/features/opportunity-scanner/ScannerScreen.tsx`, `src/features/marks/MarksScreen.tsx`
  - `src/store/context.tsx`
- **Key findings**:
  - 60 automated unit tests exist in Vitest across 2 test files, 100% passing.
  - Complete mathematical verification matrix constructed across all 6 units of account (`EUR_PER_TCO2E`, `EUR_PER_KG_CO2E`, `EUR_PER_MWH`, `EUR_PER_CIC`, `GBP_PER_DRTFC`, `EUR_PER_TCO2E_DEFICIT`).
  - Discovered UI/Engine discrepancy in `TradeBuilderScreen.tsx` (German 1x multiplier branch halved already 1x netback, FuelEU preset ID mismatch `EU_FUELEU_2025` vs `FUELEU`).
  - Discovered UI hardcoded fallback defaults in `ScannerScreen.tsx` and `MarksScreen.tsx`.
  - Identified edge-case vulnerabilities (division by zero if `shipActualCI = 0` in FuelEU model, missing fuzz tests for extreme negative CI and large volumes).
- **Unexplored areas**: None in math engines scope.

## Key Decisions Made
- Executed automated Vitest test suite (`npm test` via cmd.exe) — 60 tests passed in 3.13s.
- Detailed all conversion formulas, constant derivations, and tariff accumulations for inclusion in handoff report.

## Artifact Index
- handoff.md — Comprehensive math engines survey report
- progress.md — Real-time progress heartbeat
- DISPATCH.md — Task assignment record
