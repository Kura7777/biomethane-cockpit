import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { CertificationScheme, ChainOfCustody } from '../../domain/consignment/types';
import { defaultMarketForOrigin } from '../../domain/trade/dealDefaults';

export type DealStep = 1 | 2 | 3 | 4 | 5;

/** Deal flow, top to bottom. Step 1 of the old four-step flow is split into product (what is
 *  being sold) and volume & schedule (how much, when), so no step carries more than a few panels. */
export const DEAL_STEPS: { id: DealStep; label: string; next: string }[] = [
  { id: 1, label: 'Product', next: 'Next: Volume & schedule' },
  { id: 2, label: 'Volume & schedule', next: 'Next: Market & gate audit' },
  { id: 3, label: 'Market & gate audit', next: 'Next: Economics & waterfall' },
  { id: 4, label: 'Economics & waterfall', next: 'Next: Deal package' },
  { id: 5, label: 'Deal package & execution', next: '' },
];

export const formatShortDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export const RISK_SUITE_ASSUMPTIONS = [
  'risk.illustrativeVolumeMwh',
  'risk.replacementCeilingFloorEurPerMwh',
  'risk.replacementCeilingNetbackMultiple',
  'risk.fallbackProcurementPremiumEurPerMwh',
  'risk.deThgBundleRefNeg80EurPerMwh',
  'risk.deThgBundleRefNeg0EurPerMwh',
];

export const MONO_FONT = 'var(--font-mono, "IBM Plex Mono", monospace)';

export function getVtpForMarket(marketCountry?: string): string {
  switch (marketCountry) {
    case 'DE': return 'THE (Trading Hub Europe)';
    case 'NL': return 'TTF (Title Transfer Facility)';
    case 'FR': return 'PEG (Point d\'Échange de Gaz)';
    case 'IT': return 'PSV (Punto di Scambio Virtuale)';
    case 'GB': return 'NBP (National Balancing Point)';
    case 'AT': return 'CEGH (Central European Gas Hub)';
    case 'DK': return 'ETF (Energinet Transfer Facility)';
    case 'ES': return 'PVB (Punto Virtual de Balance)';
    case 'BE': return 'ZTP (Zeebrugge Trading Point)';
    case 'PL': return 'GSA (TGE Gas Hub Poland)';
    default: return `${marketCountry || 'EU'}_VTP_TRANSMISSION`;
  }
}

export const ORIGIN_DESCRIPTIONS: Record<string, string> = {
  DK: 'Denmark · 60 producing facilities · Energinet registry. EU-interconnected via Ellund, so UDB grid ingestion is evidenceable.',
  DE: 'Germany · 285 producing facilities · dena Biogasregister.',
  FR: 'France · 829 producing facilities · GRTgaz / Teréga / EEX registry.',
  NL: 'Netherlands · 92 producing facilities · VertiCer registry.',
  IT: 'Italy · 273 producing facilities · GSE Biometano registry.',
  ES: 'Spain · 26 producing facilities · Enagás GTS (Sistema GdO).',
  GB: 'United Kingdom · Grid-isolated; cannot evidence UDB ingestion into EU compliance destinations without physical segregation.',
  SE: 'Sweden · 67 producing facilities · Energigas Sverige registry.',
  FI: 'Finland · 32 producing facilities · Gasgrid Finland registry.',
  AT: 'Austria · 20 producing facilities · AGCS Biomethan Register.',
  CH: 'Switzerland · Non-EU grid-isolated; cannot evidence UDB ingestion.',
  NO: 'Norway · Grid-isolated; cannot evidence UDB ingestion.',
  PT: 'Portugal · 13 producing facilities · REN / DGEG registry.',
  BE: 'Belgium · 12 producing facilities · Fluxys / Brugel registry.',
  LT: 'Lithuania · 12 producing facilities · Amber Grid Biomethane GO Platform.',
  CZ: 'Czech Republic · 10 producing facilities · OTE a.s. registry.',
  LV: 'Latvia · 10 producing facilities · Conexus Baltic Grid GO platform.',
  EE: 'Estonia · 4 producing facilities · Elering Biomethane Register.',
  SK: 'Slovakia · 3 producing facilities · SPP - Distribucia / OKTE platform.',
  LU: 'Luxembourg · 2 producing facilities · ILR / Creos registry.',
  PL: 'Poland · 5 producing facilities · KZR INiG / Gaz-System registry.',
  HU: 'Hungary · 4 producing facilities · FGSZ / MEKH GO registry.',
  RO: 'Romania · 2 producing facilities · Transgaz registry.',
  IE: 'Ireland · 3 producing facilities · Gas Networks Ireland (GNI) registry.',
  SI: 'Slovenia · 2 producing facilities · Plinovodi registry.',
  HR: 'Croatia · 2 producing facilities · Plinacro registry.',
  GR: 'Greece · 2 producing facilities · DESFA registry.',
  BG: 'Bulgaria · 1 producing facility · Bulgartransgaz registry.',
};

export const ORIGINS = Object.values(PRODUCING_ORIGINS).map(p => ({
  code: p.countryCode,
  name: p.countryName,
  flag: p.flag,
  isolated: p.gridZone === 'NON_EU_ISOLATED',
  desc: ORIGIN_DESCRIPTIONS[p.countryCode] || `${p.countryName} · ${p.activePlants} producing facilities · ${p.primaryRegistry} registry.${p.gridZone === 'NON_EU_ISOLATED' ? ' Grid-isolated; cannot evidence UDB ingestion into EU compliance destinations.' : ' EU-interconnected gas grid, UDB ingestion is evidenceable.'}`,
}));

/**
 * defaultCI reads from FEEDSTOCK_REGISTRY (domain/consignment/feedstocks.ts) rather than a
 * second hard-coded literal per key — price-inventory.md flagged these as a duplicate that had
 * silently diverged in other apps. Confirmed identical to the registry for all six keys here.
 */
export const FEEDSTOCKS: { key: string; label: string; defaultCI: number; hint: string }[] = [
  { key: 'manure', label: 'Manure & slurry', defaultCI: FEEDSTOCK_REGISTRY.manure.defaultCI, hint: 'Annex IX Part A. The negative carbon intensity comes from avoided methane in conventional manure management, not from the upgrading process.' },
  { key: 'agricultural_residues', label: 'Agricultural residues', defaultCI: FEEDSTOCK_REGISTRY.agricultural_residues.defaultCI, hint: 'Annex IX Part A. High-margin non-food residue with RED III compliance across all EU transport routes.' },
  { key: 'food_waste', label: 'Food waste', defaultCI: FEEDSTOCK_REGISTRY.food_waste.defaultCI, hint: 'Annex IX Part A. Municipal or commercial source-separated organic waste.' },
  { key: 'sewage_sludge', label: 'Sewage sludge', defaultCI: FEEDSTOCK_REGISTRY.sewage_sludge.defaultCI, hint: 'Annex IX Part A. Wastewater treatment substrate.' },
  { key: 'landfill_gas', label: 'Landfill gas', defaultCI: FEEDSTOCK_REGISTRY.landfill_gas.defaultCI, hint: 'Captured landfill methane. Verify Annex IX treatment with the target Member State before booking.' },
  { key: 'energy_crops', label: 'Energy crops', defaultCI: FEEDSTOCK_REGISTRY.energy_crops.defaultCI, hint: 'Non-Annex IX. Excluded from RED III transport quota but eligible for voluntary GO and UK RGGO transfers.' },
];

export const SCHEMES: { scheme: CertificationScheme; label: string; hint: string }[] = [
  { scheme: 'ISCC_EU', label: 'ISCC EU', hint: 'ISCC EU is recognised for RED III transport compliance in every member state.' },
  { scheme: 'REDCERT_EU', label: 'REDcert EU', hint: 'REDcert EU is fully recognised for statutory transport compliance across the EU.' },
  { scheme: 'ISCC_PLUS', label: 'ISCC PLUS', hint: 'ISCC PLUS is voluntary scope only and hard-blocks every compliance market.' },
];

export const CUSTODIES: { custody: ChainOfCustody; label: string; hint: string }[] = [
  { custody: 'MASS_BALANCE', label: 'Mass balance', hint: 'Mass balance is mandatory under RED III Art. 30(1) for all transport compliance claims.' },
  { custody: 'BOOK_AND_CLAIM', label: 'Book & claim', hint: 'Book & claim hard-blocks FuelEU Maritime and every RED III compliance route — mass balance is required by Art. 30(1).' },
];

/**
 * Per-origin statutory default market routing.
 * Delegates to centralized defaultMarketForOrigin in dealDefaults.ts.
 */
export function getDefaultMarketForOrigin(originIso?: string): string {
  return defaultMarketForOrigin(originIso);
}

export function newDealId(): string {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `DEAL-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
