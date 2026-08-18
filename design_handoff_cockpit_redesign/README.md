# Handoff: Biomethane Desk Cockpit — Redesign

## Overview

A structural and typographic redesign of the European Biomethane Desk Cockpit — the local-first
commercial & regulatory desk tool for biomethane traders under RED III. The information
architecture and every domain engine stay as they are today; what changes is how a trader reads
and drives the screens.

The five moves that define the redesign:

1. **The netback ladder replaces the dense scanner table.** Each market gets a proportional
   spread bar measured against the all-in delivered cost, so ranking is *physical* rather than a
   column of numbers to compare mentally.
2. **A six-cell gate strip on every row** (`S U M A G N`) makes eligibility legible without
   expanding anything.
3. **A persistent consignment spine** on the left keeps origin, CI and the cost stack visible
   while scanning, instead of stacked header panels above the table.
4. **A dossier rail** on the right replaces expand-in-place rows, so the ladder never reflows
   while you read a gate audit.
5. **A ticker strip** absorbs the marks / TTF / FX badges that were crammed into the header.

Everything remains inside `design-system/MASTER.md`: `stone` neutrals only, teal = interactive,
emerald/amber/red/sky = semantic outcomes, square panels, hairline borders, JetBrains Mono for
figures and Inter for language, 10px type floor.

## About the Design Files

**The two HTML files in this bundle are design references, not production code.** They are
prototypes that show intended look and behaviour. Do not copy their markup or their inline
styles into the app.

The task is to **recreate these designs inside the existing codebase** — React 18 + Vite +
Tailwind v4, `lucide-react` icons, `react-simple-maps`, the `src/domain/*` engines — using the
established patterns already in the repo. Concretely that means:

- Tailwind utility classes with the tokens defined in `src/index.css` under `@theme`, never the
  raw hex values quoted in this document. The hex values are here so you can verify you picked
  the right token, not so you can paste them.
- Real values from the domain engines (`evaluateEligibility`, `computeAllNetbacks`,
  `rankNetbacks`, `calculateLogisticsRoute`, `getRouteTransitTariff`) instead of the flattened
  data tables baked into the prototypes.
- `lucide-react` icons. The prototypes use bare text and glyphs in a few places purely to avoid
  a dependency; the real screens keep Lucide, as MASTER §4 requires.

The prototypes are self-contained: open either file directly in a browser, no build step.

## Fidelity

**High-fidelity.** Colours, type sizes, weights, letter-spacing, spacing rhythm, borders and
interaction states are all final and deliberate. Recreate the UI pixel-perfectly using the
codebase's existing tokens and component patterns.

Two exceptions, both explicitly low-fidelity:

- **Marks levels are simulated.** Every price is illustrative, generated the way
  `src/domain/marks/simulate.ts` does. The design surfaces this honestly (`ESTIMATE · SIM`
  provenance chips) and that behaviour should survive — but do not treat any number as a
  researched market level.
- **Four plant rows carry invented operator/capacity attributes** (marked `VERIFIED` in the
  prototype) purely to show what a populated row looks like. The source registry has `null` for
  those fields on all but a handful of facilities. Either wire real verified data or render every
  row as `NAME ONLY`.

---

## Screens / Views

The prototype ships **seven screens**. Six live in `Cockpit Redesign.dc.html` behind an internal
screen switcher; the map is a separate file for a technical reason (below). In the real app each
becomes a route under the existing `Layout` shell, keeping the current `HashRouter` paths.

| # | Screen | Prototype location | Existing route | Existing file to change |
|---|---|---|---|---|
| 1 | Netback Ladder | `Cockpit Redesign.dc.html` | `/scanner` | `src/features/opportunity-scanner/ScannerScreen.tsx` |
| 2 | Compliance Map | `Map.html` | `/` | `src/features/map/MapScreen.tsx` |
| 3 | Trade Builder | `Cockpit Redesign.dc.html` | `/trade` | `src/features/trade-builder/TradeBuilderScreen.tsx` |
| 4 | Desk Copilot | `Cockpit Redesign.dc.html` | `/agents` | `src/features/arbitrage-agents/ArbitrageAgentsScreen.tsx` |
| 5 | Plant Registry | `Cockpit Redesign.dc.html` | `/plants` | `src/features/plants/PlantsScreen.tsx` |
| 6 | Desk Marks | `Cockpit Redesign.dc.html` | `/marks` | `src/features/marks/MarksScreen.tsx` |
| 7 | Trade Dossiers | `Cockpit Redesign.dc.html` | `/library` | `src/features/trade-library/LibraryScreen.tsx` |

Plus two modals and the shell:

| Element | Prototype location | Existing file to change |
|---|---|---|
| Delivery playbook modal | `Cockpit Redesign.dc.html` | `src/features/logistics/LogisticsModal.tsx` |
| Facility detail modal | `Cockpit Redesign.dc.html` | new, or inline in `PlantsScreen.tsx` |
| Header / ticker / footer | both files | `src/app/Layout.tsx` |

> **Why the map is a separate file:** the prototype's map needs `d3-geo` + `topojson-client`
> loaded as plain `<script>` tags at parse time. That is a constraint of the prototype format
> only. In the real app the map stays inside the `Layout` shell as a normal route — keep
> `react-simple-maps` and `src/assets/countries-50m.json`, and apply only the visual and
> interaction changes described in §2.

---

## 0. Shell — header, ticker, footer

`src/app/Layout.tsx`

### Header — height 52px, `bg-stone-900`, `border-b border-stone-800`, `sticky top-0 z-50`

Currently `h-13` (52px) — unchanged. Horizontal padding `px-4`. Contents left to right:

**Brand block** (flex, `gap-2`, no shrink)
- Glyph: 22×22px, `bg-teal-600`, no radius, centred letter `B` in JetBrains Mono 12px/700,
  colour `text-teal-950`. Replaces the current bordered `Terminal` icon tile — the solid teal
  square reads as a product mark rather than a button.
- Two stacked lines, `leading-[1.15]`:
  - `BIOMETHANE DESK` — mono, 12px, 600, `tracking-[0.14em]`, uppercase, `text-stone-100`
  - `RED III · EU-27 + UK + CH` — mono, 10px (`text-micro`), `tracking-[0.1em]`, `text-stone-400`
  - Both need `whitespace-nowrap`, or the subtitle wraps and overflows the fixed 52px header.
- The whole block stays a real `<button>` navigating to `/` with its existing `aria-label`.

**Nav** — full-height tabs, immediately after the brand, `ml-2`

This is the main shell change: the nav moves from pill-shaped `rounded` chips to **full-height
tabs with a 2px bottom border**, which is why the header reads as a terminal function bar rather
than a web app.

- Each tab: `flex items-center gap-1.5 px-3 h-[52px]`, mono 11px/600, `tracking-[0.1em]`,
  uppercase, `whitespace-nowrap`
- Rest: `text-stone-400`, `border-b-2 border-transparent`
- Hover: `text-stone-100` (`transition-colors duration-150` — never `transition-all`)
- Active: `text-stone-100`, `border-b-teal-500`, plus `aria-current="page"`
- Key hint: mono 10px, `text-stone-500`, `border border-stone-800`, `px-[3px]`, `aria-hidden`
- Keep the existing `focus-visible:ring-2 ring-teal-500` treatment — MASTER §5.1 calls the nav's
  missing focus ring the single biggest accessibility gap, so do not regress it.
- Labels shorten: `Ladder · Map · Trade · Copilot · Plants · Marks · Dossiers`. Drop the
  `Plants (1,975)` count from the label — it is stale against the 1,986 figure in the footer and
  the count belongs on the screen, not the tab.

**Right cluster** — `gap-3.5`, no shrink
- Pricing side selector: label `SIDE` in mono 10px `text-stone-400 tracking-[0.12em]`, then three
  buttons in a `border border-stone-800` group. Active: `bg-teal-600 text-teal-950`. Rest:
  `text-stone-400`. Mono 10px/700, `tracking-[0.08em]`, `px-2.5 py-[3px]`. Keep the existing
  `aria-pressed` + `role="group"` semantics.
- Staleness counts, `pl-3.5 border-l border-stone-800`: three chips driven by real
  `getMarkStaleness` counts — mono 10px/600 with a 5px dot:
  - `>30d` — `text-red-400`, dot `bg-red-500` with `animate-pulse` (MASTER §5.2 reserves pulse
    for live/critical status; this is the one legitimate use)
  - `>7d` — `text-amber-400`, dot `bg-amber-500`
  - `fresh` — `text-emerald-400`, dot `bg-emerald-500`

### Ticker strip — NEW, height 28px, `bg-stone-950`, `border-b border-stone-800`

A single scrollable row that takes over the price badges the header was overloaded with.

- `overflow-x-auto overflow-y-hidden`, and **hide the scrollbar** (`scrollbar-width: none` +
  `::-webkit-scrollbar { height: 0 }`). Without this the reserved scrollbar height eats into the
  28px and vertically clips the text.
- Each item: `flex items-baseline gap-1.5 pr-[22px] mr-[22px] border-r border-stone-900
  whitespace-nowrap`
  - Key: mono 10px, `tracking-[0.1em]`, uppercase, `text-stone-500`
  - Value: mono 11px/600, `tabular-nums`, `tracking-[-0.02em]`, `text-stone-200` (`.font-num`)
  - Delta: mono 10px/600 — `text-emerald-400` if positive, `text-red-400` if negative,
    `text-stone-500` if flat
- Items: TTF M+1, the four largest certificate marks, GBP/EUR, active CI, marks-filled count.
  Wire to `state.marks`; the delta needs a previous-value comparison the store does not keep
  today — either add one or omit deltas rather than faking them.

### Footer — height 26px, `bg-stone-900`, `border-t border-stone-800`

Mono 10px, `tracking-[0.06em]`, `text-stone-400`, `justify-between`. Left: baseline / regulation
/ plant-count provenance. Right: keyboard hints — `Keys 1–7 screens · ↑↓ rows · ⏎ playbook ·
Esc close`. Keep `text-stone-400`, not `stone-500`: MASTER §1.2 measures stone-500 on stone-950
at 4.06:1, which fails AA.

### Shell layout

```
h-screen flex flex-col overflow-hidden min-w-[1400px]
├── header    h-[52px] flex-none
├── ticker    h-[28px] flex-none
├── body      flex-1 min-h-0        ← per-screen grid
└── footer    h-[26px] flex-none
```

**The `min-w-[1400px]` matters.** The ladder's row grid needs roughly 800px in its centre column
between a 264px spine and a 336px rail. Below ~1400px total the columns crush and text overlaps.
The floor makes the page degrade to a horizontal scroll instead — MASTER §8 asks for 1024 to stay
*usable*, and a scrollable 1400px layout is usable where a collapsed one is not. The current app
uses `min-h-screen` with a scrolling body; this design is a fixed-viewport app shell where only
the inner panes scroll.

---

## 1. Netback Ladder — `/scanner`

The hero screen. Replaces the `<table>` in `ScannerScreen.tsx`.

### Layout

```
grid-cols-[264px_minmax(0,1fr)_336px]  min-h-0
├── aside   consignment spine   border-r border-stone-800, overflow-y-auto
├── main    ladder              flex flex-col min-h-0 min-w-0
└── aside   dossier rail        border-l border-stone-800, overflow-y-auto
```

### 1a. Consignment spine (left, 264px)

Sections divided by `border-b border-stone-800`, each `p-3`.

**Header** — `ACTIVE` chip (mono 10px/700, `text-teal-300 bg-teal-950 border border-teal-800`,
`px-1.5 py-0.5`) beside the section label.

**Origin block**
- ISO code, mono 18px/700, `tracking-[0.04em]`, `text-stone-100`, with a `flex-1 h-px
  bg-stone-800` rule and the word `ORIGIN` (mono 10px, `text-stone-500`) to its right
- One sentence of Inter 14px/1.5 `text-stone-300` describing the origin: name, registry, and
  whether the grid zone is EU-interconnected or isolated
- **Origin picker**: all 20 codes from `PRODUCING_ORIGINS` as 30px-wide chips, `flex-wrap gap-[3px]`,
  mono 10px/600. Rest `bg-stone-900 border-stone-800 text-stone-400`; selected
  `bg-sky-800 border-sky-600 text-sky-100`; **grid-isolated origins render `text-stone-500`** —
  GB, CH and NO cannot evidence UDB ingestion, which is the same reason UK RTFO hard-blocks, so
  the picker should say so before the trader clicks.
  Sky rather than teal here is deliberate: origin is a different *kind* of selection from
  destination, and it matches the map's origin marker.
- 2×2 stat grid, 1px `bg-stone-800` gaps as hairlines, cells `bg-stone-900 p-2`:
  Volume / Annex / Scheme / Custody. Keys mono 10px `text-stone-500` uppercase; values mono
  14px/600. Annex value is `text-emerald-400` when Annex IX-A qualifies.

**Carbon intensity block**
- Label row: section label plus a chip reading `CONSIGNMENT` (emerald) or `SIMULATED` (amber)
  depending on whether the slider has been moved off the consignment value
- Figure: mono **28px**/700, `tabular-nums`, `tracking-[-0.03em]`, `leading-none`. Signed.
- Caption: `gCO₂e/MJ · vs 94.0 baseline`, mono 10px `text-stone-400`
- Range input, `-150…50` step `5`. Track 3px `bg-stone-800`; thumb 12×12px `bg-teal-500` with a
  `border border-teal-950`, square. Scale labels below in mono 10px `text-stone-500`.
- Derived readout above a `border-t border-stone-800`: avoided tCO₂e/MWh in mono 14px/600
  `text-emerald-400`, computed `(94 − CI) × 0.0036`

**Cost stack** — four `label · hairline · value` rows (Inter 12px `text-stone-400` / mono 12px
`text-stone-200`), then an `ALL-IN` total above a `border-t`, mono 14px/700.
The fourth row is **route-dependent**: label it `Domestic injection`, `Transit XX→YY` or
`Multi-zone transit` according to `getRouteTransitTariff(origin, target)`, whose three tiers are
€0.50 / €1.80 / €3.20.

**Filters** — three checkbox-style buttons, full width, `p-1.5`, Inter 12px, with a 13px square
box (`bg-teal-600` + `×` when on). Rest `border-stone-800 text-stone-400`; on
`bg-stone-900 border-teal-800 text-stone-100`.
- `Positive netback only`
- `All six gates clear`
- `Hide marks older than 30d`

These three replace the prototype's earlier `Tradeable only` / `Marks only` pair, which filtered
nothing on this dataset. **Filters that do not visibly filter are worse than no filters.** In the
real app, restore `Tradeable only` (excluding `HARD_BLOCK` / `NONE` via
`row.eligibilityVerdict`) and `Marks only` (excluding `row.isModelled`) *in addition* to these,
since the real market set does contain blocked and modelled rows.

### 1b. Ladder (centre)

**Toolbar** — `p-2.5 px-3.5 border-b border-stone-800`, `justify-between`
- `h1` `NETBACK LADDER` — mono 14px/600, `tracking-[0.14em]`, uppercase. One `h1` per screen
  (MASTER §2.4).
- Sub-line, Inter 12px `text-stone-400`: market count · origin · pricing side · all-in basis
- Legend right: four 8px squares — emerald Eligible, amber Conditional, sky Unresolved, red
  Blocked. Mono 10px uppercase `text-stone-500`.

**Column grid** — identical on the header row and every data row:

```
grid-cols-[26px_26px_minmax(150px,1.1fr)_112px_104px_minmax(140px,1.6fr)_84px_58px]
gap-2.5  px-3.5
```

Header row `bg-stone-900 border-b border-stone-800 py-1.5`, mono 10px/600,
`tracking-[0.12em]`, uppercase, `text-stone-400`.

Columns: `#` · `CC` · `Market / scheme` · `Gates S U M A G N` · `Net €/MWh` (right) ·
`Spread vs all-in cost` · `Margin` (right) · `Age` (centre).

**Sortable headers.** Market, Net, Margin and Age are `<button>`s: transparent, mono 10px/600
uppercase, `text-stone-400`, active `text-teal-300` with a ` ▾`/` ▴` suffix, and a real
`aria-sort` of `ascending` / `descending` / `none` (MASTER §7). Clicking the active column
inverts direction.

**Data rows** — `py-1.5 border-b border-stone-900`, `cursor-pointer`,
`transition-colors duration-150`
- Rest `bg-stone-950`; hover `bg-stone-800`
- Selected: `bg-stone-900` plus `box-shadow: inset 3px 0 0 #14b8a6` — an inset teal edge, not a
  border, so the row does not shift by a pixel when selected
- Rank: mono 11px/600 `tabular-nums`, centred. Rank 1 gets `bg-teal-600 text-teal-950`; the rest
  `text-stone-500`.
- CC: mono 11px/600 `text-stone-400`
- Market cell: two stacked lines — name Inter 14px/600 `text-stone-100` (`text-stone-500` and
  `line-through` when blocked) over scheme/registry in mono 10px `text-stone-500`. Both
  `truncate`.
- **Gate strip**: six 16×16px cells, `gap-[2px]`, each a single letter in mono 10px/700, with
  `title="<gate label> — <verdict>"`. Tone by verdict:
  - PASS `text-emerald-400 bg-emerald-950 border-emerald-800`
  - CONDITIONAL `text-amber-400 bg-amber-950 border-amber-800`
  - UNRESOLVED `text-sky-400 bg-sky-950 border-sky-800`
  - HARD_BLOCK `text-red-400 bg-red-950 border-red-800`

  Letters `S U M A G N` map to Scheme recognition, UDB grid ingestion, Mass balance custody,
  Annex IX feedstock, GHG saving threshold, Member state specifics — i.e. the six gates
  `evaluateEligibility` already returns, in engine order. **The letter carries the meaning as
  well as the colour** (MASTER §1.4).
- Net: mono **14px**/700, `tabular-nums`, `tracking-[-0.02em]`, tone-coloured, `text-red-400`
  when negative, with a **`−€` prefix rather than a minus after the symbol**. Sub-line beneath in
  mono 10px `text-stone-500` shows the unit of account, or `CAPPED €/MWh` where the statutory
  ceiling binds (FR CPB at €100).
- **Spread bar**: a 20px-tall `bg-stone-900` track with `border-l border-stone-700` as the zero
  anchor, and an absolutely-positioned fill `inset-y-[3px] left-0` whose width is
  `|net| / max|net| × 100%`. Fill is the verdict tone, or `bg-red-800` when negative. This is the
  one place a computed percentage belongs in a style attribute.
- Margin: mono 12px/500 `tabular-nums`, right, `text-stone-400` (red when negative)
- Age: chip, mono 10px/600 — emerald ≤7d, amber 8–30d, red >30d. Reuse `StaleIndicator`.

**Keyboard** — `↑`/`↓` move the selection through the *filtered, sorted* row order (not the
source array), `⏎` opens the delivery playbook for the selected row, `Esc` closes any modal.
Skip the handler when focus is in an `INPUT`/`TEXTAREA`/`SELECT`, exactly as the existing 1–7
shortcut does in `Layout.tsx`.

**Blocked-opportunity banner** — pinned at the bottom, `bg-stone-900 border-t border-red-950`,
`p-2.5 px-3.5`
- `flex-none` is wrong here and will break the screen: with unbounded text the banner grows
  inside the flex column and squeezes the scroller above it to zero height. Use
  `flex-[0_1_auto] max-h-[74px] overflow-hidden`, give the scroller
  `flex-[1_1_auto] min-h-[220px]`, and `truncate` both banner lines.
- `BLOCKED` tag: mono 10px/700 `bg-amber-500 text-amber-950 px-1.5 py-0.5`
- Headline mono 12px/600 `text-stone-100`; body Inter 12px/1.5 `text-stone-400` with the remedy
  clause in `text-teal-300`; citation right-aligned in mono 10px `text-stone-500`
- Content comes from `getHighestBlockedOpportunity` — headline names the market and its
  unreachable theoretical netback, body gives the blocking reason and the remedy.

### 1c. Dossier rail (right, 336px)

Sections `p-3`, divided by `border-b border-stone-800`.

1. **Header** — `DOSSIER` label + verdict chip; `h2` market name Inter 16px/600; legal basis mono
   11px `text-stone-400`
2. **Stat grid** — 2×2 hairline grid: Net netback / Cert value / Plants / Production. Values mono
   16px/600 `tabular-nums`; net netback takes the verdict tone or red when negative.
3. **Dual-branch panel — Germany only.** Shown when the selected market carries an unresolved
   `Uncertainty` (today `DE_THG` / `DE_DOUBLE_COUNTING`). Two side-by-side cells:
   - `BRANCH 1 · 1× SINGLE` (amber tag) and `BRANCH 2 · 2× RETAINED` (sky tag), mono 10px/700
   - Netback per branch, mono 18px/700 `tabular-nums`, computed `cert × multiplier − allIn`
   - Margin line mono 10px `text-stone-500`, then a one-line note in Inter 11px/1.45
   - Below both, the persistent distinction verbatim from the registry's `persistentNote`:
     double counting is a **policy multiplier** being removed, whereas manure's negative CI is a
     property of the **GHG calculation** and is unaffected. Traders conflate these two; the panel
     exists to stop that.
   Drive the multipliers from `uncertainty.branches[].multiplier`, not hardcoded 1 and 2.
4. **Delivery route** — section label `Delivery route XX → YY` with a `PLAYBOOK →` text button
   (mono 10px/600 `text-teal-300`) opening the modal. Three option rows (A/B/C) in a hairline
   stack: a 17px tone-coloured tag square, label Inter 12px + note mono 10px, cost mono 12px/600.
   From `calculateLogisticsRoute`.
5. **Compliance gates** — label plus `n / 6 clear`. Hairline stack of six cells, each: 7px tone
   dot, gate label mono 11px/600, verdict chip; reason Inter 12px/1.5 `text-stone-400` indented
   14px; citation mono 10px `text-teal-300`. Straight from `assessment.gates[]` — label, verdict,
   reason, `citations[0].shortName`.
6. **Actions**, `mt-auto` — primary `Build trade dossier` full-width `bg-teal-600 text-teal-50`
   mono 12px/600 uppercase `p-2.5`, hover `bg-teal-500`; two secondaries side by side,
   `bg-stone-900 border border-stone-700 text-stone-300`, hover `bg-stone-800 text-stone-100`.

---

## 2. Compliance Map — `/`

Keep `react-simple-maps`, `ZoomableGroup` and `src/assets/countries-50m.json`. Apply these
changes only.

### Layout

`grid-cols-[minmax(0,1fr)_336px]` — map canvas left with a `border-r border-stone-800`, a
jurisdiction rail right that mirrors the ladder's dossier rail.

### Status colour scheme — the substantive change

Country **fills** are deep, desaturated tints; the legend swatches carry the bright hue:

| Status | Fill | Legend swatch |
|---|---|---|
| Active market | `emerald-800` `#065f46` | `emerald-500` |
| Emerging | `amber-900` `#78350f` | `amber-500` |
| Future 2028 (ETS2) | `sky-900` `#0c4a6e` | `sky-500` |
| Restricted — UDB gap | `red-900` `#7f1d1d` | `red-800` |
| No mechanism | `stone-900` `#1c1917` | `stone-800` |

Country strokes `stone-950` at 0.6px, scaled by `1/k` under zoom so borders stay hairlines.
Hover `opacity-[0.78]`.

**No teal in the status ramp.** Today the map spends teal on status, which collides with teal's
job as the interactive colour (MASTER §1.3 — "teal means *you can touch it*"). Freeing teal lets
selection, origin and target read unambiguously as things the trader controls. GB gets its own
`RESTRICTED` status rather than sitting in `ACTIVE`, because grid-injected volume cannot evidence
UDB ingestion for the RTFO — the map should show the block, not imply a tradeable market.

### Origin / target selection

This is the interaction to preserve from the current build, restated:

- **Right-click a country** → context menu at the cursor: 300px, `bg-stone-900/98`,
  `border border-teal-500`, `shadow-2xl`, `z-100`. Header with country name (Inter 14px/600) and
  `ISO XX` (mono 10px `text-stone-500`); a role chip (`ACTIVE ORIGIN` sky / `TARGET` emerald)
  when the country already holds a role; and a close button. Then a hairline stat grid — GIE/EBA
  facility count, installed TWh, national registry, implied netback from the current origin —
  followed by two primary actions, **`SET ORIGIN`** (sky) and **`SET TARGET`** (teal), and a
  full-width `Simulate in trade builder →`.
  Clamp the menu inside the viewport. Close on outside click and on `Escape`. Keep
  `role="dialog"`-style semantics and `aria-label`s.
- **Left-click** assigns according to a `SET ORIGIN` / `SET TARGET` mode toggle in the
  bottom-left overlay, so a trader reassigning repeatedly does not need the menu each time.
  Toggle buttons: mono 10px/700, active origin `bg-sky-800 text-sky-100`, active target
  `bg-teal-600 text-teal-950`.
- **Origin stroke** `sky-400` at 2px; **target stroke** `teal-400` at 2px; selection `teal-500`
  at 1.6px.
- Assigning a country to both roles is prevented — nudge the other role to a sensible neighbour
  rather than letting the route collapse to zero length.

### Flow line

A quadratic Bézier from origin centroid to target centroid, control point offset perpendicular
by 22% of the chord:

- Dark halo underneath: `stone-950`, 5.5px, `opacity-[0.85]` — without it the line disappears
  over emerald fills
- Line: `teal-300`, 2.2px, `stroke-dasharray: 6 5`, animating `stroke-dashoffset` to `-24` over
  1.1s linear infinite. Dashes read as a *virtual* UDB swap rather than a physical pipeline.
- Origin node: 4px `sky-400` circle; target node: 4.6px `teal-300` circle; plus a small
  arrowhead triangle at the target rotated along the curve tangent
- `pointer-events: none` on all of it
- Honour `prefers-reduced-motion` — `src/index.css` handles this globally

### Country labels

ISO code in mono 9.5px/600 `fill-stone-100` with `paint-order: stroke` and a 2.5px `stone-950`
stroke so labels stay legible over any fill; plant count beneath in mono 9px `fill-stone-400`.

**Only label where the shape can hold the text**: measure each country's projected bounding box
and skip labels under 24px wide or 18px tall, and skip the count under 34px tall. Without this
the Benelux/Baltic cluster becomes unreadable. Counter-scale label transforms by `1/k` under
zoom so text size stays fixed while geography grows.

> **Projection note.** If you ever fit the projection to the member-state features themselves,
> exclude overseas territories first: Natural Earth ships France with French Guiana, Spain with
> the Canaries and Norway with Svalbard, and fitting to those drags the frame across three
> continents. Fit to an explicit European window instead — corner points `[-11, 34]` and
> `[32, 70.5]`. (Use two points, not a polygon ring: a counter-clockwise ring is interpreted as
> the complement of itself — the whole sphere.)

### Overlays

`bg-stone-900/94`, `border border-stone-800`, `p-2.5` — top-left compliance legend with counts;
bottom-left active flow panel (origin ▶ target in mono 13px/700, consignment summary, mode
toggle, and the hint `Left-click assigns · right-click for both`); top-right a vertical
zoom-in / zoom-out / reset stack of 28px `bg-stone-900` buttons with `aria-label`s.

### Jurisdiction rail

Header with status chip and legal basis; 2×2 stat grid (active plants / installed TWh / avg plant
size / grid connection rate) from `COUNTRY_MACRO_STATS`; a registry-and-feedstock key/value
block; the route section with implied netback chip and the three delivery options; and a note
paragraph from the market's registry `notes`. Same type ramp as the ladder rail.

---

## 3. Trade Builder — `/trade`

Three equal columns, `grid-cols-[repeat(3,minmax(0,1fr))]`, each independently scrollable with
`border-r border-stone-800` between. Each column header is a numbered step: a 19px
`bg-teal-600 text-teal-950` mono 11px/700 square, then the step title in mono 12px/600
`tracking-[0.14em]` uppercase.

### Step 1 — Consignment

Stacked labelled field groups, `gap-3.5`. Each: label mono 10px/600 `tracking-[0.12em]` uppercase
`text-stone-400`; a `flex-wrap gap-[5px]` row of option buttons; then a **hint line** in Inter
12px/1.5 `text-stone-500` that changes with the selection.

Option buttons: `px-2.5 py-1.5`, mono 11px/600. Rest `border-stone-700 text-stone-400
bg-transparent`; selected `bg-teal-600 border-teal-600 text-teal-950`.

- **Origin** — all 20 `PRODUCING_ORIGINS` codes. Hint shows the origin's name, producing plant
  count and primary registry, and appends `· GRID-ISOLATED — no UDB ingestion` for
  `gridZone: 'NON_EU_ISOLATED'`.
- **Feedstock** — from `FEEDSTOCK_REGISTRY`. Hint explains the Annex IX classification, and for
  manure states that the negative CI comes from avoided methane in conventional manure management.
- **Certification scheme** — `ISCC EU`, `REDcert EU`, `ISCC PLUS`. The hint for `ISCC PLUS` must
  say it is voluntary-scope only and hard-blocks every compliance market.
- **Chain of custody** — `Mass balance`, `Book & claim`. The `Book & claim` hint must say it hard
  blocks FuelEU and every RED III compliance route.

The hints are the point of this column: a trader should learn *why* a choice breaks the trade
before submitting it, not after seeing a red gate.

Then the **CI block** above a `border-t`: label and a mono 20px/700 signed figure on one row, the
range slider, scale captions, and a GHG-saving-vs-94.0-baseline readout in mono 14px/600
`text-emerald-400`.

### Step 2 — Destination & legal validation

- **Target market** picker: label, then a clarifying line in Inter 12px `text-stone-500` —
  *"16 compliance mechanisms across 15 jurisdictions — France runs two in parallel. Not every
  producing origin operates one."* — then `flex-wrap gap-1` chips, `min-w-[34px] px-1.5 py-1.5`,
  mono 11px/600, selected `bg-teal-600 text-teal-950`.

  **Disambiguate markets that share an ISO code.** France has both CPB and TIRUERT, so a bare
  `FR` appears twice with no way to tell them apart; label them `FR CPB` and `FR TIRU` using the
  market's scheme tag whenever a country holds more than one market. Each chip gets a `title` of
  the full market name plus whether the country is also a producing origin.
- Selected market header: `h3` Inter 16px/600, legal basis mono 11px `text-stone-400`, verdict
  chip right.
- **Gate list**: the full six-gate audit, one hairline cell each — dot, gate label mono 11px/600,
  verdict chip, reason Inter 12px/1.55 indented 14px, citation mono 10px `text-teal-300`.

### Step 3 — Netback & dossier

- **Hero net netback**: mono **40px**/700, `tabular-nums`, `tracking-[-0.04em]`, `leading-none`,
  verdict tone or `text-red-400` when negative. Caption beneath in mono 11px `text-stone-500`:
  per MWh · pricing side · unit of account.
- **Waterfall**: six rows of `120px label · 16px bar track · 80px value`. Bar widths are
  `|value| / max|value| × 100%`; additive steps `bg-teal-600`, deductions `bg-red-800`, the final
  net `bg-emerald-500`. Values mono 12px, `tabular-nums`, deductions `text-red-400`, final row
  700-weight `text-emerald-400`. Steps: certificate value, delivered cost, transfer & registry,
  certification, **`Transit XX → YY`** (from `getRouteTransitTariff`), net netback.
- **Volume & P&L**: 2×2 hairline grid — volume, gross value, desk margin per MWh, annual P&L.
  Values mono 16px/600; the annual P&L takes emerald or red by sign. Use the real
  `calculateRealisticCommercialDeskMargin` with its explicit producer-share input rather than a
  flat 10% — and keep its behaviour of not clamping at zero, so loss-making routes stay visible.
- **Actions** `mt-auto`: `Save dossier with citations` primary, then `Export PDF` and
  `Send to copilot`.

---

## 4. Desk Copilot — `/agents`

`grid-cols-[minmax(0,1fr)_300px]`. Conversation left, suggested prompts right.

The framing to preserve: **the model selects and explains, the engines price.** The header
sub-line says so — *"Answers are gated by the eligibility engine — never by the model alone"* —
and the rail footer repeats it. Every figure rendered in an answer must come from
`computeAllNetbacks` / `evaluateEligibility` at render time, never from model output text.

- User turn: `self-end max-w-[60%]`, `bg-stone-900 border border-stone-700 p-2.5 px-3`, Inter
  14px/1.55
- Assistant turn: `max-w-[80%]`, `gap-2.5`. An 18px `bg-teal-600 text-teal-950` glyph beside
  `COPILOT · ENGINE-VERIFIED` in mono 10px/600 `tracking-[0.12em]` uppercase. Prose Inter
  14px/1.6 `text-stone-200`.
- **Embedded result table**: hairline stack of rows — CC, market name, verdict chip, netback in
  mono 13px/700 right-aligned at a fixed 78px. Rendered from the live ranked list.
- **Caveat block**: `border-l-2 border-amber-500 pl-2.5` with an uppercase amber label and the
  consequence in Inter 14px/1.6. This is where "if double counting goes to 1×" lives.
- **Citation chips**: mono 10px `text-teal-300 bg-teal-950 border border-teal-800 px-1.5`
- Composer: `border-t border-stone-800 p-3`, `bg-stone-950 border border-stone-700` input at
  Inter 14px with a teal `Ask` button
- Rail: suggested prompts as full-width left-aligned buttons, Inter 13px/1.5, `p-2.5 px-3`,
  `border-b border-stone-900`, hover `bg-stone-900 text-stone-100`

> **Known gap.** This is the thinnest screen in the redesign and the most speculative — the
> prototype shows a single canned exchange. Treat the *answer format* as the spec (structured:
> prose → engine table → caveat → citations) and the conversation content as placeholder.
> `src/domain/arbitrage/geminiService.ts` is the existing integration point.

---

## 5. Plant Registry — `/plants`

`grid-cols-[minmax(0,1fr)_336px]` — table left, country totals right.

### Table

Toolbar: `h1 PLANT REGISTRY` plus a count-and-provenance sub-line, and a filter chip row on the
right (`All`, per-country, `Verified`) — mono 11px/600, active `bg-teal-950 border-teal-800
text-teal-300`.

Row grid, header and body identical:

```
grid-cols-[26px_minmax(150px,1.5fr)_120px_90px_96px_minmax(120px,1fr)_108px] gap-2.5 px-3.5
```

CC · Facility · Operator · Nm³/h (right) · GWh/y (right) · Feedstock · Provenance (centre).

Rows `py-1.5 border-b border-stone-900`, hover `bg-stone-900`, `cursor-pointer` — clicking opens
the facility modal.

**Unrecorded fields are the design problem this screen has to solve.** 1,843 of 1,986 facilities
carry name and country only; `fieldsUnverified` lists what is missing. So:
- Render missing values as the literal word `unrecorded` in `text-stone-600` — never `—`, never a
  plausible-looking zero
- Provenance chip per row: `VERIFIED` emerald or `NAME ONLY` amber
- A pinned bottom bar, `bg-stone-900 border-t border-stone-800`, with an amber `UNVERIFIED` tag
  and one truncated line: *"1,843 of 1,986 facilities carry facility name and country only —
  capacity, coordinates and operator are unverified in the GIE/EBA source map. Do not price a
  trade off an unverified row."*

MASTER §9 lists "no filtering on data views" as an anti-pattern — 1,986 rows need the filter row,
and ideally a text search on facility name too.

### Country totals rail

One row per country: ISO in mono 11px/600 at a fixed 22px, country name Inter 13px truncated with
a 3px `bg-stone-800` bar beneath whose teal fill is `plants / max × 100%`, then plant count mono
12px/600 and TWh mono 10px `text-stone-500` right-aligned. From `COUNTRY_MACRO_STATS`.

---

## 6. Desk Marks — `/marks`

Full-width column.

- Toolbar: `h1 DESK MARKS`, sub-line naming the certificate count and that levels are simulated,
  and `Import snapshot` / `Export snapshot` buttons (secondary / primary)
- **Index cards**: four columns, 1px hairline gaps, `p-3 px-3.5` — TTF month+1, GBP/EUR,
  CHF/EUR, marks-filled count. Key mono 10px/600 uppercase with an age chip right; value mono
  **24px**/700 `tabular-nums` `tracking-[-0.03em]`; sub-line mono 11px `text-stone-500` carrying
  bid/offer or provenance.
- Row grid:
  ```
  grid-cols-[26px_minmax(160px,1.4fr)_92px_repeat(3,minmax(72px,0.8fr))_96px_130px_62px]
  ```
  CC · Market · Unit · Bid · Mid · Offer · Spread · Source · Age
- Bid `text-emerald-400`, offer `text-red-400`, spread `text-stone-400`, all mono 12px
  `tabular-nums` right-aligned
- **The mid cell is an editable `<input type="number">`** — full-width, right-aligned, mono
  12px/600, `bg-stone-950 border border-stone-800`. Step 0.001 for €/kgCO₂e and £/dRTFC, else
  0.5. Needs a real `aria-label` (MASTER §6 — inputs get labels, not placeholders).
- On edit: the input turns `bg-teal-950 border-teal-800 text-teal-300`, the source chip flips
  from `ESTIMATE · SIM` to `DESK · MANUAL`, the age chip reads `now` in emerald, and **the ladder
  and every netback re-price from the new level**. That round trip is the whole point of the
  screen — dispatch to the existing marks reducer with real provenance
  (`sourceType: 'BROKER'` or `'DESK'`, `observedAt: now`) rather than holding local state.
- Source chip: mono 10px `text-stone-500 bg-stone-900 border border-stone-800 px-1.5 py-0.5`
- Age chip: emerald ≤7d, amber 8–30d, red >30d

---

## 7. Trade Dossiers — `/library`

Two-column card grid, `p-3.5 gap-3.5`, cards `border border-stone-800 bg-stone-950`.

Each card:
- Header `p-2.5 px-3 border-b border-stone-800`: `h2` title Inter 16px/600, reference and save
  date in mono 10px `text-stone-500`, verdict chip right
- 3-column hairline stat strip: volume / netback / margin. Values mono 14px/600 `tabular-nums`,
  netback `text-emerald-400`.
- Body `p-2.5 px-3 border-t border-stone-800`: a note paragraph in Inter 12px/1.55
  `text-stone-400`, then a footer row with a **mark-drift line** in mono 10px, tone-coloured by
  severity, and `Recalculate` / `Open` secondary buttons
- Drift text states what has moved since the dossier was saved and what it does to the netback —
  a dossier priced off stale marks is the hazard this screen exists to surface (MASTER §7).

Keep archived rejected trades (e.g. the UK RTFO hard block) in the library rather than deleting
them: the dossier is the evidence of *why* a corridor was declined, which is what makes it
defensible on audit.

---

## Modals

Both: `fixed inset-0 z-100`, scrim `bg-black/75`, panel `bg-stone-950 border border-stone-700
shadow-[0_24px_64px_rgba(0,0,0,0.6)]`. Square corners — MASTER §3.3 allows a shadow only on a
modal, and never a radius on a panel.

Required behaviour for both (MASTER §6): `role="dialog"`, `aria-modal="true"`, `aria-label`,
**Escape closes**, focus trapped inside and **restored to the trigger on close**. The prototype
implements Escape only — the real implementation needs the focus trap.

### Delivery playbook modal

Replaces `LogisticsModal.tsx`. `max-w-[1120px]`, page-scrolling with `p-8 px-6` around it.

- Header `bg-stone-900 border-b border-stone-800`: title `DELIVERY PLAYBOOK · XX → YY` in mono
  14px/600 uppercase, and a sub-line naming origin hub → target hub, the basis spread and the
  transit tariff. `ESC ✕` close button, `border border-stone-700`.
- **Three mode columns**, hairline-separated, `p-3.5 px-4`, from `calculateLogisticsRoute`:
  - Option tag chip and a feasibility chip on one row. Feasibility takes its own tone —
    `HIGH` emerald, `MEDIUM`/`CONTESTED` amber, `LOW`/unverified red — and it must not be
    conflated with the recommendation: the recommended virtual swap is `CONTESTED` in some member
    states, and the design should show that tension rather than hide it.
  - `h3` mode title Inter 14px/600
  - Total cost mono **24px**/700 in the mode tone — but when a leg is unverified, print
    `TARIFF INCOMPLETE` in mono 15px `text-amber-400` instead of a number. **Never sum around a
    null tariff.**
  - Timeline and feasibility in mono 10px `text-stone-500`; summary Inter 12px/1.55
  - Line items: `label · hairline · value` rows, Inter 11px / mono 11px/600, with `unverified` in
    `text-amber-400` where `costEurMwh` is null
  - `FOR` (emerald label) and `AGAINST` (amber label) lists in Inter 11px/1.5, then the legal
    basis in mono 10px `text-teal-300`
- **Execution steps** (left, 1.1fr): numbered 18px squares, step title Inter 13px/600, actor in
  mono 10px `text-stone-500`, then each action as Inter 12px/1.55. Four phases from
  `assessment.executionSteps` — origination, hub execution, UDB transfer, settlement and
  statutory cancellation.
- **Hub basis & interconnection** (right, 1fr): 2×2 hairline grid — origin hub, target hub, basis
  to TTF, basis spread — from `HUB_BASIS_SPREADS`. Then a stack of interconnection points from
  `INTERCONNECTION_POINTS`: IP name mono 11px/600 with a confidence chip, the TSO pair and note
  in Inter 11px `text-stone-500`, and platform plus tariff status on a final row. Where no
  continuous route exists, say so and point at the swap or bio-LNG alternative.
- Closing note in Inter 11px `text-stone-500`: tariffs are unverified until confirmed on PRISMA,
  and winter cleared prices run 3–5× summer.

### Facility detail modal

`max-w-[520px]`, centred. Header carries the facility name (Inter 16px/600), `XX · FACILITY
RECORD` in mono 10px, and a provenance chip. A 2×4 hairline field grid — operator, status,
capacity, annual energy, feedstock, upgrading technology, grid connection, registry — with values
mono 13px/600 and every missing one rendered as `unrecorded` in `text-stone-600`. A provenance
paragraph closes it, naming GIE/EBA European Biomethane Map 2026 and stating plainly that
unverified rows must not be priced against.

---

## Interactions & Behaviour

| Trigger | Result |
|---|---|
| `1`–`7` | Switch screen (existing `Layout.tsx` handler) |
| `↑` / `↓` on ladder | Move row selection through filtered+sorted order |
| `⏎` on ladder | Open delivery playbook for selected row |
| `Esc` | Close open modal / context menu |
| Click ladder row | Select; dossier rail updates. No layout shift. |
| Click sortable header | Sort by column; re-click inverts. `aria-sort` updates. |
| Toggle filter | Re-filter; row count in toolbar updates |
| Drag CI slider | Re-price every netback, re-rank the ladder, recompute avoided CO₂e and GHG saving; CI chip flips to `SIMULATED` with a reset affordance |
| Change origin | Recompute transit tariff, re-price and re-rank; spine and cost stack update |
| Change pricing side | Re-price from bid/mid/offer marks |
| Edit a mid mark | Re-price everything; provenance flips to `DESK · MANUAL`, age to `now` |
| Right-click country (map) | Context menu with Set Origin / Set Target |
| Left-click country (map) | Assign per the mode toggle |
| Click plant row | Facility detail modal |

All transitions `transition-colors duration-150`. Never `transition-all` — MASTER §5.2 counts 43
existing uses and they reflow dense tables. Animate `transform` and `opacity` only; the sole
looping animations are the stale-critical dot pulse and the map flow dashes, both gated by
`prefers-reduced-motion`.

## State Management

Extends the existing `src/store/context.tsx` reducer; nothing here needs new infrastructure.

| State | Type | Notes |
|---|---|---|
| `screen` | route | Already handled by `HashRouter` |
| `originCountry` | ISO2 | One of the 20 `PRODUCING_ORIGINS`; drives transit tariff |
| `targetCountry` / `selectedMarketId` | id | Ladder selection ↔ map target ↔ dossier rail |
| `carbonIntensity` + `ciOverride` | number \| null | Null override means "use the consignment value"; the distinction drives the `CONSIGNMENT` / `SIMULATED` chip |
| `feedstockKey`, `scheme`, `chainOfCustody` | enum | Trade builder step 1 |
| `pricingSide` | `bid`\|`mid`\|`offer` | Exists |
| `sortBy` + `sortDir` | `net`\|`margin`\|`age`\|`name`, ±1 | New |
| `filters` | 3–5 booleans | New |
| `marks` | per-market bid/mid/offer + provenance | Exists; the mid input dispatches into it |
| `plantFilter` | string | New |
| `modal` | `null` \| `'logistics'` \| `{plant}` | New |
| `mapClickMode` | `SET_ORIGIN`\|`SET_TARGET` | Exists |
| `contextMenu` | `{x, y, iso2}` \| null | Exists |

Derived per render, never stored: eligibility assessments, netbacks, ranked list, logistics
assessment, staleness bands.

## Design Tokens

All already in `src/index.css` under `@theme`. Use the token, never the hex — MASTER §1.1 is
explicit that raw hex in components is how the codebase acquired two parallel palettes.

**Neutrals — `stone` only.** `slate` / `gray` / `zinc` / `neutral` are banned.

| Token | Tailwind | Hex |
|---|---|---|
| `surface-base` | `stone-950` | `#0c0a09` |
| `surface-raised` | `stone-900` | `#1c1917` |
| `surface-overlay` | `stone-800` | `#292524` |
| `border-subtle` | `stone-800` | `#292524` |
| `border-default` | `stone-700` | `#44403c` |
| `content-primary` | `stone-100` | `#f5f5f4` |
| `content-secondary` | `stone-400` | `#a8a29e` |
| `content-muted` | `stone-500` | `#78716c` — decorative/disabled only, fails AA for text |

Also used: `stone-600` `#57534e` (the `unrecorded` word), `stone-300` `#d6d3d1`,
`stone-200` `#e7e5e4`.

**Semantic accents — one family per meaning.**

| Token | Family | 400 / 500 | 800 / 950 | Means |
|---|---|---|---|---|
| `accent` | teal | `#2dd4bf` / `#14b8a6` | `#115e59` / `#042f2e` | Interactive: selection, focus, CTA, links |
| `positive` | emerald | `#34d399` / `#10b981` | `#065f46` / `#022c22` | PASS, eligible, fresh, profit |
| `warning` | amber | `#fbbf24` / `#f59e0b` | `#92400e` / `#451a03` | Conditional, stale >7d, unverified |
| `danger` | red | `#f87171` / `#ef4444` | `#991b1b` / `#450a0a` | Blocked, stale >30d, negative |
| `info` | sky | `#38bdf8` / `#0ea5e9` | `#075985` / `#082f49` | Unresolved, origin role, neutral fact |

Plus `teal-600` `#0d9488` (primary button, brand glyph), `teal-300` `#5eead4` (citations, active
sort), `sky-800` `#075985` (selected origin chip).

**Type.** JetBrains Mono for all figures, codes, labels, chips, screen titles and citations;
Inter for sentences, descriptions, hints and button labels. Scale, nothing outside it:

| Token | Size | Used for |
|---|---|---|
| `text-micro` | 10px | Chips, eyebrows, key hints — **hard floor** |
| `text-meta` | 11px | Metadata, gate labels, IP names |
| `text-xs` | 12px | Dense cells, hints, body |
| `text-sm` | 14px | Default body, market names, row figures |
| `text-base` | 16px | Panel titles, rail stat figures |
| `text-lg` | 18px | Origin code, branch netbacks |
| `text-xl` | 20px | Trade-builder CI figure |
| `text-2xl` | 24px | Index card values, playbook totals |

Two deliberate steps above the scale, both single-instance hero figures: **28px** (spine CI) and
**40px** (trade-builder hero netback). If you would rather stay strictly on-scale, snap them to
24px — nothing else depends on them.

No 8px, 9px, 13px, 15px or 17px anywhere. Weight: 700 only at 16px+ and on chips/figures; 600 for
labels, table headers and active nav; 400 for body.

`tabular-nums` + `tracking-[-0.02em]` on **every** numeric cell, applied to the leaf element via
`.font-num` — never inherited from a container, or the column stops aligning the moment a parent
is refactored.

**Spacing** — 4px base, `0.5 1 1.5 2 3 4 6 8 12` only. Panel padding `p-3`; row padding
`py-1.5 px-3.5`; grid gaps `gap-2.5` / `gap-3.5`; hairline gaps are `gap-[1px]` over a
`bg-stone-800` parent. No `py-0.2`-style fractions — they compile to nothing.

**Radius** — square panels, cards, wells and modals. 4px (`rounded`) on chips, buttons, inputs.
`rounded-full` on status dots only. Nothing else.

**Elevation** — 1px hairlines and surface lightness. No shadows except the two modals.

**Z-index** — `0` base, `10` sticky sub-headers, `40` drawers, `50` header, `100` modals and the
map context menu.

## Assets

No new assets. Icons come from `lucide-react` at the existing sizes (`w-3.5 h-3.5` inline/chip,
`w-4 h-4` control, `w-5 h-5` header). Geography stays `src/assets/countries-50m.json`. Fonts
(Inter, JetBrains Mono) load from the existing `<link>` in `index.html`.

The prototypes use text glyphs instead of Lucide icons in a handful of spots — sort arrows, close
buttons, the flow arrow — purely to stay dependency-free. **Use Lucide in the real
implementation**; MASTER §4 bans unicode glyphs as structural icons because they render
differently per platform and ignore `currentColor`.

## Files

| File | Contents |
|---|---|
| `Cockpit Redesign.dc.html` | Six screens plus both modals. Open directly in a browser. Nav tabs and keys 1–7 switch screens. |
| `Map.html` | Compliance map — real Natural Earth geometry via d3-geo. Right-click a country for the origin/target menu. |

Both are self-contained, no build step. Data tables inside them are flattened extracts of
`src/domain/*` for prototype purposes — read the real engines, not these.

## Source of truth

`design-system/MASTER.md` outranks this document. Where they disagree, MASTER wins and this
document is wrong. The two intentional departures from current *code* (not from MASTER) are
called out above: full-height nav tabs instead of pill chips, and status colours moving off teal
so teal can mean "interactive" exclusively.
