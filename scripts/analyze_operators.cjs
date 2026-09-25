const fs = require('fs');

const content = fs.readFileSync('src/domain/plants/plantsData.ts', 'utf-8');

// Extract all plants
const plantRegex = /"id":\s*"([^"]+)",[\s\S]*?"name":\s*"([^"]+)",[\s\S]*?"countryCode":\s*"([^"]+)",[\s\S]*?"operator":\s*"([^"]*)"/g;
const operators = new Map();
const countryOperators = {};
let m;
let total = 0;

while ((m = plantRegex.exec(content)) !== null) {
  total++;
  const id = m[1];
  const name = m[2];
  const country = m[3];
  const op = m[4] || 'Unknown';
  
  operators.set(op, (operators.get(op) || 0) + 1);
  if (!countryOperators[country]) countryOperators[country] = new Map();
  countryOperators[country].set(op, (countryOperators[country].get(op) || 0) + 1);
}

console.log(`Parsed ${total} plants.`);
console.log(`Total distinct operator strings: ${operators.size}`);

// Print top operators for DE, FR, GB, DK, IT, NL
for (const c of ['DE', 'FR', 'GB', 'DK', 'IT', 'NL']) {
  console.log(`\nTop operators in ${c}:`);
  const list = Array.from(countryOperators[c] || []).sort((a,b) => b[1] - a[1]).slice(0, 10);
  for (const [op, cnt] of list) {
    console.log(`  - [${cnt} plants] ${op}`);
  }
}
