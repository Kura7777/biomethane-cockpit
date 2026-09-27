async function checkSearch() {
  const url = `https://find-and-update.company-information.service.gov.uk/search/companies?q=Andigestion`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const matches = [...html.matchAll(/href=["']\/company\/([A-Za-z0-9]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of matches.slice(0, 10)) {
    console.log(m[1], '-->', m[2].replace(/<[^>]+>/g, '').trim());
  }
}

checkSearch();
