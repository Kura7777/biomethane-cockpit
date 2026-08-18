# BRIEFING — 2026-08-18T00:58:00Z

## Mission
Survey frontend and UI architecture for Biomethane Trading Intelligence Platform V2 to support implementation of European Registry & Balance of Trade Hub (R1), Basis Spread & Forward Curve Analytics (R2), Morning Market Briefing & Actionable Origination Desk (R3), Multi-Branch What-If Sensitivity Simulator (R4), and strict terminal UX (<100ms load time, stone palette, keyboard shortcuts 1–0).

## 🔒 My Identity
- Archetype: explorer
- Roles: frontend_surveyor, architecture_investigator
- Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_ui_1
- Original parent: 6cb5dbc6-21ee-4551-b0f1-0407ed9c02ba
- Milestone: survey_and_ui_spec

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Single pricing authority invariant: all economic derivations must use `computeNetback` in `src/domain/netback/`
- Zero React code in `src/domain/`
- Zero unsourced pricing coefficients or fallback numeric literals outside `src/domain/netback/`
- High-density terminal aesthetics: strict `stone` neutral ramp, `Inter` for prose, `JetBrains Mono` + `.font-num` for data, minimum 10px text floor (`text-micro`)

## Current Parent
- Conversation ID: 6cb5dbc6-21ee-4551-b0f1-0407ed9c02ba
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/app/App.tsx`, `src/app/Layout.tsx`
  - `src/index.css`, `design-system/MASTER.md`, `design-system/AUDIT.md`
  - `src/store/context.tsx`
  - `src/features/` (all 10 feature screens)
  - `src/domain/` (netback, arbitrage, markets, logistics, consignment, eligibility, plants)
  - `src/domain/__tests__/architecture.test.ts`
- **Key findings**:
  - Current UI has 10 screens mapped to keys `1` to `0`.
  - Styling strictly follows `stone-950` / `stone-900` / `stone-800` dark palette with semantic accent tokens (`teal`, `emerald`, `amber`, `red`, `sky`).
  - Strict architectural guards enforce `computeNetback` as the sole pricing authority.
  - V2 extensions (R1, R2, R3, R4) can seamlessly enhance the existing screens and shared components.
- **Unexplored areas**: None. Codebase is fully mapped and tested.

## Key Decisions Made
- Map R1 (European Registry & Balance of Trade Hub) to `src/features/plants/` with dedicated Registry / Balance of Trade tab and ledger components, backed by registry domain schemas.
- Map R2 (Spread & Curve Analytics) to `src/features/marks/` with forward curve visualizer (M+1, Q1..Q4, Cal+1..Cal+3) and delivered value stack waterfalls.
- Map R3 (Morning Market Briefing) to an automated Morning Briefing desk screen/widget with 1-click deal structuring to Trade Builder.
- Map R4 (Multi-Branch What-If Sensitivity Simulator) to interactive scenario controls in Trade Builder / Sourcing with live netback recalculation.
- Ensure <100ms load time via React.lazy code-splitting, zero runtime network bottlenecks, and tabular font-num layout.

## Artifact Index
- `c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_ui_1\handoff.md` — Full 5-component handoff report
