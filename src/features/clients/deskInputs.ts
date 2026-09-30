import { CompanyLink, DEFAULT_ETS2_COMPANIES } from '../../domain/companies/directory';
import { parseLinks, parseStatuses, Status } from '../../domain/companies/clientState';
import { Ets2Company, applyEts2CompanyImport } from '../../domain/ets2/companies';
import { Ets2CountryProfile, ETS2_COUNTRIES, applyEts2CountryImport } from '../../domain/ets2/countries';

/**
 * What the trader has stored on this machine that shapes the company directory: confirmed links,
 * outreach statuses and the ETS2 imports made on the EU ETS screen. Shared by Clients and the ETS
 * tabs so they all read one directory.
 */

export const LINKS_KEY = 'biomethane_company_links_v1';
export const STATUS_KEY = 'biomethane_client_status_v1';
/** Read-only here: the trader's ETS2 imports, made on the EU ETS screen. */
export const ETS2_COUNTRY_IMPORT_KEY = 'biomethane_ets2_country_import_v1';
export const ETS2_COMPANY_IMPORT_KEY = 'biomethane_ets2_company_import_v1';

export function readText(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: changes last for this session only.
  }
}

export const readLinks = (): CompanyLink[] => parseLinks(readText(LINKS_KEY));
export const readStatuses = (): Record<string, Status> => parseStatuses(readText(STATUS_KEY));

/** Imports are pasted by the trader on the EU ETS screen; any stored shape that does not parse falls back to the defaults. */
export function readEts2Countries(): Ets2CountryProfile[] {
  const text = readText(ETS2_COUNTRY_IMPORT_KEY);
  if (!text.trim()) return ETS2_COUNTRIES;
  try {
    return applyEts2CountryImport(ETS2_COUNTRIES, text).countries;
  } catch {
    return ETS2_COUNTRIES;
  }
}

export function readEts2Companies(): Ets2Company[] {
  const text = readText(ETS2_COMPANY_IMPORT_KEY);
  if (!text.trim()) return DEFAULT_ETS2_COMPANIES;
  try {
    return applyEts2CompanyImport(DEFAULT_ETS2_COMPANIES, text).companies;
  } catch {
    return DEFAULT_ETS2_COMPANIES;
  }
}
