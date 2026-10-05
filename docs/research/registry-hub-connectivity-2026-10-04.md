# Biomethane registry hub connectivity — research snapshot (accessed 2026-10-04)

Why this exists: the map's "certificate routes" view says where a biomethane Guarantee of Origin (GO) can be
transferred electronically today. A GO only moves between registries that sit on the same hub **and** accept each
other. This file is the citable record behind `src/domain/registries/hubConnectivity.ts`.

Confidence: **PRIMARY** = the registry/hub's own page or legal text; **SECONDARY** = trade press, lobby group or a
third party summarising; **NOT FOUND** = searched, nothing usable.

## 1. Hub membership

### AIB EECS Gas hub
| Claim | Source | Quote | Confidence |
|---|---|---|---|
| Gas-connected registries: AT E-Control, BE-Brussels Brugel, CZ OTE, EE Elering, FI Gasgrid, FR EEX, HU MEKH, IT GSE, LV Conexus, LT Amber Grid, NL VertiCer, PT REN, SK SPP-distribúcia, ES Enagás GTS, SE Energimyndigheten, CH Pronovo | https://www.aib-net.org/registries | hub-connection table, e.g. "Spain / Enagas GTS / Gas", "Sweden / Energimyndigheten / Electricity + Gas" | PRIMARY |
| Pronovo (CH) is gas **imports only** on AIB | https://www.aib-net.org/registries | "Pronovo / Electricity (imports, exports) + Gas (imports only)" | PRIMARY |
| Energinet (DK) is connected for **electricity only** | https://www.aib-net.org/registries | "Denmark / Energinet / Electricity" | PRIMARY |
| Energinet became an applicant to the AIB Gas Scheme Group on 17 Jun 2026; no connection date published | https://www.aib-net.org/news-events/news | "Denmark's Energinet is now officially an Applicant to the AIB Gas Scheme Group." | PRIMARY |
| Sweden said in June 2026 its gas connection was still pending; AIB's table now lists it as gas-connected | https://www.energinyheter.se/20260609/34898/energimyndigheten-vill-infora-internationella-ursprungsgarantier-gas | "Nästa steg blir att det svenska registret Cesar ansluts till AIB:s datahubb." | SECONDARY (superseded by the AIB table) |
| Observers only, no transfers: Gas Networks Ireland, ANRE (RO), Hinicio (BE) | https://www.aib-net.org/facts/aib-member-countries-regions/aib-members | "Scheme Observer" | PRIMARY |

### ERGaR Certificate of Origin (CoO) hub
| Claim | Source | Quote | Confidence |
|---|---|---|---|
| System participants: AT AGCS, DK Energinet, DE dena, SK SPP-distribúcia, CH Pronovo, GB GGCS, LT Amber Grid | https://www.ergar.org/ergar-schemes/ergar-coo-scheme/ | participant list | PRIMARY |
| Each registry chooses whom it accepts | https://www.ergar.org/ergar-schemes/ergar-coo-scheme/ | "registries can decide from which registries to receive certificates" | PRIMARY |
| NL VertiCer is active on ERGaR (missing from the participant page) | https://www.ergar.org/ergar-schemes/coo-scheme-statistics/ | "followed by VertiCer (Netherlands), GGCS (UK), SPPD (Slovakia)" | PRIMARY |
| Amber Grid (LT) joined April 2026 | https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/ | "GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia" | PRIMARY |
| AGCS–dena bilateral (2016) replaced by ERGaR in Dec 2021 | https://www.biomethanregister.at/en/cooperation/european-market/dena | "will thus be replaced by the international ERGaR CoO Scheme in December 2021" | PRIMARY |
| Energinet–dena bilateral (2017): no termination statement found, treated as folded into ERGaR | — | — | NOT FOUND |

### On neither hub
PL, NO, IE (AIB observer), RO (AIB observer). No registry research yet for GR, SI, HR, BG, LU.

## 2. Who accepts whom
| Claim | Source | Quote | Confidence |
|---|---|---|---|
| dena (DE) exchanges via ERGaR with NL, GB, AT, DK, SK only | https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/ | "Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR" | PRIMARY |
| dena now runs ERGaR transfers automatically via CERT-X (Aug 2026) | https://www.dena.de/en/biogasregister/trade-of-biomethane/current-information/automatisierte-transfers-dena-biogasregister-nutzt-ergar-schnittstelle-zu-cert-x/ | "automatically via the ERGaR interface to CERT X" | PRIMARY |
| Pronovo (CH) imports via AIB from all AIB members, via ERGaR from DE, GB, DK | https://pronovo.ch/import-von-gas-hkn/ | "Deutschland (Dena Bioregister), England (GGCS), Dänemark (Energinet)" | PRIMARY (SK listed inconsistently) |

## 3. Origin-side restrictions
| Claim | Source | Quote | Confidence |
|---|---|---|---|
| IT: GOs from supported transport/other-use plants cannot be exported | AIB-2024-DPIT-GSE domain protocol, https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPIT-GSE%20Italy%20-%20Domain%20Protocol%20Italy%2020240710%20-%20clean%20clean.pdf | "GAS GOS transport and other uses, not supported by any support mechanism, can be exported." | PRIMARY |
| DK: GOs are issued to both supported and unsupported production | Energistyrelsen consultation note, 4 Apr 2025, https://prodstoragehoeringspo.blob.core.windows.net/e2cc044e-f2dd-4f7a-8a3d-af2d1a703737/H%C3%B8ringsnotat%20for%20bekendtg%C3%B8relse%20om%20oprindelsesgarantier.pdf | "I Danmark kan der udstedes oprindelsesgarantier både til støttet og ikke-støttet VE-produktion" | PRIMARY |
| DK: volumes under the 2024+ tender support get no GOs | https://landbrugsavisen.dk/biogas-danmark-drop-biogasstoette-paa-10-milliarder-kroner-219528 | "Uden bidraget fra salg af oprindelsesgarantier bliver behovet for støtte større" | SECONDARY |
| GB→DE: non-EU quantities need mass-balance proof at dena | https://www.greengas.org.uk/news/guidance-from-dena-on-uses-of-imported-biomethane-updated | EU quantities "entered in the 'green' status without separate proof" | SECONDARY |

## 4. Ex-domain cancellation (the workaround when there is no shared hub)
| Registry | Policy | Source | Confidence |
|---|---|---|---|
| ES Enagás | "No ex-domain cancellations are allowed." (E.10.13) | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2023-DPESG-Enagas%20GTS%20Spain%20Domain%20Protocol%20-%20Gas_231213.pdf | PRIMARY |
| IT GSE | "Ex Domain Cancellations are not allowed" (C.3.5) | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPIT-GSE%20Italy%20-%20Domain%20Protocol%20Italy%2020240710%20-%20clean%20clean.pdf | PRIMARY |
| NL VertiCer | "Ex Domain Cancellations) are not allowed." | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2025-DPNL-Domain%20Protocol%20the%20Netherlands%20v3.8%20(Clean).pdf | PRIMARY |
| SE | "Ex domain cancellations are not allowed." | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPSE-Swedish%20DP%202024-12-09%20(clean).pdf (may be electricity-only) | PRIMARY (scope unclear) |
| CZ OTE | allowed only towards non-AIB domains, "under exceptional circumstances that shall be confirmed by the relevant state stakeholders" | https://www.ote-cr.cz/en/gos_and_allowances/guarantees-of-origin/domain-protocol-for-gos.pdf | PRIMARY |
| FR EEX | only with an ex-domain cancellation agreement signed with the other issuing body | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFR-Domain%20Protocol%20EEX%20Gas%20Application%20Final%20Clean%20ESG.pdf | PRIMARY |

| AT E-Control | "Any ex-domain cancellations are not possible." | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPAT-E-Control%20Austria%20Domain%20Protocol%2025052023_Correction%20200092024_clean%20version_.pdf | PRIMARY |
| EE Elering | "Ex-domain cancellations are not permitted." (E.12.7) | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPEE-%20Domain%20Protocol%20Elering%20Estonia%20Clean%20version%2020241210.pdf | PRIMARY |
| CH Pronovo | "No Ex-Domain Cancellations are allowed in gas" | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2025-DPCH-Pronovo%20Clean%20v2.pdf | PRIMARY |
| BE Brugel | "Ex-domain cancellations are subject to specific conditions" (E.10.6) | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPBEB-BRUGEL-Brussels%20Domain%20Protocol%20clean.pdf | PRIMARY |
| FI Gasgrid | conditions in E.10.7–E.10.8 | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFI-Domain%20Protocol%20Clean%20Gasgrid%20Finland%20Oy.pdf | PRIMARY |
| SK SPP-distribúcia | conditions in E.12.11–E.12.12 | https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf | PRIMARY |

Result: there is no practical GO path from DK to CZ or ES today.

## 4b. Second pass (2026-10-04): the remaining AIB gas protocols
Read: AT, BE-Brussels, EE, PT (gas), LT (gas), FI, HU, LV (Conexus), SK, CH. No clause found that bars the
**export** of GOs from supported production (Italy remains the only one). Issuance rules that matter:
- PT: "GOs from Production Devices with support are not granted to producers." (C.4.1, REN gas protocol) — supported volumes have no GOs.
- SK: the registry "shall not issue the Guarantee of Origin for renewable gas" (and cancels it) where the gas produced electricity that received a surcharge or top-up.
- **Belgium:** the AIB hub table lists "Belgium - Brussels / BRUGEL / Electricity + Gas", but "Belgium - Flanders / Vlaamse Nutsregulator / Electricity" and "Belgium - Wallonia / SPW Energie / Electricity" (https://www.aib-net.org/registries). Flemish and Walloon gas GOs therefore cannot move via AIB; the app marks BE AIB routes RESTRICTED.
- Austria runs two registries: E-Control (AIB gas) and AGCS (ERGaR). Which one holds a given plant's GOs decides which hub it can use — confirm per plant.

## 5. What an imported GO counts for at destination
| Dest. | Finding | Source | Confidence |
|---|---|---|---|
| DE | GEG, BEHG, EU ETS (TEHG): imports recognised on mass-balance proof (Nabisy); EEG: no; THG-Quote: unsettled | https://www.dena.de/fileadmin/biogasregister_/Dokumente/internationaler_Handel/20230719_dena_Verwendungsmoeglichkeiten_fuer_importiertes_Biomethan.pdf (2023) | PRIMARY, dated |
| IT | imported GOs count only for biomethane meeting art. 42 D.Lgs. 199/2021 sustainability | DM 224/2023, https://www.mase.gov.it/portale/documents/d/guest/dm_224_14-07-2023_garanzie_di_origine-pdf | PRIMARY |
| ES | GdOs from other EU states importable if issued under Directive 2018/2001 | Enagás GdO FAQ (draft), https://www.enagas.es/content/dam/enagas/es/ficheros/gestion-tecnica-sistema/informacion-gestion-tecnica/garantias/preguntas-frecuentes-procedimiento-gestion-garantias-origen.pdf | PRIMARY (draft) |
| CH | imported gas GOs: voluntary market only until state treaties exist | https://pronovo.ch/import-von-gas-hkn/ | SECONDARY |
| SE | biogas tax exemption runs on sustainability evidence (Act 2010:598), not GOs | https://www.skatteverket.se/foretag/skatterochavdrag/punktskatter/nyheterinompunktskatter/2026/nyheterinompunktskatter/nyareglerforskattpagas.5.350d33b019d68128e861cd6.html | SECONDARY |
| CZ, FR, NL, AT | rules for using imported gas GOs | — | NOT FOUND |

EU ETS: purchased biomethane can be zero-rated only with no double counting "including through a disclosure of a
guarantee of origin", with operator and producer "connected to the same gas grid" (Commission guidance GD3,
https://climate.ec.europa.eu/document/download/2289952b-4d59-494c-8c49-c0a559c403d6_en?filename=gd3_biomass_issues_en.pdf).

## 6. Not verified (do not present as fact)
- The ICIS claim that the renewable share of Danish biomethane can be reported by the consuming state and deducted from Denmark's total. No primary RED III text or Energistyrelsen statement was retrieved.
- Where the reported Czech AIB certificate price of €135–139/MWh comes from.
- How Danish biomethane reaches Sweden commercially (Dragør physical flow vs certificates).
- An AIB gas-hub connection date for Energinet.
