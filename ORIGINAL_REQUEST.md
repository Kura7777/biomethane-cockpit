# Original User Request

## 2026-08-18T00:55:00+07:00

Build Biomethane Trading Intelligence Platform V2: a high-density decision support and trading operating system for a biomethane sales trader combining European registry intelligence (dena Biogasregister, VertiCer, Energinet), natural gas (TTF) basis spread forward curves, a daily morning market briefing, and what-if sensitivity simulations built on top of the deterministic RED III regulatory engine.

Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)
Integrity mode: development

## Requirements

### R1. European Registry & Balance of Trade Hub
Track certificate issuance, injection volume data, cancelations, and cross-border transfers across key European registries (dena Biogasregister in Germany, VertiCer in the Netherlands, Energinet in Denmark, Enagás in Spain, GSE in Italy). Normalize flow schemas by feedstock category, grid interconnection status, and registry recognition protocols, backed by mockable connector interfaces and realistic European baseline datasets.

### R2. Biomethane vs. TTF Natural Gas Spread & Curve Analytics
Model and visualize the dynamic commercial basis spread between natural gas molecule indices (TTF M+1, Quarterly, and Calendar forward curves) and compliance certificate values (German THG, Dutch ERE, French CPB, Italian CIC, UK RTFO). Provide spread visualization showing total delivered value stacks, molecule components, and logistics tariffs over prompt and forward delivery periods.

### R3. Morning Market Briefing & Actionable Origination Desk
Deliver an automated daily briefing synthesizing overnight price movements, fresh mark staleness warnings, regulatory consultation updates, and top-margin arbitrage corridors. Link directly to actionable origination queues and one-click deal structuring.

### R4. Multi-Branch What-If Sensitivity Simulator
Enable instant scenario stress-testing for trading decisions (e.g. TTF gas price shocks of ±10% / ±20%, German THG double-counting repeal, UK UDB recognition agreement, statutory quota cap modifications) without modifying base marks or violating single pricing authority invariants.

## Acceptance Criteria

### Registry Intelligence
- [ ] Registry data models accurately represent issuance, transfers, and retirements for Germany (dena), Netherlands (VertiCer), and Denmark (Energinet).
- [ ] Cross-border transfer compatibility and UDB title transfer statuses are explicitly verified.

### Spread & Curve Economics
- [ ] Basis spreads are computed dynamically via computeNetback with zero client-side arithmetic shortcuts.
- [ ] Forward curve visualizations render cleanly across prompt, quarter, and calendar delivery periods.

### Morning Briefing & UI Aesthetics
- [ ] Morning briefing summarizes market movers, mark freshness, top 3 arbitrage corridors, and top origination remedies.
- [ ] Dashboard loads in <100ms with high-density terminal typography, dark theme aesthetics, and keyboard navigation shortcuts (1–0).

### Automated Test Suite & Architecture Invariants
- [ ] All 160 existing domain and architecture tests remain passing.
- [ ] Zero numeric literal fallbacks or unsourced pricing coefficients added.
- [ ] src/domain/ maintains 100% React-free purity.
