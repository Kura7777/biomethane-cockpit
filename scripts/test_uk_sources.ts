import { VerifierEngine } from './verify_research_sources';

async function testUkSources() {
  const engine = new VerifierEngine();
  const testUrls = [
    'https://find-and-update.company-information.service.gov.uk/company/07166164', // Severn Trent Green Power
    'https://www.stgreenpower.co.uk',
    'https://find-and-update.company-information.service.gov.uk/company/06709848', // GENeco
    'https://www.geneco.uk.com',
    'https://find-and-update.company-information.service.gov.uk/company/11132646', // BioCapital
    'https://www.biocapital.co.uk',
    'https://find-and-update.company-information.service.gov.uk/company/06690179', // Future Biogas
    'https://www.futurebiogas.com',
    'https://find-and-update.company-information.service.gov.uk/company/10645062', // Ixora Energy
    'https://www.ixoraenergy.co.uk',
    'https://find-and-update.company-information.service.gov.uk/company/11332857', // BioteCH4
    'https://biotech4.co.uk',
    'https://find-and-update.company-information.service.gov.uk/company/07519967', // Iona Capital
    'https://www.ionacapital.co.uk',
    'https://find-and-update.company-information.service.gov.uk/company/06201389', // EnviTec Biogas UK
    'https://www.envitec-biogas.com',
    'https://www.greengas.org.uk/certificates/producer-information',
  ];

  for (const u of testUrls) {
    const res = await engine.fetchUrl(u);
    console.log(u, '-> Status:', res.status, 'DNS:', !res.dnsFail, 'Blocked:', !!res.blocked, 'Len:', res.bodyText.length);
  }
}

testUkSources();
