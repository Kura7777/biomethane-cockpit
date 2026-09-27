import { PLANT_RESEARCH } from '../src/domain/plants/plantResearch.generated';
import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';

function getBestContact(p: any): string {
  const verified = (p.contacts || []).filter((c: any) => c.check?.status === 'VERIFIED');
  if (verified.length === 0) {
    return 'no verified contact';
  }
  const scopeOrder: Record<string, number> = {
    PLANT_OPERATOR: 30,
    PARENT_COMMERCIAL: 20,
    GENERAL_OR_PRESS: 10,
  };
  const typeOrder: Record<string, number> = {
    SALES_OR_ENERGY_EMAIL: 5,
    GENERIC_EMAIL: 4,
    COMPANY_SWITCHBOARD: 3,
    CONTACT_FORM: 2,
    NAMED_PERSON: 1,
  };

  const sorted = [...verified].sort((a: any, b: any) => {
    const sA = scopeOrder[a.contactScope || ''] || 0;
    const sB = scopeOrder[b.contactScope || ''] || 0;
    if (sB !== sA) return sB - sA;
    const tA = typeOrder[a.type] || 0;
    const tB = typeOrder[b.type] || 0;
    return tB - tA;
  });

  const top = sorted[0];
  return `${top.type}: ${top.value}`;
}

function formatTable(countryCode: string) {
  const prefix = countryCode.toLowerCase() === 'gb' ? 'plant_uk_' : 'plant_es_';
  const plants = Object.values(PLANT_RESEARCH).filter(p => p.plantId.startsWith(prefix));

  console.log(`\n### ${countryCode.toUpperCase()} Counterparty Table (${plants.length} facilities)\n`);
  console.log('| # | Plant ID | Name | Status | Legal Entity | Reg ID | Parent | Website | Best Contact | Eff Tier | Plant Link Status | Open Questions |');
  console.log('| :---: | :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |');

  plants.forEach((p, idx) => {
    const raw = RAW_BIOMETHANE_PLANTS.find(x => x.id === p.plantId);
    const name = raw?.name || p.plantId;
    const legalEntity = p.legalEntity?.value || '—';
    const regId = p.registrationId?.value || '—';
    const parent = p.parentGroup?.value ? p.parentGroup.value.split('/')[0].trim() : '—';
    const website = p.website?.value ? p.website.value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '—';
    const bestContact = getBestContact(p);
    const effTier = p.effectiveTier || p.tier;
    const plantLinkStatus = p.plantLink?.check?.status || 'UNCHECKED';
    const oq = p.openQuestions && p.openQuestions.length > 0 ? p.openQuestions[0] : 'None';

    console.log(`| ${idx + 1} | \`${p.plantId}\` | ${name} | ${p.status} | ${legalEntity} | ${regId} | ${parent} | ${website} | ${bestContact} | **\`${effTier}\`** | \`${plantLinkStatus}\` | ${oq} |`);
  });
}

const targetCc = process.argv[2] || 'all';
if (targetCc === 'all') {
  formatTable('es');
  formatTable('gb');
} else {
  formatTable(targetCc);
}
