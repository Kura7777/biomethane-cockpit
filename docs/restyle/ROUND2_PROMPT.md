# Restyle round 2: finish the screens

**Delegation prompt.** Copy everything below the line into the other model. It builds on `docs/restyle/APP_RESTYLE_HANDOFF.md`; its design spec and guardrails still apply.

---

You are finishing an app-wide restyle of a React 18 + TypeScript + Vite + Tailwind v4 app.

## Where things stand
- **Round 1** (commits `e7bf4b8`…`e9a48bc`, pushed to `main`) did three things:
  - moved the global tokens to the FuelEU design: IBM Plex Sans, warm palette, 8/12 px radius;
  - extracted shared primitives into `src/shared/ui/` (`PageShell`, `PageHeader`, `Tabs`, `KpiTile`, `Card`, `DataTable`, `SidePanel`, `desk.css`);
  - partly migrated the screens.
- **Round 1 fell short of the spec on three measurable points.** Round 2 closes them:
  - text smaller than 12 px *increased* (959 → 1,003 occurrences);
  - inline `style={{}}` blocks *increased* (2,868 → 3,242);
  - uppercase labels barely moved (230 → 183).
- **The visual reference is still the FuelEU screen**, `#/fueleu-shipping`, styled by `src/features/fueleu/fueleuDesk.css` and `src/shared/ui/desk.css`. Read both before starting, and read the design spec section of `docs/restyle/APP_RESTYLE_HANDOFF.md`.

## Guardrails (unchanged from round 1; all still apply)
1. **Styling only.**
   - No changes to calculations, data, props, state, handlers or routing.
   - No changes to visible wording. Case changes go through CSS only.
   - Tests must stay green: `npx vitest run` (689), `npx tsc --noEmit`, `npm run build`.
2. **Before starting, run `git status`. Do not edit any file that is already modified or untracked.**
   - Another session owns `src/features/plants/PlantSourcingDrawer.tsx`, `src/domain/plants/*`, `scripts/*` and `data/plant_research/*`.
   - Skip anything dirty and list it in your report.
3. **Guard against silent reverts.** Uncommitted edits in this folder get silently reverted (OneDrive).
   - `git add <file>` straight after every edit.
   - Before each commit, check `git diff --cached --stat`.
4. **Commit with explicit paths:** `git commit -- <files>`.
   - Other sessions may have files staged, so a bare `git commit` would sweep in their work.
   - One commit per screen.
   - **Do not push.**
5. **Dead files. Do not edit these;** nothing imports them and they will be deleted:
   - `AuditorDrawer`, `CommercialDealDesk`, `ForwardCurvesPanel`, `CounterpartyDirectoryTable`, `GroupDirectoryTable`, `MapCockpitScreen`;
   - `BrokerRunTable`, `DetailedPricingScreen`, `PortfolioRiskScreen`, `sourcing/SourcingScreen.tsx`, `InstitutionalOfftakePanel`, `LibraryScreen`;
   - `OrderIntakePanel`, `CostWaterfallCard`, `DealSummaryModal`;
   - `shared/components/CitationBlock`, `StaleIndicator`, `StatusChip`.

## Hard rules for this round (pass/fail per file, not suggestions)

For every file you touch, all four must hold when you commit it:

**R1. No text below 12 px.**
- No `text-[9px]`, `text-[10px]`, `text-[11px]` or `text-[11.5px]`, and no `fontSize` below 12.
- Map the sizes to the scale:
  - 12 px caption;
  - 13 px meta and labels;
  - 14 px body;
  - 20 px values and titles;
  - 24 px H1;
  - 28 px KPI value.
- **Where a table gets too wide at 12 px,** fix it by dropping or merging columns below a breakpoint, or by truncating with a `title` tooltip. Never by shrinking text.
- **Also fix the shared classes in `src/index.css` that are below 12 px.** `.eyebrow` is 11 px and used 202 times; make it 12 px/500 muted, sentence case. Check `.chip`, `.tag`, `.lbl`, `.subttl` and `.kv` too.

**R2. No uppercase except tiny status badges.**
- Remove `uppercase`, `textTransform: 'uppercase'` and wide `tracking-*` / `letterSpacing` from headings, section titles, labels, buttons, segmented options, table headers and chips.
- Keep uppercase only on:
  - status badges of 11–12 px, such as SIMULATED, BLOCKED or BID;
  - ISO country codes;
  - market ticker codes like `TTF M+1`.
- **Section headings** (e.g. Trade builder's "Production & delivery schedule", "Contract traded volume", "Origin country & grid injection zone") become 14 px/600 ink, sentence case via CSS. Where the source string is title case, leave the string alone; the visible case change comes from CSS, and a title-case heading in the source is acceptable.

**R3. Net reduction of inline styles.**
- A file's `style={{` count must not go up.
- Move static styling (colours, sizes, spacing, borders, radius) into classes: the feature's own `.css` file, `desk.css` primitives, or Tailwind theme classes.
- Inline styles are allowed only for values computed at runtime: widths from data, positions, conditional colours from a number's sign.
- **Colour tokens in inline styles are not a fix.** `style={{ color: 'var(--color-muted)' }}` should become a class such as `.ds-muted` or Tailwind `text-[var(--color-muted)]`.

**R4. Plex Mono only for identifiers.**
- Numbers, prices, volumes, dates and inputs use Sans with `tabular-nums`.
- Mono stays only on deal IDs (`DEAL-2026-…`), IMO numbers, registry or company IDs, and code-like tokens.

## Screens, in this order (one commit each)

| # | Screen / route | Files | Why it's on the list |
|---|---|---|---|
| 1 | Shared classes | `src/index.css` (`.eyebrow`, `.chip`, `.tag`, `.lbl`, `.subttl`, `.kv`, `.btn`) | One change fixes hundreds of sub-12 px labels app-wide |
| 2 | Trade builder `#/trade` | `TradeBuilderScreen.tsx`, `steps/TradeConsignmentStep.tsx`, `steps/TradeEconomicsStep.tsx`, `steps/TradeMarketAuditStep.tsx`, `steps/TradeExecutionStep.tsx`, `LegalPackageModal.tsx`, `PoSUploaderModal.tsx` | Uppercase section headings; mono numbers and dates; about 200 sub-12 px sizes |
| 3 | Plants `#/plants` | `PlantsScreen.tsx`, `RegistryHub.tsx` | Barely migrated in round 1 (13 lines): full-width with no `PageShell`, 11 px table text, a red "Deal" button on every row |
| 4 | Origination `#/desk` and `#/origination` | `SourcingOriginationDesk.tsx` (122 sub-12 px), `QuickDealDrawer.tsx` (32 mono, 24 hex), `OriginationPipelineScreen.tsx`, `CorridorMatrix.tsx`, `commercial/PlantScannerTable.tsx` | Largest remaining debt |
| 5 | Registries, Citations | `features/registries/*`, `features/citations/*` | Round 1 changed only 2–3 lines each |
| 6 | Pricing desk `#/pricing` | `MarksScreen.tsx`, `MarketPricesModal.tsx` | Wrap in `PageShell`; the top four tiles become `KpiTile` |
| 7 | Scanner, Map chrome, Auditor modal, Settings / connectors, header | `ScannerScreen.tsx`, `MapScreen.tsx`, `CorridorMiniMap.tsx` (34 hex into chart tokens), `auditor/ComplianceAuditModal.tsx` (52 hex), `settings/DataConnectorsScreen.tsx`, `shared/components/MathFormulaModal.tsx`, `src/app/Header.tsx` | Remaining debt |

### Layout
- **Every routed screen sits inside `PageShell`,** the centred 1840 px column. Plants and Pricing are full-width today.
- **Map exception:** the map canvas may stay full-bleed; only its chrome goes in the column.

### Red "Deal" buttons on the Plants table
Make them a secondary or ghost row action that shows on row hover or selection. Keep one primary accent button per view, following the FuelEU pattern: one "Build term sheet" CTA, in the side panel.

## Verification (per screen, before its commit)
1. **Gates.** Run the gate script, `scratch/restyle/gates.mjs`, on the files you touched. Write it first if it doesn't exist. It must print the before and after counts per file for:
   - sub-12 px;
   - uppercase;
   - inline `style={{`;
   - hex colours;
   - `font-mono`.

   Sub-12 px and uppercase must be **0**, apart from the allowed badge, ISO and ticker cases, each listed. Inline styles and hex must not go up.
2. **Screenshots.** Take them at 1440×900 and 2560×1300, light and dark, into `scratch/restyle/round2/<screen>/`, and look at them yourself. Check that:
   - nothing is clipped;
   - no text overlaps;
   - no table scrolls horizontally at 1440.
3. **Tests.** `npx vitest run`, `npx tsc --noEmit` and `npm run build` are all green.
4. **Console.** No new console errors. The existing CORS errors from `api.energidataservice.dk` on localhost are known and pre-existing.

## Report back
- **Per screen:** commit hash, files, the gate table with before/after counts per file, screenshot paths, and anything skipped with the reason.
- **App-wide totals** for the five gates, measured over live files only (exclude fueleu and the dead files):

  | gate | Round 1 end | Target |
  |---|---|---|
  | sub-12 px | ~1,000 | 0 |
  | uppercase | ~180 | badges only |
  | inline style | ~3,240 | ≤ 2,500 |
  | hex | ~590 | ≤ 100, all in chart or brand tokens |
  | font-mono | ~225 | identifiers only |

Do not report a screen as done unless its gates pass and you have looked at its screenshots. Do not push.
