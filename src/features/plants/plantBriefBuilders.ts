import { BiomethanePlant, CommercialContactLead } from '../../domain/plants/types';

export const LEAD_SOURCE_LABEL: Record<CommercialContactLead['source'], string> = {
  SOURCE_DATASET: 'From registry data',
  SUGGESTED_ROLE: 'Role to ask for',
  INDUSTRY_DIRECTORY: 'Industry association',
  DESK_VERIFIED: 'Desk verified',
};

export const scopeOrder: Record<string, number> = {
  PLANT_OPERATOR: 30,
  PARENT_COMMERCIAL: 20,
  GENERAL_OR_PRESS: 10,
};

export const typeOrder: Record<string, number> = {
  SALES_OR_ENERGY_EMAIL: 5,
  GENERIC_EMAIL: 4,
  COMPANY_SWITCHBOARD: 3,
  CONTACT_FORM: 2,
  NAMED_PERSON: 1,
};

export function getBestResearchContact(research?: BiomethanePlant['research']): { text: string; isVerified: boolean; contact?: unknown } {
  if (!research || !research.contacts || research.contacts.length === 0) {
    return { text: 'no verified contact', isVerified: false };
  }
  const verified = research.contacts.filter(c => c.check?.status === 'VERIFIED');
  if (verified.length === 0) {
    return { text: 'no verified contact', isVerified: false };
  }
  const sorted = [...verified].sort((a, b) => {
    const sA = scopeOrder[a.contactScope || ''] || 0;
    const sB = scopeOrder[b.contactScope || ''] || 0;
    if (sB !== sA) return sB - sA;
    const tA = typeOrder[a.type] || 0;
    const tB = typeOrder[b.type] || 0;
    return tB - tA;
  });
  const top = sorted[0];
  return {
    text: `${top.type}: ${top.value}`,
    isVerified: true,
    contact: top,
  };
}

export function formatExternalUrl(url?: string | null): string {
  if (!url) return '';
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

export function buildPlantOriginationBrief(
  plant: BiomethanePlant,
  ciValue: number,
  unverifiedFields?: Set<string>
): string {
  const unverified = unverifiedFields ?? new Set(plant.fieldsUnverified ?? []);
  const tag = (field: string) => (unverified.has(field) ? ' [UNVERIFIED]' : '');

  return `=== BIOMETHANE ASSET ORIGINATION BRIEF ===
Facility: ${plant.name} (${plant.countryCode} ${plant.countryFlag})
Plant ID: ${plant.id}
Operating Entity: ${plant.operator || 'N/A'}
Legal Entity: ${plant.legalEntityName || 'N/A'}${tag('legalEntityName')}
Registration / Statutory ID: ${plant.companyRegistrationId || 'Not verified'}
Network Operator (TSO/DSO): ${plant.networkOperator || 'N/A'}
Grid Connection: ${plant.gridConnectionType || 'Distribution Grid Injection'}
Annual Capacity: ${plant.annualEnergyGWh ? `${plant.annualEnergyGWh} GWh/y (${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y)` : 'N/A'} (${plant.capacityNm3h ? `${plant.capacityNm3h} Nm³/h` : 'N/A'})
Feedstock Substrate: ${plant.primaryFeedstockCategory || 'N/A'} (${plant.feedstockDetails || 'N/A'})
Carbon Intensity: ${ciValue} gCO2e/MJ (RED III Annex IX)
Upgrading Tech: ${plant.upgradingTechnology || 'Membrane separation'}
Commissioning Year: ${plant.commissioningYear || 'N/A'}${tag('commissioningYear')}
Contact Email: ${plant.contactEmail || 'N/A'}${tag('contactEmail')}
Contact Phone: ${plant.contactPhone || 'N/A'}${tag('contactPhone')}
Corporate Website: ${plant.corporateWebsite || 'N/A'}${tag('corporateWebsite')}
Headquarters Address: ${plant.headquartersAddress || 'N/A'}${tag('headquartersAddress')}
==========================================`;
}
