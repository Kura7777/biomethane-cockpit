# UI Architecture & Build Survey Report

## Executive Summary
This survey provides a comprehensive architectural and build audit of the European Biomethane Arbitrage & Desk Cockpit frontend. The codebase demonstrates high engineering discipline:
- **Build & Types**: `tsc -b && vite build` and `tsc --noEmit` build cleanly with **0 TypeScript errors**.
- **Unit & Domain Tests**: Vitest test suite passes with **60/60 passing tests** (100% pass rate).
- **Design System**: Strict adherence to the `stone` neutral palette (`stone-950` to `stone-100`) and semantic accents (`teal`, `emerald`, `amber`, `red`, `sky`). Zero instances of banned neutral families (`slate`, `zinc`, `gray`, `neutral`) or banned accent families (`purple`, `blue`, `orange`, `rose`, etc.).
- **Screens**: All 9 screens (Ladder, Map, Trade Builder, Copilot, Plants, Marks, Dossiers, Citations, Settings) are fully implemented with lazy-loaded code-splitting, URL-parameter synchronization, resilient fallbacks, and keyboard navigation.

---

## 1. Observation

### 1.1 Project Structure & Component Hierarchy
```
src/
├── main.tsx                         # StrictMode entry point mounting <App />
├── index.css                        # Tailwind v4 @theme tokens, font-num, focus rings, base styles
├── app/
│   ├── App.tsx                      # HashRouter, Suspense fallback, 9 lazy-loaded routes wrapped in AppProvider
│   └── Layout.tsx                   # Fixed terminal shell: Top header (52px), Ticker (28px), Main <Outlet>, Footer (26px)
├── store/
│   └── context.tsx                  # AppContext, useReducer, localStorage v7 schema, multi-version migration & quarantine
├── features/
│   ├── opportunity-scanner/
│   │   └── ScannerScreen.tsx        # Screen 1: Ladder / Opportunity Scanner (1079 LOC)
│   ├── map/
│   │   └── MapScreen.tsx            # Screen 2: Pan-European Compliance Map (774 LOC)
│   ├── trade-builder/
│   │   └── TradeBuilderScreen.tsx   # Screen 3: Trade Builder & Term Sheet (1054 LOC)
│   ├── arbitrage-agents/
│   │   └── ArbitrageAgentsScreen.tsx# Screen 4: Desk Copilot / AI Multi-Agent Desk (531 LOC)
│   ├── plants/
│   │   └── PlantsScreen.tsx         # Screen 5: 1,975 Verified Plants Registry (511 LOC)
│   ├── marks/
│   │   └── MarksScreen.tsx          # Screen 6: Forward Marks & Curve Matrix (308 LOC)
│   ├── trade-library/
│   │   └── LibraryScreen.tsx        # Screen 7: Trade Dossiers & Audit Packs (258 LOC)
│   ├── citations/
│   │   └── CitationsScreen.tsx      # Screen 8: Statutory Legal Citations Library (455 LOC)
│   ├── settings/
│   │   └── SettingsScreen.tsx       # Screen 9: Desk Settings & Gemini API Configuration (350 LOC)
│   └── logistics/
│       └── LogisticsModal.tsx       # Cross-border Corridor & Delivery Playbook Modal (319 LOC)
├── shared/
│   └── components/
│       ├── ErrorBoundary.tsx        # React class error boundary wrapping <Outlet />
│       ├── CitationBlock.tsx        # Legal citation card with EUR-Lex external link
│       ├── CopyButton.tsx           # Copy button with PRA Licence Guard modal
│       ├── FloatingAgentDrawer.tsx  # Quick-access assistant drawer (Ctrl+K shortcut)
│       ├── StaleIndicator.tsx       # Timestamp & staleness badge (>7d warning, >30d critical)
│       └── StatusChip.tsx           # Semantic status chip (PASS, ELIGIBLE, CONDITIONAL, HARD_BLOCK)
└── domain/                          # Pure functional math, logistics, and regulatory gate engines
```

### 1.2 Build & Test Verification
1. **TypeScript Compilation & Production Build**:
   - Command: `npm run build` (`tsc -b && vite build`)
   - Exit Code: `0`
   - Modules Transformed: `1941`
   - Build Duration: `6.87s`
   - Generated Chunks:
     - `dist/index.html`: `1.27 kB`
     - `dist/assets/index-xFdOAeYA.css`: `51.69 kB` (gzip: `9.93 kB`)
     - `dist/assets/ScannerScreen-BNyaAVgm.js`: `31.11 kB`
     - `dist/assets/TradeBuilderScreen-DMsXnpad.js`: `29.74 kB`
     - `dist/assets/ArbitrageAgentsScreen-D6LAC4Zu.js`: `25.10 kB`
     - `dist/assets/PlantsScreen-BFbMFj7i.js`: `16.31 kB`
     - `dist/assets/MarksScreen-C44ZFzuJ.js`: `7.57 kB`
     - `dist/assets/LibraryScreen-D-3sNupX.js`: `6.68 kB`
     - `dist/assets/CitationsScreen-BktMklKl.js`: `82.20 kB`
     - `dist/assets/SettingsScreen-C72YicIU.js`: `11.47 kB`
     - `dist/assets/MapScreen-zvRqOgjN.js`: `881.43 kB` (includes `countries-50m.json`)
     - `dist/assets/registry-CfBkfTyq.js`: `1,368.30 kB` (includes 1,975 plant records)

2. **Automated Unit Test Suite**:
   - Command: `npm test` (`vitest run`)
   - Exit Code: `0`
   - Files: `2 passed (2)` (`logistics.test.ts`, `engine.test.ts`)
   - Tests: `60 passed (60)`
   - Duration: `2.56s`

### 1.3 Design System Token Compliance Audit
Grep queries executed across `src/`:
- **Banned Neutrals** (`slate-`, `zinc-`, `gray-`, `neutral-`): **0 matches** found.
- **Banned Accents** (`purple-`, `blue-`, `orange-`, `rose-`, `violet-`, `indigo-`, `cyan-`): **0 matches** found.
- **Raw Hex in CSS Classes**: **0 matches** found.
- **Raw Hex in JS / Inline Styling**:
  - `src/features/map/MapScreen.tsx:34-38`: `FILL_COLORS` object (`ACTIVE: '#065f46'`, `EMERGING: '#78350f'`, `FUTURE_2028: '#0c4a6e'`, `RESTRICTED: '#7f1d1d'`, `NONE: '#1c1917'`) for SVG `<Geography>` fill rendering.
  - `src/features/map/MapScreen.tsx:249-259`: SVG stroke colors (`#0c0a09`, `#38bdf8`, `#2dd4bf`, `#14b8a6`).
  - `src/features/map/MapScreen.tsx:314, 328, 347, 356`: SVG stroke attributes (`#0c0a09`, `#5eead4`).
  - `src/features/opportunity-scanner/ScannerScreen.tsx:741`: `style={isSelected ? { boxShadow: 'inset 3px 0 0 #14b8a6' } : undefined}` inline box-shadow.
- **Arbitrary Font Pixel Sizes (`text-[Npx]`)**:
  - `src/features/logistics/LogisticsModal.tsx:157, 161, 177, 188, 249, 255, 296, 308`: `text-[11px]` (can use `text-meta`).
  - `src/features/opportunity-scanner/ScannerScreen.tsx:429`: `text-[28px]`, lines 929, 944, 950: `text-[11px]`.
  - `src/features/trade-builder/TradeBuilderScreen.tsx:750`: `text-[40px]`.

### 1.4 Type Safety & `any` Casts Audit
Exact lines containing `any` in `src/`:
1. `src/domain/arbitrage/types.ts:80`: `payload: any;` in `CopilotResponse` interface.
2. `src/features/arbitrage-agents/ArbitrageAgentsScreen.tsx:252`: `const passedPrompt = (location.state as any)?.prompt;`
3. `src/features/map/MapScreen.tsx:16`: `const geoUrl = countriesTopojson as any;`
4. `src/features/settings/SettingsScreen.tsx:88`: `} catch (e: any) {`
5. `src/features/trade-library/LibraryScreen.tsx:138`: `const handleRecalculate = (dossier: any) => {`
6. `src/shared/components/FloatingAgentDrawer.tsx:34`: `Record<string, { title: string; icon: any; suggestions: string[] }>`
7. `src/shared/components/FloatingAgentDrawer.tsx:199`: `} catch (err: any) {`
8. `src/store/context.tsx:60, 205, 218`: `migrateState(raw: any)` and `map((c: any) => ...)`

### 1.5 Runtime Stability & Integration Audit
- **Null Safety**: All calculation inputs feature defensive coalescing (`?? 0`, `?? -Infinity`, safe market lookups).
- **Error Boundaries**: `ErrorBoundary` safely traps render exceptions in `<Outlet />` and displays a formatted recovery card.
- **Unmounted Component**: `src/shared/components/FloatingAgentDrawer.tsx` is fully implemented (with Ctrl+K shortcut and page context integration), but is not mounted in `src/app/Layout.tsx`.
- **Text Inconsistencies**:
  - `src/app/Layout.tsx:243`: Footer copy states `Keys 1–7 screens` instead of `Keys 1–9 screens`.
  - `src/app/Layout.tsx:240`: Footer copy states `1,986 plants indexed` whereas `PlantsScreen.tsx` states `1,975 verified biomethane operational facilities`.

---

## 2. Logic Chain

1. **Build & Bundle Quality**:
   - The Vite configuration uses standard ES2020 target and bundler module resolution with `isolatedModules`.
   - Dynamic `React.lazy()` imports in `App.tsx` prevent the heavy 1.37 MB plant database and 881 kB TopoJSON geometry from blocking initial application startup on the Ladder (`/scanner`) or Trade Builder (`/trade`) views.

2. **Design Token Integrity**:
   - The `@theme` definition in `src/index.css` establishes the single source of truth for surfaces (`--color-surface-base: var(--color-stone-950)`), borders (`stone-800`), content (`stone-100`, `stone-400`), and semantic indicators (`teal`, `emerald`, `amber`, `red`, `sky`).
   - The absence of banned neutral palettes (`slate`, `zinc`, `gray`) ensures visual temperature consistency across all 9 screens.
   - SVG map rendering in `react-simple-maps` relies on SVG attribute values; mapping them directly to the `stone` / `emerald` / `amber` / `sky` / `red` color spectrum maintains palette harmony even within the vector canvas.

3. **State Management & Persistence**:
   - `src/store/context.tsx` manages desk marks, consignments, cost inputs, and saved assessments via `useReducer`.
   - The schema versioning pattern (v1 through v7) ensures legacy state stored in browser `localStorage` gracefully updates without data corruption.
   - The `quarantineUnreadableState` mechanism ensures hand-keyed marks are backed up to `biomethane-desk-state-unreadable:*` if a JSON migration exception occurs.

4. **Type Safety Cleanliness**:
   - Zero compiler errors exist under TypeScript strict mode (`"strict": true`).
   - The 6 identified `any` assertions are non-structural (e.g. `location.state`, TopoJSON import, or exception catch blocks) and do not compromise domain logic safety.

---

## 3. Caveats
- **Browser Automation / Headless Web Testing**: Analysis was conducted via static code inspection, TypeScript compiler execution (`tsc -b`), production bundle generation (`vite build`), and Vitest unit testing. No interactive headless browser (e.g. Playwright/Puppeteer) was run during this survey pass.
- **External Network Call in Settings / Copilot**: The Google Gemini connection test requires a live API key and outbound HTTPS access to `generativelanguage.googleapis.com`. When offline or without an API key, the Copilot seamlessly runs in local deterministic mode.

---

## 4. Conclusion
The frontend UI architecture, design system compliance, and build pipeline are in **outstanding health**. The application cleanly compiles, passes all 60 tests, strictly adheres to the dark-first `stone` palette, and delivers a robust trading terminal user experience across all 9 screens.

### Proposed Minor Polish Snippets (For Implementation Phase):
1. **Mount FloatingAgentDrawer in `src/app/Layout.tsx`**:
```tsx
// in Layout.tsx
import { FloatingAgentDrawer } from '../shared/components/FloatingAgentDrawer';
...
<main id="main-content" className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
  <ErrorBoundary>
    <Outlet />
  </ErrorBoundary>
</main>
<FloatingAgentDrawer />
```

2. **Update Footer Copy in `src/app/Layout.tsx`**:
```tsx
// line 240-244
<div>
  Baseline 94.0 gCO₂e/MJ · FuelEU Reg. 2023/1805 · 1,975 plants indexed · marks SIMULATED
</div>
<div>
  Keys 1–9 screens · ↑↓ rows · ⏎ playbook · Esc close
</div>
```

3. **Replace Inline Hex BoxShadow in `ScannerScreen.tsx:741`**:
```tsx
// Before:
style={isSelected ? { boxShadow: 'inset 3px 0 0 #14b8a6' } : undefined}
// After (using Tailwind token class or CSS var):
className={`... ${isSelected ? 'border-l-[3px] border-l-teal-500' : ''}`}
```

4. **Refine `any` Types**:
- In `ArbitrageAgentsScreen.tsx:252`: `const passedPrompt = (location.state as { prompt?: string } | null)?.prompt;`
- In `LibraryScreen.tsx:138`: `const handleRecalculate = (dossier: { rawAssessment?: TradeAssessment }) => {`
- In `SettingsScreen.tsx:88`: `catch (e: unknown) { const msg = e instanceof Error ? e.message : '...'; }`

---

## 5. Verification Method
To independently verify this survey:
1. **Execute TypeScript Typecheck**:
   ```bash
   cmd.exe /c npx tsc --noEmit
   ```
2. **Execute Full Production Build**:
   ```bash
   cmd.exe /c npm run build
   ```
3. **Execute Vitest Suite**:
   ```bash
   cmd.exe /c npm test
   ```
4. **Inspect Design Tokens & Palette Grep**:
   ```bash
   # Verify zero banned neutrals:
   git grep -E "\b(slate|zinc|gray|neutral)-[0-9]+" src/
   # Verify zero banned accents:
   git grep -E "\b(purple|blue|orange|rose|violet|indigo|cyan)-[0-9]+" src/
   ```
