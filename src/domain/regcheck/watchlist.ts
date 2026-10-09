import type { WatchItem } from './types';

/**
 * Statutory and regulatory facts the Biomethane Desk depends on.
 * Consolidated from route audit rules (scripts/route-audit/rules.mjs),
 * SYNTHESIS-NOTES.md, and active OPEN-QUESTIONS.md.
 */
export const REGCHECK_WATCHLIST: WatchItem[] = [
  // 1. Energinet (DK) AIB Gas Scheme status
  {
    id: 'dk_aib_status',
    topic: 'Energinet (DK) AIB Gas Scheme connection status',
    claim: 'Energinet is an AIB Gas Scheme applicant (observer/applicant since 17 Jun 2026), not connected; it is AIB-connected for electricity only. Gas GO exports via the AIB Hub are not possible.',
    appImpact: 'Blocks all Danish Guarantee of Origin (GO) export routes to AIB member countries (e.g. DK->ES, DK->IT, DK->SE, DK->AT via AIB).',
    sources: [
      { label: 'AIB Members Directory', url: 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members' },
      { label: 'AIB News Archive', url: 'https://www.aib-net.org/news-events/newsarchive' }
    ],
    watchType: 'fact'
  },

  // 2. Sweden Energimyndigheten AIB Gas connection
  {
    id: 'se_aib_connection',
    topic: 'Sweden Energimyndigheten AIB Gas connection date',
    claim: 'Sweden\'s Energimyndigheten has been connected to the AIB Gas Scheme Hub since 1 September 2026; Swedish gas GOs are recognized as EECS GOs tradeable over the AIB Hub.',
    appImpact: 'Enables AIB gas GO transfers to and from Sweden across all connected European registries.',
    sources: [
      { label: 'AIB Approval Announcement', url: 'https://www.aib-net.org/node/3418' }
    ],
    watchType: 'fact'
  },

  // 3. NL VertiCer ERGaR exit
  {
    id: 'nl_verticer_ergar_exit',
    topic: 'VertiCer (NL) ERGaR Hub exit date & AIB export exclusive',
    claim: 'VertiCer left ERGaR on 1 July 2026; the Netherlands permits biomethane GO exports solely via the AIB Hub, closing the NL->DE ERGaR channel to dena.',
    appImpact: 'Permanently closes NL->DE and all other ERGaR-based GO export corridors from the Netherlands.',
    sources: [
      { label: 'VertiCer Trader FAQ', url: 'https://verticer.eu/en/frequently-asked-questions/traders/' }
    ],
    watchType: 'fact'
  },

  // 4. ERGaR participants list
  {
    id: 'ergar_participants_list',
    topic: 'ERGaR operational scheme participants',
    claim: 'Active ERGaR CoO participants are AT (AGCS), DK (Energinet), DE (dena), SK (SPP-d), CH (Pronovo), GB (GGCS), and LT (Amber Grid).',
    appImpact: 'Defines the statutory boundaries of potential bilateral and hub certificate transfers under the ERGaR scheme.',
    sources: [
      { label: 'ERGaR Scheme Participants', url: 'https://www.ergar.org/' }
    ],
    watchType: 'fact'
  },

  // 5. Energinet ERGaR cross-border matrix
  {
    id: 'dk_ergar_matrix',
    topic: 'Energinet ERGaR bilateral transfer acceptance',
    claim: 'Energinet\'s ERGaR table allows exports to DE, SK, LT, and CH; bars exports to AT, GB, and NL; and prohibits imports from dena (Germany).',
    appImpact: 'Governs Danish ERGaR route eligibility: closes DK->AT, DK->GB, and DE->DK GO transfers.',
    sources: [
      { label: 'Energinet Cross-border Trade of GOs', url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/' }
    ],
    watchType: 'fact'
  },

  // 6. Energinet Ex-domain cancellation policy
  {
    id: 'dk_exdomain_cancellation',
    topic: 'Energinet ex-domain cancellation rules',
    claim: 'Energinet permits ex-domain cancellation for countries without a registry or whose registry is not on ERGaR.',
    appImpact: 'Enables DK->CZ, DK->ES, DK->FR, DK->IT routes via Danish ex-domain cancellation where the destination country accepts it.',
    sources: [
      { label: 'Energinet Cross-border Trade of GOs', url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/' }
    ],
    watchType: 'fact'
  },

  // 7. dena ERGaR partner list
  {
    id: 'de_dena_partners',
    topic: 'dena Biogasregister bilateral ERGaR partner list',
    claim: 'dena Biogasregister maintains bilateral ERGaR transfer agreements with AGCS (AT), Energinet (DK), SPP-distribúcia (SK), and GGCS (GB), and excludes the Netherlands after 1 July 2026.',
    appImpact: 'Controls German registry transfer eligibility for imported and exported ERGaR certificates.',
    sources: [
      { label: 'dena Biogasregister International', url: 'https://www.biogasregister.de' },
      { label: 'dena Biogasregister Portal', url: 'https://www.dena.de/en/biogasregister/' }
    ],
    watchType: 'fact'
  },

  // 8. Pronovo (CH) Gas GO import restrictions
  {
    id: 'ch_pronovo_restrictions',
    topic: 'Pronovo (CH) gas GO import-only status & partner list',
    claim: 'Pronovo is designated as gas imports only under Swiss UVEK regulations; Swiss HKN export to EU registries is officially blocked, with published import acceptance lists.',
    appImpact: 'Classifies CH->EU GO export routes as closed and regulates eligible incoming GO routes into Switzerland.',
    sources: [
      { label: 'Pronovo Guarantees of Origin', url: 'https://pronovo.ch/en/services/guarantees-of-origin/' },
      { label: 'AIB Registries Table', url: 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members' }
    ],
    watchType: 'fact'
  },

  // 9. DE THG-Quote 2026 law
  {
    id: 'de_thg_quote_2026_law',
    topic: 'German THG-Quote 2026 Law (Drs 21/5530, BImSchG §37b(6) n.F.)',
    claim: 'Under BImSchG §37b(6) n.F., EU-injected biomethane is accepted by mass balance for the THG-Quote; double counting is abolished from 1 Jan 2026; BGBl promulgation date is still to be confirmed.',
    appImpact: 'Approves EU-wide cross-border mass-balance flows into DE_THG transport compliance without double-counting multiplier.',
    sources: [
      { label: 'Bundestag Drs 21/5530 Law Text', url: 'https://www.bundestag.de' },
      { label: 'Bundesgesetzblatt (BGBl) Portal', url: 'https://www.recht.bund.de/bgbl/' }
    ],
    watchType: 'fact'
  },

  // 10. NL ERE Dutch origin rule
  {
    id: 'nl_ere_dutch_origin_rule',
    topic: 'Dutch ERE domestic origin rule',
    claim: 'Dutch transport quota (ERE) under Regeling energie vervoer Art. 7 accepts solely Dutch-produced green gas GvOs for inboekingen; Tweede Kamer passed Wet bijmengverplichting groen gas on 6 October 2026.',
    appImpact: 'Hard-blocks foreign biomethane mass-balance imports into the Dutch ERE transport compliance market.',
    sources: [
      { label: 'NEa Renewable Energy FAQ', url: 'https://www.emissieautoriteit.nl/' },
      { label: 'Wettenbank Regeling Energie Vervoer', url: 'https://wetten.overheid.nl/' }
    ],
    watchType: 'fact'
  },

  // 10a. Senate vote on Wet bijmengverplichting groen gas (Kamerstuk 36947)
  {
    id: 'nl_gge_senate_vote',
    topic: 'Senate (Eerste Kamer) vote on Wet bijmengverplichting groen gas (Kamerstuk 36947)',
    claim: 'Tweede Kamer passed Wet bijmengverplichting groen gas on 6 October 2026; Senate plenary review and vote pending prior to 1 January 2027 entry into force.',
    appImpact: 'Formally enacts the Dutch green gas obligation and establishes primary statutory authority for the quota trajectory.',
    sources: [
      { label: 'Kamerstuk 36947 nr. 8', url: 'https://zoek.officielebekendmakingen.nl/kst-36947-8' },
      { label: 'Tweede Kamer Plenair Verslag 6 Oct 2026', url: 'https://www.tweedekamer.nl/kamerstukken/plenaire_verslagen/detail/2026-2027/10' }
    ],
    watchType: 'open_question'
  },

  // 10b. Final Besluit and Regeling bijmengverplichting groen gas publication
  {
    id: 'nl_gge_secondary_legislation',
    topic: 'Final publication of Besluit and Regeling bijmengverplichting groen gas',
    claim: 'Draft AMvB and draft Ministeriële Regeling establish the 80 gCO2e/MJ fossil comparator, joint GO+PoS booking in VertiCer, and the €450–€527/t buy-out schedule; final texts pending publication in Staatsblad and Staatscourant.',
    appImpact: 'Formalizes operational booking deadlines (1 May Y+1), LHV energy calculation conventions, and audit requirements.',
    sources: [
      { label: 'Internetconsultatie Draft Besluit', url: 'https://www.internetconsultatie.nl/bijmengverplichtinggroengasamvb/b1' },
      { label: 'Internetconsultatie Draft Regeling', url: 'https://www.internetconsultatie.nl/bijmengverplichtinggroengasmr/b1' }
    ],
    watchType: 'open_question'
  },

  // 10c. NEa GGE register opening
  {
    id: 'nl_gge_register_opening',
    topic: 'NEa GGE register module implementation and account opening',
    claim: 'NEa and VertiCer are configuring the GGE register module for joint GO cancellation and PoS surrender; registration for obligated energy suppliers opens prior to 2027 compliance.',
    appImpact: 'Enables obligated energy suppliers to hold GGE accounts and surrender paired GO+PoS compliance volumes.',
    sources: [
      { label: 'NEa Register Groen Gas', url: 'https://www.emissieautoriteit.nl/' },
      { label: 'VertiCer Gas Registry', url: 'https://verticer.eu/' }
    ],
    watchType: 'open_question'
  },

  // 10d. ISCC / REDcert gas mass-balance rules (O3)
  {
    id: 'iscc_redcert_gas_mb_rules',
    topic: 'ISCC EU and REDcert gas mass-balance transaction guidance (O3)',
    claim: 'Voluntary schemes require PoS to remain linked to gas deliveries; clarification pending from certifying bodies on whether trade transfer must settle at origin hub (PVB) or destination (TTF).',
    appImpact: 'Determines whether Trade Structure A (bundle at origin) or Structure B (bundle delivered TTF) is mandated by certifying bodies.',
    sources: [
      { label: 'ISCC EU 203 System Document', url: 'https://www.iscc-system.org/certification/iscc-system-documents/' },
      { label: 'REDcert Gas Scheme Rules', url: 'https://www.redcert.org/en/' }
    ],
    watchType: 'open_question'
  },

  // 10e. UDB gas module go-live (O4)
  {
    id: 'udb_gas_module_golive',
    topic: 'Union Database (UDB) gaseous fuels module operational go-live (O4)',
    claim: 'European Commission and EBA roadmap indicates UDB gas module operational rollout; mandatory recording for gaseous fuels across interconnected grid anticipated once live.',
    appImpact: 'Transitions cross-border gas compliance traceability from interim national registry GO+PoS booking to automated UDB transaction logging.',
    sources: [
      { label: 'European Commission Union Database', url: 'https://energy.ec.europa.eu/topics/renewable-energy/bioenergy/union-database_en' },
      { label: 'European Biogas Association UDB Leaflet', url: 'https://www.europeanbiogas.eu/publication/union-database-leaflet/' }
    ],
    watchType: 'open_question'
  },

  // 10f. Spanish non-transport quota decree (S6)
  {
    id: 'es_non_transport_quota_decree',
    topic: 'Spanish non-transport biomethane quota decree (S6)',
    claim: 'Spain is drafting a non-transport biomethane quota, reported at 0.5% in 2028 rising to 6% in 2035, alongside the transport obligation from 2027 (RD 611/2026). Both from a desk research report — not yet re-read against the BOE.',
    appImpact: 'Increases domestic Spanish biomethane certificate demand and tightens export supply into NL GGE and DE THG.',
    sources: [
      { label: 'MITECO Biogás y Biometano', url: 'https://www.miteco.gob.es/es/energia/energia-electrica/biogas.html' },
      { label: 'BOE (search RD 611/2026)', url: 'https://www.boe.es/' }
    ],
    watchType: 'open_question'
  },

  // 10g. DE THG proposal to exclude origin-subsidised fuels
  {
    id: 'de_thg_subsidised_fuels_exclusion',
    topic: 'German proposal to exclude origin-subsidised fuels from THG-Quote',
    claim: 'Reported German proposal to exclude fuels that received production or operating aid in the country of origin from the THG quota. Source not yet confirmed — check before relying on it for the ES → DE THG trade.',
    appImpact: 'Restricts foreign volumes receiving dual or operating support from generating German THG quota credits, mirroring NL GGE rules.',
    sources: [
      { label: 'BMUV Immissionsschutz', url: 'https://www.bmuv.de/themen/luft-laerm-mobilitaet/verkehr/erneuerbare-energien-im-verkehr' },
      { label: 'Zoll THG-Quote Merkblatt', url: 'https://www.zoll.de/' }
    ],
    watchType: 'open_question'
  },

  // 11. IT CIC domestic requirement
  {
    id: 'it_cic_domestic_requirement',
    topic: 'Italian CIC Italian injection and transport requirement',
    claim: 'Italian CIC certificates under DM 2 Mar 2018 Art. 5(1) require physical injection into the Italian gas grid and domestic transport use; no active Art. 12 reciprocity agreements exist.',
    appImpact: 'Blocks foreign European biomethane from generating Italian CIC transport quota certificates.',
    sources: [
      { label: 'GSE Servizi Biometano', url: 'https://www.gse.it/servizi-per-te/biometano' },
      { label: 'Normattiva DM 2 Marzo 2018', url: 'https://www.normattiva.it/' }
    ],
    watchType: 'fact'
  },

  // 12. FR TIRUERT, CPB & IRICC
  {
    id: 'fr_transport_schemes',
    topic: 'French TIRUERT 2026 exclusion, CPB French injection, and IRICC 2027',
    claim: 'TIRUERT 2026 excludes gaseous biomethane (bioGNV deleted by Amendment 3492); CPB transport certificates require French grid injection with a €100/MWh ceiling; IRICC planned for 2027.',
    appImpact: 'Closes French transport compliance to foreign origins in 2026; clamps French CPB netback value at €100/MWh.',
    sources: [
      { label: 'Assemblée Nationale Amendment 3492', url: 'https://www.assemblee-nationale.fr' },
      { label: 'Légifrance Décret n° 2024-421 (CPB)', url: 'https://www.legifrance.gouv.fr' }
    ],
    watchType: 'fact'
  },

  // 13. CZ Act 165/2012 §47d
  {
    id: 'cz_act_165_transport_pos',
    topic: 'Czech Act No. 165/2012 Coll. §47d origin-neutral transport compliance',
    claim: 'Czech renewable transport obligation accepts either a GO or a Proof of Sustainability (PoS) from any EU interconnected grid origin with no domestic injection restriction.',
    appImpact: 'Approves cross-border mass-balance PoS imports from all interconnected EU origins into Czechia.',
    sources: [
      { label: 'Zákon č. 165/2012 Sb. Zákony pro lidi', url: 'https://www.zakonyprolidi.cz/cs/2012-165' },
      { label: 'OTE Registry Rules', url: 'https://www.ote-cr.cz/' }
    ],
    watchType: 'fact'
  },

  // 14. UK RTFO European pipeline biomethane
  {
    id: 'uk_rtfo_eu_pipeline',
    topic: 'UK RTFO acceptance of European pipeline biomethane',
    claim: 'UK DfT RTFO Biomethane Guidance (Dec 2024 §3.17 & §2.13) accepts biomethane injected into interconnected continental EU gas grids for RTFC issuance, provided interconnector capacity is booked and nominated.',
    appImpact: 'Enables continental European biomethane plants to clear the UK RTFO transport market.',
    sources: [
      { label: 'UK DfT RTFO Guidance Dec 2024', url: 'https://www.gov.uk/government/publications/renewable-transport-fuel-obligation-rtfo-compliance-guidance' }
    ],
    watchType: 'fact'
  },

  // 15. Swiss Grid gas tax classification
  {
    id: 'ch_grid_gas_tax',
    topic: 'Swiss mineral oil tax relief exclusion for grid gas',
    claim: 'Grid gas commingled in the pipeline system is treated at Swiss customs as fossil natural gas, rendering it ineligible for mineral oil tax (MinöStG) relief or CO2 levy exemption.',
    appImpact: 'Precludes grid-delivered biomethane from claiming Swiss transport compliance tax credits.',
    sources: [
      { label: 'Swiss Federal Customs BAZG Gas Regulations', url: 'https://www.bazg.admin.ch/' },
      { label: 'Federal Council Energy Tax Report', url: 'https://www.admin.ch/' }
    ],
    watchType: 'fact'
  },

  // 16. Belgium regional registry status
  {
    id: 'be_regional_registries',
    topic: 'Belgian regional registry separation & AIB status',
    claim: 'Only Brussels (Brugel) is on AIB gas (on paper, with zero recorded transfers); Flanders (VREG) and Wallonia (SPW) gas GOs are national, non-EECS certificates barred from the AIB Hub.',
    appImpact: 'Prevents Flemish and Walloon biomethane producers from exporting GOs via the AIB Hub.',
    sources: [
      { label: 'AIB Domain Protocol Flanders', url: 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members' },
      { label: 'Wallonia Renewable Gas GO FAQ', url: 'https://energie.wallonie.be/' }
    ],
    watchType: 'fact'
  },

  // 17. UDB gas module timeline
  {
    id: 'udb_gas_timeline',
    topic: 'Union Database (UDB) gas module deployment timeline',
    claim: 'The European Union Database (UDB) gas module deployment is postponed to end-2026 per European Biogas Association (EBA) announcements; mass balance traceability currently operates via national registers.',
    appImpact: 'Traders cannot record or clear biomethane consignments directly in the UDB gas module today.',
    sources: [
      { label: 'European Commission DG ENER Union Database', url: 'https://energy.ec.europa.eu/topics/renewable-energy/bioenergy/union-database_en' },
      { label: 'European Biogas Association (EBA) Updates', url: 'https://www.europeanbiogas.eu/' }
    ],
    watchType: 'fact'
  },

  // 18. Directive 2024/1788 transposition
  {
    id: 'dir_2024_1788_infringements',
    topic: 'Directive (EU) 2024/1788 transposition infringement notices',
    claim: 'European Commission issued formal infringement notices to 26 Member States in September 2026 for incomplete transposition of Directive (EU) 2024/1788 (gas and hydrogen decarbonisation package).',
    appImpact: 'Signals ongoing regulatory delays and divergent national gas network access rules across Europe.',
    sources: [
      { label: 'EU Infringement Decisions Register', url: 'https://ec.europa.eu/atwork/applying-eu-law/infringements-proceedings/' },
      { label: 'Directive (EU) 2024/1788 EUR-Lex', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1788' }
    ],
    watchType: 'fact'
  },

  // --- Top 10 Open Questions from OPEN-QUESTIONS.md (ranked by unblocked matrix cells) ---

  // OQ 1: Q-EU-1 (69 cells)
  {
    id: 'oq_eu_third_country_udb',
    topic: 'Open Question Q-EU-1: Third-Country Grid Mass Balance & UDB Integration',
    claim: 'Whether RED III Art. 31a and Implementing Regulation 2022/996 will recognize connected third-country grids (GB, CH, and Moffat transit to Ireland) as part of the single EU UDB mass balance zone remains unsettled (69 matrix cells unblocked).',
    appImpact: 'Determines GB and CH origin biomethane compliance into all 23 connected EU destination countries, and continental transit to Ireland.',
    sources: [
      { label: 'DG ENER Contact & Directives', url: 'https://energy.ec.europa.eu/contact_en' },
      { label: 'EUR-Lex Directive (EU) 2023/2413 (RED III)', url: 'https://eur-lex.europa.eu/eli/dir/2023/2413/oj' }
    ],
    watchType: 'open_question'
  },

  // OQ 2: Q-FR-1 (14 cells / 68 org cells)
  {
    id: 'oq_fr_ets_tag_acceptance',
    topic: 'Open Question Q-FR-1: Mandatory French ETS/ESR Tag Acceptance on AIB Gas GOs',
    claim: 'Whether EEX accepts imported EECS gas GOs from all AIB Gas Scheme members provided the ETS/ESR tag is present, and which member registries can transmit this tag, is unconfirmed (14 cells unblocked).',
    appImpact: 'Clarifies incoming AIB gas GO routes into France from CZ, EE, ES, FI, IT, LT, LV, PT, SE, SK, HU, BE, AT, NL.',
    sources: [
      { label: 'EEX Gas Registries Portal', url: 'https://www.eex.com/' }
    ],
    watchType: 'open_question'
  },

  // OQ 3: Q-FR-2 (27 cells)
  {
    id: 'oq_fr_iricc_cross_border',
    topic: 'Open Question Q-FR-2: Cross-Border Biomethane Eligibility Under French IRICC',
    claim: 'Whether the French IRICC transport mechanism (starting 1 Jan 2027) will accept biomethane injected in another Member State delivered via grid mass balance with EECS GO and PoS is pending final decree promulgation (27 cells unblocked).',
    appImpact: 'Unlocks 27 incoming cross-border compliance routes into France post-2026.',
    sources: [
      { label: 'DGEC Energy Code & Consultations', url: 'https://www.ecologie.gouv.fr/' }
    ],
    watchType: 'open_question'
  },

  // OQ 4: Q-FR-3 (27 cells)
  {
    id: 'oq_fr_subsidised_pos_export',
    topic: 'Open Question Q-FR-3: Export of PoS on Biomethane from Purchase Obligation Plants',
    claim: 'Whether physical biomethane from French feed-in contract (obligation d\'achat) plants can be exported with an ISCC/REDcert PoS without subsidy clawback, while the GO is auctioned by the State, is unsettled (27 cells unblocked).',
    appImpact: 'Governs physical export feasibility for biomethane produced under French state support contracts.',
    sources: [
      { label: 'DGEC Biomethane Regulations', url: 'https://www.ecologie.gouv.fr/' }
    ],
    watchType: 'open_question'
  },

  // OQ 5: Q-IT-1 (14 cells / 68 org cells)
  {
    id: 'oq_it_imported_go_validation',
    topic: 'Open Question Q-IT-1: Imported EECS GO Cancellation Data Validation by GSE',
    claim: 'Which specific data fields of an imported EECS gas GO GSE validates to satisfy DM 224/2023 cancellation criteria (sustainability, transport end-use, GHG data) has not been verified in commercial volumes (14 cells unblocked).',
    appImpact: 'Clarifies commercial viability of 14 incoming AIB GO routes into Italy.',
    sources: [
      { label: 'GSE Biometano Support Portal', url: 'https://www.gse.it/servizi-per-te/biometano' }
    ],
    watchType: 'open_question'
  },

  // OQ 6: Q-IT-2 (27 cells)
  {
    id: 'oq_it_dm2018_pos_export',
    topic: 'Open Question Q-IT-2: Export of Mass-Balance PoS from Italian Supported Plants',
    claim: 'Whether biomethane from Italian supported plants (DM 2 Mar 2018 or DM 15 Sep 2022) can be exported cross-border with a PoS without claiming domestic CIC or risking tariff forfeiture is unaddressed in public texts (27 cells unblocked).',
    appImpact: 'Governs physical export feasibility for Italian agricultural biomethane producers.',
    sources: [
      { label: 'GSE Guida all\'Incentivazione del Biometano', url: 'https://www.gse.it/servizi-per-te/biometano' }
    ],
    watchType: 'open_question'
  },

  // OQ 7: Q-CH-1 (27 cells)
  {
    id: 'oq_ch_hkn_export_route',
    topic: 'Open Question Q-CH-1: Swiss Biomethane HKN Export via ERGaR and AIB',
    claim: 'Whether Swiss biomethane Guarantees of Origin (HKN) can be electronically exported via ERGaR (Energinet lists CH->DK active) or AIB Hub is contradictory between UVEK and hub datasets (27 cells unblocked).',
    appImpact: 'Determines whether Swiss producers can sell certificates into EU Member States.',
    sources: [
      { label: 'Pronovo HKN Portal', url: 'https://pronovo.ch/en/services/guarantees-of-origin/' }
    ],
    watchType: 'open_question'
  },

  // OQ 8: Q-CH-3 (27 cells)
  {
    id: 'oq_ch_tax_relief_vhbt',
    topic: 'Open Question Q-CH-3: Swiss Mineralölsteuer Relief for Grid-Imported Biomethane Post-July 2026',
    claim: 'Whether revised VHBT regulations in force from 1 July 2026 permit Swiss gas/fuel importers to claim Mineralölsteuer relief or CO2 compensation for grid biomethane backed by foreign GO/PoS is unclarified by BAZG circulars (27 cells unblocked).',
    appImpact: 'Determines economic feasibility of commercial biomethane imports into Switzerland.',
    sources: [
      { label: 'Swiss Federal Office for the Environment BAFU', url: 'https://www.bafu.admin.ch/' },
      { label: 'Swiss Federal Customs BAZG', url: 'https://www.bazg.admin.ch/' }
    ],
    watchType: 'open_question'
  },

  // OQ 9: Q-DE-2 (23 cells)
  {
    id: 'oq_de_interim_audit_pos',
    topic: 'Open Question Q-DE-2: Quotenstelle Interim Audit Verification Under BImSchG §37b(6)',
    claim: 'What specific documentary chain (Nabisy, ISCC PoS, grid contracts) Quotenstelle requires for EU mass-balance biomethane under BImSchG §37b(6) prior to UDB launch has not been promulgated in secondary ordinances (23 cells unblocked).',
    appImpact: 'Defines evidentiary requirements for all cross-border EU deliveries into Germany\'s THG-Quote.',
    sources: [
      { label: 'Hauptzollamt Frankfurt (Oder) Quotenstelle', url: 'https://www.zoll.de' },
      { label: 'dena Biogasregister', url: 'https://www.biogasregister.de' }
    ],
    watchType: 'open_question'
  },

  // OQ 10: Q-DE-3 (4 origins)
  {
    id: 'oq_de_subsidised_foreign_fuels',
    topic: 'Open Question Q-DE-3: Potential Exclusion of Foreign Subsidised Biomethane from DE THG-Quote',
    claim: 'Whether foreign biomethane receiving origin operational support (e.g. DK pristillæg, NL SDE++, FR OA) will be excluded from the THG-Quote by future secondary decree remains an unpromulgated political risk (4 major origin routes).',
    appImpact: 'Directly affects volume availability from Denmark, Netherlands, France, and Italy into DE_THG.',
    sources: [
      { label: 'BMUV Biofuels and Emissions Control Portal', url: 'https://www.bmuv.de/' }
    ],
    watchType: 'open_question'
  }
];
