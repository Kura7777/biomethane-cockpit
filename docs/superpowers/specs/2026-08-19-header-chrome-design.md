# Persistent header bar — design spec

**Date:** 2026-08-19
**Status:** Approved, ready for implementation plan

## Problem

The app's only product identity (wordmark "Biomethane Desk Cockpit") and only
full-text nav labels live inside the left sidebar's hover-expand state
(`src/app/Layout.tsx`). Collapsed — the default, and the state the app is in
almost all the time — the chrome is a bare 68px icon rail with no visible
product name and no indication of which screen is active beyond an icon
highlight. There is also no page-level title anywhere; each screen's own
panel heading stands in for one, inconsistently. Reviewed against the actual
running app (screenshots of Sourcing, Trade Builder, Registries, Plants,
Map), this persistent-chrome gap reads as the biggest contributor to the
"looks basic" impression, since it's present on every screen a user sees
first.

## Decision

Add a slim persistent top header bar, mounted above the existing
sidebar+content row. Keep the sidebar exactly as it is today (icon rail,
hover-to-expand) — the header solves the identity/title problem without
touching sidebar behavior or screen content.

Two alternatives were considered and rejected:
- **Widen the sidebar permanently** — would show the wordmark/labels without
  hover, but costs horizontal width on a data-dense app and still gives no
  screen a consistent title slot.
- **Title + status + quick actions in the header** — adds command-palette
  and market-prices entry points to the header. Rejected for this pass to
  keep the change scoped; those already have other entry points (⌘K, nav).

## Content

Three zones, single row, no wrapping:

1. **Left — wordmark.** `BIOMETHANE DESK COCKPIT`, mono, uppercase, always
   visible (not hover-gated). Reuses the same treatment MASTER §2.1 already
   specifies for screen titles. Clicking it navigates home, matching the
   existing sidebar brand-icon behavior.
2. **Center-left — page title.** Derived from the same `SIDEBAR_ITEMS` array
   `Layout.tsx` already uses for the sidebar's `isActive` match, so the
   header title cannot drift out of sync with the nav. For a route that
   matches nothing in `SIDEBAR_ITEMS` (e.g. `/settings`, `/citations`), falls
   back to a capitalized first path segment rather than a second hardcoded
   label list; an empty/unrecognised path falls back to `Biomethane Desk`.
3. **Right — live clock.** `HH:MM:SS`, local time, ticking every second. No
   other "status" content: the app has no persistent live-data connection to
   honestly report on (Energinet data is fetched per-screen, not streamed),
   and MASTER.md's own provenance rules rule out decorative/fake status
   indicators. The clock is the one element that's true with zero backing
   state.

## Visual treatment

All values from existing `design-system/MASTER.md` tokens — no new tokens,
no raw hex:

- Height: `40px` (a new row above the existing `h-screen flex` sidebar+main
  row — total layout becomes a column: header row, then the current row).
- `bg-surface-raised` (stone-900), `border-b border-border-subtle` (matches
  the sidebar's existing `border-r border-stone-800`).
- `z-50` — the top of MASTER §8's existing z-index scale (`50` sticky
  header), so it sits above sticky sub-headers (`10`) and drawers (`40`) but
  below modals (`100`). No `sticky`/`top-0`: the outer shell is a
  fixed-height, non-scrolling `h-screen overflow-hidden` column (see Layout
  impact, below), so there's no scroll context for `sticky` to do anything
  in — it would be a no-op class, not a functional requirement.
- Wordmark and page title: `font-mono text-xs font-semibold tracking-[0.12em]
  uppercase text-content-primary` / `text-content-secondary` respectively —
  consistent with the sidebar's current wordmark styling.
- Clock: `font-num` (mono + tabular-nums per MASTER §2.1) so digits don't
  jitter as seconds tick.
- No shadow (hairline-only rule, MASTER §3.3).

## Sidebar fix (same file, same pass)

`Layout.tsx`'s sidebar footer currently reads `Hotkeys 1 · 2 · 3` — a
leftover from before the nav grew to 7 items. `SIDEBAR_ITEMS` already has 7
entries with `keyHint` 1–7. Fix the hint text to `Hotkeys 1–7` so it doesn't
tell the user something false, without trying to cram all 7 labels into the
same tight footer space.

## Layout impact

- `Layout.tsx`'s root goes from `h-screen flex` (sidebar | main) to a column
  (header, then `flex-1 min-h-0` row containing sidebar | main) so the
  header doesn't eat into the sidebar's own height.
- Every screen loses 40px of vertical space. Given MASTER.md's density
  rules (`h-6`–`h-7` table rows, `p-2`/`p-3` panel padding), this is a small
  cost relative to the identity/orientation gained. No screen content
  changes are in scope for this pass — if any screen turns out to clip at
  1024px after the header lands, that's a follow-up, not part of this spec.

## Out of scope

- Command palette / market-prices entry points in the header (considered,
  deferred — see Decision).
- Any change to sidebar width, collapse behavior, or item list.
- Any change to individual screen content, including the Map screen's
  sparseness or adding charts elsewhere — those were raised in the same
  conversation but are separate follow-ups the user did not select this
  round.
- Wiring a real data-freshness/connection indicator into the header. If the
  app later gains an actual persistent live-data connection worth reporting
  on, that's a new spec, not a retrofit of the clock slot.

## Testing

- `architecture.test.ts` already asserts route/nav consistency; extend or
  add a small test asserting the header's page-title lookup covers every
  route in `SIDEBAR_ITEMS` (no silent fallback for a real nav route).
- Manual verification at 1440px and 1024px per MASTER §10's pre-merge
  checklist.
- `aria-label` / landmark: a top-level `<header>` (not nested in
  `<article>`/`<section>`) already exposes the banner landmark implicitly,
  so no explicit `role="banner"` is needed. `<main id="main-content">`
  keeps its existing id, unaffected by the header's addition — note MASTER
  §5's mention of a skip link turned out to be aspirational: no
  `<a href="#main-content">` actually exists anywhere in `src/` today, so
  there's nothing to re-verify here; adding one would be separate,
  unrelated scope.
