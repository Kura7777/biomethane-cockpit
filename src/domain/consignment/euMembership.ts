/**
 * The 27 EU member states (ISO 3166-1 alpha-2; Greece is "GR" in this app, with "EL" accepted).
 * Iceland, Liechtenstein, Norway (EEA), Switzerland, the UK, Ukraine, Serbia etc. are NOT members:
 * their injection is not an EU-grid injection for UDB / mass-balance purposes.
 */
export const EU27_COUNTRY_CODES: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'EL', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
]);

export function isEuMemberState(iso: string | null | undefined): boolean {
  return EU27_COUNTRY_CODES.has((iso ?? '').trim().toUpperCase());
}
