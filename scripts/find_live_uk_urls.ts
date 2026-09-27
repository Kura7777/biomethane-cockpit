import { VerifierEngine } from './verify_research_sources';

async function check() {
  const engine = new VerifierEngine();
  const testList = [
    // Future Biogas
    'https://www.futurebiogas.com',
    'https://www.futurebiogas.com/plants',
    'https://www.futurebiogas.com/about-us',
    'https://www.futurebiogas.com/contact',
    // GENeco
    'https://www.geneco.uk.com',
    'https://www.geneco.uk.com/contact-us',
    'https://www.geneco.uk.com/services',
    // Severn Trent Green Power
    'https://www.stgreenpower.co.uk',
    'https://www.stgreenpower.co.uk/contact-us',
    'https://www.stgreenpower.co.uk/facilities',
    // BioteCH4
    'https://biotech4.co.uk',
    'https://biotech4.co.uk/contact',
    'https://biotech4.co.uk/about',
    // Ixora Energy
    'https://www.ixoraenergy.co.uk',
    'https://www.ixoraenergy.co.uk/contact',
    'https://www.ixoraenergy.co.uk/about',
    // Privilege Finance
    'https://www.privilege.finance',
    'https://www.privilege.finance/contact',
    'https://www.privilege.finance/projects',
    // Weltec
    'https://www.weltec-biopower.com',
    'https://www.weltec-biopower.com/contact',
    // BrewDog
    'https://www.brewdog.com/uk/contact',
    'https://www.brewdog.com',
    // Iona Capital
    'https://www.ionacapital.co.uk',
    'https://www.ionacapital.co.uk/contact-us',
    'https://www.ionacapital.co.uk/portfolio',
  ];

  for (const u of testList) {
    const res = await engine.fetchUrl(u);
    console.log(u, '->', res.status, 'len:', res.bodyText.length);
  }
}

check();
