// Verifies every source `quote` in rules.mjs is verbatim text from the research files.
// Quotes are split on "..." / "…" into fragments; each fragment must appear in at least one
// research file after whitespace (and typographic quote/dash) normalisation.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as rules from './rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../../docs/research/route-audit-2026-10-04');
const FILES = ['go-ergar.md', 'go-aib.md', 'go-nohub.md', 'pos-origin-grid.md', 'pos-dest-nw.md', 'pos-dest-se.md', 'pos-dest-se-pass2.md', 'SYNTHESIS-NOTES.md'];

const norm = s => s
  .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
  .replace(/[\u201C\u201D\u201E]/g, '"')
  .replace(/[\u2010-\u2015]/g, '-')
  .replace(/\u00A0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const corpus = FILES.map(f => norm(fs.readFileSync(path.join(dir, f), 'utf8'))).join(' || ');

const found = [];
function walk(node, where) {
  if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${where}[${i}]`)); return; }
  if (node && typeof node === 'object') {
    if (typeof node.quote === 'string' && 'url' in node) found.push({ where, quote: node.quote });
    for (const [k, v] of Object.entries(node)) walk(v, `${where}.${k}`);
  }
}
for (const [name, val] of Object.entries(rules)) walk(val, name);

const failures = [];
for (const { where, quote } of found) {
  const frags = quote.split(/\.\.\.|\u2026/).map(norm).filter(f => f.length > 0);
  if (frags.length === 0) { failures.push({ where, fragment: '(empty quote)' }); continue; }
  for (const f of frags) if (!corpus.includes(f)) failures.push({ where, fragment: f });
}

console.log(`[check-quotes] ${found.length} quotes checked against ${FILES.length} research files.`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f.where}: "${f.fragment.slice(0, 160)}"`);
  console.error(`[check-quotes] ${failures.length} failing fragment(s).`);
  process.exit(1);
}
console.log('[check-quotes] all quotes verbatim.');
