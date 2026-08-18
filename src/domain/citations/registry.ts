import { LegalCitation } from './types';

export const LEGAL_CITATIONS: LegalCitation[] = [
  // =========================================================================
  // PAN-EUROPEAN DIRECTIVES & REGULATIONS
  // =========================================================================
  {
    id: 'eu-red-iii',
    code: 'RED_III_DIR_2023_2413',
    shortTitle: 'RED III Directive (EU) 2023/2413',
    officialTitle: 'Directive (EU) 2023/2413 amending Directive (EU) 2018/2001, Regulation (EU) 2018/1999 and Directive 98/70/EC as regards the promotion of energy from renewable sources',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'EU_DIRECTIVE',
    status: 'IN_FORCE',
    effectiveDate: '20 November 2023 (Transposition by 21 May 2025)',
    primaryArticle: 'Articles 25, 29, 30, 31, 31a & Annex IX',
    summary: 'The overarching statutory foundation for European biomethane, advanced biofuels, and renewable gas trading. Mandates that Member States achieve at least a 29% renewable energy share in transport or a 14.5% GHG intensity reduction by 2030, with a binding 5.5% sub-target for advanced biofuels (Annex IX-A) and RFNBOs.',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'FR_TIRUERT', 'IT_CIC', 'DK_INJECTION', 'SE_TAX_EXEMPTION', 'ES_GTS', 'PL_OZE', 'BE_REGIONAL'],
    complianceGate: 'SCHEME Gate, GHG Gate, ANNEX_IX Gate, MASS_BALANCE Gate',
    penaltiesOrCaps: 'National transposition quotas vary (€250–€600/tCO2e or €100/MWh ceiling).',
    deskRuleSummary: 'To count toward EU transport mandates, biomethane must achieve at least 70% GHG savings for installations commissioned after 2021 (CI ≤ 28.2 gCO2e/MJ vs 94.0 gCO2e/MJ baseline) and maintain strict mass balance chain of custody.',
    keyStatutoryExcerpts: [
      'Article 25(1): Member States shall set an obligation on fuel suppliers to ensure that the share of renewable energy within the final consumption of energy in the transport sector is at least 29% by 2030 or leads to a greenhouse gas intensity reduction of at least 14.5% by 2030.',
      'Article 29(10)(d): Greenhouse gas emissions savings from biofuels, bioliquids and biomass fuels shall be at least 70% for electricity, heating and cooling production from biomass fuels used in installations starting operation from 1 January 2021 to 31 December 2025, and at least 80% for installations starting operation from 1 January 2026.',
      'Article 31a(1): The Commission shall ensure that a Union database is established to enable the tracing of liquid and gaseous transport fuels that are eligible for being counted towards the numerator referred to in point (b) of Article 27(1).'
    ],
    crossReferences: ['Regulation (EU) 2024/2792 (UDB Implementing Regulation)', 'RED II Directive (EU) 2018/2001'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2413',
    officialUrlLabel: 'EUR-Lex Official Portal (Directive 2023/2413)',
    additionalLinks: [
      { label: 'European Commission RED Policy Page', url: 'https://energy.ec.europa.eu/topics/renewable-energy/renewable-energy-directive-targets-and-rules/renewable-energy-directive_en' },
      { label: 'Annex IX Feedstocks Guidance', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L2001#anx_IX' }
    ]
  },
  {
    id: 'eu-fueleu-maritime',
    code: 'FUELEU_MARITIME_REG_2023_1805',
    shortTitle: 'FuelEU Maritime Regulation (EU) 2023/1805',
    officialTitle: 'Regulation (EU) 2023/1805 on the use of renewable and low-carbon fuels in maritime transport, and amending Directive 2009/16/EC',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'EU_REGULATION',
    status: 'PHASED_IN_2026',
    effectiveDate: '1 January 2025 (Annual compliance cycles starting 2025/2026)',
    primaryArticle: 'Articles 4, 5, 20, 21 & Annex I–II',
    summary: 'Establishes decreasing limits on the well-to-wake greenhouse gas (GHG) intensity of energy used on-board ships above 5,000 gross tonnage calling at EU ports. Creates a dedicated commercial market for Bio-LNG and compressed Bio-CNG bunkering with compliance pooling mechanisms across vessel fleets.',
    applicableMarkets: ['EU_FUELEU_2025', 'EU_FUELEU_2030', 'SE_TAX_EXEMPTION'],
    complianceGate: 'MASS_BALANCE Gate & GHG Gate (Well-to-Wake boundary)',
    penaltiesOrCaps: 'Statutory non-compliance penalty: €2,400 per tonne VLSFO equivalent energy shortfall, increasing by 10% compounding per consecutive non-compliant reporting year.',
    deskRuleSummary: 'Bio-LNG bunkered in EU ports receives full well-to-wake credit against shipping intensity baselines (91.16 gCO2e/MJ in 2025). Negative CI biomethane (e.g. Danish manure Bio-LNG at −100 gCO2e/MJ) generates surplus compliance balances tradeable through FuelEU compliance pools.',
    keyStatutoryExcerpts: [
      'Article 4(2): From 1 January 2025, the yearly average greenhouse gas intensity of the energy used on-board by a ship during a reporting period shall not exceed: (a) -2% from 1 January 2025; (b) -6% from 1 January 2030; (c) -14.5% from 1 January 2035; (d) -31% from 1 January 2040; (e) -62% from 1 January 2045; (f) -80% from 1 January 2050.',
      'Article 21(1): Two or more ships managed by the same company or by different companies may establish a pool to collectively comply with the requirements of Article 4.'
    ],
    crossReferences: ['Directive 2003/87/EC (EU ETS Maritime)', 'IMO MARPOL Annex VI'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1805',
    officialUrlLabel: 'EUR-Lex Official Portal (Regulation 2023/1805)',
    additionalLinks: [
      { label: 'EMSA FuelEU Maritime Implementation Portal', url: 'https://www.emsa.europa.eu/fueleu-maritime.html' },
      { label: 'European Commission Maritime Decarbonisation', url: 'https://transport.ec.europa.eu/transport-modes/maritime/fueleu-maritime-initiative_en' }
    ]
  },
  {
    id: 'eu-udb-regulation',
    code: 'UDB_REG_2024_2792',
    shortTitle: 'Union Database (UDB) Regulation (EU) 2024/2792',
    officialTitle: 'Commission Implementing Regulation (EU) 2024/2792 on rules for the verification of sustainability and greenhouse gas emissions saving criteria and low indirect land-use change-risk criteria',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'EU_REGULATION',
    status: 'IN_FORCE',
    effectiveDate: '15 November 2024 (Gas grid tracking operational 2025/2026)',
    primaryArticle: 'Articles 14, 15, 16 & Annex III',
    summary: 'Defines the mandatory European Union Database (UDB) traceability infrastructure. Establishes the single interconnected EU gas transmission system as a single mass balance unit, mandating digital transaction logging from producer injection to end-user withdrawal.',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'FR_TIRUERT', 'IT_CIC', 'DK_INJECTION'],
    complianceGate: 'UDB Gate & MASS_BALANCE Gate',
    penaltiesOrCaps: 'Disqualification of consignment from counting toward RED III quotas; cannot issue tradeable certificates.',
    deskRuleSummary: 'Biomethane injected into non-EU grids (e.g. Great Britain National Gas network) cannot be registered in the UDB for interconnected EU compliance without a ratified bilateral mutual recognition treaty under RED III Art. 31a. UK grid gas is legally blocked from EU UDB transfers.',
    keyStatutoryExcerpts: [
      'Article 14(2): Economic operators shall enter into the Union database data on transactions relating to consignments of gaseous fuels injected into the interconnected natural gas transmission and distribution system in the Union.',
      'Article 15(4): Consignments entering the Union from an interconnected third-country gas system may be entered into the Union database only where a mutual recognition agreement is in force between the Union and the third country pursuant to Article 31a of Directive (EU) 2018/2001.'
    ],
    crossReferences: ['RED III Article 31a', 'ERGaR Scheme Documentation'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2792',
    officialUrlLabel: 'EUR-Lex Official Portal (Regulation 2024/2792)',
    additionalLinks: [
      { label: 'European Commission Union Database Platform', url: 'https://energy.ec.europa.eu/topics/renewable-energy/bioenergy/union-database_en' },
      { label: 'UDB Wiki & Gas System Guidelines', url: 'https://ec.europa.eu/energy/udb_en' }
    ]
  },
  {
    id: 'eu-gas-hydrogen-package',
    code: 'GAS_HYDROGEN_DIR_2024_1788',
    shortTitle: 'EU Gas & Hydrogen Decarbonisation Package (2024)',
    officialTitle: 'Directive (EU) 2024/1788 on common rules for the internal markets in renewable gas, natural gas and hydrogen & Regulation (EU) 2024/1789',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'EU_DIRECTIVE',
    status: 'IN_FORCE',
    effectiveDate: '4 August 2024 (Transposition deadline: 5 August 2026)',
    primaryArticle: 'Articles 18, 19, 38 & Regulation Art. 16',
    summary: 'Overhauls European gas market rules to guarantee non-discriminatory grid access for biomethane producers. Grants a mandatory 100% discount on entry tariffs for biomethane injected into transmission and distribution networks, and 75% discounts at cross-border interconnection points (IPs).',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'DK_INJECTION', 'ES_GTS', 'PL_OZE'],
    complianceGate: 'GRID_AND_TARIFF Gate',
    penaltiesOrCaps: 'National Regulatory Authorities (NRAs) bound to eliminate discriminatory injection connection fees.',
    deskRuleSummary: 'Cross-border pipeline transit costs will progressively decrease across EU corridors between 2024 and 2026 as NRAs apply the 75% interconnection tariff discount for verified renewable gas consignments.',
    keyStatutoryExcerpts: [
      'Regulation (EU) 2024/1789 Article 16(1): Regulatory authorities shall ensure that transmission system operators grant a discount of 100% to entry tariffs for renewable gases and low-carbon gases injected into the transmission system, and a discount of 75% to capacity-based transmission tariffs at interconnection points between Member States.',
      'Directive (EU) 2024/1788 Article 38(1): Member States shall ensure that transmission system operators and distribution system operators publish transparent and non-discriminatory procedures for the connection of biomethane production facilities.'
    ],
    crossReferences: ['Regulation (EC) No 715/2009', 'ACER Tariff Network Codes'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1788',
    officialUrlLabel: 'EUR-Lex Official Portal (Directive 2024/1788)',
    additionalLinks: [
      { label: 'Regulation (EU) 2024/1789 (Decarbonised Gas Markets)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1789' },
      { label: 'ACER European Energy Regulatory Guidance', url: 'https://www.acer.europa.eu/gas/decarbonisation' }
    ]
  },
  {
    id: 'eu-ets-2',
    code: 'EU_ETS_2_DIR_2023_959',
    shortTitle: 'EU ETS 2 Directive (EU) 2023/959',
    officialTitle: 'Directive (EU) 2023/959 amending Directive 2003/87/EC establishing a system for greenhouse gas emission allowance trading within the Union',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'EU_DIRECTIVE',
    status: 'FUTURE_2027_2028',
    effectiveDate: 'Monitoring starting 2025; Allowance surrendering starting 2027/2028',
    primaryArticle: 'Chapter IVa (Articles 30a to 30k)',
    summary: 'Establishes a cap-and-trade carbon pricing system covering emissions from fuel combustion in buildings, road transport, and small industrial sectors. Fuel distributors releasing natural gas to consumers must surrender ETS 2 allowances (priced with a soft ceiling at €45/tCO2 in 2020 prices, indexed). Biomethane compliant with RED III sustainability criteria carries an emission factor of ZERO.',
    applicableMarkets: ['EU_ETS2_2027', 'DE_THG', 'NL_ERE', 'FR_CPB'],
    complianceGate: 'GHG Gate & SCHEME Gate',
    penaltiesOrCaps: 'Excess emissions penalty of €100/tCO2 (indexed to EU HICP) plus obligation to surrender missing allowances.',
    deskRuleSummary: 'Zero-rating under EU ETS 2 creates an additional floor value for biomethane certificates equal to the prevailing ETS 2 carbon price multiplied by the natural gas combustion factor (approx. 0.202 tCO2/MWh, yielding ~€9.00–€14.00/MWh floor at €45–€70/tCO2).',
    keyStatutoryExcerpts: [
      'Article 30f(1): Regulated entities shall surrender allowances for their verified emissions during the preceding calendar year. Emissions from biofuels, bioliquids and biomass fuels compliant with the sustainability criteria laid down in Article 29 of Directive (EU) 2018/2001 shall be zero-rated.'
    ],
    crossReferences: ['Directive 2003/87/EC', 'Commission Implementing Regulation (EU) 2018/2066 (MRR)'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L0959',
    officialUrlLabel: 'EUR-Lex Official Portal (Directive 2023/959)',
    additionalLinks: [
      { label: 'European Commission ETS 2 Overview', url: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/ets-2-buildings-road-transport-and-additional-sectors_en' }
    ]
  },

  // =========================================================================
  // GERMANY (DE)
  // =========================================================================
  {
    id: 'de-bimschg-37a',
    code: 'DE_BIMSCHG_37A',
    shortTitle: 'German BImSchG §37a–§37f & 38. BImSchV',
    officialTitle: 'Gesetz zum Schutz vor schädlichen Umwelteinwirkungen durch Luftverunreinigungen (Bundes-Immissionsschutzgesetz) & 38. Verordnung zur Durchführung des BImSchG',
    jurisdiction: 'DE',
    jurisdictionName: 'Germany',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'UNDER_REVISION',
    effectiveDate: 'In force (Continuous quota escalations through 2030)',
    primaryArticle: '§37a Abs. 1–6, §37c, 38. BImSchV §5 & §11',
    summary: 'The statutory engine for the German Greenhouse Gas Reduction Quota (THG-Quote). Obligates mineral oil companies to reduce the carbon footprint of their fuel pool by 9.25% (rising to 25% in 2030). Biomethane derived from Annex IX-A feedstocks (e.g. straw, slurry, manure) currently receives double counting credit (2× multiplier) against the quota obligation.',
    applicableMarkets: ['DE_THG'],
    complianceGate: 'ANNEX_IX Gate, GHG Gate & UDB Gate',
    penaltiesOrCaps: 'Statutory non-compliance buyout penalty: €600 per tonne of CO2 equivalent shortfall (€0.60/kg CO2e).',
    deskRuleSummary: 'German THG valuation contains a dual-branch regulatory risk. Under the active 2× multiplier branch, deep manure biomethane (−100 gCO2e/MJ) yields ~€175–€200/MWh. If the German customs authority (Hauptzollamt) removes double counting for imported gas, value halves to the 1× single counting baseline (~€88/MWh).',
    keyStatutoryExcerpts: [
      '§37a Abs. 4: Die Verpflichtung nach Absatz 1 Satz 1 wird für Kraftstoffe, die unter Verwendung von Abfällen oder Reststoffen im Sinne der Anlage 1 hergestellt wurden, doppelt auf die Erfüllung der Verpflichtung nach Absatz 1 Satz 1 angerechnet.',
      '38. BImSchV §11: Der Nachweis über die Erfüllung der Voraussetzungen ist durch die Vorlage von Nachhaltigkeitsnachweisen nach der Biokraftstoff-Nachhaltigkeitsverordnung zu erbringen.'
    ],
    crossReferences: ['Biokraft-NachV (Biokraftstoff-Nachhaltigkeitsverordnung)', 'dena Biogasregister Technical Guidelines'],
    officialUrl: 'https://www.gesetze-im-internet.de/bimschg/__37a.html',
    officialUrlLabel: 'Gesetze im Internet Portal (§37a BImSchG)',
    additionalLinks: [
      { label: '38. BImSchV Statutory Text', url: 'https://www.gesetze-im-internet.de/bimschv_38/' },
      { label: 'Zoll.de THG-Quote Guidelines for Mineral Oil', url: 'https://www.zoll.de/DE/Fachthemen/Steuern/Verbrauchsteuern/Energie/Treibhausgasquote/treibhausgasquote_node.html' },
      { label: 'dena Biogasregister Registry', url: 'https://www.biogasregister.de/' }
    ]
  },

  // =========================================================================
  // NETHERLANDS (NL)
  // =========================================================================
  {
    id: 'nl-wet-milieubeheer',
    code: 'NL_WET_MILIEUBEHEER_ERE',
    shortTitle: 'Dutch Environmental Management Act & Besluit energie vervoer (ERE)',
    officialTitle: 'Wet milieubeheer Titel 9.7 & Besluit hernieuwbare energie vervoer (Renewable Energy for Transport Act)',
    jurisdiction: 'NL',
    jurisdictionName: 'Netherlands',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: '1 January 2022 (Annual updates by Nederlandse Emissieautoriteit - NEa)',
    primaryArticle: 'Wet milieubeheer Art. 9.7.1.1, Besluit hernieuwbare energie vervoer Art. 12–25',
    summary: 'Governs the Dutch Energy for Transport Units (Hernieuwbare Brandstofeenheden - HBE / ERE) quota regime. Fuel suppliers must surrender HBE units each year. Advanced biomethane generates HBE-G (Advanced / Annex IX-A) or HBE-O (Other renewable fuels), which trade freely on the Dutch compliance exchange administered by NEa.',
    applicableMarkets: ['NL_ERE'],
    complianceGate: 'MASS_BALANCE Gate & VertiCer Registry Gate',
    penaltiesOrCaps: 'Administrative fine based on non-compliance shortfall plus mandatory compliance carry-over.',
    deskRuleSummary: '1 GJ of injected biomethane equates to 1 HBE unit. Manure and organic biowaste injected into the European grid and registered with VertiCer qualify for HBE-G generation provided the physical gas reaches a Dutch grid interconnection point or virtual UDB allocation.',
    keyStatutoryExcerpts: [
      'Besluit energie vervoer Art. 14: Een inboeker kan hernieuwbare energie inboeken in het register hernieuwbare energie vervoer indien deze energie is geleverd aan de Nederlandse markt voor vervoer.',
      'Wet milieubeheer Art. 9.7.2.1: De jaarverplichting wordt uitgedrukt in een percentage van de totale hoeveelheid benzine en diesel die de vergunninghouder in het kalenderjaar heeft uitgeslagen.'
    ],
    crossReferences: ['VertiCer Regeling Garanties van Oorsprong', 'NEa Guideline Inboeken Hernieuwbare Gas'],
    officialUrl: 'https://wetten.overheid.nl/BWBR0003245/',
    officialUrlLabel: 'Overheid.nl Official Legal Text (Wet milieubeheer)',
    additionalLinks: [
      { label: 'Nederlandse Emissieautoriteit (NEa) Energie voor Vervoer', url: 'https://www.emissieautoriteit.nl/onderwerpen/energie-voor-vervoer' },
      { label: 'VertiCer National Biogas Certification Registry', url: 'https://www.verticer.eu/' }
    ]
  },

  // =========================================================================
  // FRANCE (FR)
  // =========================================================================
  {
    id: 'fr-code-energie-cpb',
    code: 'FR_CODE_ENERGIE_CPB',
    shortTitle: 'French Energy Code (CPB / Arrêté Tarifaire Biogaz)',
    officialTitle: 'Code de l\'énergie Articles L446-1 à L446-23 & Arrêté du 13 décembre 2021 fixant les conditions d\'achat du biométhane injecté dans les réseaux de gaz naturel',
    jurisdiction: 'FR',
    jurisdictionName: 'France',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: '13 December 2021 (Periodic formula indexations by CRE)',
    primaryArticle: 'Articles L446-4, L446-5, R446-1 à R446-16',
    summary: 'Governs the French statutory purchase obligation and feed-in tariff contract framework (Contrat d\'achat biométhane - CPB) administered by the Commission de Régulation de l\'Énergie (CRE). Guarantees a regulated purchase price for biomethane injected into GRTgaz, Teréga, or GRDF networks for up to 15 years.',
    applicableMarkets: ['FR_CPB'],
    complianceGate: 'SCHEME Gate & EEX Register Gate',
    penaltiesOrCaps: 'Statutory ceiling cap of €100.00/MWh applies to open-market cross-border certificate valuations under French compliance regulations.',
    deskRuleSummary: 'French CPB certificate netbacks bind at a statutory ceiling of €100.00/MWh. Even if market bids exceed this level, compliance value is capped by the French national clearing threshold.',
    keyStatutoryExcerpts: [
      'Article L446-4: Les producteurs de biométhane bénéficient, à leur demande, d\'un contrat d\'achat pour le biométhane injecté dans le réseau de gaz naturel conclu avec un fournisseur de gaz naturel désigné par l\'autorité administrative.',
      'Article R446-12: Le tarif d\'achat applicable est fixé par arrêté des ministres chargés de l\'énergie et du budget après avis de la Commission de régulation de l\'énergie.'
    ],
    crossReferences: ['Registre National des Garanties d\'Origine (EEX France)', 'TIRUERT (Code des douanes Art. 266 quindecies)'],
    officialUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043960350',
    officialUrlLabel: 'Légifrance Official Portal (Code de l\'énergie Art. L446-1)',
    additionalLinks: [
      { label: 'Commission de Régulation de l\'Énergie (CRE) Tarifs Biogaz', url: 'https://www.cre.fr/electricite-et-gaz/energies-renouvelables/biomethane' },
      { label: 'EEX France Registre National des Garanties d\'Origine', url: 'https://www.powernext.com/national-registry-guarantees-origin' }
    ]
  },
  {
    id: 'fr-tiruert',
    code: 'FR_TIRUERT_TAX',
    shortTitle: 'French TIRUERT Transport Quota (Taxe Incitative)',
    officialTitle: 'Taxe incitative relative à l\'utilisation d\'énergie renouvelable dans les transports (Article 266 quindecies du Code des douanes & Code des impositions sur les biens et services)',
    jurisdiction: 'FR',
    jurisdictionName: 'France',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Annual updates in the French Budget Law (Loi de Finances)',
    primaryArticle: 'Code des douanes Article 266 quindecies, CIBS Articles L312-1 et seq.',
    summary: 'French transport fuel obligation tax. Imposes a financial penalty on fuel distributors who fail to achieve target shares of renewable fuels in the road transport pool. Annex IX-A advanced biomethane and Bio-CNG/Bio-LNG supply reduce or eliminate TIRUERT tax liability.',
    applicableMarkets: ['FR_TIRUERT'],
    complianceGate: 'ANNEX_IX Gate & UDB Gate',
    penaltiesOrCaps: 'Statutory non-compliance tax rate: up to €168.00 per hectolitre fuel shortfall or equivalent energy penalty.',
    deskRuleSummary: 'TIRUERT creates strong commercial demand for French-consumed Bio-CNG / Bio-LNG, trading alongside the primary CPB feed-in mechanism.',
    keyStatutoryExcerpts: [
      'Article 266 quindecies: Les redevables de la taxe incitative sont les personnes qui mettent à la consommation en France des carburants. Le montant de la taxe est assis sur le volume total des carburants distribués diminué des quantités d\'énergie renouvelable incorporées.'
    ],
    crossReferences: ['Code de l\'énergie Art. L446-1', 'French DGEC Circular on Biofuels'],
    officialUrl: 'https://www.douane.gouv.fr/fiche/taxe-incitative-relative-lutilisation-denergie-renouvelable-dans-les-transports-tiruert',
    officialUrlLabel: 'Douane Française Official TIRUERT Guidance',
    additionalLinks: [
      { label: 'Ministère de la Transition Écologique Biofuels Policy', url: 'https://www.ecologie.gouv.fr/biocarburants' }
    ]
  },

  // =========================================================================
  // ITALY (IT)
  // =========================================================================
  {
    id: 'it-dm-2018-cic',
    code: 'IT_DM_02_03_2018_CIC',
    shortTitle: 'Italian Biomethane Decree (D.M. 2 Marzo 2018 & PNRR Decree 2022)',
    officialTitle: 'Decreto del Ministero dello Sviluppo Economico 2 marzo 2018 per la promozione dell\'uso del biometano nel settore dei trasporti & Decreto Ministeriale 15 settembre 2022 (PNRR)',
    jurisdiction: 'IT',
    jurisdictionName: 'Italy',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: '2 March 2018 (Extended via PNRR investment incentives to 2026)',
    primaryArticle: 'Articoli 3, 5, 6 & 8',
    summary: 'Governs the Italian Certificate of Release for Consumption (Certificati di Immissione in Consumo - CIC) scheme administered by Gestore dei Servizi Energetici (GSE). Advanced biomethane injected into SNAM or distribution grids earns 1 CIC per 10 Gcal (approx. 11.63 MWh), with GSE guaranteeing a fixed floor price of €375.00 per CIC for 10 years.',
    applicableMarkets: ['IT_CIC'],
    complianceGate: 'GSE Register Gate & MASS_BALANCE Gate',
    penaltiesOrCaps: 'GSE guaranteed minimum floor of €375.00/CIC (€32.24/MWh certificate floor) with market upside on the GME exchange.',
    deskRuleSummary: 'Italian CIC valuation provides high revenue certainty for agro-industrial manure and municipal biowaste consignments due to the statutory GSE floor mechanism and Italian CNG transport penetration.',
    keyStatutoryExcerpts: [
      'Articolo 5(1): Ai produttori di biometano avanzato immesso nella rete del gas naturale e destinato al settore dei trasporti è riconosciuto un certificato di immissione in consumo per ogni 10 Gcal di biometano avanzato prodotto e immesso in consumo.',
      'Articolo 6(2): Il GSE ritira i CIC rilasciati a fronte della produzione di biometano avanzato al prezzo fisso di 375 euro per ciascun CIC per un periodo di dieci anni.'
    ],
    crossReferences: ['GSE Regolamento Applicativo D.M. 2 Marzo 2018', 'SNAM Codice di Rete'],
    officialUrl: 'https://www.gse.it/servizi-per-te/fonti-rinnovabili/biometano',
    officialUrlLabel: 'GSE Gestore Servizi Energetici Official Portal',
    additionalLinks: [
      { label: 'GSE Technical Procedures for Biomethane Incentives', url: 'https://www.gse.it/normativa/dm-2-marzo-2018' },
      { label: 'SNAM Rete Gas Biomethane Connection Code', url: 'https://www.snam.it/it/trasporto/biometano.html' }
    ]
  },

  // =========================================================================
  // DENMARK (DK)
  // =========================================================================
  {
    id: 'dk-ve-lov',
    code: 'DK_VE_LOV_BIOGAS',
    shortTitle: 'Danish Renewable Energy Act (Lov om fremme af vedvarende energi)',
    officialTitle: 'Bekendtgørelse af lov om fremme af vedvarende energi (VE-loven) & Biometangasregister Bekendtgørelse',
    jurisdiction: 'DK',
    jurisdictionName: 'Denmark',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous statutory support; 100% green gas grid target by 2030',
    primaryArticle: 'VE-loven §§ 43a–43f',
    summary: 'Establishes Denmark as the highest-penetration biomethane producing nation in Europe (>40% of national grid demand). Provides feed-in premium support and establishes the Energinet Biometangasregister as the national certificate accounting system, directly integrated into the European Union Database (UDB).',
    applicableMarkets: ['DK_INJECTION', 'DE_THG', 'NL_ERE'],
    complianceGate: 'Energinet Register Gate & ISCC EU Certification',
    penaltiesOrCaps: 'Tariff degression applies to legacy feed-in contracts; export certification requires UDB double-claim avoidance.',
    deskRuleSummary: 'Danish injection facilities provide premium low-CI manure consignments (−100 to −80 gCO2e/MJ). When exporting to Germany or the Netherlands, Danish Guarantees of Origin must be surrendered on the Energinet registry while the sustainability Proof of Sustainability (PoS) transfers via the UDB.',
    keyStatutoryExcerpts: [
      'VE-loven § 43a: Der ydes pristillæg til biogas, der opgraderes til naturgaskvalitet og tilføres gassystemet, jf. bekendtgørelsens bestemmelser.',
      'Energinet Regler for Biometangasregister: Overdragelse af oprindelsesgarantier og bæredygtighedsdata skal ske i overensstemmelse med EU-direktivets regler for massebalance.'
    ],
    crossReferences: ['Energinet Systemregler for Gas', 'Evida Tilslutningsbetingelser'],
    officialUrl: 'https://www.retsinformation.dk/eli/lta/2023/1391',
    officialUrlLabel: 'Retsinformation Official Portal (VE-loven)',
    additionalLinks: [
      { label: 'Energinet Biometangasregister & Oprindelsesgarantier', url: 'https://energinet.dk/gas/gasmarkedet/oprindelsesgarantier-for-gas/' },
      { label: 'Energistyrelsen Biogas Policy Guidelines', url: 'https://ens.dk/ansvarsomraader/bioenergi/biogas' }
    ]
  },

  // =========================================================================
  // UNITED KINGDOM (GB)
  // =========================================================================
  {
    id: 'gb-rtfo-order',
    code: 'GB_RTFO_ORDER_2007',
    shortTitle: 'UK Renewable Transport Fuel Obligation (RTFO)',
    officialTitle: 'The Renewable Transport Fuel Obligations Order 2007 (SI 2007/3072 as amended through 2024)',
    jurisdiction: 'GB',
    jurisdictionName: 'United Kingdom (Great Britain)',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'RESTRICTED',
    effectiveDate: 'In force (Post-Brexit separate national compliance market)',
    primaryArticle: 'Articles 3, 4, 5, 16 & 21',
    summary: 'The UK transport fuel obligation administered by the Department for Transport (DfT). Fuel suppliers must redeem Renewable Transport Fuel Certificates (RTFCs). Biomethane from wastes receives double counting (Development Fuel or Main RTFC). However, following Brexit and RED III Art. 31a implementation, gas injected into Great Britain networks cannot clear the EU Union Database (UDB).',
    applicableMarkets: ['UK_RTFO'],
    complianceGate: 'DfT RTFO Register Gate (BLOCKED at EU UDB Gate)',
    penaltiesOrCaps: 'Buyout price of £0.50 per RTFC certificate (or £0.80 per Development Fuel certificate).',
    deskRuleSummary: 'GB Grid Boundary Rule: Biomethane injected into the GB National Gas transmission network cannot be imported into continental EU compliance markets (Germany THG, Netherlands ERE, France CPB) under UDB rules. UK-produced biomethane must either supply the domestic UK RTFO / GGSS schemes or be transported physically as segregated Bio-LNG.',
    keyStatutoryExcerpts: [
      'RTFO Order Article 16: An RTF certificate may be issued in respect of renewable transport fuel if the fuel is supplied at or for delivery to places in the United Kingdom.',
      'DfT RTFO Guidance 2024: Mass balance across the UK/EU natural gas interconnectors is not mutually recognized for EU Union Database compliance without an international agreement.'
    ],
    crossReferences: ['Green Gas Support Scheme (GGSS)', 'Renewable Heat Incentive (RHI)'],
    officialUrl: 'https://www.legislation.gov.uk/uksi/2007/3072/contents',
    officialUrlLabel: 'Legislation.gov.uk Official Portal (RTFO Order)',
    additionalLinks: [
      { label: 'DfT RTFO Compliance Guidance 2024', url: 'https://www.gov.uk/government/publications/renewable-transport-fuel-obligation-rtfo-guidance-2024' },
      { label: 'Ofgem Green Gas Support Scheme (GGSS)', url: 'https://www.ofgem.gov.uk/environmental-and-social-schemes/green-gas-support-scheme-ggss' }
    ]
  },

  // =========================================================================
  // SWEDEN (SE)
  // =========================================================================
  {
    id: 'se-energy-tax-act',
    code: 'SE_ENERGY_TAX_ACT',
    shortTitle: 'Swedish Energy Tax Act (Lag om skatt på energi)',
    officialTitle: 'Lag (1994:1776) om skatt på energi & Swedish Tax Exemption Decisions',
    jurisdiction: 'SE',
    jurisdictionName: 'Sweden',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Re-approved following EU State Aid approval (2024–2026)',
    primaryArticle: '7 kap. 3–5 §§ & 11 kap. 2 §',
    summary: 'Exempts non-crop sustainable biomethane used for vehicle fuel and heating from energy and carbon taxes (koldioxidskatt and energiskatt). Creates massive domestic demand for heavy transport Bio-LNG and Bio-CNG.',
    applicableMarkets: ['SE_TAX_EXEMPTION', 'EU_FUELEU_2025'],
    complianceGate: 'Skatteverket Exemption Gate & Energigas Sverige Register',
    penaltiesOrCaps: 'Full fossil fuel tax rates apply if sustainability criteria fail (€0.28–€0.35/Nm3 equivalent tax).',
    deskRuleSummary: 'Sweden operates primarily on tax exemptions rather than quota certificates. Biomethane imported into Sweden must prove non-crop origin (Annex IX) and compliance with EU sustainability criteria to receive full tax relief.',
    keyStatutoryExcerpts: [
      '7 kap. 3 §: Skattebefrielse medges för biogas som förbrukas för uppvärmning eller som drivmedel i fordon under förutsättning att hållbarhetskriterierna är uppfyllda.'
    ],
    crossReferences: ['Energigas Sverige Kontrollsystem', 'Swedish Energy Agency Regulations'],
    officialUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-19941776-om-skatt-pa-energi_sfs-1994-1776/',
    officialUrlLabel: 'Sveriges Riksdag Official Portal (Lag 1994:1776)',
    additionalLinks: [
      { label: 'Skatteverket Tax Guidance for Biogas', url: 'https://www.skatteverket.se/foretag/skatterochavdrag/punktskatter/energiskatter/biogasochbiogasol.4.361cc387159fb08ac5f7cbb.html' },
      { label: 'Energigas Sverige Industry Association', url: 'https://www.energigas.se/' }
    ]
  },

  // =========================================================================
  // SPAIN (ES)
  // =========================================================================
  {
    id: 'es-rd-376-2022',
    code: 'ES_RD_376_2022_GTS',
    shortTitle: 'Spanish Royal Decree 376/2022 (Sistema de Garantías de Origen)',
    officialTitle: 'Real Decreto 376/2022, de 17 de mayo, por el que se regulan los criterios de sostenibilidad y de reducción de las emisiones de gases de efecto invernadero de los biocarburantes, biolíquidos y combustibles de biomasa',
    jurisdiction: 'ES',
    jurisdictionName: 'Spain',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: '18 May 2022 (Enagás GTS Registry live)',
    primaryArticle: 'Artículos 4, 8, 12 & Anexo I',
    summary: 'Establishes the Spanish national system for Guarantees of Origin for renewable gases administered by Enagás GTS (Technical System Operator). Implements RED II/III sustainability certification and transposes transport biofuel obligations administered by CNMC.',
    applicableMarkets: ['ES_GTS'],
    complianceGate: 'Enagás GTS Register Gate & ISCC EU Certification',
    penaltiesOrCaps: 'Penalties for non-compliance with Spanish transport obligation managed by CNMC.',
    deskRuleSummary: 'Spain represents a high-growth origin with vast slurry and agro-industrial potential. Injected gas is tracked on the Enagás GTS platform for domestic industrial PPA decarbonization or cross-border virtual transfer.',
    keyStatutoryExcerpts: [
      'Artículo 4(1): Las garantías de origen acreditarán el origen renovable de los gases producidos a partir de fuentes renovables y su volumen equivalente.',
      'Artículo 8: Enagás GTS, como entidad responsable del sistema de garantías de origen, gestionará la emisión, transferencia y redención de los certificados.'
    ],
    crossReferences: ['Circular 1/2021 de la CNMC', 'MITECO Roadmap for Biogas'],
    officialUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-8121',
    officialUrlLabel: 'Boletín Oficial del Estado (BOE Real Decreto 376/2022)',
    additionalLinks: [
      { label: 'Enagás GTS Garantías de Origen del Gas Renovable', url: 'https://www.gts.enagas.es/es/garantias-origen/' },
      { label: 'CNMC National Energy Regulator Biogas System', url: 'https://www.cnmc.es/ambitos-de-actuacion/energia/supervision-del-mercado' }
    ]
  },

  // =========================================================================
  // POLAND (PL)
  // =========================================================================
  {
    id: 'pl-ustawa-oze',
    code: 'PL_USTAWA_OZE_2015',
    shortTitle: 'Polish Renewable Energy Sources Act (Ustawa o OZE)',
    officialTitle: 'Ustawa z dnia 20 lutego 2015 r. o odnawialnych źródłach energii (Dz.U. z 2023 r. poz. 1436 z późn. zm.)',
    jurisdiction: 'PL',
    jurisdictionName: 'Poland',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous updates through 2024 Biomethane Amendment',
    primaryArticle: 'Art. 4, Art. 70a–70z, Art. 119a',
    summary: 'Governs the Polish biomethane operational support system (Feed-in Premium / FIP and Feed-in Tariff / FIT auctions) administered by the Energy Regulatory Office (Urząd Regulacji Energetyki - URE). Advanced biomethane certified under KZR INiG receives guaranteed purchase rights and green certificates on the Polish Power Exchange (TGE).',
    applicableMarkets: ['PL_OZE'],
    complianceGate: 'KZR INiG / URE Register Gate',
    penaltiesOrCaps: 'URE administrative penalties for non-compliance with national renewable quota (NCW).',
    deskRuleSummary: 'Poland has substantial agricultural potential for biomethane production. Exporting Polish gas requires KZR INiG certification recognized under the EU UDB.',
    keyStatutoryExcerpts: [
      'Art. 70a: Wytwórca biometanu z odnawialnych źródeł energii w instalacji odnawialnego źródła energii ma prawo do pokrycia ujemnego salda w systemie taryf gwarantowanych.',
      'Art. 119a: Prezes URE prowadzi rejestr wytwórców biometanu wprowadzających gaz do sieci gazowej.'
    ],
    crossReferences: ['KZR INiG Sustainability Scheme', 'GAZ-SYSTEM Network Code'],
    officialUrl: 'https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20150000478',
    officialUrlLabel: 'ISAP Sejm Official Legislation Portal (Ustawa o OZE)',
    additionalLinks: [
      { label: 'Urząd Regulacji Energetyki (URE) Biomethane Register', url: 'https://www.ure.gov.pl/pl/oze' },
      { label: 'KZR INiG Certification System', url: 'https://system.kzr.inig.pl/' }
    ]
  },

  // =========================================================================
  // BELGIUM (BE)
  // =========================================================================
  {
    id: 'be-regional-decrees',
    code: 'BE_REGIONAL_DECREES_GAS',
    shortTitle: 'Belgian Regional Energy Decrees (VREG, CWaPE, BRUGEL)',
    officialTitle: 'Decreet houdende de organisatie van de gasmarkt (Vlaanderen), Décret relatif à l\'organisation du marché régional du gaz (Wallonie) & Ordonnance Gaz (Bruxelles)',
    jurisdiction: 'BE',
    jurisdictionName: 'Belgium',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Harmonized inter-regional clearing under Fluxys TSO code',
    primaryArticle: 'VREG Decreet Art. 3.1.1, CWaPE Décret Art. 25–38',
    summary: 'Governs the Belgian decentralized Guarantee of Origin and green gas certificate market across the three regions (Flanders - VREG, Wallonia - CWaPE, Brussels - BRUGEL). Physical grid interconnection and cross-border transit are managed by Fluxys Belgium.',
    applicableMarkets: ['BE_REGIONAL'],
    complianceGate: 'VREG / CWaPE Register Gate & Fluxys Injection Code',
    penaltiesOrCaps: 'Regional administrative fines for non-compliance with renewable transport fuel mandates.',
    deskRuleSummary: 'Belgium operates as a major transit crossroads between France, Netherlands, and Germany. Inter-regional certificate transfers between VREG and CWaPE require mutual recognition clearing before virtual cross-border allocation.',
    keyStatutoryExcerpts: [
      'VREG Gasdecreet Art. 3.1.4: De garanties van oorsprong voor biomethaan worden beheerd in het centrale register ter staving van de hernieuwbare oorsprong van het in het aardgasnet geïnjecteerde gas.'
    ],
    crossReferences: ['Fluxys Gas Transmission Code', 'VREG Guarantees of Origin Rules'],
    officialUrl: 'https://www.ejustice.just.fgov.be/eli/decreet/2009/05/08/2009035658/justel',
    officialUrlLabel: 'Moniteur Belge / Belgisch Staatsblad Official Portal',
    additionalLinks: [
      { label: 'VREG Flemish Energy Regulator Biomethane Portal', url: 'https://www.vreg.be/nl/groene-stroom-en-warmte/garanties-van-oorsprong' },
      { label: 'CWaPE Walloon Energy Commission', url: 'https://www.cwape.be/' },
      { label: 'Fluxys Green Gas Services', url: 'https://www.fluxys.com/en/green-gases' }
    ]
  },

  // =========================================================================
  // AUSTRIA (AT)
  // =========================================================================
  {
    id: 'at-egg-act',
    code: 'AT_EGG_ACT_2024',
    shortTitle: 'Austrian Renewable Gas Act (Erneuerbare-Gase-Gesetz - EGG)',
    officialTitle: 'Bundesgesetz über die Erhöhung des Anteils von erneuerbarem Gas am Gasverbrauch (Erneuerbare-Gase-Gesetz – EGG)',
    jurisdiction: 'AT',
    jurisdictionName: 'Austria',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Enacted with 7.5 TWh national green gas quota target by 2030',
    primaryArticle: '§§ 3–12 (Grüngasquote & Versorgerverpflichtung)',
    summary: 'Mandates Austrian gas suppliers to substitute natural gas with verified biomethane (reaching 7.5 TWh/year by 2030). Regulated by E-Control and tracked via the AGCS Biomethane Registry.',
    applicableMarkets: ['AT_EGG', 'DE_THG'],
    complianceGate: 'AGCS Register Gate & E-Control Certification',
    penaltiesOrCaps: 'Ausgleichsbeitrag (compensation penalty) of €150–€180/MWh for non-compliant energy volumes.',
    deskRuleSummary: 'Austrian EGG quota creates a high domestic compliance price for Central European biomethane producers, competing directly with German THG off-takers.',
    keyStatutoryExcerpts: [
      'EGG § 4: Gasversorger sind verpflichtet, einen gesetzlich festgelegten Anteil ihres an Endverbraucher gelieferten Erdgases durch erneuerbares Gas zu decken.'
    ],
    crossReferences: ['AGCS Biomethane Registry Rules', 'E-Control Gas Market Codes'],
    officialUrl: 'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011500',
    officialUrlLabel: 'Rechtsinformationssystem des Bundes (RIS Austria)',
    additionalLinks: [
      { label: 'AGCS Austrian Gas Clearing & Settlement Registry', url: 'https://www.agcs.at/' },
      { label: 'E-Control Austria Regulatory Authority', url: 'https://www.e-control.at/marktteilnehmer/gas/erneuerbare-gase' }
    ]
  },

  // =========================================================================
  // SWITZERLAND (CH)
  // =========================================================================
  {
    id: 'ch-minstg-act',
    code: 'CH_MINSTG_ACT',
    shortTitle: 'Swiss Mineral Oil Tax Act (Mineralölsteuergesetz - MinStG)',
    officialTitle: 'Bundesgesetz über die Mineralölsteuer (MinStG, SR 641.61) & Biokraftstoff-Verordnung',
    jurisdiction: 'CH',
    jurisdictionName: 'Switzerland',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'In force (Continuous tax relief for verified biogenic motor fuels)',
    primaryArticle: 'Art. 2a, Art. 12b MinStG',
    summary: 'Grants mineral oil tax exemption for biogenic motor fuels and injected biomethane meeting ecological requirements. Administered by the Federal Customs and Border Security (BAZG) and Swiss Gas Industry Association (VSG).',
    applicableMarkets: ['CH_VSG'],
    complianceGate: 'BAZG Customs Gate & VSG Biogas Clearing',
    penaltiesOrCaps: 'Full mineral oil tax applies (approx. CHF 0.75/litre equivalent or CHF 80/MWh).',
    deskRuleSummary: 'Non-EU Border Note: Swiss imports require physical cross-border transit declaration via Wallbach or transit pipelines, with BAZG ecological certificate validation.',
    keyStatutoryExcerpts: [
      'Art. 12b MinStG: Treibstoffe aus biogenen Stoffen sind von der Mineralölsteuer ganz oder teilweise befreit, wenn sie die ökologischen Anforderungen erfüllen.'
    ],
    crossReferences: ['VSG Clearinghouse Rules', 'Federal Office for the Environment (BAFU) Criteria'],
    officialUrl: 'https://www.fedlex.admin.ch/eli/cc/1996/3371_3371_3371/de',
    officialUrlLabel: 'Fedlex Swiss Federal Law Portal (MinStG)',
    additionalLinks: [
      { label: 'VSG Verband der Schweizerischen Gasindustrie', url: 'https://gazenergie.ch/' },
      { label: 'BAZG Federal Customs Tax Exemption Guidelines', url: 'https://www.bazg.admin.ch/' }
    ]
  },

  // =========================================================================
  // FINLAND (FI)
  // =========================================================================
  {
    id: 'fi-jakeluvelvoitelaki',
    code: 'FI_JAKELUVELVOITELAKI_2007',
    shortTitle: 'Finnish Biofuel Distribution Mandate (Jakeluvelvoitelaki)',
    officialTitle: 'Laki uusiutuvien polttoaineiden käytön edistämisestä liikenteessä (446/2007 as amended)',
    jurisdiction: 'FI',
    jurisdictionName: 'Finland',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous escalations (Rising to 34% by 2030)',
    primaryArticle: '5 § (Jakeluvelvollisuus), 8 § (Seuraamusmaksu)',
    summary: 'Obligates Finnish transport fuel distributors to supply a minimum share of renewable fuels. Advanced biomethane and Bio-LNG generate tradeable distribution compliance units administered by the Energy Authority (Energiavirasto). Gasgrid Finland operates the national green gas registry.',
    applicableMarkets: ['FI_JAKELU', 'EU_FUELEU_2025'],
    complianceGate: 'Energiavirasto Register Gate & Gasgrid Finland System',
    penaltiesOrCaps: 'Statutory non-compliance penalty: €0.04/MJ (~€144.00/MWh penalty fee).',
    deskRuleSummary: 'Finland represents an active Nordic market for heavy transport Bio-LNG and maritime bunkering with high sub-targets for advanced fuels.',
    keyStatutoryExcerpts: [
      'Jakeluvelvoitelaki 5 §: Jakelija on velvollinen toimittamaan kulutukseen uusiutuvia polttoaineita laissa säädetyn osuuden mukaisesti.'
    ],
    crossReferences: ['Gasgrid Finland Registry Rules', 'Energiavirasto Sustainability Directives'],
    officialUrl: 'https://www.finlex.fi/fi/laki/ajantasa/2007/20070446',
    officialUrlLabel: 'Finlex Official Legislation Portal (446/2007)',
    additionalLinks: [
      { label: 'Energiavirasto Energy Authority Finland', url: 'https://energiavirasto.fi/jakeluvelvoite' },
      { label: 'Gasgrid Finland Renewable Gas Services', url: 'https://gasgrid.fi/' }
    ]
  },

  // =========================================================================
  // NORWAY (NO)
  // =========================================================================
  {
    id: 'no-produktforskriften',
    code: 'NO_PRODUKTFORSKRIFTEN_BIO',
    shortTitle: 'Norwegian Biofuel Quota Regulation (Produktforskriften Kapittel 3)',
    officialTitle: 'Forskrift om begrensning i bruk av helse- og miljøfarlige kjemikalier og andre produkter (Produktforskriften) Kapittel 3',
    jurisdiction: 'NO',
    jurisdictionName: 'Norway',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Annual updates by Miljødirektoratet (Norwegian Environment Agency)',
    primaryArticle: 'Produktforskriften §§ 3-1 til 3-9 (Omsetningskrav for biodrivstoff)',
    summary: 'Sets the Norwegian sales mandate for biofuels in road and maritime transport (currently >17% total, with sub-mandates for advanced non-food biofuels). Certified by Miljødirektoratet.',
    applicableMarkets: ['NO_OMSETNING', 'EU_FUELEU_2025'],
    complianceGate: 'Miljødirektoratet Register Gate',
    penaltiesOrCaps: 'Overtredelsesgebyr (administrative penalty) for non-compliance with fuel volume quotas.',
    deskRuleSummary: 'Norway is interconnected via the North Sea Gassco offshore grid and Nordic road networks for Bio-LNG maritime supply.',
    keyStatutoryExcerpts: [
      'Produktforskriften § 3-3: Den som omsetter drivstoff til veitrafikk, skal sørge for at minst 17 volumprosent av den totale omsatte mengden drivstoff per kalenderår består av biodrivstoff.'
    ],
    crossReferences: ['Miljødirektoratet Reporting Guidelines', 'Gassco Network Rules'],
    officialUrl: 'https://lovdata.no/dokument/SF/forskrift/2004-06-01-922/KAPITTEL_3',
    officialUrlLabel: 'Lovdata Official Norwegian Legislation Portal',
    additionalLinks: [
      { label: 'Miljødirektoratet Biofuels Guidelines', url: 'https://www.miljodirektoratet.no/tjenester/veileder-om-biodrivstoff/' }
    ]
  },

  // =========================================================================
  // IRELAND (IE)
  // =========================================================================
  {
    id: 'ie-nora-bos',
    code: 'IE_NORA_BOS_ACT',
    shortTitle: 'Irish Renewable Transport Fuel Policy & BOS (NORA Act)',
    officialTitle: 'National Oil Reserves Agency Act 2007 (Renewable Transport Fuel Obligation) & Renewable Heat Obligation (RHO)',
    jurisdiction: 'IE',
    jurisdictionName: 'Ireland',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'In force (Continuous increases towards 2030 Climate Action Plan)',
    primaryArticle: 'Part 5A (Renewable Transport Fuel Obligation)',
    summary: 'Governed by the National Oil Reserves Agency (NORA). Fuel suppliers must redeem Renewable Transport Fuel Certificates (RTFCs). Biomethane injected into the Gas Networks Ireland (GNI) grid qualifies for compliance certificates with double counting for advanced manure/slurry feedstocks.',
    applicableMarkets: ['IE_NORA'],
    complianceGate: 'NORA Biofuels Register Gate & GNI Biomethane Register',
    penaltiesOrCaps: 'Buyout penalty of €0.45 per missing RTFC certificate.',
    deskRuleSummary: 'Ireland has set a target of 5.7 TWh biomethane by 2030. Injected gas is certified on the GNI registry for domestic transport or UK/EU virtual trading.',
    keyStatutoryExcerpts: [
      'NORA Act Section 44G: An RTF certificate may be issued to a biofuel obligation account holder where the account holder demonstrates that renewable transport fuel has been placed on the market.'
    ],
    crossReferences: ['Gas Networks Ireland Connection Policy', 'Department of Climate Renewable Heat Obligation'],
    officialUrl: 'https://www.irishstatutebook.ie/eli/2007/act/7/enacted/en/html',
    officialUrlLabel: 'Irish Statute Book Official Portal (NORA Act)',
    additionalLinks: [
      { label: 'NORA National Oil Reserves Agency BOS System', url: 'https://www.nora.ie/biofuels-obligation-scheme.141.html' },
      { label: 'Gas Networks Ireland Biomethane Portal', url: 'https://www.gasnetworks.ie/business/renewable-gas/' }
    ]
  },

  // =========================================================================
  // PORTUGAL (PT)
  // =========================================================================
  {
    id: 'pt-dl-84-2022',
    code: 'PT_DECRETO_LEI_84_2022',
    shortTitle: 'Portuguese Renewable Gas Decree-Law 84/2022',
    officialTitle: 'Decreto-Lei n.º 84/2022, de 9 de dezembro, que estabelece o regime jurídico das garantias de origem de gases de origem renovável',
    jurisdiction: 'PT',
    jurisdictionName: 'Portugal',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: '10 December 2022 (EEGO System live)',
    primaryArticle: 'Artigos 3, 5, 8 & 12',
    summary: 'Establishes the legal regime for Guarantees of Origin for renewable gases administered by REN (Entidade Emissora de Garantias de Origem - EEGO) and regulated by ERSE. Transposes RED II/III sustainability criteria for injected biomethane.',
    applicableMarkets: ['PT_EEGO', 'ES_GTS'],
    complianceGate: 'REN EEGO Register Gate & DGEG Certification',
    penaltiesOrCaps: 'Sanctions administered by ERSE and ENSE for transport quota non-compliance.',
    deskRuleSummary: 'Portugal and Spain form the Iberian renewable gas market (Mibgas). Certificates registered on REN EEGO can be transferred across the Iberian interconnection.',
    keyStatutoryExcerpts: [
      'Decreto-Lei 84/2022 Artigo 3.º: As garantias de origem comprovam perante o consumidor final a quota ou quantidade de energia produzida a partir de fontes renováveis num dado sistema.'
    ],
    crossReferences: ['ERSE Regulamento do Sistema de Garantias de Origem', 'DGEG National Hydrogen & Biomethane Action Plan'],
    officialUrl: 'https://diariodarepublica.pt/dr/detalhe/decreto-lei/84-2022-204739556',
    officialUrlLabel: 'Diário da República Official Portal (DL 84/2022)',
    additionalLinks: [
      { label: 'REN EEGO Entidade Emissora de Garantias de Origem', url: 'https://eego.ren.pt/' },
      { label: 'ERSE Regulatory Authority for Energy Services', url: 'https://www.erse.pt/' }
    ]
  },

  // =========================================================================
  // CZECH REPUBLIC (CZ)
  // =========================================================================
  {
    id: 'cz-poze-act',
    code: 'CZ_POZE_ACT_165_2012',
    shortTitle: 'Czech Supported Energy Sources Act (Zákon o POZE č. 165/2012 Sb.)',
    officialTitle: 'Zákon č. 165/2012 Sb., o podporovaných zdrojích energie a o změně některých zákonů (as amended)',
    jurisdiction: 'CZ',
    jurisdictionName: 'Czech Republic',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous updates through 2024 Energy Amendments',
    primaryArticle: '§§ 24–27 (Podpora biometanu a záruky původu)',
    summary: 'Governs support mechanisms for biomethane injected into gas networks in the Czech Republic. Administered by the market operator OTE (Operátor trhu s elektřinou) and regulated by the Energy Regulatory Office (ERÚ).',
    applicableMarkets: ['CZ_OTE', 'DE_THG'],
    complianceGate: 'OTE Biomethane Register Gate',
    penaltiesOrCaps: 'ERÚ regulatory sanctions for non-compliant fuel distributions.',
    deskRuleSummary: 'Czech biomethane production is integrated into the NET4GAS transmission system, offering pipeline access to Germany and Austria.',
    keyStatutoryExcerpts: [
      'Zákon č. 165/2012 Sb. § 24a: Výrobce biometanu, který vtláčí biometan do plynárenské soustavy, má právo na vydání záruk původu v systému operátora trhu.'
    ],
    crossReferences: ['OTE Market Operator Rules', 'ERÚ Regulatory Gazettes'],
    officialUrl: 'https://www.zakonyprolidi.cz/cs/2012-165',
    officialUrlLabel: 'Zákony pro lidi Official Portal (165/2012 Sb.)',
    additionalLinks: [
      { label: 'OTE Market Operator Biomethane Portal', url: 'https://www.ote-cr.cz/cs/statistika/biometan' },
      { label: 'ERÚ Energy Regulatory Office', url: 'https://www.eru.cz/' }
    ]
  },

  // =========================================================================
  // ESTONIA (EE)
  // =========================================================================
  {
    id: 'ee-liquid-fuel-act',
    code: 'EE_LIQUID_FUEL_ACT',
    shortTitle: 'Estonian Liquid Fuel Act (Vedelkütuse seadus)',
    officialTitle: 'Vedelkütuse seadus (RT I, 15.03.2019, 13 as amended)',
    jurisdiction: 'EE',
    jurisdictionName: 'Estonia',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous transport quota mandates',
    primaryArticle: '§ 2^1 (Taastuvtoorainest toodetud kütuse osakaalu kohustus)',
    summary: 'Obligates Estonian fuel suppliers to meet national renewable transport fuel quotas. Biomethane injected into the Elering gas grid receives Green Gas Guarantees of Origin tracked on the national Baltic registry.',
    applicableMarkets: ['EE_ELERING', 'FI_JAKELU'],
    complianceGate: 'Elering Green Gas Register Gate',
    penaltiesOrCaps: 'Tax and Environmental Board penalty fees for non-compliance.',
    deskRuleSummary: 'Estonia is linked via the Balticconnector pipeline to Finland and Latvia, allowing interconnected regional mass balance.',
    keyStatutoryExcerpts: [
      'Vedelkütuse seadus § 2^1: Kütusemüüja on kohustatud tagama, et tema poolt tarbimisse lubatud kütuses moodustab taastuvtoorainest toodetud kütuse energiahulk seaduses sätestatud protsendi.'
    ],
    crossReferences: ['Elering Gas Grid Code', 'Estonian Environmental Board Rules'],
    officialUrl: 'https://www.riigiteataja.ee/akt/115032019013',
    officialUrlLabel: 'Riigi Teataja Official Estonian Law Portal',
    additionalLinks: [
      { label: 'Elering Green Gas & Guarantees of Origin', url: 'https://elering.ee/rohegaas' }
    ]
  },

  // =========================================================================
  // LITHUANIA (LT)
  // =========================================================================
  {
    id: 'lt-renewable-energy-law',
    code: 'LT_RENEWABLE_LAW',
    shortTitle: 'Lithuanian Renewable Energy Law (Atsinaujinančių išteklių energetikos įstatymas)',
    officialTitle: 'Lietuvos Respublikos atsinaujinančių išteklių energetikos įstatymas (Nr. XI-1375)',
    jurisdiction: 'LT',
    jurisdictionName: 'Lithuania',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous development of national biomethane registry',
    primaryArticle: 'Articles 38–41 (Biometano gamyba ir tiekimas į dujų tinklus)',
    summary: 'Governs biomethane injection incentives and Guarantees of Origin issued by Amber Grid (Lithuanian Gas Transmission System Operator). Obligates fuel suppliers to achieve EU transport targets.',
    applicableMarkets: ['LT_AMBER', 'PL_OZE'],
    complianceGate: 'Amber Grid Register Gate',
    penaltiesOrCaps: 'VERT regulatory penalties for quota non-compliance.',
    deskRuleSummary: 'Lithuania operates the GIPL (Gas Interconnection Poland-Lithuania), providing direct pipeline transport to Poland and Central Europe.',
    keyStatutoryExcerpts: [
      'Įstatymas Nr. XI-1375 38 straipsnis: Į gamtinių dujų perdavimo ir skirstymo sistemas tiekiamas biometanas turi atitikti teisės aktuose nustatytus kokybės reikalavimus.'
    ],
    crossReferences: ['Amber Grid Biomethane Rules', 'VERT State Energy Regulatory Council'],
    officialUrl: 'https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/TAIS.400588',
    officialUrlLabel: 'Seimas Official Lithuanian Legal Acts Portal',
    additionalLinks: [
      { label: 'Amber Grid National Biomethane Registry', url: 'https://www.ambergrid.lt/duju-rinka/biometano-garantijos' }
    ]
  },

  // =========================================================================
  // LATVIA (LV)
  // =========================================================================
  {
    id: 'lv-energy-law',
    code: 'LV_ENERGY_LAW',
    shortTitle: 'Latvian Energy Law & Renewable Transport Regulations',
    officialTitle: 'Enerģētikas likums & Ministru kabineta noteikumi par degvielas ilgtspējas kritērijiem',
    jurisdiction: 'LV',
    jurisdictionName: 'Latvia',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous regulatory harmonization with RED III',
    primaryArticle: 'Enerģētikas likums 42. pants',
    summary: 'Defines the legal framework for renewable gas grid injection and Guarantees of Origin administered by Conexus Baltic Grid and regulated by the Public Utilities Commission (SPRK).',
    applicableMarkets: ['LV_CONEXUS', 'EE_ELERING'],
    complianceGate: 'Conexus Baltic Grid Register Gate',
    penaltiesOrCaps: 'SPRK administrative penalties for renewable target default.',
    deskRuleSummary: 'Latvia features the Inčukalns Underground Gas Storage facility, providing strategic seasonal storage for regional biomethane balances.',
    keyStatutoryExcerpts: [
      'Enerģētikas likums: Pārvades sistēmas operators nodrošina nediskriminējošu piekļuvi sistēmai biometāna un citu atjaunīgo gāzu ievadīšanai.'
    ],
    crossReferences: ['Conexus Baltic Grid Rules', 'Ministry of Climate and Energy Regulations'],
    officialUrl: 'https://likumi.lv/ta/id/49833-energetikas-likums',
    officialUrlLabel: 'Likumi.lv Official Latvian Legislation Portal',
    additionalLinks: [
      { label: 'Conexus Baltic Grid Renewable Gas Portal', url: 'https://www.conexus.lv/' }
    ]
  },

  // =========================================================================
  // HUNGARY (HU)
  // =========================================================================
  {
    id: 'hu-metar-act',
    code: 'HU_METAR_ELECTRICITY_GAS_ACT',
    shortTitle: 'Hungarian Renewable Energy Framework (METÁR & Gas Act)',
    officialTitle: '2008. évi XL. törvény a földgázellátásról & Megújuló Támogatási Rendszer (METÁR)',
    jurisdiction: 'HU',
    jurisdictionName: 'Hungary',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous updates by MEKH',
    primaryArticle: 'Földgáztörvény 82–85. §',
    summary: 'Regulates renewable gas production and grid injection into the FGSZ transmission system. Overseen by the Hungarian Energy and Public Utility Regulatory Authority (MEKH).',
    applicableMarkets: ['HU_MEKH'],
    complianceGate: 'MEKH Register Gate & FGSZ Transmission Rules',
    penaltiesOrCaps: 'MEKH regulatory fines for quota shortfall.',
    deskRuleSummary: 'Hungary holds strong agro-biomass feedstock resources in Central Europe with interconnection to Austria and Slovakia.',
    keyStatutoryExcerpts: [
      'Földgáztörvény 82. §: A megújuló energiaforrásból előállított biometán földgázhálózatba történő betáplálása esetén a rendszerüzemeltető köteles biztosítani a hálózati csatlakozást.'
    ],
    crossReferences: ['FGSZ Pipeline Network Code', 'MEKH Regulatory Decisions'],
    officialUrl: 'https://net.jogtar.hu/jogszabaly?docid=a0800040.tv',
    officialUrlLabel: 'Nemzeti Jogszabálytár Official Hungarian Legal Portal',
    additionalLinks: [
      { label: 'MEKH Hungarian Energy and Public Utility Regulatory Authority', url: 'https://www.mekh.hu/' }
    ]
  },

  // =========================================================================
  // GREECE (GR)
  // =========================================================================
  {
    id: 'gr-law-4951-2022',
    code: 'GR_LAW_4951_2022',
    shortTitle: 'Greek Biomethane & RES Modernisation Law (Law 4951/2022)',
    officialTitle: 'Νόμος 4951/2022 - Εκσυγχρονισμός της αδειοδοτικής διαδικασίας Ανανεώσιμων Πηγών Ενέργειας & Πλαίσιο Βιομεθανίου',
    jurisdiction: 'GR',
    jurisdictionName: 'Greece',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: '4 July 2022 (Government Gazette A 129)',
    primaryArticle: 'Articles 80–92 (Biomethane Production & Grid Injection Framework)',
    summary: 'Establishes the statutory framework for biomethane production, licensing, and grid injection into the Hellenic National Natural Gas System (DESFA). Managed by DAPEEP and RAEEY.',
    applicableMarkets: ['GR_DAPEEP'],
    complianceGate: 'DAPEEP Guarantees of Origin Register & DESFA Code',
    penaltiesOrCaps: 'RAEEY penalties for non-compliance with Greek renewable transport mandates.',
    deskRuleSummary: 'Greece represents an emerging Southeast European market with high agricultural potential and LNG import terminal infrastructure.',
    keyStatutoryExcerpts: [
      'Νόμος 4951/2022 Άρθρο 80: Καθορίζονται οι όροι και οι προϋποθέσεις για την παραγωγή, έγχυση και διάθεση βιομεθανίου στο Εθνικό Σύστημα Φυσικού Αερίου.'
    ],
    crossReferences: ['DESFA Network Code', 'DAPEEP Registry Rules'],
    officialUrl: 'https://www.e-nomothesia.gr/kat-periballon/ananeosimes-peges-energeias/nomos-4951-2022-phek-129a-4-7-2022.html',
    officialUrlLabel: 'Government Gazette (Εφημερίς της Κυβερνήσεως Ν. 4951/2022)',
    additionalLinks: [
      { label: 'DAPEEP Operator of Renewable Energy Guarantees', url: 'https://www.dapeep.gr/' },
      { label: 'DESFA Hellenic Gas Transmission Operator', url: 'https://www.desfa.gr/' }
    ]
  },

  // =========================================================================
  // ROMANIA (RO)
  // =========================================================================
  {
    id: 'ro-law-220-2008',
    code: 'RO_LAW_220_2008',
    shortTitle: 'Romanian Renewable Energy Act (Legea 220/2008 & Biomethane Ordinance)',
    officialTitle: 'Legea nr. 220/2008 pentru stabilirea sistemului de promovare a producerii energiei din surse regenerabile de energie & Ordonanța de Urgență privind Biometanul',
    jurisdiction: 'RO',
    jurisdictionName: 'Romania',
    category: 'NATIONAL_QUOTA_LAW',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous transpositions of RED II/III',
    primaryArticle: 'Articolele 3–14 & Normele ANRE',
    summary: 'Governs renewable gas injection rights into the Transgaz national transmission system and distribution grids. Regulated by the Romanian National Energy Regulatory Authority (ANRE).',
    applicableMarkets: ['RO_ANRE'],
    complianceGate: 'ANRE Guarantees of Origin Register & Transgaz Code',
    penaltiesOrCaps: 'ANRE fines for fuel supplier quota shortfall.',
    deskRuleSummary: 'Romania possesses some of the largest cereal and agricultural residue volumes in the European Union for advanced biomethane scaling.',
    keyStatutoryExcerpts: [
      'Legea 220/2008: Operatorul de transport și de sistem are obligația de a acorda prioritate la injectarea în rețea a gazelor produse din surse regenerabile.'
    ],
    crossReferences: ['Transgaz Biomethane Technical Code', 'ANRE Regulatory Framework'],
    officialUrl: 'https://legislatie.just.ro/Public/DetaliiDocument/98863',
    officialUrlLabel: 'Portal Legislativ Romania (Legea 220/2008)',
    additionalLinks: [
      { label: 'ANRE Autoritatea Națională de Reglementare în domeniul Energiei', url: 'https://www.anre.ro/' },
      { label: 'Transgaz National Gas Transmission Company', url: 'https://www.transgaz.ro/' }
    ]
  },

  // =========================================================================
  // CERTIFICATION SCHEMES & STANDARDS
  // =========================================================================
  {
    id: 'scheme-iscc-eu',
    code: 'SCHEME_ISCC_EU',
    shortTitle: 'ISCC EU Certification Scheme',
    officialTitle: 'International Sustainability and Carbon Certification (ISCC EU System Documents 201–205)',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Voluntary Certification Recognized by EC)',
    category: 'CERTIFICATION_SCHEME',
    status: 'IN_FORCE',
    effectiveDate: 'Recognized under Commission Decision (EU) 2022/602',
    primaryArticle: 'System Document 201 (System Basics), 205 (GHG Emissions)',
    summary: 'The primary European sustainability certification scheme approved by the European Commission for demonstrating compliance with RED III criteria. Covers all stages of the supply chain from raw feedstock production, digestion, upgrading, and injection, through to final market withdrawal.',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'DK_INJECTION', 'EU_FUELEU_2025'],
    complianceGate: 'SCHEME Gate',
    penaltiesOrCaps: 'Revocation of sustainability certificate; exclusion from UDB transactions.',
    deskRuleSummary: 'An ISCC EU certificate (with Proof of Sustainability - PoS) is the universal compliance currency for cross-border biomethane trading. All consignments must state raw material, production unit ID, Country of Origin, and certified Carbon Intensity (CI).',
    keyStatutoryExcerpts: [
      'ISCC System Document 201 Section 4: All economic operators in the supply chain must hold a valid ISCC certificate to transfer sustainable material with sustainability claims.',
      'ISCC Document 205: GHG calculations must follow the methodology laid down in Annex V and VI of the Renewable Energy Directive.'
    ],
    crossReferences: ['ISCC PLUS (Voluntary Industrial Scheme)', 'REDcert EU'],
    officialUrl: 'https://www.iscc-system.org/certification/iscc-system-standard/iscc-eu/',
    officialUrlLabel: 'ISCC System Official Portal (ISCC EU Standard)',
    additionalLinks: [
      { label: 'ISCC Biomethane Certification Guidance', url: 'https://www.iscc-system.org/certification/certificate-holders/all-certificates/' },
      { label: 'ISCC Document 205 (GHG Methodology)', url: 'https://www.iscc-system.org/process/system-documents/' }
    ]
  },
  {
    id: 'scheme-iscc-plus',
    code: 'SCHEME_ISCC_PLUS',
    shortTitle: 'ISCC PLUS (Voluntary Market Boundary)',
    officialTitle: 'ISCC PLUS System Standards for Voluntary and Non-Regulated Supply Chains',
    jurisdiction: 'EU',
    jurisdictionName: 'Global / Voluntary Corporate Market',
    category: 'CERTIFICATION_SCHEME',
    status: 'IN_FORCE',
    effectiveDate: 'In force (Voluntary corporate reporting standards)',
    primaryArticle: 'ISCC PLUS System Document 201',
    summary: 'A voluntary sustainability standard designed for non-regulated sectors (such as circular plastics, voluntary corporate Scope 1 decarbonization, and chemical feedstock). Allows book & claim and mass balance without compliance with RED III fuel regulations.',
    applicableMarkets: [],
    complianceGate: 'SCHEME Gate (BLOCKED for EU Statutory Transport Quotas)',
    penaltiesOrCaps: 'Cannot be surrendered for German THG, Dutch ERE, French CPB, or FuelEU Maritime obligations.',
    deskRuleSummary: 'CRITICAL DESK BOUNDARY: ISCC PLUS certificates CANNOT be used to satisfy statutory EU transport quotas (DE THG, NL ERE, FR CPB). If a producer offers ISCC PLUS paper, it must be upgraded or re-certified under ISCC EU before structuring compliance trades.',
    keyStatutoryExcerpts: [
      'ISCC PLUS Guidance 2024: ISCC PLUS claims are intended for voluntary corporate sustainability reporting and do not qualify for statutory compliance under Directive (EU) 2018/2001 or Directive (EU) 2023/2413.'
    ],
    crossReferences: ['ISCC EU', 'GHG Protocol Corporate Standard'],
    officialUrl: 'https://www.iscc-system.org/certification/iscc-system-standard/iscc-plus/',
    officialUrlLabel: 'ISCC System Official Portal (ISCC PLUS Standard)'
  },
  {
    id: 'scheme-redcert-eu',
    code: 'SCHEME_REDCERT_EU',
    shortTitle: 'REDcert EU Certification Scheme',
    officialTitle: 'REDcert Gesellschaft zur Zertifizierung nachhaltig erzeugter Biomasse mbH',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Recognized by EC)',
    category: 'CERTIFICATION_SCHEME',
    status: 'IN_FORCE',
    effectiveDate: 'Commission Implementing Decision (EU) 2022/604',
    primaryArticle: 'REDcert System Principles for the Biofuel Sector',
    summary: 'Widely used certification scheme in Germany, Austria, and Central Europe for agricultural biogas, biomethane upgrading plants, and traders. Fully recognized by the European Commission and the German Federal Agency for Agriculture and Food (BLE / Nabisy database).',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'DK_INJECTION'],
    complianceGate: 'SCHEME Gate',
    penaltiesOrCaps: 'Certificate withdrawal in case of non-conformity.',
    deskRuleSummary: 'REDcert EU is fully fungible with ISCC EU for German THG and Dutch ERE compliance. Both schemes utilize identical RED III Annex V/VI GHG calculation methodologies.',
    keyStatutoryExcerpts: [
      'REDcert System Principles Section 2: Biomass and biomethane certified under REDcert EU complies with the criteria of Directive (EU) 2018/2001.'
    ],
    crossReferences: ['dena Biogasregister', 'BLE Nabisy System'],
    officialUrl: 'https://www.redcert.org/',
    officialUrlLabel: 'REDcert Official Certification Portal',
    additionalLinks: [
      { label: 'Federal Agency for Agriculture and Food (BLE) Nabisy', url: 'https://www.ble.de/DE/Themen/Klima-Energie/Biokraftstoffe-Nachhaltigkeit/Nabisy/nabisy_node.html' }
    ]
  },

  // =========================================================================
  // GLOSSARY & CALCULATION METHODOLOGY
  // =========================================================================
  {
    id: 'glossary-annex-ix',
    code: 'GLOSSARY_ANNEX_IX_A_B',
    shortTitle: 'Annex IX Part A vs Part B vs Food/Feed Crop Feedstocks',
    officialTitle: 'Renewable Energy Directive Annex IX — Feedstocks for the production of advanced biofuels and biogas',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'GLOSSARY_TERM',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous application under RED II/III',
    primaryArticle: 'Directive (EU) 2018/2001 Annex IX Part A & Part B',
    summary: 'Classifies feedstocks into statutory tiers governing compliance multipliers and caps:\n\n* **Annex IX Part A (Advanced)**: Slurry/manure, straw, municipal biowaste, bagasse, tall oil pitch, crude glycerine. Qualifies for double counting in Germany and Netherlands, and contributes to the binding 5.5% RED III sub-target.\n* **Annex IX Part B (Capped)**: Used cooking oil (UCO) and animal fats Category 1 & 2. Subject to a statutory 1.7% contribution cap in Member States.\n* **Food & Feed Crops (Crop-based)**: Maize silage, wheat, sugar beet. Strictly capped (max 1% above 2020 national baseline, ceiling 7%) and excluded from German THG double counting.',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'FR_TIRUERT', 'IT_CIC'],
    complianceGate: 'ANNEX_IX Gate',
    penaltiesOrCaps: 'Crop-based biomethane excluded from advanced mandates and subject to national crop caps.',
    deskRuleSummary: 'Annex IX-A feedstock qualification is the primary driver of commercial premium. Manure and agricultural straw capture maximum quota multipliers, while crop-based gas trades at significant discounts.',
    keyStatutoryExcerpts: [
      'Annex IX Part A(a): Algae if cultivated on land in ponds or photobioreactors.',
      'Annex IX Part A(b): Biomass fraction of mixed municipal waste, but not separated household waste subject to recycling targets.',
      'Annex IX Part A(f): Animal manure and sewage sludge.'
    ],
    crossReferences: ['RED III Article 25', 'German 38. BImSchV Anlage 1'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L2001#anx_IX',
    officialUrlLabel: 'EUR-Lex Full Text (Annex IX Feedstock List)'
  },
  {
    id: 'glossary-carbon-intensity',
    code: 'GLOSSARY_CARBON_INTENSITY_GHG',
    shortTitle: 'Carbon Intensity (CI) & GHG Saving Calculation',
    officialTitle: 'Standard Calculation Methodology for Biofuels and Biomethane (RED Annex VI)',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'GLOSSARY_TERM',
    status: 'IN_FORCE',
    effectiveDate: 'Standard methodology across all EU compliance systems',
    primaryArticle: 'RED III Annex VI Part B & Part C',
    summary: 'Defines how greenhouse gas emissions ($E$) are computed across the biomethane lifecycle:\n\n$$E = e_{ec} + e_l + e_p + e_{td} + e_u - e_{sca} - e_{ccs} - e_{ccr} - e_{am}$$\n\nWhere:\n* $e_{ec}$: emissions from the extraction or cultivation of raw materials\n* $e_p$: emissions from processing and biogas upgrading\n* $e_{td}$: emissions from transport and grid distribution\n* $e_{sca}$: emission savings from soil carbon accumulation via improved agriculture\n* $e_{am}$: emission savings from avoided manure methane emissions (−45 to −100 gCO2e/MJ credit)\n* **Fossil Comparator Baseline**: Fixed at **94.0 gCO₂e/MJ**.',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'EU_FUELEU_2025'],
    complianceGate: 'GHG Gate',
    penaltiesOrCaps: 'Consignments with CI > 28.2 gCO2e/MJ fail the mandatory 70% reduction threshold for new installations.',
    deskRuleSummary: 'Negative carbon intensities (e.g. −100 gCO2e/MJ) are achieved through the $e_{am}$ avoided methane credit for closed manure storage. In quota markets like Germany THG, each negative gCO2e/MJ avoided directly increases the certificate yield per MWh.',
    keyStatutoryExcerpts: [
      'Annex VI Part C Paragraph 1: Greenhouse gas emissions from the production and use of biomass fuels shall be calculated as: E = e_ec + e_l + e_p + e_td + e_u - e_sca - e_ccs - e_ccr - e_am.',
      'Annex VI Part C Paragraph 19: The fossil fuel comparator for transport fuel baseline shall be 94 gCO2eq/MJ.'
    ],
    crossReferences: ['ISCC EU Document 205', 'JRC Biomethane Default Factors'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L2001#anx_VI',
    officialUrlLabel: 'EUR-Lex Full Text (Annex VI GHG Methodology)'
  },
  {
    id: 'glossary-mass-balance-vs-bc',
    code: 'GLOSSARY_MASS_BALANCE_CHAIN',
    shortTitle: 'Mass Balance vs Book & Claim Chain of Custody',
    officialTitle: 'Chain of Custody Models under Renewable Energy Directive Article 30',
    jurisdiction: 'EU',
    jurisdictionName: 'European Union (Pan-EU)',
    category: 'GLOSSARY_TERM',
    status: 'IN_FORCE',
    effectiveDate: 'Continuous statutory enforcement',
    primaryArticle: 'RED III Article 30(1)–(3)',
    summary: 'Distinguishes the two legal chains of custody in renewable gas trading:\n\n* **Mass Balance (Mandatory for EU Quotas)**: Requires physical connection between the injection point and the withdrawal point via the interconnected European gas transmission system. Volume balance must balance across the inventory period, with documentation tracked on the Union Database (UDB).\n* **Book & Claim (Voluntary Corporate Claims Only)**: Allows certificates (Guarantees of Origin) to be traded independently from the physical natural gas molecule. Valid for voluntary Scope 2/3 GHG accounting, but STRICTLY INVALID for EU transport quota compliance (DE THG, NL ERE, FR CPB).',
    applicableMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'FR_TIRUERT', 'IT_CIC', 'EU_FUELEU_2025'],
    complianceGate: 'MASS_BALANCE Gate',
    penaltiesOrCaps: 'Book & claim consignments suffer an automatic HARD BLOCK at the Mass Balance Gate for all statutory quota markets.',
    deskRuleSummary: 'Never trade physical biomethane into EU compliance quota markets under a Book & Claim model. Only mass balance certificates with unbroken PoS transfer and UDB registration can clear compliance audits.',
    keyStatutoryExcerpts: [
      'Article 30(1): Member States shall require economic operators to show that the sustainability and greenhouse gas emissions saving criteria have been fulfilled through the use of a mass balance system.',
      'Article 30(1)(a): The mass balance system shall allow consignments of raw material or fuels with differing sustainability and greenhouse gas emissions saving characteristics to be mixed for instance in a container, processing or logistical installation, transmission and distribution infrastructure or site.'
    ],
    crossReferences: ['ERGaR Mass Balance Scheme', 'CEN - EN 16325 Guarantees of Origin Standard'],
    officialUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018L2001#art_30',
    officialUrlLabel: 'EUR-Lex Full Text (RED Article 30 Mass Balance)',
    additionalLinks: [
      { label: 'ERGaR European Renewable Gas Registry Guidelines', url: 'https://www.ergar.org/' }
    ]
  }
];

export function getCitationById(id: string): LegalCitation | undefined {
  return LEGAL_CITATIONS.find(c => c.id === id);
}

export function getCitationsByJurisdiction(jurisdiction: string): LegalCitation[] {
  if (jurisdiction === 'ALL') return LEGAL_CITATIONS;
  return LEGAL_CITATIONS.filter(c => c.jurisdiction === jurisdiction);
}

export function searchCitations(query: string): LegalCitation[] {
  const q = query.toLowerCase().trim();
  if (!q) return LEGAL_CITATIONS;

  return LEGAL_CITATIONS.filter(c => 
    c.shortTitle.toLowerCase().includes(q) ||
    c.officialTitle.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q) ||
    c.summary.toLowerCase().includes(q) ||
    c.deskRuleSummary.toLowerCase().includes(q) ||
    c.primaryArticle.toLowerCase().includes(q) ||
    c.jurisdictionName.toLowerCase().includes(q) ||
    c.applicableMarkets.some(m => m.toLowerCase().includes(q))
  );
}
