# Conformance Audit — all screens vs. MASTER.md

**Status: closed 2026-08-17.** Every violation below has been remediated; the scoreboard
is kept as the before-picture and as the pattern list for re-measuring. Current state is
**0 across every check** — verify with the patterns in §5.

## Result

| Check | Before | After |
|---|--:|--:|
| Raw hex literals | 333 | **0** |
| Arbitrary font sizes | 279 | **0** |
| Text below 10px | 39 | **0** |
| Dead `py-0.2` padding | 15 | **0** |
| Banned neutral families | 81 | **0** |
| Banned accent families | 26 | **0** |
| `transition-all` | 38 | **0** |
| `stone-500` as body text | 48 | **0** |
| Dead `stone-850` hover | 5 | **0** |
| Panel radius / shadow | 65 / 41 | **0** |
| `aria-label` sites | 0 | 21 |
| Modals with dialog semantics | 0 | 2 |

993 transforms applied by codemod, plus hand fixes for glyph icons, dialog semantics,
country identity, and the fixed-element offset. `tsc` clean, 60/60 tests, build green,
and all four screens visually verified in a browser.

## Scoreboard (before)

Sorted by total violations. Comment lines excluded.

| File | LOC | raw hex | arb font px | <10px text | dead pad | banned neutral | banned accent | `transition-all` | stone-500 text | aria-label | focus-visible |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| `features/trade-builder/TradeBuilderScreen.tsx` | 1612 | **330** | 92 | 10 | 9 | 0 | 0 | 2 | 0 | 0 | 0 |
| `features/map/MapScreen.tsx` | 1361 | 3 | 39 | 11 | 1 | **42** | 5 | 12 | 3 | 0 | 0 |
| `features/opportunity-scanner/ScannerScreen.tsx` | 556 | 0 | 34 | 4 | 2 | 0 | 7 | 3 | 11 | 0 | 0 |
| `shared/components/FloatingAgentDrawer.tsx` | 463 | 0 | 11 | 5 | 1 | **39** | 0 | 4 | 0 | 0 | 0 |
| `features/arbitrage-agents/ArbitrageAgentsScreen.tsx` | 687 | 0 | 30 | 1 | 0 | 0 | 11 | 3 | 12 | 0 | 0 |
| `features/plants/PlantsScreen.tsx` | 464 | 0 | 34 | 3 | 0 | 0 | 3 | 4 | 8 | 0 | 0 |
| `features/logistics/LogisticsModal.tsx` | 451 | 0 | 19 | 0 | 0 | 0 | 0 | 8 | 5 | 0 | 0 |
| `features/marks/MarksScreen.tsx` | 352 | 0 | 9 | 5 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| `features/trade-library/LibraryScreen.tsx` | 234 | 0 | 5 | 0 | 0 | 0 | 0 | 2 | 6 | 0 | 0 |
| `shared/components/CitationBlock.tsx` | 55 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| ✅ `app/Layout.tsx` | 228 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 12 |
| ✅ `shared/components/CopyButton.tsx` | 142 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 12 |
| ✅ `shared/components/StaleIndicator.tsx` | 65 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| ✅ `shared/components/StatusChip.tsx` | 71 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **TOTAL** | | **333** | **279** | **39** | **15** | **81** | **26** | **38** | **48** | 11 | 24 |

✅ = brought to conformance in this pass.

---

## A1 — The parallel palette (root cause of "unpolished")

`TradeBuilderScreen.tsx` contains **330 raw hex literals across 21 distinct values**.
These are not a variation on the stone/teal system — they are a second, independent
palette running beside it:

| Hex | Uses | Nearest token it should be |
|---|--:|---|
| `#8B98A5` | 76 | `content-secondary` (stone-400) |
| `#E8EDF2` | 61 | `content-primary` (stone-100) |
| `#2DD4BF` | 59 | `accent-bright` (teal-400) |
| `#0B0E11` | 34 | `surface-base` (stone-950) |
| `#D99A2B` | 21 | `warning` (amber-500) |
| `#26313D` `#1E262F` `#182026` `#12171C` | 60 | `surface-raised` / `surface-overlay` |
| `#D64545` | 7 | `danger` (red-500) |
| `#182830` `#1E2830` `#1C0E10` `#2A1E14` `#1C2830` `#1C160C` `#18242A` `#151008` | 12 | one-off tints with no system meaning |
| `#0c1427` `#0b1329` `#0a1122` | 3 | strays from a third, bluer palette |

**Why this reads as amateur:** the hexes are cool-blue-grey (`#8B98A5`, `#26313D`)
while `stone` is warm-brown-grey. Put a Trade Builder panel beside a Marks panel and the
neutrals visibly disagree in temperature. Nobody identifies the cause — it just looks
*off*. This single issue accounts for most of the perceived quality gap.

**Fix:** mechanical find-and-replace to tokens. No layout risk. Highest value per effort
in the entire codebase.

## A2 — Two neutral ramps

`MapScreen.tsx` (42) and `FloatingAgentDrawer.tsx` (39) use `slate`; everything else uses
`stone`. The drawer floats **over** every screen, so its cool slate sits directly against
warm stone on all 8 screens simultaneously. Same disagreement as A1, different mechanism.

**Fix:** `slate-N` → `stone-N` throughout both files. Same numeric step maps cleanly.

## A3 — No type scale

**279 arbitrary pixel sizes** vs. 199 named. `text-[10px]` ×173, `text-[11px]` ×76,
`text-[9px]` ×41, plus 8/12/13/17/19px one-offs. There is no rhythm for the eye to lock
onto, which is the classic tell of an interface assembled screen-by-screen.

**39 instances are 8–9px** — below the readable floor and a genuine accessibility defect
on a screen full of numbers a trader acts on.

**Fix:** `text-[8px]`/`text-[9px]`/`text-[10px]` → `text-micro`; `text-[11px]` →
`text-meta`; `text-[12px]`/`[13px]` → `text-xs`; `[17px]`/`[19px]` → `text-lg`/`text-xl`.
Only the 8/9px cases change rendered size, so reflow risk is confined to 39 sites.

## A4 — Dead padding (functional bug, not just style)

`py-0.2` appears at **15 live call sites** and **emits no CSS whatsoever** — verified
absent from the compiled stylesheet while `h-13` from the same file is present. Tailwind
v4 silently drops it. Those chips render with **zero vertical padding** right now.

Remaining: TradeBuilder ×9, Scanner ×2, Map ×1, Marks ×1, FloatingAgentDrawer ×1.

**Fix:** `py-0.2` → `py-0.5`.

## A5 — Accessibility floor breached

Before this pass: **zero `aria-label` across ~100 buttons**, and `focus-visible` on only
a handful. For a terminal whose selling point is keyboard hotkeys 1–7, the nav had no
focus indicator at all.

Now handled globally: a `:focus-visible` outline in `index.css` guarantees every control
shows a ring even if the author forgets, plus a skip link and labelled nav.

Still outstanding per screen:
- Icon-only buttons relying on `title=` as their only label (39 uses of `title=`).
  `title` is invisible on touch and unreliable for screen readers.
- `LogisticsModal` needs `role="dialog"` + `aria-modal` + Escape-to-close + focus return
  (the pattern now implemented in `CopyButton`).
- Sortable tables need `aria-sort`.
- `stone-500` used as readable text at **48 sites** — measures **4.06:1** on stone-950
  and fails WCAG AA. `stone-400` is 7.84:1.

## A6 — Semantic colour collision

Four families currently signal "good" (teal 243, sky 67, emerald 46, green 6) and two
signal "caution" (amber 64, orange 2). **26 uses of outright banned families**
(`purple` ×14, `blue` ×4, `green` ×6, `orange` ×2) read as mistakes.

The important one: **teal means both "clickable" and "favourable."** A trader cannot
learn a colour with two meanings. MASTER §1.3 splits them — teal = interactive,
emerald = favourable outcome.

## A7 — Motion

**38 `transition-all`**, concentrated in MapScreen (12) and LogisticsModal (8).
`transition-all` animates layout properties and forces reflow — on a 1,361-line map
screen with hover states across many nodes, that is real jank.

`prefers-reduced-motion` was unhandled anywhere; now covered globally in `index.css`.

**Fix:** `transition-all` → `transition-colors` (or `-opacity`/`-transform`).

---

## Remediation order

Ranked by visual impact per unit of risk. Steps 1–4 are mechanical, carry no layout
risk, and together close ~85% of the perceived quality gap.

| # | Action | Sites | Risk | Impact |
|---|---|--:|---|---|
| 1 | Hex → tokens in TradeBuilderScreen (A1) | 330 | none | ★★★★★ |
| 2 | `slate` → `stone` in Map + Drawer (A2) | 81 | none | ★★★★☆ |
| 3 | `py-0.2` → `py-0.5` (A4) | 15 | none | ★★★☆☆ |
| 4 | Arbitrary sizes → scale tokens (A3) | 279 | low (39 resize) | ★★★★☆ |
| 5 | `transition-all` → `transition-colors` (A7) | 38 | none | ★★☆☆☆ |
| 6 | `stone-500` → `stone-400` on text (A5) | 48 | none | ★★★☆☆ |
| 7 | Banned accent families → semantic tokens (A6) | 26 | low | ★★★☆☆ |
| 8 | `aria-label` on icon-only controls (A5) | ~39 | none | ★★☆☆☆ |
| 9 | `LogisticsModal` dialog semantics (A5) | 1 | low | ★★☆☆☆ |

## Out of scope but worth flagging

- `MapScreen` ships an **894 kB** chunk (280 kB gzipped) and the entry bundle is
  **1.6 MB**. Both exceed Vite's warning threshold. Not a design-system issue, but it
  hurts perceived quality more than any colour choice — the app feels slow before it
  looks anything.
- `MapScreen.tsx` (1,361 lines) and `TradeBuilderScreen.tsx` (1,612 lines) are large
  enough that component extraction would make design-system conformance far easier to
  hold over time.

## 5. Regenerating this audit

The counter script used to produce the scoreboard lives outside the repo. To re-measure,
count per file against these patterns, excluding comment lines:

```
raw hex          \[#[0-9A-Fa-f]{3,8}\]
arb font px      text-\[[0-9.]+px\]
<10px text       text-\[[0-9]px\]
dead pad         \bp[xytblr]?-0\.[0-4]\b
banned neutral   \b(text|bg|border|ring|from|to|divide)-(slate|gray|zinc|neutral)-\d+
banned accent    \b(text|bg|border|ring|from|to)-(purple|blue|green|orange|rose|violet|indigo|cyan)-\d+
transition-all   \btransition-all\b
stone-500 text   \btext-stone-500\b
```
