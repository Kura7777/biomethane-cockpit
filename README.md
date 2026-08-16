# European Biomethane Desk Cockpit 🇪🇺

> A local-first commercial & regulatory desk tool for biomethane traders covering European compliance markets under RED III.

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)
![React](https://img.shields.io/badge/React-18.3-cyan?logo=react)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-teal?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-6.1-purple?logo=vite)
![Vitest](https://img.shields.io/badge/Vitest-Passed-brightgreen?logo=vitest)

---

## 📌 Executive Summary

A biomethane trader covering Europe faces a fragmented market where identical physical molecules have wildly different values depending on the destination compliance mechanism, and roughly half of apparent cross-border arbitrage opportunities are illegal or non-compliant to execute.

This cockpit solves two core problems:
1. **Regulatory Eligibility Gating**: Evaluates 6 strict compliance gates (*Scheme Recognition, Union Database (UDB) Grid Ingestion, Mass Balance Chain of Custody, RED III Annex IX Feedstock Classification, GHG Saving Thresholds, and Member State Specifics*) with verifiable legal citations to EU Directives, Implementing Regulations, and national acts.
2. **Unit-of-Account Normalisation & Arbitrage Ranking**: Converts diverse national units (€/tCO₂e, €/kg CO₂e avoided, €/MWh, €/CIC, £/dRTFC) into normalised **€/MWh netbacks**, gating by eligibility and ranking tradeable vs. blocked opportunities.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+) & npm

### Installation & Development
```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open browser at http://localhost:5173
```

### Production Build
```bash
# Build standalone static bundle into /dist
npm run build

# Preview static production build
npm run preview
```

### Running Test Suite
```bash
# Run Vitest acceptance criteria suite
npm test
```

---

## 🗺️ Key Features

- **Interactive European Compliance Map**: Vector map of 30+ European jurisdictions color-coded by regulatory status (ACTIVE, EMERGING, FUTURE 2028, NONE) with interactive trade route flow visualization.
- **Trade Builder & Legal Validator**: 3-step reactive trade constructor with interactive Carbon Intensity (CI) slider, feedstock annex auto-classification, and exportable boss-ready trade dossiers with citations.
- **Arbitrage & Netback Scanner**: Ranked table of all European markets with eligibility gating, pinned blocked opportunity alerts, and live CI sensitivity simulation.
- **German Double Counting Sensitivity**: Evaluates both $1\times$ and $2\times$ branches side-by-side per §37a BImSchG / 2026 Cabinet draft.
- **Desk Marks & Price Ingestion**: Manual bid/offer/mid entry for compliance certificates, TTF natural gas index, and FX cross rates, with JSON snapshot export/import.
- **Trade Library**: Persisted dossier archive with one-click recalculation against live broker marks.

---

## 🧪 Acceptance Criteria Verified

| Scenario | Gate / Result | Legal Basis |
| :--- | :--- | :--- |
| **UK Grid Injected Food Waste** | 🔴 HARD_BLOCK at UDB | RED III Art. 28(2), Reg. (EU) 2024/2792 |
| **Danish Manure to Germany** | 🟡 UNRESOLVED (Dual Branch) | §37a BImSchG, 38. BImSchV |
| **Danish Manure to France & NL** | 🟢 ELIGIBLE / CONDITIONAL | Code de l'énergie / Wet milieubeheer |
| **ISCC PLUS Certification** | 🔴 HARD_BLOCK for Compliance | Voluntary scope only (GHG Protocol) |
| **Book-and-Claim Chain of Custody** | 🔴 HARD_BLOCK for FuelEU | Reg. (EU) 2023/1805 (Mass Balance required) |
| **EU ETS2 Status** | ⚪ UNKNOWN (2028 Postponement) | Directive (EU) 2023/959 |
| **French CPB Ceiling** | 🔒 CAPPED at €100/MWh | Code de l'énergie Art. L.446-24 |

---

## ⚖️ License

MIT
