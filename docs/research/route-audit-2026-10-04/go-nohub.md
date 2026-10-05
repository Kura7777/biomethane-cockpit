# GO route, countries on neither hub — findings (accessed 2026-10-04)

Scope: PL, NO, IE, RO, GR, SI, HR, BG, LU, BE-Flanders, BE-Wallonia. Sections are appended as completed.

## Common hub facts (apply to all countries below)
### Facts
- AIB members page (Aug 2026): there is NO Polish AIB member at all; gas scheme members are only AT, BE-Brussels, CZ, EE, FI, FR, HU, IT, LV, LT, NL, PT, SK, ES, SE, CH | https://www.aib-net.org/facts/aib-member-countries-regions/aib-members | "AIB membership is not the same as Hub connection!" | PRIMARY
- AIB registries (hub-connected) table lists only electricity for Belgium-Flanders (Vlaamse Nutsregulator), Belgium-Wallonia (SPW Energie), Croatia (HROTE), Greece (DAPEEP), Ireland (SEMO), Luxembourg (ILR), Norway (Statnett), Slovenia (Agencija za energijo); nothing for PL, RO, BG | https://www.aib-net.org/registries | "Ireland / SEMO / Electricity", "Luxembourg / ILR / Electricity", "Norway / Statnett / Electricity" | PRIMARY
- ERGaR CoO scheme participants are only AT AGCS, DK Energinet, DE dena, SK SPP-d, CH Pronovo, GB GGCS, LT AmberGrid | https://www.ergar.org/ergar-schemes/ergar-coo-scheme/ | "Gas Clearing & Settlement AG ... Energinet ... dena Biogasregister ... SPP distribúcia ... Pronovo AG ... GGCS ... AmberGrid" | PRIMARY (fetched via summariser, list matches earlier research file)
- ERGaR membership (association, not hub participation) includes Towarowa Giełda Energii (PL), Gas Networks Ireland, Equinor (NO), gas.be (BE) | https://www.ergar.org/membership/our-members/ | gas.be: objective to "establish a biomethane registry in Belgium" | SECONDARY (summarised fetch)
- Observers in AIB: Gas Networks Ireland "Scheme Observer (Gas)"; ANRE Romania "Scheme Observer (Gas and Electricity)"; Hinicio (BE) "Observer to Gas Scheme"; VEKA Flanders "Scheme Observer (Electricity and Gas)"; SEDA Bulgaria "AIB member - Applicant of the Electricity Scheme Group" | https://www.aib-net.org/facts/aib-member-countries-regions/aib-members | quotes as given | PRIMARY
- AIB: only after hub connection can a domain import/export EECS GOs | same page | "Only when this is completed, EECS GOs from other AIB countries can be imported into that Domain, and the member can issue and export EECS GOs." | PRIMARY

## IE — Gas Networks Ireland (GNI) Renewable Gas Registry (manual pilot) → new registry Jan 2027
### Facts
- GNI is the appointed Issuing Body for renewable-gas GOs by S.I. 350/2022 (signed 12 Jul 2022) | https://www.gasnetworks.ie/network/biomethane/registry | "The Statutory Instrument number 350 of 2022 was signed into Republic of Ireland legislation on 12th July 2022" ; "Gas Networks Ireland has been appointed as the Issuing Body for Guarantees of Origin for Gas." | PRIMARY
- Registry live since 2020 as a manual Excel "pilot"; GNI issues certificates voluntarily "while awaiting appointment as the competent body" | https://www.gasnetworks.ie/network/biomethane/registry ; GNI/Gas Innovation Forum deck https://www.gasnetworks.ie/sites/default/files/2026-02/GIF-Green-Gas-Certification.pdf | "Gas Networks Ireland has commenced issuing renewable certificates on a voluntary basis, while awaiting appointment as the competent body" ; "The current 'Pilot' Registry is based on MS Excel." | PRIMARY
- CRU decision CRU202615 (24 Mar 2026) sets the supervisory framework; GNI registration requirements due by Sept 2026, pilot issuance ends after 31 Dec 2026, new registry no later than Jan 2027 | https://www.mhc.ie/latest/insights/new-supervisory-framework-for-guarantees-of-origin-for-renewable-gas ; https://www.algoodbody.com/insights-publications/cru-publishes-decision-paper-on-supervisory-framework-for-renewable-gas-guarantees-of-origin | "gGO certificates ... can be traded and exported to and imported from EU Member States." ; account holders may "request GNI to export or import gGOs to or from the national registries of other EU Member States, the EEA and other third countries that have an agreement in place with the EU." | SECONDARY (law-firm summaries; CRU PDF itself not retrieved)
- GNI is implementing new software incl. electronic import/export | https://www.gasnetworks.ie/network/biomethane/registry | "Gas Networks Ireland is now arranging to implement a new registry software system, to implement the CRU decision, including the electronic import and export of Guarantees of Origin." | PRIMARY
- Current pilot cannot connect to hubs | GIF deck p.14 | "while the Registry has an interim solution to cater for import/export of GO's, it cannot connect to hubs (AiB and ERGaR) or other Registries to facilitate imports/exports (as required under RED II)." ; plan: "Interfaces from GTMS to the Registry and from the Registry to AiB and ERGaR hubs." ; Go-Live Q1 2027 | PRIMARY
- GNI "Appointed to Board of ERGaR" (milestone list) and AIB "Scheme Observer (Gas)" | GIF deck p.18; https://www.aib-net.org/facts/aib-member-countries-regions/aib-members | PRIMARY
- Foreign certificates: pilot recognition only | gasnetworks.ie registry page | "Gas Networks Ireland aims to recognise mass-balance certificates from other European registries transferred to Ireland on a pilot basis. ... There is no standard procedure for this yet." | PRIMARY
- Past manual cross-border events | GIF deck p.18 | "1st Export of RG from ROI via Moffat VRF" (2023); "1st Import of RG from DK to count towards RTFO"; "1st Import of RG from GER to count towards RTFO" — mass-balance / RTFO deliveries logged manually, not hub GO transfers | PRIMARY (interpretation = INFERENCE)
- UK barred | MHC | "Trading with the UK is not permitted, reflecting the mutual non-recognition of renewable energy guarantees of origin between the EU and UK post-Brexit." | SECONDARY
- Sustainability certificate needed for gGO issue; also for imported gGOs once Directive 2024/1788 is transposed | algoodbody page | "Sustainability certification will also apply to imported gGOs once the Internal Gas Market Directive (Directive (EU) 2024/1788) has been transposed into Irish law." | SECONDARY
- Physical grid | gasnetworks.ie registry page | "Import of natural gas into Ireland occurs daily at the Moffat Interconnection Point. Therefore, the physical import of biomethane is also possible." | PRIMARY. IE grid is connected to the rest only via Scotland/GB; GB-continent link: see final physical-grid note.
### Verdicts
- EXPORT of GOs today: not possible as a routine/hub transfer (registry not connected to AIB/ERGaR; manual Excel pilot). Ad hoc manual export of mass-balance RG via Moffat has occurred. From Jan 2027 the framework allows export to EU/EEA registries; UK excluded.
- IMPORT of GOs today: not via hub. Manual pilot recognition of mass-balance certificates (DK, DE examples) for RTFO. From Jan 2027 intended from EU/EEA registries; UK excluded.
- App status suggestion: "not possible today as hub GO transfer; ad-hoc pilot only; planned Q1 2027".
### Open questions
- Q: Can a biomethane GO/PoS from DE, DK, NL etc. be imported into the GNI pilot registry today, with what procedure and which sustainability scheme? | Ask: Gas Networks Ireland Renewable Gas Registry | Contact: RGcertificates@gasnetworks.ie (AIB lists rngcertificates@gasnetworks.ie)
- Q: Will the new registry connect to AIB, ERGaR or both at go-live? | Ask: GNI | same

## NO — no renewable-gas GO registry (Statnett registry is electricity only)
### Facts
- Norwegian GO regulation scope is electricity | https://lovdata.no/dokument/LTI/forskrift/2007-12-14-1652 (FOR-2007-12-14-1652) | "Forskrift om opprinnelsesgarantier for produksjon av elektrisk energi" ; §1 "alle produsenter av elektrisk energi" | PRIMARY (the page I read is flagged as having an updated consolidated version; amendments not checked)
- AIB lists Norway/Statnett as electricity only | https://www.aib-net.org/registries | "Norway / Statnett / Electricity" | PRIMARY
- Miljødirektoratet ETS zero-counting rule | https://www.miljodirektoratet.no/ansvarsomrader/klima/klimakvoter/nulltelling/biogass-krav-fra-gassnett/ | "Dersom det utstedes opprinnelsesgarantier ("Guarantee of origin", forkortet "GO") i landet biogassen er produsert, skal operatøren kunne dokumentere at GO'ene for den innkjøpte biogassen er slettet." ; "Operatør må kunne bevise at operatør og biogassprodusent er koblet til samme gassnett" | PRIMARY (does not itself say a Norwegian gas GO is absent)
- Industry paper (Apr 2025): "EU er i prosess med å etablere et system for opprinnelsesgarantier for biogassmarkedet. Dette har også vært en diskusjon som bransjen har hatt med NVE og Statnett." ; "Norge ligger langt etter og bør implementere begge fornybardirektivene." ; a Biokraft-led pilot "for eksport av biogass" is mentioned | https://biogassnorge.no/wp-content/uploads/2025/04/Biogassplattformen.pdf | SECONDARY
- NORSUS (2021) says RED II Art. 19 extends GOs to gas and recommends a national register for liquid/gaseous fuels | https://norsus.no/wp-content/uploads/OR-32.21_-Opprinnelsesgarantier-for-biogass.pdf | SECONDARY, dated
- RED II not yet in the EEA Agreement as of Apr 2025 reporting | https://neitileu.no/aktuelt/opprinnelsesgarantiordningen | "ligger fornybardirektivet i EUs fjerde energipakke an til å bli tatt inn i EØS-avtalen" | SECONDARY (advocacy source); regjeringen.no Q&A page returned HTTP 403, not read
- Physical: no onshore biomethane link to the EU gas grid found; Norwegian gas system is offshore export pipelines | INFERENCE, not source-verified
### Verdicts
- EXPORT of GOs: not possible — no gas GO issuing body/registry or legal basis found in Norway.
- IMPORT of GOs: not possible as a GO transfer (no registry). Imported biogas for ETS is evidenced by invoice + PoS + deletion of origin GOs, plus same-gas-network test, which an unconnected grid cannot meet.
### Open questions
- Q: Is any gas GO scheme (law, regulation or Statnett/NVE registry module) in force or decided for biogas, and is the Biokraft pilot issuing/exporting certificates? | Ask: NVE (competent body for GOs) and Statnett | Contact: https://www.nve.no/ (contact page); Statnett GO address not located

## PL — Rejestr Gwarancji Pochodzenia (TGE) with URE as issuing authority
### Facts
- Biomethane GO exists in law: Art. 120 OZE Act lists biomethane GOs; issued by written request of the producer | Ustawa o OZE, consolidated text Dz.U. 2026 poz. 68, https://api.sejm.gov.pl/eli/acts/DU/2026/68/text.pdf | Art. 120 ust.1: "Gwarancja pochodzenia wytworzonych z odnawialnych źródeł energii ... 2) biometanu ..." ; Art. 121 ust.1 "Gwarancje pochodzenia wydaje się na pisemny wniosek wytwórcy energii elektrycznej, biometanu, ..." | PRIMARY. In force since 1 Jan 2024 per secondary reports (INFERENCE from law-firm summaries)
- Registry operator: commodity exchange | same, Art. 124 ust.1 | "Rejestr gwarancji pochodzenia prowadzi podmiot prowadzący: 1) giełdę towarową ..." ; TGE Regulamin RGP (valid 16.12.2025) https://www.tge.pl/pub/TGE/files/RGP/2025/Regulamin_Rejestru_Gwarancji_Pochodzenia.pdf defines GO for "energii elektrycznej, biometanu, ciepła albo chłodu, wodoru odnawialnego, biogazu albo biogazu rolniczego" and has a fee table "Załącznik nr 1d Tabela Opłat Rejestrowych gwarancji pochodzenia biometanu" | PRIMARY
- Recognition of foreign GOs (import legal basis) | Art. 123 ust.1 | "Prezes URE, na pisemny wniosek podmiotu, uznaje gwarancję pochodzenia wydaną w innym państwie członkowskim Unii Europejskiej, Konfederacji Szwajcarskiej lub państwie członkowskim Europejskiego Porozumienia o Wolnym Handlu (EFTA) – stronie umowy o Europejskim Obszarze Gospodarczym lub państwie członkowskim Wspólnoty Energetycznej." ; ust.5 "Uznanie gwarancji pochodzenia ... jest warunkiem wprowadzenia do rejestru gwarancji pochodzenia" ; ust.2 refusal only for doubts on authenticity/reliability | PRIMARY
- TGE fee line for foreign biomethane GOs: "Opłata za wpis Gwarancji Pochodzenia biometanu wydanej w innym państwie uznanej przez Prezesa URE – 0,50 PLN/MWh" | TGE Regulamin, Załącznik 1d | PRIMARY (shows import entry is anticipated; not proof it has been used)
- Law envisages AIB: Art. 123 ust.6 "Prezes URE może przystąpić do stowarzyszenia Association of Issuing Bodies" | OZE Act | PRIMARY. But AIB members page lists no Polish member (see common section) -> not joined as of Aug 2026.
- TGE joined ERGaR as association member (June 2024), not as CoO hub participant | https://www.tge.pl/pub/TGE/komunikaty/2024/06/2024.06.10_tge%20dolaczayla%20do%20ergar.pdf | "TGE zyska merytoryczne wsparcie niezbędne dla wypracowania rozwiązań dotyczących gwarancji pochodzenia dla biometanu" ; ERGaR CoO participant list excludes PL | PRIMARY
- Biomethane GO transferability limits: GO for gas fed to a vehicle-fuelling installation "nie może zostać przeniesiona i podlega niezwłocznemu umorzeniu" (Art. 120 ust.9); GO issue not dependent on support (ust.4) | OZE Act | PRIMARY
- No export mechanism found: the Act contains no rule on transferring Polish GOs to foreign registries/hubs; no ex-domain rule found | INFERENCE (absence in the Act text; TGE Regulamin has no export/AIB/ERGaR clause: grep of "eksport|AIB|ERGaR" returned none)
- Physical grid: GAZ-SYSTEM grid is interconnected with DE, CZ, SK, LT (GIPL) and UA | not yet source-verified in this pass (see end note)
### Verdicts
- EXPORT of GOs: not possible today — no hub connection (not AIB, not ERGaR CoO), no bilateral/ex-domain mechanism found.
- IMPORT of GOs: legal basis exists (Art. 123 recognition by URE President, registry entry fee defined) but no electronic transfer channel to any foreign registry exists; manual recognition on application is the only route. Whether any biomethane GO has actually been recognised/imported is UNKNOWN.
### Open questions
- Q: Has URE recognised any foreign biomethane GO under Art. 123, and what proof/transfer format does URE/TGE accept (e.g. ERGaR/AIB cancellation statement)? | Ask: Urząd Regulacji Energetyki and TGE RGP | Contact: press@tge.pl (media) / TGE contact via https://www.tge.pl/; URE https://www.ure.gov.pl/ (contact page)
- Q: Are Polish biomethane GOs already being issued, and is any export/AIB-ERGaR connection scheduled? | Ask: URE / TGE | same

## RO — ANRE (planned single GO registry; gas GO regulation due)
### Facts
- Legal framework (OUG 59/2025, MO Part I no. 1035, 7 Nov 2025) makes ANRE the issuing entity and orders gas GO rules | https://lege5.ro/Gratuit/ge3tgmrsgi3tk/ordonanta-de-urgenta-nr-59-2025-pentru-modificarea-si-completarea-unor-acte-normative-in-domeniul-energiei | Art. 19(3)b "Până la data de 30 septembrie 2026, ANRE elaborează şi aprobă prin ordin al preşedintelui ANRE ... Regulamentul de emitere şi urmărire a garanţiilor de origine pentru gaze din surse regenerabile" | PRIMARY
- AIB: ANRE may sign agreements with AIB for cross-border electronic transfers; to apply as observer by 30 Nov 2025; calendar for gradual opening of a mutually recognised EU GO market by 1 Jan 2027 | same | "ANRE ... poate încheia acorduri cu ... Asociaţia Organismelor Emitente ... AIB în vederea armonizării sistemelor de garanţii de origine şi a efectuării de transferuri transfrontaliere în format electronic." ; "Până la data de 30 noiembrie 2025, ANRE întreprinde demersurile necesare pentru înscrierea în ... AIB, ca membru observator." ; "...recunoscut reciproc la nivelul Uniunii Europene până la data de 1 ianuarie 2027." | PRIMARY
- AIB now lists ANRE Romania as "Scheme Observer (Gas and Electricity)" | https://www.aib-net.org/facts/aib-member-countries-regions/aib-members | PRIMARY (observer = no transfers)
- Recognition: ANRE recognises GOs issued by other EU Member States, only for the information in the Art.19 content list and the disclosure purpose; refusal only on well-founded accuracy grounds | OUG 59/2025 Art. 19 alin. (19)-(20) | "ANRE recunoaşte garanţiile de origine emise de autorităţile altor state membre ale UE, exclusiv în ceea ce priveşte informaţiile prevăzute la alin. (15) şi numai în scopul declarat la alin. (1)." | PRIMARY (paragraph sits in Art. 19 which covers all carriers incl. gas; whether operative before the gas regulation exists is INFERENCE)
- Today's registry is electricity-only: anre.ro lists "Garanții de origine E-SRE" holder lists only; no gas GO list or biomethane page found | https://anre.ro/surse-regenerabile/ | PRIMARY (absence)
- EY (Feb 2026): "Aderarea deplină la AIB va permite transferul transfrontalier"; currently no cross-border trading | https://www.ey.com/ro_ro/newsroom/2026/02/garan_iile-de-origine-in-romania--ce-aduce-oug-59-2025 | SECONDARY
- Not found: whether the 30 Sep 2026 gas GO regulation was actually adopted (nothing published in my searches as of 2026-10-04).
- Physical: Transgaz grid has interconnectors to HU, BG, UA, MD | not source-verified in this pass (see end note)
### Verdicts
- EXPORT of GOs: not possible today — no gas GO registry in operation; AIB observer only; no bilateral mechanism.
- IMPORT of GOs: not possible today — no gas GO register/regulation yet; legal recognition clause exists on paper; target market opening 1 Jan 2027.
### Open questions
- Q: Was the ANRE president order approving the "Regulament de emitere şi urmărire a garanţiilor de origine pentru gaze din surse regenerabile" adopted by 30 Sep 2026, and when does the gas registry open to biomethane? | Ask: ANRE | Contact: https://anre.ro/ (contact page)

## GR — DAPEEP (Biomethane GO register in the GO Information System)
### Facts
- Law 5215/2025 (FEK A 116/04.07.2025) Art. 19: biomethane origin proven by GOs issued by the issuing body of Art. 16 of Law 3468/2006 (DAPEEP) | https://drive.google.com/file/d/1UbgpK32Lz5ENv_xZqQP2Y_FxRy_GKPjg/view (copy of FEK; ypen.gov.gr link was dead) | "Η προέλευση του παραγόμενου βιομεθανίου ... αποδεικνύεται με τις εγγυήσεις προέλευσης, οι οποίες εκδίδονται από τον φορέα έκδοσης του άρθρου 16 του ν. 3468/2006" ; "Οι εγγυήσεις προέλευσης είναι μεταβιβάσιμες ... στο Πληροφοριακό Σύστημα Εγγυήσεων Προέλευσης ... στο οποίο τηρείται το Μητρώο Εγγυήσεων Προέλευσης Βιομεθανίου." ; "εκδίδονται για τις μονάδες βιομεθανίου που διαθέτουν εν ισχύ άδεια λειτουργίας." | PRIMARY
- Article 19 says nothing about foreign GOs, import/export, AIB or ERGaR | same | (absence in text) | PRIMARY
- AIB: Greece / DAPEEP listed for Electricity only; DAPEEP is "Full member of the Electricity Scheme Group" | https://www.aib-net.org/registries ; members page | PRIMARY
- Whether any Greek biomethane plant is licensed/injecting: not established (Law 5215/2025 only created the support/GO framework in July 2025) | INFERENCE
- Physical: Greek national gas system connects to BG (IGB), TR, and Italy via TAP; not source-verified in this pass
### Verdicts
- EXPORT of GOs: not possible — no AIB/ERGaR gas connection, no mechanism in law.
- IMPORT of GOs: not possible — no recognition clause for gas GOs found in Art. 19 (reference to Law 3468/2006 Arts 15-18B may import the electricity-GO recognition rules — UNVERIFIED), no hub.
### Open questions
- Q: Does DAPEEP's biomethane GO register accept/issue cross-border GOs or recognise foreign GOs (Law 3468/2006 Art. 15-18B applied by analogy)? Is the biomethane register live? | Ask: DAPEEP SA (Guarantees of Origin department) | Contact: https://www.dapeep.gr/ (contact page, not verified)

## LU — ILR (Institut Luxembourgeois de Régulation)
### Facts
- A legal gas-GO scheme EXISTS: Grand-Ducal Regulation of 4 Nov 2022 (Mémorial A 542, 7 Nov 2022) inserts "Chapitre Ibis – Garantie d'origine" (Art. 11ter) into the RGD of 15 Dec 2011 on biogas production, remuneration and marketing | https://data.legilux.public.lu/filestore/eli/etat/leg/rgd/2022/11/04/a542/jo/fr/pdfa/eli-etat-leg-rgd-2022-11-04-a542-jo-fr-pdfa.pdf | "Il est établi un système de garantie d'origine pour le gaz produit à partir de sources d'énergie renouvelables." ; "L'autorité de régulation établit et délivre, sur demande d'un producteur d'énergie utilisant des sources d'énergie renouvelables, la garantie d'origine." | PRIMARY
- State ownership of GOs for remunerated gas: "Pour le gaz produit à partir de sources d'énergie renouvelables et rémunéré en vertu du présent règlement, le ministre peut demander à l'autorité de régulation de faire établir des garanties d'origine." ; "Les garanties d'origine restent la propriété de l'État, qui peut décider de les valoriser." | same | PRIMARY (so supported biogas GOs belong to the State, not the producer)
- Electronic mechanism: "L'autorité de régulation supervise le transfert et l'annulation des garanties d'origine et à cette fin, met en place un mécanisme qui permet d'émettre, de transférer et d'annuler électroniquement les garanties d'origine." | same | PRIMARY
- Foreign GOs (import recognition): "Sauf en cas de doutes fondés quant à son exactitude, sa fiabilité ou sa véracité, une garantie d'origine délivrée par un autre État membre ou par un organisme compétent d'un autre État membre de l'Union européenne, est automatiquement reconnue par l'autorité de régulation." ; third-country GOs not recognised absent an EU agreement | same | PRIMARY
- AIB domain protocol (Release 2023) confirms ILR "is appointed by Grand-Ducal Regulation of 4 November 2022 issuing body for gas, heating and cooling GOs" but the scheme in AIB is electricity-only: "There is no European and no national legal framework about disclosure of energy sources in the other energy carriers: gas, heating and cooling. The present section refers to electricity only." | AIB-2023-DPLU-ILR Luxembourg Domain Protocol (local copy C:\Dev\route-audit\_pdf\AIB-2023-DPLU-ILR_Luxembourg_Domain_Protocol_Luxembourg_25052023.pdf), sections B.3.1 and C.3 | PRIMARY
- Ex-domain (electricity protocol): "Cancellation in Domain Luxembourg for usage in another Domain is allowed." ; ex-domain into LU "only when it is not technically possible to transfer and cancel in ILR GO registry" (C.3.3) | same | PRIMARY, electricity only
- AIB hub: Luxembourg / ILR listed "Electricity" only | https://www.aib-net.org/registries ; members page "ILR – Full member of the Electricity Scheme Group" | PRIMARY. ILR not in ERGaR CoO participants.
- ILR registry software is Grexel (electricity registry) | https://www.ilr.lu/secteurs-activites/energie/electricite/energie-renouvelable-partage/garanties-origine/ | page covers electricity GOs and AIB participation only; no gas GO text | PRIMARY (absence)
- ILR 2025 activity report (Mar 2026) covers biogas remuneration/injection data (section 4.3.2) but contains no mention of gas guarantees of origin (grep of "garantie d'origine", "biométhane" found only biogas remuneration lines) | https://www.ilr.lu/wp-content/uploads/publication/ILR_Rapport_Activite_digital_2026_et_RF_20260320.pdf | PRIMARY (absence; shows gas GO scheme is not visibly operating)
- ILR runs a register of biogas plants (condition for remuneration) | https://www.ilr.lu/publications/registre-des-centrales-de-biogaz/ | SECONDARY (search snippet)
- Physical grid: Creos transmission grid interconnected with BE, DE, FR | not source-verified in this pass (see end note)
### Verdicts
- EXPORT of GOs: not possible today — legal gas-GO basis exists (and mechanism for electronic transfer is mandated) but no AIB-gas/ERGaR connection; no operating gas GO registry evidenced; supported gas GOs are State property.
- IMPORT of GOs: not possible as a transfer today (no gas registry/hub). Legal recognition of EU-issued gas GOs exists "automatically" (RGD Art. 11ter) — status of any practical procedure UNKNOWN.
- Answer to the specific question "is there a gas registry in Luxembourg?": a gas GO scheme is created in law (ILR as issuing body, Nov 2022) but no evidence that a gas module is operational or connected anywhere.
### Open questions
- Q: Is ILR's registry already issuing/accepting gas (biomethane) GOs, and has any biomethane GO been issued, imported or exported? Who may hold GOs for State-remunerated biogas? | Ask: ILR (Institut Luxembourgeois de Régulation) | Contact: https://www.ilr.lu/ (contact page; direct email not located)

## SI — Agencija za energijo (AGEN-RS) as issuing body, Borzen as registry administrator
### Facts
- Law allows gas GOs: ZSROVE Art. 10-12 (potrdila o izvoru): content must state whether the certificate concerns "električno energijo, plin (vključno z vodikom), ali toploto" (Art. 11(1)a); the agency issues them on request of producers whose device has a declaration, including devices "za proizvodnjo plinastih goriv iz obnovljivih virov energije"; gas system operator reports the injected data (Art. 10(5)) | ZSROVE text https://faolex.fao.org/docs/pdf/slv206775.pdf (base text, 2021; 2024 amendment ZSROVE-B not read) | "Agenciji sporočajo podatke ... proizvajalec plinastih goriv iz obnovljivih virov energije in vodika za prodajo; operater sistema, na katerega je priključena naprava za proizvodnjo plina iz obnovljivih virov energije, za katere se izdaja potrdilo o izvoru" | PRIMARY
- Export is in the law: "Potrdilo o izvoru se lahko prenese s prenosom na račun novega imetnika v registru potrdil o izvoru ali z izvozom potrdil na imetnika v tujini." (Art. 10(3)); register must track "potrdilih o izvoru, ki so bila izvožena iz Republike Slovenije in uvožena v Republiko Slovenijo" (Art. 13(2)e) | same | PRIMARY
- Recognition of foreign GOs: Art. 12(1) "Potrdilo o izvoru, ki ga izda pristojni izdajatelj v drugi državi članici EU ... ima v Republiki Sloveniji enako dokazno moč ... V Republiki Sloveniji se priznavajo potrdila o izvoru, ki jih izda druga država članica, izključno za dokazovanje deleža oziroma količine energije iz obnovljivih virov v naboru energetskih virov lastnika potrdil o izvoru." ; Art. 12(5) agency and registry operator must ensure cooperation/connectivity with other registers | same | PRIMARY
- BUT the operating registry is electricity-only: AIB domain protocol v4/Rel.1 (25 Mar 2026), B.4.1 issuance scope lists Electricity sources only (hydro, wind, solar, geothermal, biomass, biogas, landfill/sewage gas, fossil, nuclear) — biogas only as an electricity source; "Conversion of electricity to gas and vice versa is considered outside the scope of the national legal framework, and of this Domain Protocol" (E.6.1) | AIB-2026-DPSI_Domain_Protocol_Slovenia (local: C:\Dev\route-audit\_pdf\AIB-2026-DPSI_Domain_Protocol_Slovenia_v5_20260306_0.pdf) | PRIMARY
- Registry operation: "The EECS Registration Database is operated by AGEN-RS and administered by the Slovenian Market Operator, Borzen, d.o.o." (poi.borzen.si) | same, B.3.1 | PRIMARY
- AIB: AGEN-RS "Full member of the Electricity Scheme Group"; registries table: Slovenia / Agencija za energijo / Electricity | https://www.aib-net.org/registries | PRIMARY. Not an ERGaR CoO participant.
- Ex-domain cancellation allowed (electricity) "exclusively for the purpose of proving the share or amount of energy from renewable sources in the energy mix of the holder" — Article 12 ZSROVE | DP Slovenia C.3 | PRIMARY, electricity only
- No page on agen-rs.si or Borzen about biomethane GOs located (agen-rs.si returned connection refused on the biogas page; search found nothing) | INFERENCE: absence
- Physical grid: Slovenian transmission system (Plinovodi) interconnected with AT, IT, HR (and HU); not source-verified in this pass
### Verdicts
- EXPORT of GOs for gas: not possible today — no gas GO issuance in the operating registry (AIB protocol electricity-only), no gas hub link. Law would allow export once a gas module exists.
- IMPORT of GOs for gas: not possible today as a transfer (no gas account type). Law recognises EU GOs for disclosure only; no gas disclosure/registry evidenced.
### Open questions
- Q: Is a gas (biomethane) GO module live or planned in the Slovenian GO registry (poi.borzen.si) and will it join AIB or ERGaR? | Ask: Agencija za energijo (AGEN-RS) and Borzen | Contact: https://www.agen-rs.si/ (contact page; email not located) ; Borzen https://borzen.si/en-us/ (contact page)

## GR — addendum from AIB domain protocol
### Facts
- DAPEEP's AIB protocol (20 Nov 2024) describes it as "the only known Issuing Body in this Domain ... responsible for Guarantees of Origin in Greece, for gas, hydrogen and heating/cooling for renewable energy sources", but the issuance-scope table lists only Electricity (Hydro, Solar, Wind, Biomass, Fossil) | AIB-2024-DPGR-DAPEEP Greece Domain Protocol (local: C:\Dev\route-audit\_pdf\AIB-2024-DPGR-DAPEEP_Greece_Domain_Protocol_final_-_clean.pdf) B.3 / B.4.1 | PRIMARY
- Ex-domain (electricity): "Ex domain cancellation is allowed to be performed only in exceptional cases when the transfer of EECS GOs is not technically feasible through the HUB and only under the terms of a cancellation agreement" (E.12.6) | same | PRIMARY, electricity only

## HR — HROTE (Croatian Energy Market Operator)
### Facts
- Gas GOs are in the law: Uredba o sustavu jamstva podrijetla energije, NN 28/2023 (9–10 Mar 2023) allows GOs for "plin, uključujući biometan, vodik, niskougljični vodik" | https://zakon.hr/c/podzakonski-propis/56638/nn-28-2023-(10.3.2023.),-uredba-o-sustavu-jamstva-podrijetla-energije ; HROTE press note https://www.hrote.hr/donesena-nova-uredba-o-sustavu-jamstva-podrijetla-energije | "omogućava izdavanje jamstava podrijetla energije, osim za električnu energiju ... i za plin dobiven iz obnovljivih izvora energije, uključujući biometan, vodik i niskougljični vodik" | PRIMARY
- Issuer: "Tijelo nadležno za izdavanje jamstva podrijetla energije u Republici Hrvatskoj je HRVATSKI OPERATOR TRŽIŠTA ENERGIJE d.o.o." (Uredba art. on registry) | zakon.hr text | PRIMARY. Eligible plant: "proizvodno postrojenje sa statusom proizvođača biometana iz obnovljivih izvora energije"
- Cross-border transfer is allowed in law: Art. 12(1) "Jamstvo o podrijetlu energije može se prenositi, neovisno o energiji na koju se odnosi između korisnika registra unutar registra i između korisnika registra i korisnika registara drugih država koja vode tijela za izdavanje jamstva podrijetla u tim državama" ("prijenos" defined as electronic transfer to registries of other states) | same | PRIMARY
- Recognition: Art. 7(1) "Jamstvo podrijetla energije izdano u drugoj državi članici Europske unije ili ugovornoj strani Energetske zajednice priznaje se, za potrebe dokazivanja udjela primarnih izvora energije prema krajnjim kupcima u Republici Hrvatskoj ... ako se izdaje u skladu s odredbama ove Uredbe"; third-country GOs only with an EU agreement and direct import/export (Art. 7(2)) | same | PRIMARY
- Hub reality: HROTE is AIB "Full member of the Electricity Scheme Group" only; AIB registries table: Croatia / HROTE / Electricity; AIB protocol (2024) issuance table is electricity only; ex-domain cancellation (electricity) allowed "when it is not technically possible to export EECS GOs to the cancelling Domain ... an agreement between HROTE and the concerned Electricity Scheme Member" (E.9.9) | https://www.aib-net.org/registries ; AIB-2024-DPHR-HROTE Croatia Domain Protocol (local _pdf folder) | PRIMARY
- No evidence found that HROTE operates a gas GO module or has issued biomethane GOs | INFERENCE (absence in AIB protocol, AIB hub table and ERGaR participants)
- Physical grid: Plinacro transmission grid interconnected with SI, HU (and LNG Krk terminal) | not source-verified in this pass
### Verdicts
- EXPORT of GOs: not possible today — legal basis for transfers to other states' registries exists, but no gas hub connection (AIB electricity only; not in ERGaR) and no evidence of an operating gas module.
- IMPORT of GOs: not possible today as a transfer; legal recognition of EU GOs for disclosure exists.
### Open questions
- Q: Does HROTE's register already support biomethane GOs (accounts, issuance), and is any AIB-gas/ERGaR connection planned? | Ask: HROTE | Contact: https://www.hrote.hr/ (contact page; email not located)

## BG — Sustainable Energy Development Agency (SEDA/АУЕР) single electronic GO register
### Facts
- Ordinance No. Е-РД-04-2 of 2 April 2024 (State Gazette 32/9.4.2024) covers GOs for "електрическа енергия, топлинна енергия и енергия за охлаждане от възобновяеми източници, биогаз и зелен водород" and establishes a single register run by SEDA | https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=211900 | Art. 1(2) "издаване, прехвърляне и отмяна на гаранциите за произход на електрическа енергия, топлинна енергия и енергия за охлаждане от възобновяеми източници, биогаз и зелен водород" | PRIMARY. Note: wording says "biogas" (not "biomethane"); producer measurement protocols may come from "оператора на газопреносната или газоразпределителната мрежа" (gas grid operator), which implies grid-injected gas
- Transfers to other states: Art. 11(6) "Гаранциите по ал. 5 могат да се прехвърлят към регистър на друга държава членка или краен клиент в друга държава членка." | same | PRIMARY
- Recognition of foreign GOs: Art. 22 "Признаването на гаранция за произход ... издадена в друга държава – членка на Европейския съюз, или трета държава по чл. 19, ал. 3 – член на Асоциацията на издаващите органи, се извършва чрез автоматично вписване в Регистъра след електронна комуникация между регистрите на двете държави по определен протокол." | same | PRIMARY
- Secondary summary of the same ordinance: "the guarantees of origin can also be transferred to a respective register of another EU member state" | https://cms.law/en/bgr/legal-updates/bulgaria-passes-ordinance-offering-international-trade-with-guarantees-of-origin | SECONDARY
- Hub reality: SEDA is "AIB member - Applicant of the Electricity Scheme Group" (electricity only); not on AIB hub table; not an ERGaR CoO participant | https://www.aib-net.org/facts/aib-member-countries-regions/aib-members | PRIMARY
- No evidence of any gas/biogas GO actually issued or of Bulgarian biomethane injection | INFERENCE (absence)
- Physical grid: Bulgartransgaz grid connects to RO, GR (IGB), TR, RS (new), and MK/UA indirectly; not source-verified in this pass
### Verdicts
- EXPORT of GOs for gas: not possible today — SEDA is only an electricity applicant at AIB; no ERGaR link; the ordinance allows transfers to another state's register in principle but no connected gas registry exists to receive them.
- IMPORT of GOs for gas: not possible today as a transfer; recognition clause exists (automatic only via AIB-member registers).
### Open questions
- Q: Has SEDA issued any biogas/biomethane GO and does the register support a gas carrier and cross-border transfers? | Ask: Sustainable Energy Development Agency (АУЕР) | Contact: https://seea.government.bg/ (contact page; email not located)

## BE-Flanders — VREG (issuing body), Fluxys (production registrar for gas)
### Facts
- Flanders issues national gas GOs ("national GOs for gases from renewable energy sources"; "National gas GOs are issued for the net amount of gas injected into a gas grid with multiple customers ... Fluxys is the Production Registrar ... VREG issues the required number of GOs on the account of the PD owner via the Registry") | AIB-2024-DPBEF VREG Flanders Domain Protocol, B.1.6 and C.6.3 (local: C:\Dev\route-audit\_pdf\AIB-2024-DPBEF_Domain_Protocol_Clean_Final.pdf) | PRIMARY
- They are NOT EECS GOs: "Currently these national GOs are not compatible with the EECS system, and hence cannot be traded over the AIB hub." | same, B.1.6 ; table footnote "(*) Non-EECS certificates may not be transferred over the AIB hub." | PRIMARY
- Market context: "No contracts for green gas currently exist. The limited amount of biomethane produced and injected within the Flemish Region is consumed by larger customers, with GOs as a proof that double counting is avoided." | same, C.1 | PRIMARY
- Green gas GO application goes via Fluxys; GOs tradeable on VREG platform and usable once to claim gas consumed elsewhere | https://www.vlaanderen.be/bouwen-wonen-en-energie/groene-energie/garantie-van-oorsprong (summarised fetch) ; search summary of VREG pages | SECONDARY
- AIB hub table: Belgium-Flanders / Vlaamse Nutsregulator / Electricity only; VEKA "Scheme Observer (Electricity and Gas)"; Hinicio "Observer to Gas Scheme" | https://www.aib-net.org/registries ; members page | PRIMARY
- ERGaR: gas.be (association of Belgian gas system operators) is a member with the objective "to establish a biomethane registry in Belgium"; Fluxys listed as grid operator participant; no Belgian registry among the 7 CoO participants | https://www.ergar.org/membership/our-members/ ; https://www.ergar.org/ergar-schemes/ergar-coo-scheme/ | SECONDARY/PRIMARY
- Ex-domain (electricity): allowed "only in case it is impossible to transfer GOs electronically for technical reasons, and in case of urgency towards a legal deadline, and on the condition that the importing Issuing Body agrees" (C.3.3) | DPBEF | PRIMARY, applies to EECS electricity GOs, not national gas GOs
- Physical grid: Fluxys Belgium is interconnected with NL, DE, FR, LU and GB (Zeebrugge, IUK) | not source-verified in this pass
### Verdicts
- EXPORT of GOs: not possible — Flemish gas GOs are non-EECS national GOs which "cannot be traded over the AIB hub"; Flanders is not connected to ERGaR; no bilateral link found.
- IMPORT of GOs: not possible as a GO transfer (no gas hub). Whether Flemish disclosure accepts foreign gas GOs by ex-domain cancellation is not stated for gas in the protocol (UNVERIFIED).
### Open questions
- Q: Can a foreign biomethane GO or ERGaR/AIB certificate be cancelled or recognised in Flanders (disclosure or Energy Decree purposes), and is a Belgian ERGaR connection planned? | Ask: VREG (Vlaamse Nutsregulator) and Fluxys | Contact: https://www.vreg.be/ (contact page); info.transport@fluxys.com (given in protocol for production-registrar disputes)

## BE-Wallonia — SPW Energie (issuing body), CWaPE (regulator)
### Facts
- Wallonia issues a NATIONAL (non-EECS) biomethane GO: "National GO (non-EECS): Biomethane injected into the network in Wallonia. Can only be used to prove the origin of gas in a cogeneration plant for support or for ETS" | AIB-2024 Walloon Domain Protocol v1.5 (20 Jun 2024), B.1 (local: C:\Dev\route-audit\_pdf\AIB-2024-ESG-04-02-BEW-SPW-Domain_Protocol_FINAL.pdf) | PRIMARY
- "Non-EECS certificates may not be transferred over the AIB hub." | same | PRIMARY
- Domestic use limited by law: "The biomethane GO can be traded to cogeneration plant owners of which upon cancellation increase support (green certificates rates). (AGW 23 décembre 2010 and AGW 29 mars 2018)"; "The cancellation can also be done for ETS to prove the use of green gas for a cogeneration plant in Wallonia." (C.6.1) | same | PRIMARY
- Ex-domain: "Ex-domain Cancellations for EECS Certificates are not performed, except if an ex-domain Cancellation Agreement has been signed with another Competent Authority of the European Economic Area." ; "Ex-domain cancellations for non EECS Certificates may be performed if transferring is impossible for technical reasons and with the agreement of the destination issuing body." (C.3.5.1–C.3.5.2); list of agreements in Annex 6 (not checked) | same | PRIMARY
- AIB hub table: Belgium-Wallonia / SPW Energie / Electricity only | https://www.aib-net.org/registries | PRIMARY
- Not in ERGaR participants (see common section)
- Physical grid: Walloon grids (Fluxys/ORES/RESA) are part of the Belgian system interconnected with NL, DE, FR, LU, GB | not source-verified in this pass
### Verdicts
- EXPORT of GOs: not possible — domestic non-EECS certificate usable only in Walloon cogeneration support/ETS; barred from AIB hub; no ERGaR link. Only theoretical route: ex-domain cancellation by agreement with a destination issuing body (for non-EECS "if transferring is impossible for technical reasons") — no agreement found.
- IMPORT of GOs: not possible — no hub; no recognition route for foreign gas GOs found in the protocol.
### Open questions
- Q: Are there ex-domain cancellation agreements (Annex 6) for biomethane GOs, and can foreign biomethane GOs/PoS be used to prove green gas for Walloon cogeneration support? | Ask: SPW Energie / CWaPE | Contact: https://www.cwape.be/ (contact page; email not located)

## Physical gas-grid connectivity (end note; relevant to the later PoS/mass-balance route)
### Facts (secondary web summaries unless stated; no raw TSO page was saved)
- IE: grid fed via Moffat (Scotland) — PRIMARY quote under IE above. GB is bi-directionally connected to the continent: IUK Bacton–Zeebrugge and BBL Bacton–Balgzand/Den Helder | https://fluxys.com/en/company/interconnector-uk ; https://www.bblcompany.com/about-bbl ; search summary "three interconnectors ... IUK ... BBL" | SECONDARY. So IE is physically linked to BE/NL only through GB; EU-UK mutual non-recognition of GOs (CRU framework bars UK trade) is a separate legal block.
- PL: interconnections with DE, CZ, SK, LT, UA, DK (Baltic Pipe) | https://www.gaz-system.pl/en/for-customers/benefitting-from-transport-routes-across-poland.html and TYNDP search result | "Poland has cross-border gas interconnections with Denmark, Germany, the Czech Republic, Slovakia, Ukraine and Lithuania." | SECONDARY (search summary)
- RO: seven cross-border points: UA (3), HU (Szeged–Arad–Csanádpalota), MD (Iași–Ungheni), BG (Giurgiu–Ruse; Kardam–Negru Vodă) | https://transgaz.ro/en/activities/nts-interconnection | SECONDARY (search summary of Transgaz page)
- GR/BG: IGB links DESFA/TAP at Komotini with Bulgartransgaz at Stara Zagora (182 km) | search summary of ICGB sources | SECONDARY; Bulgaria–Romania links as above
- SI/HR: Rogatec (SI–HR) interconnection; Murfeld (AT)–Cersak (SI); HR–HU at Donji Miholjac/Drávaszerdahely | seenews / gem.wiki / balkangreenenergynews search results | SECONDARY
- BE (Flanders and Wallonia share the federal Fluxys grid): "interconnection points with all adjacent markets: UK, France, The Netherlands, Germany and Luxembourg" | https://fluxys.com/en/natural-gas-and-biomethane/supplying-europe/belgium/transmission-belgium | SECONDARY (search summary)
- LU: "Luxembourg is connected to the natural gas transport networks of Germany, Belgium and France"; BE–LU single market area (BeLux) since 1 Jun 2020 | Wikipedia Creos; enerdata; balansys.eu | SECONDARY
- NO: offshore export pipelines only; no verified onshore link of a biomethane network to the EU grid | INFERENCE — not checked
- CH note requested in task (connected via DE/FR/IT) was not in scope of this file and was not researched here.
### Verdict
- Mass-balance route is physically possible (same interconnected EU grid) for PL, RO, GR, BG, SI, HR, LU, BE; for IE only via GB (physical, but UK is outside the EU legal framework: CRU bars UK gGO trade); NO not established.

## Summary table (GO route, all countries on neither hub)
| Country | Gas GO registry exists? | AIB gas / ERGaR | Export GOs today | Import GOs today |
|---|---|---|---|---|
| PL | Yes in law (OZE Act Art. 120–125, since 1 Jan 2024; TGE register; URE issues/recognises) | No AIB member; TGE only ERGaR association member | Not possible | Legal recognition (Art. 123) but no transfer channel; use unknown |
| NO | No (Statnett = electricity only) | None | Not possible | Not possible |
| IE | Yes — GNI manual pilot; new registry Jan 2027 | AIB observer (gas); GNI on ERGaR board; not connected | Not routine; ad hoc manual pilot only | Not via hub; manual pilot recognition (DK, DE examples); hub planned Q1 2027 |
| RO | Not yet — OUG 59/2025; gas regulation due 30 Sep 2026; market open 1 Jan 2027 | AIB observer (gas+elec) | Not possible | Not possible |
| GR | In law (L. 5215/2025 Art. 19, DAPEEP biomethane register) | AIB elec only; no ERGaR | Not possible | Not possible |
| SI | Law covers gas; operating registry electricity-only | AIB elec only | Not possible | Not possible |
| HR | In law (NN 28/2023, HROTE); no evidence of operation | AIB elec only | Not possible | Not possible |
| BG | Ordinance covers "biogas"; SEDA register | AIB applicant (elec) | Not possible | Not possible |
| LU | In law (RGD 4 Nov 2022, ILR; gas GOs State property if remunerated); not evidenced operating | AIB elec only | Not possible | Not possible |
| BE-Flanders | Yes — national non-EECS gas GOs (VREG/Fluxys) | AIB elec only; barred from hub | Not possible | Not possible |
| BE-Wallonia | Yes — national non-EECS biomethane GO (SPW) | AIB elec only; barred from hub | Not possible | Not possible |

## Searched but not found
- CRU202615 decision paper PDF itself (only law-firm summaries); GNI registration requirements (due Sept 2026).
- Any Norwegian legal basis or registry for gas GOs after 2021; regjeringen.no Q&A (HTTP 403); Statnett gas GO page; details of the Biokraft export pilot.
- Whether ANRE (RO) adopted the gas GO regulation by 30 Sep 2026; any ANRE gas GO page.
- Whether URE/TGE (PL) has issued or recognised any biomethane GO; any TGE biomethane module launch notice; any PL ex-domain/export provision.
- DAPEEP (GR) biomethane register live status; DAPEEP and ILR direct gas-GO pages (ilr.lu gas pages show only biogas plant register).
- AGEN-RS/Borzen (SI) gas GO page (agen-rs.si biogas page connection refused); ZSROVE-B (2024) amended text.
- HROTE gas module evidence; SEDA biogas GO issuance; Bulgarian ordinance article numbers beyond those quoted.
- VREG/Fluxys cross-border gas GO documents (VREG PDFs blocked); Wallonia Annex 6 ex-domain agreement list (annex is an unfilled template in the PDF).
- Raw TSO pages for physical interconnections (only search-result summaries).
- Emails: direct contact addresses for NVE/Statnett, URE, ANRE (RO), DAPEEP, ILR, AGEN-RS, Borzen, HROTE, SEDA, VREG, CWaPE were not located; contact-page URLs given instead.
