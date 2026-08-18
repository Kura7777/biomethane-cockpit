## 2026-08-18T01:13:00Z
You are Worker subagent for Milestone 4 (R4: Multi-Branch What-If Sensitivity Simulator).

Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\worker_m4_1\
Authoritative request: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\ORIGINAL_REQUEST.md
Project plan: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\PROJECT.md
Survey findings: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_domain_1\handoff.md and c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_ui_1\handoff.md

Tasks:
1. Implement pure domain module `src/domain/sensitivity/`:
   - `types.ts`: `SensitivityShockConfig`, `SensitivityPreset`, `MarketSensitivityResult`, `ConsignmentSensitivityMatrix`, `ScenarioComparison`, `SensitivityParams`.
   - `presets.ts`: Standard preset scenarios (`BASE_CASE`, `TTF_BULL_20`, `TTF_BEAR_20`, `DE_DC_REPEAL_1X`, `UK_UDB_ACCORD`, `FR_CPB_CAP_SHIFT`, `FUELEU_YEAR_2`, `FX_STRESS_GBP`).
   - `engine.ts`: Pure functional engine (`evaluateSensitivityScenario`, `runSensitivityMatrix`, `compareScenarios`):
     - Takes base marks and applies non-destructive scenario perturbations (TTF shocks ±10%/±20%, German THG 1x vs 2x branches, UK UDB treaty status, statutory CPB ceiling, FX shocks).
     - Computes all shocked netbacks, margins, and notional P&L deltas strictly through `computeNetback` on isolated input copies, preserving single pricing authority and immutability.
   - `index.ts`: Barrel export.
2. Implement comprehensive unit tests in `src/domain/__tests__/sensitivity.test.ts` testing TTF shocks (±10%, ±20%), German THG double-counting repeal, UK UDB recognition toggle, French CPB ceiling adjustments, FuelEU penalty escalation, immutability of base marks, and single pricing authority adherence.
3. Integrate into UI:
   - Create `src/features/trade-builder/WhatIfSensitivityPanel.tsx` and embed it in `src/features/trade-builder/TradeBuilderScreen.tsx` (and optionally make accessible from `SourcingScreen.tsx`).
   - Features:
     - Scenario Control Bar with Quick Preset chips (`Base Case`, `TTF Bull (+20%)`, `TTF Bear (-20%)`, `DE DC Repeal (1x)`, `UK UDB Accord`, `FuelEU Yr 2`).
     - Interactive controls (TTF % shock slider/step buttons `[-30%...+30%]`, German THG 1x/2x toggle, UK UDB treaty toggle, French CPB cap input, FX shock slider).
     - Sensitivity Comparison Matrix showing Base Value vs Shocked Value vs Δ €/MWh, Base Margin vs Shocked Margin vs Δ €/MWh, Notional P&L Variance (€), and Compliance Verdict.
     - Uncertainty range indicator.
   - Adhere strictly to `design-system/MASTER.md` (stone-950/900/800 dark palette, .font-num on figures, text-micro floor, zero raw hex).
4. Run tests and verify:
   - Run `npx vitest run` to ensure all existing tests + new sensitivity tests pass 100%.
   - Run `npm run build` or `npx tsc -b` to ensure clean compilation.
5. Write your complete handoff report to `c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\worker_m4_1\handoff.md` and report back with send_message.
