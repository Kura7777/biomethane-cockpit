/**
 * Company-name normalisation for matching the same company across datasets
 * (EU MRV shipping groups, EUTL installation operators, ETS2 supplier research).
 *
 * Deliberately conservative: it only removes legal forms, punctuation, accents and bracketed
 * asides, so "Edison S.p.A. (Edison Energia)" and "EDISON SPA" meet, while different companies
 * that merely share a word do not. Looser matches are offered as suggestions, never merged
 * automatically.
 */

const LEGAL_FORMS = [
  'aktiengesellschaft', 'gesellschaft mit beschrankter haftung', 'societa per azioni', 'sociedad anonima',
  'limited', 'ltd', 'plc', 'inc', 'llc', 'corp', 'corporation', 'company', 'co',
  'gmbh', 'ag', 'kg', 'kgaa', 'mbh', 'se', 'ug',
  'sa', 'sas', 'sarl', 'snc', 'sca',
  'spa', 'srl', 'sapa',
  'bv', 'nv', 'vof', 'cv',
  'as', 'asa', 'aps', 'ab', 'publ', 'oy', 'oyj', 'hf', 'ehf',
  'sro', 'as', 'spzoo', 'zoo', 'sp', 'kft', 'zrt', 'nyrt', 'dd', 'doo', 'ad', 'ead', 'srl', 'ae',
  'lda', 'slu', 'sl', 'sau',
  // Greek and Bulgarian legal forms in their own script: ΑΕ, ΕΠΕ, ΙΚΕ, ΑΒΕΕ; ЕАД, АД, ООД, ЕООД.
  '\u03b1\u03b5', '\u03b5\u03c0\u03b5', '\u03b9\u03ba\u03b5', '\u03b1\u03b2\u03b5\u03b5',
  '\u0435\u0430\u0434', '\u0430\u0434', '\u043e\u043e\u0434', '\u0435\u043e\u043e\u0434',
  'group', 'groupe', 'gruppo', 'grupo', 'holding', 'holdings',
];

const LEGAL_FORM_SET = new Set(LEGAL_FORMS);

/** Lower-case, accent-free, punctuation-free, legal forms and bracketed asides removed. */
export function normalizeCompanyName(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Letters NFKD does not decompose: "Eisengießerei", "Łódź", "Ørsted", "Cæsar".
    .replace(/\u00df/g, 'ss')
    .replace(/\u0142/g, 'l')
    .replace(/\u00f8/g, 'o')
    .replace(/\u00e6/g, 'ae')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/&/g, ' and ')
    // Drop dots so abbreviations join: "s.p.a" / "s.p.a." → "spa", "b.v." → "bv", "e.on" → "eon".
    .replace(/\./g, '')
    // Danish / Norwegian "A/S", "I/S".
    .replace(/\b([a-z])\/([a-z])\b/g, '$1$2')
    // Any script's letters survive (EUTL lists Greek and Bulgarian operators in their own script).
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    // Polish "sp. z o.o." and Czech "s. r. o." after dot removal.
    .replace(/\bsp z oo\b/g, 'spzoo')
    .replace(/\bs r o\b/g, 'sro')
    .trim();
  const tokens = base.split(/\s+/).filter(Boolean);
  // Strip legal forms from the end only, so names such as "Group Hera" keep their meaning.
  // A trailing "and" is what is left of "GmbH & Co. KG" once the legal forms are gone.
  while (tokens.length > 1 && (LEGAL_FORM_SET.has(tokens[tokens.length - 1]) || tokens[tokens.length - 1] === 'and')) tokens.pop();
  return tokens.join(' ');
}

/** The first distinctive word (≥ 4 letters, not a legal form) — used only for "possibly related" suggestions. */
export function leadingToken(name: string): string | null {
  const tokens = normalizeCompanyName(name).split(' ');
  return tokens.find(t => t.length >= 4 && !LEGAL_FORM_SET.has(t) && !/^\d+$/.test(t)) ?? null;
}

/**
 * Search key: case-, accent- and diacritic-insensitive, so "orsted" finds "Ørsted A/S" and
 * "wartsila" finds "Wärtsilä". Keeps punctuation and legal forms, unlike normalizeCompanyName.
 */
export function searchFold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/đ/g, 'd');
}
