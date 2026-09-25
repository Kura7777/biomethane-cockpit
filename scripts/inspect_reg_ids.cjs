const fs = require('fs');

const content = fs.readFileSync('src/domain/plants/plantsData.ts', 'utf-8');

const plantRegex = /"id":\s*"([^"]+)",[\s\S]*?"name":\s*"([^"]+)",[\s\S]*?"countryCode":\s*"([^"]+)",[\s\S]*?"operator":\s*"([^"]*)",[\s\S]*?"companyRegistrationId":\s*"([^"]*)"/g;
let m;
let count = 0;
const deSample = [];
const frSample = [];

while ((m = plantRegex.exec(content)) !== null) {
  count++;
  const id = m[1];
  const name = m[2];
  const country = m[3];
  const op = m[4];
  const regId = m[5];
  if (country === 'DE' && deSample.length < 5) deSample.push({ id, name, op, regId });
  if (country === 'FR' && frSample.length < 5) frSample.push({ id, name, op, regId });
}

console.log('Total plants with companyRegistrationId:', count);
console.log('DE samples:', deSample);
console.log('FR samples:', frSample);
