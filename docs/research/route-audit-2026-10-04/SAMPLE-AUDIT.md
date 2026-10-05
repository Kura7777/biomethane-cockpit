# Route-matrix sample audit (25 pairs, 50 cells) - 2026-10-05

Scope: route-matrix.json (756 pairs, generated 2026-10-05 04:56Z) vs go-ergar.md, go-aib.md, go-nohub.md, pos-origin-grid.md, pos-dest-nw.md, pos-dest-se.md, pos-dest-se-pass2.md, SYNTHESIS-NOTES.md. Read-only; only this file written.

## 1. Sample method (reproducible)
- PRNG mulberry32, seed 20261005; keys = all 756 "ORIG>DEST" strings sorted alphabetically, Fisher-Yates shuffle (i from n-1 down to 1, j = floor(rnd()*(i+1))).
- Step 1: take all 7 GO OPEN cells. Step 2: walk the shuffled list, add a pair only while it fills an unmet quota (GO P>=5, GO N>=5, PoS P>=5, PoS N>=5, PoS O>=5). Step 3: pad to 25 in shuffled order.
- Resulting mix: GO P 5 / N 13 / O 7; PoS (summary) P 5 / N 8 / O 12. All quotas met.
- Quote check: every source quote split on "..." and each fragment grep-matched (whitespace/quote-normalised) against the 7 research files + SYNTHESIS-NOTES; every URL grep-matched. 39 unique sources in the sample, 173 across the whole matrix.

Quote tags used below: q1 = restated data/paraphrase placed in a "quote" field (figures checked and correct); q2 = English gloss spliced into a genuine foreign-language quote, or two quotes from different URLs fused under one URL; q3 = wording altered/ellipsis dropped inside an otherwise real quote. None of q1-q3 changes a verdict on its own; they are counted separately in issue Q1.

## 2. Table of the 25 pairs

| Pair | Layer | Verdict | OK/ISSUE | Note |
|---|---|---|---|---|
| CH>ES | GO | OPEN (AIB, OBSERVED) | OK q1 | go-aib 16x16 cell [g2]: one 2,237 MWh CH>ES transfer Aug 2026 vs "imports only" -> Q. Matches. |
| CH>ES | PoS | OPEN (ES_SICBIOS) | OK q3 | GO corridor open -> open. Spanish quote last fragment ("y prueba de sostenibilidad") is reconstructed (research: "Cuenten con una prueba de sostenibilidad"). |
| CH>AT | GO | OPEN (ERGaR) | OK q1 | go-ergar CH section: Pronovo FAQ "von und zu" vs UVEK 2024 "Export ... nicht möglich". Quote field is a composite with "vs". |
| CH>AT | PoS | NOT_POSSIBLE (AT_KVO) | ISSUE | Verdict matches pos-origin-grid (CH origin NO, medium, INFERENCE/SECONDARY) but the only source attached is the AT KVO FAQ; the CH exclusion evidence (POS_ORIGIN.CH: GGCS Doc 23) is never attached (I5). Evidence is thin; DE statute treats physically-connected third countries as OPEN. |
| CH>DK | GO | OPEN (ERGaR) | OK q1 | Energinet table yes/yes vs UVEK no export. Matches go-ergar. |
| CH>DK | PoS | NOT_POSSIBLE (DK_TRANSPORT) | ISSUE | Same as CH>AT PoS (I5). HB 2022 quote truncated (q3). |
| LT>CH | GO | OPEN (AIB) | OK q1 | go-aib [c1]: Pronovo 18 Jun 2026 list omits LT. Matches. |
| LT>CH | PoS | NOT_POSSIBLE (CH_TAX_RELIEF) | OK | Quote verbatim (pos-dest-nw L120). |
| HU>CH | GO | OPEN (AIB) | OK q1 | go-aib [c1] matches. |
| HU>CH | PoS | NOT_POSSIBLE | OK | As above. |
| DE>SK | GO | OPEN (ERGaR) | ISSUE (low) | Research verdict is "no source -> open", but dena partner list ("a transfer between dena and ... SPP-distribucia can be carried out via ERGaR") plus URSO 0001/2026/P-PP ("GO issued in a Member State linked to ERGaR Hub counts as recognised") are two primary acceptance statements; arguably settles to POSSIBLE/PUBLISHED (I12). |
| DE>SK | PoS | OPEN (SK_TRANSPORT) | OK q2 | Follows GO corridor. 3rd quote fragment ("SPP-d DP E.10.7 permits ...") is a gloss spliced into the slov-lex Act 309/2009 quote. |
| DE>LT | GO | OPEN (ERGaR) | OK q1 | ERGaR Apr 2026: LT->DE stated, DE->LT not; dena list omits LT. Matches. |
| DE>LT | PoS | OPEN (LT_DAEI) | OK q3 | Lithuanian quote: "..." before "tikslą" dropped. |
| GR>PT | GO | NOT_POSSIBLE | OK q3 | GR electricity-only at AIB (go-nohub). DP URL is composed from base+filename (not literally in research); quote "DAPEEP is appointed Issuing Body" altered (research: "the only known Issuing Body ... responsible for GOs ...") and last clause is a gloss. |
| GR>PT | PoS | OPEN (PT_TDB) | OK | Research: PT "OPEN leaning POSSIBLE"; GR origin OPEN. Consistent. |
| RO>SE | GO | NOT_POSSIBLE | OK q3 | ANRE observer only (go-nohub RO). Quote prefixed with label "OUG 59/2025: ANRE". |
| RO>SE | PoS | POSSIBLE (SE_TAX) | ISSUE | pos-origin-grid summary: RO export by PoS = OPEN ("nothing found"); pos-dest-se-pass2: no RO biomethane production. POS_ORIGIN.RO has inEuMassBalanceSystem=true and no OPEN flag, so compute yields POSSIBLE (I2). SE side also has open Q on which grids count. |
| PT>CH | GO | POSSIBLE (AIB, RULE) | ISSUE (low) | Verdict supported (go-aib matrix P-rule; Pronovo import list names PT/REN). But cited sources are the wrong ones: REN's import rule (rejects third-country GOs INTO PT) and CH "export not possible" quotes do not support PT->CH (I13). |
| PT>CH | PoS | NOT_POSSIBLE (CH_TAX_RELIEF) | OK | Matches pos-dest-nw CH verdict. |
| SK>SE | GO | POSSIBLE (AIB, RULE) | OK | SE connected since 1 Sep 2026 (SYNTHESIS round 5, AIB node/3418); SK EECS-only condition shown. Caveat missing: no SE transfer observed yet (I16). |
| SK>SE | PoS | POSSIBLE (SE_TAX) | OK | pos-dest-nw SE verdict; note open Q on which grids count as the western Swedish mass-balance area. |
| PL>DK | GO | NOT_POSSIBLE | OK q2 | PL no hub (go-nohub). Quote field = Polish Act fragment + English gloss "TGE is ERGaR association member only..." (gloss is research text, not the Act). |
| PL>DK | PoS | OPEN (DK_TRANSPORT) | OK q3 | Matches pos-dest-nw DK ("OPEN, lean not possible"). Note: Danish scheme needs a GO cancelled in Energinet; PL has no GO route, so effectively lean N. |
| DE>NO | GO | NOT_POSSIBLE | OK q2 | Statnett electricity only. |
| DE>NO | PoS | NOT_POSSIBLE (NO_OMSETNINGSKRAV) | OK q2 | Second quote ("Det kan bare brukes flytende biodrivstoff") comes from the /biodrivstoff/ page, but is attributed to the /omsetningskrav.../bakgrunn-og-formal/ URL. |
| SE>DE | GO | NOT_POSSIBLE | OK q3 | SE AIB-only, DE ERGaR-only. dena list quote drops the first entry "VertiCer" without ellipsis (hides that dena's stale list still names NL). |
| SE>DE | PoS | POSSIBLE (DE_THG) | OK | Matches pos-dest-nw DE. Conditions omit: BGBl promulgation date unverified, pre-UDB proof route open, CDU/CSU intent to exclude origin-subsidised fuel (I6). |
| SE>CH | GO | POSSIBLE (AIB, RULE) | ISSUE | go-aib CH verdict: CH imports from "AT, BE-B, CZ, EE, FI, FR, IT, LV, NL, PT, SK, ES; LT, HU, SE not listed/observed". LT>CH and HU>CH were set OPEN for exactly this; SE>CH should be OPEN too (I1). |
| SE>CH | PoS | NOT_POSSIBLE | OK | Matches pos-dest-nw CH. |
| FI>ES | GO | POSSIBLE (AIB, OBSERVED) | OK q1 | 12,364 MWh / 12 transfers matches go-aib 0.4. |
| FI>ES | PoS | POSSIBLE (ES_SICBIOS) | ISSUE | pos-dest-se: GO route "not verified end-to-end", open Q whether an AIB-imported GO can be redeemed with transport end use; go-aib ES survey Q16: "Biogas GOs can only be cancelled for 'unspecified' gas consumption". Research verdict is not POSSIBLE; matrix GO_REQUIRED branch converts GO-possible into POSSIBLE (I4). |
| FR>AT | GO | POSSIBLE (AIB, OBSERVED) | OK q1 | 1,000 MWh / 2 transfers matches. |
| FR>AT | PoS | OPEN (AT_KVO) | OK | pos-dest-nw: "LIKELY POSSIBLE ... OPEN". |
| RO>DE | GO | NOT_POSSIBLE | OK q3 | As RO>SE. |
| RO>DE | PoS | POSSIBLE (DE_THG) | ISSUE | RO origin OPEN per pos-origin-grid (I2). |
| FI>SI | GO | NOT_POSSIBLE | OK q3 | SI electricity-only. Slovenian quote spliced (research has "energijski deleži bioplina v prometu ... v letu 2026 najmanj 2 %"). |
| FI>SI | PoS | OPEN (SI_TRANSPORT) | OK | pos-dest-se-pass2: OPEN leaning possible. |
| FR>BG | GO | NOT_POSSIBLE | OK q2 | BG applicant electricity only. Source quote fuses the Ordinance text and the AIB-members quote under the dv.parliament.bg URL. FR conditional ex-domain (go-aib FR: allowed to non-AIB countries with an EDC agreement) is not offered as workaround (I7). |
| FR>BG | PoS | OPEN (BG_TRANSPORT) | OK | Research: OPEN leaning N. |
| IT>PL | GO | NOT_POSSIBLE | ISSUE (low) | go-nohub PL verdict: import "legal basis exists (Art. 123 URE recognition), manual recognition on application is the only route, practice UNKNOWN". Matrix says "not operational / no hub" and ignores it (I11). |
| IT>PL | PoS | OPEN (PL_NCW) | OK q3 | Matches. Polish quote loses "lub w kraju trzecim" ellipsis. |
| DE>LU | GO | NOT_POSSIBLE | OK | LU gas GO in law, not operating (go-nohub). |
| DE>LU | PoS | NOT_POSSIBLE (LU_TRANSPORT) | OK | pos-dest-se-pass2 LU. |
| PL>FI | GO | NOT_POSSIBLE | OK q2 | As PL>DK. |
| PL>FI | PoS | OPEN (FI_JAKELUVELVOITE) | OK | Matches. FI excise/ETS route (POSSIBLE per Gasgrid) omitted but needs a GO PL cannot supply. |
| LT>SI | GO | NOT_POSSIBLE | OK | |
| LT>SI | PoS | OPEN | OK | |
| SK>SI | GO | NOT_POSSIBLE | OK | |
| SK>SI | PoS | OPEN | OK | |

Totals: 41 OK / 9 ISSUE of 50 cells. Pairs with at least one ISSUE: 9 of 25 (CH>AT, CH>DK, DE>SK, RO>SE, PT>CH, SE>CH, FI>ES, RO>DE, IT>PL). Tier: 4 substantive verdict problems (SE>CH GO, RO>SE PoS, RO>DE PoS, FI>ES PoS), 5 lower (source attachment / judgement: CH>AT, CH>DK, PT>CH, DE>SK, IT>PL). Every OPEN cell in the sample (7 GO OPEN, 12 PoS OPEN) was checked: all GO OPEN are what the research says (Q) except none settled beyond DE>SK; PoS OPEN cells agree with the research verdicts.

## 3. Issues and exact fixes (rules.mjs / compute.mjs)

Severity: H = verdict wrong vs research, M = verdict/condition materially incomplete or inconsistent, L = evidence hygiene.

**I1 (H) SE>CH GO POSSIBLE should be OPEN.** Add `GO_PAIR_EVIDENCE['SE>CH'] = {status:'OPEN', via:'AIB', grade:'PUBLISHED', openQuestionId:'Q-CH-2', reason:'Energimyndigheten joined the AIB gas hub 1 Sep 2026 but Pronovo import list (18 Jun 2026) predates it and omits SE; no transfer observed.', source: Pronovo list (https://pronovo.ch/import-von-gas-hkn/) + AIB node/3418}` (same pattern as LT>CH, HU>CH). Research: go-aib.md "CH - Verdicts" ("LT, HU, SE not listed/observed"), 16x16 note [s].

**I2 (H) Origin-side OPEN ignored for BG, GR, HR, LU, RO, SI.** pos-origin-grid.md summary table: all six = OPEN ("nothing found"); LU also STATE_OWNS_ATTRIBUTES; RO has no production (pos-dest-se-pass2 RO). In `POS_ORIGIN` add `exportStatus: 'OPEN', openQuestionId: 'Q-ORIG-<CC>'` for those six (and FR: research "OPEN / CONDITIONAL", Wallonia "CONDITIONAL"); in `computePosPair` after the scheme status is set, `if (origData.exportStatus === 'OPEN' && status === 'POSSIBLE') { status = 'OPEN'; reason = origin-open text; }`. Affects every PoS POSSIBLE cell with these origins (RO>SE, RO>DE in the sample).

**I3 (H) IE origin bypasses the mass-balance check in two branches.** In compute.mjs `EU_EXCISE_TERRITORY` branch the test is `!['GB','CH','NO'].includes(orig)`, and the `ALL_INTERCONNECTED` branch only excludes NO. Result: IE>DE = POSSIBLE (DE_THG) and IE>GB = POSSIBLE (GB_RTFO), contradicting pos-origin-grid IE verdict "origin to EU system: NO" (Moffat one-way GB->IE; Commission opinion) and POS_ORIGIN.IE.inEuMassBalanceSystem=false. Fix: in both branches add `if (orig === 'IE') { status = 'NOT_POSSIBLE'; reason = POS_ORIGIN.IE.reason; }` (or OPEN with Q-IE-2 for the DE statute, which only tests EU excise territory).

**I4 (M) GO_REQUIRED destinations ES, HU, LV turn GO-possible into PoS POSSIBLE although research leaves it unverified.** pos-dest-se.md verdicts for ES, HU, LV: "GO route, not verified end-to-end (INFERENCE)", each with an open Q; ES survey Q16 (go-aib) restricts biogas GO cancellation to 'unspecified'. Only SK (DP E.10.7, Act 309/2009 14a(9)(g)) and LT (order 1-158 pt 32) are primary-text POSSIBLE. Fix: in `POS_DEST_SCHEMES` ES_SICBIOS, HU_BUAT, LV_TRANSPORT set `acceptsForeign:'GO_REQUIRED_UNVERIFIED'` (new) and in compute return OPEN with `openQuestionId` Q-ES-1/Q-HU-1/Q-LV-1 when goResult is POSSIBLE; keep NOT_POSSIBLE when goResult is NOT_POSSIBLE.

**I5 (M) PoS sources never include origin evidence.** compute.mjs sets `sources: scheme.sources` only, so any cell NOT_POSSIBLE because of origin (CH, GB, IE, NO) cites a destination source that does not support the reason (CH>AT, CH>DK). Fix: when the reason comes from `origData`, use `sources: [...origData.sources, ...scheme.sources]`.

**I6 (M) supportedVolumeRule is printed but never applied; some destination conditions omit support exclusions.** POS_ORIGIN AT, CZ, DE, DK, EE, FR, GB, IT, LU, PT carry rules (SUPPORTED_MUST_STAY / STATE_OWNS_ATTRIBUTES / NO_PoS_FOR_SUPPORTED); research verdicts for them are YES/CONDITIONAL ("unsupported volumes only"). Fix: in compute add `volumeCaveat = origData.supportedVolumeRule?.text` to each PoS scheme result and append to `conditions` when effect is not 'OPEN'. Destination conditions to add: DK_TRANSPORT "supported biogas cannot count toward the blending obligation" (pos-dest-nw DK, HB 2025.1); DE_THG "BGBl promulgation/entry-into-force unverified; pre-UDB proof route open; origin-subsidised exclusion intended but not in statute"; EE_TRANSPORT "imported GOs must not come from supported production (DP C.4.7)".

**I7 (M) DK ex-domain workaround misapplied and never resolved per destination.** Energinet: ex-domain "still allowed for countries without a registry or if the registry is not a member of the ERGaR hub". GGCS (GB) and AGCS (AT) ARE ERGaR members, so `DK>GB` and `DK>AT` must not carry a workaround (currently all 23 DK>x N cells do). NL left ERGaR 1 Jul 2026, so DK>NL workaround is legitimate, but NL's DP forbids ex-domain into NL (go-aib NL "(b) in another Domain for use in the Netherlands" not allowed) and SK's DP E.12.16 refuses ex-domain statements for ETS/CNG/LNG; SYNTHESIS-NOTES says resolve per destination, the text says "is open" for all. Fix: in `getWorkaround` return null for destinations whose registry is `ergar==='PARTICIPANT'` (AT, GB, DE, SK, LT, CH) and add a `exDomainIn` field per destination (NOT_ALLOWED for NL, SK-for-ETS; CONDITIONAL otherwise). Also give FR/CZ/FI/SK/BE `CONDITIONAL` origins a conditional workaround for non-AIB destinations (FR>BG, FR>DE: go-aib FR "EDC agreement" route).

**I8 (M) BE modelled as electricity-only; BE-Brussels is AIB gas-connected.** go-aib BE-Brussels and go-nohub common facts list BE-Brussels among the 16 gas scheme members; 16x16 matrix gives BE-B P-rule (EEA GOs <12 months, zero transfers ever) while FL/WA are N. `REGISTRIES.BE.aib:'ELECTRICITY_ONLY'` makes every X>BE / BE>X say "not connected". Fix: add `brusselsGas:'CONNECTED'` and in the NOT_POSSIBLE reason/workaround for BE add "Brussels (BRUGEL) is AIB-gas connected: P-rule for EEA GOs under 12 months, no transfer ever recorded; Flanders/Wallonia not connected"; or split BE into BE-BRU / BE-VLG-WAL.

**I9 (M) IE destination inconsistent.** GB>IE PoS = NOT_POSSIBLE via generic origin rule, but pos-dest-nw says IE RTFO is OPEN with GB-injected gas the only practical case, while the only N-basis is the Commission opinion (secondary, pos-origin-grid IE) which applies equally to continental origins (which the matrix shows OPEN). Fix: in the `acceptsForeign==='OPEN'` branch honour `originScope:'GB_OR_INTERCONNECTED'` (GB -> OPEN, Q-IE-1) or flag all IE cells as "lean N, Commission opinion".

**I10 (M) Destination schemes omitted.** FI: Gasgrid slides give excise tax + ETS = POSSIBLE (secondary; needs cancelled GO + PoS + same network) but only FI_JAKELUVELVOITE (OPEN) is modelled; FR: IRICC 2027 OPEN (draft, pos-dest-se-pass2) not shown; DE: BEHG/ETS POSSIBLE (2023 sources). Fix: add `FI_EXCISE_ETS` (GO_REQUIRED, grade SECONDARY), a `FR_IRICC` OPEN note (effective 1 Jan 2027) in FR conditions.

**I11 (L) PL (and LU) import recognition ignored.** go-nohub PL: Art. 123 OZE Act URE recognition on application is "the only route", outcome UNKNOWN; LU RGD Art. 11ter "automatically recognised". Fix: add workaround text for X>PL and X>LU ("manual recognition on application; no electronic channel") or Open Q-PL-1; do not describe PL as "not operational" (TGE registry and biomethane GO exist in law).

**I12 (L) DE>SK arguably POSSIBLE.** Cite dena partner list (go-ergar DE section) + URSO 0001/2026/P-PP rule. Keep OPEN only if the user wants the research's strict "no observed lane" standard.

**I13 (L) Wrong sources on P-rule cells.** Step 3 attaches `regOrig.sources + regDest.sources` regardless of direction (PT>CH, SE>CH, SK>SE cite import-side rules of the origin and "export not possible" of the destination). Fix: attach origin export evidence + destination import evidence only; for CH destination cite the Pronovo import list.

**I14 (L) Test-size flows graded OBSERVED.** 11 cells (AT>FI, AT>NL, CZ>FR, FR>CZ, FR>IT, FR>LT, LT>LV, LT>PT, LV>SK, NL>IT, PT>LT) have 1-2 MWh flows; research grades P-test. Fix: grade 'OBSERVED_TEST' and exclude from the "Po" count (57 not 68).

**I15 (L) SE caveat.** All SE>x / x>SE P-rule cells omit "no transfer recorded yet; SE DP R5 (26 Aug 2026) future tense" (go-aib 0.1). Add `condition` in the AIB branch when either side is SE.

**I16 (L) Destination conditions missing in AIB branch.** SK E.10.7 (grid-connected plant for ETS/transport), 12-month production rule for ES, SE, HU, BE-B, AT 129b(8) content test; legacy-GO export bar LV/LT/PT/CZ shown with `appliesTo: []` so never surfaces. Add to `DEST_COND`/`ORIG_COND`.

**Q1 (L) Quote hygiene.** Fix at the source in rules.mjs: reserve `quote` for verbatim text (move paraphrases to `claim`); restore dropped ellipses; keep one URL per quote. Known cases: all OBSERVED sources (data lines, figures verified: every non-test MWh figure matches go-aib 0.4), PUBLISHED-evidence labels, PL/BG/SE>DE/DE>NO/GR/SI/PL-NCW/ES/LT quotes above. DP PDF URLs for GR, PT, SK, SI, LU, SE are composed from the AIB base path plus filename and do not appear literally in any research file (the filenames do).

## 4. Global check 1 - REGISTRIES vs hub facts

| Item | rules.mjs | Research | Result |
|---|---|---|---|
| AIB gas CONNECTED set | AT CH(import-only) CZ EE ES FI FR HU IT LT LV NL PT SE SK (15) | go-aib/go-nohub: 16 members AT, BE-Brussels, CZ, EE, FI, FR, HU, IT, LV, LT, NL, PT, SK, ES, SE, CH | Match except BE-Brussels (I8). |
| CH | aibImportOnly true, ERGaR PARTICIPANT | AIB "Gas (imports only)", ERGaR participant | OK; CH>ES anomaly handled as OPEN. |
| SE | CONNECTED | AIB node/3418 20 Aug 2026, gas EECS from 1 Sep 2026 (SYNTHESIS round 5) | OK (caveat I15). |
| DK | aib APPLICANT, ERGaR PARTICIPANT | AIB applicant 17 Jun 2026; Energinet ERGaR | OK; ex-domain ALLOWED applied too widely (I7). |
| NL | aib CONNECTED, ergar LEFT | left ERGaR 1 Jul 2026 (VertiCer FAQ, SYNTHESIS) | OK. NL>DE, DE>NL, NL>GB, GB>NL, NL>DK, DK>NL all N. |
| ERGaR participants | AT DE DK SK CH GB LT | ergar.org: same 7 | OK. |
| HU | CONNECTED | connected on paper, zero transfers (go-aib) | OK. |
| IE / RO | OBSERVER, not operational | GNI/ANRE observers | OK. |
| GR HR LU NO SI BG | ELECTRICITY_ONLY, not operational | AIB registries: electricity only; BG applicant electricity | OK. |
| PL | NONE/NONE | no Polish AIB member; TGE ERGaR association member only | OK (I11). |
| BE (FL/WA) | ELECTRICITY_ONLY | national non-EECS gas GOs, not hub-tradeable | OK for FL/WA. |
| DE | aib NONE, ERGaR | dena not AIB; ERGaR only | OK. |
| GB | aib NONE, ERGaR | GGCS not AIB | OK. |

ERGaR pair evidence (GO_PAIR_EVIDENCE) cross-checked against go-ergar.md: all 42 ordered ERGaR-participant pairs are covered (3 fall through to AIB rules correctly); all PUBLISHED statuses match the Energinet table, GGCS Doc 7 v2.5 and go-ergar verdicts; the 7 OPEN GO cells equal the research's open questions except DE>SK (I12). All 69 OBSERVED GO cells map to a flow in go-aib 0.4 with correct MWh (11 are test-size, I14).

## 5. Global check 2 - POS_DEST_SCHEMES.acceptsForeign vs destination research

| Dest scheme | acceptsForeign | Research verdict | Result |
|---|---|---|---|
| DE_THG | YES (EU excise territory) | POSSIBLE for EU-injected; third country only if physically connected + UDB; proof route/subsidy exclusion OPEN | OK; add caveats (I6); IE bypass (I3). |
| NL_ERE | NO | NOT POSSIBLE (NEa FAQ) | OK. |
| SE_TAX | YES | POSSIBLE, DK large-scale, others "if same network"; open Q which grids | OK (note open Q). |
| GB_RTFO | YES (all interconnected) | POSSIBLE in principle with nominated flow; unsupported only; GOs excluded | OK except IE origin (I3). |
| IT_CIC | NO | NOT POSSIBLE on primary text (check DM 340/2022) | OK. |
| FR_TIRUERT | NO | NOT POSSIBLE 2026; IRICC 2027 OPEN | OK; IRICC note (I10). |
| CZ_TRANSPORT | YES | POSSIBLE any EU origin | OK. |
| CH_TAX_RELIEF | NO | NOT POSSIBLE via grid | OK. |
| NO_OMSETNINGSKRAV | NO | NOT POSSIBLE | OK. |
| AT_KVO | OPEN | LIKELY POSSIBLE -> OPEN | OK. |
| ES_SICBIOS, HU_BUAT, LV_TRANSPORT | GO_REQUIRED | GO needed, route unverified end-to-end | Over-confident (I4). |
| SK_TRANSPORT | GO_REQUIRED | POSSIBLE via imported GO (E.10.7) | OK. |
| LT_DAEI | GO_REQUIRED | POSSIBLE via GO + conditions | OK. |
| EE_TRANSPORT | GO_REQUIRED (special case) | imported GO "cannot automatically" count -> OPEN | OK. |
| PL_NCW, PT_TDB, FI_JAKELUVELVOITE, BE_TRANSPORT, DK_TRANSPORT, IE_RTFO, SI, HR, RO, GR, BG | OPEN | OPEN (RO, BG lean N; PL, PT, SI lean P; DK lean N) | OK (IE: I9; FI: I10). |
| LU_TRANSPORT | NO | NOT POSSIBLE | OK. |

All 28 destinations carry exactly one scheme.

## 6. Housekeeping disclosure
While running a helper script an unquoted `>` in a shell argument created seven empty files (DE, ES, FR, GB, IE, NL, SE) in C:\Dev\route-audit\build\; I deleted exactly those seven. No other file was changed. Two later read-only shell commands were refused by the auto-mode classifier ("irreversible local destruction") and were not retried; they were only going to count affected cells (I2, I3, I4), so those issues list affected origins/destinations rather than cell counts.
