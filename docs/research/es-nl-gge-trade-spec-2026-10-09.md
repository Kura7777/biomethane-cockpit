# Trade spec: Spanish biomethane → Dutch green-gas obligation (GGE)

Verified 2026-10-09. Source of truth for building the NL obligation market, the Spain origin and the chain-of-custody pack.
Status tags: **LAW-TK** (passed Tweede Kamer, Senate pending) · **DRAFT-AMVB** / **DRAFT-MR** (consulted draft Besluit / Regeling) · **ES-LAW** · **OPEN** (undecided — the app must show it as a flagged desk input, never a hidden constant).

Primary sources read in full or verbatim:
- TK Plenair verslag 2026-2027 nr. 10 (6 Oct 2026) — amendment votes
- Ontwerpbesluit bijmengverplichting groen gas (internetconsultatie, doc 15871) — "AMvB"
- Concept Regeling bijmengverplichting groen gas (internetconsultatie, doc 16026) — "MR"
- Beleidskompas AMvB (doc 15851)
- Kamerstuk 36947 nr. 8 (3 Sep 2026)
- NEa page "Wat is de bijmengverplichting groen gas"
- Orden TED/706/2022 (BOE), Art. 2.3, 2.6, 5.3
- App route matrix (audit 2026-10-04)

---

## 1. The trade in one line

Buy biomethane from an unsubsidised, RED-certified Spanish plant injecting into the Spanish grid; deliver the **GO (Enagás → AIB hub → VertiCer) and the PoS (certified chain) together, for the same MWh**, to a Dutch gas supplier, who books them in the NEa GGE register by 1 May of the year after delivery.

## 2. Verified rules (what the app must enforce)

| # | Rule | Value | Status · source |
|---|---|---|---|
| R1 | Unit | 1 GGE = 1 kg CO2e chain-emission reduction | LAW-TK (Art 9.9.4.4 Wm) |
| R2 | Fossil reference | **80 gCO2e/MJ** (RED Annex VI B pt 19, heat). Changes only from a new calendar year if RED changes | DRAFT-MR toelichting 2.3; NEa |
| R3 | Energy basis | **NEa uses lower heating value (LHV)** for the quantity | DRAFT-MR toelichting 2.3 |
| R4 | GGE formula | GGE = (80 − CI) × 3.6 × MWh_LHV. CI = PoS total gCO2eq/MJ per RED Art 31(1) | derived from R1–R3 |
| R5 | Both documents required | Booker must hold, for the same "fysieke levering", a **PoS** (IR 2022/996 Art 2(23)) **and a GO** (RED Art 19(1)) | DRAFT-AMVB Art 3(1) |
| R6 | No separation | "Deze GvO en PoS mogen niet los van elkaar verhandeld worden. De energieleverancier moet beide documenten in bezit hebben." | DRAFT-MR toelichting 2.3 |
| R7 | "Fysieke levering" | Both certificates stay assigned to a mass-balance-traceable delivery from injection into the grid to withdrawal. IR 2022/996 treats the EU interconnected grid as one mass-balancing system → no physical flow ES→NL needed | DRAFT-AMVB toelichting Art 3; IR 2022/996 |
| R8 | GO route | Foreign GOs into VertiCer **via the AIB hub** (other CEN-EN 16325 routes only by mutual agreement). GO must be moved to the **NEa account in VertiCer** before booking | DRAFT-AMVB 2.2.1; Beleidskompas |
| R9 | GO validity | GO expires 12 months after end of production period; must still be valid **at booking**; validity end must fall within/after the delivery period | DRAFT-AMVB 2.2.1; DRAFT-MR 2.3 |
| R10 | Booking window | Gas delivered in year Y can be booked until **1 May Y+1**. Bookings 1 Jan–1 Aug of Y for gas delivered in Y are credited after 1 Aug (cannot serve Y−1) | DRAFT-AMVB 2.2.1, Table 2 |
| R11 | Subsidy | No **exploitatiesubsidie** (operating aid) for the production booked. Proven via the GO's support field + PoS; NEa system checks automatically | DRAFT-AMVB Art 3(2); DRAFT-MR Art 5 |
| R12 | Investment aid | Compatible on the Dutch side ("De DEI++ is een investeringssubsidie en kan dus wel gecombineerd worden") | LAW-TK record (36947 nr. 8) |
| R13 | Sustainability | Gas must meet RED Art 29, 29bis, 30; producer and **every chain link certified** under an EC-recognised scheme (ISCC EU, REDcert-EU, SURE, …), mass balance kept | DRAFT-MR Art 6; DRAFT-AMVB 2.2.1 |
| R14 | PoS data at booking | PoS no. (or UDB no.); scheme; feedstock; **country of origin of feedstock**; per-feedstock % contribution to the reduction; **GHG gCO2eq/MJ total AND per chain step**; whether/what support was received | DRAFT-MR Art 4(1)(b) |
| R15 | GO data at booking | Certificate series no.; issue date; country; competent body; issuing body; energy produced | DRAFT-MR Art 4(1)(a) |
| R16 | Supplier issues PoS | The supplier draws up a PoS for NEa from the PoS of the previous link → the trader in between must be a certified economic operator | DRAFT-MR toelichting 2.3 |
| R17 | Who holds GGEs | Only obligated energy suppliers open GGE accounts; traders sell GO+PoS bundles | DRAFT-AMVB Art 8 toelichting |
| R18 | Obligation | 0.63 / 0.92 / 1.33 / 1.91 / 2.85 Mt CO2e for 2027–2031, flat 2.85 to 2035 | DRAFT-AMVB Art 1 |
| R19 | Buy-out (price ceiling) | €/t: 2027 450 · 2028 459 · 2029 468 · 2030 478 · 2031 487 · 2032 497 · 2033 507 · 2034 517 · 2035 527 | DRAFT-MR Art 2 |
| R20 | Banking | Max 10% of own written-off obligation; none if buy-out used; no borrowing | DRAFT-AMVB Art 11 |
| R21 | Claw-back | NEa may re-determine booked gas **up to 5 years** after booking; shortfall must be refilled in 3 months, else back-charge at the buy-out price | DRAFT-AMVB Art 6, 2.3 |
| R22 | Fraud hold | NEa may suspend crediting up to 4 + 4 weeks | DRAFT-AMVB Art 4 |
| R23 | Transparency | NEa publishes per supplier: production country, feedstock type and origin, scheme | DRAFT-AMVB Art 7 |
| R24 | Origins | EU + EEA. Dutch-only amendment 42 rejected; manure-ban amendment 48 rejected | LAW-TK (Plenair verslag 6 Oct 2026) |
| R25 | NL ERE interaction | Same delivery cannot serve both; GO cancelled on booking | MvT §2.3.2 (via report, not re-read) |

### Spain-specific

| # | Rule | Value | Status · source |
|---|---|---|---|
| S1 | GO route ES→NL | **POSSIBLE via AIB**, observed transfers (2,587 MWh / 4) | App route matrix (AIB flow data) |
| S2 | Spanish operating aid | None for gas production ("no National Public Support Schemes for gas … production") | AIB domain protocol, Enagás GTS |
| S3 | PRTR biogas grants | Orden TED/706/2022 Art 5.3: aid incompatible with any agreement used to obtain "certificados verdes" (Art 2.3: tradable doc under a support mechanism) unless the call says otherwise; GOs expressly compatible (Art 2.6) | ES-LAW. Whether a GGE sale triggers 5.3 is **OPEN** → legal check per plant |
| S4 | Spanish GO energy basis | Gross calorific value (PCS/HHV) per Enagás FAQ | Report (not re-read) → **verify** |
| S5 | Spanish GO export window | Transfer/export within 12 months of production; redeem-only for 6 more | Report (Enagás FAQ, RD 611/2026) → verify |
| S6 | Competing Spanish demand | Transport (RD 611/2026, from 2027); draft non-transport quota 0.5% (2028) → 6% (2035) | Report → DRAFT |

## 3. Open items — the app shows these as flagged desk inputs on #/pricing

| # | Open item | Default | Why it matters |
|---|---|---|---|
| O1 | HHV→LHV factor for Spanish GOs | 0.90 (methane LHV/HHV ≈ 0.901) | ~10% fewer GGEs per GO MWh |
| O2 | GHG-saving threshold category | Show savings vs 80; test against 70% and 80% with commissioning date; flag | RED Art 29(10) tiers depend on start date and capacity |
| O3 | Gas leg | Two structures (see §4); trader chooses | ISCC EU 203 says a PoS can't be separated from its gas batch; whether gas must change hands at PVB or TTF is not settled |
| O4 | UDB for gas | Not mandatory yet; GO+PoS interim route | ISCC may require UDB registration for grid gas |
| O5 | GGE market price | Simulated mark, capped at the buy-out | No traded price yet |
| O6 | Senate vote / start date | 1 Jan 2027 target | Not law yet |
| O7 | 2026-vintage GOs for 2027 delivery | Allowed if GO still valid at booking (R9) — flag "confirm with NEa" | Extends the supply pool |
| O8 | ETS2 stacking (2028+) | Shown as buyer-side upside, not in seller netback | Same GO+PoS also zero-rates the supplier's ETS2 (MvT §9.2) |

## 4. Deal structures (gas leg)

- **A. Bundle at origin** — trader buys gas + GO + PoS at PVB, sells gas + GO + PoS to the Dutch supplier at PVB. No hub spread; the supplier needs PVB access.
- **B. Bundle delivered TTF** — trader buys at PVB, sells gas + GO + PoS at TTF; carries the PVB–TTF spread (book transfer within the single mass balance, no ES→FR→NL capacity).

The ticket must show which one applies; the hub spread is a #/pricing input.

## 5. Build scope

### Data
1. Spanish plants (26 in app, 13 manure): `supportScheme`, `certificationScheme`, `certificateNumber` are empty for all; entity names conflict (operator vs legalEntity vs dossier); coordinates approximate (e.g. Ólvega shows Madrid). Add per plant: Enagás GdO registration (y/n), injection level (grid), PRTR grant (y/n + call), ISCC/REDcert certificate no. + expiry, commissioning date (threshold tier), CI source (PoS actual vs feedstock default). Delegate to a cheaper agent; verify a sample.

### Domain
2. New market `NL_GGE` (sector BUILDINGS_ETS2, unit EUR_PER_KG_CO2E, comparator 80, `requiresGoAndPos: true`, buy-out schedule R19, trajectory R18, eligible origins EU+EEA).
3. Per-market fossil comparator in the netback engine (today `EUR_PER_KG_CO2E` hard-codes the 94 transport comparator, which is correct for ERE but wrong for GGE).
4. Energy-basis conversion: GO MWh (HHV/LHV) → MWh_LHV before the GGE formula.
5. Consignment custody pack: GO {registry, series no., issue date, production period, energy MWh, energy basis, support field, grid-injected}; PoS {no./UDB no., scheme, feedstock, feedstock origin country, CI total + per-step breakdown, support field, MWh}; claims {not redeemed elsewhere, not used in ES transport/quota, ERE, THG, ETS1}; PRTR {grant y/n, legal check done y/n}.
6. One Chain-of-custody checklist replacing CoC + UDB + cross-border PoS + registry-transfer gates for `requiresGoAndPos` markets: AIB route open (route matrix) → GO+PoS same MWh/period → no operating aid → PRTR check → savings threshold → GO valid at planned booking date and Spanish export window → booking deadline 1 May → chain certified (own + counterparty) → no double claim.
7. Fix `isGoTransferMarket` assumption (compliance = PoS only) for paired markets.
8. Counterparty/own certification status (ISCC/REDcert trader cert) as a prerequisite field.

### Pricing (#/pricing)
9. Inputs: GGE mark (€/kg), HHV→LHV factor, PVB–TTF spread, GO transfer fees (Enagás export, VertiCer), certification cost per MWh, legal-check flag defaults. Buy-out schedule visible as the ceiling.

### Legal pack
10. Warranties: GO+PoS paired on the same MWh; no operating aid; PRTR terms permit sale (where applicable); no other claim; **5-year claw-back indemnity at buy-out price (R21)**; document retention ≥5 years; data on PoS per R14. Deliverables list: EECS GO (support + injection attributes), PoS per R14, scheme certificates (producer + trader), mass-balance statement, declarations.

### Map / comparison
11. For a chosen Spanish plant, compare NL_GGE vs Spanish transport vs (2028+) Spanish quota, with the route verdict.

### Watchlist
12. Update `nl_ere_dutch_origin_rule` (bill passed TK); add items: Senate vote, final AMvB/MR publication, NEa GGE register opening, ISCC gas mass-balance rules, UDB gas go-live, Spanish quota decree.

## 6. Golden example (acceptance test)

Spanish manure plant, PoS CI −40 gCO2e/MJ, 1,000 MWh GO on HHV, LHV factor 0.90:
- MWh_LHV = 900
- GGE/MWh_LHV = (80 − (−40)) × 3.6 = 432
- GGEs = 388,800
- Value at the 2027 buy-out ceiling €0.45 = €174,960 → €174.96 per GO MWh (HHV). This is a ceiling, not a price.
- Savings = 120/80 = 150% → passes 70% and 80%.
- GO for March 2027 production: export by end-March 2028; book by 1 May 2028 but before GO expiry (end-March 2028) → effective booking deadline **31 March 2028**.
