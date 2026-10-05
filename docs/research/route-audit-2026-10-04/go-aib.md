# GO route, AIB gas side — findings (accessed 2026-10-04)

Local copies of all sources: C:\Dev\route-audit\_pdf\ (domain protocols .pdf/.txt, survey.xlsx, htf_s.html, eecs_rules_r8.txt).
DP base URL: https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/ (file names as listed on https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols).

## 0. Cross-cutting findings (Q4, Q5 and the evidence base used in the table)

### 0.1 Sweden / Cesar gas hub connection (Q4)
- Energimyndigheten FAQ (undated) says gas EECS not yet possible: "Det är inte möjligt ännu, men Energimyndigheten ansöker om medlemskap i AIB för att utfärda EECS-ursprungsgarantier för gas. Innan medlemskapet i AIB:s gasgrupp är godkänt kan svenska EECS-ursprungsgarantier för gas inte utfärdas." | https://www.energimyndigheten.se/energisystem-och-analys/styrmedel-for-produktion-av-el-gas-varme-och-kyla/ursprungsgarantier/vanliga-fragor-om-ursprungsgarantier/ | PRIMARY (stale, superseded below)
- Energimyndigheten REDIII Q&A: "För gas kommer det vara möjligt att importera och exportera ursprungsgarantier från och till Sverige när vårt medlemskap blir accepterat i AIB." | https://www.energimyndigheten.se/energisystem-och-analys/styrmedel-for-produktion-av-el-gas-varme-och-kyla/ursprungsgarantier/om-ursprungsgarantier/andringar-i-regelverket-for-ursprungsgarantier-till-foljd-av-det-reviderade-fornybartdirektivet-rediii/fragor-och-svar-om-andrade-regler-for-ursprungsgarantier-till-foljd-av-rediii/ | PRIMARY (stale)
- Trade press 9 Jun 2026: "Om AIB godkänner både domänprotokollet och Sveriges medlemskap i gasgruppen kan Energimyndigheten börja utfärda EECS-ursprungsgarantier ... Först därefter kan import och export av EECS-ursprungsgarantier för gas genomföras mellan olika länder." | https://www.energinyheter.se/20260609/34898/energimyndigheten-vill-infora-internationella-ursprungsgarantier-gas | SECONDARY
- **AIB news 20 Aug 2026, "Sweden joins AIB Gas Scheme Group and is Hub connected"**: "The AIB Gas Scheme Group (GSG) formally approved our Swedish AIB Member and Issuing Body 'Swedish Energy Agency' application to join the AIB Gas Scheme." / "From 1 September onwards, Swedish gas GOs may be considered EECS GOs. Such EECS gas GOs will be tradeable over the AIB Hub." | https://www.aib-net.org/node/3418 (listed at https://www.aib-net.org/news) | PRIMARY
- AIB registries table: "Sweden | Energimyndigheten | Electricity + Gas" | https://www.aib-net.org/registries | PRIMARY
- Stale AIB GSG page still lists "Swedish Energy Agency, Sweden [to be connected to the AIB Hub]" and "15 of the 16 Members are connected to the AIB Hub, with Pronovo currently only facilitating imports." | https://www.aib-net.org/gsg | PRIMARY (older than 20 Aug news)
- Swedish DP Release 5 (26 Aug 2026) still future-tense: "Upon acceptance in the Gas Scheme group of AIB, and after a transition period of some time, Sweden plans to issue only EECS GOs for gas." (C.6.1); gas E.12.1: "The National Scheme for national GOs will be phased out upon acceptance in the Gas Scheme Group of AIB to issue gas EECS-UG and connect the Swedish gas registry to the AIB hub." | AIB-2026-DPSE-Domain Protocol Sweden 2026 Release 5 Clean.pdf | PRIMARY
- Empirical: the AIB hub transfer dataset (generated 2 Sep 2026, to Aug 2026) has NO gas flow to or from Sweden, Brugel or MEKH (see 0.4).
- Verdict: Sweden is formally in the AIB Gas Scheme and declared hub-connected as of 20 Aug 2026; Swedish EECS gas GOs possible from 1 Sep 2026. No gas transfer recorded yet (data ends Aug 2026). Energimyndigheten's own FAQ pages not updated. Treat SE as Q (connected on paper, nothing observed).

### 0.2 Must a hub member accept imports from every other hub member? (Q5)
- Read the full EECS Rules Release 8 v1.11 (20 May 2026): https://www.aib-net.org/sites/default/files/assets/eecs/EECS%20Rules%20Release%208%20v1.11%2009.04%20clean.pdf . NO clause obliges a registry to accept every import. What the Rules say:
  - Transfers only between Scheme Members of the same scheme: "A Scheme Member of any EECS Scheme may not transfer (or attempt to transfer), directly or via the Hub, a Scheme Certificate: (a) to another Scheme Member other than between their respective EECS Registration Databases in respect of that EECS Scheme; or (b) to a Member that is not a Scheme Member of that EECS Scheme." (Prohibitions - use of the Hub) | PRIMARY
  - Hub exclusive between Hub Users: "A Scheme Member is only allowed to use the Hub when transferring Certificates to any other Hub User, excluding other means of transfer or separate arrangements in this respect."
  - Receiving procedure (C5.2): "Where a Scheme Member is notified by another Scheme Member of a Transfer Request ... it shall: (a) insert the full details of that Scheme Certificate in that Transferables Account; (b) confirm ..." - procedural; member DPs add local validation and NACK (see per registry).
  - Ex-domain cancellation only if no hub path: "(i) it is not possible to transfer EECS Certificates directly or via the Hub to a Scheme Member for the other Domain; and (ii) a Cancellation Agreement exists between the Cancelling Scheme Member and the Scheme Member for the other Domain".
- AIB registries page: "Both imports and exports are allowed for all EECS Registries, unless there are restrictions explicitly noted in the table below." | https://www.aib-net.org/registries | PRIMARY (statement, not a rule)
- AIB news 1 Jun 2026: "We have officially connected 5 new gas Issuing Bodies to the AIB Hub. This means you can now seamlessly transfer gas GOs between all 15 members of the AIB Gas Scheme.*" (footnote not retrievable) | https://www.aib-net.org/news-events/newsarchive | PRIMARY (marketing)
- Conclusion (INFERENCE): no hard rule makes every pair "possible"; the hub-wide statement plus per-DP validation does. Where AIB's own hub dataset shows completed transfers I mark P-observed; with no observed transfer and no DP bar, P (rule only).

### 0.3 AIB member survey "Imposed conditions for trade, expiry and cancellation" (28 Sep 2026)
https://www.aib-net.org/sites/default/files/assets/facts/market%20information/Member%20survey%20of%20Imposed%20conditions/AIB-2026-Member%20Survey%20of%20Imposed%20conditions%20for%20trade%20expiry%20and%20cancellation%2020260928.xlsx (page https://www.aib-net.org/facts/market-information/imposed-conditions-trade-expiry-and-cancellation). Member-supplied; AIB: "accepts no responsibility for any errors and omissions". Local: _pdf\survey.xlsx, _pdf\survey_by_q.txt. PRIMARY (self-reported). Some columns mix electricity and gas; flagged where relevant.

### 0.4 Observed gas flows over the AIB Hub, Jan 2024 - Aug 2026
Source: AIB "Hub Transfer Flows" tool data (generated 2026-09-02), https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html (window.HUB_DATA.gas; parsed to _pdf\gasflows.json). SECONDARY (AIB's own tool, my extraction). MWh, (n transfers), "test" = 5 MWh or less.
- LT -> LV 1 (test); ES 21,514 (8); FI 12,160 (4); CZ 168,914 (75); PT 1 (test); NL 131 (2)
- LV -> LT 8,835 (4); AT 30,548 (2); ES 39,764 (34); FI 66,881 (35); CZ 117,462 (44); CH 22,065 (11); SK 1 (test); NL 17,866 (13)
- AT -> LT 7,627 (7); LV 19,061 (7); FR 39 (2); ES 43,740 (68); FI 1 (test); CZ 30,115 (37); CH 3,285 (1); NL 1 (test)
- FR -> LT 1 (test); AT 1,000 (2); EE 1,000 (1); ES 230,113 (28); IT 2 (test); FI 120,466 (23); CZ 1 (test); CH 47,826 (13); PT 74,297 (18); NL 1,373 (4)
- EE -> FI 685 (1); CZ 1,041 (2)
- ES -> LT 3,391 (3); LV 6,684 (1); AT 9,681 (4); FI 500 (1); CZ 26,846 (9); CH 190,256 (169); PT 1,735 (9); NL 2,587 (4)
- IT -> CH 9,044 (4)  [the only IT export observed]
- FI -> LT 3,814 (1); LV 4,082 (4); AT 1,000 (1); ES 12,364 (12); CZ 11,239 (7); NL 2,434 (2)
- CZ -> LT 2,689 (3); LV 1,769 (3); FR 1 (test); ES 90,052 (72); FI 11,739 (15); CH 16,991 (27); NL 1,201 (2)
- CH -> ES 2,237 (1, Aug 2026)  [Pronovo is listed "imports only"; one export is recorded, see CH section]
- PT -> LT 1 (test)
- SK -> LV 5,040 (5, Jul 2026); CZ 8,866 (8, Jul-Aug 2026)
- NL -> LT 21,670 (9); LV 22,455 (18); AT 330 (2); FR 1,625 (7); ES 198,795 (94); IT 1 (test); FI 390,029 (76); CZ 2,502 (5); CH 240,775 (158)
- No gas flow at all with BE-Brussels, HU or SE as sender or receiver. No flow into SK. Nothing into HU, EE only from FR.

## AT — E-Control (gas registry)
### Facts
- IMPORT: foreign gas GOs accepted if content meets §129b(8) GWG; hub only | AIB-2024-DPAT-E-Control Austria Domain Protocol (corrected 20 Sep 2024).pdf, C.3.9 | "Foreign gas Gos are accepted if the information on a GO is in line with § 129 b (8) GWG." | PRIMARY
- Survey: "Imports only possible via the AIB Hub"; "Only suppliers and traders can import"; imports need no E-Control approval | survey Q4, Q4.1, Q4.2 (Austria column; may be electricity-oriented) | PRIMARY (self-reported)
- EXPORT of supported production: DP (electricity-oriented text) "GOs receiving production support are used in Austria only and cannot be traded internationally." For gas the DP only requires support to be shown on the GO: "National (public) support for gas production can be given by investment support or other support and needs to be mentioned on the gas GO as described in § 129 b (2) 8., 9" | DP C.4.1/C.4.2 | PRIMARY. Survey: "Subsidised Gos can't be exported. Gos can only be exported via the AIB Hub." / "Only suppliers and traders can export" | survey Q3, Q3.1 | PRIMARY (self-reported; does not say whether gas is covered). INFERENCE: ambiguous for gas, treat supported-gas GOs as possibly not exportable.
- Austrian "Green gas certificates" (Gruengasnachweis) are non-EECS, national, only for gas NOT injected into the public grid, and exclude a GO for the same gas | DP B.1.6 | "Green gas certificates are only issued for gas that is not injected into the public grid." | PRIMARY
- Two Austrian registries: E-Control (AIB) and AGCS (ERGaR). Which one holds a plant's GOs decides the hub (see hub-connectivity note).
- EX-DOMAIN CANCELLATION: "Cancelation for usage in another Domain (i.e., Ex Domain Cancellations) is not allowed (in exceptional cases only within AIB Members and under the precondition to sign a cancellation agreement)." | DP C.3.x | PRIMARY. (Prior note quoted "Any ex-domain cancellations are not possible.")
- Hub flows: AT sends to LT, LV, FR, ES, FI(test), CZ, CH, NL(test); receives from LV, LT, FR, ES, FI, CZ, NL | section 0.4 | SECONDARY
### Verdicts
- Imports from all AIB gas members: yes by rule (hub only, content test §129b(8) GWG). Exports: allowed via hub; possible exclusion of supported production (unclear for gas). Ex-domain: no (exceptional, agreement needed).
### Open questions
- Q: Are gas GOs from plants receiving investment or other support exportable via the AIB hub, or only non-supported? | Ask: E-Control (Gas GO registry team) | Contact: https://www.e-control.at/gasnachweis (contact page) (contact page; email not verified)

## CZ — OTE, a.s.
### Facts
- IMPORT: "Only EECS GO Certificates that can be validated as Guarantees of Origin according to the Act No. 165/2012 Coll. can be transferred into the EECS GO Registration Database, otherwise they will be prevented from import." and "Imports where the certificates have already expired for local use are prevented (fail validation before acceptance)." (E.11.4) | AIB-2026-DPCZ-DP OTE CZ Domain Protocol Final.pdf (21 May 2026) E.9 | PRIMARY
- Survey: restrictions only for imports from non-AIB, non-EU/EEA/CH countries | survey Q4 | PRIMARY (self-reported)
- EXPORT: transfer allowed "from the Domain of the Czech Republic to another domain involved in the EECS Scheme". No bar on supported GOs. Supported-plant GOs are issued to the Czech state account and auctioned: "Guarantees of Origin for electricity, gas, heat and hydrogen from supported Production Devices are issued by OTE, a.s. ... to the Czech Republic state account ... and are made available for purchase (transfer) in the electronic auctions" (C.4) | PRIMARY. INFERENCE: GOs bought in auction are tradeable (OTE sends 90 GWh to ES etc.).
- Disclosure: "In the Czech Republic the only purpose to issue EECS GO Certificates is their use for disclosure." (C.3.6) | PRIMARY
- EX-DOMAIN: "Cancelation for usage in another Domain (i.e., Ex Domain Cancellations) are allowed only towards consumption in countries (domains) outside of AIB." (C.3.6) and "Transfer ... from or to the domain of non AIB Member is allowed only as an ex-domain cancellation to such domain, under exceptional circumstances that shall be confirmed by the relevant state stakeholders." (E.9) | PRIMARY
- DP change history v2: "Import-only status implemented." (meaning not explained; hub flows show OTE exporting) | PRIMARY, unclear
- Hub flows: OTE is the biggest receiver of LT (169 GWh), LV (117 GWh), AT, ES, FI; sends to ES, CH, FI, LT, LV, NL | section 0.4 | SECONDARY
### Verdicts
- Imports from all AIB gas members: yes (Czech Act validity test). Exports: yes. Ex-domain only to non-AIB, exceptional.
### Open questions
- Q: What does "Import-only status implemented" in DP v2 change history refer to? | Ask: OTE | Contact: https://www.ote-cr.cz/en/contacts (verify)

## FR — EEX (French gas GO registry)
### Facts
- IMPORT: "EECS GOs can be imported and exported. If imported to France, EECS GOs must contain an indication whether the reduction of greenhouse gas emissions, associated with the production of the Output to which the EECS Gas Certificates relate, is eligible to qualify for accounting under the Emission Trading System, and the reference to the framework of qualification (ETS Eligibility Tag). In case this information is missing, the EECS GOs are refused." | AIB-2026-DPFR-Domain Protocol EEX Gas Application Final Clean ESG.pdf (21 Jan 2026), Part III E.10 | PRIMARY
- "Non-EECS GOs are refused. Refusal could also happen in case of doubt on the quality of GOs. According to Article D446-30 of the French Energy Code ... EEX shall inform the Minister responsible for energy." | same | PRIMARY
- Part I E.10: "EECS Certificates coming from EU-members or parts of the European Economic area can be imported and exported via the AIB hub." | PRIMARY
- Survey Q3.4: "for exports of biogas GOs to France, it is necessary to indicate if the GOs have already been accounted in a national target or if they can be accounted within EU ETS." Q4: "Yes for electricity and gas, in relation to importing from countries that are not yet members of AIB and part of the EU/EEA." | PRIMARY (self-reported)
- Gas GOs from subsidised French plants (obligation d'achat) are issued on the DGEC (state) account and auctioned; ETS/ESR split shown on the GO: "In order to do cross-border transfers, the French State requires the other countries, that are interested in exchanging GOs, to provide this information in the dedicated optional data field (ETS-ESR Eligibility Tag)." | DP Part III C.4/E.2 | PRIMARY
- EXPORT: "In the case of an export, data is sent to the relevant AIB registry via the AIB hub, which may accept or refuse the export." Survey: "exports need to be approved" (Q3.2: Yes). Some support data "might be lost when the EECS-GO is exported." | DP E.9; survey | PRIMARY
- National biomethane certificates (CPB, production-obligation scheme): "CPBs cannot be exported and used outside of France." / "It is not possible to export CPBs to other countries." (Part IV E.10) | PRIMARY. These are non-EECS and non-GO; only for non-subsidised biogas for which no GO was issued.
- EX-DOMAIN: "Ex Domain Cancellations can only be permitted for European countries where Registries do not have access to the AIB Hub and cannot import Certificates electronically. The Issuing Bodies discuss whether Ex domain cancellations are possible. If both countries agree to accept EDCs, an EDC agreement is concluded" | Part III E.10 | PRIMARY. So between two hub members ex-domain is NOT allowed.
- Hub flows: FR sends 230 GWh to ES, 120 GWh FI, 74 GWh PT, 48 GWh CH, also AT, EE, IT(test), NL, LT/CZ(test); receives from NL (1,625), AT (39), CZ/LT (test). No FR import from ES/LV/FI observed. | 0.4 | SECONDARY
### Verdicts
- Import: only EECS GOs carrying the ETS/ESR eligibility tag; missing tag = refused. Export: allowed with EEX acceptance step; supported plants' GOs sit with the state and are auctioned.
### Open questions
- Q: Does EEX accept imported gas GOs from every AIB gas member provided the ETS eligibility tag is filled, and which origin registries currently populate that tag (e.g. NL, ES, CZ)? | Ask: EEX Registry (France GO) | Contact: https://www.eex.com/en/markets/energy-certificates/french-gos (verify)

## IT — GSE
### Facts
- IMPORT: via hub only; imports accepted/rejected by the buyer: "The import/export of EECS GOs occur only via the AIB's Hub." / "An Import must be accepted or rejected by the counterparty." | AIB-2024-DPIT-GSE Italy Domain Protocol 20240710.pdf (version July 2024; no newer one on the AIB page), E.10 | PRIMARY
- Cancellation (use) in Italy requires sustainability data: "A GAS GO can be cancelled in Italy only if it has 3 information: Compliance with sustainability requirements; The gas usage of Methane from renewable energy: transport, other uses and electricity production; the equivalent CO2 emissions associated with the quantity ... (GHG Emission Produced). If a single condition is not respected the GAS GO cannot be cancelled in Italy." (E.12.11) | PRIMARY. Also "GAS GOs can be cancelled exclusively for the gas usage identified during the issuing phase." (E.12.12). Survey Q15: "Only Renewable Gos" for disclosure; Q16 repeats the 3 conditions. Italian ministerial decree DM 224/2023 (see earlier note) applies art. 42 D.Lgs. 199/2021.
- Technical block: "Cancellation of GOs are technically blocked in the Italian domain, when: The energy source are other than RES; the country of Issue is Serbia, Switzerland, Montenegro and all countries not connected to the AIB HUB." (E.12.8) | PRIMARY. NB: GOs issued in Switzerland cannot be cancelled in Italy.
- EXPORT: "GAS GOS transport and other uses, pursuant to Ministerial Decree 2018 and pursuant to Ministerial Decree 2022, cannot be exported. GAS GOS transport and other uses, not supported by any support mechanism, can be exported. GAS GOs for production of electricity can be always exported." (E.10) | PRIMARY. Survey Q3: "Only in case of not AIB members" (conflicts or is electricity-oriented; DP text prevails for gas).
- Survey Q4.1/Q4.2: "Only traders and suppliers can import. ... All imports must be approved only by the counterparties (buyers)." | PRIMARY (self-reported)
- EX-DOMAIN: "Cancellation for usage in another Domain (i.e., Ex Domain Cancellations) are not allowed" (C.3.5) | PRIMARY
- Hub flows: IT receives only test-size from FR (2) and NL (1); IT exports 9,044 MWh to CH only | 0.4 | SECONDARY (shows Italian unsupported exports exist; no commercial-size import observed)
### Verdicts
- Imports: hub only; a GO is usable in Italy only if it carries sustainability compliance, gas usage and GHG data (so an imported GO without them cannot be cancelled in IT); CH-issued GOs blocked from cancellation. Exports: only unsupported GOs (supported transport/other-use plants cannot export).
### Open questions
- Q: Which fields of an imported EECS gas GO does GSE read to satisfy the three cancellation conditions (sustainability criteria met, gas usage, GHG), and does GSE accept PoS-based data from another registry or only its own PoS? | Ask: GSE (Garanzie di Origine gas) | Contact: https://www.gse.it/servizi-per-te/ (contact form; verify email)

## NL — VertiCer (myVertiCer)
### Facts
- IMPORT criteria (gas included since DP v3.8): "The criteria for an EECS Certificate to be transferred to the Netherlands from another Domain are that such EECS Certificate: (a) constitutes an EECS GO; (b) has been issued in and is being transferred to the Netherlands from a Domain: (i) that is a member of the EU; or (ii) with which the European Union has concluded an agreement in accordance with article 19.11 of Directive (EU) 2018/2001. (c) does not relate to Energy which was consumed by the operator of the Production Device." | AIB-2025-DPNL-Domain Protocol the Netherlands v3.8 (Clean).pdf E.10.1 | PRIMARY
- So CH-issued gas GOs cannot be imported by NL (CH is neither EU nor party to an Art. 19(11) agreement). Survey Q4.4: "Only GOs issued by EU member states and by countries bound by treaty to the RES, energy efficiency, and IEM Directives are eligible for import." | PRIMARY (self-reported). INFERENCE: NO-issued GOs would not qualify either (Norway is EEA, not EU, no Art. 19(11) agreement stated), but NO has no gas registry on the hub.
- EXPORT: no restriction beyond hub: survey Q3.4 "We can only export EECS GOs via the AIB hub." | PRIMARY (self-reported)
- EX-DOMAIN: "It is not allowed to cancel EECS Certificates: (a) in the Netherlands for use in another geographical area; or (b) in another Domain for use in the Netherlands; save under the express provisions in this section E.10." and "Cancellations for usage in another Domain (i.e., Ex Domain Cancellations) are not allowed." (C.3.4). Transitional cancellations to DENA/ERGaR registries ran only "until 1 July 2026 at the latest" - now expired. | PRIMARY
- Disclosure: "There is not yet a requirement in place to disclose the origin of any type of Gas." (C.3.4) | PRIMARY
- Hub flows: NL is the largest AIB gas exporter (FI 390 GWh, CH 241 GWh, ES 199 GWh, LV, LT, FR, CZ, AT, IT test); it receives from FR, ES, CZ, LV, LT, AT, FI, small amounts | 0.4 | SECONDARY
### Verdicts
- Import: EECS only, issuing domain EU or Art.19(11) treaty state, not own-consumption energy. Export: free via hub. Ex-domain: no.
### Open questions
- none beyond CH.

## ES — Enagás GTS
### Facts
- IMPORT acceptance criteria (automatic): "a. The Product Type is Guarantee of Origin; b. The face value is 1 MWh; c. The Energy Carrier is either 'energy gas' or 'hydrogen'; d. The Type of gas is either 'methane' or 'hydrogen'; e. ... the Energy Source is compliant with: At Level 1: 'Renewable'; At Level 3: Not 'Unspecified'; f. The last day on which the Output it relates was produced took place on the previous 12 months." Receiving account holder then accepts or rejects. (E.8.14-E.8.17) | AIB-2023-DPESG-Enagas GTS Spain Domain Protocol - Gas_231213.pdf | PRIMARY. A newer CNMC-2026 DP exists (electricity, AIB list); no newer Enagás gas DP on the AIB page.
- Re-export allowed: "Any GO/EECS certificate issued in this Domain, or imported into the Registry can be re-exported provided they comply with the requirements set by point 8.4." (E.8.19) | PRIMARY
- Survey Q4.4: "Only GOs for biomethane or hydrogen from renewable origin whose production period happened within the last 12 months can be imported." Q16: "(c) Biogas GOs can only be cancelled for 'unspecified' gas consumption."; expiry "expire partially 12 months after ... (no longer eligible for exports or transfers)". | PRIMARY (self-reported)
- EXPORT: survey Q3 "No" restriction; no support scheme for gas production: "Currently there are no National Public Support Schemes for gas or hydrogen production" (C.4.1) | PRIMARY
- EX-DOMAIN: "No ex-domain cancellations are allowed." (E.10.13) | PRIMARY
- Hub flows: ES is the biggest hub destination (FR 230 GWh, NL 199, CZ 90, AT 44, LV 40, LT 22, FI 12, CH 2); exports 190 GWh to CH, plus CZ, AT, LV, LT, NL, PT, FI | 0.4 | SECONDARY
### Verdicts
- Import: renewable (methane/hydrogen) GOs with production within last 12 months. Export free. Ex-domain: no.
### Open questions
- none.

## PT — REN
### Facts
- IMPORT: "In accordance with the Portuguese regulatory framework, all GOs under the EECS Scheme from other Member States of the European Union are recognized. REN will use its reasonable endeavours to verify import requests and, in case of substantiated suspicions regarding their accuracy, reliability or veracity, they will not be accepted." (E.10.2) / "Imports of GOs issued after July 2021 in third countries with no mutual recognition agreement with the Union will not be accepted. These requests are automatically rejected by the EEGO System." (E.10.5) / "Non-EECS GOs are only accepted upon the establishement of a formal bilteral acceptance criteria" (E.10.4) | AIB-2024-GSG-PT-REN-DPPTG Domain Protocol REN Clean 20241217.pdf | PRIMARY
- So CH-issued gas GOs are rejected into PT (no EU mutual recognition agreement). INFERENCE from E.10.5.
- EXPORT: "All valid and tradable GOs can be exported, including those for all energy carriers such as electricity, gas and hydrogen." (E.10.3) | PRIMARY. Supported production gets no GOs: "In accordance with the Portuguese legislation, GOs from Production Devices with support are not granted to producers" (C.4.1) | PRIMARY
- EX-DOMAIN: "Ex-domain cancellation requests may only be accepted in some cases, such as to non-Members of AIB or, as a remedial action due to technical issues. ... The acceptance of Extra Domain cancellations to AIB members is subject to the establishment of an objective acceptance criteria and procedures, which must be approved by DGEG and ERSE." (E.12.12) | PRIMARY
- Hub flows: PT receives 74 GWh from FR and 1.7 GWh from ES; sends only 1 MWh (test) to LT. | 0.4 | SECONDARY
### Verdicts
- Import: EU EECS GOs only. Export: allowed (but few PT gas GOs exist; supported output has none). Ex-domain: effectively no for AIB members.
### Open questions
- none.

## SE — Energimyndigheten (Cesar), gas
### Facts
- Connection status: see 0.1 (hub-connected per AIB 20 Aug 2026; gas EECS possible from 1 Sep 2026; nothing observed yet).
- IMPORT: "Import can only happen electronically through the AIB hub. The Swedish Cesar registry does only accept import of EECS-GOs from domains within EU or domains that have an agreement on mutual recognition of GOs with EU." (E.10.2); "EECS-GOs for electricity, energy gas, and hydrogen can be imported/exported through the AIB hub." (E.10.1) | AIB-2026-DPSE-Domain Protocol Sweden 2026 Release 5 Clean.pdf | PRIMARY. Survey Q4: "EECS-GOs issued in Serbia and Switzerland are blocked from import at the moment"; Q4.2: "Yes" (imports approved by the competent body); Q4.1: only EECS account holders can import. | PRIMARY (self-reported). GOs older than 12 months from production end fail on import (E.13.3).
- A foreign GO can be used in Sweden only if transferred into Cesar: "if a company buys GOs from a country other than Sweden, it can only be transferred to the Swedish register CESAR if the issuing country is a member of AIB and connected to AIB's hub." (C.3.4)
- EXPORT: "EECS-GOs can only be exported from the Swedish Cesar registry electronically through the AIB hub to other AIB-members." (E.10.3); National (non-EECS) GOs cannot be exported (Table 1: "Export National GOs ... No" for national account holders; "National GOs are only transferable within the Swedish domain and cannot be exported to other domains"). | PRIMARY
- EX-DOMAIN: "This is not allowed. Ex-domain cancellations are not allowed." (E.10.5) | PRIMARY
- Swedish biogas tax exemption runs on sustainability evidence, not GOs (earlier note). Supported production (production aid for biogas) does not bar GOs in the DP.
### Verdicts
- Import: EU/treaty-state EECS GOs via hub, once the gas side is live. Export: EECS gas GOs via hub only. No ex-domain. Status: Q until first transfers are seen.
### Open questions
- Q: Has Cesar issued the first EECS gas GOs since 1 Sep 2026, are imports/exports of gas EECS GOs live in practice, and is the 12-month and CH/RS import block applied to gas? | Ask: Energimyndigheten (ursprungsgarantier) | Contact: https://www.energimyndigheten.se/kontakta-oss/ (email not verified)

## EE — Elering
### Facts
- IMPORT: "Only EECS certificates can be transferred to and from Elering's Registry. In effect all EECS certificates that have passed through the AIB Hub are able to enter the Estonian Domain." (E.10.1) / "All electricity and biomethane EECS GOs are allowed for transfer via the AIB Hub. No gas GOs of fossil or nuclear origin can be imported into the Estonian GO registry." (E.10.2) | AIB-2024-DPEE-Domain Protocol Elering Estonia Clean version 20241210.pdf | PRIMARY. No newer EE protocol on AIB page (DP predates the June 2026 gas hub connection of 5 registries; check whether Elering gas connected: hub flows show EE gas sending to FI, CZ and receiving 1,000 MWh from FR, Aug 2026).
- Use restriction at destination: "Imported biomethane GOs can be used to provide proof of biomethane consumption to the final customer (disclosure purpose) but cannot automatically be used for fulfilling the national renewable energy obligations (target accounting purpose)." (E.10.3) | PRIMARY
- Import restriction on supported origin: "Renewable energy that corresponds to the imported guarantees of origin shall not have received support via national public support schemes." (C.4) | PRIMARY. INFERENCE: a GO from a subsidised plant (with a support earmark) may not be eligible for Estonian disclosure/import; wording is in the support section, not in E.10.
- Estonian supported production: "any guarantees of origin that have been issued for the installation's production are not issued to the Producer's Account" after 15 Jun 2022 investment support, unless revenue is deducted or reverse-auction. Estonian biomethane transport support ended 2024; a transport offsetting platform issues "biomethane transport sector certificates" when a biomethane GO is cancelled against transport consumption. (C.4.3-C.4.7) | PRIMARY
- EXPORT: no restriction in DP besides hub; survey Q3: "No, only technical limitation. Export is allowed only via AIB Hub" | PRIMARY (self-reported)
- EX-DOMAIN: "Ex-domain cancellations are not permitted." (E.12.7) and "Cancellation for usage in another Domain (i.e. Ex-Domain Cancellations) is not allowed." (C.3.6.3). Survey Q16: "It is only possible to use GOs that have been issued in EU or EEA countries and are then electronically transferred to the Estonian registry." | PRIMARY
### Verdicts
- Import: hub EECS biomethane only (no fossil/nuclear gas); disclosure use only, not national target; supported-origin GOs flagged as not accepted (C.4 wording). Export: free via hub. Ex-domain: no.
### Open questions
- Q: Does Elering accept imported biomethane GOs whose production device received public support (earmark in Fact Sheet 3 field), and is the Elering gas registry now hub-connected (the AIB table says Electricity + Gas)? | Ask: Elering (GO registry) | Contact: https://elering.ee/en/guarantees-origin (email not verified)

## FI — Gasgrid Finland Oy
### Facts
- IMPORT / EXPORT: the DP contains no import-type restriction for gas GOs; transfers go via the hub with verification by the receiving registry (E.8.8): "In transfers between accounts in two different registries, the success of the transfer is subject to the verification process of the AIB HUB and the receiving registry." | AIB-2026-DPFI-Domain Protocol Clean Gasgrid Finland Oy.pdf | PRIMARY. Survey Q3/Q4: "All exports are possible via AIB Hub, otherwise ex-domain cancellation is an option." / "All imports are possible via AIB Hub, otherwise ex-domain cancellation approved by the disclosure competent body is an option." Imports from non-AIB countries need advance approval of the Energy Authority. | PRIMARY (self-reported)
- Supported production: "No relation exists between renewable energy support and disclosure. The legislation does not set any restrictions for issuing and cancelling GOs from supported production." support must be indicated on the GO (C.4). | PRIMARY
- Cancellation consent: "Cancellation of an EECS (or national) GO requires the consent of Gasgrid Finland until further notice." (E.10.3) | PRIMARY
- EX-DOMAIN: "Cancellation for usage in another Domain (i.e., Ex-Domain Cancellation) are allowed unless the domains are connected to AIB Hub." (C.3) and E.10.9: "allowed under the following restrictions when transfer over the AIB hub is not possible and if agreed between Issuing Bodies". | PRIMARY. So not allowed between two hub members.
- Hub flows: FI receives 390 GWh from NL, 120 GWh FR, 67 GWh LV, plus CZ, ES, EE, AT, LT; sends to ES, CZ, LV, NL, LT, AT | 0.4 | SECONDARY
### Verdicts
- Imports from all AIB gas members: yes (no DP restriction). Exports: free via hub. Ex-domain: only to non-hub domains, with agreement.
### Open questions
- none.

## HU — MEKH
### Facts
- Hub status: "Date of Hub connection: The date when ... (MEKH) became a Hub User, namely: 1st March 2022" (electricity); gas: DP (10 Apr 2026) provides for transfers "to another AIB Hub Gas GO Account" (account holder entitlement a) and lists MEKH as GSG member (AIB GSG page); AIB registries table: "Hungary | MEKH | Electricity + Gas" | AIB-2026-DPHU-MEKH Domain Protocol DP with Gas Final.pdf; https://www.aib-net.org/registries; https://www.aib-net.org/gsg | PRIMARY. NO gas flow ever recorded to or from MEKH on the hub (0.1/0.4) - connected on paper, unused so far.
- IMPORT/EXPORT rules same for gas and electricity: "E.10.1. The rules for EECS Certificates for export and import are the same for both electricity and gas GOs." Without hub connection import/export is by official request and MEKH approval. "E.10.6. GOs may be transferred within 12 months of the end of the production period of the relevant renewable gas, if it has not been used or withdrawn and has not expired." | DP E.10 | PRIMARY. Survey Q4/Q4.2: "EECS GOs can be imported through the Hub." imports need approval (Yes). | PRIMARY (self-reported)
- Foreign GO recognition outside hub: "MEKH shall, upon official request, recognise foreign GOs for renewable gas in accordance with the procedure laid down in the Administrative Procedure Act, provided that HUB connection between the Registries of the two countries is not established." (E.12.14) | PRIMARY. Imported-by-request GOs "cannot be traded to a foreign Registry through the HUB" (E.12.15).
- Use: "GOs can be used solely for the purpose of disclosure." (E.12.3, electricity wording); gas cancellations record use category (supplier, final consumer, storage, conversion, other certification system).
- Supported production: KÁT-supported electricity is not GO-eligible; for gas no supported-export bar found in the DP. INFERENCE: none for gas.
- EX-DOMAIN: Cancellation to another AIB gas member only if there is a cancellation agreement or the other country has no gas GO registry: "a) ... cancellation agreement with the other country that is an AIB gas scheme member, or b) there is no Registry for GO for renewable gases in the other country." and "Concerning the export of domestic GOs to a partner that is not connected to the AIB HUB the cancellation of the GOs shall take place if the transfer of the relevant GOs has been approved by MEKH and the responsible organisation of the other country has recognised the EECS GOs." | DP E.12 | PRIMARY. Survey Q16: "Only AIB EECS Rules compatible GOs can be cancelled through Ex-Domain Cancellations in Hungary."
### Verdicts
- Hub rules open both ways (imports need MEKH approval per survey), but no HU gas transfer has ever been recorded. Treat HU pairs as P-by-rule/unproven (Q for practice).
### Open questions
- Q: Is MEKH's gas GO registry live on the AIB hub (first transfers expected?), and do imports need a manual MEKH approval (survey says Yes)? | Ask: MEKH (Hungarian Energy and Public Utility Regulatory Authority, GO unit) | Contact: https://www.mekh.hu/en (email not verified)

## LV — Conexus Baltic Grid (gas; electricity is AST, separate)
### Facts
- Scope: "AS 'Conexus Baltic Grid' ... is authorised to Issue EECS Certificates relating to the following EECS Product(s): EECS GOs for Network-compatible Gas." Off-grid biomethane gets no EECS GOs (B.1.4). | AIB-2026-DPLV-Conexus Domain Protocol approved.pdf | PRIMARY
- IMPORT/EXPORT via hub: "There are no restrictions for transfer via AIB Hub of EECS GOs for renewable gas, except for hydrogen, since Conexus is not appointed as hydrogen EECS GO issuing body by national legislation." (E.9.10) | PRIMARY. Survey: Q3 and Q4 "No" restrictions; Q15 "Only renewable." | PRIMARY (self-reported)
- Legacy GOs excluded from export: "Guarantees of origin that are issued for gas, which was produced before Conexus becomes an official AIB Gas Scheme member and before the entry into force of this Domain Protocol are prevented from export through the AIB Hub as they are not qualified as EECS GOs" (E.1.12) | PRIMARY
- Supported production: DP only requires the producer to report support at registration (C.4.2); no export bar. | PRIMARY
- EX-DOMAIN: "allowed under the following restrictions: Member has AIB hub connection or Domain allows such cancellation if Conexus has a Bilateral Agreement with Member for the other Domain." (C.3.5) and E.9.8: ex-domain export only where "the beneficiary of the cancellation is located in another Domain or country, that is not connected with AIB Hub and respective Issuing body has signed agreement with Conexus". | PRIMARY (C.3.5 wording is ambiguous; E.9.8 says non-hub only). INFERENCE: not for hub members.
- Hub flows: LV is a major exporter (CZ 117 GWh, FI 67, ES 40, AT 31, CH 22, NL 18, LT 9) and receives from AT, ES, FI, CZ, LT, NL, SK, AT | 0.4 | SECONDARY
### Verdicts
- Open both ways via hub. Ex-domain: no (hub members).
### Open questions
- none.

## LT — AB Amber Grid (gas; electricity is Litgrid)
### Facts
- IMPORT/EXPORT: "E.10.10 There are no restrictions for transfer via AIB Hub of EECS GOs for renewable gas." and Rules E.11: "The import and export (manual and automated) are not restricted for gas from renewable energy sources." | AIB-2025-DPLTG-Domain Protocol Amber Grid R1.1 clean.pdf (23 Oct 2025) | PRIMARY. Survey: Q3/Q4 restrictions only for non-AIB countries; Q4.2: imports from AIB members need no approval. | PRIMARY (self-reported)
- Legacy GOs: "GOs that are issued for the gas, which has been produced before Amber Grid becomes an official AIB Gas Scheme member ... are prevented from export through the AIB Hub" (E.1.15) | PRIMARY
- Also on ERGaR (DE, DK, SK etc.): DP lists "export to non-Hub Participants (for example, German biogas register DENA)" and imports/exports with ERGaR members as hub-external, with HPA restrictions. | PRIMARY. ERGaR side is out of scope here.
- Supported production: "Currently there are no National Public Support Schemes for biometane produced in" Lithuania (C.4.1); GOs from supported plants: none. | PRIMARY
- EX-DOMAIN: DP states "There are no restrictions for cancellation for usage in another Domain (i.e., Ex-Domain Cancellations)." but E.10.8 says ex-domain export handled "where the beneficiary of the Cancellation is located in another Domain or country, that is not connected with AIB Hub and respective Issuing Body has signed agreement with Amber Grid". Survey: restrictions "only in relation to countries that are not members of AIB". | PRIMARY. INFERENCE: not for hub members.
- Hub flows: LT sends CZ 169 GWh, ES 22, FI 12, LV (test), NL (131), PT (test); receives from LV, AT, ES, FI, CZ, NL, FR(test), PT(test) | 0.4 | SECONDARY
### Verdicts
- Open both ways via hub.
### Open questions
- none.

## SK — SPP-distribúcia (G-REX registry)
### Facts
- Two standards: "EECS Standard, which may be transferred through the AIB Gas Hub only, SK GAS Standard, which may be transferred through the ERGaR Hub only, National certificate - ... CoA." 24-month transition (started when the AIB HPA annex was signed). "EECS and SK GAS GOs are held in separate sub-accounts and cannot be inter-transferred. EECS GOs cannot be transferred via the ERGaR Hub, and SK GAS GOs cannot be transferred via the AIB Hub. CoAs cannot be transferred via either Hub." (E.9.14) | AIB-2026-DPSK-01 03 SPP_Distribucia_Domain_Protocol.pdf (16 Apr 2026) | PRIMARY
- Survey: "GOs issued under the SK - GAS standard can not be exported via AIB Hub." / "Only EECS GOs can be imported via AIB Hub." / "Only GOs for biomethane or hydrogen from renewable origin whose production period happened within the last 12 months can be imported." | survey Q3.4, Q4, Q4.4 | PRIMARY (self-reported)
- IMPORT: "Imports of GOs issued in third countries outside the EU are not allowed, as there is currently no mutual agreement between the EU and third countries regarding the recognition of GOs (e.g. IBs in the UK or Switzerland)." (E.10.6) | PRIMARY. So CH-issued GOs refused (CH is non-EU).
- Use restrictions at destination: "Non-EECS GOs imported via the ERGaR Hub and EECS GOs imported via the AIB Hub to be used in the ETS sector and in the transport fuels sector (CNG / LNG) in Slovakia must be issued for biomethane production facilities that are connected to the gas infrastructure (Dissemination level: Transferred / Disseminated over a Distribution or Transmission System)" (E.10.7) | PRIMARY
- Issuance bar: no GO where the gas fed a CHP that received surcharge/top-up (earlier note, SK RES Act); a CoA national certificate is issued by cancelling a GO.
- EXPORT of SK GAS GOs to AIB-hub domains with an IB is prohibited: "Exports of SK GAS GOs to domains that already have an appointed IB for the same energy carrier and that are also participants of the AIB Gas Hub are not permitted (for example AGCS in Austria)." (E.10.5) | PRIMARY. EECS GOs from SK can leave via the AIB hub (flows to LV 5,040 and CZ 8,866 MWh in Jul-Aug 2026).
- EX-DOMAIN: "Cancellations for use in another Domain (i.e., Ex Domain Cancellations) are not restricted, provided that the other domain is not connected to the AIB Gas Hub or technical issues occur with the Hub, which do not allow transfer." (E.12.11); cancellation agreement required (E.12.12); ex-domain statements to SK "shall not be accepted for applications related to the EU ETS, or ... CNG/LNG" (E.12.16). | PRIMARY
- Hub flows: SK sends LV and CZ only (since Jul 2026); nothing into SK. SK is also on ERGaR (DE, DK, AT AGCS, CH, GB, LT) - not an AIB route. | 0.4 | SECONDARY
### Verdicts
- Over AIB: only EECS-standard GOs; first transfers Jul 2026. Import: EU-issued EECS GOs; not CH. Export: EECS GOs yes.
### Open questions
- Q: Does SPPD accept AIB-hub imports of EECS GOs from every AIB gas member today (none recorded so far), and for ETS/transport use only from grid-connected plants (E.10.7)? | Ask: SPP-distribúcia (G-REX registry team) | Contact: https://www.spp-distribucia.sk/ (email not verified)

## BE-Brussels — BRUGEL
### Facts
- IMPORT: "BRUGEL recognises only EECS GOs respecting the following conditions: they were issued for: electricity production from renewable energy sources and HEC, gas from renewable energy sources; they have been issued on a similar basis as described in the present Domain Protocol; they are not older than 12 months after the last day of the period during which the Output to which they relate was produced; an AIB member has issued them or an AIB HUB user. Only recognised GOs can be imported in the Brussels Domain and only via the AIB HUB." (E.8.2 Recognition of GOs) | AIB-2024-DPBEB-BRUGEL-Brussels Domain Protocol clean.pdf (26 Sep 2024) | PRIMARY
- Survey: "Legislation: import and export allowed only of GO's for green electricity (i.e. renewable and HEC) and gas from renewable sources, from/to countries from the European Economic Area." and "Non-RES GO's cannot be imported automatically through the registry." | survey Q3/Q4/Q4.4 (Brussels) | PRIMARY (self-reported). So CH GOs excluded (non-EEA). BRUGEL decision on recognition: https://www.brugel.brussels/publication/document/decisions/2023/fr/Decision%20223-procedure-reconnaissance-GO.pdf (cited in survey Q6.1: "BRUGEL only accepts and recognises GOs from AIB members that comply with the EECS rules. Only GOs transferred electronically via the AIB Hub are recognised").
- EXPORT: EEA destinations only (survey); regional support certificates (green certificates) "cannot be exported and used outside Belgium" (B.1, non-EECS certificates); no gas-specific export bar found.
- EX-DOMAIN: "allowed only if a formal agreement exists between the two parties involved and only if, at least, the country of consumption mentioned on the cancellation statement is 'Brussels - Capital Region, Belgium'." (C.3.5); and E.8: only "Where it is impossible to transfer GOs via the AIB HUB for technical reasons". | PRIMARY. Effectively no for gas between hub members.
- Hub flows: NO gas transfer ever recorded to/from Brugel (0.4). Brussels has almost no gas production (INFERENCE, no source) - connected on paper, unused.
### Verdicts
- Imports: EECS RES gas, EEA, under 12 months, via hub. Exports: EEA only. No flows ever.
### Open questions
- Q: Has BRUGEL issued or received any gas GO via the AIB hub, and is the gas registry live (account holders)? | Ask: BRUGEL (GO team) | Contact: https://www.brugel.brussels/ (email not verified)

## CH — Pronovo (gas GO system)
### Facts
- Role: AIB lists "Pronovo | Electricity (imports, exports) + Gas (imports only)" and the GSG page says "Pronovo currently only facilitating imports." | https://www.aib-net.org/registries ; https://www.aib-net.org/gsg | PRIMARY
- Pronovo's own page (18 Jun 2026): "Auf Grundlage der Verordnung des UVEK über den Herkunftsnachweis für Brenn- und Treibstoffe (VHBT) kann Pronovo sowohl den AIB- als auch den ERGaR-Hub nutzen, um europäische Herkunftsnachweise zu importieren." Import via AIB hub possible from AT (E-Control), BE (Brugel), CZ (OTE), FI (Gasgrid), IT (GSE), LV (Conexus), NL (Verticer), PT (REN), ES (Enagás), Albania (ERE), EE (Elering), AT (E-Control gas), SK (SPP Distribúcia). ERGaR import: DE (dena), England (GGCS), DK (Energinet). | https://pronovo.ch/import-von-gas-hkn/ | PRIMARY. The list omits FR (EEX), LT (Amber Grid), HU, SE: it predates June 2026 connections. Hub data shows FR -> CH 47,826 MWh (Jun-Aug 2026), so FR is working in practice; LT -> CH none observed (listed as not yet).
- Use in CH: no gas disclosure obligation: "The Disclosure process is not legally in place for the gas scheme." / "There is no gas GO Cancellation for Disclosure in place." (DP C.3, E.12.7). Imported GOs usable on voluntary basis (earlier note: pronovo.ch, SECONDARY).
- Survey (Switzerland - Gas): Q3 export: "No" restriction (but Q3.2 "exports need approval: Yes"); Q4 import "No"; Q4.2 imports need approval: Yes; Q8 non-EECS rejected: "Not yet". | PRIMARY (self-reported)
- EXPORT: DP E.10.2 only defines STC acceptance for exports; page says imports only. Hub flows record one CH -> ES transfer of 2,237 MWh in Aug 2026. INFERENCE: anomaly (possible re-export of imported GOs, or a first export test). Not established.
- EX-DOMAIN: "No Ex-Domain Cancellations are allowed in gas GO System." (E.12.8) | PRIMARY
- CH-issued GOs are rejected by IT (E.12.8 technical block), NL (E.10.1), PT (E.10.5), SK (E.10.6), BE-B (EEA only) and SE (survey Q4 "EECS-GOs issued in Serbia and Switzerland are blocked from import").
### Verdicts
- Destination only: CH imports from AT, BE-B(?), CZ, EE, FI, FR, IT, LV, NL, PT, SK, ES; LT, HU, SE not listed/observed. As origin: not exportable (imports only), apart from the unexplained CH->ES transfer.
### Open questions
- Q: Does Pronovo's gas GO system export GOs (the AIB hub shows one CH->ES transfer in Aug 2026), and which registries are currently active for import (LT Amber Grid, HU MEKH, SE)? | Ask: Pronovo AG (HKN BT team) | Contact: info@pronovo.ch (https://pronovo.ch/kontakt/)

## BE-Flanders (VREG / Vlaamse Nutsregulator) and BE-Wallonia (SPW Energie / CWaPE) — gas GOs (Q6)
### Facts, Flanders
- Not on the AIB gas hub: AIB table lists "Belgium - Flanders | Vlaamse Nutsregulator | Electricity" only (and "Belgium - Federal | CREG | Electricity"). | https://www.aib-net.org/registries | PRIMARY
- Flemish gas GOs exist but are national, non-EECS: the Flemish DP lists "national GOs for gases from renewable energy sources" among non-EECS certificates: "Currently these national GOs are not compatible with the EECS system, and hence cannot be traded over the AIB hub." and "(*) Non-EECS certificates may not be transferred over the AIB hub." | AIB-2024-DPBEF Domain Protocol Clean Final.pdf (C.6) | PRIMARY. Production registrar for RES-G: "the high-pressure natural gas transmission network operator, Fluxys, for national GOs for RES-G."
- Registry operator: VREG issues the gas GOs (first issued May 2020) on its V-platform; producers register with Fluxys Belgium. | web search summary of vlaamsenutsregulator.be pages (verbatim page text not retrievable by fetch); Fluxys page https://www.fluxys.com/en/natural-gas-and-biomethane/supplying-europe/belgium/production-register-for-green-gas (404 on fetch) | SECONDARY
- VREG statement (via search summary, not verified verbatim): GOs for green gas and green heat "cannot yet be traded internationally", "you cannot export GOs for heat-power coupling, GOs for green gas, or GOs for green heat outside Flanders" | https://www.vlaamsenutsregulator.be/nl/algemene-info-over-garanties-van-oorsprong | SECONDARY (summary; page text did not show it on fetch). VREG page dated 24 Aug 2026 gives no gas import/export text.
- Survey (Flanders column, mixes carriers): "Flemish HEC GOs can technically only be exported through EDC after an EDC Agreement with the IB of the destination country." and "import and export only allowed from/to countries from the European Economic Area" | survey Q3/Q4 | PRIMARY (self-reported, electricity-oriented)
- Hub data: no Flanders gas flow. VREG appears in the electricity data only.
### Facts, Wallonia
- Not on the AIB gas hub: "Belgium - Wallonia | SPW Energie | Electricity" | https://www.aib-net.org/registries | PRIMARY
- Wallonia runs "GO gaz-SER" (biomethane GOs) in the registry https://certificatsverts.wallonie.be/ , operated by SPW Energie. Cannot leave or enter: "À l'heure actuelle, les échanges de GO gaz avec d'autres régions ou pays ne sont pas possibles. Les GO gaz provenant de l'étranger ne sont pas reconnues en Wallonie." and AIB membership is "une étape nécessaire pour ouvrir le marché wallon aux échanges internationaux de GO gaz." | https://energie.wallonie.be/home/les-marches-et-les-acteurs/le-marche-des-garanties-d-origine/faq-garanties-d-origine-pour-le-gaz-renouvelable.html (via WebFetch summary, quoted phrases as returned; no page date) | PRIMARY (regional administration), verbatim wording partly via summary
- Walloon DP: "National GO (non-EECS): Biomethane injected into the network in Wallonia. Can only be used to prove the origin of gas in a cogeneration plant for support or for ETS"; "SPW is authorised to Issue the following types of energy certificates outside of the EECS Framework: Biomethane National Gas GOs" and "(*) Non-EECS certificates may not be transferred over the AIB hub." Walloon EECS = electricity only. | AIB-2024-ESG-04-02-BEW-SPW-Domain Protocol FINAL.pdf (20 Jun 2024) | PRIMARY
- Walloon ex-domain: "Ex-domain Cancellations for non EECS Certificates may be performed if transferring is impossible for technical reasons and with the agreement of the destination issuing body." (C.3.5.2); EECS: only with cancellation agreement with an EEA competent authority (C.3.5.1) | PRIMARY (no gas ex-domain agreement found)
- Survey Q8.1 (Wallonia): non-EECS GOs rejected - "Legal condition of mutual recognition was not met. Not connected to Hub." | PRIMARY (self-reported)
### Verdicts
- BE-Flanders and BE-Wallonia gas GOs: no AIB gas connection; national certificates that cannot leave or enter (Wallonia explicit; Flanders per DP). Treat every route from/to FL and WA via the GO route as N (no hub, no ex-domain agreement found). Route via the Brussels registry (the only Belgian AIB gas registry) is not available to Flemish/Walloon plants either (their GOs are issued in their own registries; regional GOs are not recognised by Brussels per its recognition list: only EECS GOs issued by an AIB member).
### Open questions
- Q: Do Flemish (VREG) green-gas GOs have any export route today (EECS conversion, hub or ex-domain agreement), and what is the planned date for hub connection? | Ask: Vlaamse Nutsregulator (VREG) GO team | Contact: https://www.vlaamsenutsregulator.be/nl/contact
- Q: Same question for Wallonia: any timetable for AIB gas membership and whether any bilateral/ex-domain agreement exists? | Ask: SPW Energie, Département de l'Énergie (GO gaz) | Contact: https://energie.wallonie.be/ (contact form)

## 16 x 16 matrix (origin rows, destination columns) — AIB gas hub route only

Codes: **P-obs** = possible by rule AND AIB's own hub dataset records completed gas transfers on this corridor (Jan 2024 - Aug 2026, section 0.4); **P-test** = hub dataset shows only test-size transfers (5 MWh or less); **P-rule** = possible by rule (both registries on the AIB gas hub, no bar found in either domain protocol; AIB statement "seamlessly transfer gas GOs between all members"; no hard "must accept everyone" clause exists, see 0.2) but no transfer recorded; **N** = not possible, reason in the note; **Q** = not settled by public sources. Notes in brackets. BE-B = Brussels (Brugel). BE-Flanders and BE-Wallonia are not in the matrix: all their routes are N (no AIB gas connection, see their section).

| origin \ dest | AT | BE-B | CZ | EE | FI | FR | HU | IT | LV | LT | NL | PT | SK | ES | SE | CH |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **AT** | - | P-rule[d,f] | P-obs[f] | P-rule[c,f] | P-test[f] | P-obs[f] | P-rule[d,f] | P-rule[b,f] | P-obs[f] | P-obs[f] | P-test[f] | P-rule[f] | P-rule[d,f] | P-obs[f] | Q[s] | P-obs[f] |
| **BE-B** | P-rule[j] | - | P-rule[j] | P-rule[c,j] | P-rule[j] | P-rule[a,j] | P-rule[d] | P-rule[b,j] | P-rule[j] | P-rule[j] | P-rule[j] | P-rule[j] | P-rule[d] | P-rule[j] | Q[s] | N[h] |
| **CZ** | P-rule | P-rule[d] | - | P-rule[c] | P-obs | P-test[a] | P-rule[d] | P-rule[b] | P-obs | P-obs | P-obs | P-rule | P-rule[d] | P-obs | Q[s] | P-obs |
| **EE** | P-rule | P-rule[d] | P-obs | - | P-obs | P-rule[a] | P-rule[d] | P-rule[b] | P-rule | P-rule | P-rule | P-rule | P-rule[d] | P-rule | Q[s] | P-rule |
| **FI** | P-obs | P-rule[d] | P-obs | P-rule[c] | - | P-rule[a] | P-rule[d] | P-rule[b] | P-obs | P-obs | P-obs | P-rule | P-rule[d] | P-obs | Q[s] | P-rule |
| **FR** | P-obs | P-rule[d] | P-test | P-obs[c] | P-obs | - | P-rule[d] | P-test[b] | P-rule | P-test | P-obs | P-obs | P-rule[d] | P-obs | Q[s] | P-obs |
| **HU** | P-rule[j] | P-rule[d] | P-rule[j] | P-rule[c,j] | P-rule[j] | P-rule[a,j] | - | P-rule[b,j] | P-rule[j] | P-rule[j] | P-rule[j] | P-rule[j] | P-rule[d] | P-rule[j] | Q[s] | Q[c1] |
| **IT** | P-rule[e] | P-rule[d,e] | P-rule[e] | P-rule[c,e] | P-rule[e] | P-rule[a,e] | P-rule[d,e] | - | P-rule[e] | P-rule[e] | P-rule[e] | P-rule[e] | P-rule[d,e] | P-rule[e] | Q[s] | P-obs[e] |
| **LV** | P-obs | P-rule[d] | P-obs | P-rule[c] | P-obs | P-rule[a] | P-rule[d] | P-rule[b] | - | P-obs | P-obs | P-rule | P-test | P-obs | Q[s] | P-obs |
| **LT** | P-rule | P-rule[d] | P-obs | P-rule[c] | P-obs | P-rule[a] | P-rule[d] | P-rule[b] | P-test | - | P-obs | P-test | P-rule[d] | P-obs | Q[s] | Q[c1] |
| **NL** | P-obs | P-rule[d] | P-obs | P-rule[c] | P-obs | P-obs | P-rule[d] | P-test[b] | P-obs | P-obs | - | P-rule | P-rule[d] | P-obs | Q[s] | P-obs |
| **PT** | P-rule | P-rule[d] | P-rule | P-rule[c] | P-rule | P-rule[a] | P-rule[d] | P-rule[b] | P-rule | P-test | P-rule | - | P-rule[d] | P-rule | Q[s] | P-rule |
| **SK** | P-rule[i] | P-rule[d,i] | P-obs[i] | P-rule[c,i] | P-rule[i] | P-rule[a,i] | P-rule[d,i] | P-rule[b,i] | P-obs[i] | P-rule[i] | P-rule[i] | P-rule[i] | - | P-rule[i] | Q[s] | P-rule[i] |
| **ES** | P-obs | P-rule[d] | P-obs | P-rule[c] | P-obs | P-rule[a] | P-rule[d] | P-rule[b] | P-obs | P-obs | P-obs | P-obs | P-rule[d] | - | Q[s] | P-obs |
| **SE** | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | Q[s] | - | Q[s] |
| **CH** | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | N[g] | Q[g2] | N[g] | - |
Notes
- [s] SE: Energimyndigheten is declared hub-connected in the AIB Gas Scheme from 20 Aug 2026 (EECS gas GOs possible from 1 Sep 2026), but no transfer exists yet, its own FAQ pages still say "not yet", and its DP R5 (26 Aug 2026) is still future-tense. Q until the first transfer or a fresh Energimyndigheten statement. (SE as origin or destination.) Import side would also refuse CH-issued GOs.
- [g] CH origin: Pronovo gas is "imports only" (AIB registries table and GSG page; DP gas chapter defines no gas export route). N. [g2] CH->ES: the hub dataset shows one 2,237 MWh transfer Aug 2026, contradicting "imports only" -> Q (open question in the CH section).
- [h] BE-B -> CH: Brussels trades only with the EEA ("import and export allowed only of ... gas from renewable sources, from/to countries from the European Economic Area"); CH is not EEA. N.
- [c1] LT -> CH and HU -> CH: Pronovo's own import list (18 Jun 2026) names neither Amber Grid nor MEKH, no transfer observed. Q.
- [a] Destination FR: EEX refuses imported EECS gas GOs that lack the ETS/ESR eligibility tag ("In case this information is missing, the EECS GOs are refused"); non-EECS refused. Observed delivering to FR: NL, AT (and test sizes from CZ, LT). For other origins it depends on whether their GOs carry the tag: possible only if tagged. [Treat P-rule cells with [a] as conditional.]
- [b] Destination IT: GSE accepts hub imports, but a gas GO can be cancelled in Italy only with sustainability compliance, gas usage and GHG data ("If a single condition is not respected the GAS GO cannot be cancelled in Italy"); only test-size imports ever seen (FR, NL). Possible to transfer; usable only with full sustainability data. Conditional.
- [c] Destination EE: imported biomethane GOs serve disclosure only, not national targets; DP C.4 says energy behind imported GOs "shall not have received support via national public support schemes" (INFERENCE: supported-origin GOs may be refused). Only FR -> EE (1,000 MWh) seen.
- [d] Destination HU / BE-B / SK: registries are on the hub on paper but have received no gas transfer ever (HU imports need MEKH approval per AIB survey; BE-B recognises only EECS RES gas under 12 months from EEA; SK imports must satisfy E.10.7 for ETS/transport use). Possible by rule, unproven in practice.
- [e] Origin IT: supported (Ministerial Decree 2018 and 2022) transport/other-use gas GOs "cannot be exported"; only unsupported GOs and GOs for electricity production can. Only IT -> CH has been observed.
- [f] Origin AT: GOs from supported production "cannot be traded internationally" (DP C.4, electricity wording; survey says "Subsidised Gos can't be exported"); unclear for gas -> supported-plant GOs possibly not exportable. Open question in AT section.
- [i] Origin SK: only EECS-standard GOs travel over AIB; SK GAS standard GOs are ERGaR-only.
- [j] Origin HU / BE-B: no gas transfer ever sent; possible by rule only.
- Every cell excludes ex-domain cancellation: EE, ES, IT, NL, SE, AT (exceptional), CH state it is not allowed; FR, FI, SK, BE-B, PT, CZ, HU, LV, LT allow it only where there is no hub path or toward non-AIB domains, with an agreement. So there is no ex-domain fallback between two hub members.
- Destination CH also refuses/limits nothing for these origins besides the Q cells; origin CH-issued GOs are refused by IT, NL, PT, SK, BE-B and SE if they were ever imported.

Counts: 240 off-diagonal cells; P-obs 57, P-test 11, P-rule 125 (many conditional per notes), N 15, Q 32 (29 involve SE, plus LT->CH, HU->CH, CH->ES).

## Searched but not found
- A hard EECS Rule or Gas Scheme rule obliging every hub member to accept every import (searched full EECS Rules R8 v1.11, AIB registries and hub pages, GSG page; Gas Scheme-specific Rules/Product Rules page not separately retrievable).
- The footnote text behind the asterisk in AIB's 1 Jun 2026 news ("transfer gas GOs between all 15 members of the AIB Gas Scheme.*").
- Energimyndigheten statement dated after 20 Aug 2026 confirming gas EECS issuance/hub transfers (its FAQ pages are undated and say "not yet"); any Swedish gas transfer in AIB data.
- Italy: a newer GSE domain protocol than the July 2024 version; Spain: a newer Enagás gas protocol than Dec 2023; Estonia: protocol newer than Dec 2024; Brussels: newer than Sep 2024; all show older text than the June 2026 gas-hub connections.
- VREG (Flanders) verbatim current statement on gas GO export (fetched pages showed no gas export text; only a search summary and the Flemish DP statement); a Flemish/Walloon ex-domain agreement for gas.
- Verified contact emails for the open-question bodies (only contact-page URLs, plus info@pronovo.ch, are confirmed).
- Content of the "Hub Transfer Flows" tool for electricity was not used; gas flows are AIB's own dataset to Aug 2026 and may exclude later transfers.
