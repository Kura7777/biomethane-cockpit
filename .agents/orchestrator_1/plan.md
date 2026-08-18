# Biomethane Trading Intelligence Platform V2 Delivery Plan

## Objectives
Deliver the complete V2 scope per ORIGINAL_REQUEST.md:
1. **R1: European Registry & Balance of Trade Hub**
   - Registry schemas, mockable connector interfaces, baseline datasets for Germany (dena Biogasregister), Netherlands (VertiCer), Denmark (Energinet), Spain (Enagás), Italy (GSE).
   - Certificate issuance, injection volume, cancelations, cross-border transfers.
   - Flow schemas by feedstock category, grid interconnection status, and registry recognition protocols.
   - Explicit UDB title transfer verification.

2. **R2: Biomethane vs. TTF Natural Gas Spread & Curve Analytics**
   - Commercial basis spread between natural gas molecule indices (TTF M+1, Quarterly, Calendar curves) and compliance certificates (German THG, Dutch ERE, French CPB, Italian CIC, UK RTFO).
   - Spread visualization with delivered value stacks, molecule components, and logistics tariffs.
   - Dynamic pricing computed via `computeNetback` with zero client-side arithmetic shortcuts.

3. **R3: Morning Market Briefing & Actionable Origination Desk**
   - Daily morning briefing synthesizing overnight price movements, fresh mark staleness warnings, regulatory consultation updates, top-margin arbitrage corridors.
   - Actionable origination queue and 1-click deal structuring.

4. **R4: Multi-Branch What-If Sensitivity Simulator**
   - Instant scenario stress-testing for trading decisions (TTF ±10%/±20%, German THG double counting repeal, UK UDB recognition agreement, statutory quota cap modifications).
   - Adhering to single pricing authority invariants without mutating base marks.

5. **Invariants & Non-Negotiables**:
   - 100% passing tests (all 160 existing tests remain passing + new comprehensive tests).
   - Zero numeric literal fallbacks or unsourced pricing coefficients.
   - `src/domain/` maintains 100% React-free purity.
   - Dashboard loads in <100ms with high-density terminal typography, dark theme aesthetics, keyboard navigation shortcuts (1–0).

## Execution Strategy (Project Pattern)
1. **Survey**: 3 specialized subagents map current architecture, domain models, and UI screens against R1-R4.
2. **Decomposition**: Update PROJECT.md and TEST_INFRA.md with complete Feature Inventory.
3. **Execution**: Dual Track (Implementation & E2E Testing) using Explorer -> Worker -> Reviewer -> Challenger -> Forensic Auditor cycle.
4. **Final Gate**: All unit/E2E/stress tests passing, clean audit, zero invariant violations.
