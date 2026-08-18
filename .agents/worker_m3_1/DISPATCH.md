## 2026-08-18T01:07:32+07:00
You are Worker subagent for Milestone 3 (R3: Morning Market Briefing & Actionable Origination Desk).

Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\worker_m3_1\
Authoritative request: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\ORIGINAL_REQUEST.md
Project plan: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\PROJECT.md
Survey findings: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_domain_1\handoff.md and c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_ui_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Implement pure domain module `src/domain/briefing/`:
   - `types.ts`: `MorningBriefingSummary`, `OvernightPriceMover`, `MarkStalenessAlert`, `RegulatoryConsultationUpdate`, `OriginationOpportunity`, `BriefingParams`, `StructuredDealParams`.
   - `engine.ts`: Pure functional engine `generateMorningBriefing(params: BriefingParams): MorningBriefingSummary`:
     - Synthesizes 24h overnight price movements (TTF brown gas, German THG, Dutch ERE, French CPB, Italian CIC, UK RTFO, FX rates) with absolute and percentage deltas.
     - Tracks mark freshness and staleness counts (<7d fresh, 7–30d amber, >30d red).
     - Gathers regulatory consultation trackers (German 38. BImSchV double counting draft, UK UDB recognition status, RED III transposition updates, French CPB period 1).
     - Extracts top-margin arbitrage corridors dynamically via `scanEuropeanArbitrage`.
     - Generates 1-click structured deal parameters for instant handoff to Trade Builder.
   - `index.ts`: Barrel export.
2. Implement comprehensive unit tests in `src/domain/__tests__/briefing.test.ts` testing overnight mover calculations, mark freshness classification, regulatory updates, top 3 arbitrage corridors extraction, and structured deal parameter serializations.
3. Integrate into UI:
   - Create `src/features/sourcing/MorningBriefingDesk.tsx` (and/or integrate into `SourcingScreen.tsx` with a prominent "MORNING BRIEFING" toggle/desk view).
   - Component features:
     - Overnight Movers Grid (TTF, DE THG, NL ERE, FR CPB, IT CIC, UK RTFO with 24h change indicators).
     - Mark Freshness & Staleness Alerts with quick refresh action.
     - Regulatory Consultation Tracker with status badges and statutory excerpts.
     - Top-3 Arbitrage Corridors with gross margin, desk P&L, origin plant, target market, and prominent "1-Click Structure Deal" action.
     - Clicking "Structure Deal" passes query parameters to `TradeBuilderScreen` (`/trade?originCountry=...&feedstock=...&ci=...&marketId=...&volume=...`), pre-populating the builder, calculating netback, and generating term sheets.
   - Ensure `TradeBuilderScreen.tsx` cleanly ingests these query params on mount to initialize trade state.
   - Adhere strictly to `design-system/MASTER.md` (stone-950/900/800 dark palette, .font-num on figures, text-micro floor, zero raw hex).
4. Run tests and verify:
   - Run `npx vitest run` to ensure all existing tests + new briefing tests pass 100%.
   - Run `npm run build` or `npx tsc -b` to ensure clean compilation.
5. Write your complete handoff report to `c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\worker_m3_1\handoff.md` and report back with send_message.
