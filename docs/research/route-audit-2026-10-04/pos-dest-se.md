# PoS / mass-balance route, DESTINATION acceptance (FR IT ES PT CZ PL SK HU SI HR RO BG GR EE LV LT LU) — findings (accessed 2026-10-04)

Status: written incrementally; see "Not yet researched" at the end for what is still missing.

## EU baseline (applies to every destination)
### Facts
- The EU interconnected gas grid is one single mass-balance system | https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R0996 (Implementing Reg. 2022/996, saved C:\Dev\route-audit\_pdf\r996.pdf) recital (5) | "In case of gaseous fuels, the EU interconnected grid is considered as one single mass balancing system. Gaseous fuels produced and consumed off the grid or through isolated local distribution networks are to be considered as separate mass balancing systems." | PRIMARY
- Mixing in the gas grid only counts where the infrastructure is interconnected | same, Art. 19(1)(d) | "fuels introduced into a logistical facility or a transmission or distribution infrastructure such as the gas grid ... shall only be considered to be part of a mixture ... where that infrastructure is interconnected" | PRIMARY
- Union Database tracing | same, Art. 18(3) | "registered in the Union database at the first entry point and registered out as consumed at the point of final consumption" | PRIMARY
- INFERENCE: EU law permits cross-border mass balance between interconnected grids; whether a national scheme COUNTS an imported volume is a national rule, checked per country below. Physical grid interconnection is required.

## FR — TIRUERT (art. 266 quindecies Code des douanes) and CPB (certificats de production de biogaz, Code de l'énergie L.446-31 ff.)
### Facts
- TIRUERT is the French transport-fuel incentive tax; only sustainable renewable fuels count | https://www.ecologie.gouv.fr/sites/default/files/documents/Guide%202026%20sur%20fiscalit%C3%A9%20des%20%C3%A9nergies.pdf | "Seuls les biocarburants ou les carburants d'origine renouvelable répondant à des critères de durabilité stricts peuvent être pris en compte pour le calcul de la réduction du taux de la taxe." (Only biofuels/renewable fuels meeting strict sustainability criteria count) | PRIMARY
- The Customs 2025 TIRUERT circular has no biomethane/gas-grid provisions (full-text grep, only generic "biogaz pour le transport" in a methodology reference) | https://www.douane.gouv.fr/sites/default/files/ba_files/da/2025-07/Circulaire%20TIRUERT%202025.pdf | n/a | PRIMARY (absence)
- Biomethane (bioGNV) is NOT confirmed in TIRUERT: PLF 2026 amendments (e.g. Senate I-1186) sought to add "biométhane carburant" from 1 Jan 2026, saying otherwise it lacks a legal basis; I could not confirm adoption in the final finance law | https://www.senat.fr/amendements/2025-2026/138/Amdt_I-1186.html (read via summariser, not verbatim) | amendment excludes quantities under purchase-obligation contracts (Code énergie L.446-1 to L.446-55); no cross-border condition seen | SECONDARY
- CPB are for biogas injected in French networks | https://codes.droit.org/PDF/Code%20de%20l'%C3%A9nergie.pdf L.446-31 | "Le dispositif de certificats de production de biogaz vise à favoriser la production de biogaz injecté dans les réseaux de gaz naturel" | PRIMARY
- CPB exclude fuel use and only French-injected biomethane generates CPB; the Commission contests the national character | https://www.gaz-mobilite.fr/dossiers/cpb-certificat-production-biomethane-comment-ca-marche/ (updated 26 Sep 2026) | "seul le biométhane injecté en France génère des CPB" ; "En sont exclus ... les consommations de gaz naturel carburant (GNV)" ; "C'est aussi ce caractère national que conteste aujourd'hui Bruxelles" | SECONDARY
- CPB obligation on gas suppliers for residential/tertiary heating from 1 Jan 2026 (same page) | SECONDARY

### Verdicts
- TIRUERT (biomethane carburant): PoS import from any origin = OPEN QUESTION (biomethane leg not confirmed in force; no cross-border rule found).
- CPB (heat/building): NOT POSSIBLE for foreign biomethane (only biomethane injected in France generates CPB).

### Open questions
- Q: Is biomethane carburant eligible under TIRUERT for 2026 (art. 266 quindecies as amended by the 2026 finance law)? If yes, may it be biomethane injected in another Member State and delivered by mass balance with a PoS, or must it be injected in the French network / backed by a French GO? | Ask: DGDDI (French Customs), TIRUERT desk | Contact: https://www.douane.gouv.fr/contactez-nous (generic; no TIRUERT mailbox found)

## ES — transport biofuel obligation (RD 1085/2015, Orden TED/728/2024, SICBIOS) and GdO (RD 376/2022, Orden TED/1026/2022)
### Facts
- Biogas counts for the transport obligation ONLY if recognised by the Spanish renewable-gas GdO system and used in transport | https://www.boe.es/eli/es/o/2024/07/15/ted728/con/20250306 (saved _pdf\ted728.txt), definition of Biogás | "A efectos de esta orden sólo se considerará el biogás y sus derivados que se utilicen en el sector del transporte y que sean reconocidos por el sistema de garantías de origen de gases renovables" (only biogas used in transport and recognised by the renewable-gas GO system counts) | PRIMARY
- Counting rule | same, certification annex | "será la suma de las cantidades de gases renovables sobre las que se haya asociado una garantía de origen de gases renovables redimida con uso final en transporte" plus conditions: plant under EC-approved voluntary scheme and "Cuenten con una prueba de sostenibilidad" | PRIMARY
- Quantities are assigned to the obligated party owning the GdO redeemed in the month; the GdO body (Enagás GTS) verifies | same, "actuará como sujeto de verificación" | PRIMARY
- Mass balance in RD 376/2022 applies irrespective of origin | https://www.boe.es/diario_boe/txt.php?id=BOE-A-2022-8121 art. 9 | "con independencia de que los biocarburantes ... se produzcan en la Unión Europea o se importen" | PRIMARY
- Imported EU GdOs: importable if issued under Directive 2018/2001 (Enagás FAQ, draft); Enagás is on AIB gas hub; no ex-domain cancellations | registry-hub-connectivity-2026-10-04.md | PRIMARY (draft)
- A May 2026 draft "Real Decreto de impulso del biometano" exists (not analysed) | https://www.miteco.gob.es/content/dam/miteco/es/energia/files-1/es-ES/Participacion/Documents/anexos/aeip-rd-biometano/Texto%20RD%20impulso%20biometano.pdf | PRIMARY (draft)

### Verdicts
- Pure PoS/mass-balance delivery with no Spanish GdO redeemed: NOT POSSIBLE for the transport obligation (the rule is GdO-based).
- Via GO: foreign biomethane counts only after an EU GO is imported into Enagás via AIB and redeemed with transport end use, with PoS. That is the GO route (origins = AIB gas-hub members); not verified end-to-end.

### Open questions
- Q: May a GO imported via AIB from another Member State be redeemed in the Enagás register with end use "transport" and used by an obligated party in SICBIOS, with the origin PoS as sustainability evidence? | Ask: Enagás GTS (GdO team) and MITECO SG Hidrocarburos (SICBIOS) | Contact: https://www.enagas.es/es/gestion-tecnica-sistema/ ; https://miteco.gob.es/en/energia/hidrocarburos-nuevos-combustibles/biocarburantes.html (mailbox not verified)

## CZ — gas-supplier advanced biomethane obligation (Act 165/2012 §47d) and GHG reduction (Act 201/2012)
### Facts
- Obligation on suppliers of gaseous motor fuels, double-counted | https://www.zakonyprolidi.cz/cs/2012-165 (consolidated 01.08.2026; saved _pdf\z165.txt) §47d(1),(2) | "5,5 % energetických od 1. ledna 2030 ... přičemž minimální množství obnovitelného paliva nebiologického původu musí činit 1 % energetických" ; 1.25% 2026, 1.5% 2027, 2.5% 2028, 3.75% 2029 | PRIMARY
- NO origin restriction; evidence is GO or other sustainability proof | §47d(3)(a)1 | "splnění kritérií udržitelnosti a úspor emisí skleníkových plynů prokazuje dodavatel plynných pohonných hmot uplatněním záruky původu nebo jiným dokladem o splnění kritérií udržitelnosti" (the supplier proves compliance by applying a GO or another proof of sustainability) | PRIMARY
- Must be consumed in the Czech tax territory | §47d(3)(b) | "byl nebo bylo na daňovém území České republiky spotřebován nebo spotřebováno" | PRIMARY
- No double counting in another Member State, shown by a declaration from the issuer of the proof | §47d(3)(c) | "nebyl nebo nebylo zohledněn ... na území jiného členského státu ... čestné prohlášení vydané osobou, která je oprávněna vydat doklad o splnění kritérií udržitelnosti" | PRIMARY
- Mass-balance required for proof of biomass origin | https://www.zakonyprolidi.cz/cs/2012-201 | "musí k prokázání původu biomasy využít systém hmotnostní bilance" | PRIMARY
- Secondary expectation that much European biomethane will be imported to meet the obligation | https://www.energynomics.ro/en/6-measures-in-the-czech-republics-biomethane-action-plan/ | SECONDARY
- OTE (CZ) is on the AIB gas hub (registry-hub file) | PRIMARY

### Verdicts
- Transport (§47d): PoS import from ANY EU origin = POSSIBLE on the text (no origin restriction). Conditions: advanced-biomethane feedstock, sustainability + GHG proof (GO or PoS), consumed in CZ, not claimed in another state. Physical flow/same-grid is not written in §47d (INFERENCE: EU baseline needs interconnected grid). Treatment of subsidised volumes not addressed in §47d.

### Open questions
- Q: Does the Czech Environmental Inspectorate accept a foreign ISCC EU/REDcert PoS on mass-balance delivery without a GO, and what delivery evidence into the Czech grid is required? | Ask: Česká inspekce životního prostředí / MŽP odbor ochrany ovzduší | Contact: https://www.cizp.cz (kontakty)

## IT — obligation to put into consumption (D.Lgs. 199/2021 art. 39; DM 16 Mar 2023 n.107; CIC under DM 2 Mar 2018 / DM 15 Sep 2022 n.340)
### Facts
- Obligated parties include suppliers of methane for road/rail transport (DM 107 as amended 20 Oct 2023) | https://www.certifico.com/id/20787 (mirror of official text) | "soggetti che immettono in consumo benzina, gasolio, metano, per i trasporti stradali e ferroviari" | SECONDARY (mirror)
- Biomethane CIC follow DM 2 Mar 2018 rules | DM 107 art. 6(3) | "L'immissione in consumo di biometano dà diritto a ricevere i certificati secondo le prescrizioni ed i requisiti previsti dal decreto del D.M. 2 marzo 2018." | SECONDARY (mirror)
- Policy intent of DM 2018: replace imported biodiesel with domestic biomethane | https://www.certifico.com/news/decreto-2-marzo-2018 | "si sostituiscano biocarburanti per lo più di importazione (biodiesel) con biometano prodotto sul territorio nazionale" | SECONDARY
- GSE rules (Procedure applicative / Allegato Regole DM 16 marzo 2023) could not be downloaded (HTTP 403 for automated access), so treatment of biomethane injected abroad is NOT verified.
- As an origin, Italian GOs from supported transport plants cannot be exported (registry-hub file) | PRIMARY

### Verdicts
- Foreign-injected biomethane for CIC: OPEN QUESTION. INFERENCE only: the incentive and CIC are built around Italian producers; no text found that allows CIC for biomethane injected abroad.

### Open questions
- Q: Does GSE issue CIC (DM 16 March 2023 / DM 2 March 2018) to obligated parties for biomethane injected in another Member State and delivered via the interconnected grid under mass balance with a PoS? | Ask: GSE, obbligo di immissione in consumo / BIOCAR | Contact: https://www.gse.it/contatti

## PL — National Indicative Target, NCW (ustawa z 25.08.2006 o biokomponentach i biopaliwach ciekłych, as amended by the act of 21 Feb 2025, Dz.U. 2025 poz. 303)
### Facts
- NCW is 14.9% (2030 level); obligation counts fuels disposed of or consumed on Polish territory | https://www.inforlex.pl/dok/tresc,DZU.2025.188.0000901,USTAWA-z-dnia-25-sierpnia-2006-r-o-biokomponentach-i-biopaliwach-cieklych.html (consolidated, saved _pdf\pl.txt) art. 23(1),(1g) | "rozporządzanych przez dokonanie jakiejkolwiek czynności prawnej lub faktycznej skutkującej trwałym wyzbyciem się ... na terytorium Rzeczypospolitej Polskiej lub zużywanych przez ten podmiot na potrzeby własne na tym terytorium" ; "Wysokość Narodowego Celu Wskaźnikowego wynosi 14,9 %" | PRIMARY (consolidated mirror of the official text)
- Biomethane is a biocomponent (art. 2 definition refers to biomethane under the RES Act art. 2 pt 3c) and the NCW list includes gaseous recycled-carbon fuels and biomethane | same, art. 2 | "biometan – biometan w rozumieniu art. 2 pkt 3c ustawy z dnia 20 lutego 2015 r. o odnawialnych źródłach energii" | PRIMARY
- Foreign sustainability documents ARE accepted | art. 28c(2) | "Za dokumenty ... uznaje się również dokumenty wystawione: 1) w innym niż Rzeczpospolita Polska państwie członkowskim Unii Europejskiej ... lub w kraju trzecim, pod warunkiem że zostały wystawione w ramach uznanego systemu certyfikacji" (documents issued in another EU Member State under a recognised scheme are accepted) | PRIMARY
- Mass balance is the verification method | art. 28be(1) | "Potwierdzenie spełnienia kryteriów zrównoważonego rozwoju ... odbywa się przez system bilansu masy" | PRIMARY
- Press summary: biomethane injected in the gas grid and reaching bioCNG/bioLNG stations will count for NCW; NCW part applies from 1 Jan 2026 | https://magazynbiomasa.pl/biometan-bedzie-elementem-ncw-biokomponenty-i-biopaliwa-z-nowa-ustawa/ ; gov.pl Ministry release | SECONDARY. The article does not address imported biomethane.
- No text found that requires the biomethane to be produced or injected in Poland. Poland is on neither AIB nor ERGaR hub (registry-hub file).

### Verdicts
- PoS import from other EU states: LIKELY POSSIBLE on the text (documents from other Member States under recognised schemes accepted; consumption must be in Poland), but the biomethane/gas-grid mechanics (who is the obligated party, what evidence for gas withdrawn at a Polish CNG station, delivery proof from a foreign injection point) are NOT verified. Treat as OPEN QUESTION pending URE confirmation. Physical connection needed: PL is connected to DE (Mallnow/Lasów), CZ, SK, LT (GIPL) - INFERENCE.

### Open questions
- Q: For NCW, how is biomethane injected in another Member State and delivered through the interconnected grid recognised (świadectwo/poświadczenie by URE), and is a foreign ISCC/REDcert PoS with delivery proof sufficient? | Ask: Urząd Regulacji Energetyki (URE), NCW team | Contact: https://www.ure.gov.pl/pl/kontakt

## PT — fuel-supplier incorporation targets (Decreto-Lei 84/2022, arts. 8, 10, 40-41; TdB/TdC titles issued by ENSE) 
### Facts
- Fuel suppliers must incorporate low-carbon fuels (11% 2022, 13% 2025, 16% 2029) and an advanced biofuel/biogas sub-target (2.0% 2025-26, 10% 2030), proven by TdB/TdC titles | https://files.dre.pt/1s/2022/12/23600/0000800045.pdf (saved _pdf\dl84.txt) art. 8(1)-(3) | "O cumprimento do disposto no número anterior é comprovado mediante a apresentação do correspondente número de títulos de biocombustível (TdB) ou títulos de baixo carbono (TdC)" | PRIMARY
- Sustainability counts irrespective of geographic origin; fuel must be consumed in Portugal | art. 10(1) | "apenas são considerados os biocombustíveis, os biolíquidos e os combustíveis biomássicos consumidos em território nacional que cumpram os critérios de sustentabilidade ... independentemente da sua origem geográfica" (counts if consumed domestically and sustainable, regardless of origin) | PRIMARY
- TdB = biofuels and biogas destined for the national market; issued to the supplier OR IMPORTER | art. 40(1), 41(2) | "Cada TdB é representativo de 1 tep de biocombustíveis e biogás destinados ao mercado nacional para consumo em todos os modos de transporte" ; "emitido a favor do fornecedor ou importador de combustíveis de baixo teor em carbono" | PRIMARY
- Importers of biofuel and biogas are explicitly recognised actors (reporting duty, bonus quotas) | arts. 9(b), 42(1) | "Os importadores de combustíveis de baixo teor em carbono para transportes informam sobre a quantidade por si importada" | PRIMARY
- GO for gas is separate (disclosure, not target compliance) | art. 28(2) | "não contribuindo, por si, para o cumprimento das metas estabelecidas no artigo 3.º" | PRIMARY
- REN (PT) is on the AIB gas hub; supported volumes get no GOs (registry-hub file) | PRIMARY
- Not found: any text that says how biomethane delivered by mass balance through the grid (rather than imported as a shipment) earns TdB, or the ENSE/DGEG regulation (portaria) governing evidence.

### Verdicts
- PoS import from EU origins: OPEN QUESTION leaning POSSIBLE. The law is origin-neutral and recognises importers, requires consumption in Portugal and sustainability proof; the grid/mass-balance TdB procedure for biomethane is not documented in what I could read. Physical route: PT grid connects only to ES (INFERENCE), so any non-Iberian origin depends on ES transit.

### Open questions
- Q: Does ENSE issue TdB under DL 84/2022 for biomethane injected in another Member State and delivered into the Portuguese grid (via Spain) under mass balance with a PoS, and what evidence of delivery does it require? | Ask: ENSE, E.P.E. (with DGEG) | Contact: https://www.ense-epe.pt/contactos/

## HU — transport biofuel quota / GHG reduction (2010. évi CXVII. törvény "Büat."; 821/2021. (XII. 28.) Korm. rendelet) 
### Facts
- Obligation on fuel distributors to meet a mandatory biofuel share; biofuel without proof of sustainable production is disregarded | https://mkogy.jogtar.hu/jogszabaly?docid=a1000117.TV (saved _pdf\hu_a1000117.txt) Büat. 5. § (2)(a) | "azt a forgalomba hozott bioüzemanyagot, amelynek fenntartható módon történő előállítását az arra kötelezett nem igazolja" | PRIMARY
- Biomethane injected in the gas transmission/distribution pipeline counts only with (a) a sustainability declaration and (b) a Hungarian-registry GO booked to the fuel distributor's account | https://net.jogtar.hu/jogszabaly?docid=a2100821.kor (saved _pdf\hu_a2100821.txt), para (1a) (section number not confirmed) | "a) a biometán előállítója, vagy a biometánt az üzemanyag-forgalmazónak értékesítő személy által kiállított fenntarthatósági nyilatkozat; b) annak igazolása, hogy a biometán mennyiségére kiállított származási garancia a megújuló gázok származásának igazolásáról szóló külön jogszabályban meghatározott számlarendszerben az üzemanyag-forgalmazó forgalmi számlájára fel lett vezetve." (a sustainability declaration by the producer or the seller to the distributor AND proof that the GO issued for that quantity was booked to the distributor's trading account in the Hungarian renewable-gas GO system) | PRIMARY
- Same rule for gaseous motor fuels from biomass: where a GO was issued, its use in the account system must be shown (para (1)(d)) | same | "amennyiben ahhoz ... származási garancia kiállítására került sor, a számlarendszerben történő felhasználás igazolása" | PRIMARY
- Counting must occur within the GO validity period; the distributor reports the use to the GO account operator, and the operator keeps a register of biomethane counted for the obligation (paras (1b)-(1d)) | same | PRIMARY
- Documents issued under other Member States' RED transposition or EC-recognised voluntary schemes are accepted as sustainability evidence | same, definition of "igazolás" | "az (EU) 2018/2001 ... 29–31. cikkének átültetését szolgáló más tagállami jogszabály szerint kiállított dokumentum" | PRIMARY
- MEKH (HU) is on the AIB gas hub (registry-hub file) | PRIMARY

### Verdicts
- Pure PoS delivery without a Hungarian GO: NOT POSSIBLE for the biomethane-in-pipeline route (the GO in the HU account is mandatory).
- Foreign biomethane counts only after its EU GO is imported into the MEKH register via AIB and booked to the distributor, plus a sustainability declaration (PoS from another Member State accepted). That is a GO-plus-PoS route; origins = AIB gas-hub members. Whether MEKH will take imported GOs for this purpose is not verified (INFERENCE).

### Open questions
- Q: Can a GO imported through AIB from another Member State be booked to a fuel distributor's account at MEKH and used for the Büat. 5. § obligation together with a foreign PoS? | Ask: MEKH (Magyar Energetikai és Közmű-szabályozási Hivatal), GO registry | Contact: https://www.mekh.hu/kapcsolat

## LV — Transport Energy Law (Transporta enerģijas likums, in force 1 Jan 2026) and Cabinet regulation on GHG-intensity reduction
### Facts
- Fuel suppliers must reach renewable shares (5.5% by 2030, min 1% non-biological) and GHG-intensity cuts (16% from 2030); penalty 90 EUR per unreduced tonne | https://lvportals.lv/skaidrojumi/384518-ar-jaunu-likumu-zalinas-transporta-energiju-un-attistis-alternativas-degvielas-infrastruktura-2026 (via summariser) | n/a | SECONDARY
- Gas-grid biomass fuel (biomethane) counts only if its origin is proven by a GAS GUARANTEE OF ORIGIN issued under Latvian energy law, where the fuel is sold for transport through the Latvian gas transmission or distribution system | https://likumi.lv/ta/id/369580 (saved _pdf\lv369580.txt), points 12.1 and 20.1 (some points effective 01.01.2030; numbering of the in-force part not confirmed) | "Biomasas degvielas var ņemt vērā emisiju ietaupījuma aprēķinā, ja to izcelsmi pamato ar: 12.1. gāzes izcelsmes apliecinājumiem, kas ir izdoti saskaņā ar normatīvajiem aktiem par enerģētiku, ja attiecīgais atjaunīgās transporta enerģijas veids ir realizēts patēriņam transportā, izmantojot Latvijas dabasgāzes pārvades vai sadales sistēmu; 12.2. biomasas degvielas piegādi apliecinošu dokumentu ... neizmantojot dabasgāzes pārvades vai sadales sistēmu." (biomass fuels count if origin is proven by gas GOs issued under the energy laws when sold for transport via the Latvian gas system; or by a supply document when delivered without the gas system) | PRIMARY
- Cabinet sustainability regulation recognises the EU interconnected gas infrastructure as one mass-balance system | https://likumi.lv/ta/id/336963 (MK regs, point 47.112, as amended 27.01.2026) | "gāzveida biomasas kurināmā vai biomasas degvielas ievadīšanu regulas Nr. 2022/996 2. panta 18. punktā minētajā starpsavienotajā infrastruktūrā, kuru uzskata par vienotu masas bilances sistēmu" | PRIMARY
- Volume sold on to another fuel supplier is not counted again (point 13/21) | same | PRIMARY
- Conexus (LV) is on the AIB gas hub (registry-hub file) | PRIMARY

### Verdicts
- Pure PoS mass balance without a Latvian GO: NOT POSSIBLE for gas sold through the Latvian grid (GO required).
- Foreign biomethane counts only if an EU GO is imported into the Conexus register via AIB (hub members) and used with the PoS. GO route, not verified end-to-end (INFERENCE). Whether imported GOs qualify as "gāzes izcelsmes apliecinājumi" under the energy laws was not checked.

### Open questions
- Q: Does Conexus (GO issuer) accept GOs imported via AIB for the Transport Energy Law fuel-supplier obligation, and is a foreign PoS sufficient sustainability evidence? | Ask: Conexus Baltic Grid (GO registry) and Ministry of Climate and Energy (KEM) | Contact: https://www.conexus.lv ; https://www.kem.gov.lv (contact pages not verified)

## SK — Act 309/2009 (obligations of fuel marketers) / Act 137/2010 (air protection)
### Facts
- Act 309/2009 sets rights and duties of persons placing motor fuels on the market for transport (2018 consolidated text read) | https://static.slov-lex.sk/pdf/SK/ZZ/2009/309/ZZ_2009_309_20180101.pdf | "práva a povinnosti právnickej osoby alebo fyzickej osoby, ktorá uvádza na trh pohonné látky a iné energetické produkty používané na dopravné účely" | PRIMARY (OLD 2018 version)
- The current Slovak transport-obligation text could not be retrieved (recent slov-lex PDFs blocked), so rules for gaseous biomethane in the transport obligation are NOT verified. SPP-distribúcia (SK) is on both AIB and ERGaR (registry-hub file).

### Verdicts
- OPEN QUESTION (no current source read).

### Open questions
- Q: Under the current Slovak fuel-supplier GHG-reduction/renewable-transport obligation, can biomethane injected in another Member State and delivered via the interconnected grid by mass balance with a PoS be counted, or is a Slovak GO required? | Ask: Ministerstvo životného prostredia SR, odbor politiky zmeny klímy (biopalivá), and SPP-distribúcia (GO registry) | Contact: https://www.minzp.sk/klima/obnovitelne-zdroje-energie/biopaliva-biokvapaliny/

## EE — transport fuel sellers' renewable obligation (liquid fuel act; Elering origin certificates)
### Facts
- Secondary summary of Elering material: fuel sellers must supply a renewable share (biofuel, biomethane, renewable electricity); biomethane counts as supplied for final consumption if fed into the network or physically supplied for road/rail transport; Elering issues one origin certificate per MWh of biomethane | https://elering.ee/gaasituru-kasiraamat/8-biometaan/88-biometaani-tootmise-ja-tarbimise-toendamine/biometaani (search summary; direct fetch returned 404) | n/a | SECONDARY
- Elering (EE) is on the AIB gas hub; ex-domain cancellations not permitted (registry-hub file) | PRIMARY
- Legal text (Liquid Fuel Act / regulation, Riigi Teataja) not retrieved.

### Verdicts
- OPEN QUESTION. INFERENCE: the described mechanism is certificate-based (Elering GO), so a pure PoS delivery likely would not suffice.

### Open questions
- Q: May a fuel seller meet the Estonian renewable-fuel obligation with biomethane injected in another Member State (imported GO via AIB plus PoS), or only with Elering-issued certificates for Estonian production? | Ask: Elering AS (gas GO registry) and Kliimaministeerium | Contact: https://elering.ee (contact page not verified)

## LT — fuel-supplier obligations (advanced biofuels/RFNBO 3.5% in 2030; GHG reduction)
### Facts
- Secondary (PwC Lithuania summary): suppliers must supply advanced biofuels or RFNBO, at least 3.5% in 2030; biomethane is an eligible advanced fuel | https://www.pwc.com/lt/lt/apie-mus/naujienos/pasiulyme-del-red-ii-atnaujinimo-nauji-tikslai-transporto-sektoriui.html (search summary) | n/a | SECONDARY
- Amber Grid (LT) is on AIB gas hub and joined ERGaR in April 2026 (registry-hub file) | PRIMARY
- Legal text and any origin condition not retrieved.

### Verdicts
- OPEN QUESTION.

### Open questions
- Q: Does the Lithuanian fuel-supplier obligation accept biomethane injected in another Member State by mass balance with PoS, or require an Amber Grid GO / domestic injection? | Ask: Lithuanian Ministry of Energy and Amber Grid (GO registry) | Contact: https://enmin.lrv.lt ; https://www.ambergrid.lt (not verified)

## RO — biomethane framework (OUG 59/2025, OUG 9/2026) and transport fuel-supplier obligations
### Facts
- Romania adopted emergency ordinances modifying the Energy and Gas Law to regulate biomethane injection; gas suppliers/traders may sell biomethane under existing licences; strategy aims at 5% biomethane in transported gas by 2030 | https://www.profit.ro/perspective/schimbari-legislative-pentru-firme/decizie-furnizorii-si-traderii-de-gaze-intra-automat-si-pe-biometan-cum-va-fi-injectat-in-conductele-romaniei-statul-spune-ca-nu-vor-creste-tarifele-de-transport-si-distributie-22361341 ; https://legislatie.just.ro/Public/DetaliiDocument/304074 | not read in full | SECONDARY
- Transport fuel-supplier RFNBO 1% obligation mentioned in the same package (search summary) | same | SECONDARY
- ANRE is only an AIB observer, so no GO transfers (registry-hub file) | PRIMARY
- Cross-border / mass-balance acceptance: not found.

### Verdicts
- OPEN QUESTION (no rule found).

### Open questions
- Q: Under the Romanian fuel-supplier GHG/renewable-transport obligation, is biomethane injected abroad and delivered by mass balance (PoS) eligible? | Ask: Ministerul Energiei / ANRE | Contact: https://www.anre.ro (contact page not verified)

## SI, HR, BG, GR, LU — nothing settled
### Facts
- SI: biogas excise rate is zero; a fuel-supplier obligation exists under EU transposition, but no Slovenian rule on imported gas/biomethane found | USDA GAIN 2025 https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Biofuel+Mandates+in+the+EU+by+Member+State+-+2025_Berlin_European+Union_E42025-0004 | "The excise duty rate is set at zero percent for ethanol, bio-ETBE, biodiesel, biogas" | SECONDARY
- HR: Law on Biofuels for Transport; HROTE runs a GO system including biomethane producers (Regulation on the GO System, 2023); no import rule found | https://files.hrote.hr/files/PDFen/Documents/Secondary%20legislation/Regulation%20on%20GO%20System_20230315_final.pdf (not read) | n/a | SECONDARY
- GR: Law 5037/2023 (RED II transposition) and Law 5215/2025 (biomethane framework) exist; search summary says biomethane for transport is classified as biofuel and suppliers record certified volumes in the Union Database; official PDF returned HTTP 403 | https://ypen.gov.gr/wp-content/uploads/2025/09/%CE%9D.-5215_%CE%A6%CE%95%CE%9A_%CE%91_116_2025.pdf | n/a | SECONDARY
- BG, LU: no source found.
- None of SI, HR, BG, GR, LU is listed as AIB/ERGaR gas-hub connected (registry-hub file) | PRIMARY

### Verdicts
- SI, HR, BG, GR, LU: OPEN QUESTION. No public text found on whether imported biomethane delivered by mass balance counts.

### Open questions
- Q (each country): Does your fuel-supplier / transport GHG scheme count biomethane injected in another Member State and delivered through the interconnected grid by mass balance with a PoS (ISCC EU/REDcert), and with what evidence? | Ask: SI Ministry of Natural Resources and Spatial Planning / Agencija za energijo; HR Ministry of Economy (MINGO) / HROTE; BG Ministry of Energy / SEDA; GR YPEN / RAAEY; LU Ministère de l'Énergie | Contact: https://www.agen-rs.si ; https://www.hrote.hr ; https://www.seea.government.bg ; https://www.raaey.gr ; https://gouvernement.lu (contact pages not verified)

## Summary table (destination -> accepts PoS imports?)
| Dest | Scheme | PoS import (mass balance) | Basis |
|---|---|---|---|
| CZ | Act 165/2012 §47d | POSSIBLE on text, any origin; consumed in CZ, GO or other proof, no double count | PRIMARY |
| PL | NCW (biocomponents act) | LIKELY POSSIBLE (foreign RED documents accepted; consumption in PL); gas mechanics unverified | PRIMARY + SECONDARY |
| PT | DL 84/2022 TdB | OPEN, leaning possible (origin-neutral, importers recognised) | PRIMARY |
| ES | Orden TED/728/2024 | NOT POSSIBLE by PoS alone; needs redeemed Spanish GdO (import GO via AIB) | PRIMARY |
| HU | Büat. / 821/2021 | NOT POSSIBLE by PoS alone; needs HU-registry GO + sustainability declaration | PRIMARY |
| LV | MK regs (transport energy) | NOT POSSIBLE by PoS alone for gas via grid; needs Latvian GO | PRIMARY |
| FR | TIRUERT / CPB | TIRUERT biomethane: OPEN (not confirmed in force); CPB: NOT POSSIBLE (French injection only) | mixed |
| IT | CIC (DM 107/2023) | OPEN (GSE rules not readable) | n/a |
| SK EE LT RO SI HR BG GR LU | various | OPEN | n/a |

## Searched but not found
- France: art. 266 quindecies text on biomethane carburant and any cross-border condition; confirmation that biomethane entered TIRUERT in 2026 (Légifrance pages did not return text).
- Italy: GSE Procedure applicative / DM 2 Mar 2018 text on foreign-injected biomethane (GSE site returns 403 to automated clients).
- Poland: article text on how biomethane withdrawn from the grid at CNG stations is evidenced, and any statement on imported biomethane.
- Portugal: ENSE/DGEG portaria on TdB for gas; any statement on biomethane delivered via the grid.
- Slovakia: current consolidated Act 309/2009 / 137/2010 transport provisions.
- Estonia, Lithuania, Romania, Greece, Croatia, Slovenia, Bulgaria, Luxembourg: primary legal text on biomethane counting.
- No bilateral government agreement for PoS recognition found in any of the 17 countries; no destination rule found excluding subsidised volumes (those restrictions sit on the origin side).
