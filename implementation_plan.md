# Biomethane Desk Cockpit V2 — Implementation & Design Plan

## 1. Executive Summary & Design Vision
The Biomethane Desk Cockpit V2 transitions the product from an austere terminal aesthetic to a high-caliber modern Fintech SaaS design language (Linear / Stripe / Vercel style). The visual identity balances high institutional density with contemporary dark-mode polish:
- **Palette**: Deep zinc/obsidian surfaces (`bg-zinc-950`, `bg-zinc-900/90`, `bg-zinc-900/50`, `bg-zinc-900/40`), crisp hairline borders (`border-zinc-800/80`, `border-zinc-700/60`), subtle glassmorphism (`backdrop-blur-md`).
- **Accents**:
  - Emerald (`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/30`) for positive margins, favorable yields, and compliant gates.
  - Indigo/Violet (`text-indigo-400`, `bg-indigo-600`, `hover:bg-indigo-500`) for primary actions, active navigation, and brand markers.
  - Amber (`text-amber-400`, `bg-amber-500/10`, `border-amber-500/30`) for unverified due-diligence alerts and conditional ratings.
  - Rose (`text-rose-400`, `bg-rose-500/10`, `border-rose-500/30`) for regulatory blocks and negative spreads.
- **Typography & Numeral Integrity**: Clean Inter sans-serif paired with JetBrains Mono tabular figures (`font-mono tabular-nums`) across all prices, spreads, volumes, and CIs to prevent column and layout jitter.

---

## 2. Core Architectural & UX Changes

### 2.1 Design Tokens & Stylesheet (`src/index.css`)
- Replace the neutral ramp from stone to obsidian/zinc (`zinc-950`, `zinc-900`, `zinc-800`, `zinc-700`, `zinc-400`, `zinc-100`).
- Update the accent color tokens to Indigo (`#6366f1` / `indigo-500`, `#818cf8` / `indigo-400`, `#4f46e5` / `indigo-600`).
- Refined glassmorphism utilities (`glass-panel`, `glass-header`) with subtle backdrop blur and hairline zinc borders.
- Range inputs, focus rings, and scrollbars updated to clean indigo/zinc treatment.

### 2.2 Global Shell & Navigation
- **Glassmorphic Header (`src/app/Header.tsx`)**:
  - Sticky glass header (`backdrop-blur-md bg-zinc-950/80 border-b border-zinc-800/80`).
  - Persistent TTF M+1 and prompt gas tickers with live status.
  - Live multi-node WebSocket desk sync pill (`data-testid="desk-sync-indicator"`).
  - Role badge & switcher (`data-testid="role-selector-button"` with `TRADER`, `RISK_MANAGER`, `COMPLIANCE_OFFICER`).
  - Quick search trigger (Ctrl+K palette modal trigger).
  - Maintain clock formatter export `formatClock` for unit test compatibility.
- **Categorized Collapsible Sidebar (`src/app/Layout.tsx` & `src/app/navConfig.ts`)**:
  - Grouped into 3 intuitive desk sections:
    1. **Trading & Origination**: Origination Desk (`/sourcing`), Trade Builder (`/trade`), Arbitrage Scanner (`/scanner`), Grid Map (`/map`).
    2. **Pricing & Risk**: Pricing & Broker Runs (`/pricing` / `/marks`), Risk & Curves (`/risk`).
    3. **Operations & Compliance**: Trade Dossier Library (`/library`), Plants & Registries (`/plants`), Statutory Citations (`/citations`), Data Sources (`/data-sources`).
  - Sleek toggle button supporting full expanded width (220px) and compact icon rail (56px) with tooltips.
  - Preserves hotkeys 1–7 and exact link matching for all Playwright E2E expectations.
  - Simulated marks banner with interactive link to `/marks`.

### 2.3 Split-Screen Trade Builder (`src/features/trade-builder/TradeBuilderScreen.tsx`)
- Modernized 2-column split-screen layout:
  - **Left Column (Sticky Parameter Studio)**:
    - Deal Counterparty & delivery year selector.
    - Sourcing Origin & verified Plant association banner.
    - Feedstock pathway & Carbon Intensity slider with real-time avoided emissions.
    - Leg A molecule parameters & Leg B green attribute dynamic alpha slider (RWE / EFET indexation).
    - Regulatory policy switches (German 2x / 1x multiplier post-2026).
    - Statutory gate audit trail (ISCC, RED III Annex IX-A, Mass Balance, GHG 65% savings, national registry).
  - **Right Column (Sticky Term Sheet Dossier & Financial Waterfall)**:
    - High-impact Netback & Desk Margin hero card with dynamic color coding (emerald positive, rose negative).
    - Visual financial waterfall breakdown (Certificate Value, Molecule Gas Index, Transfer, Logistics, Producer Payable, Desk Margin).
    - Runner-up alternative market arbitrage cards.
    - 1-click action triggers: Deal Ticket Modal, EFET/RWE Term Sheet download, EU UDB Verification, and Ledger Booking.

### 2.4 Sourcing & Origination Desk (`src/features/sourcing/SourcingOriginationDesk.tsx` & `src/features/commercial/*`)
- **Order Intake Studio**:
  - Segmented desk mode selector (Compliance Quotas vs. Voluntary & Corporate GOs).
  - Clean numeric volume steppers and preset pills.
  - Target market dropdown with automated routing recommendations.
- **Elevated Opportunity Cards & Plant Scanner Table**:
  - Verified producer badges, facility technical tags (membrane separation, amine scrubbing, water wash).
  - Distance & logistics calculation with Dijkstra pipeline corridor visualizer.
  - Instant "Structure Deal" handoff linking seamlessly to `/trade` via `buildDealUrl`.

---

## 3. Verification Strategy
1. **Unit & Mathematical Integrity**: Run all 381 Vitest unit tests (`cmd.exe /c npm test`).
2. **TypeScript Compilation**: Clean build with zero errors (`cmd.exe /c npx tsc -b`).
3. **End-to-End Browser Automation**: Run all 30 Playwright tests (`cmd.exe /c npx playwright test`).
