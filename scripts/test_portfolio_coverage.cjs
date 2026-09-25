const fs = require('fs');

const content = fs.readFileSync('src/domain/plants/plantsData.ts', 'utf-8');

// Parse plants
const plantRegex = /"id":\s*"([^"]+)",[\s\S]*?"name":\s*"([^"]+)",[\s\S]*?"countryCode":\s*"([^"]+)",[\s\S]*?"operator":\s*"([^"]*)"/g;
let m;
let total = 0;
const matched = [];
const unmatched = [];

const KNOWN_PORTFOLIO_PATTERNS = [
  // Multi-national / Major
  { group: 'Nature Energy (Shell)', patterns: [/nature energy/i, /shell.*biogas/i] },
  { group: 'TotalEnergies', patterns: [/totalenergies/i, /biobéarn/i, /fonroche/i] },
  { group: 'ENGIE', patterns: [/engie/i, /storengy/i] },
  { group: 'VERBIO', patterns: [/verbio/i] },
  { group: 'EnviTec Biogas', patterns: [/envitec/i] },
  { group: 'WELTEC BIOPOWER', patterns: [/weltec/i] },
  { group: 'Waga Energy', patterns: [/waga/i] },
  { group: 'Suez', patterns: [/suez/i] },
  { group: 'Air Liquide', patterns: [/air liquide/i] },
  { group: 'CVE (Cap Vert Énergie)', patterns: [/cve/i, /cap vert/i] },
  { group: 'Evergaz', patterns: [/evergaz/i] },
  { group: 'Vol-V', patterns: [/vol-v/i] },
  { group: 'BayWa r.e.', patterns: [/baywa/i] },
  { group: 'VNG / Balance Erneuerbare', patterns: [/balance erneuerbare/i, /\bvng\b/i] },
  { group: 'Danpower', patterns: [/danpower/i] },
  { group: 'MVV Energie', patterns: [/mvv/i] },
  { group: 'agriKomp', patterns: [/agrikomp/i] },
  { group: 'Schmack / HZI', patterns: [/schmack/i, /hitachi zosen/i] },

  // UK
  { group: 'Future Biogas', patterns: [/future biogas/i] },
  { group: 'Severn Trent Green Power', patterns: [/severn trent/i] },
  { group: 'Iona Capital', patterns: [/iona capital/i] },
  { group: 'Ixora Energy', patterns: [/ixora/i] },
  { group: 'Privilege Finance', patterns: [/privilege finance/i] },
  { group: 'GENeco (Wessex Water)', patterns: [/geneco/i, /wessex water/i] },
  { group: 'BioteCH4', patterns: [/biotech4/i] },
  { group: 'BioCapital', patterns: [/biocapital/i] },
  { group: 'Acorn Bioenergy', patterns: [/acorn/i] },
  { group: 'BioConstruct', patterns: [/bioconstruct/i] },

  // Denmark
  { group: 'Bigadan', patterns: [/bigadan/i, /kalundborg biogas/i, /horsens bioenergi/i] },
  { group: 'BioCirc Group', patterns: [/biocirc/i, /vinkel/i, /blåbjerg/i, /iglsø/i] },
  { group: 'GrønGas', patterns: [/grøngas/i, /grongas/i] },
  { group: 'E.ON Danmark', patterns: [/e\.on/i] },

  // Italy
  { group: 'A2A Ambiente', patterns: [/a2a/i] },
  { group: 'Iren Ambiente', patterns: [/iren/i] },
  { group: 'Montello S.p.A.', patterns: [/montello/i] },
  { group: 'Asja Ambiente', patterns: [/asja/i] },
  { group: 'Snam4Environment', patterns: [/snam/i, /iniziative biometano/i] },
  { group: 'Gruppo Hera', patterns: [/hera/i, /herambiente/i] },
  { group: 'CIB (Consorzio Italiano Biogas)', patterns: [/consorzio italiano biogas/i, /\bcib\b/i] },

  // Netherlands
  { group: 'Attero', patterns: [/attero/i] },
  { group: 'HoSt Bio-Energy', patterns: [/host/i] },
  { group: 'Cosun (Suiker Unie)', patterns: [/cosun/i, /suiker unie/i] },
  { group: 'Renewi', patterns: [/renewi/i] },
  { group: 'Essent', patterns: [/essent/i] },

  // Nordics & Other
  { group: 'Gasum', patterns: [/gasum/i] },
  { group: 'St1 Biokraft', patterns: [/st1/i, /biokraft/i, /scandinavian biogas/i] },
  { group: 'Tekniska Verken', patterns: [/tekniska verken/i] },
  { group: 'Naturgy / Nedgia', patterns: [/naturgy/i, /nedgia/i] },
  { group: 'PreZero', patterns: [/prezero/i] },
];

while ((m = plantRegex.exec(content)) !== null) {
  total++;
  const id = m[1];
  const name = m[2];
  const country = m[3];
  const op = m[4] || '';

  const found = KNOWN_PORTFOLIO_PATTERNS.find(k => k.patterns.some(p => p.test(op) || p.test(name)));
  if (found) {
    matched.push({ id, name, country, op, group: found.group });
  } else {
    unmatched.push({ id, name, country, op });
  }
}

console.log(`Matched to corporate portfolios: ${matched.length} of ${total} (${(matched.length / total * 100).toFixed(1)}%)`);
console.log(`Unmatched (predominantly independent agricultural SPVs / municipal units): ${unmatched.length}`);

// Breakdown of unmatched by country
const unmatchedByCountry = {};
for (const u of unmatched) {
  unmatchedByCountry[u.country] = (unmatchedByCountry[u.country] || 0) + 1;
}
console.log('Unmatched by country:', unmatchedByCountry);
