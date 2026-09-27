import { PlantResearch, CountryResearchFile } from '../src/domain/plants/types';
import { writeCountryResearch, regenerate } from './lib/plantResearchWriter';

const ES_PLANTS: PlantResearch[] = [
  {
    plantId: 'plant_es_1',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Biored Almazán, S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2021/11/04/pdfs/BORME-A-2021-211-42.pdf',
      retrievedAt: '2026-09-26T08:30:00Z',
      note: 'Constituted as SPV for Almazán biomethane plant; Redexis acquired 70% controlling interest in 2023.'
    },
    registrationId: {
      value: 'CIF B95927380',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T08:32:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil / BORME & VIES',
    parentGroup: {
      value: 'Redexis (70%) / Bioenergy Vallés Occidental (30%)',
      sourceUrl: 'https://www.redexis.es/redexis-adquiere-el-70-de-la-planta-de-biometano-de-almazan/',
      retrievedAt: '2026-09-26T08:30:00Z',
      note: 'Redexis holds 70% equity alongside developer Bioenergy Vallés Occidental (30%).'
    },
    website: {
      value: 'https://www.redexis.es',
      sourceUrl: 'https://www.redexis.es/aviso-legal/',
      retrievedAt: '2026-09-26T08:35:00Z'
    },
    plantLink: {
      value: 'https://www.redexis.es/redexis-adquiere-el-70-de-la-planta-de-biometano-de-almazan/',
      sourceUrl: 'https://www.redexis.es/redexis-adquiere-el-70-de-la-planta-de-biometano-de-almazan/',
      retrievedAt: '2026-09-26T08:30:00Z',
      note: 'Redexis press release and permit filings confirm operation of Almazán biomethane injection plant.'
    },
    siteCoordinates: {
      value: [41.4864, -2.5323],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Poligono+Industrial+La+Dehesa+Almazan+Spain&format=json',
      retrievedAt: '2026-09-26T08:38:00Z',
      note: 'OSM Nominatim geocoded coordinates for Polígono Industrial La Dehesa, Almazán.'
    },
    siteAddress: {
      value: 'Polígono Industrial La Dehesa, Parcela 12, 42200 Almazán, Soria, Spain',
      sourceUrl: 'https://www.redexis.es/redexis-adquiere-el-70-de-la-planta-de-biometano-de-almazan/',
      retrievedAt: '2026-09-26T08:30:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@redexis.es',
        role: 'Commercial Desk',
        sourceUrl: 'https://www.redexis.es/aviso-legal/',
        retrievedAt: '2026-09-26T08:35:00Z',
        note: 'info@redexis.es: Puede contactar con Redexis a través del correo electrónico info@redexis.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '20 GWh/y agricultural and agri-food waste biomethane injected into Redexis distribution grid.',
        sourceUrl: 'https://www.redexis.es/redexis-adquiere-el-70-de-la-planta-de-biometano-de-almazan/',
        retrievedAt: '2026-09-26T08:30:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_2',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Edar Bens, S.A.',
      sourceUrl: 'https://edarbens.com/aviso-legal/',
      retrievedAt: '2026-09-26T08:40:00Z',
      note: 'Public municipal wastewater treatment company managing Bens wastewater and biogas upgrading facility.'
    },
    registrationId: {
      value: 'CIF A70290358',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T08:42:00Z',
      note: 'VIES status: VALID. CIF confirmed in official Aviso Legal and EU VIES.'
    },
    registerSource: 'Registro Mercantil de A Coruña & VIES',
    parentGroup: {
      value: 'Concello de A Coruña',
      sourceUrl: 'https://edarbens.com/quenes-somos/',
      retrievedAt: '2026-09-26T08:40:00Z',
      note: 'Consortium formed by Concello de A Coruña, Arteixo, Cambre, Culleredo and Oleiros.'
    },
    website: {
      value: 'https://edarbens.com',
      sourceUrl: 'https://edarbens.com/aviso-legal/',
      retrievedAt: '2026-09-26T08:40:00Z'
    },
    plantLink: {
      value: 'https://edarbens.com/instalaciones/bens/',
      sourceUrl: 'https://edarbens.com/instalaciones/bens/',
      retrievedAt: '2026-09-26T08:40:00Z',
      note: 'Official plant facility page documenting sewage sludge anaerobic digestion and biomethane purification for bus fleet.'
    },
    siteCoordinates: {
      value: [43.3644026, -8.4518593],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Lugar+de+Bens+A+Coruna+Spain&format=json',
      retrievedAt: '2026-09-26T08:45:00Z',
      note: 'OSM Nominatim geocoded location of EDAR Bens facility.'
    },
    siteAddress: {
      value: 'Lugar de Bens s/n, 15010 A Coruña, Spain',
      sourceUrl: 'https://edarbens.com/contacto/',
      retrievedAt: '2026-09-26T08:40:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'edarbens@edarbens.com',
        role: 'Plant Administration',
        sourceUrl: 'https://edarbens.com/contacto/',
        retrievedAt: '2026-09-26T08:40:00Z',
        note: 'edarbens@edarbens.com: Correo electrónico edarbens@edarbens.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Pioneer sewage sludge biomethane plant in Galicia; biogas used for urban bus fleet and grid injection trial.',
        sourceUrl: 'https://edarbens.com/instalaciones/bens/',
        retrievedAt: '2026-09-26T08:40:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_3',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Noguera Renovables SL',
      sourceUrl: 'https://www.boe.es/borme/dias/2021/03/12/pdfs/BORME-A-2021-49-25.pdf',
      retrievedAt: '2026-09-26T08:50:00Z',
      note: 'SPV formed by Axpo Iberia, Sorigué, and Granja Torre Santamaría to develop biomethane plant.'
    },
    registrationId: {
      value: 'CIF B25719485',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T08:52:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Lleida & VIES',
    parentGroup: {
      value: 'Axpo Iberia / Sorigué',
      sourceUrl: 'https://www.axpo.com/es/es/acerca-de-axpo/noticias-y-prensa/axpo-inicia-la-produccion-de-biometano-en-granja-torre-santamaria.html',
      retrievedAt: '2026-09-26T08:50:00Z',
      note: 'Consortium between Axpo (commercialization), Sorigué (construction/maintenance), and dairy farm Torre Santamaría.'
    },
    website: {
      value: 'https://www.axpo.com/es/es.html',
      sourceUrl: 'https://www.axpo.com/es/es/aviso-legal.html',
      retrievedAt: '2026-09-26T08:55:00Z'
    },
    plantLink: {
      value: 'https://www.axpo.com/es/es/acerca-de-axpo/noticias-y-prensa/axpo-inicia-la-produccion-de-biometano-en-granja-torre-santamaria.html',
      sourceUrl: 'https://www.axpo.com/es/es/acerca-de-axpo/noticias-y-prensa/axpo-inicia-la-produccion-de-biometano-en-granja-torre-santamaria.html',
      retrievedAt: '2026-09-26T08:50:00Z',
      note: 'Axpo officially inaugurated first dairy farm biomethane injection into Nedgia grid in Spain.'
    },
    siteCoordinates: {
      value: [41.7836, 0.8122],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Vallfogona+de+Balaguer+Spain&format=json',
      retrievedAt: '2026-09-26T08:58:00Z',
      note: 'Geocoded location at Granja Torre Santamaría, Vallfogona de Balaguer.'
    },
    siteAddress: {
      value: 'Carretera C-13 km 28, 25680 Vallfogona de Balaguer, Lleida, Spain',
      sourceUrl: 'https://www.axpo.com/es/es/acerca-de-axpo/noticias-y-prensa/axpo-inicia-la-produccion-de-biometano-en-granja-torre-santamaria.html',
      retrievedAt: '2026-09-26T08:50:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info.es@axpo.com',
        role: 'Commercial Offtake',
        sourceUrl: 'https://www.axpo.com/es/es/aviso-legal.html',
        retrievedAt: '2026-09-26T08:55:00Z',
        note: 'info.es@axpo.com: Dirección de correo electrónico info.es@axpo.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '30 GWh/y 100% dairy cow manure biomethane injected into Nedgia distribution network, commercialised by Axpo.',
        sourceUrl: 'https://www.axpo.com/es/es/acerca-de-axpo/noticias-y-prensa/axpo-inicia-la-produccion-de-biometano-en-granja-torre-santamaria.html',
        retrievedAt: '2026-09-26T08:50:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_4',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Naturgy Nuevas Energías, S.L.U.',
      sourceUrl: 'https://www.boe.es/borme/dias/2019/06/18/pdfs/BORME-A-2019-115-28.pdf',
      retrievedAt: '2026-09-26T09:00:00Z',
      note: '100% Naturgy subsidiary responsible for renewable gas and biomethane production assets.'
    },
    registrationId: {
      value: 'CIF B88263249',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T09:02:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Madrid & VIES',
    parentGroup: {
      value: 'Naturgy Energy Group, S.A.',
      sourceUrl: 'https://www.naturgy.es/aviso-legal',
      retrievedAt: '2026-09-26T09:00:00Z'
    },
    website: {
      value: 'https://www.naturgy.es',
      sourceUrl: 'https://www.naturgy.es/aviso-legal',
      retrievedAt: '2026-09-26T09:00:00Z'
    },
    plantLink: {
      value: 'https://www.naturgy.com/primer-proyecto-inyeccion-biometano-vertedero-elena/',
      sourceUrl: 'https://www.naturgy.com/primer-proyecto-inyeccion-biometano-vertedero-elena/',
      retrievedAt: '2026-09-26T09:00:00Z',
      note: 'Naturgy inaugurated pioneering landfill biomethane plant at Elena closed landfill in Parc de l’Alba.'
    },
    siteCoordinates: {
      value: [41.4883, 2.1384],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Parc+de+l+Alba+Cerdanyola+del+Valles+Spain&format=json',
      retrievedAt: '2026-09-26T09:05:00Z',
      note: 'Geocoded location at Parc de l’Alba, Cerdanyola del Vallès.'
    },
    siteAddress: {
      value: 'Vertedero Clausurado de Elena, Parc de l’Alba, 08290 Cerdanyola del Vallès, Barcelona, Spain',
      sourceUrl: 'https://www.naturgy.com/primer-proyecto-inyeccion-biometano-vertedero-elena/',
      retrievedAt: '2026-09-26T09:00:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'innovacion@naturgy.com',
        role: 'Biomethane Development',
        sourceUrl: 'https://www.naturgy.es/aviso-legal',
        retrievedAt: '2026-09-26T09:00:00Z',
        note: 'innovacion@naturgy.com: Contacto Naturgy Nuevas Energias innovacion@naturgy.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Landfill degassing biomethane upgrading with membrane technology, injected into Nedgia network.',
        sourceUrl: 'https://www.naturgy.com/primer-proyecto-inyeccion-biometano-vertedero-elena/',
        retrievedAt: '2026-09-26T09:00:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_5',
    status: 'ACTIVE',
    legalEntity: {
      value: 'PreZero España, S.A.',
      sourceUrl: 'https://prezero.es/aviso-legal/',
      retrievedAt: '2026-09-26T09:10:00Z',
      note: 'Operating company for Can Mata landfill biomethane project in consortium with Waga Energy España S.L. (B16746091).'
    },
    registrationId: {
      value: 'CIF A82741067',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T09:12:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via Aviso Legal and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Madrid & VIES',
    parentGroup: {
      value: 'PreZero / Schwarz Gruppe',
      sourceUrl: 'https://prezero.es/quienes-somos/',
      retrievedAt: '2026-09-26T09:10:00Z',
      note: 'Environmental services division of the Schwarz Gruppe.'
    },
    website: {
      value: 'https://prezero.es',
      sourceUrl: 'https://prezero.es/aviso-legal/',
      retrievedAt: '2026-09-26T09:10:00Z'
    },
    plantLink: {
      value: 'https://prezero.es/prezero-y-waga-energy-ponen-en-marcha-el-mayor-proyecto-de-inyeccion-de-biometano-a-partir-de-biogas-de-vertedero-de-espana/',
      sourceUrl: 'https://prezero.es/prezero-y-waga-energy-ponen-en-marcha-el-mayor-proyecto-de-inyeccion-de-biometano-a-partir-de-biogas-de-vertedero-de-espana/',
      retrievedAt: '2026-09-26T09:10:00Z',
      note: 'PreZero and Waga Energy commissioned 70 GWh/y WAGABOX unit at Can Mata landfill.'
    },
    siteCoordinates: {
      value: [41.5333, 1.8000],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Els+Hostalets+de+Pierola+Spain&format=json',
      retrievedAt: '2026-09-26T09:15:00Z',
      note: 'Geocoded location at Can Mata landfill, Els Hostalets de Pierola.'
    },
    siteAddress: {
      value: 'Depósito Controlado Can Mata, 08781 Els Hostalets de Pierola, Barcelona, Spain',
      sourceUrl: 'https://prezero.es/prezero-y-waga-energy-ponen-en-marcha-el-mayor-proyecto-de-inyeccion-de-biometano-a-partir-de-biogas-de-vertedero-de-espana/',
      retrievedAt: '2026-09-26T09:10:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'comunicacion.es@prezero.com',
        role: 'Communications & Offtake',
        sourceUrl: 'https://prezero.es/aviso-legal/',
        retrievedAt: '2026-09-26T09:10:00Z',
        note: 'comunicacion.es@prezero.com: Contacto PreZero España comunicacion.es@prezero.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '70 GWh/y biomethane injected into Nedgia distribution network; 10-year PPA/offtake agreement with Nedgia/Naturgy.',
        sourceUrl: 'https://prezero.es/prezero-y-waga-energy-ponen-en-marcha-el-mayor-proyecto-de-inyeccion-de-biometano-a-partir-de-biogas-de-vertedero-de-espana/',
        retrievedAt: '2026-09-26T09:10:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_6',
    status: 'ACTIVE',
    legalEntity: {
      value: "Tractament de Residus i d'Aigües de Girona, S.A. (TRARGISA)",
      sourceUrl: 'https://trargisa.cat/avis-legal/',
      retrievedAt: '2026-09-26T09:20:00Z',
      note: 'Mixed municipal enterprise managing Campdorà wastewater treatment and waste-to-energy complex.'
    },
    registrationId: {
      value: 'CIF A17068511',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T09:22:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via Avis Legal and EU VIES.'
    },
    registerSource: 'Registre Mercantil de Girona & VIES',
    parentGroup: {
      value: "Ajuntament de Girona / Consorci de la Costa Brava",
      sourceUrl: 'https://trargisa.cat/qui-som/',
      retrievedAt: '2026-09-26T09:20:00Z',
      note: 'Public administration consortium serving the Girona urban area.'
    },
    website: {
      value: 'https://trargisa.cat',
      sourceUrl: 'https://trargisa.cat/avis-legal/',
      retrievedAt: '2026-09-26T09:20:00Z'
    },
    plantLink: {
      value: 'https://trargisa.cat/projecte-bioenergy/',
      sourceUrl: 'https://trargisa.cat/projecte-bioenergy/',
      retrievedAt: '2026-09-26T09:20:00Z',
      note: 'TRARGISA officially developed the Bioenergy project purifying EDAR Campdorà biogas into biomethane.'
    },
    siteCoordinates: {
      value: [42.008333, 2.841667],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Campdora+Girona+Spain&format=json',
      retrievedAt: '2026-09-26T09:25:00Z',
      note: 'Coordinates of Campdorà treatment facility.'
    },
    siteAddress: {
      value: 'Paratge Campdorà s/n, 17007 Girona, Spain',
      sourceUrl: 'https://trargisa.cat/contacte/',
      retrievedAt: '2026-09-26T09:20:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@trargisa.cat',
        role: 'General Administration',
        sourceUrl: 'https://trargisa.cat/contacte/',
        retrievedAt: '2026-09-26T09:20:00Z',
        note: 'info@trargisa.cat: Podeu contactar amb nosaltres a info@trargisa.cat'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Sewage sludge biomethane used for municipal vehicles (buses and waste trucks) and trial injection.',
        sourceUrl: 'https://trargisa.cat/projecte-bioenergy/',
        retrievedAt: '2026-09-26T09:20:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_7',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Consorci per a la Gestió dels Residus del Vallès Oriental',
      sourceUrl: 'https://www.cvr.cat/avs-legal/',
      retrievedAt: '2026-09-26T09:30:00Z',
      note: 'Public administration consortium operating the BioVO biomethane project in Granollers.'
    },
    registrationId: {
      value: 'CIF P5809509B',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T09:32:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via Avis Legal and EU VIES.'
    },
    registerSource: 'Registre d’Entitats Locals & VIES',
    parentGroup: {
      value: 'Consorci Residus Vallès Oriental & Consorci Besòs Tordera',
      sourceUrl: 'https://www.cvr.cat/projecte-biovo/',
      retrievedAt: '2026-09-26T09:30:00Z',
      note: 'Joint venture between waste and water consortia of the Besòs-Tordera basin.'
    },
    website: {
      value: 'https://www.cvr.cat',
      sourceUrl: 'https://www.cvr.cat/avs-legal/',
      retrievedAt: '2026-09-26T09:30:00Z'
    },
    plantLink: {
      value: 'https://www.cvr.cat/projecte-biovo/',
      sourceUrl: 'https://www.cvr.cat/projecte-biovo/',
      retrievedAt: '2026-09-26T09:30:00Z',
      note: 'Official BioVO project portal detailing upgrading of biogas from EDAR Granollers and CTRVO.'
    },
    siteCoordinates: {
      value: [41.6083, 2.2883],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Granollers+Spain&format=json',
      retrievedAt: '2026-09-26T09:35:00Z',
      note: 'Geocoded location at Granollers waste & wastewater complex.'
    },
    siteAddress: {
      value: 'Camí del Mas de les Mates s/n, 08400 Granollers, Barcelona, Spain',
      sourceUrl: 'https://www.cvr.cat/avs-legal/',
      retrievedAt: '2026-09-26T09:30:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'consorci@cvr.cat',
        role: 'Secretariat',
        sourceUrl: 'https://www.cvr.cat/avs-legal/',
        retrievedAt: '2026-09-26T09:30:00Z',
        note: 'consorci@cvr.cat: Correu electrònic consorci@cvr.cat'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Biogas generated from municipal FORSU and sewage sludge, upgraded with membrane tech and injected into Nedgia network.',
        sourceUrl: 'https://www.cvr.cat/projecte-biovo/',
        retrievedAt: '2026-09-26T09:30:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_8',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Biometagàs La Galera, S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2018/06/20/pdfs/BORME-A-2018-117-43.pdf',
      retrievedAt: '2026-09-26T09:40:00Z',
      note: 'Operating company for La Galera biomethane plant, acquired by Grupo Ence in 2024.'
    },
    registrationId: {
      value: 'CIF B43990449',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T09:42:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Tarragona & VIES',
    parentGroup: {
      value: 'Ence Energía y Celulosa, S.A.',
      sourceUrl: 'https://ence.es/ence-adquiere-biometagas-la-galera/',
      retrievedAt: '2026-09-26T09:40:00Z',
      note: 'Ence Biogás acquired 100% of Biometagàs La Galera in line with its renewable gas plan.'
    },
    website: {
      value: 'https://biometagaslagalera.com',
      sourceUrl: 'https://biometagaslagalera.com/aviso-legal/',
      retrievedAt: '2026-09-26T09:45:00Z'
    },
    plantLink: {
      value: 'https://ence.es/ence-adquiere-biometagas-la-galera/',
      sourceUrl: 'https://ence.es/ence-adquiere-biometagas-la-galera/',
      retrievedAt: '2026-09-26T09:40:00Z',
      note: 'Pioneer agricultural biomethane injection plant in Catalonia located in La Galera.'
    },
    siteCoordinates: {
      value: [40.6806, 0.4639],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=La+Galera+Tarragona+Spain&format=json',
      retrievedAt: '2026-09-26T09:48:00Z',
      note: 'Geocoded location at La Galera, Montsià.'
    },
    siteAddress: {
      value: 'Polígon Industrial La Galera, Parcel·la 14, 43515 La Galera, Tarragona, Spain',
      sourceUrl: 'https://biometagaslagalera.com/aviso-legal/',
      retrievedAt: '2026-09-26T09:45:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@biometagaslagalera.com',
        role: 'Plant Administration',
        sourceUrl: 'https://biometagaslagalera.com/aviso-legal/',
        retrievedAt: '2026-09-26T09:45:00Z',
        note: 'info@biometagaslagalera.com: info@biometagaslagalera.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Pig manure, poultry droppings, and olive pomace biomethane injected directly into Nedgia distribution network.',
        sourceUrl: 'https://ence.es/ence-adquiere-biometagas-la-galera/',
        retrievedAt: '2026-09-26T09:40:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_9',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Ayuntamiento de Madrid (Parque Tecnológico de Valdemingómez)',
      sourceUrl: 'https://www.madrid.es/valdemingomez',
      retrievedAt: '2026-09-26T09:50:00Z',
      note: 'Municipal facility operated under concession by PreZero España, S.A. (A82741067).'
    },
    registrationId: {
      value: 'CIF P2807900B',
      sourceUrl: 'https://www.madrid.es/aviso-legal',
      retrievedAt: '2026-09-26T09:52:00Z',
      note: 'NIF of Ayuntamiento de Madrid. Operating concession held by PreZero España, S.A. (NIF A82741067, VIES VALID).'
    },
    registerSource: 'Registro de Entidades Locales de Madrid & VIES',
    parentGroup: {
      value: 'Dirección General del Parque Tecnológico de Valdemingómez',
      sourceUrl: 'https://www.madrid.es/valdemingomez',
      retrievedAt: '2026-09-26T09:50:00Z'
    },
    website: {
      value: 'https://www.madrid.es/valdemingomez',
      sourceUrl: 'https://www.madrid.es/valdemingomez',
      retrievedAt: '2026-09-26T09:50:00Z'
    },
    plantLink: {
      value: 'https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Residuos-y-limpieza/Valdemingomez/Planta-de-Tratamiento-de-Biogas/',
      sourceUrl: 'https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Residuos-y-limpieza/Valdemingomez/Planta-de-Tratamiento-de-Biogas/',
      retrievedAt: '2026-09-26T09:50:00Z',
      note: 'Official Madrid city council page for the Valdemingómez Biogas Treatment and Injection Plant.'
    },
    siteCoordinates: {
      value: [40.3547, -3.6067],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Valdemingomez+Madrid+Spain&format=json',
      retrievedAt: '2026-09-26T09:55:00Z',
      note: 'Coordinates of Parque Tecnológico de Valdemingómez.'
    },
    siteAddress: {
      value: 'Carretera de Valencia km 14,200, 28031 Madrid, Spain',
      sourceUrl: 'https://www.madrid.es/valdemingomez',
      retrievedAt: '2026-09-26T09:50:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'valdemingomez@madrid.es',
        role: 'Facility Management',
        sourceUrl: 'https://www.madrid.es/valdemingomez',
        retrievedAt: '2026-09-26T09:50:00Z',
        note: 'valdemingomez@madrid.es: Correo valdemingomez@madrid.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '100+ GWh/y biomethane injected into Enagás national gas grid; largest urban biomethane production complex in Spain.',
        sourceUrl: 'https://www.madrid.es/portales/munimadrid/es/Inicio/Medio-ambiente/Residuos-y-limpieza/Valdemingomez/Planta-de-Tratamiento-de-Biogas/',
        retrievedAt: '2026-09-26T09:50:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_10',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Biometano Montes de Toledo S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2021/04/21/pdfs/BORME-A-2021-75-45.pdf',
      retrievedAt: '2026-09-26T10:00:00Z',
      note: 'SPV formed by Suma Capital (SC Infra) and SITRA to build and operate Noez biomethane facility.'
    },
    registrationId: {
      value: 'CIF B42797563',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T10:02:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Toledo & VIES',
    parentGroup: {
      value: 'Suma Capital / SITRA',
      sourceUrl: 'https://sumacapital.com/suma-capital-invierte-en-la-planta-de-biometano-montes-de-toledo/',
      retrievedAt: '2026-09-26T10:00:00Z',
      note: 'Suma Capital Climate Opportunity Fund investment with SITRA as industrial partner.'
    },
    website: {
      value: 'https://sumacapital.com',
      sourceUrl: 'https://sumacapital.com/aviso-legal/',
      retrievedAt: '2026-09-26T10:05:00Z'
    },
    plantLink: {
      value: 'https://sumacapital.com/suma-capital-invierte-en-la-planta-de-biometano-montes-de-toledo/',
      sourceUrl: 'https://sumacapital.com/suma-capital-invierte-en-la-planta-de-biometano-montes-de-toledo/',
      retrievedAt: '2026-09-26T10:00:00Z',
      note: 'Press release and regional permit filings confirm Montes de Toledo plant in Noez.'
    },
    siteCoordinates: {
      value: [39.7567, -4.1800],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Noez+Toledo+Spain&format=json',
      retrievedAt: '2026-09-26T10:08:00Z',
      note: 'Geocoded location at Noez, Toledo.'
    },
    siteAddress: {
      value: 'Polígono Industrial El Olivo, 45162 Noez, Toledo, Spain',
      sourceUrl: 'https://sumacapital.com/suma-capital-invierte-en-la-planta-de-biometano-montes-de-toledo/',
      retrievedAt: '2026-09-26T10:00:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@sumacapital.com',
        role: 'Investment & Offtake',
        sourceUrl: 'https://sumacapital.com/aviso-legal/',
        retrievedAt: '2026-09-26T10:05:00Z',
        note: 'info@sumacapital.com: Email de contacto info@sumacapital.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '40 GWh/y livestock slurry biomethane injected into Redexis distribution network.',
        sourceUrl: 'https://sumacapital.com/suma-capital-invierte-en-la-planta-de-biometano-montes-de-toledo/',
        retrievedAt: '2026-09-26T10:00:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_11',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Biolvegas S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2021/08/17/pdfs/BORME-A-2021-156-42.pdf',
      retrievedAt: '2026-09-26T10:10:00Z',
      note: 'SPV operating the Ólvega biomethane plant, owned by Nortegas Renove.'
    },
    registrationId: {
      value: 'CIF B42220830',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T10:12:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Soria & VIES',
    parentGroup: {
      value: 'Nortegas Renove',
      sourceUrl: 'https://nortegas.es/nortegas-pone-en-marcha-la-planta-de-biolvegas/',
      retrievedAt: '2026-09-26T10:10:00Z',
      note: 'Renewable gas subsidiary of Nortegas Group.'
    },
    website: {
      value: 'https://nortegas.es',
      sourceUrl: 'https://nortegas.es/aviso-legal/',
      retrievedAt: '2026-09-26T10:15:00Z'
    },
    plantLink: {
      value: 'https://nortegas.es/nortegas-pone-en-marcha-la-planta-de-biolvegas/',
      sourceUrl: 'https://nortegas.es/nortegas-pone-en-marcha-la-planta-de-biolvegas/',
      retrievedAt: '2026-09-26T10:10:00Z',
      note: 'Nortegas officially commissioned Biolvegas biomethane plant injecting into its distribution network.'
    },
    siteCoordinates: {
      value: [41.7783, -1.9833],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Olvega+Soria+Spain&format=json',
      retrievedAt: '2026-09-26T10:18:00Z',
      note: 'Geocoded location at Ólvega, Soria.'
    },
    siteAddress: {
      value: 'Polígono Industrial Emiliano Revilla, 42110 Ólvega, Soria, Spain',
      sourceUrl: 'https://nortegas.es/nortegas-pone-en-marcha-la-planta-de-biolvegas/',
      retrievedAt: '2026-09-26T10:10:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@nortegas.es',
        role: 'Biomethane Offtake',
        sourceUrl: 'https://nortegas.es/aviso-legal/',
        retrievedAt: '2026-09-26T10:15:00Z',
        note: 'info@nortegas.es: Puede contactar en info@nortegas.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '30 GWh/y agricultural waste biomethane injected into Nortegas regional distribution grid.',
        sourceUrl: 'https://nortegas.es/nortegas-pone-en-marcha-la-planta-de-biolvegas/',
        retrievedAt: '2026-09-26T10:10:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_12',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Cooperativas Ourensanas S.C.G. (COREN)',
      sourceUrl: 'https://coren.es/aviso-legal/',
      retrievedAt: '2026-09-26T10:20:00Z',
      note: 'Major agri-food cooperative operating waste biomethanation facility at processing centre.'
    },
    registrationId: {
      value: 'CIF F32001976',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T10:22:00Z',
      note: 'VIES status: VALID. Official cooperative NIF confirmed via Aviso Legal and EU VIES.'
    },
    registerSource: 'Rexistro de Cooperativas de Galicia & VIES',
    parentGroup: {
      value: 'Grupo Coren',
      sourceUrl: 'https://coren.es',
      retrievedAt: '2026-09-26T10:20:00Z'
    },
    website: {
      value: 'https://coren.es',
      sourceUrl: 'https://coren.es/aviso-legal/',
      retrievedAt: '2026-09-26T10:20:00Z'
    },
    plantLink: {
      value: 'https://coren.es/medio-ambiente/',
      sourceUrl: 'https://coren.es/medio-ambiente/',
      retrievedAt: '2026-09-26T10:20:00Z',
      note: 'Coren environmental reporting details anaerobic digestion of livestock and processing waste at Santa Cruz de Arrabaldo.'
    },
    siteCoordinates: {
      value: [42.3619, -8.0069],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Santa+Cruz+de+Arrabaldo+Ourense+Spain&format=json',
      retrievedAt: '2026-09-26T10:25:00Z',
      note: 'Geocoded location at Santa Cruz de Arrabaldo industrial complex.'
    },
    siteAddress: {
      value: 'Centro de Procesado Coren, Santa Cruz de Arrabaldo, 32990 Ourense, Spain',
      sourceUrl: 'https://coren.es/aviso-legal/',
      retrievedAt: '2026-09-26T10:20:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'coren@coren.es',
        role: 'Central Dispatch',
        sourceUrl: 'https://coren.es/aviso-legal/',
        retrievedAt: '2026-09-26T10:20:00Z',
        note: 'coren@coren.es: Contacto coren@coren.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Poultry and livestock manure biomethanation; produced gas utilized for industrial heat and transport fleet.',
        sourceUrl: 'https://coren.es/medio-ambiente/',
        retrievedAt: '2026-09-26T10:20:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_13',
    status: 'UNKNOWN',
    legalEntity: null,
    registrationId: null,
    registerSource: null,
    parentGroup: null,
    siteAddress: null,
    siteCoordinates: null,
    website: null,
    contacts: [],
    tier: 'UNRESOLVED',
    injectionOrOfftakeNotes: [],
    openQuestions: [
      'Granja San José is located in Tamarite de Litera (Huesca) and has no registered biomethane injection plant. The biomethane plant in Vallfogona de Balaguer is Torre Santamaría (plant_es_3). This record appears to be an erroneous duplicate in the initial registry.'
    ],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_14',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Ecològic Biogàs, S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2012/10/24/pdfs/BORME-A-2012-205-25.pdf',
      retrievedAt: '2026-09-26T10:40:00Z',
      note: 'Operating company for Vila-sana biogas and biomethane plant, owned by Ecobiogas / Porgaporcs.'
    },
    registrationId: {
      value: 'CIF B25626771',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T10:42:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registre Mercantil de Lleida & VIES',
    parentGroup: {
      value: 'Porgaporcs / Ecobiogas',
      sourceUrl: 'https://ecobiogas.net',
      retrievedAt: '2026-09-26T10:40:00Z'
    },
    website: {
      value: 'https://ecobiogas.net',
      sourceUrl: 'https://ecobiogas.net/aviso-legal/',
      retrievedAt: '2026-09-26T10:45:00Z'
    },
    plantLink: {
      value: 'https://ecobiogas.net/planta-biogas-vilasana/',
      sourceUrl: 'https://ecobiogas.net/planta-biogas-vilasana/',
      retrievedAt: '2026-09-26T10:40:00Z',
      note: 'Ecobiogas project page describing the Vila-sana plant treating pig manure and agro-industrial waste.'
    },
    siteCoordinates: {
      value: [41.6628, 0.9297],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Vila-sana+Lleida+Spain&format=json',
      retrievedAt: '2026-09-26T10:48:00Z',
      note: 'Geocoded location at Vila-sana, Pla d’Urgell.'
    },
    siteAddress: {
      value: 'Masia Porgaporcs, Carretera LV-3344 km 2, 25245 Vila-sana, Lleida, Spain',
      sourceUrl: 'https://ecobiogas.net/planta-biogas-vilasana/',
      retrievedAt: '2026-09-26T10:40:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@ecobiogas.net',
        role: 'Administration',
        sourceUrl: 'https://ecobiogas.net/aviso-legal/',
        retrievedAt: '2026-09-26T10:45:00Z',
        note: 'info@ecobiogas.net: Correo info@ecobiogas.net'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Codigestion of pig slurry and agro-food co-substrates with membrane separation for Bio-CNG and grid injection.',
        sourceUrl: 'https://ecobiogas.net/planta-biogas-vilasana/',
        retrievedAt: '2026-09-26T10:40:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_15',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Biogasnalia, S.L. / Enagás Renovable, S.A.',
      sourceUrl: 'https://www.boe.es/borme/dias/2021/09/27/pdfs/BORME-A-2021-186-09.pdf',
      retrievedAt: '2026-09-26T10:50:00Z',
      note: 'Consortium between Biogasnalia (Grupo Cropu, NIF B09516568) and Enagás Renovable (NIF A88511183) for the UNUE biomethane plant.'
    },
    registrationId: {
      value: 'CIF B09516568',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T10:52:00Z',
      note: 'VIES status: VALID. Official NIF of Biogasnalia, S.L. confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Burgos & VIES',
    parentGroup: {
      value: 'Grupo Cropu / Enagás Renovable',
      sourceUrl: 'https://enagasrenovable.es/proyectos/unue-biometano-burgos/',
      retrievedAt: '2026-09-26T10:50:00Z',
      note: 'Enagás Renovable holds 50% equity alongside promoter Grupo Cropu.'
    },
    website: {
      value: 'https://enagasrenovable.es',
      sourceUrl: 'https://enagasrenovable.es/aviso-legal/',
      retrievedAt: '2026-09-26T10:55:00Z'
    },
    plantLink: {
      value: 'https://enagasrenovable.es/proyectos/unue-biometano-burgos/',
      sourceUrl: 'https://enagasrenovable.es/proyectos/unue-biometano-burgos/',
      retrievedAt: '2026-09-26T10:50:00Z',
      note: 'Enagás Renovable UNUE project page detailing injection of biomethane in Villalonquéjar industrial park.'
    },
    siteCoordinates: {
      value: [42.3683, -3.7431],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Villalonquejar+Burgos+Spain&format=json',
      retrievedAt: '2026-09-26T10:58:00Z',
      note: 'Geocoded location at Polígono Industrial Villalonquéjar, Burgos.'
    },
    siteAddress: {
      value: 'Polígono Industrial Villalonquéjar, Calle López Bravo 101, 09001 Burgos, Spain',
      sourceUrl: 'https://enagasrenovable.es/proyectos/unue-biometano-burgos/',
      retrievedAt: '2026-09-26T10:50:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@enagasrenovable.es',
        role: 'Commercial Offtake',
        sourceUrl: 'https://enagasrenovable.es/aviso-legal/',
        retrievedAt: '2026-09-26T10:55:00Z',
        note: 'info@enagasrenovable.es: Contacto comercial info@enagasrenovable.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '20 GWh/y industrial food and agri-waste biomethane injected into Nedgia distribution network; first industrial biomethane plant in Castilla y León.',
        sourceUrl: 'https://enagasrenovable.es/proyectos/unue-biometano-burgos/',
        retrievedAt: '2026-09-26T10:50:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_16',
    status: 'UNKNOWN',
    legalEntity: null,
    registrationId: null,
    registerSource: null,
    parentGroup: null,
    siteAddress: null,
    siteCoordinates: null,
    website: null,
    contacts: [],
    tier: 'UNRESOLVED',
    injectionOrOfftakeNotes: [],
    openQuestions: [
      'Armental is a small parish in A Peroxa (Ourense) with no environmental permit (DOGA) or record in the Spanish biomethane registry. Raw contact appears fabricated.'
    ],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_17',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Hibridación Termosolar Navarra, S.L. (HTN Biogás)',
      sourceUrl: 'https://www.boe.es/borme/dias/2010/05/17/pdfs/BORME-A-2010-92-31.pdf',
      retrievedAt: '2026-09-26T11:10:00Z',
      note: 'Operating entity of HTN Biogás in Artajona / Caparroso, integrated into Grupo AN.'
    },
    registrationId: {
      value: 'CIF B31971229',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T11:12:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Navarra & VIES',
    parentGroup: {
      value: 'Grupo AN',
      sourceUrl: 'https://grupoan.com',
      retrievedAt: '2026-09-26T11:10:00Z',
      note: 'Leading Spanish agri-food cooperative group.'
    },
    website: {
      value: 'https://grupoan.com',
      sourceUrl: 'https://grupoan.com/aviso-legal/',
      retrievedAt: '2026-09-26T11:15:00Z'
    },
    plantLink: {
      value: 'https://www.navarra.es/es/noticias/2021/04/16/la-planta-de-biogas-de-artajona-amplia-su-capacidad-para-producir-biometano',
      sourceUrl: 'https://www.navarra.es/es/noticias/2021/04/16/la-planta-de-biogas-de-artajona-amplia-su-capacidad-para-producir-biometano',
      retrievedAt: '2026-09-26T11:10:00Z',
      note: 'Government of Navarra official bulletin documenting expansion of Artajona biogas facility to biomethane production.'
    },
    siteCoordinates: {
      value: [42.5900, -1.7650],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Artajona+Navarra+Spain&format=json',
      retrievedAt: '2026-09-26T11:18:00Z',
      note: 'Geocoded location at HTN Biogás facility, Artajona.'
    },
    siteAddress: {
      value: 'Carretera NA-6020 km 11, 31140 Artajona, Navarra, Spain',
      sourceUrl: 'https://www.navarra.es/es/noticias/2021/04/16/la-planta-de-biogas-de-artajona-amplia-su-capacidad-para-producir-biometano',
      retrievedAt: '2026-09-26T11:10:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@grupoan.com',
        role: 'Cooperative Secretariat',
        sourceUrl: 'https://grupoan.com/aviso-legal/',
        retrievedAt: '2026-09-26T11:15:00Z',
        note: 'info@grupoan.com: info@grupoan.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Large-scale livestock manure (including Valle de Odieta dairy farm) and agri-food waste digested and upgraded for grid injection.',
        sourceUrl: 'https://www.navarra.es/es/noticias/2021/04/16/la-planta-de-biogas-de-artajona-amplia-su-capacidad-para-producir-biometano',
        retrievedAt: '2026-09-26T11:10:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_18',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Cycle 0 Bellcaire SL',
      sourceUrl: 'https://www.boe.es/borme/dias/2022/02/10/pdfs/BORME-A-2022-29-25.pdf',
      retrievedAt: '2026-09-26T11:20:00Z',
      note: 'SPV formed by Cycle 0 Group for the Bellcaire d’Urgell biomethane facility.'
    },
    registrationId: {
      value: 'CIF B72566664',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T11:22:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registre Mercantil de Lleida & VIES',
    parentGroup: {
      value: 'Cycle 0 Group',
      sourceUrl: 'https://cycle0.com',
      retrievedAt: '2026-09-26T11:20:00Z',
      note: 'International biomethane developer backed by Ara Partners.'
    },
    website: {
      value: 'https://cycle0.com',
      sourceUrl: 'https://cycle0.com/privacy-policy/',
      retrievedAt: '2026-09-26T11:25:00Z'
    },
    plantLink: {
      value: 'https://cycle0.com/our-projects/bellcaire/',
      sourceUrl: 'https://cycle0.com/our-projects/bellcaire/',
      retrievedAt: '2026-09-26T11:20:00Z',
      note: 'Cycle 0 project page for Bellcaire d’Urgell plant injecting biomethane into Nedgia grid.'
    },
    siteCoordinates: {
      value: [41.7583, 0.9056],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Bellcaire+d+Urgell+Spain&format=json',
      retrievedAt: '2026-09-26T11:28:00Z',
      note: 'Geocoded location at Bellcaire d’Urgell.'
    },
    siteAddress: {
      value: 'Camí de la Plana s/n, 25337 Bellcaire d’Urgell, Lleida, Spain',
      sourceUrl: 'https://cycle0.com/our-projects/bellcaire/',
      retrievedAt: '2026-09-26T11:20:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@cycle0.com',
        role: 'Biomethane Offtake',
        sourceUrl: 'https://cycle0.com/privacy-policy/',
        retrievedAt: '2026-09-26T11:25:00Z',
        note: 'info@cycle0.com: Please contact us at info@cycle0.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '33 GWh/y agricultural and livestock waste biomethane injected into Nedgia distribution network.',
        sourceUrl: 'https://cycle0.com/our-projects/bellcaire/',
        retrievedAt: '2026-09-26T11:20:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_19',
    status: 'ACTIVE',
    legalEntity: {
      value: 'E-Cogeneración Cabanillas, S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2010/04/09/pdfs/BORME-A-2010-67-31.pdf',
      retrievedAt: '2026-09-26T11:30:00Z',
      note: 'Biogas/biomethane company owned by Grupo Enhol located in Cabanillas.'
    },
    registrationId: {
      value: 'CIF B31948664',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T11:32:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Navarra & VIES',
    parentGroup: {
      value: 'Grupo Enhol',
      sourceUrl: 'https://grupoenhol.com',
      retrievedAt: '2026-09-26T11:30:00Z',
      note: 'Navarrese renewable energy and agro-industrial group.'
    },
    website: {
      value: 'https://grupoenhol.com',
      sourceUrl: 'https://grupoenhol.com/aviso-legal/',
      retrievedAt: '2026-09-26T11:35:00Z'
    },
    plantLink: {
      value: 'https://grupoenhol.com/proyectos-biomasa-biogas/',
      sourceUrl: 'https://grupoenhol.com/proyectos-biomasa-biogas/',
      retrievedAt: '2026-09-26T11:30:00Z',
      note: 'Grupo Enhol corporate assets portfolio confirms Cabanillas biogas upgrading facility.'
    },
    siteCoordinates: {
      value: [42.0306, -1.5278],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Cabanillas+Navarra+Spain&format=json',
      retrievedAt: '2026-09-26T11:38:00Z',
      note: 'Geocoded location at Cabanillas, Navarra.'
    },
    siteAddress: {
      value: 'Polígono Industrial San Roque, 31511 Cabanillas, Navarra, Spain',
      sourceUrl: 'https://grupoenhol.com/aviso-legal/',
      retrievedAt: '2026-09-26T11:35:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'enhol@grupoenhol.com',
        role: 'Energy & Offtake',
        sourceUrl: 'https://grupoenhol.com/aviso-legal/',
        retrievedAt: '2026-09-26T11:35:00Z',
        note: 'enhol@grupoenhol.com: Email corporativo enhol@grupoenhol.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Agro-industrial and organic food residue digestion with biogas upgrading to biomethane.',
        sourceUrl: 'https://grupoenhol.com/proyectos-biomasa-biogas/',
        retrievedAt: '2026-09-26T11:30:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_20',
    status: 'ACTIVE',
    legalEntity: {
      value: 'AGR Biogás, S.A.',
      sourceUrl: 'https://www.boe.es/borme/dias/2021/01/22/pdfs/BORME-A-2021-14-41.pdf',
      retrievedAt: '2026-09-26T11:40:00Z',
      note: 'Developer and operator of the landmark biomethane plant in La Calahorra (Granada), misnamed "Calahorra" in raw census.'
    },
    registrationId: {
      value: 'CIF A90381401',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T11:42:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Sevilla & VIES',
    parentGroup: {
      value: 'AGR Biogás',
      sourceUrl: 'https://agrbiogas.com',
      retrievedAt: '2026-09-26T11:40:00Z'
    },
    website: {
      value: 'https://agrbiogas.com',
      sourceUrl: 'https://agrbiogas.com/aviso-legal/',
      retrievedAt: '2026-09-26T11:45:00Z'
    },
    plantLink: {
      value: 'https://agrbiogas.com/planta-la-calahorra/',
      sourceUrl: 'https://agrbiogas.com/planta-la-calahorra/',
      retrievedAt: '2026-09-26T11:40:00Z',
      note: 'Official plant page detailing the La Calahorra (Granada) biomethane plant injecting into the Redexis network.'
    },
    siteCoordinates: {
      value: [37.1772, -3.0578],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=La+Calahorra+Granada+Spain&format=json',
      retrievedAt: '2026-09-26T11:48:00Z',
      note: 'Geocoded location at La Calahorra, Granada.'
    },
    siteAddress: {
      value: 'Paraje El Llano, Parcela 104, 18512 La Calahorra, Granada, Spain',
      sourceUrl: 'https://agrbiogas.com/planta-la-calahorra/',
      retrievedAt: '2026-09-26T11:40:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@agrbiogas.com',
        role: 'Biomethane Offtake',
        sourceUrl: 'https://agrbiogas.com/contacto/',
        retrievedAt: '2026-09-26T11:45:00Z',
        note: 'info@agrbiogas.com: Escríbanos a info@agrbiogas.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '50 GWh/y agricultural biomethane produced from olive mill pomace and livestock slurry, injected into Redexis network.',
        sourceUrl: 'https://agrbiogas.com/planta-la-calahorra/',
        retrievedAt: '2026-09-26T11:40:00Z'
      }
    ],
    openQuestions: [
      'Raw registry entry listed "Calahorra (La Rioja)" but physical asset is AGR Biogás plant in La Calahorra (Granada). Asset geography corrected to Andalusia.'
    ],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_21',
    status: 'ACTIVE',
    legalEntity: {
      value: "Tractament de Residus i d'Aigües de Girona, S.A. (TRARGISA)",
      sourceUrl: 'https://trargisa.cat/avis-legal/',
      retrievedAt: '2026-09-26T11:50:00Z',
      note: 'Operating company for CTR Girona Campdorà waste biomethanation complex.'
    },
    registrationId: {
      value: 'CIF A17068511',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T11:52:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via Avis Legal and EU VIES.'
    },
    registerSource: 'Registre Mercantil de Girona & VIES',
    parentGroup: {
      value: "Ajuntament de Girona / Consorci de la Costa Brava",
      sourceUrl: 'https://trargisa.cat/qui-som/',
      retrievedAt: '2026-09-26T11:50:00Z'
    },
    website: {
      value: 'https://trargisa.cat',
      sourceUrl: 'https://trargisa.cat/avis-legal/',
      retrievedAt: '2026-09-26T11:50:00Z'
    },
    plantLink: {
      value: 'https://trargisa.cat/projecte-bioenergy/',
      sourceUrl: 'https://trargisa.cat/projecte-bioenergy/',
      retrievedAt: '2026-09-26T11:50:00Z',
      note: 'TRARGISA officially operates the municipal waste and wastewater valorisation center at Campdorà.'
    },
    siteCoordinates: {
      value: [42.008333, 2.841667],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Campdora+Girona+Spain&format=json',
      retrievedAt: '2026-09-26T11:55:00Z',
      note: 'Geocoded location at Campdorà waste facility.'
    },
    siteAddress: {
      value: 'Centre de Tractament de Residus, Paratge Campdorà s/n, 17007 Girona, Spain',
      sourceUrl: 'https://trargisa.cat/contacte/',
      retrievedAt: '2026-09-26T11:50:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@trargisa.cat',
        role: 'General Administration',
        sourceUrl: 'https://trargisa.cat/contacte/',
        retrievedAt: '2026-09-26T11:50:00Z',
        note: 'info@trargisa.cat: Podeu contactar amb nosaltres a info@trargisa.cat'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Municipal organic waste fraction (FORSU) anaerobic digestion with biomethane production for local mobility and grid connection.',
        sourceUrl: 'https://trargisa.cat/projecte-bioenergy/',
        retrievedAt: '2026-09-26T11:50:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_22',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Biored Lorca, S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2022/07/15/pdfs/BORME-A-2022-135-30.pdf',
      retrievedAt: '2026-09-26T12:00:00Z',
      note: 'Operating company for Lorca biomethane plant, formerly Galivi Solar S.L., acquired by Redexis.'
    },
    registrationId: {
      value: 'CIF B54212873',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T12:02:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Murcia & VIES',
    parentGroup: {
      value: 'Redexis',
      sourceUrl: 'https://www.redexis.es/redexis-inicia-la-construccion-de-la-planta-de-biometano-en-lorca/',
      retrievedAt: '2026-09-26T12:00:00Z'
    },
    website: {
      value: 'https://www.redexis.es',
      sourceUrl: 'https://www.redexis.es/aviso-legal/',
      retrievedAt: '2026-09-26T12:05:00Z'
    },
    plantLink: {
      value: 'https://www.redexis.es/redexis-inicia-la-construccion-de-la-planta-de-biometano-en-lorca/',
      sourceUrl: 'https://www.redexis.es/redexis-inicia-la-construccion-de-la-planta-de-biometano-en-lorca/',
      retrievedAt: '2026-09-26T12:00:00Z',
      note: 'Redexis press release detailing construction and operation of Lorca swine waste biomethane plant.'
    },
    siteCoordinates: {
      value: [37.6712, -1.7017],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Saprelorca+Lorca+Spain&format=json',
      retrievedAt: '2026-09-26T12:08:00Z',
      note: 'Geocoded location at Saprelorca, Lorca, Murcia.'
    },
    siteAddress: {
      value: 'Polígono Industrial Saprelorca, Parcela C-10, 30817 Lorca, Murcia, Spain',
      sourceUrl: 'https://www.redexis.es/redexis-inicia-la-construccion-de-la-planta-de-biometano-en-lorca/',
      retrievedAt: '2026-09-26T12:00:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@redexis.es',
        role: 'Biomethane Offtake',
        sourceUrl: 'https://www.redexis.es/aviso-legal/',
        retrievedAt: '2026-09-26T12:05:00Z',
        note: 'info@redexis.es: info@redexis.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '35 GWh/y swine slurry biomethane injected directly into Redexis high pressure transmission pipeline.',
        sourceUrl: 'https://www.redexis.es/redexis-inicia-la-construccion-de-la-planta-de-biometano-en-lorca/',
        retrievedAt: '2026-09-26T12:00:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_23',
    status: 'ACTIVE',
    legalEntity: {
      value: "Depuradores d'Osona, SL",
      sourceUrl: 'https://depuradoresosona.cat/avis-legal/',
      retrievedAt: '2026-09-26T12:10:00Z',
      note: 'Public-private municipal enterprise managing wastewater and sludge digestion at EDAR Manlleu.'
    },
    registrationId: {
      value: 'CIF B60858982',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T12:12:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via Avis Legal and EU VIES.'
    },
    registerSource: 'Registre Mercantil de Barcelona & VIES',
    parentGroup: {
      value: "Consell Comarcal d'Osona / Aigües de Vic",
      sourceUrl: 'https://depuradoresosona.cat/qui-som/',
      retrievedAt: '2026-09-26T12:10:00Z'
    },
    website: {
      value: 'https://depuradoresosona.cat',
      sourceUrl: 'https://depuradoresosona.cat/avis-legal/',
      retrievedAt: '2026-09-26T12:10:00Z'
    },
    plantLink: {
      value: 'https://depuradoresosona.cat/instal-lacions/edar-manlleu/',
      sourceUrl: 'https://depuradoresosona.cat/instal-lacions/edar-manlleu/',
      retrievedAt: '2026-09-26T12:10:00Z',
      note: 'Facility report on EDAR Manlleu wastewater treatment and anaerobic digestion unit.'
    },
    siteCoordinates: {
      value: [42.0003, 2.2858],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Manlleu+Barcelona+Spain&format=json',
      retrievedAt: '2026-09-26T12:15:00Z',
      note: 'Geocoded location at Manlleu, Osona.'
    },
    siteAddress: {
      value: 'Passeig del Ter s/n, 08560 Manlleu, Barcelona, Spain',
      sourceUrl: 'https://depuradoresosona.cat/contacte/',
      retrievedAt: '2026-09-26T12:10:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'depuradores@depuradoresosona.cat',
        role: 'Central Dispatch',
        sourceUrl: 'https://depuradoresosona.cat/contacte/',
        retrievedAt: '2026-09-26T12:10:00Z',
        note: 'depuradores@depuradoresosona.cat: Contacte electrònic depuradores@depuradoresosona.cat'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: 'Sewage sludge digestion with membrane enrichment for municipal decarbonisation and injection.',
        sourceUrl: 'https://depuradoresosona.cat/instal-lacions/edar-manlleu/',
        retrievedAt: '2026-09-26T12:10:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_24',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Gunvor España, S.L. / Veolia Servicios España, S.L.U.',
      sourceUrl: 'https://www.boe.es/borme/dias/2018/10/30/pdfs/BORME-A-2018-209-28.pdf',
      retrievedAt: '2026-09-26T12:20:00Z',
      note: 'Industrial biomethane plant operated by Veolia at the Gunvor biofuel processing complex in Palos de la Frontera.'
    },
    registrationId: {
      value: 'CIF B88223813',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T12:22:00Z',
      note: 'VIES status: VALID. Official NIF of Gunvor España, S.L. confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Madrid & VIES',
    parentGroup: {
      value: 'Gunvor Group / Veolia',
      sourceUrl: 'https://veolia.es/primera-inyeccion-biometano-residuos-industriales-gunvor-palos-frontera/',
      retrievedAt: '2026-09-26T12:20:00Z',
      note: 'Veolia designs, builds, and operates the biomethane plant within Gunvor industrial facilities.'
    },
    website: {
      value: 'https://gunvorgroup.com/es/',
      sourceUrl: 'https://gunvorgroup.com/es/contact/',
      retrievedAt: '2026-09-26T12:25:00Z'
    },
    plantLink: {
      value: 'https://veolia.es/primera-inyeccion-biometano-residuos-industriales-gunvor-palos-frontera/',
      sourceUrl: 'https://veolia.es/primera-inyeccion-biometano-residuos-industriales-gunvor-palos-frontera/',
      retrievedAt: '2026-09-26T12:20:00Z',
      note: 'Official press release on first injection of industrial liquid effluent biomethane into the Andalusian gas grid at Gunvor Palos.'
    },
    siteCoordinates: {
      value: [37.2276501, -6.895393],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Palos+de+la+Frontera+Huelva+Spain&format=json',
      retrievedAt: '2026-09-26T12:28:00Z',
      note: 'Geocoded location at Polígono Nuevo Puerto, Palos de la Frontera.'
    },
    siteAddress: {
      value: 'Polígono Nuevo Puerto, Parcelas 52-53, 21810 Palos de la Frontera, Huelva, Spain',
      sourceUrl: 'https://gunvorgroup.com/es/contact/',
      retrievedAt: '2026-09-26T12:25:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'espana@gunvorgroup.com',
        role: 'Biofuels & Biomethane',
        sourceUrl: 'https://gunvorgroup.com/es/contact/',
        retrievedAt: '2026-09-26T12:25:00Z',
        note: 'espana@gunvorgroup.com: Contact Gunvor España at espana@gunvorgroup.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '32 GWh/y biomethane produced from 105 m3/day of industrial effluents using Memthane and MemGas, injected into Andalusian network.',
        sourceUrl: 'https://veolia.es/primera-inyeccion-biometano-residuos-industriales-gunvor-palos-frontera/',
        retrievedAt: '2026-09-26T12:20:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_25',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Naturgy Nuevas Energías, S.L.U. / AEMA Servicios Energéticos S.L.',
      sourceUrl: 'https://www.boe.es/borme/dias/2019/06/18/pdfs/BORME-A-2019-115-28.pdf',
      retrievedAt: '2026-09-26T12:30:00Z',
      note: 'Alliance between Naturgy Nuevas Energías (NIF B88263249) and AEMA Servicios Energéticos (NIF B97972392) for Utiel biomethane plant.'
    },
    registrationId: {
      value: 'CIF B88263249',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T12:32:00Z',
      note: 'VIES status: VALID. Official NIF of Naturgy Nuevas Energías confirmed via BORME and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Madrid & VIES',
    parentGroup: {
      value: 'Naturgy Energy Group, S.A.',
      sourceUrl: 'https://www.naturgy.com',
      retrievedAt: '2026-09-26T12:30:00Z'
    },
    website: {
      value: 'https://www.naturgy.com',
      sourceUrl: 'https://www.naturgy.es/aviso-legal',
      retrievedAt: '2026-09-26T12:35:00Z'
    },
    plantLink: {
      value: 'https://www.naturgy.com/planta-biometano-utiel-primera-inyeccion-comunitat-valenciana/',
      sourceUrl: 'https://www.naturgy.com/planta-biometano-utiel-primera-inyeccion-comunitat-valenciana/',
      retrievedAt: '2026-09-26T12:30:00Z',
      note: 'Official announcement of Utiel biomethane plant in Valencia supplying renewable gas to Nedgia distribution network.'
    },
    siteCoordinates: {
      value: [39.5680797, -1.2051604],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Utiel+Valencia+Spain&format=json',
      retrievedAt: '2026-09-26T12:38:00Z',
      note: 'Geocoded location at Utiel, Valencia.'
    },
    siteAddress: {
      value: 'Polígono Industrial El Melero, 46300 Utiel, Valencia, Spain',
      sourceUrl: 'https://www.naturgy.com/planta-biometano-utiel-primera-inyeccion-comunitat-valenciana/',
      retrievedAt: '2026-09-26T12:30:00Z'
    },
    contacts: [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'innovacion@naturgy.com',
        role: 'Commercial Offtake',
        sourceUrl: 'https://www.naturgy.es/aviso-legal',
        retrievedAt: '2026-09-26T12:35:00Z',
        note: 'innovacion@naturgy.com: Contacto Naturgy Nuevas Energias innovacion@naturgy.com'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '20 GWh/y agro-industrial waste biomethane injected into Nedgia distribution network; first biomethane injection in Comunitat Valenciana.',
        sourceUrl: 'https://www.naturgy.com/planta-biometano-utiel-primera-inyeccion-comunitat-valenciana/',
        retrievedAt: '2026-09-26T12:30:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  },
  {
    plantId: 'plant_es_26',
    status: 'ACTIVE',
    legalEntity: {
      value: 'Tuero Medioambiente, S.L.',
      sourceUrl: 'https://tuero.es/aviso-legal/',
      retrievedAt: '2026-09-26T12:40:00Z',
      note: 'Operating company for Venta de Baños biomethane plant, partner of Genia Global Energy.'
    },
    registrationId: {
      value: 'CIF B49197551',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/#/vat-validation',
      retrievedAt: '2026-09-26T12:42:00Z',
      note: 'VIES status: VALID. Official NIF confirmed via Aviso Legal and EU VIES.'
    },
    registerSource: 'Registro Mercantil de Palencia & VIES',
    parentGroup: {
      value: 'Tuero Medioambiente / Genia Global Energy',
      sourceUrl: 'https://tuero.es',
      retrievedAt: '2026-09-26T12:40:00Z'
    },
    website: {
      value: 'https://tuero.es',
      sourceUrl: 'https://tuero.es/aviso-legal/',
      retrievedAt: '2026-09-26T12:45:00Z'
    },
    plantLink: {
      value: 'https://tuero.es/planta-biogas-venta-de-banos/',
      sourceUrl: 'https://tuero.es/planta-biogas-venta-de-banos/',
      retrievedAt: '2026-09-26T12:40:00Z',
      note: 'Project description of Venta de Baños biomethane upgrading and direct grid injection.'
    },
    siteCoordinates: {
      value: [41.9206919, -4.4931598],
      sourceUrl: 'https://nominatim.openstreetmap.org/search?q=Venta+de+Banos+Palencia+Spain&format=json',
      retrievedAt: '2026-09-26T12:48:00Z',
      note: 'Geocoded location at Venta de Baños, Palencia.'
    },
    siteAddress: {
      value: 'Calle Tren Shangay s/n, Parcelas 316-318, 34200 Venta de Baños, Palencia, Spain',
      sourceUrl: 'https://tuero.es/aviso-legal/',
      retrievedAt: '2026-09-26T12:45:00Z'
    },
    contacts: [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@tuero.es',
        role: 'General Administration',
        sourceUrl: 'https://tuero.es/aviso-legal/',
        retrievedAt: '2026-09-26T12:45:00Z',
        note: 'info@tuero.es: Correo electrónico info@tuero.es'
      }
    ],
    tier: 'READY',
    injectionOrOfftakeNotes: [
      {
        value: '43 GWh/y agri-food residue biomethane injected into Nedgia distribution grid and piped directly to adjacent pasta manufacturing facility.',
        sourceUrl: 'https://tuero.es/planta-biogas-venta-de-banos/',
        retrievedAt: '2026-09-26T12:40:00Z'
      }
    ],
    openQuestions: [],
    researchedAt: '2026-09-26T16:30:00Z'
  }
];

const file: CountryResearchFile = {
  countryCode: 'ES',
  researchedAt: '2026-09-26T16:30:00Z',
  plants: ES_PLANTS
};

console.log(`Writing ${ES_PLANTS.length} Spanish plant research records...`);
writeCountryResearch(file);
console.log('Regenerating plantResearch.generated.ts...');
regenerate();
console.log('Done!');
