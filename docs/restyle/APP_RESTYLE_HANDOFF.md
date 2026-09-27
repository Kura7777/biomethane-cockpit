# App-wide restyle: bring every screen to the FuelEU desk look

**Delegation prompt.** Copy everything from "PROMPT START" to the end into the other model. It is self-contained.

---

## Plan

**Goal.** Every screen should share the FuelEU Maritime desk's look and feel:
- IBM Plex Sans;
- warm off-white background;
- soft 1px lines;
- rounded 8/12 px corners;
- sentence-case labels;
- tabular figures;
- a centred page column.

Today the rest of the app is Archivo, square-cornered, uppercase-tracked and monospace-heavy.

**Confirmed Design Decisions:**
- **Gains & Positive Margins in Blue**: Use blue (`#1f5fad` light, `#7fb0f0` dark) across all screens (including Trade Builder, Pricing Desk, and FuelEU) for positive financial margins, P&L spreads, and surpluses. Green is reserved strictly for statutory compliance pass/OK checks (e.g. RED III >= 65%, mass balance validation, certified registry matches).
- **Dark Top Bar Navigation**: Top bar stays dark (`#15171c` light, `#0b0d10` dark) with IBM Plex Sans and sentence-case navigation tab labels ('Pricing desk', 'Trade builder', 'Origination'), while compact market ticker and status badges ('TTF M+1', 'SIMULATED', 'MID') remain uppercase.

**Why this is mostly a token job.** The app already styles itself through CSS variables (`--color-*`, `--font-*` in [src/index.css](../../src/index.css)). The FuelEU screen gets its look by re-pointing those same variables inside `.fueleu-desk`. Promoting its values to the global `:root`/`.dark` does roughly 60% of the work in one file.

The other two big levers are both in `src/index.css`:
- one global rule that forces square corners: `*, *::before, *::after { border-radius: 0 !important; }`;
- the shared utility classes (`.btn`, `.chip`, `.seg`, `.input`, `.eyebrow`, `.ptitle`, `.big`, `.navtab`, `.lbl`, `.kv`).

**What remains is per-screen cleanup.** Outside FuelEU, the `.tsx` files contain about:
- 1,370 hard-coded hex colours;
- 2,940 inline `style={{}}` objects;
- 240 `uppercase` classes;
- 310 `font-mono` classes.

That is done screen by screen, in order of use.

| Phase | What | Size | Visible result |
|---|---|---|---|
| 0 | Baseline screenshots of every route (light/dark, 1440 and 2560) | S | none, reference only |
| 1 | Global tokens, fonts, radius and shared classes in `src/index.css`; header and footer chrome | M | whole app shifts ~60% of the way |
| 2 | Shared layout primitives extracted from FuelEU (page shell, page header, tabs, KPI tile, card, table, side panel) | M | none (FuelEU refactor, pixel-identical) |
| 3 | Screen-by-screen migration (list below) | L | each screen fully on-brand |
| 4 | Sweep: grep gates, dark mode pass, e2e, final screenshots | S | consistency |

**Screen order for phase 3:**
1. Trade builder / deal flow (`features/commercial`, `features/trade-builder`)
2. Pricing desk (`features/marks`)
3. Origination (`features/sourcing`, `plants/OriginationPipelineScreen`)
4. Plants (`features/plants`) ⚠ see the guardrail on uncommitted files
5. Registries
6. Map (chrome only, not the map tiles)
7. Citations
8. Sources (`provenance`)
9. Assumptions / Settings / Data connectors
10. Scanner, Auditor, Curves, Risk, Logistics, Trade library

**Recommended way to run it:**
- One model session per phase.
- In phase 3, one session per 2–3 screens.
- Review the before/after screenshots after each commit before starting the next session.

---

PROMPT START

You are restyling a React 18 + TypeScript + Vite + Tailwind v4 app so every screen matches one reference screen that the owner has approved. This is a **visual-only** change.

## Repo and context

- **Repo:** `C:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)`, branch `main`.
- **Commands:**
  - unit tests: `npx vitest run`, 689 tests, must stay green;
  - types: `npx tsc --noEmit`;
  - build: `npm run build`;
  - e2e: `npx playwright test` (specs in `e2e/`);
  - dev server: `npx vite --port 5199 --strictPort`. Routes are hash routes, e.g. `http://localhost:5199/#/fueleu-shipping`.
- **Reference look:** the FuelEU Maritime screen, `#/fueleu-shipping`.
  - Styles: `src/features/fueleu/fueleuDesk.css`, the single source of truth for the design. Read all of it first.
  - Components: `FuelEUShippingScreen.tsx`, `FuelEuHeader.tsx`, `FuelEuKpiTiles.tsx`, `FuelEuDirectoryDesk.tsx`, `FuelEuSidePanel.tsx`.
- **Global styles:** `src/index.css`, which holds Tailwind `@theme` tokens, `:root`/`.dark` variables and shared classes.
- **App chrome:** `src/app/Header.tsx`, `src/app/Layout.tsx`.
- **Routed screens:** see `src/app/App.tsx`.
- **Theme:** dark mode is toggled by the `dark` class on `<html>`.

## Hard guardrails (read twice)

1. **Styling only.** Do not change:
   - calculations, data, props, state, routing or event handlers;
   - test files, except where a test asserts a class name you renamed, and then say so;
   - any user-visible wording. Case changes go through CSS (`text-transform`), never by editing the string.

   `src/__tests__/fueleu_copy_claims.test.ts` and other copy tests must keep passing.
2. **Another session is editing this tree.** Before each phase, run `git status`.
   - Do **not** edit any file that is already modified or untracked when you start. At the time of writing that includes `src/features/plants/PlantSourcingDrawer.tsx`, `src/domain/plants/*`, `scripts/*` and `data/plant_research/*`.
   - If a screen you need is dirty, skip it and list it in your report.
3. **Uncommitted edits in this folder get silently reverted** (OneDrive sync).
   - `git add <file>` immediately after every edit.
   - Before each commit, run `git diff --cached --stat` and grep for one of your new rules to confirm the edits are still there.
4. **Staging and pushing.**
   - Stage only files you changed. Never use `git add -A` or `git add .`.
   - Commit per phase, and per screen in phase 3.
   - **Do not push.** The owner reviews screenshots first.
   - End each commit message with the line `Co-Authored-By: <your model name> <noreply@anthropic.com>` or your vendor's equivalent.
5. **FuelEU must not change visually.** After phases 1 and 2, re-screenshot `#/fueleu-shipping` and compare with the phase-0 baseline. Any visible difference is a bug in your change.
6. **No new dependencies.** Fonts already load from Google Fonts in `index.html`.

## Design spec (take exact values from fueleuDesk.css; summary here)

### Palette

| token | light | dark |
|---|---|---|
| bg (page) | `#f6f6f3` | `#0e1014` |
| surface (cards) | `#ffffff` | `#15181e` |
| ink (text) | `#15171c` | `#ecedef` |
| muted | `#5e6470` | `#9aa1ad` |
| line (borders, dividers) | `#e4e4df` | `#262a31` |
| track (bar backgrounds, subtle fills) | `#eeeeea` | `#262a31` |
| selected row | `#f4f6fa` | `#1b2029` |
| accent (primary action, brand red) | `#c9321f` | `#c9321f` |
| negative / deficit | `#b03a2e` | `#f08a7c` |
| positive / surplus | `#1f5fad` | `#7fb0f0` |
| warning | `#c27a12` | `#e0a43a` |

Status backgrounds are the status colour at 8–14% alpha. See the `--color-status-*` mapping in fueleuDesk.css.

Positive is **blue, not green**, by design. Keep green only where it means "OK / pass" and is a status the user must read at a glance, e.g. compliance checks. Flag each such case in your report.

### Type
- **Family:** IBM Plex Sans for everything, with `font-variant-numeric: tabular-nums` on all figures.
- **IBM Plex Mono** only for identifiers and codes: deal IDs like `DEAL-2026-DK-DE_THG`, IMO numbers, registry IDs, the TTF ticker. Numbers in tables, KPIs and inputs are Sans.
- **Scale:**
  - 12 px caption (the minimum anywhere);
  - 13 px meta, labels and tabs;
  - 14 px base and table cells;
  - 20 px panel title and stat values;
  - 24 px H1;
  - 28 px KPI value.
- **Weights:** 400 body, 500 values and emphasis, 600 titles. No 800.
- **Labels are sentence case.**
  - No `uppercase` and no wide `tracking-*` on labels, section headers, buttons, chips or segmented options.
  - "PRODUCTION & DELIVERY SCHEDULE" becomes "Production & delivery schedule" via CSS, with a 14 px/600 section heading.
  - Exception: tiny status badges such as SIMULATED or BLOCKED may stay uppercase at 11–12 px.

### Shape and space
- **Radius:**
  - 8 px on controls (buttons, inputs, pills, chips, segmented controls);
  - 12 px on cards, tables and panels;
  - 3 px on bars and dots.
- **Borders:** 1 px `line` everywhere. No heavy borders, no drop shadows on cards (flat, line-separated).
- **Spacing:** 8 px grid. Cards have 20–24 px padding, gaps between cards are 16–24 px, controls are 32 px high (36 px for primary CTAs).
- **Page column:**
  - max-width 1840 px, centred;
  - 32 px side gutters, 24 px at ≤1440 px;
  - one vertical scroll (the app's `<main id="main-content">`), no nested scroll boxes except intentional side panels.

### Components (copy the behaviour of the fe-* class noted)
| Component | Spec | Copy from |
|---|---|---|
| Page header | H1, plus a 13 px muted context line; status pills right-aligned | `.fe-h1`, `.fe-context` |
| Pills | Info pills in the header | `.fe-pill` |
| Tabs | Underline tabs: 14 px muted; the active tab is ink, 500, with a 2 px ink underline; 24 px gap; 1 px line under the row | `.fe-tabs`, `.fe-tab` |
| KPI tile | 13 px muted label, 28 px/500 value with a 14 px muted unit, 12 px muted sub-line; equal heights | `.fe-kpi-*` |
| Segmented control / toggle | 32 px high; the selected option is an ink fill with bg-coloured text; the others are surface with a line border | `.fe-seg`, `.fe-toggle-btn` |
| Primary button | Accent fill, white text, 8 px radius, 500 weight, sentence case | — |
| Secondary button | Surface fill, line border, ink text | — |
| Ghost button | No border, muted text, track background on hover | — |
| Inputs | 32–36 px high, line border, 8 px radius, 2 px accent focus ring (`:focus-visible`) | `.fe-search` |
| Data table | Card with 12 px radius; 13 px muted header row with sort icons; 56 px rows; numbers right-aligned tabular; row hover `track`; selected row `sel` with a 2 px ink left bar | `.fe-table-*` |
| Charts | Same palette; 12 px tick labels; dotted gridlines in `line` | `FuelEuProjectionChart.tsx` |

## Phases

### Phase 0: baseline
1. Write a Playwright script at `scratch/restyle/shoot.mjs` that visits every route in `src/app/App.tsx` at 1440×900 and 2560×1300, in light and dark. Set dark by adding the `dark` class to `<html>` or using the header's Dark button.
2. Save the screenshots to `scratch/restyle/before/<route>_<w>_<theme>.png` and record the console errors per route.
3. No code changes and no commit (`scratch/` is gitignored).

### Phase 1: global tokens and shared classes (`src/index.css`, `index.html`, `src/app/Header.tsx`, `src/app/Layout.tsx`)
1. **Tokens.** Replace the `@theme`, `:root` and `.dark` colour values with the palette above, keeping the existing `--color-*` names so every consumer updates automatically.
   - Keep the `--color-accent-100…900` and `--color-neutral-*` ramps, retuned so that `accent-600` ≈ `#c9321f`.
   - Neutrals become warm greys consistent with `line`, `track` and `muted`.
2. **Fonts.** Set `--font-body` and `--font-heading` to `'IBM Plex Sans', system-ui, sans-serif`, and `--font-heading-weight: 600`.
   - Remove the Archivo `<link>` from `index.html` only after grepping that nothing else names Archivo.
   - Add `--font-mono: 'IBM Plex Mono', ui-monospace, monospace`, and map Tailwind's `font-mono` to it in `@theme`.
3. **Radius.** Delete the global `border-radius: 0 !important` rule.
   - Add `--radius-control: 8px`, `--radius-card: 12px`, `--radius-bar: 3px`.
   - Apply them in the shared classes. Removing the rule will let Tailwind `rounded-*` classes take effect, so review a few screens for anything that now looks wrong.
4. **Shared classes.** Restyle `.btn*`, `.chip*`, `.tag*`, `.seg`/`.seg-opt`, `.input`, `.field > label`, `.eyebrow`, `.ptitle`, `.big`, `.subttl`, `.lbl`, `.kv`, `.navtab`, `.cellrow` to the component spec.
   - `.eyebrow` and `.chip` lose `uppercase` and wide letter-spacing.
   - `.seg-opt.active` becomes the ink-filled selected state.
5. **Header and footer chrome.** Keep the dark top bar, since the owner likes it, but move it to Plex Sans with 13–14 px sentence-case nav labels.
   - Header background: `#15171c` in light, `#0b0d10` in dark.
   - The active nav item keeps its accent underline.
   - Footer status bar: 12 px, muted, a 1 px line on top.
6. **FuelEU cleanup.** Once global values equal FuelEU's, delete the now-redundant `--color-*` re-skin block and the `html.dark .fueleu-desk --color-status-*` overrides from fueleuDesk.css. Keep the `--fe-*` names as aliases of the global tokens.
7. **Checks.**
   - Re-screenshot all routes into `scratch/restyle/phase1/`.
   - FuelEU must be unchanged.
   - vitest, tsc, build and e2e all green.
8. **Commit:** `style(app): adopt FuelEU design tokens, Plex type and radius globally`.

### Phase 2: shared primitives (no visual change)
1. Create `src/shared/ui/`, holding `desk.css` and small components:
   - `PageShell`: the centred max-width column and gutters;
   - `PageHeader` (title, context and right slot);
   - `Tabs`;
   - `KpiTile` / `KpiRow`;
   - `Card` (title, optional right slot, body);
   - `DataTable` styles: header row, 56 px rows, numeric cells, selected row, footer pagination;
   - `SidePanel`: sticky, with only its body scrolling.
2. Class prefix `ds-`. Values come from the phase-1 tokens.
3. Move the generic rules from fueleuDesk.css into `desk.css`, and make the FuelEU components use the shared primitives. FuelEU-specific rules (diverging balance bar, projection chart) stay in fueleuDesk.css.
4. **Check:** FuelEU screenshots are pixel-identical to the phase-0 baseline (±anti-aliasing), plus all the tests.
5. **Commit:** `refactor(ui): extract shared desk primitives from FuelEU`.

### Phase 3: per-screen migration (one commit per screen, in the order listed in the plan)

For each screen:
1. **Layout.** Wrap the screen in `PageShell` and use `PageHeader` / `Tabs` / `Card` / `KpiTile` / `DataTable` where the screen has the equivalent structure.
   - Don't restructure layouts that work: the Trade builder's two-column card grid stays two columns.
   - Stepper tabs, e.g. "1 Consignment & Asset", become underline or segmented tabs with a small numbered circle, not boxed red squares.
2. **Colours.** Replace hard-coded hex and `rgb()` in inline styles and `className`s with tokens (`var(--color-…)` or Tailwind theme classes).
   - Chart series colours go into tokens (`--chart-1…6`) defined once in `src/index.css`.
3. **Case and spacing.** Remove `uppercase` / `tracking-*` from labels and headings. Keep the text unchanged.
4. **Fonts.** Remove `font-mono` from numbers; keep it on identifiers and codes. Add `tabular-nums` where figures sit in columns.
5. **Spacing, radius and type.** Normalise to the 8 px grid, the radius tokens and the type scale. Nothing smaller than 12 px.
6. **Inline styles.** Where a large block of them exists purely for styling, convert them to classes in the feature's own `.css` file, as FuelEU does. Leave dynamic styles (computed widths, positions) inline.
7. **Checks.**
   - Screenshot before and after into `scratch/restyle/<screen>/`, at both widths and both themes.
   - 0 console errors.
   - vitest, tsc and build green.
8. **Commit:** `style(<screen>): migrate to desk design system`.

### Phase 4: sweep

**Grep gates.** Report counts before and after for each:
- hex colours in `src/features/**/*.tsx` excluding fueleu; the target is under 50, each remaining one justified;
- `uppercase` in `src/features`: only status badges remain;
- `border-radius: 0` in `src/index.css`: none;
- `Archivo`: none;
- `font-mono`: only on identifiers.

**Final checks:**
- Dark mode pass on every screen: look for white cards on dark backgrounds, unreadable muted text, and chart colours.
- `npx playwright test` green.
- Final screenshots into `scratch/restyle/after/`.

## Report back (at the end of every phase)
- Files changed.
- Commit hash.
- Screens skipped and why, e.g. dirty files owned by the other session.
- Before/after screenshot paths for each screen.
- Test, tsc and build results, with the exact pass counts.
- Grep gate counts.
- Anything that looked wrong and that you left alone, with the reason.

Do not claim a screen is done without its after-screenshots. Do not push.
