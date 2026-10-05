// C:\Dev\route-audit\build\rules.mjs
// Biomethane Desk Cockpit - Rule Base and Data Synthesis
// Consolidated from research files: go-ergar.md, go-aib.md, go-nohub.md, pos-origin-grid.md,
// pos-dest-nw.md, pos-dest-se.md, pos-dest-se-pass2.md, and SYNTHESIS-NOTES.md (authoritative).

export const COUNTRIES = [
  'AT', 'BE', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV',
  'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
];

export const REGISTRIES = {
  AT: {
    name: 'E-Control (AIB) / AGCS Biomethan Register (ERGaR)',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'E-Control DP C.3: Cancelation for usage in another Domain (i.e. Ex Domain Cancellations) is not allowed (in exceptional cases only within AIB Members and under precondition of cancellation agreement).'
    },
    exDomainNote: 'E-Control DP C.3: Cancelation for usage in another Domain (i.e. Ex Domain Cancellations) is not allowed.',
    exportRestrictions: [
      { text: 'Subsidised production GOs cannot be exported via AIB hub (§129b GWG / survey: subsidised GOs must be used in Austria)', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Foreign gas GOs accepted via hub if meeting §129b(8) GWG content requirements', requires: 'GWG §129b(8) content compliance' }
    ],
    sources: [
      {
        claim: 'E-Control is statutory gas GO issuer on AIB; AGCS operates ERGaR CoO scheme',
        url: 'https://www.e-control.at/herkunftsnachweisdatenbank/faq',
        quote: 'Herkunftsnachweise werden für Strom, Gas und Wasserstoff ausgestellt ... Die österreichische Herkunftsnachweisdatenbank ist über den AIB-Hub mit den Registern anderer Länder verbunden.',
        grade: 'PRIMARY'
      },
      {
        claim: 'E-Control gas hub transfers resumed May 2026 after planned outage',
        url: 'https://www.aib-net.org/news-events/newsarchive',
        quote: 'Austrian gas registry outage from April 30 to May 17, 2026',
        grade: 'PRIMARY'
      },
      {
        use: ['EXDOMAIN'],
        use: ['EXDOMAIN'],
        claim: 'Ex-domain cancellation prohibited except exceptional agreement',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPAT-E-Control%20Austria%20Domain%20Protocol%2025052023_Correction%20200092024_clean%20version_.pdf',
        quote: 'Cancelation for usage in another Domain (i.e., Ex Domain Cancellations) is not allowed (in exceptional cases only within AIB Members and under the precondition to sign a cancellation agreement).',
        grade: 'PRIMARY'
      },
      {
        use: ['ORIGIN'],
        claim: 'Subsidised Austrian gas GOs are excluded from international transfer and trade',
        url: 'https://www.e-control.at/herkunftsnachweisdatenbank/faq',
        quote: 'Herkunftsnachweise, die aus geförderten Anlagen stammen, sind vom internationalen Transfer und Handel ausgeschlossen.',
        grade: 'PRIMARY'
      }
    ]
  },

  BE: {
    name: 'Flanders (VREG) & Wallonia (SPW) [Brussels: BRUGEL on paper]',
    operational: true,
    // Biomethane is produced in Flanders and Wallonia, neither of which is hub connected. Brussels (BRUGEL)
    // is AIB-gas connected on paper (EEA GOs under 12 months only) but has no production and has never
    // recorded a gas transfer. The Brussels registry is therefore modelled as a destination-only OPEN lane.
    brusselsGas: {
      aib: 'CONNECTED',
      transfersRecorded: 0,
      note: 'Brussels (BRUGEL) is AIB-gas connected: recognises only EECS gas GOs under 12 months from the EEA, via the hub; zero gas transfers ever recorded; Flanders and Wallonia are not hub connected.'
    },
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'CONDITIONAL',
      value: 'CONDITIONAL',
      note: 'Wallonia DP C.3.5 / Flanders DP: ex-domain requires agreement with destination issuing body (conditional under SYNTHESIS-NOTES.md).'
    },
    exDomainNote: 'Ex-domain requires agreement with destination issuing body.',
    exportRestrictions: [
      { text: 'Flemish and Walloon biomethane GOs are national non-EECS certificates barred from the AIB Hub; Brussels is on AIB gas but has near-zero production and zero recorded transfers', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Wallonia does not recognise foreign gas GOs; Flanders has no import mechanism', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'Flemish and Walloon gas GOs are national non-EECS certificates barred from the AIB hub',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPBEF%20Domain%20Protocol%20Clean%20Final.pdf',
        quote: 'Currently these national GOs are not compatible with the EECS system, and hence cannot be traded over the AIB hub. ... (*) Non-EECS certificates may not be transferred over the AIB hub.',
        grade: 'PRIMARY'
      },
      {
        claim: 'Wallonia does not recognise foreign gas GOs and cannot export',
        url: 'https://energie.wallonie.be/home/les-marches-et-les-acteurs/le-marche-des-garanties-d-origine/faq-garanties-d-origine-pour-le-gaz-renouvelable.html',
        quote: 'À l\'heure actuelle, les échanges de GO gaz avec d\'autres régions ou pays ne sont pas possibles. Les GO gaz provenant de l\'étranger ne sont pas reconnues en Wallonie.',
        grade: 'PRIMARY'
      },
      {
        use: ['DEST'],
        claim: 'Brussels (BRUGEL) is AIB gas connected on paper and recognises only EECS gas GOs under 12 months, via the AIB hub',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPBEB-BRUGEL-Brussels%20Domain%20Protocol%20clean.pdf',
        quote: 'Only recognised GOs can be imported in the Brussels Domain and only via the AIB HUB.',
        grade: 'PRIMARY'
      },
      {
        use: ['DEST'],
        claim: 'Brussels (BRUGEL) is on the AIB hub on paper but no gas transfer has ever been recorded',
        url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html',
        quote: 'No gas flow at all with BE-Brussels, HU or SE as sender or receiver.',
        grade: 'SECONDARY'
      }
    ]
  },

  BG: {
    name: 'SEDA (Sustainable Energy Development Agency / АУЕР)',
    operational: false,
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'No operating gas registry; SEDA is an applicant for electricity only at AIB.'
    },
    exDomainNote: 'No operating gas registry; SEDA is an applicant for electricity only at AIB.',
    exportRestrictions: [
      { text: 'No operational gas GO registry or hub connection exists in Bulgaria', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No operational gas GO registry to receive imports', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'Bulgarian ordinance E-RD-04-2 covers GOs for biogas in principle',
        url: 'https://dv.parliament.bg/DVWeb/showMaterialDV.jsp?idMat=211900',
        quote: 'издаване, прехвърляне и отмяна на гаранциите за произход на електрическа енергия, топлинна енергия и енергия за охлаждане от възобновяеми източници, биогаз и зелен водород',
        grade: 'PRIMARY'
      },
      {
        claim: 'SEDA is an applicant of the AIB Electricity Scheme Group only (no gas scheme membership)',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members',
        quote: 'AIB member - Applicant of the Electricity Scheme Group',
        grade: 'PRIMARY'
      }
    ]
  },

  CH: {
    name: 'Pronovo AG',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: true,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP gas chapter E.12.8: No Ex-Domain Cancellations are allowed in gas GO System.'
    },
    exDomainNote: 'No Ex-Domain Cancellations are allowed in gas GO System.',
    exportRestrictions: [
      { text: 'Pronovo gas is officially imports only on AIB and UVEK 2024 states Swiss HKN export is not possible', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Imports accepted via AIB and ERGaR for voluntary/ETS disclosure; statutory compliance requires state treaties', requires: 'Voluntary use or state treaty' }
    ],
    sources: [
      {
        claim: 'Pronovo is gas imports only on AIB and in law',
        url: 'https://www.aib-net.org/registries',
        quote: 'Pronovo | Electricity (imports, exports) + Gas (imports only)',
        grade: 'PRIMARY'
      },
      {
        use: ['ORIGIN'],
        claim: 'Swiss HKN export currently not possible',
        url: 'https://pubdb.bfe.admin.ch/de/publication/download/11643',
        quote: 'Ein Export von Schweizer HKN ist zurzeit nicht möglich.',
        grade: 'PRIMARY'
      },
      {
        use: ['DEST'],
        claim: 'Pronovo import list (18 Jun 2026): gas HKN can be imported via the AIB hub from these registries (names PT / REN)',
        url: 'https://pronovo.ch/import-von-gas-hkn/',
        quote: 'Import via AIB hub possible from AT (E-Control), BE (Brugel), CZ (OTE), FI (Gasgrid), IT (GSE), LV (Conexus), NL (Verticer), PT (REN), ES (Enagás), Albania (ERE), EE (Elering), AT (E-Control gas), SK (SPP Distribúcia)',
        grade: 'PRIMARY'
      }
    ]
  },

  CZ: {
    name: 'OTE, a.s.',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'CONDITIONAL',
      value: 'CONDITIONAL',
      note: 'OTE DP C.3.6 & E.9: Ex-domain cancellations allowed only towards consumption in countries outside AIB under exceptional circumstances.'
    },
    exDomainNote: 'Ex-domain cancellations allowed only towards consumption in countries outside AIB under exceptional circumstances.',
    exportRestrictions: [
      { text: 'Supported production GOs are issued to state account and auctioned; tradeable once purchased', appliesTo: [] }
    ],
    importRestrictions: [
      { text: 'Only EECS GOs valid under Act No. 165/2012 Coll. accepted; expired GOs rejected', requires: 'Act 165/2012 validity' }
    ],
    sources: [
      {
        claim: 'OTE connected to AIB gas hub since May 2024; imports validated under Act 165/2012',
        url: 'https://www.ote-cr.cz/en/gos_and_allowances/guarantees-of-origin/domain-protocol-for-gos.pdf',
        quote: 'Only EECS GO Certificates that can be validated as Guarantees of Origin according to the Act No. 165/2012 Coll. can be transferred into the EECS GO Registration Database',
        grade: 'PRIMARY'
      }
    ]
  },

  DE: {
    name: 'dena Biogasregister (non-statutory)',
    operational: true,
    aib: 'NONE',
    aibImportOnly: false,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'dena operates within the ERGaR scheme and CERT-X; no general ex-domain cancellation mechanism.'
    },
    exDomainNote: 'dena operates within the ERGaR scheme and CERT-X; no general ex-domain cancellation mechanism.',
    exportRestrictions: [
      { text: 'Cannot export to DK (Energinet import ban) or NL (VertiCer left ERGaR)', appliesTo: ['DK', 'NL'] }
    ],
    importRestrictions: [
      { text: 'Imports via ERGaR only from connected partner registries; NL terminated on 1 Jul 2026', refusesFrom: ['NL'] }
    ],
    sources: [
      {
        claim: 'dena is non-statutory register connected via ERGaR to select partners',
        url: 'https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/',
        quote: 'Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR: VertiCer ... GGCS ... Biomethanregister.at ... Danish biomethane registry ... Register of renewable gases operated by SPP - distribúcia',
        grade: 'PRIMARY'
      },
      {
        claim: 'dena not connected to AIB hub; UBA statutory gas GO register not yet live',
        url: 'https://www.dena.de/en/biogasregister/trade-of-biomethane/current-information/cen-standard-en16325-no-short-term-impact-on-international-trade/',
        quote: 'not expected until 2026 at the earliest',
        grade: 'PRIMARY'
      }
    ]
  },

  DK: {
    name: 'Energinet',
    operational: true,
    aib: 'APPLICANT',
    aibImportOnly: false,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'ALLOWED',
      value: 'ALLOWED',
      note: 'Energinet cross-border page: Ex-domain cancellation is still allowed for countries without a registry or if the registry is not a member of the ERGaR hub.'
    },
    exDomainNote: 'Energinet allows ex-domain cancellation for countries without a registry or outside ERGaR.',
    exportRestrictions: [
      { text: 'ERGaR exports allowed only to DE (dena), SK, LT, CH; barred to AT, GB, NL', appliesTo: ['AT', 'GB', 'NL'] }
    ],
    importRestrictions: [
      { text: 'ERGaR imports allowed only from SK, LT, CH; imports from DE (dena), AT, GB, NL barred', refusesFrom: ['DE', 'AT', 'GB', 'NL'] }
    ],
    sources: [
      {
        claim: 'Energinet published cross-border transaction options via ERGaR and allows ex-domain cancellations',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Imports from Dena to Denmark are not allowed ... it has been possible to cancel GOs outside Denmark (ex domain). This is still allowed for countries without a registry or if the registry is not a member of the ERGaR hub.',
        grade: 'PRIMARY'
      },
      {
        claim: 'Energinet is applicant to AIB Gas Scheme Group since 17 Jun 2026',
        url: 'https://www.aib-net.org/news-events/news',
        quote: 'gas applicant since 17 Jun 2026',
        grade: 'PRIMARY'
      }
    ]
  },

  EE: {
    name: 'Elering AS',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP E.12.7 & C.3.6.3: Ex-domain cancellations are not permitted.'
    },
    exDomainNote: 'Ex-domain cancellations are not permitted.',
    exportRestrictions: [],
    importRestrictions: [
      { text: 'Imported biomethane GOs serve disclosure only, not national target accounting (E.10.3); supported-origin GOs may be refused (C.4)', requires: 'Disclosure purpose, unsupported origin' }
    ],
    sources: [
      {
        claim: 'Elering connected to AIB gas hub; imported GOs disclosure only',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPEE-%20Domain%20Protocol%20Elering%20Estonia%20Clean%20version%2020241210.pdf',
        quote: 'Imported biomethane GOs can be used to provide proof of biomethane consumption to the final customer (disclosure purpose) but cannot automatically be used for fulfilling the national renewable energy obligations',
        grade: 'PRIMARY'
      }
    ]
  },

  ES: {
    name: 'Enagás GTS',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP E.10.13: No ex-domain cancellations are allowed.'
    },
    exDomainNote: 'No ex-domain cancellations are allowed.',
    exportRestrictions: [],
    importRestrictions: [
      { text: 'Renewable gas GOs with production date within last 12 months only', requires: 'Production within 12 months' }
    ],
    sources: [
      {
        claim: 'Enagás connected to AIB gas hub; forbids ex-domain cancellations',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2023-DPESG-Enagas%20GTS%20Spain%20Domain%20Protocol%20-%20Gas_231213.pdf',
        quote: 'No ex-domain cancellations are allowed. ... The last day on which the Output it relates was produced took place on the previous 12 months',
        grade: 'PRIMARY'
      }
    ]
  },

  FI: {
    name: 'Gasgrid Finland Oy',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'CONDITIONAL',
      value: 'CONDITIONAL',
      note: 'DP C.3: Ex-domain cancellation allowed only where domains are not connected to AIB Hub, subject to agreement.'
    },
    exDomainNote: 'Ex-domain cancellation allowed only where domains are not connected to AIB Hub, subject to agreement.',
    exportRestrictions: [],
    importRestrictions: [
      { text: 'Imports subject to verification by AIB Hub and Gasgrid Finland; non-AIB requires Energy Authority approval' }
    ],
    sources: [
      {
        claim: 'Gasgrid Finland connected to AIB gas hub; free export/import via hub',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFI-Domain%20Protocol%20Clean%20Gasgrid%20Finland%20Oy.pdf',
        quote: 'In transfers between accounts in two different registries, the success of the transfer is subject to the verification process of the AIB HUB and the receiving registry.',
        grade: 'PRIMARY'
      }
    ]
  },

  FR: {
    name: 'EEX (Powernext)',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'CONDITIONAL',
      value: 'CONDITIONAL',
      note: 'DP Part III E.10: Ex-domain permitted only for European countries without AIB Hub access, subject to bilateral EDC agreement.'
    },
    exDomainNote: 'Ex-domain permitted only for European countries without AIB Hub access, subject to bilateral agreement.',
    exportRestrictions: [
      { text: 'CPB (biogas production certificates) cannot be exported; supported plant GOs auctioned by DGEC', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Refuses imported EECS gas GOs that lack the ETS/ESR eligibility tag; non-EECS refused', requires: 'ETS/ESR eligibility tag' }
    ],
    sources: [
      {
        claim: 'EEX connected to AIB gas hub; requires ETS eligibility tag on imported GOs',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFR-Domain%20Protocol%20EEX%20Gas%20Application%20Final%20Clean%20ESG.pdf',
        quote: 'If imported to France, EECS GOs must contain an indication whether the reduction of greenhouse gas emissions ... is eligible to qualify for accounting under the Emission Trading System ... In case this information is missing, the EECS GOs are refused.',
        grade: 'PRIMARY'
      }
    ]
  },

  GB: {
    name: 'GGCS (Green Gas Certification Scheme / REAL)',
    operational: true,
    aib: 'NONE',
    aibImportOnly: false,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'GGCS Guidance Doc 7: Transfers to/from registries other than ERGaR CoO participants are not possible.'
    },
    exDomainNote: 'Transfers to/from registries other than ERGaR CoO participants are not possible.',
    exportRestrictions: [
      { text: 'Exports permitted to AT (AGCS), DE (dena), CH (Pronovo, waste/residue labels only); barred to DK, SK, LT, NL due to UK third-country status', appliesTo: ['DK', 'SK', 'LT', 'NL'] }
    ],
    importRestrictions: [
      { text: 'Imports permitted from AT (AGCS), DE (dena), LT (Amber Grid), SK (SPP-d); barred from DK, CH, NL', refusesFrom: ['DK', 'CH', 'NL'] }
    ],
    sources: [
      {
        claim: 'GGCS operates under ERGaR; third-country status bars exports to RED II EU issuing bodies',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'Energinet is an appointed Issuing Body under the terms of RED II and they will not accept transfers from registries which do not share that status ... SPP Distribúcia is not accepting transfers of RGGOs from the GGCS',
        grade: 'PRIMARY'
      }
    ]
  },

  GR: {
    name: 'DAPEEP',
    operational: false,
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'Law 5215/2025 created framework, but DAPEEP is electricity-only at AIB; no gas registry module operating.'
    },
    exDomainNote: 'No gas registry module operating.',
    exportRestrictions: [
      { text: 'No operational gas GO registry or hub connection exists in Greece', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No operational gas GO registry to receive imports', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'DAPEEP AIB protocol covers electricity only; no gas import/export route',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPGR-DAPEEP_Greece_Domain_Protocol_final_-_clean.pdf',
        quote: 'the only known Issuing Body in this Domain ... responsible for Guarantees of Origin in Greece, for gas, hydrogen and heating/cooling for renewable energy sources',
        grade: 'PRIMARY'
      },
      {
        claim: 'DAPEEP protocol only allows import of EECS GOs issued for electricity',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPGR-DAPEEP_Greece_Domain_Protocol_final_-_clean.pdf',
        quote: 'EECS Certificates allowed to be imported are Guarantees of Origin issued for electricity',
        grade: 'PRIMARY'
      }
    ]
  },

  HR: {
    name: 'HROTE',
    operational: false,
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'HROTE is electricity-only at AIB; decree NN 28/2023 allows gas GOs but no gas module in operation.'
    },
    exDomainNote: 'No gas GO module in operation.',
    exportRestrictions: [
      { text: 'No operational gas GO registry or hub connection exists in Croatia', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No operational gas GO registry to receive imports', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'HROTE is full member of Electricity Scheme Group only',
        url: 'https://www.aib-net.org/registries',
        quote: 'Croatia / HROTE / Electricity',
        grade: 'PRIMARY'
      }
    ]
  },

  HU: {
    name: 'MEKH',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'CONDITIONAL',
      value: 'CONDITIONAL',
      note: 'DP E.12: Ex-domain export requires cancellation agreement with destination or that destination has no gas registry.'
    },
    exDomainNote: 'Ex-domain export requires cancellation agreement or destination having no gas registry.',
    exportRestrictions: [],
    importRestrictions: [
      { text: 'Imports require manual MEKH approval per survey; maximum 12 months from production', requires: 'MEKH approval' }
    ],
    sources: [
      {
        claim: 'MEKH is listed on the AIB registries table for electricity and gas',
        url: 'https://www.aib-net.org/registries',
        quote: 'Hungary | MEKH | Electricity + Gas',
        grade: 'PRIMARY'
      },
      {
        claim: 'No gas transfer to or from MEKH recorded on the AIB hub Jan 2024 - Aug 2026',
        url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html',
        quote: 'No gas flow at all with BE-Brussels, HU or SE as sender or receiver.',
        grade: 'SECONDARY'
      }
    ]
  },

  IE: {
    name: 'Gas Networks Ireland (GNI)',
    operational: false,
    aib: 'OBSERVER',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'UNKNOWN',
      value: 'UNKNOWN',
      note: 'Manual Excel pilot registry; cannot connect to AIB or ERGaR; replacement registry planned Q1 2027.'
    },
    exDomainNote: 'Manual Excel pilot registry; cannot connect to hubs.',
    exportRestrictions: [
      { text: 'Pilot registry cannot connect to hubs; manual ad-hoc exports only', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Manual pilot recognition only (e.g. past DK/DE imports for RTFO); no electronic hub transfers', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'GNI operates manual Excel pilot; CRU framework mandates new registry by Jan 2027',
        url: 'https://www.gasnetworks.ie/sites/default/files/2026-02/GIF-Green-Gas-Certification.pdf',
        quote: 'while the Registry has an interim solution to cater for import/export of GO\'s, it cannot connect to hubs (AiB and ERGaR) ... Go-Live Q1 2027',
        grade: 'PRIMARY'
      }
    ]
  },

  IT: {
    name: 'GSE',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP C.3.5: Cancellation for usage in another Domain (i.e., Ex Domain Cancellations) are not allowed.'
    },
    exDomainNote: 'Cancellation for usage in another Domain (i.e., Ex Domain Cancellations) are not allowed.',
    exportRestrictions: [
      { text: 'Gas GOs supported under DM 2018 or DM 2022 cannot be exported; unsupported and electricity-use only', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Requires sustainability compliance, transport/other gas usage, and GHG emissions data; CH-issued GOs blocked', requires: 'Sustainability, gas usage, and GHG emission data' }
    ],
    sources: [
      {
        claim: 'GSE connected to AIB gas hub; supported transport GOs locked to Italy',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPIT-GSE%20Italy%20-%20Domain%20Protocol%20Italy%2020240710%20-%20clean%20clean.pdf',
        quote: 'GAS GOS transport and other uses, pursuant to Ministerial Decree 2018 and pursuant to Ministerial Decree 2022, cannot be exported. GAS GOS transport and other uses, not supported by any support mechanism, can be exported.',
        grade: 'PRIMARY'
      }
    ]
  },

  LT: {
    name: 'AB Amber Grid',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP E.10.8: Ex-domain export only where destination is not connected to AIB Hub and bilateral agreement exists.'
    },
    exDomainNote: 'Ex-domain export only where destination is not connected to AIB Hub and bilateral agreement exists.',
    exportRestrictions: [
      { text: 'Pre-membership legacy gas GOs cannot be exported', appliesTo: [] }
    ],
    importRestrictions: [
      { text: 'Amber Grid verifies sustainability compliance, interconnected gas grid, and no double counting' }
    ],
    sources: [
      {
        claim: 'Amber Grid joined ERGaR 23 Apr 2026; connected to AIB gas hub',
        url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
        quote: 'GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia.',
        grade: 'PRIMARY'
      }
    ]
  },

  LU: {
    name: 'ILR (Institut Luxembourgeois de Régulation)',
    operational: false,
    importRecognition: 'AUTOMATIC_IN_LAW',
    hubNote: 'A gas GO scheme exists in Luxembourg law (RGD 4 Nov 2022, ILR) but ILR is electricity-only at AIB and no operating gas module is evidenced.',
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'RGD of 4 Nov 2022 establishes framework, but ILR is electricity-only on AIB; no operating gas module.'
    },
    exDomainNote: 'No operating gas module.',
    exportRestrictions: [
      { text: 'No operational gas GO registry or hub connection exists in Luxembourg', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No operational gas GO registry to receive imports', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'ILR is electricity-only member of AIB; gas GO scheme not operating',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2023-DPLU-ILR_Luxembourg_Domain_Protocol_Luxembourg_25052023.pdf',
        quote: 'There is no European and no national legal framework about disclosure of energy sources in the other energy carriers: gas, heating and cooling. The present section refers to electricity only.',
        grade: 'PRIMARY'
      }
    ]
  },

  LV: {
    name: 'AS Conexus Baltic Grid',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP E.9.8: Ex-domain export only where destination is not connected to AIB Hub and bilateral agreement exists.'
    },
    exDomainNote: 'Ex-domain export only where destination is not connected to AIB Hub and bilateral agreement exists.',
    exportRestrictions: [
      { text: 'Pre-membership legacy gas GOs cannot be exported through AIB Hub', appliesTo: [] }
    ],
    importRestrictions: [],
    sources: [
      {
        claim: 'Conexus connected to AIB gas hub; no restrictions on renewable gas transfers',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPLV-Conexus_Domain_Protocol_approved.pdf',
        quote: 'There are no restrictions for transfer via AIB Hub of EECS GOs for renewable gas, except for hydrogen',
        grade: 'PRIMARY'
      }
    ]
  },

  NL: {
    name: 'VertiCer B.V.',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'LEFT',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP C.3.4: Cancellations for usage in another Domain (i.e., Ex Domain Cancellations) are not allowed.'
    },
    exDomainNote: 'Cancellations for usage in another Domain (i.e., Ex Domain Cancellations) are not allowed.',
    exDomainIn: {
      status: 'NOT_ALLOWED',
      note: 'VertiCer DP E.10.1: it is not allowed to cancel EECS Certificates in another Domain for use in the Netherlands, so a foreign ex-domain cancellation cannot serve Dutch consumption.'
    },
    exportRestrictions: [
      { text: 'Exports via ERGaR terminated on 1 Jul 2026; exports permitted via AIB Hub only to EU-designated issuing bodies', appliesTo: ['DE', 'GB'] }
    ],
    importRestrictions: [
      { text: 'Only EECS GOs from EU Member States or Art. 19(11) treaty states; CH-issued GOs refused', refusesFrom: ['CH'] }
    ],
    sources: [
      {
        claim: 'VertiCer left ERGaR on 1 Jul 2026; exports via ERGaR to dena terminated',
        url: 'https://verticer.eu/en/frequently-asked-questions/traders/',
        quote: 'From 1 July 2026, exports will only be permitted via the AIB Hub to issuing authorities designated by EU Member States. In concrete terms, this means that from that date onwards, you will no longer be able to export via the ERGaR Hub to Dena (Germany).',
        grade: 'PRIMARY'
      }
    ]
  },

  NO: {
    name: 'Statnett (electricity only) / No gas registry',
    operational: false,
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'No gas GO registry exists in Norway.'
    },
    exDomainNote: 'No gas GO registry exists in Norway.',
    exportRestrictions: [
      { text: 'No gas GO registry exists in Norway', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No gas GO registry exists in Norway', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'Statnett issues GOs for electricity only; no gas GO scheme in Norway',
        url: 'https://lovdata.no/dokument/LTI/forskrift/2007-12-14-1652',
        quote: 'Forskrift om opprinnelsesgarantier for produksjon av elektrisk energi ... alle produsenter av elektrisk energi',
        grade: 'PRIMARY'
      }
    ]
  },

  PL: {
    name: 'TGE (Towarowa Giełda Energii) / URE',
    // Biomethane GOs and the TGE register exist in law (OZE Act Art. 120-125); issuance is unconfirmed and there is
    // no AIB or ERGaR CoO connection, so every route is not possible as an electronic transfer.
    operational: true,
    importRecognition: 'MANUAL_ON_APPLICATION',
    hubNote: 'Biomethane GOs and the TGE register exist in Polish law (OZE Act Art. 120-125), but there is no AIB or ERGaR CoO connection (TGE is an ERGaR association member only), so no electronic transfer channel exists.',
    aib: 'NONE',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'UNKNOWN',
      value: 'UNKNOWN',
      note: 'RES Act provides for biomethane GOs and manual recognition by URE President, but no electronic cross-border channel exists.'
    },
    exDomainNote: 'No electronic cross-border channel exists.',
    exportRestrictions: [
      { text: 'No electronic cross-border export mechanism exists', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'Statutory recognition by URE President under Art. 123 is manual; no electronic import channel', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'Poland has legal basis for biomethane GOs but is not connected to AIB or ERGaR CoO hub',
        url: 'https://api.sejm.gov.pl/eli/acts/DU/2026/68/text.pdf',
        quote: 'Gwarancja pochodzenia wytworzonych z odnawialnych źródeł energii ... 2) biometanu',
        grade: 'PRIMARY'
      },
      {
        claim: 'Polish OZE Act Art. 123: the URE President recognises, on written application, a GO issued in another EU Member State (manual route, no electronic channel)',
        url: 'https://api.sejm.gov.pl/eli/acts/DU/2026/68/text.pdf',
        quote: 'Prezes URE, na pisemny wniosek podmiotu, uznaje gwarancję pochodzenia wydaną w innym państwie członkowskim Unii Europejskiej',
        grade: 'PRIMARY'
      },
      {
        claim: 'TGE is an ERGaR association member only, not a CoO hub participant',
        url: 'https://www.tge.pl/pub/TGE/komunikaty/2024/06/2024.06.10_tge%20dolaczayla%20do%20ergar.pdf',
        quote: 'TGE zyska merytoryczne wsparcie niezbędne dla wypracowania rozwiązań dotyczących gwarancji pochodzenia dla biometanu',
        grade: 'PRIMARY'
      },
      {
        claim: 'There is no Polish AIB member: AIB membership is not the same as hub connection',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members',
        quote: 'AIB membership is not the same as Hub connection!',
        grade: 'PRIMARY'
      }
    ]
  },

  PT: {
    name: 'REN',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP E.12.12: Ex-domain cancellation to AIB members not allowed; non-members require regulatory approval.'
    },
    exDomainNote: 'Ex-domain cancellation not allowed without regulatory approval.',
    exportRestrictions: [
      { text: 'GOs from production devices receiving support are not granted to producers under Portuguese law', appliesTo: [] }
    ],
    importRestrictions: [
      { text: 'Only EECS GOs from EU Member States; third-country GOs without EU treaty rejected (CH refused)', refusesFrom: ['CH'] }
    ],
    sources: [
      {
        use: ['DEST'],
        claim: 'REN rejects imports of GOs issued in third countries without a mutual recognition agreement with the Union',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-GSG-PT-REN-DPPTG%20Domain%20Protocol%20REN%20Clean%2020241217.pdf',
        quote: 'Imports of GOs issued after July 2021 in third countries with no mutual recognition agreement with the Union will not be accepted',
        grade: 'PRIMARY'
      },
      {
        use: ['ORIGIN'],
        claim: 'REN allows export of all valid and tradable GOs over the AIB hub, including gas',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-GSG-PT-REN-DPPTG%20Domain%20Protocol%20REN%20Clean%2020241217.pdf',
        quote: 'All valid and tradable GOs can be exported, including those for all energy carriers such as electricity, gas and hydrogen.',
        grade: 'PRIMARY'
      },
      {
        use: ['ORIGIN'],
        claim: 'Portuguese supported production devices are not granted GOs',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-GSG-PT-REN-DPPTG%20Domain%20Protocol%20REN%20Clean%2020241217.pdf',
        quote: 'In accordance with the Portuguese legislation, GOs from Production Devices with support are not granted to producers',
        grade: 'PRIMARY'
      }
    ]
  },

  RO: {
    name: 'ANRE',
    operational: false,
    aib: 'OBSERVER',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'ANRE is an AIB observer only; gas GO regulations mandated for end of 2026 with market opening in 2027.'
    },
    exDomainNote: 'ANRE is an AIB observer only; no operating gas registry.',
    exportRestrictions: [
      { text: 'No operational gas GO registry in Romania', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No operational gas GO registry in Romania', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'ANRE is Scheme Observer at AIB; gas GO regulation due 30 Sep 2026',
        url: 'https://lege5.ro/Gratuit/ge3tgmrsgi3tk/ordonanta-de-urgenta-nr-59-2025-pentru-modificarea-si-completarea-unor-acte-normative-in-domeniul-energiei',
        quote: 'ca membru observator ... recunoscut reciproc la nivelul Uniunii Europene până la data de 1 ianuarie 2027',
        grade: 'PRIMARY'
      },
      {
        claim: 'AIB lists ANRE Romania as a gas and electricity scheme observer (observer status carries no transfers)',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/aib-members',
        quote: 'Scheme Observer (Gas and Electricity)',
        grade: 'PRIMARY'
      }
    ]
  },

  SE: {
    name: 'Energimyndigheten (Cesar)',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'DP E.10.5: This is not allowed. Ex-domain cancellations are not allowed.'
    },
    exDomainNote: 'Ex-domain cancellations are not allowed.',
    exportRestrictions: [
      { text: 'EECS gas GOs tradeable over AIB Hub only', appliesTo: [] }
    ],
    importRestrictions: [
      { text: 'Only EECS GOs from EU or treaty states; CH and RS blocked; production within last 12 months', refusesFrom: ['CH'] }
    ],
    sources: [
      {
        claim: 'Sweden joined AIB Gas Scheme Group and is Hub-connected since 1 Sep 2026',
        url: 'https://www.aib-net.org/node/3418',
        quote: 'The AIB Gas Scheme Group (GSG) formally approved our Swedish AIB Member and Issuing Body \'Swedish Energy Agency\' application to join the AIB Gas Scheme. ... From 1 September onwards, Swedish gas GOs may be considered EECS GOs. Such EECS gas GOs will be tradeable over the AIB Hub.',
        grade: 'PRIMARY'
      },
      {
        use: ['DEST'],
        use: ['DEST'],
        claim: 'Swedish Domain Protocol R5 restricts imports to EU/treaty states and bars ex-domain',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSE-Domain%20Protocol%20Sweden%202026%20Release%205%20Clean.pdf',
        quote: 'The Swedish Cesar registry does only accept import of EECS-GOs from domains within EU or domains that have an agreement on mutual recognition of GOs with EU ... Ex-domain cancellations are not allowed.',
        grade: 'PRIMARY'
      }
    ]
  },

  SI: {
    name: 'Agencija za energijo / Borzen',
    operational: false,
    aib: 'ELECTRICITY_ONLY',
    aibImportOnly: false,
    ergar: 'NONE',
    exDomainOut: {
      status: 'NOT_ALLOWED',
      value: 'NOT_ALLOWED',
      note: 'Operating registry at Borzen is electricity-only; no gas GO module.'
    },
    exDomainNote: 'Operating registry at Borzen is electricity-only.',
    exportRestrictions: [
      { text: 'No operational gas GO registry in Slovenia', appliesTo: ['ALL'] }
    ],
    importRestrictions: [
      { text: 'No operational gas GO registry in Slovenia', refusesFrom: ['ALL'] }
    ],
    sources: [
      {
        claim: 'Slovenian AIB protocol covers electricity only',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSI_Domain_Protocol_Slovenia_v5_20260306_0.pdf',
        quote: 'Conversion of electricity to gas and vice versa is considered outside the scope of the national legal framework, and of this Domain Protocol',
        grade: 'PRIMARY'
      }
    ]
  },

  SK: {
    name: 'SPP-distribúcia',
    operational: true,
    aib: 'CONNECTED',
    aibImportOnly: false,
    ergar: 'PARTICIPANT',
    exDomainOut: {
      status: 'CONDITIONAL',
      value: 'CONDITIONAL',
      note: 'DP E.12.11 / SYNTHESIS-NOTES.md: Ex-domain allowed only if destination is not connected to AIB Gas Hub or technical failure occurs, subject to agreement.'
    },
    exDomainNote: 'Ex-domain allowed only towards non-hub domains under agreement.',
    exportRestrictions: [
      { text: 'EECS GOs via AIB only; SK GAS GOs via ERGaR only (cannot export SK GAS to AIB domains like Austria)', appliesTo: ['AT'] }
    ],
    importRestrictions: [
      { text: 'EECS imports only from EU Member States (CH refused); transport/ETS use requires grid-connected facility', refusesFrom: ['CH'] }
    ],
    sources: [
      {
        claim: 'SPP-d operates dual-standard registry (EECS on AIB, SK GAS on ERGaR)',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf',
        quote: 'EECS Standard, which may be transferred through the AIB Gas Hub only, SK GAS Standard, which may be transferred through the ERGaR Hub only ... Imports of GOs issued in third countries outside the EU are not allowed',
        grade: 'PRIMARY'
      }
    ]
  }
};

export const GO_PAIR_EVIDENCE = {
  // Energinet published table (DK exports & imports via ERGaR)
  'DK>DE': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet published cross-border table explicitly permits transfers from Denmark to dena (Germany) via ERGaR.',
    sources: [
      {
        claim: 'Energinet ERGaR table (export from DK / import to DK): Germany-Dena yes / no, i.e. DK to DE export permitted',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Germany-Dena yes/no',
        grade: 'PRIMARY'
      }
    ]
  },
  'DE>DK': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet explicitly prohibits imports from dena (Germany) to Denmark.',
    source: {
      claim: 'Imports from dena to Denmark barred',
      url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
      quote: 'Imports from Dena to Denmark are not allowed.',
      grade: 'PRIMARY'
    }
  },
  'DK>AT': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet cross-border table marks Austria (AGCS) as no export / no import; AGCS is an ERGaR participant, so the ex-domain route (only for registries outside the ERGaR hub) does not apply.',
    sources: [
      {
        claim: 'DK-AT lane barred on the Energinet table (export from DK no / import to DK no)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Austria-AGCS no/no',
        grade: 'PRIMARY'
      }
    ]
  },
  'AT>DK': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet cross-border table marks Austria (AGCS) as no export / no import.',
    sources: [
      {
        claim: 'AT-DK lane barred on the Energinet table (export from DK no / import to DK no)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Austria-AGCS no/no',
        grade: 'PRIMARY'
      }
    ]
  },
  'DK>GB': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet cross-border table marks GB GGCS as no export / no import; UK third-country status under RED II. GGCS is an ERGaR participant, so the ex-domain route does not apply.',
    sources: [
      {
        claim: 'DK to GB barred on the Energinet table (export from DK no / import to DK no)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Great Britain-GGCS no/no',
        grade: 'PRIMARY'
      }
    ]
  },
  'GB>DK': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet table and GGCS guidance bar GB-DK transfers due to UK third-country status.',
    sources: [
      {
        claim: 'GGCS Guidance Document 7: Energinet-issued RGGOs cannot be imported into GGCS',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'No - you cannot import RGGOs originally issued by Energinet to GGCS, even if they are transferred via another registry',
        grade: 'PRIMARY'
      },
      {
        claim: 'Energinet table also bars the lane (export from DK no / import to DK no)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Great Britain-GGCS no/no',
        grade: 'PRIMARY'
      }
    ]
  },
  'DK>SK': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet cross-border table and SPP-d presentation confirm active bilateral transfers via ERGaR.',
    sources: [
      {
        claim: 'Energinet ERGaR table: Slovakia-SPPD yes (export) / yes (import)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Slovakia-SPPD yes/yes',
        grade: 'PRIMARY'
      },
      {
        claim: 'SPP-d slide: ERGaR hub imports from DK',
        url: 'https://www.vse.sk/sdoc/doc/prezentacie/03_Viera_Hricova.pdf',
        quote: 'Implementácia prevodov do / zo zahraničia pre záruky pôvodu biometánu cez ERGaR Hub – export do DE, DK, import z DK.',
        grade: 'PRIMARY'
      }
    ]
  },
  'SK>DK': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'SPP-d slide and Energinet table confirm active exports from Slovakia to Denmark via ERGaR.',
    source: {
      claim: 'SK to DK export confirmed by SPP-d and Energinet',
      url: 'https://www.vse.sk/sdoc/doc/prezentacie/03_Viera_Hricova.pdf',
      quote: 'prevodov do / zo zahraničia ... cez ERGaR Hub – export do DE, DK, import z DK.',
      grade: 'PRIMARY'
    }
  },
  'DK>LT': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet cross-border table and Amber Grid announcement confirm active bilateral transfers via ERGaR.',
    sources: [
      {
        claim: 'Energinet ERGaR table: Lithuania-Amber Grid yes (export) / yes (import)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Lithuania-Amber Grid yes/yes',
        grade: 'PRIMARY'
      },
      {
        claim: 'ERGaR announcement: Amber Grid joined the ERGaR hub; GOs can be exchanged with the Danish registry',
        url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
        quote: 'GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia.',
        grade: 'PRIMARY'
      }
    ]
  },
  'LT>DK': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Amber Grid announcement and Energinet table confirm active exports from Lithuania to Denmark via ERGaR.',
    sources: [
      {
        claim: 'Energinet ERGaR table: Lithuania-Amber Grid yes (export) / yes (import)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Lithuania-Amber Grid yes/yes',
        grade: 'PRIMARY'
      },
      {
        claim: 'ERGaR announcement: Lithuanian GOs can be exchanged with the Danish registry',
        url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
        quote: 'GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia.',
        grade: 'PRIMARY'
      }
    ]
  },
  'DK>CH': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet table and Pronovo import page confirm Danish GO export to Switzerland via ERGaR.',
    source: {
      claim: 'DK to CH export confirmed by Energinet and Pronovo',
      url: 'https://pronovo.ch/import-von-gas-hkn/',
      quote: 'Der Import von Certificates of Origin (CoO) ist aus folgenden Ländern möglich: ... Dänemark (Energinet)',
      grade: 'PRIMARY'
    }
  },
  'CH>DK': {
    status: 'OPEN',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Conflict: Energinet table states Pronovo to Denmark is yes, but Swiss UVEK 2024 report states Swiss HKN exports are not possible.',
    openQuestionId: 'Q-CH-1',
    sources: [
      {
        claim: 'Swiss UVEK 2024 consultation report: no export of Swiss HKN',
        url: 'https://pubdb.bfe.admin.ch/de/publication/download/11643',
        quote: 'Ein Export von Schweizer HKN ist zurzeit nicht möglich.',
        grade: 'PRIMARY'
      },
      {
        claim: 'Energinet ERGaR table: Switzerland-Pronovo yes (export) / yes (import)',
        url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
        quote: 'Switzerland-Pronovo yes/yes',
        grade: 'PRIMARY'
      }
    ]
  },
  'DK>NL': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet table marks Netherlands as no/no; VertiCer exited ERGaR on 1 Jul 2026.',
    source: {
      claim: 'DK to NL barred; VertiCer left ERGaR',
      url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
      quote: 'The Netherlands - VertiCer | no | no',
      grade: 'PRIMARY'
    }
  },
  'NL>DK': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Energinet table marks Netherlands as no/no; VertiCer exited ERGaR on 1 Jul 2026.',
    source: {
      claim: 'NL to DK barred; VertiCer left ERGaR',
      url: 'https://en.energinet.dk/gas/biomethane/go-gas/cross-border-trade-of-gos/',
      quote: 'The Netherlands - VertiCer | no | no',
      grade: 'PRIMARY'
    }
  },

  // VertiCer exit from ERGaR
  'NL>DE': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'VertiCer exited ERGaR on 1 Jul 2026; exports to dena (Germany) terminated. Dena is not on AIB Hub.',
    source: {
      claim: 'NL to DE export route closed 1 Jul 2026',
      url: 'https://verticer.eu/en/frequently-asked-questions/traders/',
      quote: 'From 1 July 2026, exports will only be permitted via the AIB Hub ... you will no longer be able to export via the ERGaR Hub to Dena (Germany).',
      grade: 'PRIMARY'
    }
  },
  'DE>NL': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'VertiCer left ERGaR on 1 Jul 2026 and accepts transfers only via the AIB Hub; dena is not an AIB member or issuing body.',
    sources: [
      {
        claim: 'VertiCer FAQ: from 1 July 2026 exports only via the AIB Hub to issuing authorities designated by EU Member States',
        url: 'https://verticer.eu/en/frequently-asked-questions/traders/',
        quote: 'From 1 July 2026, exports will only be permitted via the AIB Hub to issuing authorities designated by EU Member States.',
        grade: 'PRIMARY'
      }
    ]
  },
  'NL>GB': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'VertiCer left ERGaR on 1 Jul 2026; GGCS Guidance Document 7 states imports from VertiCer are barred.',
    source: {
      claim: 'NL to GB route barred',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'No - you cannot import RGGOs originally issued by VertiCer ... VertiCer is leaving ERGaR after 1 July 2026.',
      grade: 'PRIMARY'
    }
  },
  'GB>NL': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'VertiCer left ERGaR on 1 Jul 2026; the GGCS guidance table shows a restriction on exports to VertiCer (UK third-country status).',
    sources: [
      {
        claim: 'GGCS Guidance Document 7: restriction on the VertiCer row; VertiCer leaving ERGaR',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'VertiCer NL: restriction ... Please note that VertiCer is leaving ERGaR after 1 July 2026.',
        grade: 'PRIMARY'
      }
    ]
  },

  // GGCS guidance table (GB ERGaR lanes)
  'GB>AT': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 v2.5 confirms RGGO exports from GGCS to AGCS (Austria).',
    source: {
      claim: 'GB to AT export permitted',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'Yes - you can export RGGOs from GGCS to AGCS',
      grade: 'PRIMARY'
    }
  },
  'AT>GB': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 v2.5 confirms RGGO imports into GGCS from AGCS (Austria).',
    source: {
      claim: 'AT to GB import permitted',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'Yes - you can import RGGOs from AGCS to GGCS',
      grade: 'PRIMARY'
    }
  },
  'GB>DE': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 and dena partner list confirm active RGGO transfers between GGCS and dena.',
    sources: [
      {
        claim: 'GGCS Guidance Document 7: dena row is Yes (export) / Yes (import)',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'dena DE: Yes / Yes',
        grade: 'PRIMARY'
      },
      {
        claim: 'dena partner list names GGCS among the registers reachable via ERGaR',
        url: 'https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/',
        quote: 'Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR: VertiCer ... GGCS',
        grade: 'PRIMARY'
      }
    ]
  },
  'DE>GB': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 and dena partner list confirm active RGGO imports into GGCS from dena.',
    sources: [
      {
        claim: 'GGCS Guidance Document 7: RGGOs can be imported from dena',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'Yes - you can import RGGOs from DENA',
        grade: 'PRIMARY'
      },
      {
        claim: 'dena partner list names GGCS among the registers reachable via ERGaR',
        url: 'https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/',
        quote: 'Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR: VertiCer ... GGCS',
        grade: 'PRIMARY'
      }
    ]
  },
  'GB>CH': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 confirms RGGO exports to Pronovo (restricted to waste/residue energy source labels).',
    source: {
      claim: 'GB to CH export permitted for waste/residues',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'Yes - you can export RGGOs (with a waste or residue energy source label) from GGCS to Pronovo',
      grade: 'PRIMARY'
    }
  },
  'CH>GB': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 explicitly states there are currently no plans to import RGGOs from Pronovo.',
    source: {
      claim: 'CH to GB import barred',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'No - There are currently no plans to import RGGOs from Pronovo to GGCS',
      grade: 'PRIMARY'
    }
  },
  'GB>SK': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 states SPP-d refuses exports from GGCS due to UK third-country status.',
    sources: [
      {
        claim: 'GGCS Guidance Document 7: SPP Distribúcia does not accept transfers of RGGOs from GGCS (UK third country)',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'SPP Distribúcia is not accepting transfers of RGGOs from the GGCS',
        grade: 'PRIMARY'
      }
    ]
  },
  'SK>GB': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 confirms RGGO imports from SPP-d (Slovakia) into GGCS.',
    sources: [
      {
        claim: 'GGCS Guidance Document 7: SPP-d row has a third-country restriction on export, but GGCS can import from SPP-d',
        url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
        quote: 'SPP-d SK: restriction (third country) / Yes import from SPP-d',
        grade: 'PRIMARY'
      }
    ]
  },
  'GB>LT': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 states Amber Grid refuses exports from GGCS due to UK third-country status.',
    source: {
      claim: 'GB to LT export barred by third-country status',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'Restrictions in place - you cannot currently export RGGOs to Amber Grid from GGCS due to the UK\'s status as a \'third country\'',
      grade: 'PRIMARY'
    }
  },
  'LT>GB': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'GGCS Guidance Document 7 confirms RGGO imports from Amber Grid (Lithuania) into GGCS.',
    source: {
      claim: 'LT to GB import permitted',
      url: 'https://www.greengas.org.uk/images/upload/news_57_GGCS-Guidance-Document-7-RGGO-transfers-to-and-from-the-Green-Gas-Certification-Scheme-v25.pdf',
      quote: 'Yes - you can import RGGOs from Amber Grid',
      grade: 'PRIMARY'
    }
  },

  // dena partner list & ERGaR bilateral evidence
  'DE>AT': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'dena partner list and AGCS confirm active bilateral ERGaR transfers between Germany and Austria.',
    source: {
      claim: 'DE to AT active on ERGaR',
      url: 'https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/',
      quote: 'Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR: ... Biomethanregister.at',
      grade: 'PRIMARY'
    }
  },
  'AT>DE': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'dena partner list, AGCS guidelines and ERGaR statistics confirm active transfers from Austria to Germany.',
    source: {
      claim: 'AT to DE active on ERGaR',
      url: 'https://www.biomethanregister.at/en/cooperation/european-market/dena',
      quote: 'The bilateral cooperation between dena and AGCS will thus be replaced by the international ERGaR CoO Scheme in December 2021.',
      grade: 'PRIMARY'
    }
  },
  'DE>CH': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Pronovo import list and ERGaR statistics confirm exports from Germany (dena) to Switzerland via ERGaR.',
    source: {
      claim: 'DE to CH import confirmed by Pronovo',
      url: 'https://pronovo.ch/import-von-gas-hkn/',
      quote: 'Der Import von Certificates of Origin (CoO) ist aus folgenden Ländern möglich: Deutschland (Dena Bioregister)',
      grade: 'PRIMARY'
    }
  },
  'CH>DE': {
    status: 'NOT_POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Swiss UVEK 2024 report states Swiss HKN exports are not possible; ERGaR statistics show CH as importer only.',
    source: {
      claim: 'CH to DE export not possible',
      url: 'https://pubdb.bfe.admin.ch/de/publication/download/11643',
      quote: 'Ein Export von Schweizer HKN ist zurzeit nicht möglich.',
      grade: 'PRIMARY'
    }
  },
  'DE>SK': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'dena partner list names SPP-distribúcia as reachable via ERGaR, and the URSO-approved SPP-d operating rules (decision 0001/2026/P-PP) treat a GO issued in a member state linked to the ERGaR Hub as a recognised GO. The SPP-d May 2026 slide lists only exports to DE and imports from DK, and the dena page is stale (it still lists VertiCer), but two primary acceptance statements settle the lane.',
    sources: [
      {
        claim: 'dena partner list: transfer between dena and the Register of renewable gases operated by SPP - distribúcia can be carried out via ERGaR',
        url: 'https://www.dena.de/en/biogasregister/trade-of-biomethane/international-trade/',
        quote: 'Currently, a transfer between the dena Biogasregister and the following registers can be carried out via ERGaR: VertiCer ... Register of renewable gases operated by SPP - distribúcia',
        grade: 'PRIMARY'
      },
      {
        claim: 'URSO 0001/2026/P-PP (SPP-d operating rules): a GO issued in a member state linked to the ERGaR Hub counts as recognised',
        url: 'https://data.urso.gov.sk/CISRES/Agenda.nsf/0/6D7A995C8B83FC63C1258D8D00414B62/$FILE/0001_2026_P-PP.pdf',
        quote: 'Záruka pôvodu vydaná v registri záruk obnoviteľných plynov v členskom štáte, ktorý je prepojený s ERGaR Hub sa považuje za uznanú záruku pôvodu',
        grade: 'PRIMARY'
      }
    ]
  },
  'SK>DE': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'SPP-d presentation and dena partner list confirm active transfers from Slovakia to Germany (42,869 MWh in 2025).',
    source: {
      claim: 'SK to DE export active (42,869 MWh in 2025)',
      url: 'https://www.vse.sk/sdoc/doc/prezentacie/03_Viera_Hricova.pdf',
      quote: 'zo SR exportovaných 42 869 MWh záruk vydaných v SR do nemeckého registra.',
      grade: 'PRIMARY'
    }
  },
  'DE>LT': {
    status: 'OPEN',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'ERGaR announcement states Lithuanian GOs can go to Germany; reverse flow (DE to LT) is not stated in public sources, and the dena partner list omits Lithuania.',
    openQuestionId: 'Q-DE-1',
    sources: [
      {
        claim: 'ERGaR announcement (23 Apr 2026): LT to DE and DK / SK exchange stated; DE to LT is not stated',
        url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
        quote: 'GOs issued for Lithuanian biomethane can now be transferred electronically to Germany, as well as exchanged with registries in Denmark and Slovakia.',
        grade: 'PRIMARY'
      }
    ]
  },
  'LT>DE': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'ERGaR announcement and Amber Grid press release confirm electronic GO transfers from Lithuania to Germany (dena).',
    source: {
      claim: 'LT to DE export confirmed on ERGaR',
      url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
      quote: 'GOs issued for Lithuanian biomethane can now be transferred electronically to Germany',
      grade: 'PRIMARY'
    }
  },
  'SK>LT': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'ERGaR April 2026 announcement confirms bilateral exchange between Slovakia and Lithuania.',
    source: {
      claim: 'SK to LT exchange active on ERGaR',
      url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
      quote: 'as well as exchanged with registries in Denmark and Slovakia.',
      grade: 'PRIMARY'
    }
  },
  'LT>SK': {
    status: 'POSSIBLE',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'ERGaR April 2026 announcement confirms bilateral exchange between Lithuania and Slovakia.',
    source: {
      claim: 'LT to SK exchange active on ERGaR',
      url: 'https://www.ergar.org/2026/04/amber-grid-joins-the-ergar-hub-expanding-opportunities-for-lithuanian-biomethane/',
      quote: 'as well as exchanged with registries in Denmark and Slovakia.',
      grade: 'PRIMARY'
    }
  },
  'AT>CH': {
    status: 'POSSIBLE',
    via: 'AIB',
    grade: 'OBSERVED',
    reason: 'Observed AIB Hub transfer (3,285 MWh, 1 transfer) and Pronovo FAQ confirm transfers from Austria to Switzerland.',
    sources: [
      {
        claim: 'Pronovo FAQ: Swiss HKN system is connected to both hubs and can transfer from and to both Austrian registers',
        url: 'https://pronovo.ch/de/herkunftsnachweise/erneuerbare-treib-und-brennstoffe-bt/',
        quote: 'Das Schweizer HKN-System ist an beide Hubs angeschlossen und kann Transfers von und zu beiden österreichischen Registern durchführen.',
        grade: 'PRIMARY'
      },
      {
        claim: 'AIB Hub Transfer Flows: AT to CH 3,285 MWh in 1 transfer (Jan 2024 - Aug 2026)',
        url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html',
        quote: 'AT -> ... CH 3,285 (1)',
        grade: 'SECONDARY'
      }
    ]
  },
  'CH>AT': {
    status: 'OPEN',
    via: 'ERGAR',
    grade: 'PUBLISHED',
    reason: 'Conflict: Pronovo FAQ states transfers von und zu beiden österreichischen Registern, but Swiss UVEK 2024 report states export is not possible.',
    openQuestionId: 'Q-CH-1',
    sources: [
      {
        claim: 'Swiss UVEK 2024 consultation report: no export of Swiss HKN',
        url: 'https://pubdb.bfe.admin.ch/de/publication/download/11643',
        quote: 'Ein Export von Schweizer HKN ist zurzeit nicht möglich.',
        grade: 'PRIMARY'
      },
      {
        claim: 'Pronovo FAQ: transfers from and to both Austrian registers',
        url: 'https://pronovo.ch/de/herkunftsnachweise/erneuerbare-treib-und-brennstoffe-bt/',
        quote: 'Das Schweizer HKN-System ist an beide Hubs angeschlossen und kann Transfers von und zu beiden österreichischen Registern durchführen.',
        grade: 'PRIMARY'
      }
    ]
  },
  'AT>SK': {
    status: 'POSSIBLE',
    via: 'AIB',
    grade: 'RULE',
    reason: 'Both E-Control and SPP-d are connected to the AIB gas hub; no domain-protocol bar prevents this transfer.',
    sources: [
      {
        claim: 'AIB registries page: imports and exports are allowed for all EECS registries unless restrictions are noted',
        url: 'https://www.aib-net.org/registries',
        quote: 'Both imports and exports are allowed for all EECS Registries, unless there are restrictions explicitly noted in the table below.',
        grade: 'PRIMARY'
      },
      {
        claim: 'SPP-d: EECS standard GOs are transferred through the AIB Gas Hub',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf',
        quote: 'EECS Standard, which may be transferred through the AIB Gas Hub only',
        grade: 'PRIMARY'
      }
    ]
  },
  'SK>AT': {
    status: 'POSSIBLE',
    via: 'AIB',
    grade: 'RULE',
    reason: 'SPP-d issues EECS GOs which can transfer to E-Control via the AIB gas hub; SK GAS standard GOs restricted.',
    source: {
      claim: 'SK EECS GOs transferable to AT via AIB',
      url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf',
      quote: 'EECS Standard, which may be transferred through the AIB Gas Hub only ... Exports of SK GAS GOs to domains that already have an appointed IB ... not permitted.',
      grade: 'PRIMARY'
    }
  },
  'AT>LT': {
    status: 'POSSIBLE',
    via: 'AIB',
    grade: 'OBSERVED',
    reason: 'Observed AIB Hub transfers (7,627 MWh, 7 transfers) confirm active corridor from Austria (E-Control) to Lithuania (Amber Grid).',
    sources: [
      {
        claim: 'AIB Hub Transfer Flows: AT to LT 7,627 MWh across 7 transfers (Jan 2024 - Aug 2026)',
        url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html',
        quote: 'AT -> LT 7,627 (7)',
        grade: 'SECONDARY'
      }
    ]
  },
  'LT>AT': {
    status: 'POSSIBLE',
    via: 'AIB',
    grade: 'RULE',
    reason: 'Both Amber Grid and E-Control are connected to the AIB gas hub; no domain-protocol bar prevents this transfer.',
    sources: [
      {
        claim: 'Amber Grid protocol: no restrictions for transfer via the AIB Hub of EECS GOs for renewable gas',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2025-DPLTG-Domain%20Protocol%20Amber%20Grid%20R1.1%20clean.pdf',
        quote: 'E.10.10 There are no restrictions for transfer via AIB Hub of EECS GOs for renewable gas.',
        grade: 'PRIMARY'
      },
      {
        claim: 'E-Control protocol: foreign gas GOs are accepted if the content meets section 129b(8) GWG',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPAT-E-Control%20Austria%20Domain%20Protocol%2025052023_Correction%20200092024_clean%20version_.pdf',
        quote: 'Foreign gas Gos are accepted if the information on a GO is in line with § 129 b (8) GWG.',
        grade: 'PRIMARY'
      }
    ]
  },
  'LT>CH': {
    status: 'OPEN',
    via: 'AIB',
    grade: 'PUBLISHED',
    reason: 'Amber Grid is connected to AIB gas hub and ERGaR, but Pronovo\'s published import lists (18 Jun 2026) omit Amber Grid; no transfer observed.',
    openQuestionId: 'Q-CH-2',
    sources: [
      {
        claim: 'Pronovo import list of 18 Jun 2026 does not name Amber Grid; no transfer observed',
        url: 'https://pronovo.ch/import-von-gas-hkn/',
        quote: 'names neither Amber Grid nor MEKH, no transfer observed',
        grade: 'PRIMARY'
      },
      {
        claim: 'AIB gas matrix: LT, HU, SE not listed or observed as Pronovo import origins',
        url: 'https://pronovo.ch/import-von-gas-hkn/',
        quote: 'LT, HU, SE not listed/observed',
        grade: 'PRIMARY'
      }
    ]
  },
  'HU>CH': {
    status: 'OPEN',
    via: 'AIB',
    grade: 'PUBLISHED',
    reason: 'MEKH is on AIB gas hub, but Pronovo\'s import list (18 Jun 2026) omits MEKH; no transfer observed.',
    openQuestionId: 'Q-CH-2',
    sources: [
      {
        claim: 'Pronovo import list of 18 Jun 2026 does not name MEKH; no transfer observed',
        url: 'https://pronovo.ch/import-von-gas-hkn/',
        quote: 'names neither Amber Grid nor MEKH, no transfer observed',
        grade: 'PRIMARY'
      },
      {
        claim: 'AIB gas matrix: LT, HU, SE not listed or observed as Pronovo import origins',
        url: 'https://pronovo.ch/import-von-gas-hkn/',
        quote: 'LT, HU, SE not listed/observed',
        grade: 'PRIMARY'
      }
    ]
  },
  'SE>CH': {
    status: 'OPEN',
    via: 'AIB',
    grade: 'PUBLISHED',
    reason: 'Energimyndigheten joined the AIB gas hub on 1 Sep 2026, but Pronovo\'s import list (18 Jun 2026) predates that and does not name Sweden; no SE to CH transfer has been observed (treated like LT to CH and HU to CH).',
    openQuestionId: 'Q-CH-2',
    sources: [
      {
        claim: 'AIB gas matrix: LT, HU, SE not listed or observed as Pronovo import origins',
        url: 'https://pronovo.ch/import-von-gas-hkn/',
        quote: 'LT, HU, SE not listed/observed',
        grade: 'PRIMARY'
      },
      {
        claim: 'AIB news 20 Aug 2026: Swedish EECS gas GOs tradeable over the AIB Hub from 1 September',
        url: 'https://www.aib-net.org/node/3418',
        quote: 'From 1 September onwards, Swedish gas GOs may be considered EECS GOs. Such EECS gas GOs will be tradeable over the AIB Hub.',
        grade: 'PRIMARY'
      }
    ]
  },
  'CH>ES': {
    status: 'OPEN',
    via: 'AIB',
    grade: 'OBSERVED',
    reason: 'AIB hub dataset records one 2,237 MWh transfer from CH to ES in Aug 2026, contradicting Pronovo\'s official "imports only" status.',
    openQuestionId: 'Q-CH-1',
    sources: [
      {
        claim: 'AIB Hub Transfer Flows: one CH to ES transfer of 2,237 MWh in Aug 2026 (Pronovo is listed imports only)',
        url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html',
        quote: 'CH -> ES 2,237 (1, Aug 2026)',
        grade: 'SECONDARY'
      },
      {
        claim: 'AIB registries table lists Pronovo gas as imports only',
        url: 'https://www.aib-net.org/registries',
        quote: 'Pronovo | Electricity (imports, exports) + Gas (imports only)',
        grade: 'PRIMARY'
      }
    ]
  },

  // Observed AIB Hub Corridors (from go-aib.md section 0.4)
  'LT>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'LT to LV: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LT -> LV 1 (test)', grade: 'PRIMARY' } },
  'LT>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (21,514 MWh across 8 transfers).', source: { claim: 'LT to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LT -> ... ES 21,514 (8)', grade: 'PRIMARY' } },
  'LT>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (12,160 MWh across 4 transfers).', source: { claim: 'LT to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LT -> ... FI 12,160 (4)', grade: 'PRIMARY' } },
  'LT>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (168,914 MWh across 75 transfers).', source: { claim: 'LT to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LT -> ... CZ 168,914 (75)', grade: 'PRIMARY' } },
  'LT>PT': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'LT to PT: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LT -> ... PT 1 (test)', grade: 'PRIMARY' } },
  'LT>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (131 MWh across 2 transfers).', source: { claim: 'LT to NL flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LT -> ... NL 131 (2)', grade: 'PRIMARY' } },

  'LV>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (8,835 MWh across 4 transfers).', source: { claim: 'LV to LT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> LT 8,835 (4)', grade: 'PRIMARY' } },
  'LV>AT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (30,548 MWh across 2 transfers).', source: { claim: 'LV to AT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... AT 30,548 (2)', grade: 'PRIMARY' } },
  'LV>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (39,764 MWh across 34 transfers).', source: { claim: 'LV to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... ES 39,764 (34)', grade: 'PRIMARY' } },
  'LV>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (66,881 MWh across 35 transfers).', source: { claim: 'LV to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... FI 66,881 (35)', grade: 'PRIMARY' } },
  'LV>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (117,462 MWh across 44 transfers).', source: { claim: 'LV to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... CZ 117,462 (44)', grade: 'PRIMARY' } },
  'LV>CH': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (22,065 MWh across 11 transfers).', source: { claim: 'LV to CH flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... CH 22,065 (11)', grade: 'PRIMARY' } },
  'LV>SK': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'LV to SK: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... SK 1 (test)', grade: 'PRIMARY' } },
  'LV>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (17,866 MWh across 13 transfers).', source: { claim: 'LV to NL flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'LV -> ... NL 17,866 (13)', grade: 'PRIMARY' } },

  'AT>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (19,061 MWh across 7 transfers).', source: { claim: 'AT to LV flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'AT -> ... LV 19,061 (7)', grade: 'PRIMARY' } },
  'AT>FR': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (39 MWh across 2 transfers).', source: { claim: 'AT to FR flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'AT -> ... FR 39 (2)', grade: 'PRIMARY' } },
  'AT>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (43,740 MWh across 68 transfers).', source: { claim: 'AT to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'AT -> ... ES 43,740 (68)', grade: 'PRIMARY' } },
  'AT>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'AT to FI: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'AT -> ... FI 1 (test)', grade: 'PRIMARY' } },
  'AT>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (30,115 MWh across 37 transfers).', source: { claim: 'AT to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'AT -> ... CZ 30,115 (37)', grade: 'PRIMARY' } },
  'AT>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'AT to NL: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'AT -> ... NL 1 (test)', grade: 'PRIMARY' } },

  'FR>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'FR to LT: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> LT 1 (test)', grade: 'PRIMARY' } },
  'FR>AT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,000 MWh across 2 transfers).', source: { claim: 'FR to AT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... AT 1,000 (2)', grade: 'PRIMARY' } },
  'FR>EE': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfer over AIB Hub (1,000 MWh).', source: { claim: 'FR to EE flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... EE 1,000 (1)', grade: 'PRIMARY' } },
  'FR>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (230,113 MWh across 28 transfers).', source: { claim: 'FR to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... ES 230,113 (28)', grade: 'PRIMARY' } },
  'FR>IT': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'FR to IT: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... IT 2 (test)', grade: 'PRIMARY' } },
  'FR>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (120,466 MWh across 23 transfers).', source: { claim: 'FR to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... FI 120,466 (23)', grade: 'PRIMARY' } },
  'FR>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'FR to CZ: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... CZ 1 (test)', grade: 'PRIMARY' } },
  'FR>CH': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (47,826 MWh across 13 transfers).', source: { claim: 'FR to CH flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... CH 47,826 (13)', grade: 'PRIMARY' } },
  'FR>PT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (74,297 MWh across 18 transfers).', source: { claim: 'FR to PT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... PT 74,297 (18)', grade: 'PRIMARY' } },
  'FR>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,373 MWh across 4 transfers).', source: { claim: 'FR to NL flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FR -> ... NL 1,373 (4)', grade: 'PRIMARY' } },

  'EE>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfer over AIB Hub (685 MWh).', source: { claim: 'EE to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'EE -> FI 685 (1)', grade: 'PRIMARY' } },
  'EE>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,041 MWh across 2 transfers).', source: { claim: 'EE to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'EE -> ... CZ 1,041 (2)', grade: 'PRIMARY' } },

  'ES>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (3,391 MWh across 3 transfers).', source: { claim: 'ES to LT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> LT 3,391 (3)', grade: 'PRIMARY' } },
  'ES>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfer over AIB Hub (6,684 MWh).', source: { claim: 'ES to LV flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... LV 6,684 (1)', grade: 'PRIMARY' } },
  'ES>AT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (9,681 MWh across 4 transfers).', source: { claim: 'ES to AT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... AT 9,681 (4)', grade: 'PRIMARY' } },
  'ES>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfer over AIB Hub (500 MWh).', source: { claim: 'ES to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... FI 500 (1)', grade: 'PRIMARY' } },
  'ES>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (26,846 MWh across 9 transfers).', source: { claim: 'ES to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... CZ 26,846 (9)', grade: 'PRIMARY' } },
  'ES>CH': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (190,256 MWh across 169 transfers).', source: { claim: 'ES to CH flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... CH 190,256 (169)', grade: 'PRIMARY' } },
  'ES>PT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,735 MWh across 9 transfers).', source: { claim: 'ES to PT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... PT 1,735 (9)', grade: 'PRIMARY' } },
  'ES>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (2,587 MWh across 4 transfers).', source: { claim: 'ES to NL flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'ES -> ... NL 2,587 (4)', grade: 'PRIMARY' } },

  'IT>CH': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (9,044 MWh across 4 transfers).', source: { claim: 'IT to CH flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'IT -> CH 9,044 (4)', grade: 'PRIMARY' } },

  'FI>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfer over AIB Hub (3,814 MWh across 1 transfer).', source: { claim: 'FI to LT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FI -> LT 3,814 (1)', grade: 'PRIMARY' } },
  'FI>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (4,082 MWh across 4 transfers).', source: { claim: 'FI to LV flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FI -> ... LV 4,082 (4)', grade: 'PRIMARY' } },
  'FI>AT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfer over AIB Hub (1,000 MWh across 1 transfer).', source: { claim: 'FI to AT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FI -> ... AT 1,000 (1)', grade: 'PRIMARY' } },
  'FI>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (12,364 MWh across 12 transfers).', source: { claim: 'FI to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FI -> ... ES 12,364 (12)', grade: 'PRIMARY' } },
  'FI>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (11,239 MWh across 7 transfers).', source: { claim: 'FI to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FI -> ... CZ 11,239 (7)', grade: 'PRIMARY' } },
  'FI>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (2,434 MWh across 2 transfers).', source: { claim: 'FI to NL flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'FI -> ... NL 2,434 (2)', grade: 'PRIMARY' } },

  'CZ>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (2,689 MWh across 3 transfers).', source: { claim: 'CZ to LT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> LT 2,689 (3)', grade: 'PRIMARY' } },
  'CZ>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,769 MWh across 3 transfers).', source: { claim: 'CZ to LV flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> ... LV 1,769 (3)', grade: 'PRIMARY' } },
  'CZ>FR': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'CZ to FR: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> ... FR 1 (test)', grade: 'PRIMARY' } },
  'CZ>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (90,052 MWh across 72 transfers).', source: { claim: 'CZ to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> ... ES 90,052 (72)', grade: 'PRIMARY' } },
  'CZ>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (11,739 MWh across 15 transfers).', source: { claim: 'CZ to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> ... FI 11,739 (15)', grade: 'PRIMARY' } },
  'CZ>CH': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (16,991 MWh across 27 transfers).', source: { claim: 'CZ to CH flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> ... CH 16,991 (27)', grade: 'PRIMARY' } },
  'CZ>NL': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,201 MWh across 2 transfers).', source: { claim: 'CZ to NL flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'CZ -> ... NL 1,201 (2)', grade: 'PRIMARY' } },

  'PT>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'PT to LT: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'PT -> LT 1 (test)', grade: 'PRIMARY' } },

  'SK>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (5,040 MWh across 5 transfers in Jul 2026).', source: { claim: 'SK to LV flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'SK -> LV 5,040 (5, Jul 2026)', grade: 'PRIMARY' } },
  'SK>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (8,866 MWh across 8 transfers in Jul-Aug 2026).', source: { claim: 'SK to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'SK -> ... CZ 8,866 (8, Jul-Aug 2026)', grade: 'PRIMARY' } },

  'NL>LT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (21,670 MWh across 9 transfers).', source: { claim: 'NL to LT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> LT 21,670 (9)', grade: 'PRIMARY' } },
  'NL>LV': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (22,455 MWh across 18 transfers).', source: { claim: 'NL to LV flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... LV 22,455 (18)', grade: 'PRIMARY' } },
  'NL>AT': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (330 MWh across 2 transfers).', source: { claim: 'NL to AT flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... AT 330 (2)', grade: 'PRIMARY' } },
  'NL>FR': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (1,625 MWh across 7 transfers).', source: { claim: 'NL to FR flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... FR 1,625 (7)', grade: 'PRIMARY' } },
  'NL>ES': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (198,795 MWh across 94 transfers).', source: { claim: 'NL to ES flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... ES 198,795 (94)', grade: 'PRIMARY' } },
  'NL>IT': { status: 'POSSIBLE', via: 'AIB', grade: 'RULE', reason: 'Both registries are on the AIB gas hub and no domain protocol bars the lane, but only test-size transfers have been observed (5 MWh or less; not a commercial-size flow), so the lane rests on hub rules.', source: { claim: 'NL to IT: test-size flow only', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... IT 1 (test)', grade: 'PRIMARY' } },
  'NL>FI': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (390,029 MWh across 76 transfers).', source: { claim: 'NL to FI flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... FI 390,029 (76)', grade: 'PRIMARY' } },
  'NL>CZ': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (2,502 MWh across 5 transfers).', source: { claim: 'NL to CZ flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... CZ 2,502 (5)', grade: 'PRIMARY' } },
  'NL>CH': { status: 'POSSIBLE', via: 'AIB', grade: 'OBSERVED', reason: 'Observed transfers over AIB Hub (240,775 MWh across 158 transfers).', source: { claim: 'NL to CH flow', url: 'https://www.aib-net.org/system/files/hubtransferflowsstandalone_2.html', quote: 'NL -> ... CH 240,775 (158)', grade: 'PRIMARY' } }
};

export const POS_ORIGIN = {
  AT: {
    inEuMassBalanceSystem: true,
    reason: 'Austrian gas transmission grid is interconnected with DE, CZ, SK, HU, SI, IT within the single EU mass-balance system.',
    supportedVolumeRule: {
      text: 'Subsidised production GOs cannot be exported via AIB; gas support is investment grants; SEG confirms exported gas can use ERGaR RED MB scheme',
      effect: 'SUPPORTED_MUST_STAY',
      condition: 'unsupported volumes only: E-Control excludes GOs from subsidised plants from international transfer and trade; gas support is mostly investment grants'
    },
    sources: [
      {
        claim: 'Austrian interconnected grid inside EU single mass balance',
        url: 'https://www.erneuerbaresgas.at/wissensdatenbank/biomethan/zertifizierung',
        quote: 'Falls das Gas exportiert wird und nicht auf die nationalen Referenzziele (Produktionsland) angerechnet wird, kann das internationale Schema zur Massenbilanzierung von ERGaR ... verwendet werden.',
        grade: 'PRIMARY'
      }
    ]
  },
  BE: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-BE',
    exportReason: 'Biomethane in Belgium is produced in Flanders (small volumes, no export rule found, lean yes) and Wallonia (national non-EECS GO tied to Walloon CHP green certificates, PoS export rule not found); Brussels has no production. No public source settles whether PoS may be exported by mass balance.',
    reason: 'Belgian Fluxys grid is interconnected with NL, DE, FR, LU, GB and connects Zeebrugge LNG terminal.',
    supportedVolumeRule: {
      text: 'Walloon biomethane GO ties green value to local CHP green certificates; Flanders has small volumes with no export ban documented',
      effect: 'OPEN',
      condition: 'Walloon biomethane GOs are tied to local CHP green certificates; Flemish volumes are small with no documented export ban'
    },
    sources: [
      {
        claim: 'Belgian grid interconnected with EU neighbors',
        url: 'https://fluxys.com/en/natural-gas-and-biomethane/supplying-europe/belgium/transmission-belgium',
        quote: 'Fluxys Belgium is interconnected with NL, DE, FR, LU and GB',
        grade: 'SECONDARY'
      },
      {
        claim: 'Walloon biomethane GO is a national non-EECS certificate for Walloon CHP support',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-ESG-04-02-BEW-SPW-Domain%20Protocol%20FINAL.pdf',
        quote: 'Biomethane injected into the network in Wallonia. Can only be used to prove the origin of gas in a cogeneration plant for support or for ETS',
        grade: 'PRIMARY'
      },
      {
        claim: 'Flemish biomethane volumes are small and consumed locally with GOs',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPBEF%20Domain%20Protocol%20Clean%20Final.pdf',
        quote: 'The limited amount of biomethane produced and injected within the Flemish Region is consumed by larger customers, with GOs as a proof that double counting is avoided.',
        grade: 'PRIMARY'
      }
    ]
  },
  BG: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-BG',
    exportReason: 'Research found no public source on a biomethane support scheme or export rule in Bulgaria; export of PoS by mass balance from Bulgaria is open (the grid is inside the EU single mass-balance system, volumes are believed negligible but not verified).',
    reason: 'Bulgartransgaz grid connects to RO, GR (IGB interconnector), TR, RS within the integrated European grid.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Bulgaria interconnected with Greece and Romania',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R0996',
        quote: 'EU interconnected grid is considered as one single mass balancing system.',
        grade: 'PRIMARY'
      },
      {
        claim: 'Bulgaria: no biomethane support scheme or PoS export rule source retrieved',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols',
        quote: 'BG: no source retrieved.',
        grade: 'PRIMARY'
      }
    ]
  },
  CH: {
    inEuMassBalanceSystem: false,
    reason: 'Switzerland is a third country; European Commission considers third-country grids outside the single mass-balance system for UDB compliance.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Third-country grids outside EU single mass balance system',
        url: 'https://www.greengas.org.uk/images/upload/news_129_GGCS-Guidance-Document-23-Union-Database-for-Biofuels-v1.pdf',
        quote: 'At this stage only the EU integrated grid can be considered as one mass-balancing facility ... As far as other integrated grids of 3rd countries are concerned ... they cannot be covered by the Union database',
        grade: 'SECONDARY'
      }
    ]
  },
  CZ: {
    inEuMassBalanceSystem: true,
    reason: 'Czech transmission grid is centrally interconnected with DE, AT, SK, PL.',
    supportedVolumeRule: {
      text: 'Recipients of the operational support auction announced 12 May 2026 have no claim to GO or PoS; existing unsupported plants are unrestricted',
      effect: 'NO_PoS_FOR_SUPPORTED',
      condition: 'auction-supported volumes excluded: recipients of the operational-support auction have no entitlement to GO or PoS; existing unsupported plants are unrestricted'
    },
    sources: [
      {
        claim: 'Recipients of Czech biomethane operational support cannot sell GO or PoS',
        url: 'https://www.czbiom.cz/wp-content/uploads/4_Rene-Nedela_MPO.pdf',
        quote: 'Příjemce podpory nemá nárok na ZP ani POS',
        grade: 'PRIMARY'
      }
    ]
  },
  DE: {
    inEuMassBalanceSystem: true,
    reason: 'German grid is a core European hub connected to DK, NL, BE, FR, CH, AT, CZ, PL.',
    supportedVolumeRule: {
      text: 'EEG remuneration requires domestic CHP usage; non-EEG volumes are freely exportable with PoS and state-aid declaration',
      effect: 'SUPPORTED_MUST_STAY',
      condition: 'unsupported volumes only: EEG-remunerated volumes are tied to German CHP use; state-aid status is declared on export'
    },
    sources: [
      {
        claim: 'dena allows export of biomethane proofs with state-aid declaration',
        url: 'https://www.dena.de/fileadmin/biogasregister_/Dokumente/Vertraege/englisch/dena_Biogasregister_General_principles_for_the_functioning_August_2019.pdf',
        quote: 'proofs of biomethane ... can also be exported to a register domiciled in a Member State of the EU ... possible to record whether state aid ... was obtained',
        grade: 'PRIMARY'
      }
    ]
  },
  DK: {
    inEuMassBalanceSystem: true,
    reason: 'Danish system is interconnected with Germany (Ellund) and Sweden (Dragør).',
    supportedVolumeRule: {
      text: '2024+ tender volumes get no GOs; old pristillæg scheme volumes export GOs and PoS widely (Commission confirmed subsidised volumes eligible under FuelEU)',
      effect: 'OPEN',
      condition: '2024+ tender volumes carry no GOs and PoS use abroad depends on the destination accepting supported volumes; old pristillaeg and unsupported volumes are exported widely'
    },
    sources: [
      {
        claim: 'Danish biogas exported by mass balance to Germany and Sweden',
        url: 'https://www.biogas.dk/wp-content/uploads/2022/06/Faktaark-Oprindelsesgarantier-og-eksport-af-biogas-22-05-31.pdf',
        quote: 'Selv om oprindelsesgarantierne og dermed biogassen eksporteres, så regnes klimaeffekten af biogasproduktionen stadig med i det nationale, danske klimaregnskab.',
        grade: 'SECONDARY'
      }
    ]
  },
  EE: {
    inEuMassBalanceSystem: true,
    reason: 'Estonia is interconnected with Latvia and with Finland via Balticconnector.',
    supportedVolumeRule: {
      text: 'Operational support ended in 2024; post-2022 investment aid requires deduction of GO value from support',
      effect: 'NO_PoS_FOR_SUPPORTED',
      condition: 'unsupported volumes only: GOs for post-2022 investment-aided plants are not issued to the producer unless the GO revenue is deducted from the aid'
    },
    sources: [
      {
        claim: 'Estonian production support ended 2024',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPEE-%20Domain%20Protocol%20Elering%20Estonia%20Clean%20version%2020241210.pdf',
        quote: 'The production support scheme ended in 2024 ... are not issued to the Producer\'s Account, with the exception of situations in which, on payment of such support, revenue from the guarantees of origin is deducted from the support',
        grade: 'PRIMARY'
      }
    ]
  },
  ES: {
    inEuMassBalanceSystem: true,
    reason: 'Spanish system connects to Portugal (VIP Ibérico) and France (VIP Pirineos).',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'No operational support scheme locking Spanish biomethane attributes',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2023-DPESG-Enagas%20GTS%20Spain%20Domain%20Protocol%20-%20Gas_231213.pdf',
        quote: 'Currently there are no National Public Support Schemes for gas or hydrogen production or consumption, in place in this Domain.',
        grade: 'PRIMARY'
      }
    ]
  },
  FI: {
    inEuMassBalanceSystem: true,
    reason: 'Connected to Estonia and the EU internal gas grid via Balticconnector since 2020.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Finland connected via Balticconnector; investment aid does not restrict export',
        url: 'https://gasgrid.fi/en/gas-business/finlands-gas-transmission-network/',
        quote: 'Finland\'s gas transmission platform includes one interconnection point, Balticconnector, which connects the Finnish and Estonian transmission pipelines.',
        grade: 'PRIMARY'
      }
    ]
  },
  FR: {
    inEuMassBalanceSystem: true,
    reason: 'France is centrally interconnected with BE, DE, CH, ES, LU, IT.',
    supportedVolumeRule: {
      text: 'GOs of plants under obligation d\'achat or complément de rémunération belong to the French State (DGEC) and are auctioned; producer can exit only by reimbursing subsidies',
      effect: 'STATE_OWNS_ATTRIBUTES',
      condition: 'only volumes outside the obligation d\'achat / complement de remuneration: the State owns those GOs and auctions them, and PoS export of supported gas is not settled by a public source'
    },
    sources: [
      {
        claim: 'French feed-in support GOs owned by the State',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPFR-Domain%20Protocol%20EEX%20Gas%20Application%20Final%20Clean%20ESG.pdf',
        quote: 'GOs can then be Issued on the account of the French State which is the owner of the GOs Issued, and then sold to other Account Holders through auctions.',
        grade: 'PRIMARY'
      }
    ]
  },
  GB: {
    inEuMassBalanceSystem: false,
    reason: 'United Kingdom is a third country; European Commission states third-country grids are outside the single mass-balance system for EU compliance.',
    supportedVolumeRule: {
      text: 'GGSS pays quarterly tariff for GB grid injection; cannot double-claim RTFO',
      effect: 'SUPPORTED_MUST_STAY',
      condition: 'unsupported volumes only: no Green Gas Support Scheme payment where an RTFC was issued for the same biomethane'
    },
    sources: [
      {
        claim: 'GB grid excluded from EU single mass-balance unit by Commission interpretation',
        url: 'https://hydrogeneurope.eu/wp-content/uploads/2025/03/Eurogas_Statement_Renewable-Gas-Exports-to-EU_Union-Database-3rd-Countries.pdf',
        quote: 'consignments relying on grid balance and transferred to the EU cannot be used in compliance markets, be it from integrated grids in third countries with direct connection to the EU grid, such as the U.K.',
        grade: 'SECONDARY'
      }
    ]
  },
  GR: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-GR',
    exportReason: 'Research found no public source on a biomethane support scheme or export rule in Greece; export of PoS by mass balance from Greece is open (the grid is inside the EU single mass-balance system, volumes are believed negligible but not verified).',
    reason: 'Interconnected with Bulgaria via IGB interconnector and Kulata/Sidirokastro.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Greece connected to EU grid via IGB pipeline',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R0996',
        quote: 'The EU interconnected grid is considered as one single mass balancing system.',
        grade: 'PRIMARY'
      },
      {
        claim: 'No public source on a Greek biomethane support scheme or PoS export rule was found (AIB protocols contain no gas support text)',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols',
        quote: 'AIB domain protocols for GR (DAPEEP), HR (HROTE), SI, LU (ILR) are electricity-only and contain no gas/biomethane support text',
        grade: 'PRIMARY'
      }
    ]
  },
  HR: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-HR',
    exportReason: 'Research found no public source on a biomethane support scheme or export rule in Croatia; export of PoS by mass balance from Croatia is open (the grid is inside the EU single mass-balance system, volumes are believed negligible but not verified).',
    reason: 'Interconnected with Slovenia (Rogatec) and Hungary (Slobodnica-Városföld).',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Croatia connected to EU gas transmission grid',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R0996',
        quote: 'The EU interconnected grid is considered as one single mass balancing system.',
        grade: 'PRIMARY'
      },
      {
        claim: 'No public source on a Croatian biomethane support scheme or PoS export rule was found (AIB protocols contain no gas support text)',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols',
        quote: 'AIB domain protocols for GR (DAPEEP), HR (HROTE), SI, LU (ILR) are electricity-only and contain no gas/biomethane support text',
        grade: 'PRIMARY'
      }
    ]
  },
  HU: {
    inEuMassBalanceSystem: true,
    reason: 'Interconnected with AT, SK, RO, HR, RS, UA.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Hungary part of interconnected EU transmission system; no gas support lock in DP',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPHU-MEKH%20Domain%20Protocol%20DP%20with%20Gas%20Final.pdf',
        quote: 'no biomethane support scheme is described',
        grade: 'PRIMARY'
      }
    ]
  },
  IE: {
    inEuMassBalanceSystem: false,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-EU-1',
    exportReason: 'Irish gas reaches the continent only through Great Britain. The German THG statute (BImSchG s.37b(6) n.F.) literally covers biomethane injected anywhere in the EU excise territory, which includes Ireland, but the Commission reading (detailed opinion on the Irish Renewable Heat Obligation, quoted by Eurogas, secondary) does not treat Ireland as part of the single EU mass-balance system because its only gas link is via Great Britain, and the Moffat interconnector is configured one-way GB to IE (secondary). The two readings conflict, so Irish-origin PoS is OPEN for every destination that would otherwise accept foreign gas.',
    reason: 'Ireland is physically connected to the gas grid solely via Scotland (GB Moffat interconnector, one-way flow); European Commission detailed opinion on Irish RHO states pipeline biomethane from UK or continent cannot count towards Irish RED targets.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Commission opinion excludes Irish pipeline biomethane from single mass balance due to UK transit',
        url: 'https://www.eurogas.org/resource/joint-industry-call-removing-barriers-to-the-internal-energy-market-by-enabling-irelands-participation-in-cross-border-trade-of-renewable-gas/',
        quote: 'no pipeline-based biomethane from the UK or continental Europe can be imported to Ireland nor it can eligibly count towards the Irish contribution to the RED target',
        grade: 'SECONDARY'
      },
      {
        claim: 'Moffat interconnector flows only from Britain to Ireland',
        url: 'https://en.wikipedia.org/wiki/United_Kingdom%E2%80%93Ireland_natural_gas_interconnectors',
        quote: 'The interconnector is configured only to allow gas to run from Britain to Ireland.',
        grade: 'SECONDARY'
      }
    ]
  },
  IT: {
    inEuMassBalanceSystem: true,
    reason: 'Interconnected with Austria (Tarvisio), Switzerland (Passo Gries), Slovenia (Gorizia).',
    supportedVolumeRule: {
      text: 'Biomethane supported under DM 2 Mar 2018 or DM 15 Sep 2022 cannot export GOs; incentives require Italian grid injection and Italian transport consumption',
      effect: 'SUPPORTED_MUST_STAY',
      condition: 'unsupported volumes only: GOs of biomethane supported under DM 2018 or DM 2022 cannot be exported or cancelled outside Italy; PoS export of supported gas is not settled'
    },
    sources: [
      {
        claim: 'Supported Italian biomethane locked to domestic territory',
        url: 'https://www.mase.gov.it/portale/documents/d/guest/dm_224_14-07-2023_garanzie_di_origine-pdf',
        quote: 'se impiegate nel settore trasporti possono essere annullate solo per l\'utilizzo nel territorio italiano',
        grade: 'PRIMARY'
      }
    ]
  },
  LT: {
    inEuMassBalanceSystem: true,
    reason: 'Interconnected with Poland (GIPL pipeline) and Latvia, linking Baltic network to continental EU.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Lithuania interconnected via GIPL and Baltic grid; investment aid only',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2025-DPLTG-Domain%20Protocol%20Amber%20Grid%20R1.1%20clean.pdf',
        quote: 'Currently there are no National Public Support Schemes for biometane produced in Lithuania.',
        grade: 'PRIMARY'
      }
    ]
  },
  LU: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-LU',
    exportReason: 'Research found no public source on a biomethane support scheme or export rule in Luxembourg; export of PoS by mass balance from Luxembourg is open (the grid is inside the EU single mass-balance system, volumes are believed negligible but not verified). GOs for remunerated biogas also remain State property.',
    reason: 'Integrated into BeLux single gas balancing market with Belgium; connected to BE, DE, FR.',
    supportedVolumeRule: {
      text: 'RGD of 4 Nov 2022 Art. 11ter: GOs for remunerated biogas remain the property of the State',
      effect: 'STATE_OWNS_ATTRIBUTES',
      condition: 'GOs of remunerated biogas remain State property (RGD 4 Nov 2022 Art. 11ter)'
    },
    sources: [
      {
        claim: 'Luxembourg integrated into BeLux market; remunerated GOs owned by State',
        url: 'https://data.legilux.public.lu/filestore/eli/etat/leg/rgd/2022/11/04/a542/jo/fr/pdfa/eli-etat-leg-rgd-2022-11-04-a542-jo-fr-pdfa.pdf',
        quote: 'Les garanties d\'origine restent la propriété de l\'État, qui peut décider de les valoriser.',
        grade: 'PRIMARY'
      },
      {
        claim: 'No public source on a Luxembourg biomethane support scheme or PoS export rule was found (AIB protocols contain no gas support text)',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols',
        quote: 'AIB domain protocols for GR (DAPEEP), HR (HROTE), SI, LU (ILR) are electricity-only and contain no gas/biomethane support text',
        grade: 'PRIMARY'
      }
    ]
  },
  LV: {
    inEuMassBalanceSystem: true,
    reason: 'Interconnected with Estonia, Lithuania, and Inčukalns underground gas storage.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Latvia connected to Baltic gas grid; support declared at registration',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPLV-Conexus_Domain_Protocol_approved.pdf',
        quote: 'In case an Account Holder has received support for its Production Device or Production, it must inform Conexus',
        grade: 'PRIMARY'
      }
    ]
  },
  NL: {
    inEuMassBalanceSystem: true,
    reason: 'Core European gas hub interconnected with Germany, Belgium, and via BBL pipeline with the UK.',
    supportedVolumeRule: {
      text: 'SDE++ operating subsidy is deducted by the notional value of GOs; no statutory ban on export of physical gas with PoS',
      effect: 'OPEN',
      condition: 'SDE++ is reduced by the GO value and no export ban was found; whether RVO checks overcompensation for exported PoS is an open point'
    },
    sources: [
      {
        claim: 'Netherlands exports biomethane by mass balance; SDE++ deducts GO value',
        url: 'https://english.rvo.nl/subsidies-financing/sde/apply/renewable-gas',
        quote: 'Guarantees of Origin (GOs) are tradable certificates ... As a result, they have a financial value that is included in the final correction amount.',
        grade: 'PRIMARY'
      }
    ]
  },
  NO: {
    inEuMassBalanceSystem: false,
    reason: 'Norway has no domestic onshore gas pipeline network connected to the EU grid accepting biomethane injection (offshore system carries field gas only).',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Norway lacks connected domestic biomethane grid',
        url: 'https://www.iea.org/articles/norway-natural-gas-security-policy',
        quote: 'There are only two natural gas distributors in Norway ... the pipeline system (about 8,900 km) is an offshore export system',
        grade: 'SECONDARY'
      }
    ]
  },
  PL: {
    inEuMassBalanceSystem: true,
    reason: 'GAZ-SYSTEM network is interconnected with DE, CZ, SK, LT (GIPL), DK (Baltic Pipe), UA.',
    supportedVolumeRule: {
      text: 'RES Act Art. 120(4): GO issue/transfer is independent of support; Art. 83l biomethane CfD volumes sold to designated offtaker',
      effect: 'OPEN',
      condition: 'GO issue is independent of support (Art. 120(4)); art. 83l CfD volumes are sold to a designated buyer, which may conflict with free export'
    },
    sources: [
      {
        claim: 'Polish RES Act decouples GOs from support; grid interconnected',
        url: 'https://api.sejm.gov.pl/eli/acts/DU/2026/68/text.pdf',
        quote: 'Wydanie i zbycie gwarancji pochodzenia następuje niezależnie od korzystania z mechanizmów i instrumentów wspierających',
        grade: 'PRIMARY'
      }
    ]
  },
  PT: {
    inEuMassBalanceSystem: true,
    reason: 'Interconnected with Spain via VIP Ibérico (Badajoz, Tuy); reaches EU internal grid via Spain.',
    supportedVolumeRule: {
      text: 'Supported production devices are not granted GOs under Portuguese law',
      effect: 'NO_PoS_FOR_SUPPORTED',
      condition: 'unsupported volumes only: supported production devices are not granted GOs under Portuguese law'
    },
    sources: [
      {
        claim: 'Portuguese supported production devices receive no GOs',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-GSG-PT-REN-DPPTG%20Domain%20Protocol%20REN%20Clean%2020241217.pdf',
        quote: 'In accordance with the Portuguese legislation, GOs from Production Devices with support are not granted to producers.',
        grade: 'PRIMARY'
      }
    ]
  },
  RO: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-RO',
    exportReason: 'Research found no public source on a biomethane support scheme or export rule in Romania; export of PoS by mass balance from Romania is open (the grid is inside the EU single mass-balance system, volumes are believed negligible but not verified). No biomethane production facility existed per the energy strategy.',
    reason: 'Transgaz network interconnected with Hungary, Bulgaria, Ukraine, Moldova.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Romania interconnected with Hungary and Bulgaria',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R0996',
        quote: 'The EU interconnected grid is considered as one single mass balancing system.',
        grade: 'PRIMARY'
      },
      {
        claim: 'Romania: ANRE is an AIB observer only and no biomethane GO or PoS rule was retrieved',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols',
        quote: 'RO: ANRE is an AIB observer only; no biomethane GO/PoS rule retrieved.',
        grade: 'PRIMARY'
      }
    ]
  },
  SE: {
    inEuMassBalanceSystem: true,
    reason: 'Western Swedish transmission system (Swedegas) is interconnected with Denmark at Dragør.',
    supportedVolumeRule: {
      text: 'Production aid under SFS 2022:225 contains no territorial restriction on where biomethane is marketed',
      effect: 'OPEN',
      condition: 'production aid under SFS 2022:225 has no territorial condition but is repayable if the aid conditions are not followed'
    },
    sources: [
      {
        claim: 'Sweden grid connected to Denmark via Dragør; production aid has no export lock',
        url: 'https://data.riksdagen.se/dokument/sfs-2022-225.text',
        quote: 'Stöd får lämnas för produktion av biogas som 1. uppgraderas till biometan, med högst 30 öre per kilowattimme producerad biogas',
        grade: 'PRIMARY'
      }
    ]
  },
  SI: {
    inEuMassBalanceSystem: true,
    exportStatus: 'OPEN',
    exportOpenQuestionId: 'Q-ORIG-SI',
    exportReason: 'Research found no public source on a biomethane support scheme or export rule in Slovenia; export of PoS by mass balance from Slovenia is open (the grid is inside the EU single mass-balance system, volumes are believed negligible but not verified).',
    reason: 'Plinovodi transmission system interconnected with Austria (Murfeld/Ceršak), Italy (Gorizia), Croatia (Rogatec).',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Slovenia interconnected with AT, IT, HR',
        url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R0996',
        quote: 'The EU interconnected grid is considered as one single mass balancing system.',
        grade: 'PRIMARY'
      },
      {
        claim: 'No public source on a Slovenian biomethane support scheme or PoS export rule was found (AIB protocols contain no gas support text)',
        url: 'https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols',
        quote: 'AIB domain protocols for GR (DAPEEP), HR (HROTE), SI, LU (ILR) are electricity-only and contain no gas/biomethane support text',
        grade: 'PRIMARY'
      }
    ]
  },
  SK: {
    inEuMassBalanceSystem: true,
    reason: 'eustream network is a central transit hub interconnected with CZ, AT, PL, HU, UA.',
    supportedVolumeRule: null,
    sources: [
      {
        claim: 'Slovakia central transit hub; investment aid only',
        url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf',
        quote: 'Currently there is no direct operational public support scheme for renewable gases production in Slovakia.',
        grade: 'PRIMARY'
      }
    ]
  }
};

export const POS_DEST_SCHEMES = {
  DE: [
    {
      id: 'DE_THG',
      name: 'THG-Quote (Zweites Gesetz zur Weiterentwicklung der THG-Quote)',
      legalBasis: 'BImSchG §37b(6) n.F., adopted April/May 2026',
      acceptsForeign: 'YES',
      originScope: 'EU_EXCISE_TERRITORY',
      conditions: 'Injected into gas grid in EU excise territory; delivered by mass balance; verified via UDB/Nabisy; double counting abolished 1.1.2026. Open: BGBl promulgation and entry-into-force date not retrieved; proof route before the UDB gas module is live; a CDU/CSU intent to exclude origin-subsidised fuels is recorded in the committee report but is not in the statute.',
      reason: '§37b(6) n.F. BImSchG explicitly clarifies that gas injected anywhere in the EU excise territory and withdrawn in Germany counts towards the THG-Quote.',
      sources: [
        {
          claim: 'German THG-Quote 2026 amendment accepts EU mass-balance biomethane',
          url: 'https://dserver.bundestag.de/btd/21/040/2104083.pdf',
          quote: 'gilt aus dem Leitungsnetz entnommenes Erdgas als Biomethan, soweit die Menge ... der Menge von an anderer Stelle im Verbrauchsteuergebiet der Europäischen Union ... in das Erdgasnetz eingespeistem Biomethan entspricht',
          grade: 'PRIMARY'
        },
        {
          claim: 'Committee report records a CDU/CSU intent to exclude origin-subsidised fuels (not implemented in the statute)',
          url: 'https://dserver.bundestag.de/btd/21/055/2105530.pdf',
          quote: 'Künftig sollten bereits im Ursprungsland subventionierte Kraftstoffe von der Anrechnung auf die deutsche THG-Quote ausgeschlossen werden.',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  NL: [
    {
      id: 'NL_ERE',
      name: 'Energie voor Vervoer (ERE) - Inboekingen',
      legalBasis: 'Regeling energie vervoer artikel 7',
      acceptsForeign: 'NO',
      originScope: 'DOMESTIC_ONLY',
      conditions: 'Only Dutch-produced green gas GvOs can be used.',
      reason: 'NEa FAQ and Regeling energie vervoer art. 7 strictly require green gas GvOs relating to biogas produced in the Netherlands.',
      sources: [
        {
          claim: 'Foreign biomethane barred from Dutch transport quota inboekingen',
          url: 'https://www.emissieautoriteit.nl/vraag-en-antwoord/faq-he/kan-ik-groen-gas-gvos-uit-het-buitenland-gebruiken-voor-het-inboeken-van-biogas',
          quote: 'Nee, dat kan niet. Alleen Garanties van Oorsprong (GvO\'s) voor groen gas die betrekking hebben op in Nederland geproduceerd biogas kunnen gebruikt worden voor inboekingen (Regeling energie vervoer, artikel 7)',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  SE: [
    {
      id: 'SE_TAX',
      name: 'Energy and CO2 tax exemption for biogas (Lag 1994:1776)',
      legalBasis: 'Lag (1994:1776) om skatt på energi 7 kap. 4 §; Lag (2010:598)',
      acceptsForeign: 'YES',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Hållbarhetsbesked and anläggningsbesked under Lag 2010:598; physical delivery through western Swedish gas grid (Dragør link).',
      reason: 'Swedish law has no domestic-only restriction; Skatteverket and Energimyndigheten recognise imported biogas via western Swedish gas network (1,874 GWh net imported 2023).',
      sources: [
        {
          claim: 'Sweden accepts mass-balance imported biogas from Denmark and other EU states for full tax exemption',
          url: 'https://www.energimyndigheten.se/495caa/globalassets/fornybart/hallbara-branslen/statsstodsrapportering/2025201486-overvakningsrapport-avseende-skattebefrielse-for-biogas-som-motorbransle-ar-2024.pdf',
          quote: 'Den biogas som importeras via västsvenska naturgasnätet är till största del producerad i Danmark men kan även komma från andra delar av EU. Nettoimporten uppgick till 1 874 GWh under 2023.',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  GB: [
    {
      id: 'GB_RTFO',
      name: 'Renewable Transport Fuel Obligation (RTFO)',
      legalBasis: 'RTFO Order 2007; DfT RTFO Biomethane Guidance Dec 2024 §3.17 & §2.13',
      acceptsForeign: 'YES',
      originScope: 'ALL_INTERCONNECTED',
      conditions: 'Interconnected pipeline route from production point to UK grid; capacity booked and nominated at each cross-border point; unsupported volumes; GOs not accepted.',
      reason: 'DfT guidance explicitly permits European pipeline biomethane delivered via interconnected grids with nominated capacity bookings.',
      sources: [
        {
          claim: 'UK RTFO explicitly allows European pipeline biomethane with booked capacity',
          url: 'https://assets.publishing.service.gov.uk/media/6758544782c7cd4258eb64a8/rtfo-biomethane-guidance.pdf',
          quote: 'For biomethane imported from Europe via transmission and distribution pipeline infrastructure, it must be demonstrated that there is an interconnected pipeline route ... parties ... will need to book capacity and nominate gas flows at each cross border interconnection point',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  IT: [
    {
      id: 'IT_CIC',
      name: 'Certificati di Immissione in Consumo (CIC)',
      legalBasis: 'DM 2 marzo 2018 art. 5 & art. 12; DM 16 marzo 2023 n. 107',
      acceptsForeign: 'NO',
      originScope: 'DOMESTIC_ONLY',
      conditions: 'Italian gas network injection required.',
      reason: 'DM 2 Mar 2018 art. 5(1) restricts CIC to biomethane injected into the Italian gas grid. Art. 12 permits foreign plants only under a Dir 2009/28 cooperation agreement with reciprocity (none in force).',
      sources: [
        {
          claim: 'Italian CIC requires injection in Italian network; no cooperation agreements exist',
          url: 'https://www.mimit.gov.it/images/stories/normativa/DM-biometano-2-marzo_2018_FINALE.pdf',
          quote: 'Al produttore di biometano immesso nella rete del gas naturale ed utilizzato per i trasporti nel territorio italiano vengono rilasciati un numero di certificati di immissione in consumo di biocarburanti ... Gli impianti ubicati sul territorio di altri Stati membri ... che esportano fisicamente la loro produzione di biometano in Italia possono partecipare ... a condizione che: a) esista un accordo con lo Stato Membro ... redatto ai sensi degli articoli da 5 a 10 o dell\'articolo 11 della direttiva 2009/28/CE; b) l\'accordo stabilisca un sistema di reciprocità',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  FR: [
    {
      id: 'FR_TIRUERT',
      name: 'TIRUERT 2026 (Taxe incitative relative à l\'utilisation d\'énergie renouvelable dans les transports)',
      legalBasis: 'Code des douanes art. 266 quindecies; PLF 2026 amendment 3492',
      acceptsForeign: 'NO',
      originScope: 'NONE',
      conditions: 'None for 2026. From 1 Jan 2027 the draft IRICC mechanism replaces TIRUERT and may count biogas via GOs held by the distributor plus a sustainability proof; OPEN (draft, not law, silent on imported injection).',
      reason: 'Government amendment 3492 deleted bioGNV from TIRUERT 2026; scheme is restricted to petrol and diesel streams.',
      sources: [
        {
          claim: 'French government amendment deleted biomethane from TIRUERT 2026',
          url: 'https://www.assemblee-nationale.fr/dyn/17/amendements/2247/AN/3492.pdf',
          quote: 'Le présent amendement vise à supprimer l\'article 16 ter qui intègre le biogaz carburant (bioGNV) dans le mécanisme de la ... TIRUERT',
          grade: 'PRIMARY'
        },
        {
          claim: 'The same amendment says bioGNV is to join the non-fiscal IRICC mechanism that replaces TIRUERT on 1 Jan 2027 (draft, OPEN)',
          url: 'https://www.assemblee-nationale.fr/dyn/17/amendements/2247/AN/3492.pdf',
          quote: 'le bioGNV a vocation à être intégré dans le dispositif non fiscal d\'incitation à la réduction de l\'intensité carbone des carburants (IRICC), dispositif qui doit se substituer à la TIRUERT au 1er janvier 2027',
          grade: 'PRIMARY'
        }
      ]
    },
    {
      id: 'FR_CPB',
      name: 'Certificats de production de biogaz (CPB) — gas-supplier obligation for heating from 1 Jan 2026',
      legalBasis: "Code de l'énergie L.446-31 ff.",
      acceptsForeign: 'NO',
      originScope: 'NONE',
      conditions: 'None',
      reason: 'CPB are generated only by biomethane injected into French gas networks, so biomethane injected in another country cannot earn or satisfy CPB.',
      sources: [
        {
          claim: 'CPB scheme targets biogas injected into (French) natural gas networks',
          url: "https://codes.droit.org/PDF/Code%20de%20l'%C3%A9nergie.pdf",
          quote: 'Le dispositif de certificats de production de biogaz vise à favoriser la production de biogaz injecté dans les réseaux de gaz naturel',
          grade: 'PRIMARY'
        },
        {
          claim: 'Only biomethane injected in France generates CPB',
          url: 'https://www.gaz-mobilite.fr/dossiers/cpb-certificat-production-biomethane-comment-ca-marche/',
          quote: 'seul le biométhane injecté en France génère des CPB',
          grade: 'SECONDARY'
        }
      ]
    }
  ],

  CZ: [
    {
      id: 'CZ_TRANSPORT',
      name: 'Advanced biomethane transport obligation (§47d Act 165/2012 Coll.)',
      legalBasis: 'Act No. 165/2012 Coll. §47d(3)(a)1, consolidated 1 Aug 2026',
      acceptsForeign: 'YES',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Advanced feedstock; consumed in CZ tax territory; proven by GO or other sustainability document (PoS); declaration of no double counting in another MS.',
      reason: '§47d(3)(a)1 explicitly provides that sustainability can be proven by a GO or by another proof of sustainability (PoS), without geographic restriction.',
      sources: [
        {
          claim: 'Czech law accepts foreign biomethane via GO or other PoS without origin restriction',
          url: 'https://www.zakonyprolidi.cz/cs/2012-165',
          quote: 'splnění kritérií udržitelnosti a úspor emisí skleníkových plynů prokazuje dodavatel plynných pohonných hmot uplatněním záruky původu nebo jiným dokladem o splnění kritérií udržitelnosti',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  CH: [
    {
      id: 'CH_TAX_RELIEF',
      name: 'Mineralölsteuer fuel tax relief (MinöStG Art. 12a/12b)',
      legalBasis: 'MinöStG Art. 12a-12d; Federal Council reports 2015 & 2023',
      acceptsForeign: 'NO',
      originScope: 'NONE',
      conditions: 'None',
      reason: 'Swiss customs treats all gas imported through the pipeline network as natural gas subject to mineral oil tax and CO2 levy; no mass-balance tax relief.',
      sources: [
        {
          claim: 'Swiss pipeline gas treated as natural gas at customs; no virtual import tax relief',
          url: 'https://www.parlament.ch/centers/documents/de/15_F%C3%B6rderung%20Biogasproduktion.%20Bericht%20an%20UREK-S.%20April%202023.pdf',
          quote: 'Heute wird virtuell importiertes Biomethan staatlich nicht als erneuerbarer Energieträger anerkannt: die physisch via Gasnetz importierte Ware ist Erdgas, wird zollrechtlich als Erdgas behandelt und unterliegt der Mineralölsteuer und der CO2-Abgabe.',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  NO: [
    {
      id: 'NO_OMSETNINGSKRAV',
      name: 'Omsetningskrav for biodrivstoff',
      legalBasis: 'Produktforskriften kapittel 3',
      acceptsForeign: 'NO',
      originScope: 'NONE',
      conditions: 'None',
      reason: 'Norwegian fuel sales mandates exclude biogas (liquid biofuels only); no connected onshore grid for biomethane injection.',
      sources: [
        {
          claim: 'Norwegian mandate excludes biogas entirely',
          url: 'https://www.miljodirektoratet.no/ansvarsomrader/klima/transport/omsetningskrav-for-biodrivstoff/bakgrunn-og-formal/',
          quote: 'Biogass er ikke omfattet av omsetningskravene ... Det kan bare brukes flytende biodrivstoff og flytende biobrensler',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  AT: [
    {
      id: 'AT_KVO',
      name: 'Kraftstoffverordnung 2012 (KVO)',
      legalBasis: 'BGBl. II Nr. 398/2012; BMIMI FAQ KVO p.38-39',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Connected grid treated as one unit; ISCC/REDcert PoS; exchange via Umweltbundesamt/AGCS; foreign injection not explicitly settled.',
      reason: 'Ministry FAQ states connected gas grid is considered one unit for mass balance, but foreign injection is not confirmed in primary statutory text.',
      openQuestionId: 'Q-AT-1',
      sources: [
        {
          claim: 'Austrian KVO considers connected gas grid as one unit for mass balance',
          url: 'https://www.bmimi.gv.at/dam/jcr:9dc9b2ab-3b57-4abc-9f8c-a178328aea98/FAQ-Kraftstoffverordnung_20230428_final.pdf',
          quote: 'Das verbundene Erdgasnetz wird dabei als eine Einheit betrachtet und der Transport über das Netz ist damit mit den Regelungen der Massenbilanz vereinbar.',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  ES: [
    {
      id: 'ES_SICBIOS',
      name: 'Transport biofuel obligation (SICBIOS)',
      legalBasis: 'Orden TED/728/2024; RD 376/2022',
      acceptsForeign: 'GO_REQUIRED',
      goEvidenceUnverified: true,
      originScope: 'AIB_CONNECTED',
      openQuestionId: 'Q-ES-1',
      goRequiredInRegistry: 'ES',
      conditions: 'Must be evidenced by a Spanish GdO redeemed in Enagás GTS registry with transport end-use, plus origin PoS.',
      reason: 'Orden TED/728/2024 requires a redeemed Spanish GdO for biogas counting; pure PoS without a redeemed GdO is not accepted.',
      sources: [
        {
          claim: 'Spanish transport obligation requires redeemed GdO in Enagás register plus PoS',
          url: 'https://www.boe.es/eli/es/o/2024/07/15/ted728/con/20250306',
          quote: 'sólo se considerará el biogás y sus derivados que se utilicen en el sector del transporte y que sean reconocidos por el sistema de garantías de origen de gases renovables ... será la suma de las cantidades de gases renovables sobre las que se haya asociado una garantía de origen de gases renovables redimida con uso final en transporte ... Cuenten con una prueba de sostenibilidad',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  HU: [
    {
      id: 'HU_BUAT',
      name: 'Biofuel transport quota (Büat.)',
      legalBasis: '2010. évi CXVII. tv. (Büat.); 821/2021. (XII. 28.) Korm. rendelet',
      acceptsForeign: 'GO_REQUIRED',
      goEvidenceUnverified: true,
      originScope: 'AIB_CONNECTED',
      openQuestionId: 'Q-HU-2',
      goRequiredInRegistry: 'HU',
      conditions: 'Hungarian GO booked to fuel distributor\'s MEKH account within validity period, plus foreign sustainability declaration (PoS).',
      reason: 'Gov. Decree 821/2021 requires GO in Hungarian account system plus sustainability declaration; pure PoS not accepted.',
      sources: [
        {
          claim: 'Hungarian transport quota requires GO booked to distributor account at MEKH plus PoS',
          url: 'https://net.jogtar.hu/jogszabaly?docid=a2100821.kor',
          quote: 'származási garancia ... az üzemanyag-forgalmazó forgalmi számlájára fel lett vezetve ... fenntarthatósági nyilatkozat',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  LV: [
    {
      id: 'LV_TRANSPORT',
      name: 'Transport Energy Law (Transporta enerģijas likums)',
      legalBasis: 'Transporta enerģijas likums; MK noteikumi Nr. 336963',
      acceptsForeign: 'GO_REQUIRED',
      goEvidenceUnverified: true,
      originScope: 'AIB_CONNECTED',
      openQuestionId: 'Q-LV-1',
      goRequiredInRegistry: 'LV',
      conditions: 'Biomethane sold through grid requires a gas GO issued/registered under Latvian energy law (Conexus) plus mass-balance proof.',
      reason: 'Transport Energy Law requires origin proven by gas GO when delivered via the gas transmission/distribution grid; pure PoS not accepted.',
      sources: [
        {
          claim: 'Latvian transport law requires gas GO for grid biomethane',
          url: 'https://likumi.lv/ta/id/369580',
          quote: 'Biomasas degvielas var ņemt vērā ... ja to izcelsmi pamato ar: 12.1. gāzes izcelsmes apliecinājumiem ... izmantojot Latvijas dabasgāzes pārvades vai sadales sistēmu',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  SK: [
    {
      id: 'SK_TRANSPORT',
      name: 'Sustainable transport fuels obligation (CNG/LNG)',
      legalBasis: 'Act No. 309/2009 Coll. §14a-14b; SPP-d Domain Protocol E.10.7',
      acceptsForeign: 'GO_REQUIRED',
      originScope: 'AIB_OR_ERGAR',
      goRequiredInRegistry: 'SK',
      conditions: 'EECS GO imported via AIB or ERGaR into SPP-d; plant grid-connected; foreign PoS recognized (§14b(7)); GO cancelled for quota.',
      reason: 'Act 309/2009 §14a(9)(g) and SPP-d DP E.10.7 require imported GO cancelled in Slovak registry plus PoS.',
      sources: [
        {
          claim: 'Slovak CNG/LNG quota requires cancelled GO with sustainability confirmation; imported GOs accepted',
          url: 'https://static.slov-lex.sk/pdf/SK/ZZ/2009/309/ZZ_2009_309_20260101.pdf',
          quote: 'deklarovaného zárukou pôvodu obnoveného plynu obsahujúcou potvrdenie o udržateľnosti ... držiteľovi, ktorý záruku pôvodu ... zruší',
          grade: 'PRIMARY'
        },
        {
          claim: 'SPP-d Domain Protocol E.10.7: imported EECS (AIB) and ERGaR GOs may be used for CNG/LNG transport and ETS in Slovakia if issued for grid-connected biomethane plants',
          url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2026-DPSK-01%2003%20SPP_Distribucia_Domain_Protocol.pdf',
          quote: 'Non- EECS GOs imported via the ERGaR Hub and EECS GOs imported via the AIB Hub to be used in the ETS sector and in the transport fuels sector (CNG / LNG) in Slovakia must be issued for biomethane production facilities that are connected to the gas infrastructure',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  LT: [
    {
      id: 'LT_DAEI',
      name: 'Alternative fuels transport obligation (DAEI accounting units)',
      legalBasis: 'Order 1-158 pt 32-33; Law on Alternative Fuels art. 21',
      acceptsForeign: 'GO_REQUIRED',
      originScope: 'AIB_CONNECTED',
      goRequiredInRegistry: 'LT',
      conditions: 'Foreign GO imported to Amber Grid with cancellation note for LT; mass balance in interconnected grid; no double counting; Amber Grid approval.',
      reason: 'Order 1-158 pt 32 recognizes foreign GOs for DAEI units subject to mass balance, connected grid, and Amber Grid verification.',
      sources: [
        {
          claim: 'Lithuania recognizes foreign GOs for transport DAEI units under mass balance',
          url: 'https://e-seimas.lrs.lt/rs/actualedition/51fa35e27bff11e98a8298567570d639/VNVAdDvBNI/format/ISO_PDF/',
          quote: 'Kitų valstybių narių ... išduotos kilmės garantijos gali būti pripažintos ... tinkamos DAEI apskaitos vienetams išduoti tik tuo atveju, jeigu dalyviai taiko masės balanso sistemą ... ir jei importuojama energija nebus skaičiuota į kitos valstybės narės ... tikslą',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  EE: [
    {
      id: 'EE_TRANSPORT',
      name: 'Liquid Fuel Act transport obligation',
      legalBasis: 'Liquid Fuel Act; Elering Domain Protocol C.3.4, E.10.3',
      acceptsForeign: 'GO_REQUIRED',
      originScope: 'AIB_CONNECTED',
      goRequiredInRegistry: 'EE',
      conditions: 'Biomethane GO cancelled against Estonian transport; DP E.10.3 states imported GOs cannot automatically count for targets (case-by-case/open). Imported GOs must not come from supported production (DP C.4.7).',
      reason: 'Accounting is GO-based; pure PoS not accepted; imported GO use is not automatic.',
      openQuestionId: 'Q-EE-1',
      sources: [
        {
          claim: 'Estonia uses GO-based transport accounting; imported GOs not automatically accepted',
          url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPEE-%20Domain%20Protocol%20Elering%20Estonia%20Clean%20version%2020241210.pdf',
          quote: 'Imported biomethane GOs ... cannot automatically be used for fulfilling the national renewable energy obligations',
          grade: 'PRIMARY'
        },
        {
          claim: 'Estonian DP C.4.7: renewable energy behind imported GOs must not have received national support',
          url: 'https://www.aib-net.org/sites/default/files/assets/facts/domain-protocols/AIB-2024-DPEE-%20Domain%20Protocol%20Elering%20Estonia%20Clean%20version%2020241210.pdf',
          quote: 'Renewable energy that corresponds to the imported guarantees of origin shall not have received support via national public support schemes.',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  PL: [
    {
      id: 'PL_NCW',
      name: 'National Indicative Target (NCW)',
      legalBasis: 'Ustawa o biokomponentach i biopaliwach ciekłych art. 23 & 28c(2)',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Recognised voluntary scheme proof (ISCC/REDcert); fuel consumed in Poland; grid-delivery mechanics unverified.',
      reason: 'Art. 28c(2) accepts foreign EU sustainability documents, but gas-grid delivery mechanics under NCW remain unverified by URE.',
      openQuestionId: 'Q-PL-2',
      sources: [
        {
          claim: 'Polish law accepts foreign sustainability documents under recognised schemes',
          url: 'https://www.inforlex.pl/dok/tresc,DZU.2025.188.0000901,USTAWA-z-dnia-25-sierpnia-2006-r-o-biokomponentach-i-biopaliwach-cieklych.html',
          quote: 'Za dokumenty ... uznaje się również dokumenty wystawione: 1) w innym niż Rzeczpospolita Polska państwie członkowskim Unii Europejskiej ... lub w kraju trzecim, pod warunkiem że zostały wystawione w ramach uznanego systemu certyfikacji',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  PT: [
    {
      id: 'PT_TDB',
      name: 'Biofuel incorporation targets (TdB / TdC)',
      legalBasis: 'Decreto-Lei n.º 84/2022 arts. 8, 10, 40-41',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Consumed in Portugal; sustainability proof under recognised scheme; ENSE mass-balance issuance rules for grid gas unverified.',
      reason: 'Law is origin-neutral and recognises importers, but grid mass-balance mechanics for TdB are unverified.',
      openQuestionId: 'Q-PT-1',
      sources: [
        {
          claim: 'Portuguese law is origin-neutral and recognizes biofuel importers',
          url: 'https://files.dre.pt/1s/2022/12/23600/0000800045.pdf',
          quote: 'apenas são considerados os biocombustíveis ... consumidos em território nacional ... independentemente da sua origem geográfica ... emitido a favor do fornecedor ou importador',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  FI: [
    {
      id: 'FI_JAKELUVELVOITE',
      name: 'Distribution obligation (Jakeluvelvoite, Laki 446/2007)',
      legalBasis: 'Laki 446/2007; Gasgrid Finland presentation',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'PoS from approved voluntary scheme; same connected network via Balticconnector; Energiavirasto rules for foreign gas unverified. Note: Finnish excise tax and EU-ETS treat gas injected in another EU grid state as eligible (cancelled GO + PoS + same physical network) per Gasgrid slides, but only a secondary source exists, so no separate scheme is modelled.',
      reason: 'Excise tax/ETS accepts foreign mass-balance gas, but transport distribution obligation rules for foreign pipeline biomethane are open.',
      openQuestionId: 'Q-FI-1',
      sources: [
        {
          claim: 'Gasgrid deck confirms tax/ETS accepts foreign gas; distribution obligation open',
          url: 'https://gasgrid.fi/wp-content/uploads/250410-Gasgrid-Finland_Gas-Market-GOs.pdf',
          quote: 'The same tax procedures apply to biogas coming from abroad ... physical pipeline connection between the production site and the gas usage site',
          grade: 'SECONDARY'
        }
      ]
    }
  ],

  BE: [
    {
      id: 'BE_TRANSPORT',
      name: 'Federal renewable transport fuel obligation',
      legalBasis: 'Wet 31 juli 2023; KB 17 december 2021 art. 17; KB Jan 2025',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Productverklaring + PoS registered online; mass balance across interconnected grid; FOD Leefmilieu guidance open.',
      reason: 'Federal decree allows transmission infrastructure mass balancing, but no authority decision on foreign biomethane injection.',
      openQuestionId: 'Q-BE-1',
      sources: [
        {
          claim: 'Belgian royal decree allows mass balance in transmission infrastructure',
          url: 'https://etaamb.openjustice.be/nl/koninklijk-besluit-van-17-december-2021_n2022020021.html',
          quote: 'toelaat leveringen ... te mengen, bijvoorbeeld in een container, verwerkings- of logistieke faciliteit of transmissie- en distributie-infrastructuur of -locatie',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  DK: [
    {
      id: 'DK_TRANSPORT',
      name: 'CO2e-fortrængningskrav / iblandingskrav',
      legalBasis: 'Lov om reduktion af drivhusgasser fra transportsektoren; HB 2025.1',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Requires cancellation of relevant GO (points to Energinet); HB 2022 explicitly barred imported grid gas; HB 2025.1 silent. Supported biogas cannot count toward the blending obligation (HB 2025.1).',
      reason: 'HB 2022 explicitly barred imported grid gas from counting; HB 2025.1 requires Energinet GO cancellation.',
      openQuestionId: 'Q-DK-2',
      sources: [
        {
          claim: 'Danish handbook requires GO cancellation; imported grid gas previously barred',
          url: 'https://www.retsinformation.dk/eli/lta/2025/483/pdf',
          quote: 'Den forpligtede virksomhed skal samtidig dokumentere, at den relevante oprindelsesgaranti ... er annulleret',
          grade: 'PRIMARY'
        },
        {
          claim: 'HB 2025.1: supported biogas cannot be used to meet the blending obligation',
          url: 'https://www.retsinformation.dk/eli/lta/2025/483/pdf',
          quote: 'Til brug for opfyldelse af iblandingskravet kan der ikke anvendes støttet biogas.',
          grade: 'PRIMARY'
        },
        {
          claim: 'Historical HB 2022 explicitly barred imported grid gas (sentence absent from HB 2025.1)',
          url: 'https://www.retsinformation.dk/api/pdf/227575',
          quote: 'Bæredygtig biogas kan kun transporteres via gassystemet inden for Danmarks grænser. Såfremt biogas importeres til Danmark via gassystemet, anses det ikke længere for at være biogas men i stedet naturgas.',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  IE: [
    {
      id: 'IE_RTFO',
      name: 'Renewable Transport Fuel Obligation (RTFO)',
      legalBasis: 'SI 33/2010; GNI Renewable Gas Registry pilot',
      acceptsForeign: 'OPEN',
      originScope: 'GB_OR_INTERCONNECTED',
      conditions: 'GNI Proof of Origin pilot recognition; delivery via Moffat interconnector; NORA acceptance. Lean not possible for continental origins: the Commission opinion on the Irish RHO (via Eurogas, secondary) says pipeline biomethane from the UK or continental Europe cannot count toward the Irish RED contribution; GB-injected gas is the only practical case.',
      reason: 'GNI operates pilot recognition for foreign mass-balance certificates, but no standardised procedure exists.',
      openQuestionId: 'Q-IE-1',
      sources: [
        {
          claim: 'GNI operates pilot recognition for imported biomethane',
          url: 'https://www.gasnetworks.ie/network/biomethane/registry',
          quote: 'Gas Networks Ireland aims to recognise mass-balance certificates from other European registries transferred to Ireland on a pilot basis ... There is no standard procedure for this yet.',
          grade: 'PRIMARY'
        },
        {
          claim: 'Commission detailed opinion on the Irish Renewable Heat Obligation, as quoted by industry: pipeline biomethane from the UK or continental Europe cannot count toward the Irish RED contribution',
          url: 'https://www.eurogas.org/resource/joint-industry-call-removing-barriers-to-the-internal-energy-market-by-enabling-irelands-participation-in-cross-border-trade-of-renewable-gas/',
          quote: 'no pipeline-based biomethane from the UK or continental Europe can be imported to Ireland nor it can eligibly count towards the Irish contribution to the RED target',
          grade: 'SECONDARY'
        }
      ]
    }
  ],

  SI: [
    {
      id: 'SI_TRANSPORT',
      name: 'Decree on renewable energy in transport (OVE v prometu)',
      legalBasis: 'Uredba o obnovljivih virih energije v prometu (Ur. l. RS 208/2021) art. 4(2)',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Origin-neutral 2% biogas quota for gaseous fuels; mass balance evidence rules open.',
      reason: 'Statute is origin-neutral, but administrative evidence rules for cross-border grid biomethane are unsettled.',
      openQuestionId: 'Q-SI-1',
      sources: [
        {
          claim: 'Slovenian decree sets 2% biogas share for gaseous transport fuels',
          url: 'https://www.uradni-list.si/_pdf/2021/Ur/u2021208.pdf',
          quote: 'Dobavitelj goriva, ki prodaja plinasto gorivo fosilnega izvora, mora ... dosegati energijski delež ... bioplina v prometu ... v letu 2026 najmanj 2 %',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  HR: [
    {
      id: 'HR_TRANSPORT',
      name: 'Law on Biofuels for Transport',
      legalBasis: 'Zakon o biogorivima za prijevoz (NN 65/2009...52/2021)',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Law covers gaseous biofuels, but gas-grid injection and mass-balance rules are absent.',
      reason: 'Statute is origin-neutral, but lacks gas-grid mass-balance accounting mechanism.',
      openQuestionId: 'Q-HR-1',
      sources: [
        {
          claim: 'Croatian biofuel law covers gaseous fuels but lacks gas grid mechanics',
          url: 'https://www.zakon.hr/z/189/zakon-o-biogorivima-za-prijevoz',
          quote: 'biogorivo je tekuće ili plinovito gorivo namijenjeno uporabi u prijevozu proizvedeno iz biomase',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  RO: [
    {
      id: 'RO_TRANSPORT',
      name: 'Renewable transport fuel obligation',
      legalBasis: 'Law 220/2008; OUG 9/2026',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'No biomethane market or counting rules in place.',
      reason: 'National legislation does not regulate biomethane cross-border trading or counting toward transport obligations.',
      openQuestionId: 'Q-RO-1',
      sources: [
        {
          claim: 'Romania lacks specific rules on biomethane trading/transport counting',
          url: 'https://www.ces.ro/newlib/PDF/proiecte/2026/Nota-de-fundamentare-scan-semnat-MADR-MMAP-si-MF.pdf',
          quote: 'cadrul legislativ național privind gazele naturale nu cuprinde norme specifice privind producerea, injectarea în rețea, transportul și comercializarea biometanului',
          grade: 'PRIMARY'
        }
      ]
    }
  ],

  GR: [
    {
      id: 'GR_TRANSPORT',
      name: 'Renewable fuels transport obligation',
      legalBasis: 'Law 5215/2025; Law 3468/2006 art. 32H',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Requires voluntary scheme proof and UDB registration; foreign gas injection counting open.',
      reason: 'Biomethane framework recently created; cross-border mass-balance recognition unverified.',
      openQuestionId: 'Q-GR-1',
      sources: [
        {
          claim: 'Greek biomethane verified via recognized voluntary schemes',
          url: 'https://energypress.gr/news/nomos-52152025-gia-ydrogono-kai-biomethanio-proto-bima-gia-tin-ependytiki-asfaleia-ston-tomea',
          quote: 'Η επαλήθευση της τήρησης των κριτηρίων αειφορίας ... θα γίνεται σύμφωνα με το άρθρο 32Η του ν. 3468/2006, δηλαδή με τη χρήση αναγνωρισμένων εθελοντικών καθεστώτων',
          grade: 'SECONDARY'
        }
      ]
    }
  ],

  BG: [
    {
      id: 'BG_TRANSPORT',
      name: 'Energy from Renewable Sources Act (ZEVI) blending obligation',
      legalBasis: 'ZEVI art. 47',
      acceptsForeign: 'OPEN',
      originScope: 'EU_INTERCONNECTED',
      conditions: 'Text read covers liquid fuels only.',
      reason: 'No gaseous fuel quota or biomethane accounting mechanism evidenced in primary text read.',
      openQuestionId: 'Q-BG-1',
      sources: [
        {
          claim: 'Bulgarian ZEVI art. 47 text read covers liquid fuel blending',
          url: 'https://irinakonstantinova.com/zakoni/zakon-za-energiata-ot-vazobnoviaemi-iztochnici/',
          quote: 'Лицата, които пускат на пазара течни горива ... са длъжни ... да предлагат горивата за дизелови и бензинови двигатели смесени с биогорива',
          grade: 'SECONDARY'
        }
      ]
    }
  ],

  LU: [
    {
      id: 'LU_TRANSPORT',
      name: 'Biofuel blending obligation',
      legalBasis: 'Loi d\'accise 17 Dec 2010 art. 1; RGD 3 Feb 2023',
      acceptsForeign: 'NO',
      originScope: 'NONE',
      conditions: 'None',
      reason: 'Transport obligation applies to petrol and diesel only; no gaseous biomethane leg exists.',
      sources: [
        {
          claim: 'Luxembourg biofuel blending obligation restricted to petrol and road diesel',
          url: 'https://environnement.public.lu/content/dam/environnement/documents/emweltprozeduren/biofuels/guide-controle-documentaire-biocarburants.pdf',
          quote: 'addition physique d\'au moins 8,40% de biocarburants ... AUX ESSENCES ET AU DIESEL ROUTIER',
          grade: 'PRIMARY'
        }
      ]
    }
  ]
};
