import * as fs from 'fs';

interface PlantResearch {
  plantId: string;
  legalEntity: { value: string; sourceUrl: string } | null;
  registrationId: { value: string; sourceUrl: string } | null;
}

function normalize(s: string): string {
  return s
    .toUpperCase()
    .replace(/&AMP;/g, 'AND')
    .replace(/&/g, 'AND')
    .replace(/\bLIMITED\b/g, 'LTD')
    .replace(/\bPUBLIC LIMITED COMPANY\b/g, 'PLC')
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

async function auditGb() {
  const gbPath = 'data/plant_research/gb.json';
  const data = JSON.parse(fs.readFileSync(gbPath, 'utf8'));
  
  console.log(`Auditing all ${data.plants.length} plants in ${gbPath} against Companies House...\n`);
  
  for (const p of data.plants) {
    if (!p.registrationId || !p.registrationId.value) {
      console.log(`[${p.plantId}] NO REGISTRATION ID (${p.legalEntity ? p.legalEntity.value : 'UNRESOLVED'})`);
      continue;
    }
    
    // Extract CRN
    const match = p.registrationId.value.match(/([A-Z0-9]{8})/i) || p.registrationId.sourceUrl.match(/\/company\/([A-Za-z0-9]+)/i);
    if (!match) {
      console.log(`[${p.plantId}] COULD NOT PARSE CRN from: ${p.registrationId.value}`);
      continue;
    }
    
    const crn = match[1].toUpperCase();
    await new Promise(r => setTimeout(r, 1100));
    
    try {
      const url = `https://find-and-update.company-information.service.gov.uk/company/${crn}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) {
        console.log(`[${p.plantId}] CRN ${crn} -> HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();
      const heading = html.match(/<h1[^>]*class=["'][^"']*heading[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i) ||
                      html.match(/<title[^>]*>([\s\S]*?) overview/i);
      const statusMatch = html.match(/id=["']company-status["'][^>]*>([\s\S]*?)<\/dd>/i);
      const chName = heading ? heading[1].replace(/<[^>]+>/g, '').trim() : 'UNKNOWN';
      const chStatus = statusMatch ? statusMatch[1].replace(/<[^>]+>/g, '').trim() : 'UNKNOWN';
      
      const legalName = p.legalEntity?.value || '';
      const normLegal = normalize(legalName);
      const normCh = normalize(chName);
      const matches = normLegal === normCh || normCh.includes(normLegal) || normLegal.includes(normCh);
      
      console.log(`[${p.plantId}] CRN ${crn} | Status: ${chStatus} | Match: ${matches ? 'YES' : 'NO'}`);
      if (!matches) {
        console.log(`   Our legalEntity: "${legalName}" (norm: ${normLegal})`);
        console.log(`   Companies House: "${chName}" (norm: ${normCh})`);
      }
    } catch (err: any) {
      console.log(`[${p.plantId}] Error fetching ${crn}: ${err.message}`);
    }
  }
}

auditGb();
