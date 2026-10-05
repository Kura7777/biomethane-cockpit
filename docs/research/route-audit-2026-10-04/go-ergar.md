# GO route, ERGaR side — findings (accessed 2026-10-04)

Local copies of all sources: C:\Dev\route-audit\_pdf\ . Quotes are verbatim (translations marked EN).
Key headline: the ERGaR participant list is NOT the same as the set of working transfer lanes. Each registry
picks whom it accepts (ERGaR page: "registries can decide from which registries to receive certificates"), and several
bilateral lanes are closed (UK third-country status, Energinet-dena import, NL after 1 Jul 2026).

## ERGaR hub (scheme-level facts)
### Facts
- System participants (7): AT AGCS, DK Energinet, DE dena, SK SPP distribúcia, CH Pronovo, GB GGCS, LT AmberGrid. NL VertiCer is NOT on the participant page | https://www.ergar.org/ergar-schemes/ergar-coo-scheme/ | "The following national registries are approved as System Participants: Austria: Gas Clearing & Settlement AG / Denmark: Energinet / Germany: dena Biogasregister / Slovakia: SPP distribúcia / Switzerland: Pronovo AG / UK: GGCS / Lithuania: AmberGrid" | PRIMARY
- Each registry decides whom it receives from | same URL | "As part of the scheme rules registries can decide from which registries to receive certificates." | PRIMARY
- Only biomethane is transferred | same URL | "Even though the scope of the scheme includes all renewable gases, only biomethane certificates are currently transferred." | PRIMARY
- Scheme rules v1.4 (draft final, Oct 2025): EN 16325 can restrict GO transfers; registries tell the operator about limits | https://www.ergar.org/wp-content/uploads/2025/12/20251007-ERGaR-SPWG-Final-draft-CoO-scheme-rules-1.4_upload.pdf (§3.2) | "the rules of the CEN standard EN 16325 might restrict the transfer from or to another System Participant. In that case, the System Participant informs the Operator about limitations of CoO transfers via ERGaR Hub." | PRIMARY. The rules contain no list of who may send to whom (grep: no matrix).
- NL VertiCer IS active on ERGaR per statistics (Q2 2024 etc.) | https://www.ergar.org/ergar-schemes/coo-scheme-statistics/ | "the highest volume of transfers was from Energinet (Denmark), followed by VertiCer (Netherlands), GGCS (UK), SPPD (Slovakia)" | PRIMARY
- Q1 2026 flows (latest published) | same | "Main import markets were as always Germany/dena (around two-third) and Switzerland/Pronovo (around one-third) with some smaller volumes exported to Slovakia/SPP Distribucia and Denmark/Energinet. ... UK/GGCS exporting slightly more than Denmark. There were also significant exports from the Netherlands/VertiCer and Germany." | PRIMARY. Observed lanes: (any)->DE, (any)->CH, ->SK, ->DK; exports from GB, DK, NL, DE. AT exports to DE seen 2022-Q2 2024 (e.g. "Further exports were made from the Netherlands and Austria to Germany", Q1 2023). No LT flow listed yet (LT joined Apr 2026).
- Historic: "In the first quarter of 2022, all biomethane CoO were transferred to the German Biogasregister" (Q1 2022); DE was sole destination until Pronovo (Q1 2025: "followed by the newest system participant Pronovo AG") | PRIMARY
- LT joined 23 Apr 2026 | https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/ | "GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia." (same page still lists NL as connected in Apr 2026) | PRIMARY
- Transfers are book-and-claim, per MWh, buyer must hold an account in the target registry | AGCS guideline https://www.biomethanregister.at/biogas/registrierung/allgemein/Guideline-international%20transfers%20via%20ERGaR.pdf | "The data transfer is generally based on the book & claim concept." | PRIMARY

## NL — VertiCer (answers task item 2: formal participant?)
### Facts
- NL announced it leaves ERGaR; VertiCer stays "tot uiterlijk 1 juli 2026" | https://verticer.eu/nl/nieuws/verticer-breidt-dienstverlening-uit-met-import-en-export-van-groen-gas-en-groene-waterstof/ (13 Aug 2025) | "VertiCer blijft tot uiterlijk 1 juli 2026 aangesloten bij het ERGaR-platform. Dit biedt gebruikers een tijdelijke exportmogelijkheid voor groen gas." (EN: remains connected to ERGaR until 1 July 2026 at the latest; temporary export route for green gas) | PRIMARY
- Policy reason and consequence for dena | https://verticer.eu/en/frequently-asked-questions/traders/ | "Until July 1, 2026, you can also trade gas GOs via the ERGaR Hub. From 1 July 2026, exports will only be permitted via the AIB Hub to issuing authorities designated by EU Member States. In concrete terms, this means that from that date onwards, you will no longer be able to export via the ERGaR Hub to Dena (Germany). The Ministry of Climate and Green Transition has announced this decision in a letter to Parliament." | PRIMARY
- Trader news: "Tot 1 juli 2026 kunt u exporteren via de ERGaR hub." | https://verticer.eu/en/news/belangrijke-wijzigingen-en-ontwikkelingen-voor-handelaars/ | PRIMARY
- GGCS guidance v2.5 (10 Jun 2026) | https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf | "Please note that VertiCer is leaving ERGaR after 1 July 2026." | PRIMARY
- Energinet's table (undated, post Apr 2026) shows NL VertiCer export no / import no | https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/ | "The Netherlands - VertiCer | no | no" | PRIMARY
- Stale pages still list NL: dena ("VertiCer operated by Gasunie BV (NL)", https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/, undated), AGCS, ERGaR Apr 2026 article. Not updated after 1 Jul 2026; ERGaR participant page already omits NL. | PRIMARY
- NL on AIB gas hub (established in brief): exports via AIB only to EU-designated issuing bodies. Austria E-Control and others reachable; dena is not an AIB member/issuing body.
### Verdicts
- Is VertiCer a formal ERGaR participant? It WAS an active participant (statistics 2022-Q1 2026; AGCS/dena/ERGaR Apr 2026 pages list it) but is absent from the current official participant list and was scheduled to exit on/after 1 Jul 2026. TODAY (4 Oct 2026): treat as NOT a participant; no ERGaR lane from/to NL.
- NL imports via ERGaR: none (Energinet "no"; GGCS "No"). Exports via ERGaR: ended 1 Jul 2026 (VertiCer FAQ).
### Open questions
- Q: Is VertiCer's ERGaR connection fully switched off (incl. imports into NL), and was any date after 1 Jul 2026 used? | Ask: VertiCer B.V. servicedesk | Contact: https://verticer.eu/en/contact/ (phone 0800-28 28 000 per VertiCer news)

## GB — GGCS (REAL) (answers item 3: does GGCS import?)
### Facts
- GGCS imports from several ERGaR registries and exports to few. Full table in Guidance Document 7 v2.5 (10 Jun 2026) | https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf (local: _pdf/ggcs_g7.txt, section 2) | rows (exports from GGCS / imports into GGCS):
  - AGCS AT: "Yes - you can export RGGOs from GGCS to AGCS" / "Yes - you can import RGGOs from AGCS to GGCS"
  - Amber Grid LT: "Restrictions in place - you cannot currently export RGGOs to Amber Grid from GGCS due to the UK's status as a 'third country'" / "Yes - you can import RGGOs from Amber Grid"
  - dena DE: Yes / Yes
  - Energinet DK: restriction (third country) / "No - you cannot import RGGOs originally issued by Energinet to GGCS, even if they are transferred via another registry"
  - Pronovo CH: "Yes - you can export RGGOs (with a waste or residue energy source label) from GGCS to Pronovo" / "No - There are currently no plans to import RGGOs from Pronovo to GGCS"
  - SPP-d SK: restriction (third country) / Yes import from SPP-d
  - VertiCer NL: restriction / "No - you cannot import RGGOs originally issued by VertiCer" ; "VertiCer is leaving ERGaR after 1 July 2026" | PRIMARY
- Reason for refusals (s.4.4-4.7) | same | "Energinet is an appointed Issuing Body under the terms of RED II and they will not accept transfers from registries which do not share that status. For such transfers to take place in the future, the UK and the EU would need to enter into a mutual recognition agreement as envisaged in Article 19 of RED II." (same wording for SPP-d, VertiCer, Amber Grid) | PRIMARY
- Export conditions to AGCS/dena/Pronovo: Criteria 1+2+3 (audit document, valid RGGO ie 39 months, GGCS Data Verification Statement) | same s.4 | PRIMARY. To Pronovo only waste/residue labels ("Biomass (Unspecified) Classification (Product/Co-Product) cannot be transferred").
- Closed system | same s.3.5 | "Transfers of RGGOs to and from biomethane registries other than those participating in the ERGaR CoO Scheme are not possible." GGCS is NOT on AIB. | PRIMARY
- Imported RGGOs lose data (feedstock always "Renewable/Gaseous", no PoS link) and "Transferred RGGOs do not count towards the national renewable energy targets of either the UK or any other country." | same s.3.3, 5.1-5.2 | PRIMARY
- GGCS accepts "transfers of RGGOs from any other registry that is part of the ERGaR CoO Scheme" (s.5) but then lists no-import rows for DK, CH, NL; the table governs. | PRIMARY
- Energinet's own table also says GB<->DK no/no | see DK section | PRIMARY
### Verdicts
- GGCS imports FROM: AT AGCS, DE dena, LT Amber Grid, SK SPP-d. NOT from DK, CH, NL.
- GGCS exports TO: AT AGCS, DE dena, CH Pronovo (waste/residue labels only). NOT to DK, SK, LT, NL.
- Answer item 3: yes, GGCS imports (from 4 registries).
### Open questions
- (none for GGCS itself; the Pronovo -> GGCS "no plans" and SK/LT cells depend on the other side, see their sections)

## DK — Energinet (biomethane GO registry, Grexel G-REX)
### Facts
- Energinet's own cross-border page (HTML body embedded in page JSON; undated, mentions Lithuania so after Apr 2026) | https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/ (saved _pdf/en4_*cross*.dat) | "Energinet is a member of ERGaR and observer to the AIB." "GOs can only move to other official registries that issue GOs. This means Danish GOs can only go to some registries in the ERGaR group." "Imports of GOs is possible from issuing bodies in the ERGaR collaboration only." "Transfers to the German registry Dena are allowed as an exception, even though Dena is not Germany's official issuing body." "Imports from Dena to Denmark are not allowed." | PRIMARY
- Table "Transaction options through the ERGaR hub to and from the Danish registry" (Export from DK / Import to DK): Austria-AGCS no/no; Germany-Dena yes/no; Great Britain-GGCS no/no; Slovakia-SPPD yes/yes; Lithuania-Amber Grid yes/yes; Switzerland-Pronovo yes/yes; Netherlands-VertiCer no/no | PRIMARY
- Ex-domain | same | "it has been possible to cancel GOs outside Denmark (ex domain). This is still allowed for countries without a registry or if the registry is not a member of the ERGaR hub." | PRIMARY
- Bilateral Energinet-dena (2017): news 22 Nov 2017 "Denmark sells biomethane certificates to Germany" https://en.energinet.dk/About-our-news/News/2017/11/22/Denmark-sells-biomethane-certificates-to-Germany/ (page body not retrievable by curl; title and gist only from search snippet) | SECONDARY. dena 2021 slide: "Die Nachweise wurden über bilaterale Kooperationen und Stilllegungsnachweise ... gehandelt" (https://www.dena.de/fileadmin/biogaspartner/Dokumente/Jahreskonferenz_2021/3.2_Matthias_Edel_Internationaler_Handel_von_Biomethan.pdf). No termination notice found; Energinet's cross-border page now describes only ERGaR, so the 2017 bilateral is INFERENCE: superseded by ERGaR hub.
- AIB: DK electricity only; gas applicant since 17 Jun 2026 (see brief). 
### Verdicts
- DK exports via ERGaR to: DE dena, SK, LT, CH. Imports from: SK, LT, CH. No AT, GB, NL either way; no import from DE.
### Open questions
- Q: Why is AT AGCS "no/no" - not an issuing body for GOs, or technical? And will DK-AT open via AIB (E-Control) once DK connects to the AIB gas hub? | Ask: Energinet Gas GO registry | Contact: https://en.energinet.dk/gas/biomethane/ (contact form; account-holder support via Grexel G-REX)

## SK — SPP-distribúcia, Register of renewable gases (G-REX)
### Facts
- SPP-d's own presentation (Energetický seminár, 14-15 May 2026) | https://www.vse.sk/sdoc/doc/prezentacie/03_Viera_Hricova.pdf | "Implementácia prevodov do / zo zahraničia pre záruky pôvodu biometánu cez ERGaR Hub – export do DE, DK, import z DK." (EN: via ERGaR hub - export to DE, DK, import from DK). Also "cez AIB Hub – export / import do / z AT, CZ, NL, BE, FI, IT, LV, LT, PT, ES ... Export do CH." | PRIMARY (operator's own slide)
- 2025 actuals | same slide | "zo SR exportovaných 42 869 MWh záruk vydaných v SR do nemeckého registra. Naopak do slovenského registra bolo importovaných 26 636 MWh záruk pôvodu vydaných v dánskom a holandskom registri." (EN: 42,869 MWh exported SK to DE; 26,636 MWh of Danish and Dutch GOs imported into SK) | PRIMARY
- Regulator-approved operating rules (URSO decision 0001/2026/P-PP of 29 Jan 2026) | https://data.urso.gov.sk/CISRES/Agenda.nsf/0/6D7A995C8B83FC63C1258D8D00414B62/$FILE/0001_2026_P-PP.pdf (sections 6 and 8) | "Záruka pôvodu vydaná v registri záruk obnoviteľných plynov v členskom štáte, ktorý je prepojený s ERGaR Hub sa považuje za uznanú záruku pôvodu" (EN: a GO issued in a member state linked to the ERGaR Hub counts as a recognised GO). Transfers allowed to/from any ERGaR-linked state; registries not on ERGaR need manual recognition under Act 309/2009; transfer at latest 12 months after production. | PRIMARY. Rules are generic and do not exclude GB; GGCS says SPP-d refuses GB.
- GGCS guidance 4.5: "SPP Distribúcia is not accepting transfers of RGGOs from the GGCS ... appointed Issuing Body under the terms of RED II"; GGCS can import from SPP-d | PRIMARY (other side)
- Energinet table: SK export yes / import yes. ERGaR Apr 2026: LT and SK exchange. | PRIMARY
### Verdicts
- Evidence-backed ERGaR lanes: SK->DE, SK<->DK, SK<->LT, SK->GB (GGCS imports SPP-d), NL->SK (closed since 1 Jul 2026). GB->SK not possible. SK<->AT AGCS, SK<->CH, DE->SK: no source -> open.
### Open questions
- Q: Does SPP-d accept ERGaR transfers from dena (DE), AGCS (AT) and Pronovo (CH), and send to AGCS and Pronovo via ERGaR? (slide lists only DE/DK out and DK in) | Ask: SPP-distribúcia, register of renewable gases operator | Contact: https://www.spp-distribucia.sk/ (site timed out; email not retrieved)

## LT — Amber Grid (renewable gas GO registry)
### Facts
- Joined ERGaR 23 Apr 2026 | https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/ | "GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia." Same text at https://ambergrid.lt/en/for-media/news/lithuanian-biomethane-gains-access-to-a-broader-european-market-amber-grid-joins-the-ergar-hub/1287 (Amber Grid says Danish registry only) | PRIMARY
- Amber Grid: "Lithuanian biomethane is already being exported to the Czech Republic, Spain, the United Kingdom, etc." (earlier, pre-ERGaR; route unspecified, vague) | PRIMARY-vague
- GGCS: can import from Amber Grid, cannot export to it (third country) | PRIMARY
- Energinet: LT yes/yes | PRIMARY
- Pronovo's lists of 18 Jun 2026 name LT under neither hub | https://pronovo.ch/import-von-gas-hkn/ | INFERENCE: list not exhaustive (AIB list also omits HU)
- LT also on AIB gas hub (brief; VertiCer news 22 Jan 2026).
### Verdicts
- ERGaR lanes with evidence: LT->DE, LT<->DK, LT<->SK, LT->GB. DE->LT, CH<->LT, AT<->LT: no source.
### Open questions
- Q: Does Amber Grid accept ERGaR transfers from dena and Pronovo/AGCS, and can it send to them? | Ask: Amber Grid GO registry | Contact: https://ambergrid.lt/en (email not retrieved)

## DE — dena Biogasregister
### Facts
- Partner list | https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/ (undated; stale, still lists VertiCer, omits CH and LT) | "Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR: VertiCer ... GGCS ... Biomethanregister.at ... Danish biomethane registry ... Register of renewable gases operated by SPP - distribúcia" | PRIMARY
- Aug 2026 | https://www.dena.de/en/biogasregister/trade-of-biomethane/current-information/automatisierte-transfers-dena-biogasregister-nutzt-ergar-schnittstelle-zu-cert-x/ | "the dena Biogasregister will process imports and exports of biomethane certificates fully automatically via the ERGaR interface to CERT X" | PRIMARY
- dena is not Germany's official GO issuer; planned EN 16325 revision bars GO registries from sending to non-GO registers | https://www.dena.de/en/biogasregister/trade-of-biomethane/current-information/cen-standard-en16325-no-short-term-impact-on-international-trade/ (20 Sep 2024) | "it will no longer be possible to transfer guarantees of origin (GOs) to non-GO registers, such as ... dena" ; deadlines not set; German UBA gas GO register "not expected until 2026 at the earliest" | PRIMARY. NL already stopped (see NL).
- dena -> DK | Energinet | "Imports from Dena to Denmark are not allowed." | PRIMARY
- dena <-> GB: GGCS table yes/yes | PRIMARY. dena <-> AT: AGCS lists dena connected; GGCS<->AGCS yes | PRIMARY. dena -> CH: Pronovo imports from "Deutschland (Dena Bioregister)" | PRIMARY.
- Bilateral AGCS-dena (2016) replaced Dec 2021 | https://www.biomethanregister.at/en/cooperation/european-market/dena | "The bilateral cooperation between dena and AGCS will thus be replaced by the international ERGaR CoO Scheme in December 2021." | PRIMARY (ended)
- No bilateral with non-ERGaR registries found; GGCS: non-ERGaR transfers "are not possible".
### Verdicts
- Into DE: from AT, DK, GB, SK, LT (ERGaR page), NL (ended 1 Jul 2026). CH->DE no evidence. Out of DE: to AT, GB, CH; not DK; SK, LT unknown.
### Open questions
- Q: Does dena send certificates to SPP-d (SK), Amber Grid (LT) and receive from Pronovo (CH)? Why does the partner page omit CH and LT? | Ask: dena Biogasregister | Contact: support@biogasregister.de, +49 30 66 777 888

## CH — Pronovo (item 3: import only?)
### Facts
- ERGaR member since early 2025; imports via both hubs | https://pronovo.ch/import-von-gas-hkn/ (18 Jun 2026) | "kann Pronovo sowohl den AIB- als auch den ERGaR-Hub nutzen, um europäische Herkunftsnachweise zu importieren." ERGaR import list: "Deutschland (Dena Bioregister), England (GGCS), Dänemark (Energinet)". AIB list: AT E-Control, BE Brugel, CZ OTE, FI, IT GSE, LV Conexus, NL Verticer, PT REN, ES Enagás, AL ERE, EE Elering, SK SPP | PRIMARY
- Swiss UVEK explanatory report 21 Feb 2024 | https://pubdb.bfe.admin.ch/de/publication/download/11643 | "Ein Export von Schweizer HKN ist zurzeit nicht möglich." | PRIMARY (2024 consultation draft). AIB table: "Gas (imports only)" (brief).
- Pronovo FAQ on Austria | https://pronovo.ch/de/herkunftsnachweise/erneuerbare-treib-und-brennstoffe-bt/ | "Das Schweizer HKN-System ist an beide Hubs angeschlossen und kann Transfers von und zu beiden österreichischen Registern durchführen." | PRIMARY (undated; "von und zu" sits oddly with no export)
- Conflict: Energinet's table gives CH export/import yes/yes; GGCS "no plans to import RGGOs from Pronovo"; ERGaR statistics show CH only as importer.
- Imports count only voluntary / ETS-CO2-law with treaty ("Staatsvertrag"), per Pronovo FAQ | PRIMARY
- No bilaterals; non-hub registries need ex-domain cancellation agreements (FAQ).
### Verdicts
- Treat CH as import-only (law 2024, AIB, stats). Imports via ERGaR: DE, GB (waste/residue labels), DK, AT-AGCS (FAQ); via AIB: AT E-Control, NL, SK etc.
### Open questions
- Q: Can any certificate leave Pronovo via ERGaR (Energinet says CH->DK yes)? Does Pronovo import via ERGaR from LT, SK, AGCS (its page lists only DE, GB, DK)? | Ask: Pronovo AG | Contact: info@pronovo.ch ; bt@pronovo.ch (cited by GGCS)

## AT — AGCS Biomethan Register (ERGaR) vs E-Control Herkunftsnachweisdatenbank (AIB) (item 5)
### Facts
- AGCS = registry nominated under the Gas Economy Law; issues biomethane certificates | https://www.biomethanregister.at/en/registry/registry-operator | "The balancing group coordinator AGCS ... was nominated to operate the certification and registry system (Gas Economy Law, GWG)." | PRIMARY
- E-Control = statutory HKN issuer for gas | https://www.e-control.at/herkunftsnachweisdatenbank/faq | "Herkunftsnachweise werden für Strom, Gas und Wasserstoff ausgestellt ... (insbesondere §§ 63 ff. ElWG, §§ 81 ff. EAG, §§ 129 b ff. GWG)" and "Die österreichische Herkunftsnachweisdatenbank ist über den AIB-Hub mit den Registern anderer Länder verbunden." | PRIMARY
- Servicestelle Erneuerbare Gase | https://www.erneuerbaresgas.at/wissensdatenbank/biomethan/zertifizierung | "Alle in Österreich produzierten Gase, die durch das öffentliche Gasnetz transportiert werden, werden zu diesem Zweck mit einem HKN versehen ... Grüngaszertifikate sind rein national im §86 EAG geregelt ... werden in der HKN-Datenbank der zuständigen Stelle (E-Control) verwaltet." and "Ein Zertifikat, das über keinen gesetzlichen Rahmen verfügt ... ist das Certificate of Origin (CoO) ... Die HKNe werden jedoch von einer offiziell ernannten Stelle ausgestellt (E-Control in Österreich), wobei die CoO vom Biomethanregister ausgestellt wird." | PRIMARY-ish (government-funded service body, SECONDARY for law)
- Subsidised plants excluded from international GO trade at E-Control | E-Control FAQ | "Herkunftsnachweise, die aus geförderten Anlagen stammen, sind vom internationalen Transfer und Handel ausgeschlossen." | PRIMARY
- E-Control gas ex-domain cancellation: "Any ex-domain cancellations are not possible." (domain protocol, brief). 
- E-Control gas/H2 hub transfers suspended 28 Apr 2026, new gas HKN database live May 2026 | https://verticer.eu/en/news/ (25 Apr 2026) "E-Control will disable new gas/hydrogen transfers to/from AIB Hub starting on 28 April ... transitioning their gas/hydrogen activities to a new registry ... expect to connect it to the Hub by 18 May 2026"; OTS 3 Sep 2026 https://www.ots.at/presseaussendung/OTS_20260903_OTS0068/ "Mit Mai 2026 wurde eine neue Herkunftsnachweisdatenbank für Gas erfolgreich in Betrieb genommen." ~50 GWh gas HKN exported, one third each to LV, ES, CZ, small share to CH | PRIMARY/SECONDARY. Hub reconnection date not confirmed in a source I could read.
- Pronovo handles both Austrian registers | see CH.
- Direct AGCS <-> E-Control transfer: AGCS German page (old): "Die Schnittstellen zur Herkunftsnachweisdatenbank der Energieregulierungsbehörde E-Control sowie zum ... ERGaR CoO Scheme ... sind in Entwicklung" (https://www.biomethanregister.at/de/register/funktionsweise, undated, likely outdated). A search-engine summary of an energate article claims E-Control does not allow transfers between its HKN register and dena (not verified; paywalled) | SECONDARY, unverified.
- Energinet: AT AGCS no/no; GGCS<->AGCS yes/yes; dena<->AGCS yes; ERGaR stats: AT exports to DE through Q2 2024; none reported since (statistics 2025-26 do not name AT).
- AGCS partner list (https://www.biomethanregister.at/en/cooperation/european-market/ergar) names AT, DE, DK, NL, GB, SK, CH (no LT).
### Verdicts
- Item 5: Statutory GO issuer for Austrian biomethane = E-Control (EAG/GWG). AGCS issues the voluntary ERGaR CoO (a non-statutory biomethane certificate). An Austrian MWh can in principle sit in both systems; whether the same plant/MWh can be registered in both without double counting, and whether certificates can move AGCS<->E-Control, is NOT settled by any public source -> open. Do not claim one MWh moves via both hubs.
### Open questions
- Q: Can the same Austrian biomethane plant/injection be registered and issued in both AGCS and the E-Control HKN database, and is there any transfer/cancellation interface between them? | Ask: AGCS and E-Control (Herkunftsnachweisdatenbank team) | Contact: https://www.biomethanregister.at (Contact us); https://www.e-control.at/herkunftsnachweisdatenbank
- Q: Is the E-Control gas HKN database reconnected to the AIB Hub (planned 18 May 2026)? | Ask: E-Control | Contact: same
- Q: Does AGCS send to/receive from SPP-d (SK), Pronovo (CH), Amber Grid (LT)? Energinet says AT no/no. | Ask: AGCS | Contact: https://www.biomethanregister.at

## Item 4 — bilateral agreements still active?
- AGCS-dena (2016): ended, replaced by ERGaR Dec 2021 (AGCS page, PRIMARY).
- Energinet-dena (2017): no termination notice found; Energinet's current cross-border page describes only the ERGaR hub and ex-domain cancellation. INFERENCE: folded into ERGaR. Open question to Energinet below if desk needs certainty.
- GGCS: states non-ERGaR transfers "are not possible"; no bilaterals found for any of the 8. dena 2021 slide says earlier trade ran on "bilaterale Kooperationen und Stilllegungsnachweise" (past tense).
- Ex-domain cancellation remains the only non-hub route (DK allows it to non-ERGaR countries; Pronovo needs inter-registry agreements; E-Control and NL VertiCer prohibit it per brief).
- Q: Is the 2017 Energinet-dena bilateral formally terminated? | Ask: Energinet / dena | Contact: dena support@biogasregister.de

## 8x8 matrix (ERGaR hub only; rows = origin, columns = destination)
Legend: P possible (evidence), N not possible, Q open. "AIB" notes show an alternative non-ERGaR path where one exists; it does not change the ERGaR letter.

| from \ to | AT AGCS | DK | DE dena | SK | CH | GB | LT | NL |
|---|---|---|---|---|---|---|---|---|
| **AT AGCS** | - | N | P | Q | P | P | Q | N |
| **DK** | N | - | P | P | P | N | P | N |
| **DE dena** | P | N | - | Q | P | P | Q | N |
| **SK** | Q | P | P | - | Q | P | P | N |
| **CH Pronovo** | Q | Q | N | N | - | N | N | N |
| **GB GGCS** | P | N | P | N | P | - | N | N |
| **LT** | Q | P | P | P | Q | P | - | N |
| **NL VertiCer** | N | N | N | N | N | N | N | - |

Cell justifications (all cited in the registry sections above):
- AT->DK N: Energinet table "Austria - AGCS no / no". AT->DE P: dena and AGCS list each other; ERGaR stats show AT exports to DE (2022-Q2 2024). AT->SK Q: no source (SK slide lists only DE/DK out, DK in). AT->CH P: Pronovo FAQ says transfers "von und zu beiden österreichischen Registern" (caveat: Pronovo's ERGaR list omits AT; AIB path via E-Control also exists). AT->GB P: GGCS "Yes - you can import RGGOs from AGCS". AT->LT Q: no source (AIB path via E-Control exists since LT is AIB-gas). AT->NL N: NL left ERGaR 1 Jul 2026 (AIB path via E-Control exists).
- DK->AT N (Energinet). DK->DE P (Energinet "yes", dena lists DK, ERGaR stats Denmark main exporter). DK->SK P (Energinet yes; SPP-d slide: import from DK). DK->CH P (Energinet yes; Pronovo lists "Dänemark (Energinet)"). DK->GB N (Energinet no; GGCS cannot import from Energinet, third-country). DK->LT P (Energinet yes/yes; ERGaR Apr 2026). DK->NL N (Energinet no; NL out).
- DE->AT P (GGCS/AGCS/dena lists; AGCS-dena lane existed 2016 and under ERGaR since 2021). DE->DK N (Energinet "Imports from Dena to Denmark are not allowed"). DE->SK Q (dena lists SK partner, SPP-d slide shows only exports to DE). DE->CH P (Pronovo lists "Deutschland (Dena Bioregister)"). DE->GB P (GGCS "Yes - you can import RGGOs from DENA"). DE->LT Q (ERGaR says LT GOs can go to DE; reverse not stated). DE->NL N (NL not importing via ERGaR; left).
- SK->AT Q. SK->DK P (Energinet yes). SK->DE P (actual 42,869 MWh in 2025). SK->CH Q on ERGaR (SPP-d slide gives "Export do CH" only for AIB; Pronovo lists SK under AIB). SK->GB P (GGCS imports from SPP-d). SK->LT P (ERGaR Apr 2026). SK->NL N.
- CH->X: N where only the 2024 UVEK report ("Ein Export von Schweizer HKN ist zurzeit nicht möglich"), AIB "imports only" and ERGaR stats (CH as importer) speak; CH->DK Q because Energinet's table says Pronovo can send to DK (conflict); CH->AT Q because Pronovo FAQ says "von und zu" both Austrian registers.
- GB->AT P, GB->DE P (GGCS "Yes"; criteria DVS, 39-month validity). GB->DK N, GB->SK N, GB->LT N (GGCS: third-country refusal; Energinet no). GB->CH P only for waste/residue-label RGGOs. GB->NL N (GGCS refusal; NL left).
- LT->AT Q. LT->DK P, LT->DE P, LT->SK P (ERGaR 23 Apr 2026; Energinet yes). LT->CH Q (Pronovo lists neither). LT->GB P (GGCS "Yes - you can import RGGOs from Amber Grid"). LT->NL N.
- NL->all N: VertiCer exports via ERGaR ended 1 Jul 2026 (VertiCer FAQ; GGCS; Energinet "no/no"). Residual risk: stale pages (dena, AGCS) still list NL; confirm with VertiCer (open question).
- Destination NL column all N for same reason (no ERGaR import for NL; Energinet and GGCS say no).

## Searched but not found
- Energinet's own page on the 2017 dena agreement (JS-rendered; only snippet) and any termination notice.
- Any ERGaR matrix of accepted source registries (Scheme Rules v1.4 / v1.2 contain no list; participation agreement covers fees/liability).
- SPP-d web page listing ERGaR/AIB partners (site timed out); only operating rules and a May 2026 slide.
- Amber Grid operating rules / list of accepted ERGaR sources; Amber Grid statement on UK route.
- Pronovo statement on ERGaR export or on importing from LT/SK/AGCS; date of its FAQ.
- Any public source on AGCS <-> E-Control transfers, double registration of one Austrian plant, or E-Control gas AIB reconnection after 18 May 2026 (energate article paywalled; kompost-biogas pages did not load).
- AGCS-side acceptance list (AGCS page lists connected registries, not directions); AGCS terms PDF not retrieved.
- ERGaR 2025 Statistical Report (members only) and any Q2 2026 statistics (not yet published).
- Dutch letter to Parliament announcing the 1 Jul 2026 ERGaR export stop (only VertiCer's description).
