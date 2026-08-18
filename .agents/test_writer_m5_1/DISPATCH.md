## 2026-08-18T01:19:07+07:00
You are the Test Writer subagent for Milestone 5 (E2E Testing Track & 5-Tier Stress Hardening).

Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\test_writer_m5_1\
Authoritative request: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\ORIGINAL_REQUEST.md
Project plan: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\PROJECT.md
Test infrastructure doc: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\TEST_INFRA.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Implement a comprehensive 5-Tier E2E test suite in `src/domain/__tests__/e2e_v2_five_tier.test.ts` (or `src/__tests__/e2e_v2_suite.test.ts`):
   - **Tier 1 (Feature Coverage)**: Happy path tests for all V2 features (R1: Registry Hub issuance, transfers, balance of trade; R2: Forward curves M+1/Q/Cal, basis spread waterfall; R3: Morning market briefing, overnight movers, staleness, 1-click deal structuring; R4: What-If simulator presets, TTF shocks, regulatory toggles).
   - **Tier 2 (Boundary & Corner Cases)**: Edge cases across all features (Deep negative CI down to -150 gCO2e/MJ, non-EU grid gas UDB blocking, French CPB €100 ceiling clamping, FuelEU 4-year escalation, missing FX rates, zero/null volume).
   - **Tier 3 (Cross-Feature Combinations)**: Pairwise tests linking Registry flows with Forward Curve tenors and What-If scenario shocks.
   - **Tier 4 (Real-World Application Scenarios)**: Complete trader workflows:
     - Scenario A: Danish manure biomethane export via Energinet to German dena/THG under Q3 forward curve with TTF +20% shock.
     - Scenario B: Spanish slurry biomethane via Enagás to French CPB with €100 ceiling clamp and 1-click deal structuring to term sheet.
     - Scenario C: UK food waste virtual pipeline (Bio-LNG) to Dutch ERE with GBP/EUR FX conversion and UDB title transfer verification.
     - Scenario D: Italian manure advanced biomethane (5.815 MWh/CIC yield) under GSE floor and FuelEU maritime deficit closure.
   - **Tier 5 (Adversarial Stress & Fuzzing)**: Fuzzing random market combinations, extreme gas prices (TTF €10..€150/MWh), malformed registry payloads, and negative CI limits.
2. Publish `TEST_READY.md` at repository root summarizing test counts per tier, feature checklist, test runner command, and pass/fail semantics.
3. Run the complete test suite (`npx vitest run`) to verify that all existing tests (207 tests) plus all new 5-tier tests pass with 100% success.
4. Write your complete handoff report to `c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\test_writer_m5_1\handoff.md` and report back with send_message.
