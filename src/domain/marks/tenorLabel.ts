/**
 * Canonical tenor / vintage labels shared by the broker parser, the pasted-row committer and the
 * Pricing desk sorter. Output vocabulary (case as shown):
 *   Spot, BoM, M+1..M+n, "Jan 2027", "Q1 2027", "H1 2027", "Win 2026" (Oct 2026 - Mar 2027),
 *   "Sum 2027" (Apr - Sep 2027), "Cal 2027". A bare year "2027" means "Cal 2027".
 * Input is case-insensitive and accepts Cal27, Cal-27, CAL 27, Q1-27, Q1 27, 1Q27, H2-27, H226,
 * Win26, W26, Sum27, S27, Jan-27, Jan27, January 2027.
 */

export interface TenorSpan {
  label: string;
  start: number;
  end: number;
}

const MONTHS: Array<[string, string]> = [
  ['jan(?:uary)?', 'Jan'], ['feb(?:ruary)?', 'Feb'], ['mar(?:ch)?', 'Mar'], ['apr(?:il)?', 'Apr'],
  ['may', 'May'], ['june?', 'Jun'], ['july?', 'Jul'], ['aug(?:ust)?', 'Aug'],
  ['sep(?:t(?:ember)?)?', 'Sep'], ['oct(?:ober)?', 'Oct'], ['nov(?:ember)?', 'Nov'], ['dec(?:ember)?', 'Dec'],
];

const YR = '(20\\d\\d|\\d\\d)';

function fullYear(y: string): number {
  return y.length === 2 ? 2000 + Number(y) : Number(y);
}

interface Spec {
  re: RegExp;
  label: (m: RegExpExecArray) => string;
  /** Only used when matching a whole label, not when scanning free text (too ambiguous). */
  relaxedOnly?: boolean;
}

function specs(): Spec[] {
  const list: Spec[] = [
    { re: new RegExp(`\\bcal(?:endar)?[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `Cal ${fullYear(m[1])}` },
    { re: new RegExp(`\\b([1-4])Q[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `Q${m[1]} ${fullYear(m[2])}` },
    { re: new RegExp(`\\bQ([1-4])[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `Q${m[1]} ${fullYear(m[2])}` },
    { re: new RegExp(`\\b([12])H[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `H${m[1]} ${fullYear(m[2])}` },
    { re: new RegExp(`\\bH([12])[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `H${m[1]} ${fullYear(m[2])}` },
    { re: new RegExp(`\\bwin(?:ter)?[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `Win ${fullYear(m[1])}` },
    { re: new RegExp(`\\bsum(?:mer)?[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `Sum ${fullYear(m[1])}` },
    { re: /\bW(\d\d)(?![\w])/gi, label: m => `Win ${fullYear(m[1])}` },
    { re: /\bS(\d\d)(?![\w])/gi, label: m => `Sum ${fullYear(m[1])}` },
    { re: /\bW[-\s](\d\d)(?![\w])/gi, label: m => `Win ${fullYear(m[1])}`, relaxedOnly: true },
    { re: /\bS[-\s](\d\d)(?![\w])/gi, label: m => `Sum ${fullYear(m[1])}`, relaxedOnly: true },
  ];
  for (const [pattern, abbr] of MONTHS) {
    list.push({ re: new RegExp(`\\b${pattern}[-\\s]?${YR}(?![\\w])`, 'gi'), label: m => `${abbr} ${fullYear(m[1])}` });
  }
  list.push(
    { re: /\bspot\b/gi, label: () => 'Spot' },
    { re: /\bbom\b/gi, label: () => 'BoM' },
    { re: /\bM\+(\d+)(?![\w])/gi, label: m => `M+${Number(m[1])}` },
    { re: /\b(20[2-3]\d)\b/g, label: m => `Cal ${m[1]}` },
  );
  return list;
}

/** Every tenor token found in free text, left to right, overlaps resolved in favour of the earlier / more specific token. */
export function findTenorSpans(text: string, relaxed = false): TenorSpan[] {
  const found: Array<TenorSpan & { rank: number }> = [];
  specs().forEach((spec, rank) => {
    if (spec.relaxedOnly && !relaxed) return;
    spec.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = spec.re.exec(text)) !== null) {
      found.push({ label: spec.label(m), start: m.index, end: m.index + m[0].length, rank });
      if (m[0].length === 0) spec.re.lastIndex++;
    }
  });
  found.sort((a, b) => a.start - b.start || a.rank - b.rank);
  const accepted: TenorSpan[] = [];
  for (const f of found) {
    const last = accepted[accepted.length - 1];
    if (last && f.start < last.end) continue;
    accepted.push({ label: f.label, start: f.start, end: f.end });
  }
  return accepted;
}

/** The first tenor token in free text as a canonical label, or null. */
export function findTenorInText(text: string): string | null {
  const spans = findTenorSpans(text);
  return spans.length > 0 ? spans[0].label : null;
}

/** Normalises a whole tenor label to the canonical form, or null when it is not a recognised tenor. */
export function canonicalTenorLabel(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  const spans = findTenorSpans(s, true);
  if (spans.length === 1 && spans[0].start === 0 && spans[0].end === s.length) return spans[0].label;
  return null;
}
