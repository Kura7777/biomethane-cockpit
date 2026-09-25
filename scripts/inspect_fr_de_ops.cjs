const fs = require('fs');

const content = fs.readFileSync('src/domain/plants/plantsData.ts', 'utf-8');

const plantRegex = /"id":\s*"([^"]+)",[\s\S]*?"name":\s*"([^"]+)",[\s\S]*?"countryCode":\s*"([^"]+)",[\s\S]*?"operator":\s*"([^"]*)"/g;
let m;
const frOps = [];
const deOps = [];

while ((m = plantRegex.exec(content)) !== null) {
  const id = m[1];
  const name = m[2];
  const country = m[3];
  const op = m[4] || '';
  if (country === 'FR' && frOps.length < 15) frOps.push({ id, name, op });
  if (country === 'DE' && deOps.length < 15) deOps.push({ id, name, op });
}

console.log('FR samples:', frOps);
console.log('DE samples:', deOps);
