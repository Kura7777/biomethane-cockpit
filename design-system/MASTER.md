# Biomethane Desk Cockpit — Design System (MASTER)

> **Source of truth.** Every screen inherits these rules. A page may only deviate if
> `design-system/pages/<page-name>.md` exists and explicitly overrides a rule below.
>
> Pattern: **Real-Time / Operations** · Style: **Data-Dense Dashboard** (dark-first)
> Stack: React 18 + Vite + Tailwind v4 · Tokens live in `src/index.css` under `@theme`.

---

## 0. Product identity

This is a **commodity trading terminal**, not a marketing dashboard. It is read by a
trader scanning for a number under time pressure. That dictates every rule here:

- **Density is a feature.** Tight padding and small type are correct. Sprawl is not.
- **The number is the hero.** Chrome recedes; figures dominate.
- **Dark-first.** There is no light mode and none is planned. Do not add one
  speculatively — it doubles the token surface for zero desk value.
- **Monospace for anything numeric.** Prices, volumes, GHG figures, dates, IDs.

---

## 1. Color

### 1.1 The rule that matters most

**Never write a raw hex value in a component.** Use a token. Raw hex is how this
codebase ended up with two parallel palettes (see Audit §A1).

```
❌ className="bg-[#182026] text-[#8B98A5]"
✅ className="bg-surface-overlay text-content-secondary"
```

### 1.2 Neutral ramp — `stone` only

`stone` is the only neutral family. `slate`, `gray`, `zinc`, and `neutral` are banned —
they are perceptibly cooler and reading two neutral ramps side by side is what makes an
interface look accidental rather than designed.

| Token | Tailwind | Use for |
|---|---|---|
| `surface-base` | `stone-950` | Page background, deepest wells, input fields |
| `surface-raised` | `stone-900` | Panels, cards, header, footer |
| `surface-overlay` | `stone-800` | Chips, inert badges, hover fills, modal bodies |
| `border-subtle` | `stone-800` | Dividers, panel edges, table rules |
| `border-default` | `stone-700` | Control outlines, input borders, emphasis edges |
| `content-primary` | `stone-100` | Body text, figures, headings |
| `content-secondary` | `stone-400` | Labels, metadata, captions |
| `content-muted` | `stone-500` | **Decorative and disabled only — never readable text** |

> **Contrast floor.** `stone-500` on `stone-950` measures **4.06:1** — it fails WCAG AA
> (4.5:1) for normal text. `stone-400` measures **7.84:1** and passes. Any text a trader
> must actually read is `stone-400` or lighter. `stone-500` is for separators, disabled
> states, and glyphs that carry no meaning.

### 1.3 Semantic accents — one family per meaning

The current codebase spends **four** families on "good" (teal, emerald, sky, green) and
**two** on "warning" (amber, orange). Collapse to one each. A color must mean exactly
one thing across all 8 screens or it means nothing.

| Token | Family | Means | Never use for |
|---|---|---|---|
| `accent` | `teal` | **Brand + interactive.** Active nav, focus ring, primary CTA, selected state, links | A pass/fail outcome |
| `positive` | `emerald` | **Favourable outcome.** PASS, ELIGIBLE, fresh mark, profit, in-the-money | Anything clickable |
| `warning` | `amber` | **Conditional / degrading.** CONDITIONAL, stale >7d, caveats, PRA licence | Errors |
| `danger` | `red` | **Blocking / loss.** HARD_BLOCK, stale >30d, negative margin, destructive actions | Warnings |
| `info` | `sky` | **Unresolved / neutral fact.** UNRESOLVED, informational annotations | Success |

**Banned outright:** `purple`, `blue`, `green`, `orange`, `rose`, `violet`, `indigo`,
`cyan`. Each is currently a one-off that reads as a mistake.

> **Teal vs emerald is the subtle one.** Today teal signals both "this is clickable" and
> "this is good." A trader cannot learn a color that means two things. Teal = *you can
> touch it*. Emerald = *the answer is favourable*.

### 1.4 Color is never the only signal

Margin sign, eligibility, and staleness must each carry an icon or a text label in
addition to color. ~8% of male traders are red/green colorblind, and this app puts
red and green figures in the same column.

---

## 2. Typography

### 2.1 Families

| Role | Family | Rule |
|---|---|---|
| UI / prose | `Inter` (`font-sans`) | Headings, labels, sentences, help text |
| Numeric / terminal | `JetBrains Mono` (`font-mono`) | **All figures**, tickers, codes, dates, chips |

Any column of numbers uses `.font-num` (mono + `tabular-nums` + tightened tracking) so
digits align vertically and values don't jitter as they update.

### 2.2 Scale — no arbitrary pixel sizes

The codebase currently holds **295 arbitrary sizes** (`text-[10px]` ×173,
`text-[11px]` ×76, `text-[9px]` ×41, plus 8/12/13/17/19px one-offs) beside 199 named
ones. There is effectively no scale. Use only these eight steps:

| Token | Size | Use for |
|---|---|---|
| `text-micro` | 10px | Chips, badges, key hints, table micro-labels — **hard floor** |
| `text-meta` | 11px | Metadata, footnotes, provenance, timestamps |
| `text-xs` | 12px | Dense table cells, secondary body |
| `text-sm` | 14px | Default body, form inputs |
| `text-base` | 16px | Emphasised body, panel intros |
| `text-lg` | 18px | Card titles, section headers |
| `text-xl` | 20px | Screen titles |
| `text-2xl` | 24px | Hero figures, headline margins |

**8px and 9px text is banned.** It is not "dense," it is unreadable, and it is the
clearest tell of an unpolished interface. 10px is the floor and only for mono chips.

### 2.3 Weight and hierarchy

Establish hierarchy with **size, weight, and spacing** — not color. Reserve color for
meaning (§1.3).

| Weight | Use |
|---|---|
| `font-bold` (700) | Headings, hero figures, chip labels |
| `font-semibold` (600) | Active nav, table headers, emphasis |
| `font-medium` (500) | Buttons, labels |
| `font-normal` (400) | Body, table cells |

Line height: `leading-relaxed` (1.625) for prose, `leading-tight` for figures and chips.

### 2.4 Headings

Current usage is `h1`×7, `h2`×4, `h3`×7, `h4`×1 — levels are skipped. Each screen has
exactly one `h1` (the screen title); sections descend `h2` → `h3` without skipping.
Visual size comes from the scale above, never from picking a different tag.

---

## 3. Spacing & radius

### 3.1 Spacing rhythm — 4px base

Use `0.5 1 1.5 2 3 4 6 8 12` (2/4/6/8/12/16/24/32/48px). Nothing else.

| Tier | Value | Use |
|---|---|---|
| Inline | `gap-1` / `gap-1.5` | Icon-to-label, chip internals |
| Control | `px-2 py-1` → `px-3 py-1.5` | Buttons, inputs, chips |
| Card | `p-3` (dense) / `p-4` (standard) | Panel interiors |
| Section | `space-y-4` / `space-y-6` | Between panels |
| Screen | `py-4` | Page gutter |

> **Never use fractional spacing below `0.5`.** `py-0.2` appears at **17 call sites**
> and **compiles to nothing** — it is absent from the built stylesheet. Those chips have
> zero vertical padding right now. Use `py-0.5`.

### 3.2 Radius — panels are square

This is the rule that separates a terminal from a SaaS dashboard. A 12px radius with a
drop shadow on a data panel is the loudest "this is a web app" signal there is.

| Surface | Radius |
|---|---|
| **Panels, cards, wells, modals** | **none — square** |
| Chips, buttons, inputs, table cells | `rounded` (4px) |
| Status dots, pills | `rounded-full` |

`rounded-md`, `rounded-lg`, `rounded-xl`, and `rounded-2xl` are all banned. There are
exactly two radii in this product: 4px and none (plus `full` for dots).

### 3.3 Elevation — hairlines, not shadows

Structure comes from **1px rules and surface lightness**. Panels tile against each other
and are separated by borders, not by gutters and drop shadows.

| Layer | Treatment |
|---|---|
| Flush | `bg-surface-base` |
| Panel | `bg-surface-raised border border-border-subtle` |
| Modal | `shadow-2xl` over `bg-black/75 backdrop-blur-xs` |

`shadow-xs`/`sm`/`md`/`lg` are banned on panels — only a modal, which genuinely floats
over a scrim, may cast one. Modal scrim stays at 60–80% black.

### 3.4 Density

Terminal authority comes from fitting more on screen while staying aligned — never from
shrinking type below the 10px floor.

| Element | Value |
|---|---|
| Panel padding | `p-2` (dense) / `p-3` (standard) |
| Table row height | `h-6` – `h-7` |
| Section rhythm | `space-y-2` / `space-y-3` |
| Grid gutters | `gap-2` / `gap-3` |

---

## 4. Icons

- **Lucide only** (`lucide-react`, already a dependency). One family, one stroke weight.
- **No emoji, no unicode glyphs as icons.** `📋` `⚠️` `✓` `⚠` `✕` `◈` currently appear
  as structural icons. They render differently on every platform, ignore `currentColor`
  inconsistently, and cannot be sized or aligned reliably.
- **Sizes:** `w-3.5 h-3.5` (inline/chip) · `w-4 h-4` (control) · `w-5 h-5` (header/empty state).
- Icons that convey meaning need a text label or `aria-label`. Icons beside a visible
  label are decorative: mark them `aria-hidden="true"`.

---

## 5. Interaction & state

### 5.1 Every interactive element needs four states

| State | Treatment |
|---|---|
| Rest | Token surface + border |
| Hover | Lighter surface (`stone-800` → `stone-700`) — `cursor-pointer` required |
| Focus | `focus-visible:ring-2 ring-teal-500 ring-offset-2 ring-offset-stone-950` |
| Disabled | `opacity-40 cursor-not-allowed` + real `disabled` attribute |

> **Focus is the biggest gap.** This is a keyboard-driven terminal with 1–7 hotkeys, yet
> the nav has no focus styling at all. Never remove a focus ring without replacing it.

### 5.2 Motion

- Micro-interactions **150ms**; transitions **200ms**; nothing over **300ms**.
- **`transition-colors` — not `transition-all`.** `transition-all` appears **43 times**;
  it animates layout properties, causes reflow, and can visibly lag on dense tables.
  Use `transition-colors`, `transition-opacity`, or `transition-transform`.
- Animate `transform` and `opacity` only. Never `width`, `height`, `top`, `left`.
- `animate-pulse` is reserved for **live/critical status** (stale-critical dot). It is
  not decoration — a pulsing element on a trading screen means "look at me now."
- **Respect `prefers-reduced-motion`.** Handled globally in `src/index.css`.

### 5.3 Tooltips are not labels

`title=` appears 39 times, often as the only label on an icon-only control. `title` is
invisible to touch, unreliable for screen readers, and slow to appear. Every icon-only
control gets a real `aria-label`; `title` may supplement it, never replace it.

---

## 6. Accessibility floor

Non-negotiable. Current state: **zero `aria-label` attributes across ~100 buttons.**

- [ ] Readable text ≥ **4.5:1**; large text and UI glyphs ≥ **3:1** (see §1.2)
- [ ] Every icon-only control has `aria-label`
- [ ] Visible `focus-visible` ring on every interactive element
- [ ] Meaning never carried by color alone (§1.4)
- [ ] Modals: `role="dialog"` + `aria-modal="true"` + **Escape closes** + focus trapped
      and restored on close
- [ ] Headings sequential, one `h1` per screen
- [ ] Inputs have real `<label>` elements, not placeholder-only
- [ ] `prefers-reduced-motion` respected

---

## 6b. Country identity

Show countries as **mono ISO-3166 alpha-2 codes in a fixed-width gutter**, never flag
emoji. Two reasons, both decisive:

1. Windows ships no flag glyphs, so a regional-indicator pair renders as its two letters
   anyway — which produced `AT AT AT EGG` where a flag, a code, and a code-prefixed name
   stacked up.
2. A fixed-width code column is scannable straight down. That is the entire point of the
   prefix, and it only works if the name beside it does not repeat the code.

## 7. Data display

- Numeric columns: `.font-num` + right-aligned. Tabular figures prevent column jitter.
- Signed values (margin, spread) carry **sign + color + icon** — never color alone.
- Units are always adjacent and in `content-secondary` (`€/MWh`, `gCO₂e/MJ`, `t`).
- Locale-aware formatting via `Intl.NumberFormat`. No hand-rolled `toFixed` chains.
- Tables: sticky headers, `hover:bg-stone-800/50` row highlight, `aria-sort` on sortable
  columns.
- Every data surface needs **three** states beyond the happy path: loading (skeleton,
  not a bare spinner), empty (explain what would populate it), and error (with retry).
- Stale data is always visibly marked — a trading figure with unknown age is a hazard.

---

## 8. Layout

- Full-bleed, no centered max-width container — screen real estate is the point.
- Gutter `px-4`, scaling to `sm:px-6`.
- Sticky header (`z-50`) and floating drawer must reserve content offset so nothing hides.
- Z-index scale: `0` base · `10` sticky sub-headers · `40` drawers · `50` header ·
  `100` modals. No ad-hoc values.
- Breakpoints `768 / 1024 / 1440 / 1920`. This is a desk tool — optimise 1440+ and keep
  1024 usable. Phone support is not a goal.

---

## 9. Anti-patterns (from the generator + this codebase)

| Anti-pattern | Why it hurts here |
|---|---|
| Ornate decoration | Trading terminals earn trust through restraint |
| No filtering on data views | 1,975 plants without filters is unusable |
| Raw hex in components | Produces the parallel-palette drift in Audit §A1 |
| Two neutral ramps | `stone` + `slate` reads as muddy and accidental |
| Arbitrary font sizes | The single strongest "amateur" tell |
| Emoji as icons | Platform-inconsistent, unstyleable |
| `transition-all` | Reflow and jank on dense tables |
| Tooltip-as-label | Invisible to assistive tech and touch |

---

## 10. Pre-merge checklist

- [ ] No raw hex, no `slate`/`gray`/`zinc`, no banned accent families
- [ ] No `text-[Npx]` — scale tokens only, nothing below 10px
- [ ] Radius from the four-step scale
- [ ] No `py-0.2`-style dead spacing
- [ ] Lucide icons only, consistent sizing
- [ ] `focus-visible` ring present; `aria-label` on icon-only controls
- [ ] `transition-colors` not `transition-all`, ≤300ms
- [ ] Numbers use `.font-num`
- [ ] Loading / empty / error states exist
- [ ] Verified at 1440px and 1024px
