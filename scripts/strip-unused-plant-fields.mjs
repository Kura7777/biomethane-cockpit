// One-off rewrite: removes BiomethanePlant fields from plantsData.ts that no
// screen, domain module, or export ever reads (confirmed by grepping `.fieldName`
// across src, excluding the data/type files themselves and this field list).
// They were 26.9% of the file's bytes. Every kept field's line is untouched —
// this only deletes whole "field": value lines and tidies up any trailing
// comma left dangling before a closing `}`/`]`.
//
// Re-run after touching plantsData.ts if new unused fields accumulate again:
//   node scripts/strip-unused-plant-fields.mjs
import { readFileSync, writeFileSync } from 'fs';

const FILE = new URL('../src/domain/plants/plantsData.ts', import.meta.url);

const UNUSED_FIELDS = [
  'auditedCarbonIntensity',
  'benchmarkCarbonIntensity',
  'certificationAndRegistry',
  'contractVolumeMWh',
  'currentOfftakeStatus',
  'dataProvenanceTier',
  'defaultStatutoryRouting',
  'domesticSubsidyScheme',
  'latitude',
  'longitude',
  'offtakeContractEnd',
  'primaryOfftakeMarket',
  'redIIISubcategory',
  'regionGridZone',
  'registryGuaranteesOfOrigin',
  'verifiedCarbonIntensity',
];

const src = readFileSync(FILE, 'utf-8');
const fieldPattern = new RegExp(`^\\s*"(?:${UNUSED_FIELDS.join('|')})":.*,?\\s*$`);

const lines = src.split('\n');
const before = lines.length;
const kept = lines.filter(line => !fieldPattern.test(line));
const removed = before - kept.length;

let out = kept.join('\n');
// A removed field may have been the last property before `}`/`]`, leaving the
// new last property with a dangling trailing comma. Strip it.
out = out.replace(/,(\s*\n\s*[}\]])/g, '$1');

writeFileSync(FILE, out, 'utf-8');
console.log(`Removed ${removed} lines for ${UNUSED_FIELDS.length} unused fields.`);
