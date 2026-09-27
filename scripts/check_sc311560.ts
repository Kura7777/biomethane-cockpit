async function check() {
  const res = await fetch('https://find-and-update.company-information.service.gov.uk/company/SC311560', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const heading = html.match(/<h1[^>]*class=["'][^"']*heading[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  const statusMatch = html.match(/id=["']company-status["'][^>]*>([\s\S]*?)<\/dd>/i);
  console.log('Heading:', heading ? heading[1].replace(/<[^>]+>/g, '').trim() : 'NONE');
  console.log('Status:', statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').trim() : 'NONE');
}
check();
