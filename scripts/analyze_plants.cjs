const fs = require('fs');

const content = fs.readFileSync('src/domain/plants/plantsData.ts', 'utf-8');
const countries = {};
const regex = /"countryCode":\s*"([A-Z]{2})"/g;
let m;
let total = 0;
while ((m = regex.exec(content)) !== null) {
  countries[m[1]] = (countries[m[1]] || 0) + 1;
  total++;
}
console.log('Total plants found:', total);
console.log('Country breakdown:');
for (const [code, count] of Object.entries(countries).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${code}: ${count}`);
}
