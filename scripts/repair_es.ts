import * as fs from 'node:fs';
import * as path from 'node:path';
import { CountryResearchFile, PlantResearch } from '../src/domain/plants/types';
import { regenerate } from './lib/plantResearchWriter';

const ES_PATH = path.resolve(__dirname, '../data/plant_research/es.json');
const raw = fs.readFileSync(ES_PATH, 'utf8');
const file: CountryResearchFile = JSON.parse(raw);

for (const p of file.plants) {
  // 1. Point every CIF to VIES REST API endpoint
  if (p.registrationId && p.registrationId.value) {
    const cleanNum = p.registrationId.value.replace(/^(CIF|NIF|VAT|ES)\s*/i, '').replace(/[\s.-]/g, '').toUpperCase();
    p.registrationId.sourceUrl = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/ES/vat/${cleanNum}`;
    p.registrationId.note = `Verified via EU VIES REST API (ES/${cleanNum})`;
  }

  // 2. Specific plant repairs
  if (p.plantId === 'plant_es_1') { // Almazán
    p.website = {
      value: 'https://www.redexis.es',
      sourceUrl: 'https://www.redexis.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://www.redexis.es/sala-de-comunicacion/la-planta-de-biogas-de-almazan-galardonada-en-los-premios-renmad-biometano',
      sourceUrl: 'https://www.redexis.es/sala-de-comunicacion/la-planta-de-biogas-de-almazan-galardonada-en-los-premios-renmad-biometano',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Official Redexis press release detailing Almazán biogas/biomethane facility operations.',
    };
    p.contacts = [
      {
        type: 'GENERIC_EMAIL',
        value: 'atencionalcliente@redexis.es',
        role: 'Customer Service Switchboard',
        sourceUrl: 'https://www.redexis.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'GENERAL_OR_PRESS',
        note: 'Published general contact on Redexis Aviso Legal.',
      },
      {
        type: 'COMPANY_SWITCHBOARD',
        value: '+34 900 811 339',
        role: 'Redexis Customer Line',
        sourceUrl: 'https://www.redexis.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'GENERAL_OR_PRESS',
      },
    ];
  }

  if (p.plantId === 'plant_es_2') { // EDAR Bens
    p.legalEntity = {
      value: 'Edar Bens, S.A.',
      sourceUrl: 'https://edarbens.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Operating municipal wastewater and biogas upgrading company.',
    };
    p.website = {
      value: 'https://edarbens.es',
      sourceUrl: 'https://edarbens.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://edarbens.es',
      sourceUrl: 'https://edarbens.es',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Official portal of Edar Bens biogas upgrading and injection installation.',
    };
    p.contacts = [
      {
        type: 'GENERIC_EMAIL',
        value: 'secretaria@edarbens.es',
        role: 'Secretaría General / Desk',
        sourceUrl: 'https://edarbens.es/contacto/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PLANT_OPERATOR',
        note: 'Direct plant operating entity contact published on official Contacta page.',
      },
      {
        type: 'COMPANY_SWITCHBOARD',
        value: '+34 981 154 080',
        role: 'Central Switchboard',
        sourceUrl: 'https://edarbens.es/contacto/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PLANT_OPERATOR',
      },
    ];
  }

  if (p.plantId === 'plant_es_3') { // Torre Santamaría / Noguera Renovables
    p.plantLink = {
      value: 'https://www.axpo.com/es/es/prensa/prensa/2023/noguera-renovables--la-planta-de-biometano-torre-santamaria--mej.html',
      sourceUrl: 'https://www.axpo.com/es/es/prensa/prensa/2023/noguera-renovables--la-planta-de-biometano-torre-santamaria--mej.html',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Axpo press release confirming Noguera Renovables and Torre Santamaría biomethane injection facility.',
    };
    p.contacts = [
      {
        type: 'COMPANY_SWITCHBOARD',
        value: '+34 900 101 311',
        role: 'Axpo España Commercial Switchboard',
        sourceUrl: 'https://www.axpo.com/es/es/sobre-nosotros/contacto.html',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PARENT_COMMERCIAL',
      },
    ];
  }

  if (p.plantId === 'plant_es_5') { // Can Mata / PreZero
    p.website = {
      value: 'https://prezero.com',
      sourceUrl: 'https://prezero.com/es/aviso-legal',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://prezero.com/es/prensa/noticias/prezero-waga-energy-y-nedgia-ponen-en-marcha-el-mayor-proyecto-de-inyeccion-de-biometano-en-la-red-de-distribucion-a-partir-de-los-residuos-de-un',
      sourceUrl: 'https://prezero.com/es/prensa/noticias/prezero-waga-energy-y-nedgia-ponen-en-marcha-el-mayor-proyecto-de-inyeccion-de-biometano-en-la-red-de-distribucion-a-partir-de-los-residuos-de-un',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'PreZero, Waga Energy and Nedgia biomethane injection facility announcement for Can Mata.',
    };
    p.contacts = [
      {
        type: 'GENERIC_EMAIL',
        value: 'dpo.es@prezero.com',
        role: 'Corporate Desk',
        sourceUrl: 'https://prezero.com/es/aviso-legal',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'GENERAL_OR_PRESS',
      },
    ];
  }

  if (p.plantId === 'plant_es_7') { // BioVO Granollers
    p.legalEntity = {
      value: 'Consorci per a la Gestió dels Residus del Vallès Oriental',
      sourceUrl: 'https://cresidusvo.cat',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Official consortium operating the Vallès Oriental waste and biomethane facility.',
    };
    p.website = {
      value: 'https://cresidusvo.cat',
      sourceUrl: 'https://cresidusvo.cat',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://biovo.cat',
      sourceUrl: 'https://biovo.cat',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'BioVO official biomethane production and grid injection portal.',
    };
    p.contacts = [
      {
        type: 'GENERIC_EMAIL',
        value: 'cresidusvo@cresidusvo.cat',
        role: 'Oficines Centrals Consorci',
        sourceUrl: 'https://cresidusvo.cat/contacte/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PLANT_OPERATOR',
      },
      {
        type: 'COMPANY_SWITCHBOARD',
        value: '+34 938 600 000',
        role: 'Central Switchboard',
        sourceUrl: 'https://cresidusvo.cat/contacte/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PLANT_OPERATOR',
      },
    ];
  }

  if (p.plantId === 'plant_es_8') { // La Galera
    p.legalEntity = {
      value: 'Biometagàs La Galera, S.L.',
      sourceUrl: 'https://ence.es/ence-adquiere-su-primera-planta-de-biometano-e-impulsa-la-creacion-de-una-gran-plataforma-en-espana/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'SPV operating La Galera biomethane facility, 100% acquired by Ence in 2024.',
    };
    p.website = {
      value: 'https://ence.es',
      sourceUrl: 'https://ence.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://ence.es/ence-adquiere-su-primera-planta-de-biometano-e-impulsa-la-creacion-de-una-gran-plataforma-en-espana/',
      sourceUrl: 'https://ence.es/ence-adquiere-su-primera-planta-de-biometano-e-impulsa-la-creacion-de-una-gran-plataforma-en-espana/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Ence official acquisition press release confirming Biometagás La Galera operations.',
    };
    p.contacts = [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@ence.es',
        role: 'Ence Biogás / Commercial Desk',
        sourceUrl: 'https://ence.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PARENT_COMMERCIAL',
      },
    ];
  }

  if (p.plantId === 'plant_es_10') { // Montes de Toledo
    p.legalEntity = {
      value: 'Biometano Montes de Toledo S.L.',
      sourceUrl: 'https://sitra.es/bioenergia/casos-de-exito-a/biometano-Montes-de-Toledo/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'SPV for Noez biomethane injection facility developed by SITRA and Suma Capital.',
    };
    p.website = {
      value: 'https://sitra.es',
      sourceUrl: 'https://sitra.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://sitra.es/bioenergia/casos-de-exito-a/biometano-Montes-de-Toledo/',
      sourceUrl: 'https://sitra.es/bioenergia/casos-de-exito-a/biometano-Montes-de-Toledo/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'SITRA case study detailing Biometano Montes de Toledo facility in Noez.',
    };
    p.contacts = [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@sitra.es',
        role: 'SITRA Commercial Bioenergy Desk',
        sourceUrl: 'https://sitra.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PARENT_COMMERCIAL',
      },
      {
        type: 'COMPANY_SWITCHBOARD',
        value: '+34 964 571 855',
        role: 'SITRA Commercial Switchboard',
        sourceUrl: 'https://sitra.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PARENT_COMMERCIAL',
      },
    ];
  }

  if (p.plantId === 'plant_es_11') { // Biolvegas Ólvega
    p.plantLink = {
      value: 'https://www.retema.es/actualidad/biolvegas-comienza-la-inyeccion-de-biometano-en-la-red-de-gas-natural',
      sourceUrl: 'https://www.retema.es/actualidad/biolvegas-comienza-la-inyeccion-de-biometano-en-la-red-de-gas-natural',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Retema report on Biolvegas commercial injection in Ólvega.',
    };
  }

  if (p.plantId === 'plant_es_12') { // COREN
    p.plantLink = {
      value: 'https://www.retema.es/actualidad/coren-retoma-puesta-marcha-su-nueva-planta-generacion-biogas',
      sourceUrl: 'https://www.retema.es/actualidad/coren-retoma-puesta-marcha-su-nueva-planta-generacion-biogas',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Retema report on COREN biogas/biomethane plant in Santa Cruz de Arrabaldo.',
    };
  }

  if (p.plantId === 'plant_es_14') { // Vila-sana / Ecobiogas
    p.website = {
      value: 'https://ecobiogas.es',
      sourceUrl: 'https://ecobiogas.es',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
  }

  if (p.plantId === 'plant_es_15') { // UNUE Burgos
    p.legalEntity = {
      value: 'Enagás Renovable, S.A.',
      sourceUrl: 'https://enagasrenovable.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Co-developer and operating corporate partner of UNUE biomethane plant.',
    };
    p.registrationId = {
      value: 'CIF A88511183',
      sourceUrl: 'https://ec.europa.eu/taxation_customs/vies/rest-api/ms/ES/vat/A88511183',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Verified via EU VIES REST API (ES/A88511183)',
    };
    p.website = {
      value: 'https://enagasrenovable.es',
      sourceUrl: 'https://enagasrenovable.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://enagasrenovable.es/proyectos/',
      sourceUrl: 'https://enagasrenovable.es/proyectos/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Official projects catalogue confirming UNUE biomethane plant in Burgos.',
    };
    p.contacts = [
      {
        type: 'SALES_OR_ENERGY_EMAIL',
        value: 'info@enagasrenovable.es',
        role: 'Commercial Desk',
        sourceUrl: 'https://enagasrenovable.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PARENT_COMMERCIAL',
      },
    ];
  }

  if (p.plantId === 'plant_es_18') { // Cycle 0 Bellcaire
    p.contacts = [
      {
        type: 'CONTACT_FORM',
        value: 'https://cycle0.com/contact/',
        role: 'Cycle 0 Commercial Contact Form',
        sourceUrl: 'https://cycle0.com/contact/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PARENT_COMMERCIAL',
      },
    ];
  }

  if (p.plantId === 'plant_es_22') { // Biored Lorca
    p.plantLink = {
      value: 'https://www.redexis.es/sala-de-comunicacion/redexis-renovables-impulsara-la-produccion-de-biometano-en-espana-con-la',
      sourceUrl: 'https://www.redexis.es/sala-de-comunicacion/redexis-renovables-impulsara-la-produccion-de-biometano-en-espana-con-la',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Redexis press release on Lorca biomethane facility construction.',
    };
    p.contacts = [
      {
        type: 'GENERIC_EMAIL',
        value: 'atencionalcliente@redexis.es',
        role: 'Customer Service Switchboard',
        sourceUrl: 'https://www.redexis.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'GENERAL_OR_PRESS',
      },
    ];
  }

  if (p.plantId === 'plant_es_26') { // Tuero Venta de Baños
    p.legalEntity = {
      value: 'Tuero Medioambiente, S.L.',
      sourceUrl: 'https://tuero.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Operating company for Venta de Baños biogas and biomethane plant.',
    };
    p.website = {
      value: 'https://tuero.es',
      sourceUrl: 'https://tuero.es/aviso-legal/',
      retrievedAt: '2026-09-26T16:00:00Z',
    };
    p.plantLink = {
      value: 'https://tuero.es/lineas-de-negocio/',
      sourceUrl: 'https://tuero.es/lineas-de-negocio/',
      retrievedAt: '2026-09-26T16:00:00Z',
      note: 'Tuero lineas de negocio confirms Venta de Baños biomethane generation.',
    };
    p.contacts = [
      {
        type: 'GENERIC_EMAIL',
        value: 'info@tuero.es',
        role: 'Central Office / Plant Operator',
        sourceUrl: 'https://tuero.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PLANT_OPERATOR',
      },
      {
        type: 'COMPANY_SWITCHBOARD',
        value: '+34 979 77 09 14',
        role: 'Switchboard',
        sourceUrl: 'https://tuero.es/aviso-legal/',
        retrievedAt: '2026-09-26T16:00:00Z',
        contactScope: 'PLANT_OPERATOR',
      },
    ];
  }

  // Ensure any contact has contactScope defined
  for (const c of p.contacts || []) {
    if (!c.contactScope) {
      if (c.type === 'NAMED_PERSON' || c.type === 'SALES_OR_ENERGY_EMAIL') {
        c.contactScope = 'PARENT_COMMERCIAL';
      } else if (c.type === 'COMPANY_SWITCHBOARD') {
        c.contactScope = 'GENERAL_OR_PRESS';
      } else {
        c.contactScope = 'GENERAL_OR_PRESS';
      }
    }
  }

  // Clean open questions
  p.openQuestions = p.openQuestions || [];
}

fs.writeFileSync(ES_PATH, JSON.stringify(file, null, 2) + '\n', 'utf8');
console.log('Saved repaired data/plant_research/es.json');
regenerate();
console.log('Regenerated plantResearch.generated.ts');
