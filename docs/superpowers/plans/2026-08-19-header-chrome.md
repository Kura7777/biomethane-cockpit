# Persistent Header Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a slim persistent top header (wordmark, route-derived page title, live clock) above the existing sidebar+content row in `src/app/Layout.tsx`, so the app's product identity is visible on every screen instead of only on sidebar hover.

**Architecture:** Extract the sidebar's route list into a small shared `src/app/navConfig.ts` module (data + a pure `getPageTitle` lookup), add a new `src/app/Header.tsx` component that consumes it plus a pure `formatClock` helper, then restructure `Layout.tsx`'s root from a single flex row into a column (header, then the existing sidebar+main row).

**Tech Stack:** React 18, react-router-dom v6 (`useLocation`/`useNavigate`), Tailwind v4 tokens from `design-system/MASTER.md` / `src/index.css`, Vitest for the two new pure-function test files (no React Testing Library in this repo — every existing test is plain function/data assertions or the text-pattern architecture guard in `src/domain/__tests__/architecture.test.ts`; this plan follows that convention rather than introducing component-render testing).

**Reference:** `docs/superpowers/specs/2026-08-19-header-chrome-design.md`

---

### Task 1: Extract nav items and page-title lookup into `navConfig.ts`

**Files:**
- Create: `src/app/navConfig.ts`
- Test: `src/app/__tests__/navConfig.test.ts`
- Modify (reference only, edited in Task 2): `src/app/Layout.tsx`

`Layout.tsx` currently defines `SIDEBAR_ITEMS` inline (lines 17–25) and uses it only for the sidebar. The header needs the same list to derive a page title without duplicating it, so it moves to its own module first.

- [ ] **Step 1: Write the failing test**

Create `src/app/__tests__/navConfig.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SIDEBAR_ITEMS, getPageTitle } from '../navConfig';

describe('getPageTitle', () => {
  it('resolves every SIDEBAR_ITEMS route to its own label — no silent fallback for a real nav route', () => {
    for (const item of SIDEBAR_ITEMS) {
      expect(getPageTitle(item.to)).toBe(item.label);
    }
  });

  it('treats the root path as the Origination workspace', () => {
    expect(getPageTitle('/')).toBe('Origination');
  });

  it('resolves a nested path under a nav route to that route\'s label', () => {
    expect(getPageTitle('/plants/friedland')).toBe('Plants (1,975)');
  });

  it('falls back to a capitalized route segment for a route outside SIDEBAR_ITEMS', () => {
    expect(getPageTitle('/settings')).toBe('Settings');
    expect(getPageTitle('/citations')).toBe('Citations');
  });

  it('falls back to a generic label for an empty or unrecognised path', () => {
    expect(getPageTitle('')).toBe('Biomethane Desk');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/__tests__/navConfig.test.ts`
Expected: FAIL — `Cannot find module '../navConfig'` (or similar resolution error), since the file doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/app/navConfig.ts`:

```ts
import type { ComponentType } from 'react';
import {
  Globe,
  Compass,
  FileSpreadsheet,
  Building2,
  Database,
  Zap,
  BookOpen,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  keyHint: string;
  icon: ComponentType<{ className?: string }>;
}

export const SIDEBAR_ITEMS: NavItem[] = [
  { to: '/sourcing', label: 'Origination', keyHint: '1', icon: Compass },
  { to: '/plants', label: 'Plants (1,975)', keyHint: '2', icon: Building2 },
  { to: '/map', label: 'Logistics Map', keyHint: '3', icon: Globe },
  { to: '/trade', label: 'Trade Builder', keyHint: '4', icon: Zap },
  { to: '/pricing', label: 'Pricing Desk', keyHint: '5', icon: FileSpreadsheet },
  { to: '/library', label: 'Dossier Library', keyHint: '6', icon: BookOpen },
  { to: '/data-sources', label: 'Data Sources', keyHint: '7', icon: Database },
];

/**
 * Header page title, derived from the same route list the sidebar uses for its
 * active-item highlight — so the two cannot drift apart. Routes outside
 * SIDEBAR_ITEMS (e.g. /settings, /citations) fall back to a capitalized first
 * path segment rather than a hardcoded second list.
 */
export function getPageTitle(pathname: string): string {
  if (pathname === '/') {
    return SIDEBAR_ITEMS.find(item => item.to === '/sourcing')!.label;
  }

  const match = SIDEBAR_ITEMS.find(item => pathname.startsWith(item.to));
  if (match) return match.label;

  const segment = pathname.split('/').filter(Boolean)[0];
  if (!segment) return 'Biomethane Desk';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}
```

Note: `FileText` is dropped from the icon imports here — it was imported in the current `Layout.tsx` but never used by any `SIDEBAR_ITEMS` entry. Task 2 removes the now-fully-unused icon import block from `Layout.tsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/__tests__/navConfig.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/navConfig.ts src/app/__tests__/navConfig.test.ts
git commit -m "feat(app): extract nav items and page-title lookup into navConfig"
```

---

### Task 2: Point `Layout.tsx` at `navConfig.ts` and fix the hotkey hint bug

**Files:**
- Modify: `src/app/Layout.tsx:1-25` (imports and local `SIDEBAR_ITEMS`), `src/app/Layout.tsx:118-120` (hotkey hint)

The sidebar's footer currently reads `Hotkeys 1 · 2 · 3` even though there are 7 shortcuts (`SIDEBAR_ITEMS` keyHints 1–7, wired in the `useEffect` at lines 34–57). This step removes the local `SIDEBAR_ITEMS` definition in favor of the import from Task 1, and fixes the stale hint text in the same pass.

- [ ] **Step 1: Replace the icon imports and local `SIDEBAR_ITEMS` with an import from `navConfig`**

In `src/app/Layout.tsx`, replace lines 1–25:

```tsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { CommandPalette } from '../shared/components/CommandPalette';
import { MarketPricesModal } from '../features/marks/MarketPricesModal';
import {
  Globe,
  Compass,
  FileSpreadsheet,
  Building2,
  Database,
  FileText,
  Zap,
  BookOpen
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { to: '/sourcing', label: 'Origination', keyHint: '1', icon: Compass },
  { to: '/plants', label: 'Plants (1,975)', keyHint: '2', icon: Building2 },
  { to: '/map', label: 'Logistics Map', keyHint: '3', icon: Globe },
  { to: '/trade', label: 'Trade Builder', keyHint: '4', icon: Zap },
  { to: '/pricing', label: 'Pricing Desk', keyHint: '5', icon: FileSpreadsheet },
  { to: '/library', label: 'Dossier Library', keyHint: '6', icon: BookOpen },
  { to: '/data-sources', label: 'Data Sources', keyHint: '7', icon: Database },
];
```

with:

```tsx
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { CommandPalette } from '../shared/components/CommandPalette';
import { MarketPricesModal } from '../features/marks/MarketPricesModal';
import { SIDEBAR_ITEMS } from './navConfig';
```

- [ ] **Step 2: Fix the hotkey hint text**

In `src/app/Layout.tsx`, replace (currently around line 118):

```tsx
        {/* Bottom Sidebar Note */}
        <div className="px-2 font-mono text-[10px] text-stone-500 text-center opacity-0 group-hover:opacity-100 transition-opacity">
          Hotkeys 1 · 2 · 3
        </div>
```

with:

```tsx
        {/* Bottom Sidebar Note */}
        <div className="px-2 font-mono text-micro text-content-secondary text-center opacity-0 group-hover:opacity-100 transition-opacity">
          Hotkeys 1–7
        </div>
```

(`text-[10px]` and `text-stone-500` are both banned by `design-system/MASTER.md` — `text-[10px]` has a named `text-micro` token at the same size, and `text-stone-500` fails the 4.5:1 contrast floor. Fixing the hint text is a good moment to fix these too, since the line is already being touched.)

- [ ] **Step 3: Verify the build and existing suite are unaffected**

Run: `npx tsc -b`
Expected: no errors (confirms the `navConfig` import resolves and no unused-import warnings remain).

Run: `npx vitest run`
Expected: all tests pass (the 299 pre-existing tests, plus the 5 from Task 1).

- [ ] **Step 4: Commit**

```bash
git add src/app/Layout.tsx
git commit -m "refactor(app): source sidebar nav items from navConfig, fix stale hotkey hint"
```

---

### Task 3: Build the `Header` component with a tested clock formatter

**Files:**
- Create: `src/app/Header.tsx`
- Test: `src/app/__tests__/Header.test.ts`

The clock is the header's only piece of derived state, so its formatting logic is written as a plain exported function (`formatClock`) and tested directly — the same "pull the logic out, test the function" approach as `navConfig.ts`, avoiding the need for component-render testing infrastructure this repo doesn't have.

- [ ] **Step 1: Write the failing test**

Create `src/app/__tests__/Header.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatClock } from '../Header';

describe('formatClock', () => {
  it('pads single-digit hours, minutes, and seconds with a leading zero', () => {
    expect(formatClock(new Date(2026, 7, 19, 3, 5, 9))).toBe('03:05:09');
  });

  it('formats midnight as 00:00:00', () => {
    expect(formatClock(new Date(2026, 7, 19, 0, 0, 0))).toBe('00:00:00');
  });

  it('formats the last second of the day as 23:59:59', () => {
    expect(formatClock(new Date(2026, 7, 19, 23, 59, 59))).toBe('23:59:59');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/__tests__/Header.test.ts`
Expected: FAIL — `Cannot find module '../Header'`.

- [ ] **Step 3: Write the implementation**

Create `src/app/Header.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPageTitle } from './navConfig';

/** HH:MM:SS in the viewer's local time. Exported so it can be unit tested without rendering. */
export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="h-10 flex-none flex items-center justify-between px-4 bg-surface-raised border-b border-border-subtle z-50">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/sourcing')}
          className="font-mono text-xs font-semibold tracking-[0.12em] uppercase text-content-primary hover:text-accent transition-colors cursor-pointer shrink-0"
        >
          Biomethane Desk Cockpit
        </button>
        <span className="text-content-secondary" aria-hidden="true">/</span>
        <span className="font-mono text-xs font-semibold tracking-[0.08em] uppercase text-content-secondary truncate">
          {pageTitle}
        </span>
      </div>
      <div className="font-num text-xs text-content-secondary shrink-0" aria-label={`Local time ${formatClock(now)}`}>
        {formatClock(now)}
      </div>
    </header>
  );
}
```

Notes on choices already resolved (no need to re-derive during implementation):
- No `aria-label` on the wordmark button: it has visible text as its accessible name already, so adding a differently-worded `aria-label` would fail WCAG 2.5.3 (Label in Name). This differs from the sidebar's brand button, which needs `aria-label` because its text is visually hidden until hover.
- No explicit `role="banner"`: a top-level `<header>` (not nested in `<article>`/`<section>`) already exposes the banner landmark implicitly.
- No `sticky`/`top-0`: the outer app shell is a fixed-height, non-scrolling `h-screen overflow-hidden` column (see Task 4), so there is no scroll context for `sticky` to do anything in. `z-50` is kept regardless, matching `design-system/MASTER.md` §8's z-index scale for the header layer.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/__tests__/Header.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/Header.tsx src/app/__tests__/Header.test.ts
git commit -m "feat(app): add Header component with route-derived title and live clock"
```

---

### Task 4: Mount `Header` in `Layout.tsx` and verify visually

**Files:**
- Modify: `src/app/Layout.tsx:59-65` (root container), `src/app/Layout.tsx:123-129` (main content wrapper close)

`Header` is not yet rendered anywhere. This step restructures the root of `Layout.tsx` from a single flex row (`aside` | `main`) into a column (`Header`, then a row containing `aside` | `main`), and confirms the result visually since there is no component-render test harness in this repo to assert layout composition automatically (per the plan's Tech Stack note).

- [ ] **Step 1: Restructure the root container**

In `src/app/Layout.tsx`, add the import (alongside the other local imports from Task 2):

```tsx
import { Header } from './Header';
```

Replace the opening of the return statement (currently lines 59–65):

```tsx
  return (
    <div className="h-screen flex overflow-hidden min-w-[1200px] bg-stone-950 text-stone-100 font-sans selection:bg-teal-500 selection:text-stone-950">
      
      {/* Left-Docked Minimal Sidebar — 68px (expands to 220px on hover) */}
      <aside className="w-[68px] hover:w-56 transition-all duration-200 ease-in-out flex-none bg-stone-900 border-r border-stone-800 flex flex-col justify-between py-3 z-40 group shadow-xl">
```

with:

```tsx
  return (
    <div className="h-screen flex flex-col overflow-hidden min-w-[1200px] bg-stone-950 text-stone-100 font-sans selection:bg-teal-500 selection:text-stone-950">
      <Header />

      <div className="flex-1 min-h-0 flex overflow-hidden">

      {/* Left-Docked Minimal Sidebar — 68px (expands to 220px on hover) */}
      <aside className="w-[68px] hover:w-56 transition-all duration-200 ease-in-out flex-none bg-stone-900 border-r border-stone-800 flex flex-col justify-between py-3 z-40 group shadow-xl">
```

And close the new wrapping row `<div>` right after `</main>` and before the modals (currently lines 123–130):

```tsx
      {/* Main Viewport Content Area */}
      <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col bg-stone-950">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Global Command Palette Modal */}
```

becomes:

```tsx
      {/* Main Viewport Content Area */}
      <main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col bg-stone-950">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      </div>

      {/* Global Command Palette Modal */}
```

The two modals (`CommandPalette`, `MarketPricesModal`) and the closing root `</div>` at the end of the file stay exactly where they are — they're siblings of the new row `<div>`, not inside it, which is correct since they're full-viewport overlays (`z-100` per MASTER §8) and shouldn't be clipped by the row's `overflow-hidden`.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (299 pre-existing + 8 new from Tasks 1 and 3).

- [ ] **Step 3: Run the production build**

Run: `npx tsc -b && npx vite build`
Expected: exits 0, no type errors, no new bundle-size warnings beyond the pre-existing `MapScreen` chunk warning (unrelated to this change).

- [ ] **Step 4: Visually verify at 1440px and 1024px**

Start the dev server and confirm the header renders correctly, doesn't overlap the sidebar or main content, and the clock ticks:

```bash
npm run dev
```

With the dev server running at `http://localhost:4200`, use Playwright (already a devDependency) to screenshot two routes at both widths:

```bash
node -e "
import('playwright-core').then(async ({chromium}) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://localhost:4200/#/sourcing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: \`header-sourcing-\${width}.png\` });
    await page.goto('http://localhost:4200/#/map', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: \`header-map-\${width}.png\` });
  }
  await browser.close();
});
"
```

Look at all four screenshots and confirm:
- The header shows `BIOMETHANE DESK COCKPIT / ORIGINATION` (or `/ LOGISTICS MAP`) on the left and a ticking `HH:MM:SS` clock on the right, with no overlap or clipping at either width.
- The sidebar below the header still collapses/expands on hover exactly as before.
- No horizontal scrollbar appears at 1024px (`min-w-[1200px]` on the root is unchanged, so this is a scroll-inside-viewport check, not a redesign check).

Stop the dev server afterward:

```bash
lsof -ti:4200 -sTCP:LISTEN | xargs -r kill
```

Delete the four screenshot files once reviewed — they're a manual verification aid, not artifacts to commit.

- [ ] **Step 5: Commit**

```bash
git add src/app/Layout.tsx
git commit -m "feat(app): mount the persistent header above the sidebar and content row"
```

---

### Task 5: Final conformance pass

**Files:** none new — re-checks the three files this plan touched or added: `src/app/Layout.tsx`, `src/app/Header.tsx`, `src/app/navConfig.ts`.

`design-system/MASTER.md` §10's pre-merge checklist applies to any new code in this codebase. This task runs it against just the files this plan changed, since the rest of the app was already swept (`design-system/AUDIT.md`, closed 2026-08-17).

- [ ] **Step 1: Check for banned patterns in the three touched/created files**

Run each pattern from `design-system/AUDIT.md` §5 against the three files:

```bash
grep -nE '\[#[0-9A-Fa-f]{3,8}\]' src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
grep -nE 'text-\[[0-9.]+px\]' src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
grep -nE '\b(text|bg|border|ring|from|to|divide)-(slate|gray|zinc|neutral)-[0-9]+' src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
grep -nE '\b(text|bg|border|ring|from|to)-(purple|blue|green|orange|rose|violet|indigo|cyan)-[0-9]+' src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
grep -nE '\btransition-all\b' src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
grep -nE '\btext-stone-500\b' src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
```

Expected: no output from any of the six commands. (`transition-all` is expected to still appear once, on the pre-existing sidebar `<aside>` width-collapse animation at line ~63 — that line animates `width`, which is a layout property but was already flagged out-of-scope for this change in the design spec; leave it as-is rather than editing code this plan didn't otherwise touch.)

If the `transition-all` grep returns exactly the pre-existing sidebar line and nothing else, that's a pass for this task — don't "fix" it, since it's outside this plan's scope per the spec's Out of Scope section.

- [ ] **Step 2: Run the full suite one more time**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 3: Commit if Step 1 required any fix**

Only if Step 1 found a real violation in the new/changed lines (not the pre-existing sidebar `transition-all`) and you fixed it:

```bash
git add src/app/Layout.tsx src/app/Header.tsx src/app/navConfig.ts
git commit -m "fix(app): bring header chrome to design-system conformance"
```

If Step 1 found nothing to fix, skip this commit — there's nothing to record.

---

## Spec coverage check

- Wordmark always visible, page title, live clock → Task 3–4.
- Sidebar unchanged, hover-expand behavior preserved → Task 4 Step 4 visual check.
- Tokens only, no new colors, hairline border, no shadow → Task 3 implementation.
- Sidebar hotkey-hint bugfix in the same pass → Task 2.
- Page-title lookup covers every `SIDEBAR_ITEMS` route with no silent fallback → Task 1 test.
- 1440px / 1024px verification → Task 4 Step 4.
- Header lands past `#main-content`, doesn't swallow it → Task 4 Step 1 (main keeps its existing `id="main-content"`; note the design spec's mention of a "skip link" turned out to be aspirational — `AUDIT.md` claims one exists but no `<a href="#main-content">` is actually present anywhere in `src/`. Not introducing one is consistent with this plan's scope — it wasn't part of the approved design, and adding it here would be scope creep from unrelated pre-existing debt).
- Out of scope items (command palette in header, sidebar width, screen content, fake connection status) → deliberately not touched by any task above.
