# Desk Cockpit Audit — September 2026

**What this is:** the record of the September 2026 audit of the Biomethane Desk Cockpit: what was checked, what was wrong, what was changed, and which test now guards each fix. It replaces `AUDIT_REPORT.md` (17 Aug 2026, "100 / 100 — Certified Production Ready"), which predates these findings and should not be relied on.

**Source:** reconstructed from the working session (25–27 Sept 2026). Findings were reproduced by calling the real functions with test inputs, not inferred from reading code. Where a later round changed an earlier fix, the later state is described.

**Where to verify:**
- Regression tests: `src/domain/__tests__/audit_remediation.test.ts` (one test per engine fix), plus `assumptions.test.ts`, `legalPackage.test.ts`, `statutoryDossier.test.ts`, `plantContactQuality.test.ts`, `plantResearch.test.ts`.
- Run: `npx vitest run`, `npx tsc --noEmit -p .`, `npx vite build`.
- Code: most engine fixes landed in commit `991fcdb` (bundled with other work).

---

## 1. Starting point (25 Sept)

- 486/486 tests passed and the typecheck was clean. **None of the existing tests caught any of the defects below**; several encoded them.
- Verdict at the time: mathematical accuracy 84%, statutory compliance 80%, code quality 78%. **Blocked for desk use** by three critical defects.

Checks that passed at the start (kept for completeness): the 94.0 comparator and 65% GHG gate; CIC, RTFO and ETS emission-factor constants; the FuelEU Annex IV penalty formula; voluntary/GO exemptions; the UK RGGO injection check; e_am handling; the non-EU UDB block; deal-URL round-trip symmetry; plant capacity sanity.

---

## 2. Calculation and regulatory fixes

### Critical (P0)

| # | Defect | Effect | Fix |
|---|---|---|---|
| P0-1 | Gas injected outside GB passed UK RTFO eligibility | Every EU origin appeared as a tradeable UK RTFO opportunity | Grid gas not injected in GB is HARD_BLOCK; physically segregated bio-LNG imports are CONDITIONAL (`eligibility/gates/market-specific.ts`) |
| P0-2 | German THG, compliance year ≤2025: P&L and pricing sides computed before double counting | Desk P&L halved (10 GWh deal: €1.60M shown vs €3.55M correct) | P&L, gross spread and sides recomputed on the doubled value (`netback/engine.ts`) |
| P0-3 | FuelEU mark quoted in €/tCO₂e used as €/MWh | Overstated 47% at CI −100 (€270/t shown as €270/MWh vs €184.04), 3.1× at CI 0 | Converted against the target intensity; forward-curve units aligned with the market registry for every market |

### High priority (P1)

| # | Defect | Fix |
|---|---|---|
| P1-1 | Margin % shown positive on loss-making deals (+115.87%) | Sign follows the desk margin |
| P1-2 | Alpha multiplier pushed French CPB above the €100 ceiling | Ceiling re-applied after alpha |
| P1-3 | Bunker quote used a different Bio-LNG energy content (50.0 vs 49.1 GJ/t), a hard-coded "calibrated" penalty, and ignored CI | Energy content unified; penalty derived from the Annex IV formula; Bio-LNG surplus valued at the FuelEU mark (€285/t at the time; since re-marked, see §4) |
| P1-4/5 | Tariffs summed on a different route from the one priced (391 country pairs); phantom GB↔FR pipeline; Baltic Pipe missing; one-way CH→AT edge; bad segment distances routing DE→FR via Luxembourg | Tariffs priced on the Dijkstra route; graph corrected |
| P1-6 | German THG ceiling used €450/t instead of the statutory €600/t (§37c BImSchG) | €600/t constant |
| P1-7 | 666 plants on country-centroid coordinates presented as real locations | Flagged as placeholders; never shown as audited locations (real coordinates still open, see §6) |
| P1-8 | Opportunities attached to arbitrary plants by list position, with invented "Facility #N" names | Matched to the largest same-country plant certified for that feedstock |

### Medium/low (P2/P3)

- FuelEU targets added for 2035, 2040, 2045 and 2050; the 2% step dated from 2025.
- Shipping ETS phase-in at 100% from 2026; £0.50 RTFC buy-out cap; no shrinkage charge on domestic delivery.
- Deal-URL parsing rejects whitespace, hex, negative volumes and fractional years; the 20,000 MWh dummy volume removed.
- A defect found during the fixes: the plant drawer sent feedstock `organic_waste`, which the Trade Builder relabelled "Manure", losing UK double counting. Now maps to `food_waste`.
- **Where the brief was wrong and the code right:** UK AD biomethane earns standard RTFCs, not development-fuel dRTFCs. `GBP_PER_DRTFC = 0` for AD gas is correct.

### Follow-up round

- **FuelEU physics moved to Annex I/II well-to-wake values:** VLSFO (HFO class) 91.74, MGO 90.77 gCO₂e/MJ; fossil LNG by engine slip (Otto slow-speed 82.87 default, Otto medium-speed 89.20, Diesel slow-speed 76.08). Bio-LNG now includes engine methane slip and N₂O. The 41,000 MJ/t penalty constant is separate from the fuel's energy content. Deficit closure uses the exact marginal of the penalty (checked by finite difference).
- **Shipping dataset regenerated from the calculator** (it had drifted up to 62%). 7 of 36 "surplus sellers" were actually in deficit once methane slip was counted. A test now fails on any future drift.
- **Guarantee-of-Origin registries** carry an explicit `isGuaranteeOfOrigin` flag, fixing ES_GDO and PT_EEGO. Crop-based Bio-LNG is blocked for FuelEU; the transport crop cap no longer applies to heat/GO markets.
- **Landfill gas** stays Annex IX-A(b) but is CONDITIONAL in transport/maritime markets pending national treatment.

> A later, separate FuelEU accuracy audit (commit `401f285`) replaced the shipping dataset with real EU MRV data and corrected Bio-LNG Annex II treatment and on-screen claims. It is not covered in detail here.

---

## 3. Deal documents (term sheet, confirmation, records)

The document generators (`domain/trade/legalPackage.ts`) and the document screen (`LegalPackageModal.tsx`) were rewritten on these rules:

- **Nothing invented.** Missing facts print as `[TO BE AGREED]` or bracketed placeholders. Removed: a made-up desk entity and counterparty, "15 January 2024", a default 10,000 MWh, "Cal 2026".
- **Buyer and seller are explicit.** A "Desk side" setting decides which party is which. It defaults to "desk buys" when the deal came from a plant.
- **Honest labels:** indicative term sheet (non-binding, subject to contract), draft EFET confirmation, generic deal record, internal UDB worksheet, regulatory pre-screen (not legal advice). The "SHA-256 audit seal" is now a document fingerprint.
- **No internal economics on counterparty documents.** Prices come from agreed producer pricing or indicative marks, never the desk netback or margin.
- **Removed claims:**
  - a fake EFET header and a blanket "Annex IX-A" label;
  - invented ±5% take-or-pay and 30-day transfer terms;
  - signature blocks;
  - "compatible with Endur/TriplePoint" and "21 fields validated";
  - fake UDB account IDs;
  - a fictional "EFET Biomethane Annex Section 8";
  - a non-existent "EFET Marine Decarbonisation Annex";
  - "BIMCO Bunker Terms 2020" (the real edition is 2018).
- A hard block stamps documents "NOT TRADEABLE AS STRUCTURED".

Tests: `legalPackage.test.ts`.

---

## 4. Commercial assumptions made visible

Every commercial judgement the engines use now lives in `src/domain/assumptions/registry.ts`, with value, unit, basis (market mark / desk estimate / desk policy), source and where it's used. It's editable on the **Assumptions** screen and inline next to the outputs it drives (FuelEU calculators, plant scanner, Trade Builder risk suite). Overrides are stored per browser.

**Figure that changed:** FuelEU pooling previously used unsourced €465/€435 per tCO₂e. It was switched to the app's own FuelEU mark, with the desk's pool margin as the spread. At the time the mark was offer €300 / bid €270. The later FuelEU audit (`401f285`) re-marked FuelEU at about €104/tCO₂e (offer €108.60, bid €98.60) and made the desk spread its own assumption. Check the Assumptions screen for current values.

Tests: `assumptions.test.ts`.

---

## 5. Plant and counterparty data

### What was found
- **Registration IDs were generated, not looked up**, in every country:
  - all 829 French SIRENs failed the official directory (331 don't exist; 498 belong to unrelated businesses such as a clothing-accessories sole trader);
  - German HRB/HRA numbers run in sequence; placeholders like "12345678".
- **"Verified statutory dossiers" contained invented CVR/SIREN numbers, addresses and emails**, and labelled generated contacts "92% Confirmed". On 1,321 plants the dossier contact contradicted the contact-quality engine.
- **Contacts:** 815 plants have synthetic addresses built from place names (814 in France); 937 are shared switchboards or indirect.
- **Carbon intensity:** every plant's `verifiedCarbonIntensity` is one of 15 feedstock defaults, not an audited value. **Still open:** it's shown as "(Audited)" and passed to the Trade Builder as not estimated (see §6).
- **Register matching for 22 countries was fabricated** (IDs generated with `hash()`), and committed as "100% coverage". Removed.

### What's in place now
- **Registration IDs are shown only when a register confirmed them.**
  - Denmark: 58 of 61 CVRs confirmed.
  - France: 0 of 829 SIRENs are genuine.
- **Dossiers carry `REGISTER_CONFIRMED` or `UNVERIFIED`.** Entity names are never synthesised from town names. No generated contact carries a confidence score. Contacts the contact checker rates undeliverable are never offered.
- **Register matches** exist for Germany (MaStR, operator register), France (ODRE injection sites) and the UK (REPD planning database), each labelled by what the source actually is. The fabricated matches are gone.
- **Sourced counterparty research** (`data/plant_research/`). Every value carries a source URL and date, and a verifier (`scripts/verify_research_sources.ts`) checks mechanically:
  - pages load and domains exist;
  - contacts appear on the cited page;
  - plant links name the plant;
  - CIFs pass EU VIES, and UK company numbers and status match Companies House;
  - the researched site is near the census location.

  Tiers follow the checks. "Outreach-ready" at the time of writing: **5 Spanish plants, 1 UK plant.**

Tests: `statutoryDossier.test.ts`, `plantContactQuality.test.ts`, `plantResearch.test.ts`.

---

## 6. Still open

| Item | Status |
|---|---|
| Carbon intensity shown as "(Audited)" and passed to the Trade Builder as not estimated | **Fixed 28 Sept (`e014a8d`)**, except the plant drawer (`PlantSourcingDrawer.tsx`), which still says "(Audited)". The Trade Builder labels plant CIs "Estimated CI" and shows "PoS CI" only after a PoS upload. The flag was display-only; no price used it. Test: `ciProvenance.test.ts` |
| Real plant coordinates (666 placeholders) | Open. Needs an external source (MaStR/ODRE coordinates for matched plants, or a GIE/EBA export) |
| German register matches: 11 units matched by more than one plant (e.g. Schwedt → BALANCE, not Verbio); 83 matches without distance evidence | Open |
| French operators: ODRE project name found, company (SIREN) not yet confirmed | Open |
| UK plant list: census locations unreliable (125/128 placeholders; 6 research records described different plants) | Open. Proposed: rebuild from the GGCS producer register |
| Italy, Netherlands, Sweden and smaller countries: nothing register-verified | Open |
| Verified contacts | Only those logged by a trader ("desk verified") count as confirmed |
| Assumption overrides and desk contacts stored per browser, not shared across users | Open |

---

## 7. Lessons for future work

- **Output that looks complete isn't evidence.** The original data, the "verified dossiers", the 22-country matches and the first Spanish research round all looked finished and were partly invented.
- **Tests that check shape don't check truth.** Only fetching the source catches invented values: a register lookup, a page fetch, a DNS check.
- **Agent reports need independent checking.** Several reports differed from the files they described. Trust the generated data and the verifier output, not a pasted summary.
