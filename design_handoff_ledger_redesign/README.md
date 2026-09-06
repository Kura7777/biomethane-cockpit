# Handoff: Biomethane Desk Cockpit — "Ledger" redesign

## Overview

A complete front-end redesign of the European Biomethane Desk Cockpit (React 18 + Vite +
Tailwind v4, `src/domain/*` engines). The information architecture and every domain engine stay
as they are; what changes is the entire visual system and the way each screen is organised.

The brief was that the existing front end "still looks like a basic vibecoded app". The specific
faults named were: neon cyan/green glows, everything bold and monospace, too many badges and
chips, a gradient/emoji brand mark, a header crammed with pills, colours that change screen to
screen, cards everywhere with no real hierarchy, and random density. Every one of those is
removed here.

**The direction is called Ledger.** Its rules:

1. **Light ground, ink-first.** `#f3f2f2` ground, `#201e1d` ink, one accent (`#ec3013`) used
   sparingly — for the primary action, the blocked/loss state and a single hero figure. A dark
   ground is provided as an inversion of the same tokens, not a second palette.
2. **Rules organise, not cards.** Structure comes from 2px dividers between major sections and
   1px rules between rows. There are no rounded card stacks and no shadows except on modals.
3. **Metrics are ruled cells.** The former metric "cards" are equal-width cells in one row
   divided by hairlines — a ledger strip, not four floating boxes.
4. **One type family.** Archivo throughout (400 / 600 / 800). Monospace is gone; numeric
   alignment comes from `font-variant-numeric: tabular-nums`, not from a data face. Prose is
   never uppercase; labels and eyebrows are.
5. **Zero radius, flush left.** Nothing is rounded. Headings, copy and button labels are all
   flush left.
6. **Badges only for verdicts and provenance.** Chips survive only where they carry a verdict
   (pass / conditional / blocked) or a provenance claim (`DESK · MANUAL` vs `ESTIMATE · SIM`).

## About the Design Files

**The files in this bundle are design references, not production code.** They are HTML
prototypes that show intended look and behaviour. Do not copy their markup or inline styles into
the app.

The task is to **recreate these designs inside the existing codebase** — React 18 + Vite +
Tailwind v4, `lucide-react` icons, `react-simple-maps`, the `src/domain/*` engines — using the
patterns already in the repo:

- Define the tokens below once in `src/index.css` under `@theme` and consume them as Tailwind
  utilities. Do not paste the raw hex values into components.
- Wire real values from the domain engines (`evaluateEligibility`, `computeAllNetbacks`,
  `rankNetbacks`, `calculateLogisticsRoute`, `getRouteTransitTariff`, `computePortfolioMtM`,
  `computePortfolioVaR`) instead of the flattened data tables baked into the prototypes.
- Keep `lucide-react`. The prototypes use bare text (`✕`, `▶`, `⏎`) in a few spots purely to
  stay dependency-free.

## Fidelity

**High-fidelity.** Colours, type sizes, weights, letter-spacing, spacing rhythm, borders and
interaction states are final and deliberate. Recreate pixel-perfectly using the codebase's own
tokens and component patterns.

Two things are explicitly low-fidelity and must not be treated as researched data:

- **Certificate levels and netbacks are illustrative.** They are generated the way
  `src/domain/marks/simulate.ts` does. The design surfaces this honestly — `ESTIMATE · SIM`
  chips on the affected rows, a simulated-marks count in the footer and on the pricing desk —
  and that behaviour must survive.
- **A handful of plant rows carry invented operator/capacity attributes** to show what a
  populated row looks like. The source registry has `null` for those fields on all but a few
  facilities. Either wire real verified data or render every unverified row as `unrecorded`.

Real, and lifted straight from the repo: market identities, `shortName`s, legal bases,
registries, `productionPlants`, `annualProductionTWh` (`src/domain/markets/registry.ts`); the
six eligibility gates and their citations (`src/domain/eligibility/*`,
`src/domain/citations/registry.ts`); the data-source directory
(`src/domain/provenance/dataSourcesDirectory.ts`); the 1,975-facility census and the
1,843-unverified figure.

---

## Design Tokens

Define these in `src/index.css` under `@theme`. The full token sheet as authored is in
`tokens/styles.css` in this bundle — that file is the source of truth for anything not listed
here.

### Colour — light ground (default)

| Token | Hex | Use for |
|---|---|---|
| `--color-bg` | `#f3f2f2` | Page ground, table rows, panel fills |
| `--color-surface` | `#eae9e9` | Rails, toolbars, modal headers, ticker strip |
| `--color-text` | `#201e1d` | All ink: body, figures, headings |
| `--color-accent` | `#ec3013` | Primary button, blocked/loss state, hero figure, active-tab underline |
| `--color-divider` | `color-mix(in srgb, #201e1d 40%, transparent)` | Every rule |

Ramps used: `--color-neutral-200 #eae7e7`, `-300 #d7d3d3`, `-400 #bab6b6`, `-500 #9b9797`,
`-600 #7d7979` (the `unrecorded` word), `-800 #444141`, `-900 #2d2b2b`;
`--color-accent-100 #fff2ef` (blocked banner fill), `-300 #ffc4b8` (chip border),
`-700 #ae1800` (accent-coloured text — **use this, never `--color-accent`, for text at body
size**), `-800 #7c1405`, `-900 #4d170e`.

**Ink opacity ladder** — this is how hierarchy is made without extra colours:

| Mix | Use for |
|---|---|
| `var(--color-text)` 100% | Figures, headings, primary row text |
| `color-mix(… 70%, transparent)` | Labels, eyebrows, sub-lines, metadata — **the floor for any text that carries meaning** |
| `color-mix(… 55%, transparent)` | Decorative only (rank numbers, scale ticks) |
| `color-mix(… 8–12%, transparent)` | Bar tracks, skeleton fills |

Do not take meaningful small text below 70% ink: 55% blends to ≈3.5:1 on this ground and fails
AA at 10–12px.

### Colour — dark ground

Applied as a class on the app root (`.dark` in the prototype). Same roles, inverted; no new
palette:

`--color-bg #1a1918` · `--color-surface #232120` · `--color-text #f5f2f1` ·
`--color-accent #ff563c` (the light-ground red is too dark on this ground) ·
`--color-divider color-mix(in srgb, #f5f2f1 32%, transparent)` ·
`--color-accent-100 #3a1a14` · `-300 #6b2a1e` · `-700 #ffb0a1` · `-800 #ffd0c6` · `-900 #ffe4de` ·
`--color-neutral-200 #322f2e` · `-300 #3d3a39` · `-400 #4d4a48` · `-500 #6b6765` · `-700 #b8b3b0` ·
`-800 #d9d5d3` · `-900 #f0edec`.

### Type

**Archivo only** (`400`, `600`, `800`), loaded from Google Fonts. `--font-heading` and
`--font-body` are both Archivo; headings take weight 800 with `letter-spacing: -0.015em` and
`line-height: 1.12`.

| Size | Weight | Used for |
|---|---|---|
| 10px | 600 | Eyebrows / column headers / chips — `letter-spacing: 0.12em`, uppercase. **Hard floor.** |
| 11px | 400–600 | Metadata, sub-lines, citations, key hints |
| 12px | 400–600 | Dense cells, hints, cost-stack rows, body in rails |
| 13px | 400–600 | Table body, row primary text, nav tabs |
| 14px | 400–600 | Prose, gate labels, field values |
| 15px | 800 | Brand wordmark, screen sub-titles (uppercase, `0.1em`) |
| 17px | 800 | Rail and modal panel titles |
| 19–22px | 800 | Rail stat figures, screen `h3` |
| 28px | 800 | Ledger metric figures (`letter-spacing: -0.02em`) |
| 52px | 800 | The single hero netback in trade builder step 3 (`-0.035em`) |

No monospace anywhere. **Every numeric leaf** carries
`font-variant-numeric: tabular-nums; letter-spacing: -0.01em` (the `.num` class in the
prototype) — applied to the leaf, never inherited from a container.

Weight discipline: 800 only at 15px and above, and on chips/figures; 600 for labels, table
headers and active nav; 400 for body.

### Spacing, radius, elevation

- 4px base; use `4 / 8 / 12 / 16 / 24 / 32`. Panel padding `16–18px`; table cell padding `8px`;
  ruled metric cells `13px 18px`; grid gaps `10–14px`; hairline grids are `gap: 1px` over a
  `background: var(--color-divider)` parent.
- **Radius 0 everywhere.** No exceptions — not chips, not buttons, not inputs, not modals.
- Elevation is 1px rules and surface lightness. The only shadow is `--shadow-lg`
  (`0 12px 32px color-mix(in srgb, #2d2b2b 22%, transparent)`) on modals.
- `transition-colors 150ms` only. Never `transition-all`. The only animations are the map's
  corridor dashes and the loading skeleton pulse, both gated by `prefers-reduced-motion`.
- Focus: `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`.
- Z-index: 0 base, 50 header, 100 modals and the command palette, 110 toast.

---

## Shell

`src/app/Layout.tsx`, `src/app/Header.tsx`

```
h-screen flex flex-col overflow-hidden min-w-[1180px]
├── header  52px  flex-none   border-b 2px
├── body    flex-1 min-h-0    overflow-y-auto   ← per-screen
└── footer  28px  flex-none   border-t 2px
```

### Header — 52px, `bg-bg`, `border-b 2px divider`

Left to right:

- **Brand block**, `padding: 0 18px`, `border-right: 2px`: a 10×10px solid `--color-accent`
  square, then `Biomethane Desk` in Archivo 15px/800, `white-space: nowrap`. This replaces the
  gradient `B` tile — a solid square plus a wordmark reads as a product mark, a gradient reads as
  a vibe.
- **Nav tabs**, full-height, `padding: 0 14px`, 13px. Rest 70% ink; hover 100% ink +
  `bg-surface`; active 100% ink, weight 600, `box-shadow: inset 0 -3px 0 var(--color-accent)`
  plus `aria-current="page"`. Ten tabs: Origination · Scanner · Trade builder · Pricing desk ·
  Risk & VaR · Plants · Map · Library · Citations · Sources. Overflows to a horizontal scroll
  with a hidden scrollbar; labels never wrap.
- **Right cluster**, `margin-left: auto`, `border-left: 2px`, `gap: 16px`: `TTF M+1` key/value
  pair (10px eyebrow + 14px/600 figure), the pricing `SIDE` label and value, a `Command ⌘K`
  secondary button, the `Dark`/`Light` toggle, and `Trader · A. Vos` after a 1px rule.

The old header's ticker pills, desk-sync radar and clock come out. The three price pills became
one (TTF, the only one a trader reads at a glance); the rest live on the pricing desk. If a
ticker strip is wanted, it belongs under the header at 32px on `--color-surface` with a hidden
scrollbar — see option 1c in `Desk Redesign Directions.dc.html`.

### Footer — 28px, `border-t 2px`, 11px at 70% ink

Left: provenance (`GIE / EBA European Biomethane Map 2026 · 1,975 facilities · RED III
consolidated to August 2026 · 2 of 16 marks simulated`). Right: key hints
(`Keys 1–7 screens · ↑↓ rows · ⏎ playbook · Esc close · ⌘K command`).

---

## Screens

### 1. Origination desk — `/sourcing`

`SourcingOriginationDesk.tsx`. Vertical stack, no columns.

1. **Ledger strip** — `grid-cols-4`, `border-b 2px`, cells `13px 18px` with `border-right 1px`
   (last cell none). Each: 10px eyebrow, 28px/800 figure, 12px/70% sub-line. Audited facilities
   `1,975` · Peak arbitrage margin `+€18.40` (accent-700) · Prompt TTF gas `€34.20` · RED III
   mass balance `6 gates`.
2. **Consignment bar** — `border-b 2px`, `padding: 14px 18px`, flex-end, `gap: 22px`. Four
   labelled controls (target market select, contract quantity, feedstock select, CI), the
   `Scan European plants` primary button, and a right-aligned two-line sync/provenance note.
   Inputs are `.input`: `min-height 36px`, `bg-surface`, `1px divider` border, radius 0.
3. **Live opportunity matrix** — section head (`h3` 20px + 12px sub-line + a three-swatch
   legend), then the ladder table.

**Ladder table** (shared with the scanner). `border-collapse: collapse`, 13px. `th`: 11px/600,
`letter-spacing 0.08em`, uppercase, 60% ink, `border-bottom: 2px`. `td`: `padding: 8px`,
`border-bottom: 1px`. Row hover `color-mix(in srgb, var(--color-text) 4%, transparent)`.
Selected row: `bg-surface` + `box-shadow: inset 3px 0 0 var(--color-accent)` (an inset edge, so
the row does not shift a pixel).

Columns: `#` (55% ink) · Market/registry (13px/600 over 11px/70%) · Gates · Net €/MWh (right,
15px/600) · Spread vs all-in · Margin (right, 70%) · Provenance · Age (centre).

- **Gate strip**: six 16×16px cells, `gap: 2px`, one letter each — `S U M A G N` for scheme
  recognition, UDB grid ingestion, mass balance custody, Annex IX feedstock, GHG threshold,
  member-state specifics, in the order `evaluateEligibility` returns them. Pass = transparent
  fill, 1px divider border, ink letter. Conditional/unresolved = `neutral-300` fill,
  `neutral-900` letter. Hard block = `accent` fill, `bg` letter. Each cell carries a
  `title="<letter> — <verdict>"`. **The letter carries the meaning as well as the tone** — no
  colour-only signal.
- **Spread bar**: 16px track at 8% ink, fill inset 3px top/bottom, width
  `|net| / max|net| × 100%`, ink for eligible, `neutral-500` for conditional/capped/unresolved,
  `accent` for negative. This is the one place a computed percentage belongs in a style
  attribute.
- **Provenance chip**: `DESK · MANUAL` (transparent, divider border) or `ESTIMATE · SIM`
  (`accent-100` fill, `accent-300` border, `accent-800` text).
- Negative nets print `−€21.35` — sign before the symbol.

4. **Blocked banner** — pinned bottom, `border-top: 2px solid var(--color-accent)`,
   `bg accent-100`. A solid-accent `BLOCKED` tag, a 13px/600 headline naming the market and its
   unreachable netback, a 12px `accent-900` body giving the reason and the remedy, and a
   right-aligned citation. Content from `getHighestBlockedOpportunity`. Keep it
   `flex: 0 1 auto` with truncated lines so it cannot squeeze the scroller.

### 2. Netback ladder / scanner — `/scanner`

`ScannerScreen.tsx`. Header block (consignment eyebrow, `h3`, description) with a right-aligned
hairline stat group (all-in delivered / avoided tCO₂e / selected market's net / playbook button).
Then a filter bar on `--color-surface` (three checkbox-style filters using a 13px square —
solid accent when on — plus the bid/mid/offer segmented control), the ladder table (same grid,
with `CC` and `Unit of account` columns), and a three-column ruled footer: the German dual-branch
panel (1× and 2× netbacks plus the policy-multiplier-vs-GHG-calculation note verbatim), the cost
stack (`label · hairline · value` rows, then an `ALL-IN` total above a 2px rule, then the
`Structure in trade builder` primary button), and the blocked-opportunity explanation.

Keyboard: `↑`/`↓` move selection through the filtered, sorted order; `⏎` opens the playbook;
`Esc` closes any modal. Skip when focus is in an input.

### 3. Trade builder — `/trade`

`TradeBuilderScreen.tsx`. `grid-cols-3`, each column independently scrollable, `border-right 2px`
between. Column header: a 20px solid-accent square with the step number in 11px/800 `bg`-coloured
type, then the step title in 15px/600 uppercase `0.1em`.

- **Step 1 Consignment** — four labelled chip groups (origin ISO codes with grid-isolated
  origins at 55% ink; feedstock; certification scheme; chain of custody), each followed by a
  12px hint that changes with the selection and explains *why* a choice breaks the trade
  (ISCC PLUS is voluntary-scope only; book & claim hard-blocks FuelEU and every RED III route).
  Then the CI block above a 2px rule: label + 24px/800 signed figure, a 3px track with a solid
  accent 11px square thumb, `−150 … +50` scale, and the GHG-saving readout.
- **Step 2 Destination & legal validation** — market chips (disambiguated `FR CPB` / `FR TIRU`
  where a country holds two mechanisms), the selected market's `h5` + legal basis + verdict chip,
  then the six-gate audit: each gate a 9px-padded row with `border-bottom 1px` — 13px/600 label,
  verdict chip right, 12px reason, 11px `accent-700` citation.
- **Step 3 Netback & dossier** — the hero: 52px/800 net netback with an 11px caption (per MWh ·
  pricing side · unit of account · all-in). Then the waterfall: six rows of
  `132px label · bar · 78px value`; widths `|value| / max × 100%`; additive steps ink, deductions
  `neutral-400`, the net `accent`. Then a 2×2 hairline grid (volume / gross value / desk margin /
  annual P&L) and the actions (`Save dossier with citations` primary, `Export PDF` and
  `Delivery playbook` secondary).

### 4. Pricing desk & broker runs — `/pricing`

`MarksScreen.tsx` / `DetailedPricingScreen.tsx`. Toolbar (`h3` + sub-line stating the simulated
count, `Import broker run` secondary + `Export snapshot` primary), a four-cell ledger strip
(TTF M+1 / GBP-EUR / CHF-EUR / marks filled, each with an age chip top-right), then the marks
table: `CC · Market · Unit · Bid · Mid · Offer · Spread · Source · Age`.

**The mid cell is an editable `<input type="number">`** — right-aligned, 13px/600, `bg-bg`,
`min-height 28px`, step `0.001` for €/kgCO₂e and £/dRTFC else `0.5`, with a real `aria-label`
("Mid mark for <market>"). On edit, dispatch into the existing marks reducer with real provenance
(`sourceType: 'BROKER' | 'DESK'`, `observedAt: now`): the source chip flips to `DESK · MANUAL`,
the age chip reads `now`, and **every netback re-prices**. That round trip is the point of the
screen.

### 5. Portfolio risk & VaR — `/risk`

`PortfolioRiskScreen.tsx`. Toolbar with four working sub-tabs styled exactly like the header nav
(inset accent underline on the active one, inside a 1px bordered group): Portfolio MtM ·
Delivery tenors · VaR distribution · Forward curves. The emoji tab labels come out.

- **Portfolio MtM** — five-cell ledger strip (MtM / 10-day VaR 99% / CVaR / desk limit
  utilisation / daily sign-off), then a two-column split: tenor exposure rows
  (`58px year · 108px volume · bar · 104px MtM · 88px share`) and a risk-limits panel — the
  utilisation bar is a 12px `neutral-200` track with an accent fill and a 2px ink tick marking
  the 90% hard stop, followed by `label · hairline · value` rows and the simulated-marks caveat
  above the sign-off button.
- **Delivery tenors** — the same data as a full table with an exposure bar column.
- **VaR distribution** — a 12-bucket histogram, 200px tall, `align-items: end`, loss buckets
  accent and profit buckets ink, band labels under a 2px rule, then a four-cell strip
  (VaR / CVaR / worst path / paths breaching limit) and a note explaining that expected shortfall
  is the number that matters against the limit.
- **Forward curves** — a table of `Tenor · TTF · Cert · strength bar · Net`, with a note that
  curves beyond Cal-27 are modelled, not quoted.

### 6. Plant registry — `/plants`

`PlantsScreen.tsx`. `grid-cols-[minmax(0,1fr)_320px]`.

Left: toolbar (`h3` + census sub-line, a name filter input and country/verified chips), then the
table — `CC · Facility · Operator · Nm³/h · GWh/y · Feedstock · Provenance`. Rows are clickable
(facility modal). **Missing values render as the literal word `unrecorded` in
`--color-neutral-600`** — never an em dash, never a plausible zero. Provenance chip per row:
`Verified` (neutral) or `Name only` (accent). A pinned bottom bar on `accent-100` with an
`UNVERIFIED` tag carries the 1,843-of-1,975 warning.

**Empty state** (filter matches nothing): left-aligned, `padding: 56px 18px`, max-width 520px —
eyebrow `No matching facility`, a 22px heading quoting the query, a 13px explanation that the
census indexes by the name the national TSO publishes (often the commune, not the operator's
trading name), and a `Clear filter` secondary button.

Right rail on `--color-surface`: one row per country — 24px ISO code, name, plant count, TWh
right-aligned, and a 3px bar beneath whose ink fill is `plants / max × 100%`. From
`COUNTRY_MACRO_STATS`.

### 7. Compliance & logistics map — `/map`

`MapScreen.tsx`. `grid-cols-[minmax(0,1fr)_336px]`. In the prototype the canvas is a separate
plain HTML page (`Map.html`) embedded in an iframe, because the map libraries must load as
ordinary `<script>` tags. **In the app it stays a normal route** — keep `react-simple-maps`,
`ZoomableGroup` and `src/assets/countries-50m.json`, and apply only the visual and interaction
spec:

- **Country fills are tinted ink, not hues** — `color-mix(in srgb, var(--color-text) X%,
  var(--color-bg))` at `72%` active market, `38%` emerging, `16%` future 2028 (ETS2), `7%` no
  mechanism; **restricted is solid `--color-accent`**. Strokes `--color-bg` at `0.6px`, scaled by
  `1/k` under zoom. Legend swatches carry the same values with counts.
- **GB is its own `RESTRICTED` status**, not `ACTIVE`: grid-injected volume cannot evidence UDB
  ingestion for the RTFO, so the map should show the block rather than imply a tradeable market.
- **Corridor**: a quadratic Bézier between origin and target centroids, control point offset
  perpendicular by 22% of the chord. A `--color-bg` halo at 5.5px underneath (without it the line
  disappears over dark fills), then `--color-accent` at 2.2px, `stroke-dasharray: 6 5`, animating
  `stroke-dashoffset` to `-24` over 1.1s linear infinite. Origin node 4px ink, target node 4.6px
  accent. `pointer-events: none`. Honour `prefers-reduced-motion`.
- **Labels**: ISO code in Archivo 10px/800 with `paint-order: stroke` and a 2.5px `--color-bg`
  stroke, plant count beneath at 9px/70%. Only label where the projected bounding box exceeds
  24×18px, and counter-scale label transforms by `1/k` so text size stays fixed under zoom.
- **Projection**: fit an explicit European window, corner points `[-11, 34]` and `[32, 70.5]` —
  never the member-state features themselves (Natural Earth ships France with French Guiana and
  Norway with Svalbard). If you pass a polygon ring, wind it clockwise; a counter-clockwise ring
  is read as the complement of itself and you get the whole globe.
- **Overlays**: `bg color-mix(in srgb, var(--color-bg) 94%, transparent)`, `1px divider`,
  `padding: 10px 12px` — top-left status legend with counts, bottom-left active-corridor panel
  with the origin/target mode toggle, top-right a vertical stack of 28px zoom in / out / reset
  buttons with `aria-label`s, bottom-right the hover card (status, country, legal basis, plants,
  installed TWh).
- Left-click assigns per the mode toggle; right-click opens the origin/target context menu (keep
  the existing behaviour). A country cannot hold both roles.

Right rail: status chip + legal basis, a 2×2 hairline stat grid (active plants / installed TWh /
avg plant size / grid connection rate), the three delivery options with **`Tariff incomplete` in
`accent-700` where a leg is unverified — never a summed number around a null**, a note paragraph
from the market registry, and the two actions.

### 8. Dossier library — `/library`

`LibraryScreen.tsx`. Two-column grid, `gap: 1px` over a divider background so the cards are
separated by hairlines rather than floating. Each card: header (`h5` title, 11px reference and
save date, verdict chip right), a three-cell hairline stat strip (volume / netback / margin), and
a body with a 12px note, a mark-drift line in 11px/600 toned by severity, and `Recalculate` /
`Open` secondary buttons. Keep declined dossiers (the UK RTFO hard block) — the dossier is the
evidence of why a corridor was declined, which is what makes it defensible on audit.

### 9. Statutory citations — `/citations`

`CitationsScreen.tsx`. `grid-cols-[280px_minmax(0,1fr)_236px]`. The Wikipedia pastiche
(serif `W` mark, "BIOMETHANEPEDIA", article/talk tabs) is removed entirely — it made a legal
reference read as a joke.

Left: search input + the register as a hairline list (24px ISO code + 13px title). Centre: the
document — 10px eyebrow, 30px `h3`, 13px official title and primary article, copy/EUR-Lex
buttons, then the article body at 14px/1.6 with max-width 760px, a "Golden trading desk rule"
lead, and provision rows as `190px reference · text` pairs separated by 1px rules. Right: the
table of contents at 12px on `--color-surface`, active entry at 600.

### 10. Data sources & provenance — `/data-sources`

`DataSourcesScreen.tsx`. Toolbar + category chips, then one table:
`Source (name over legal basis) · Authority · Category · Coverage · Cadence · Provenance tier`.
Tier chips take the accent treatment for `Broker reported` and `Modelled engineering` — the two
tiers a trader must not mistake for statutory data. From `DATA_SOURCES_DIRECTORY`.

---

## Modals

All three: `position: fixed; inset: 0; z-index: 100`, scrim
`color-mix(in srgb, #0c0a09 72%, transparent)`, panel `bg-bg`, `1px divider` border,
`--shadow-lg`, radius 0. Header on `--color-surface` with `border-bottom: 2px` and an
`Esc ✕` secondary button.

Required behaviour: `role="dialog"`, `aria-modal="true"`, `aria-label`, **Escape closes**, focus
trapped inside and **restored to the trigger on close**. The prototype implements Escape only —
the real implementation needs the focus trap.

### Delivery playbook — `LogisticsModal.tsx`

`max-width: 1120px`, page-scrolling with `36px 24px` around it. Title
`Delivery playbook · XX → YY` in 16px/800 uppercase `0.1em`, sub-line naming origin hub → target
hub, the basis spread and the transit tariff.

Three mode columns, `gap: 1px` over divider, from `calculateLogisticsRoute`: option tag + a
feasibility chip that takes its **own** tone (`High` neutral, `Contested`/`Medium`/`Low` accent)
and is never conflated with the recommendation — the recommended virtual swap is `CONTESTED` in
some member states and the design shows that tension. Then `h5` title, the total in 24px/800
(or `Tariff incomplete` at 15px in `accent-700` where a leg is null — **never sum around a
null**), timeline, summary, `label · hairline · value` line items with `unverified` in
`accent-700`, and `For` / `Against` lists with the legal basis in `accent-700` pinned bottom.

Below: execution steps (numbered 18px ink squares, step title, actor, then each action as a 12px
line) from `assessment.executionSteps`, and a hub basis panel — 2×2 hairline grid from
`HUB_BASIS_SPREADS`, then interconnection points from `INTERCONNECTION_POINTS` with confidence
chips, closing on the note that tariffs are unverified until confirmed on PRISMA and winter
cleared prices run 3–5× summer.

### Facility detail — new, or inline in `PlantsScreen.tsx`

`max-width: 520px`, centred. Header: facility name `h5`, `XX · FACILITY RECORD` eyebrow,
provenance chip. A 2×4 hairline field grid (operator, status, capacity, annual energy, feedstock,
upgrading technology, grid connection, registry) with 14px/600 values and every missing one as
`unrecorded` in `neutral-600`. Closing provenance paragraph naming the GIE/EBA source and stating
plainly that unverified rows must not be priced against.

### Broker run importer — `BrokerRunImporterModal.tsx`

`max-width: 720px`. A `textarea.input` at 12px/1.6 holding the pasted run, a three-cell hairline
strip (lines detected / markets matched / provenance written), a note that unmatched codes are
reported and skipped rather than guessed, and the actions. On success: write the marks, close,
and raise the toast. On failure: close and show the parse-error strip on the ladder — **nothing
re-prices**, and the ladder keeps showing the last good marks.

## Command palette — `CommandPalette.tsx`

`⌘K` / `Ctrl+K` toggles; Escape closes. `max-width: 620px`, `max-height: 60vh`, opened 88px from
the top. Header: `COMMAND` eyebrow, a borderless 15px input, `Esc to close` hint. Rows: a 52px
`Screen`/`Action` eyebrow, the 14px label, and the key hint right — `border-bottom: 1px`, hover
`bg-surface`. Screens navigate; actions open the playbook or importer, or switch the pricing side.

## Toast

`position: fixed`, 44px above the bottom, centred, `z-index: 110`. `bg var(--color-text)`,
`color var(--color-bg)`, an 8px solid-accent square, 13px/600 text, `--shadow-lg`. Auto-dismiss
after 3.6s. Raised on dossier save, broker import and structure-into-builder.

## Interactions & Behaviour

| Trigger | Result |
|---|---|
| `1`–`7`, `S`, `R`, `C` | Switch screen (extend the existing `Layout.tsx` handler) |
| `⌘K` / `Ctrl+K` | Toggle command palette |
| `Esc` | Close palette / modal / context menu |
| `↑` / `↓` on the ladder | Move selection through filtered + sorted order |
| `⏎` on the ladder | Open the delivery playbook for the selected row |
| Click a ladder row | Select; the dual-branch and cost panels update. No layout shift. |
| Double-click a ladder row | Open the playbook |
| Click a sortable header | Sort; re-click inverts; `aria-sort` updates |
| Toggle a filter | Re-filter; the row count in the toolbar updates |
| Drag the CI slider | Re-price every netback, re-rank, recompute avoided CO₂e and GHG saving; the CI chip flips to `SIMULATED` with a reset affordance |
| Change origin | Recompute the transit tariff, re-price and re-rank |
| Change pricing side | Re-price from bid / mid / offer marks |
| Edit a mid mark | Re-price everything; provenance flips to `DESK · MANUAL`, age to `now` |
| `Scan European plants` / `Recalculate` | Skeleton rows for the duration of the fetch, then the fresh ladder |
| Failed broker parse | Error strip above the ladder with `Retry parse`; nothing re-prices |
| Click a plant row | Facility detail modal |
| Left / right-click a country | Assign per the mode toggle / open the origin-target menu |
| `Dark` / `Light` | Swap the token class on the app root; the map is told over `postMessage` |

Skip every key handler when focus is in an `INPUT`, `TEXTAREA` or `SELECT`.

## State Management

Extends the existing `src/store/context.tsx` reducer; nothing here needs new infrastructure.

| State | Type | Notes |
|---|---|---|
| `screen` | route | Already handled by `HashRouter` |
| `theme` | `'light' \| 'dark'` | New. Persist to `localStorage`; class on the app root |
| `originCountry` | ISO2 | One of the 20 `PRODUCING_ORIGINS`; drives the transit tariff |
| `targetCountry` / `selectedMarketId` | id | Ladder selection ↔ map target ↔ dossier panels |
| `carbonIntensity` + `ciOverride` | number \| null | Null override means "use the consignment value"; drives the `CONSIGNMENT` / `SIMULATED` chip |
| `feedstockKey`, `scheme`, `chainOfCustody` | enum | Trade builder step 1 |
| `pricingSide` | `bid \| mid \| offer` | Exists |
| `sortBy` + `sortDir` | `net \| margin \| age \| name`, ±1 | New |
| `filters` | 3–5 booleans | New |
| `marks` | per-market bid/mid/offer + provenance | Exists; the mid input dispatches into it |
| `plantQuery` | string | New; drives the empty state |
| `riskTab` | `mtm \| tenors \| var \| curves` | New |
| `modal` | `null \| 'playbook' \| 'importer' \| {plant}` | New |
| `palette` + `paletteQuery` | boolean, string | New |
| `dataState` | `ready \| loading \| error` | New; drives skeleton and error surfaces |
| `toast` | string \| null | New; auto-clears after 3.6s |
| `mapClickMode`, `contextMenu` | exists | Unchanged |

Derived per render, never stored: eligibility assessments, netbacks, the ranked list, logistics
assessments, staleness bands, MtM and VaR reports.

## Assets

No new assets. Icons from `lucide-react` at the existing sizes (`w-3.5 h-3.5` inline/chip,
`w-4 h-4` control, `w-5 h-5` header) — the prototypes use text glyphs in a handful of spots
purely to stay dependency-free. Geography stays `src/assets/countries-50m.json` (the prototype
loads a pinned `world-atlas@2.0.2/countries-110m.json` from a CDN instead, since it has no
bundler). Fonts: **Archivo 400/600/800** replaces Inter + JetBrains Mono — update the `<link>` in
`index.html` and drop the mono family.

## Files in this bundle

| File | Contents |
|---|---|
| `Biomethane Desk.dc.html` | The full application: all ten screens, three modals, command palette, toast, light and dark. Nav tabs and the app's own keys switch screens. |
| `Map.html` | The compliance map with real Natural Earth geometry (d3-geo + topojson-client). Embedded by the app file; also opens standalone. |
| `Desk Redesign Directions.dc.html` | The three directions the redesign was chosen from — `1a Ledger` (built), `1b Broadsheet`, `1c Console`. Useful for the alternatives, especially 1c's ticker strip and three-pane spine. |
| `tokens/styles.css` | The authored token sheet and component layer (buttons, inputs, segmented control, table, chips, dialog). The source of truth for any value not listed in this README. |
| `screenshots/` | 20 reference captures: the ten screens (01–10), the three modals and the command palette (11–14), the two extra risk tabs (15–16), the dark ground (17–18), and the map in both grounds (19–20). Captured at a 924px viewport, so the fixed 1180px shell is cropped on the right — read them for treatment, not for measurements, and take every value from the README. The map in 07 is blank because it is an iframe; see 19–20. |

Open any HTML file directly in a browser — no build step.

## Notes on what was deliberately dropped

Worth knowing so it does not get re-added by reflex:

- **The old `design-system/MASTER.md` and `design_handoff_cockpit_redesign/` describe a
  different, superseded direction** (dark-first, stone neutrals, teal interactive, JetBrains Mono
  for figures). They conflict with this handoff on almost every token. If this direction ships,
  rewrite MASTER.md from the tokens above and delete the old handoff, or the next contributor
  will implement two systems at once.
- **Ambient glow divs** (`bg-cyan-500/5 blur-[140px]`) in `Layout.tsx` — delete, don't recolour.
- **The desk-sync radar pulse, the running clock and the multi-pill ticker** in `Header.tsx` —
  status that changes every second earns its place only if a trader acts on it. Session count
  belongs in a menu; the clock is in the OS.
- **`font-mono` on containers** (84 of them in the old code) — the whole point of a single
  family is that no container can leak a data face into a sentence.
- **Emoji in tab labels** (`📊`, `📅`, `📉`) on the risk screen.
