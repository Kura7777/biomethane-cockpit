async function searchCompaniesHouse(query: string): Promise<{ crn: string; name: string; status: string } | null> {
  const url = `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html = await res.text();
  const matches = [...html.matchAll(/href=["']\/company\/([A-Za-z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  
  for (const m of matches.slice(0, 5)) {
    const crn = m[1];
    const candidateName = m[2].replace(/<[^>]+>/g, '').trim();
    // fetch company profile
    await new Promise(r => setTimeout(r, 1100));
    const compUrl = `https://find-and-update.company-information.service.gov.uk/company/${crn}`;
    const compRes = await fetch(compUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (compRes.ok) {
      const compHtml = await compRes.text();
      const headingMatch = compHtml.match(/<h1[^>]*class=["'][^"']*heading[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                           compHtml.match(/<title[^>]*>([\s\S]*?) overview/i);
      const statusMatch = compHtml.match(/id=["']company-status["'][^>]*>([\s\S]*?)<\/dd>/i);
      const registeredName = headingMatch ? headingMatch[1].replace(/<[^>]+>/g, '').trim() : candidateName;
      const status = statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown';
      
      return { crn, name: registeredName, status };
    }
  }
  return null;
}

const targets = [
  'Severn Trent Green Power Limited',
  'Future Biogas Limited',
  'Vulcan Renewables Limited',
  'Kanadevia Inova Biogas Leeming Limited',
  'Lake District Biogas Limited',
  'Sheppey Energy Limited',
  'Andigestion Limited',
  'Pretoria Energy Company (Chittering) Limited',
  'Euston Biogas Limited',
  'Thornfield 001 Limited',
  'Acorn Bioenergy Limited',
  'A E L Biogas Limited',
  'REFOOD UK LIMITED',
  'Northumbrian Water Limited',
  'Corbiere Renewables Limited',
  'Ellough AD Plant Limited',
  'Grissan Carrick Limited',
  'Warrens Emerald Biogas Ltd',
  'Northwick Power Limited',
  'ENGIE Renewable Gases UK Limited',
  'William Grant & Sons Distillers Limited',
  'BrewDog PLC',
  'BioteCH4 Limited',
  'BioCapital Group Ltd'
];

async function main() {
  for (const t of targets) {
    console.log(`\nSearching for: "${t}"...`);
    const res = await searchCompaniesHouse(t);
    if (res) {
      console.log(`FOUND -> CRN: ${res.crn} | Name: "${res.name}" | Status: ${res.status}`);
    } else {
      console.log(`NOT FOUND for: "${t}"`);
    }
    await new Promise(r => setTimeout(r, 1200));
  }
}

main();
