async function check(crn: string) {
  const url = `https://find-and-update.company-information.service.gov.uk/company/${crn}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const heading = html.match(/<h1[^>]*class=["'][^"']*heading[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  const status = html.match(/id=["']company-status["'][^>]*>([\s\S]*?)<\/dd>/i);
  const prevNames = html.match(/Previous company names[\s\S]*?<\/dd>/i);
  console.log('CRN:', crn);
  console.log('NAME:', heading ? heading[1].replace(/<[^>]+>/g, '').trim() : 'NONE');
  console.log('STATUS:', status ? status[1].replace(/<[^>]+>/g, '').trim() : 'NONE');
  console.log('PREV:', prevNames ? prevNames[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : 'NONE');
}

check('01847506');
