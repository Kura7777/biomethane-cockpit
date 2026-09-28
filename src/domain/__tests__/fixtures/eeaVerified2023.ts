/**
 * Official 2023 verified emissions of all stationary installations, by country (tCO₂), from the
 * EEA's EU ETS dataset ("2.1 EU-ETS Verified Emission", main activity 20-99), as republished at
 * https://github.com/datasets/eu-emissions-trading-system (data/eu-ets.csv). Independent of the
 * site-level EUETS.INFO file; used to check that file sums to the official totals.
 */
export const EEA_VERIFIED_2023_BY_COUNTRY: Record<string, number> = {"AT": 24413340, "BE": 35402662, "BG": 21639927, "CY": 4343281, "CZ": 46672102, "DE": 289340809, "DK": 9244100, "EE": 5260450, "ES": 81133557, "FI": 15359928, "FR": 70652409, "GR": 25466136, "HR": 6567049, "HU": 13436680, "IE": 12193816, "IS": 1812530, "IT": 114784026, "LT": 4752053, "LU": 883632, "LV": 1739119, "MT": 797185, "NL": 58888869, "NO": 21327464, "PL": 153018903, "PT": 12762063, "RO": 23830020, "SE": 17234053, "SI": 4582144, "SK": 16994172, "XI": 2199921};
export const EEA_SOURCE_URL = 'https://raw.githubusercontent.com/datasets/eu-emissions-trading-system/main/data/eu-ets.csv';
