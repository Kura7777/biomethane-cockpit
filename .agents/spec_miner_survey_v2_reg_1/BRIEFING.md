# BRIEFING — 2026-08-18T00:57:40Z

## Mission
Survey, map, and document statutory and regulatory requirements, legal citations, domain validation rules, European registry mechanics, certificate pricing/multipliers, and what-if regulatory shock definitions for Biomethane Trading Intelligence Platform V2.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Regulatory & Statutory Domain Specialist, Spec Miner
- Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\spec_miner_survey_v2_reg_1\
- Original parent: 6cb5dbc6-21ee-4551-b0f1-0407ed9c02ba
- Milestone: V2 Regulatory Spec Mining

## 🔒 Key Constraints
- Pure specification discovery and regulatory rule mapping. No implementation code changes.
- Exhaustive coverage of statutory citations, European registries (dena, VertiCer, Energinet, Enagás, GSE) & Union Database (UDB) rules under Art. 31a RED III (Directive 2023/2413) & Implementing Regulation (EU) 2024/2792.
- Exhaustive coverage of national certificate mechanisms: German 38. BImSchV, Dutch Wet milieubeheer (ERE), French Code de l'énergie (CPB ceiling Art. L.446-24), Italian D.M. 15/09/2022 (CIC), UK RTFO Order 2007 (dRTFC mass-based LHV yield).
- Detailed definition of What-If regulatory shock scenarios and constraints for R4.
- Output report in handoff.md with 5-component structure, plus feature & edge case tables.

## Current Parent
- Conversation ID: 6cb5dbc6-21ee-4551-b0f1-0407ed9c02ba
- Updated: 2026-08-18T00:57:40Z

## Task Summary
- **What to build**: Comprehensive statutory/regulatory specification survey for V2 registry intelligence, certificate mechanisms, cross-border compatibility, and what-if shocks.
- **Success criteria**: Exhaustive, verified legal citations, mathematical multiplier formulas, registry validation rules, UDB mass balance constraints, and scenario shock models.
- **Interface contracts**: PROJECT.md, SCOPE.md, domain types.
- **Code layout**: src/domain/

## Key Decisions Made
- Mined existing domain files (`eligibility/gates/*.ts`, `markets/registry.ts`, `citations/registry.ts`, `netback/engine.ts`, `consignment/feedstocks.ts`, `logistics/corridors.ts`).
- Documented 17 discovered regulatory/statutory features and 17 edge cases in `handoff.md`.
- Formulated precise What-If regulatory shock models for R4 (TTF basis shocks ±10%/±20%, German THG double counting repeal, UK-EU UDB bilateral recognition, and statutory cap modifications).

## Artifact Index
- `.agents/spec_miner_survey_v2_reg_1/DISPATCH.md` — Dispatch prompt and assignments
- `.agents/spec_miner_survey_v2_reg_1/BRIEFING.md` — Living situational awareness
- `.agents/spec_miner_survey_v2_reg_1/progress.md` — Liveness and step tracking
- `.agents/spec_miner_survey_v2_reg_1/handoff.md` — Final comprehensive regulatory specification handoff report
