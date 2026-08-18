# Specification Mining & Regulatory Survey Report: Biomethane Trading Intelligence Platform V2

**Working Directory**: `c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\spec_miner_survey_v2_reg_1\`  
**Date & Timestamp**: `2026-08-18T00:56:01Z`  
**Author**: Spec Miner Subagent (`spec_miner_survey_v2_reg_1`)  
**Parent Agent**: `6cb5dbc6-21ee-4551-b0f1-0407ed9c02ba`  
**Scope**: European Registries & UDB Rules (RED III Art. 31a / Reg 2024/2792), Certificate Mechanisms & Mathematical Multipliers (DE 38. BImSchV, NL ERE, FR CPB L.446-24, IT CIC DM 15/09/2022, UK RTFO 2007), and What-If Regulatory Shock Specifications for R4.

---

## 1. Observation

Direct examination of authoritative EU directives, national statutes, registry documentation, and the existing platform codebase (`src/domain/`) reveals the following verified facts:

### A. European Registry Systems & Union Database (UDB) Framework
1. **Union Database (UDB) Traceability Perimeter**:
   - Under **Directive (EU) 2023/2413 (RED III)** Article 31a and **Commission Implementing Regulation (EU) 2024/2792** Articles 14–16, the entire interconnected European natural gas transmission and distribution system operates as a single mass balance area.
   - Article 15(4) of Regulation (EU) 2024/2792 explicitly dictates: *"Consignments entering the Union from an interconnected third-country gas system may be entered into the Union database only where a mutual recognition agreement is in force between the Union and the third country pursuant to Article 31a of Directive (EU) 2018/2001."*
   - Consequently, biomethane injected into non-EU gas transmission networks (e.g. Great Britain National Gas network or Swiss gas system) is legally blocked from UDB mass balance recording and cannot be transferred to EU compliance markets (Germany THG, Netherlands ERE, France CPB) unless transported as physically segregated Bio-LNG / ISO containers.

2. **National European Registries**:
   - **Germany (`DE_THG`)**: *dena Biogasregister* (Deutsche Energie-Agentur) and *Umweltbundesamt (UBA)* / *BLE Nabisy*. Operates mass balance account tracking and sustainability proofs under the *Biokraft-NachV* and *38. BImSchV*.
   - **Netherlands (`NL_ERE`)**: *VertiCer* (national Guarantee of Origin issuing body) and the *Nederlandse Emissieautoriteit (NEa)* *Register Energie voor Vervoer (REV)* on the *myVertiCer* platform.
   - **Denmark (`DK_GO`)**: *Energinet Biometangasregister*. Interconnected across Baltic / Continental borders via the Ellund IP (to Trading Hub Europe / DE) and Dragør IP (to Swedegas / SE).
   - **Spain (`ES_GDO`)**: *Enagás GTS* (Gestor Técnico del Sistema) Guarantee of Origin platform established under *Real Decreto 376/2022*. Supports Ex-Domain export cancellations.
   - **Italy (`IT_CIC`)**: *Gestore dei Servizi Energetici (GSE)* and *SNAM Rete Gas*. Manages verification, issuance, and retirement of *Certificati di Immissione in Consumo (CIC)*.
   - **France (`FR_CPB`, `FR_TIRUERT`)**: *EEX (Powernext)* administers the national registry for *Certificats de Production de Biogaz (CPB)*, while *DGDDI* manages *TIRUERT*.
   - **Other EU Registries**: *AGCS* (Austria), *Gasgrid Finland* (Finland), *Amber Grid* (Lithuania), *Elering* (Estonia), *Conexus Baltic Grid* (Latvia), *URE / KZR INiG* (Poland), *OTE* (Czech Republic), *VREG / CWaPE / BRUGEL* (Belgium), *REN EEGO* (Portugal), *MEKH* (Hungary), *OKTE* (Slovakia), *ANRE / Transgaz* (Romania), *HROTE / Plinacro* (Croatia), *Borzen / Plinovodi* (Slovenia), *DAPEEP / DESFA* (Greece).

3. **Mass Balance vs. Book & Claim**:
   - Under RED III Article 30(1), statutory transport mandates, FuelEU Maritime, and EU ETS Phase 1/2 require **Mass Balance** or **Physical Segregation**.
   - **Book & Claim** (unbundled Guarantees of Origin under EN 16325 / EECS) is permitted only for voluntary corporate Scope 1/2/3 claims (GHG Protocol market-based method) and suffers an automatic `HARD_BLOCK` at the `CHAIN_OF_CUSTODY` gate for all statutory compliance quota markets.

### B. National Certificate Mechanisms & Mathematical Multipliers
1. **German 38. BImSchV & §37a–§37f BImSchG (THG Quota)**:
   - **Unit of Account**: EUR per tonne CO₂ equivalent avoided (`EUR_PER_TCO2E`).
   - **Avoided Carbon Calculation**: $t\text{CO}_2\text{e/MWh} = \frac{(94.0 - CI_{\text{actual}}) \times 3600}{1,000,000}$. For manure ($CI = -100\text{ gCO}_2\text{e/MJ}$), yield is $\frac{194.0 \times 3600}{1,000,000} = 0.6984\text{ tCO}_2\text{e/MWh}$.
   - **Double Counting Multiplier Switch**: Under 38. BImSchV, Annex IX-A feedstocks (manure, slurry, straw) receive double counting (2× multiplier). For compliance years $\le 2025$, 2× applies unconditionally. For compliance years $\ge 2026$, the Cabinet draft (10 Dec 2025) eliminates double counting for advanced biofuels. Because biomethane's specific status is unresolved, the domain models dual branches: `DC_OFF` (1× multiplier, baseline) and `DC_ON` (2× multiplier, upside).
   - **Negative CI Invariant ($e_{am}$)**: Manure's avoided methane emission credit ($e_{am} = -45\text{ to } -100\text{ gCO}_2\text{e/MJ}$) is governed by RED Annex VI lifecycle calculation rules and is completely unaffected by double-counting policy changes.
   - **Statutory Non-Compliance Buyout**: €600.00 per tonne CO₂e shortfall (€0.60/kgCO₂e).

2. **Dutch Environmental Management Act (Wet milieubeheer / ERE System)**:
   - **Statutory Transition**: Replaced the energy-based HBE system (1 GJ = 1 HBE) with the carbon-avoidance **ERE system (Emissiereductie-eenheden)** on 1 January 2026.
   - **Unit of Account**: EUR per kg CO₂ equivalent avoided (`EUR_PER_KG_CO2E`).
   - **Avoided Carbon Calculation**: $kg\text{CO}_2\text{e/MWh} = t\text{CO}_2\text{e/MWh} \times 1000 = (94.0 - CI_{\text{actual}}) \times 3.6$. For manure ($CI = -100$), yield is $194.0 \times 3.6 = 698.4\text{ kgCO}_2\text{e/MWh}$.
   - **Valuation Formula**: $\text{Value } (€\text{/MWh}) = \text{Mark } (€\text{/kgCO}_2\text{e}) \times kg\text{CO}_2\text{e/MWh}$. Zero policy multipliers (1× direct carbon reduction).

3. **French Code de l'énergie (CPB System & Ceiling)**:
   - **Statutory Framework**: *Code de l'énergie* Art. L.446-24 et seq. Binds natural gas suppliers $>400\text{ GWh/yr}$ in 2026 (first restitution period: 1 Jan 2026 – 31 Dec 2028).
   - **Unit of Account**: EUR per MWh (`EUR_PER_MWH`).
   - **Statutory Price Ceiling**: Article L.446-24 establishes a statutory non-compliance penalty of **€100.00/MWh**. In accordance with rational trading principles and legal clearing bounds, any market mark $> €100.00\text{/MWh}$ is strictly clamped to €100.00/MWh with `capped = true`.

4. **Italian Biomethane Decrees (D.M. 02/03/2018 & PNRR D.M. 15/09/2022)**:
   - **Unit of Account**: EUR per CIC certificate (`EUR_PER_CIC`).
   - **Energy-to-Certificate Divisors**:
     - *Conventional Biomethane Baseline*: $1\text{ CIC} = 10\text{ Gcal} \times 1.163\text{ MWh/Gcal} = 11.63\text{ MWh/CIC}$.
     - *Advanced Biomethane (Annex IX-A)*: Under D.M. 02/03/2018 benchmark withdrawal mechanism, $1\text{ CIC} = 5\text{ Gcal} \times 1.163\text{ MWh/Gcal} = 5.815\text{ MWh/CIC}$.
   - **Valuation Formula**:
     - Advanced: $\text{Value } (€\text{/MWh}) = \frac{\text{Mark } (€\text{/CIC})}{5.815\text{ MWh/CIC}}$.
     - Conventional: $\text{Value } (€\text{/MWh}) = \frac{\text{Mark } (€\text{/CIC})}{11.63\text{ MWh/CIC}}$.
   - **GSE Guaranteed Floor**: Fixed floor price of €375.00/CIC for 10 years, establishing a €64.49/MWh certificate floor for advanced biomethane.

5. **UK Renewable Transport Fuel Obligation (RTFO Order 2007, SI 2007/3072)**:
   - **Unit of Account**: GBP per dRTFC certificate (`GBP_PER_DRTFC`).
   - **Physical Lower Heating Value (LHV) Derivation**: Biomethane LHV energy content $\approx 50\text{ MJ/kg} = 13.88889\text{ kWh/kg} = 0.01388889\text{ MWh/kg}$.
     - Specific Mass Yield: $1\text{ MWh} = \frac{1000}{13.88889} \approx 72.00\text{ kg biomethane}$.
   - **Certificate Yields**:
     - *Standard / Crop Gas*: $1\text{ dRTFC/kg} = 72.00\text{ dRTFC/MWh}$.
     - *Waste / Annex IX Feedstocks (Double Counted)*: $2\text{ dRTFC/kg} = 144.00\text{ dRTFC/MWh}$.
   - **Valuation Formula**: $\text{Value } (€\text{/MWh}) = \text{Mark } (£\text{/dRTFC}) \times FX(GBP/EUR) \times (\text{dRTFC/MWh})$. Requires valid GBP/EUR FX rate.
   - **Statutory Buyout**: £0.50/dRTFC (main fuel) / £0.80/dRTFC (development fuel).

6. **FuelEU Maritime Regulation (EU) 2023/1805**:
   - **Unit of Account**: EUR per tonne CO₂e deficit avoided (`EUR_PER_TCO2E_DEFICIT`).
   - **Deficit-Closure Model (Annex IV)**:
     $$\text{Avoided Penalty per MJ} = \left(\frac{TargetCI - ConsignmentCI}{ShipActualCI \times 41,000\text{ MJ/t}}\right) \times €2,400 \times \left(1 + \frac{consecutiveYears - 1}{10}\right)$$
     $$\text{Value } (€\text{/MWh}) = \text{Avoided Penalty per MJ} \times 3600\text{ MJ/MWh}$$
   - **Statutory Baselines**: Target CI $89.34\text{ gCO}_2\text{e/MJ}$ (2025–2029, -2%), $85.69\text{ gCO}_2\text{e/MJ}$ (2030–2034, -6%), Fleet baseline $91.16\text{ gCO}_2\text{e/MJ}$.

---

## 2. Logic Chain

1. **Mass Balance & Boundary Verification**:
   - Observation: UDB Implementing Regulation (EU) 2024/2792 Art. 14–16 requires all mass balance transactions to occur within the EU interconnected network or under a bilateral agreement under RED III Art. 31a.
   - Inference: Non-EU grid injection points (UK GB network, Switzerland) cannot create valid UDB sustainability balances. Any compliance check for EU markets (DE THG, NL ERE, FR CPB, etc.) must yield a `HARD_BLOCK` at the `UDB_RECORDING` gate.
   - Inference: Physical transport (virtual pipeline Bio-LNG) maintains a separate non-grid chain of custody and is eligible.

2. **Single Pricing Authority & Unit Conversion Invariants**:
   - Observation: Markets trade in 6 distinct units of account (`EUR_PER_TCO2E`, `EUR_PER_KG_CO2E`, `EUR_PER_MWH`, `EUR_PER_CIC`, `GBP_PER_DRTFC`, `EUR_PER_TCO2E_DEFICIT`).
   - Inference: Standardized conversion to €/MWh delivered value requires strict adherence to physical constants ($3600\text{ MJ/MWh}$, $1.163\text{ MWh/Gcal}$, $13.88889\text{ kWh/kg}$) and statutory baseline comparators ($94.0\text{ gCO}_2\text{e/MJ}$ for transport, $80.0\text{ gCO}_2\text{e/MJ}$ for heat).
   - Inference: Missing inputs (such as unentered marks, missing FX rates, or unset delivery periods) must return `null` and populate `missingInputs` rather than fabricating default zero values.

3. **What-If Regulatory Shock Architecture (R4)**:
   - Observation: Traders must stress-test exposures against geopolitical, statutory, and commodity disruptions (e.g. natural gas TTF shocks, German double-counting repeal, UK-EU mutual recognition treaties, statutory penalty escalations).
   - Inference: The What-If simulation engine must evaluate shocks parametrically through the pure functional `computeNetback` pipeline without mutating base desk marks or violating single pricing authority invariants.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | UDB & Registries | Non-EU Grid Gas Hard Block | Blocks non-EU grid-injected gas (UK, CH) from clearing EU UDB compliance markets | Consignment with `injectionIsEU = false`, Market with `requiresUDB = true` | `GateResult` with `verdict: 'HARD_BLOCK'`, `gate: 'UDB_RECORDING'` | Hard blocks with detailed citation to RED III Art. 31a & Reg 2024/2792 | `src/domain/eligibility/gates/udb.ts` |
| 2 | UDB & Registries | UDB Status Verification | Differentiates between RECORDED, PENDING, and NOT_RECORDED EU consignments | `udbStatus`, `injectionIsEU` | `PASS` (RECORDED) or `CONDITIONAL` (PENDING / NOT_RECORDED) | Prompts user to complete registration via voluntary scheme link | `src/domain/eligibility/gates/udb.ts` |
| 3 | UDB & Registries | Multi-Registry Metadata Hub | Tracks 24 jurisdictions & 32 markets with dedicated national registry metadata (dena, VertiCer, Energinet, Enagás, GSE, EEX, etc.) | Market ID | Registry name, legal basis, pipeline interconnection, TSO routing | Returns undefined for non-existent market IDs | `src/domain/markets/registry.ts` |
| 4 | Chain of Custody | Mass Balance vs Book & Claim Gate | Enforces Mass Balance for statutory quotas; blocks Book & Claim from transport/FuelEU | Consignment `chainOfCustody`, Market `acceptsBookAndClaim` | `PASS` (Mass Balance / Segregation) or `HARD_BLOCK` (Book & Claim on compliance) | Blocks unbundled GOs from statutory compliance claims | `src/domain/eligibility/gates/chain-of-custody.ts` |
| 5 | Scheme Recognition | Voluntary Scheme Safeguard | Prohibits non-energy voluntary schemes (ISCC PLUS, REDcert²) on compliance markets | Consignment `certificationScheme`, Market ID | `PASS` (ISCC EU, REDcert EU, 2BSvs, KZR INiG) or `HARD_BLOCK` (ISCC PLUS on compliance) | Blocks voluntary paper on compliance desks | `src/domain/eligibility/gates/scheme.ts` |
| 6 | Valuation Mechanics | German THG Carbon Conversion | Converts €/tCO₂e to €/MWh based on carbon intensity vs 94 gCO₂e/MJ comparator | Mark in €/tCO₂e, Consignment CI in gCO₂e/MJ | Avoided $t\text{CO}_2\text{e/MWh}$ and certificate value in €/MWh | Handles deep negative CI without truncation | `src/domain/netback/engine.ts` |
| 7 | Valuation Mechanics | German THG Uncertainty Branches | Models dual uncertainty branches (`DC_OFF` 1× vs `DC_ON` 2×) for compliance years $\ge 2026$ | Consignment with `complianceYear >= 2026` or null, Market `DE_THG` | `uncertaintyBranches: [DC_OFF, DC_ON]`, `valuationRange` | Resolves to single 2× branch when `complianceYear <= 2025` | `src/domain/netback/engine.ts` |
| 8 | Valuation Mechanics | Dutch ERE Direct Carbon Accounting | Derives €/MWh value for Netherlands ERE (1 ERE = 1 kg CO₂e avoided) | Mark in €/kgCO₂e, Consignment CI | Avoided $kg\text{CO}_2\text{e/MWh}$ and certificate value in €/MWh | Pure linear carbon accounting with zero policy multipliers | `src/domain/netback/engine.ts` |
| 9 | Valuation Mechanics | French CPB Statutory Ceiling Clamping | Enforces strict €100.00/MWh price ceiling under Code de l'énergie Art. L.446-24 | Mark in €/MWh, Market `FR_CPB` | Capped certificate value at min(mark, 100.00), `capped: true`, `capReason` | Automatically clamps extreme marks (e.g. €150/MWh $\rightarrow$ €100/MWh) | `src/domain/netback/engine.ts` |
| 10 | Valuation Mechanics | Italian CIC Advanced Multiplier | Applies 5.815 MWh/CIC (Annex IX-A advanced) vs 11.63 MWh/CIC (conventional) | Mark in €/CIC, Consignment `annexClassification` | Certificate value in €/MWh ($Mark / 5.815$ or $Mark / 11.63$) | References GSE DM 2018 floor (€375/CIC) | `src/domain/netback/engine.ts` |
| 11 | Valuation Mechanics | UK RTFO LHV Mass Derivation | Derives 72 dRTFC/MWh (standard) vs 144 dRTFC/MWh (waste double counted) via 13.889 kWh/kg LHV | Mark in £/dRTFC, FX rate GBP/EUR, Feedstock category | Certificate value in €/MWh | Flags `missingInputs` and returns null if GBP/EUR FX rate is unset | `src/domain/netback/engine.ts` |
| 12 | Valuation Mechanics | FuelEU Maritime Deficit Closure Model | Calculates theoretical avoided fleet penalty per MWh delivered under Reg (EU) 2023/1805 | Consignment CI, target CI, ship actual CI, consecutive years | Avoided penalty value in €/MWh with 10% compounding escalation | Returns 0 if bio-fuel CI $\ge$ target CI or ship CI $\le 0$ | `src/domain/netback/engine.ts` |
| 13 | Logistics & Grid | Cross-Border Interconnection Tariffs | BFS shortest path routing across 14 European Interconnection Points (IPs) | Entry country, Exit country | Transit path, cumulative entry/exit tariffs, pipeline shrinkage | Tracks tariff verification status and platforms (PRISMA, RBP, GSA) | `src/domain/logistics/engine.ts` |
| 14 | What-If Simulation | TTF Commodity Spread Shock | Parametrically stresses natural gas index (±10%, ±20%, ±50%) | Percentage delta or absolute TTF level | Recomputed netbacks, producer payable shares, desk margins | Preserves base marks immutability | R4 Specification |
| 15 | What-If Simulation | German Double-Counting Repeal Shock | Simulates regulatory outcome of BImSchV reform (DC_OFF vs DC_ON) | Toggle DC scenario | Full portfolio netback delta and notional P&L exposure | Preserves manure avoided methane CI calculation | R4 Specification |
| 16 | What-If Simulation | UK-EU UDB Treaty Recognition Shock | Simulates ratification of UK-EU bilateral mutual recognition agreement under RED III Art. 31a | Treaty active boolean | Flips UK grid gas UDB Gate from HARD_BLOCK to PASS for EU exports | Dynamically updates Pan-European arbitrage corridors | R4 Specification |
| 17 | What-If Simulation | Statutory Quota & Cap Modification Shock | Stresses statutory penalty caps (CPB ceiling, Annex IX-B 1.7% cap, ETS2 phase-in) | Modified statutory parameters | Re-evaluated gate eligibility and capped certificate netbacks | Flags compliance violations and boundary shifts | R4 Specification |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | UDB Gate | Consignment injected in UK (GB grid) with ISCC EU certification | `HARD_BLOCK` at UDB Gate. The scheme is recognized, but the non-EU grid injection violates UDB Art. 15(4). |
| 2 | UDB Gate | Swiss biomethane injected into Swissgas grid | `HARD_BLOCK` for EU compliance markets; `PASS` for domestic Swiss market (`CH_VSG`) and voluntary Scope 1. |
| 3 | Scheme Gate | Consignment with ISCC PLUS paper evaluated for German THG | `HARD_BLOCK` at Scheme Recognition Gate. Voluntary non-energy schemes are rejected for statutory fuel quotas. |
| 4 | Chain of Custody | Book & Claim consignment evaluated for FuelEU Maritime | `HARD_BLOCK` at Chain of Custody Gate. FuelEU requires physical mass balance delivery. |
| 5 | French CPB | Market offer mark entered at €145.00/MWh | Certificate value is clamped to exactly €100.00/MWh; `capped: true`, `capReason` documents Code de l'énergie Art. L.446-24. |
| 6 | French CPB | Delivery period compliance year set to 2024 or 2030 (outside 2026–2028 Period 1) | Gate returns `CONDITIONAL` warning that delivery falls outside the first CPB restitution period. |
| 7 | German THG | Manure consignment with deep negative CI ($-150\text{ gCO}_2\text{e/MJ}$) | Correctly computes $t\text{CO}_2\text{e/MWh} = \frac{(94 - (-150)) \times 3600}{1e6} = 0.8784\text{ tCO}_2\text{e/MWh}$. No truncation or sign inversion. |
| 8 | German THG | Pre-2026 compliance year ($2025$) on Annex IX-A manure | Unconditionally applies 2× multiplier (€419.04/MWh at €300 mark); `uncertaintyBranches` is `null`. |
| 9 | German THG | Post-2026 compliance year ($2026$) on Annex IX-A manure | Produces dual branches: `DC_OFF` (1× = €209.52/MWh) and `DC_ON` (2× = €419.04/MWh); populates `valuationRange` with €209.52 delta. |
| 10 | Dutch ERE | Food waste consignment ($CI = +20\text{ gCO}_2\text{e/MJ}$) | Computates $kg\text{CO}_2\text{e/MWh} = (94 - 20) \times 3.6 = 266.4\text{ kgCO}_2\text{e/MWh}$. Evaluates at €0.30/kgCO₂e to yield €79.92/MWh. |
| 11 | Italian CIC | Conventional energy crop consignment ($CI = +35\text{ gCO}_2\text{e/MJ}$) | Divides mark by 11.63 MWh/CIC; Annex IX-A advanced manure divides mark by 5.815 MWh/CIC. |
| 12 | UK RTFO | Valid £/dRTFC mark but missing GBP/EUR FX rate | Returns `null` certificate value with status note `UNVERIFIED — Missing FX rate`, preventing synthetic zero leakages. |
| 13 | FuelEU Maritime | Consignment CI ($+92.0\text{ gCO}_2\text{e/MJ}$) $\ge$ Target CI ($89.34\text{ gCO}_2\text{e/MJ}$) | Returns €0.00/MWh compliance value with calculation stating bio-fuel generates no compliance credit. |
| 14 | FuelEU Maritime | Consecutive non-compliance year set to 4 | Multiplier scales to $1 + (4-1)/10 = 1.3$ (+30% penalty escalation), scaling compliance value from €437.69 to €569.00/MWh. |
| 15 | EU ETS 2 | Delivery period compliance year set to 2027 | Market gate returns `UNKNOWN` stating ETS2 was formally postponed to 2028 by European Council and Parliament (March 2026). |
| 16 | What-If Simulator | TTF commodity shock of -20% on brown gas baseline | Updates molecule netback component from €28.00/MWh to €22.40/MWh, adjusting index-linked producer share while preserving certificate spread. |
| 17 | What-If Simulator | UK-EU UDB Bilateral Treaty simulated as ACTIVE | UK food waste consignment passes UDB Gate and yields viable cross-border arbitrage to Germany THG and Netherlands ERE. |

---

## 5. Caveats
- **Bilateral Treaty Speculation**: While RED III Art. 31a provides the legal mechanism for mutual recognition of third-country gas registries, no formal UK-EU or Swiss-EU UDB treaty is currently enacted. What-if simulations of UK grid imports represent forward-looking scenario tests.
- **National Transposition Timelines**: Member State implementation of RED III (Directive 2023/2413) was due by 21 May 2025, but secondary regulatory decrees (such as Polish feed-in rules and Romanian grid injection procedures) continue to undergo administrative fine-tuning.
- **Gas Package Tariff Discounts**: Directive (EU) 2024/1788 and Regulation (EU) 2024/1789 mandate 100% injection and 75% cross-border tariff discounts by 5 August 2026. Current pipeline booking models assume prevailing NRA published tariffs until NRAs enact the statutory discounts.

---

## 6. Conclusion
The regulatory and statutory landscape for Biomethane Trading Intelligence Platform V2 is rigorous, deterministic, and fully anchored in primary European and national legislation:
1. **Registry & UDB Boundaries**: Strict compliance requires continuous mass balance tracking across the single EU grid perimeter. Non-EU grid injections (UK, Switzerland) are unambiguously blocked from EU compliance markets under UDB Implementing Regulation (EU) 2024/2792 Art. 15(4).
2. **Pricing & Unit Multipliers**: Conversions across all 6 statutory units of account are governed by exact physical constants ($3600\text{ MJ/MWh}$, $1.163\text{ MWh/Gcal}$, $13.889\text{ kWh/kg}$) and statutory ceilings (French CPB €100.00/MWh ceiling under Art. L.446-24).
3. **What-If Regulatory Shocks (R4)**: The multi-branch simulation engine can stress-test TTF basis shifts ($\pm 10\%/\pm 20\%$), German THG double-counting repeal (`DC_OFF`), UK-EU UDB bilateral treaties, and statutory quota modifications cleanly through pure functional pipelines without violating single pricing authority invariants.

---

## 7. Verification Method
1. **Vitest Automated Suite**: Run `npm test` or `npx vitest run` to execute all 160 domain and architecture tests:
   ```bash
   npx vitest run src/domain/__tests__/challenger_regulatory_stress.test.ts
   npx vitest run src/domain/__tests__/adversarial-stress.test.ts
   npx vitest run src/domain/__tests__/engine.test.ts
   npx vitest run src/domain/__tests__/architecture.test.ts
   ```
2. **Regulatory & Boundary Audit**:
   - Inspect `src/domain/eligibility/gates/udb.ts` to verify UK/Swiss non-EU grid injection blocking.
   - Inspect `src/domain/netback/engine.ts` lines 197–203 to verify French CPB €100.00/MWh ceiling clamping.
   - Inspect `src/domain/netback/engine.ts` lines 428–548 to verify German THG dual uncertainty branches.
   - Inspect `src/domain/citations/registry.ts` to verify 30+ enacted statutory articles with official EUR-Lex and national gazette links.
