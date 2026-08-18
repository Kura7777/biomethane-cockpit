## 2026-08-17T14:21:45Z
Create comprehensive end-to-end integration & scenario test suite in `src/domain/__tests__/e2e_trading_workflows.test.ts` covering:
- Tier 1: Feature coverage across all 6 regulatory gates, netback calculators, and logistics models.
- Tier 2: Boundary and corner cases (negative CI down to -150 g/MJ, French €100 CPB ceiling, UK grid blocking, Italian 5.815 MWh/CIC divisor).
- Tier 3: Pairwise combinations of origin countries (DE, DK, NL, SE, FR, IT, ES, UK, CH) × destination compliance markets (DE_THG, NL_ERE, FR_CPB, IT_CIC, FUELEU, UK_RTFO, VOL_SCOPE1) × feedstocks (manure, bio_waste, agricultural_residues, uco, maize_silage).
- Tier 4: Real-world commercial trade workflows:
  - Scenario A: Danish manure bio-LNG physical bunkering to Hamburg maritime pool under FuelEU.
  - Scenario B: Swedish food waste virtual swap via UDB title transfer into German THG-Quote compliance market.
  - Scenario C: Dutch agricultural residues grid injection into French CPB quota with €100 cap evaluation.
  - Scenario D: Italian agro-industrial biomethane advanced CIC monetization with GSE floor pricing.
  - Scenario E: UK manure biomethane blocked from EU UDB, routed to domestic UK RTFO with GBP/EUR FX conversion.
  - Scenario F: Full compliance dossier generation and PRA licensing guard check.
- Tier 5: Adversarial coverage hardening and invariant testing.
Run test suite, verify 100% passing tests and clean build, create TEST_READY.md, write handoff.md, notify orchestrator.
