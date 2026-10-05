# Synthesis notes (Opus verification log) — route audit 2026-10-04

## Verified by me against primary source
- VertiCer FAQ (https://verticer.eu/en/frequently-asked-questions/traders/): "From 1 July 2026, exports will only be permitted via the AIB Hub to issuing authorities designated by EU Member States" … "you will no longer be able to export via the ERGaR Hub to Dena (Germany)". → NL→DE GO route CLOSED since 1 Jul 2026. Current app data (NL ergar=true, dena list incl. NL) is WRONG.
- Energinet cross-border page (https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/, saved _pdf/en4_*cross_border*):
  - ERGaR table Export from DK / Import to DK: AT-AGCS no/no · DE-Dena yes/no · GB-GGCS no/no · SK-SPPD yes/yes · LT-Amber Grid yes/yes · CH-Pronovo yes/yes · NL-VertiCer no/no.
  - "GOs can only move to other official registries that issue GOs." "Imports from Dena to Denmark are not allowed."
  - **Ex-domain cancellation from DK: "still allowed for countries without a registry or if the registry is not a member of the ERGaR hub."** → DK→CZ/ES/FR/IT/SE etc. = possible as DK ex-domain cancellation; validity depends on DESTINATION recognising an ex-domain-cancelled Danish GO (disclosure / scheme). Must resolve per destination (CZ OTE protocol: imports only from AIB members; ex-domain statements recognised?). Not "pending".
  - Energinet is "member of ERGaR and observer to the AIB" (page wording; AIB news says applicant 17 Jun 2026).

## Corrections needed vs current branch data
- DK→AT: N (Energinet table). DK→GB: N. DE→DK: N. GB→DK: N. DK→NL / NL→anything via ERGaR: N.
- NL: ergar = false (left after 1 Jul 2026); ERGAR_ACCEPTS DE must drop NL.
- CH: export via ERGaR — Energinet says CH→DK yes; UVEK 2024 says Swiss HKN export not possible; GGCS no imports from Pronovo → open question to Pronovo.
- AT: E-Control statutory gas GO issuer (AIB); AGCS issues ERGaR CoO (non-statutory). E-Control gas hub transfers suspended 28 Apr 2026 for new DB (agent: no confirmation of resumption) → verify.
- New route type needed: ORIGIN ex-domain cancellation (DK allows; ES/IT/NL/SE/AT/EE/CH forbid; CZ/FR/BE/FI/SK conditional).
- GGCS (GB): imports from AT, DE, LT, SK; exports to AT, DE, CH (waste/residue only); cannot export to DK, SK, LT, NL (third country).

## Verified (round 2)
- GNI deck (_pdf/gif.txt): pilot registry "cannot connect to hubs (AiB and ERGaR)"; past manual events "1st Import of RG from DK to count towards RTFO", "…from GER…", "1st Export of RG from ROI via Moffat VRF". → IE: no hub GO route today; manual/ad hoc only; new registry Jan 2027 (CRU202615, law-firm summary only).
- RED III Art. 31a(2) (_pdf/red3.txt, red_cons.txt): "the interconnected gas system shall be considered to be a single mass balance system". → PoS mass balance across EU interconnected grid is legally one system; limits come from national schemes/support.
- UK DfT RTFO Biomethane Guidance Dec 2024 §3.17 + §2.13: EU pipeline biomethane accepted for RTFO with interconnected route + capacity booked & nominated at each cross-border point. → EU→GB (UK_RTFO) PoS = POSSIBLE, conditional. GB→EU compliance = NO (third country; Commission reading, secondary).
- Origin locks (agent pos-origin-grid): IT supported (DM 2018/2022) GOs not exportable (primary, AIB protocol + DM 224/2023 art.11(5)); CZ auction recipients get no GO/PoS (ministry slide); FR feed-in-tariff GOs owned by the State; DK tender volumes no GOs (secondary). No export bar found: DE NL AT SE ES FI Baltics PT SK PL.

## Verified (round 3)
- CZ Act 165/2012 §47d(3)(a)1 (_pdf/z165.txt, consolidated 1 Aug 2026): supplier proves sustainability "uplatněním záruky původu nebo jiným dokladem o splnění kritérií udržitelnosti" — GO OR other PoS; consumed in CZ; not claimed in another MS. No origin restriction. → DK→CZ (and any EU interconnected origin) PoS into CZ advanced-biomethane transport obligation = POSSIBLE (advanced feedstock). Likely the ICIS route.
- pos-dest-se.md: ES (Orden TED/728/2024), HU (Gov. Decree 821/2021), LV need a GO booked in national system → only origins with a GO route into those registries (AIB) count. PL/PT probably possible (unsettled). FR: CPB French-injection only; TIRUERT biomethane unsettled. IT, SK, EE, LT, RO, GR, HR, SI, BG, LU unsettled → pass-2 agent launched (pos-dest-se-pass2.md).

## Verified (round 4) — pos-dest-nw.md
- DE THG-Quote: Zweites Gesetz zur Weiterentwicklung der THG-Quote, BImSchG §37b(6) n.F. (_pdf/dnw/drs215530.txt, adopted unchanged; Bundestag 23.04.2026, Bundesrat 08.05.2026 no mediation): grid gas counts as biomethane if matched by biomethane injected "an anderer Stelle im Verbrauchsteuergebiet der Europäischen Union"; third-country injection only if that grid is "physisch mit dem Gasverbundnetz der Europäischen Union verbunden" + further conditions. → EU origin → DE_THG by mass balance = POSSIBLE. GB/CH third-country: conditional (physical link + conditions incl. UDB). OPEN: BGBl promulgation/entry-into-force date; CDU/CSU intent to exclude origin-subsidised fuels NOT in statute. Double counting abolished from 1.1.2026.
- NL ERE: NEa FAQ (verified live): "Nee, dat kan niet. Alleen Garanties van Oorsprong (GvO's) voor groen gas die betrekking hebben op in Nederland geproduceerd biogas kunnen gebruikt worden voor inboekingen (Regeling energie vervoer, artikel 7)". → any foreign origin → NL_ERE via grid = NOT POSSIBLE. (Bijmengverplichting groen gas bill: foreign EU gas via GvO(AIB)+PoS, subsidised excluded — not yet law.)
- SE tax exemption: POSSIBLE for EU origins via DK-SE link (Energimyndigheten 2025 report: imports "från andra delar av EU"; 1.9 TWh net 2023). [verified: _pdf/dnw/se24.txt]
- GB RTFO: POSSIBLE for EU pipeline biomethane (DfT §3.17), GOs and supported volumes excluded.
- CH: grid gas = natural gas at customs, no MinStG relief → EU→CH compliance NOT POSSIBLE via grid (2015/2023 official texts; 1 Jul 2026 changes draft). [verified: newsd.txt, bafu23.txt]
- NO: omsetningskrav excludes biogas → NOT POSSIBLE (compliance).
- AT KVO: grid biomethane on mass balance credited (BMIMI FAQ p.38-39) → likely POSSIBLE. DK, FI, BE, IE open.

## Verified (round 5) — go-aib.md
- SE: AIB news 20 Aug 2026 (https://www.aib-net.org/node/3418, fetched by me): "formally approved … Swedish Energy Agency … application to join the AIB Gas Scheme. From 1 September onwards, Swedish gas GOs may be considered EECS GOs. Such EECS gas GOs will be tradeable over the AIB Hub." → SE = AIB gas CONNECTED since 1 Sep 2026 (AIB is the hub operator; outranks stale Energimyndigheten FAQ). No transfer observed yet in AIB data to Aug 2026 — note, not a blocker.
- AT E-Control: AIB news 22 Apr 2026 "Austrian gas registry outage from April 30 to May 17, 2026"; hub-flow data shows AT gas flows → resumed. Closes go-ergar open point.
- No EECS "must accept all members" rule (agent read EECS Rules R8 v1.11). AIB pairs rest on AIB's general statement + each registry's import checks + OBSERVED flows (AIB hub transfer dataset, generated 2 Sep 2026: 57 corridors with real gas transfers).
- Destination-side AIB limits (agent; primary DP quotes in go-aib.md): FR refuses imports lacking ETS-eligibility tag; IT cancels imported GO only with sustainability+gas-use+GHG data; EE imported GOs disclosure only, may refuse supported-origin; NL, PT, SK, IT, BE-B refuse CH-issued GOs. Origin: IT unsupported only; AT subsidised GOs can't be exported (survey); SK only EECS GOs over AIB; BE-B EEA only. Between two hub members no ex-domain fallback.
- BE Flanders/Wallonia: national non-EECS gas GOs, not hub-tradeable; Wallonia FAQ: no export, foreign gas GOs not recognised. Brugel & MEKH: on hub on paper, zero gas transfers ever recorded.
- Matrix (agent 16×16): P-obs 57, P-test 11, P-rule 125, N 15, Q 32 (SE cells were Q → now P-rule per AIB news).

## Verified (round 6) — pos-dest-se-pass2.md
- IT CIC: DM 2 Mar 2018 art. 5(1) (_pdf/dm2018.txt): CIC "Al produttore di biometano immesso nella rete del gas naturale ed utilizzato per i trasporti nel territorio italiano"; foreign plants only if they "esportano fisicamente la loro produzione di biometano in Italia" AND a Directive 2009/28 cooperation agreement with reciprocity exists (none found). → foreign → IT_CIC by mass balance = NOT POSSIBLE. OPEN: any art.12 agreement; DM 340/2022 amendments (GSE 403).
- FR TIRUERT 2026: amendment 3492 (Gouvernement, "Adopté") deletes art. 16 ter "qui intègre le biogaz carburant (bioGNV) dans le mécanisme de la taxe incitative…" (_pdf/am3492.txt) → biomethane earns nothing in TIRUERT 2026 = NOT POSSIBLE (any origin). FR CPB: French injection only. IRICC from 2027 = draft (OPEN).
- SK: SPP-d DP E.10.7 (_pdf/AIB-2026-DPSK…txt): GOs imported via ERGaR or AIB usable for ETS and transport (CNG/LNG) in SK if issued for grid-connected plants; Act 309/2009 §14b(7) recognises other MS PoS → POSSIBLE via GO(+PoS) from AIB/ERGaR-connected origins.
- LT: order 1-158 pt 32 — foreign GOs for transport stats only with mass balance, no double count, grid-connected; Amber Grid decides → POSSIBLE (conditional); RED III package 25 Jun 2026 may change.
- EE: GO-based; DP E.10.3 imported GOs "cannot automatically" count → NOT POSSIBLE by PoS alone (OPEN for GO route).
- LU: obligation petrol/diesel only → NOT POSSIBLE. SI: 2% biogas share 2026, no origin restriction, no evidence rule → OPEN. RO, GR, HR, BG: OPEN.

## Pending agent files
- go-ergar.md ✅ received (10 open questions)
- go-nohub.md ✅ (13 open questions) · pos-origin-grid.md ✅ (~19 open questions)
- pos-dest-se.md ✅ (weak; pass2 running) · pos-dest-nw.md ✅ (13 open questions)
- go-aib.md ✅ (9 open questions)
- pos-dest-se-pass2.md ✅ (11 open questions) — ALL RESEARCH FILES IN
