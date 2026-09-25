const fs = require('fs');

const content = fs.readFileSync('src/domain/plants/plantsData.ts', 'utf-8');

// Parse a sample of plants from different countries
function getSample(countryCode, n = 3) {
  const plants = [];
  const regex = new RegExp(`{\\s*"id":\\s*"([^"]+)",\\s*"name":\\s*"([^"]+)",\\s*"country":\\s*"([^"]+)",\\s*"countryCode":\\s*"${countryCode}"([\\s\\S]*?)(?=},\\s*{\\s*"id"|}\\s*];)`, 'g');
  let m;
  while ((m = regex.exec(content)) !== null && plants.length < n) {
    const id = m[1];
    const name = m[2];
    const rest = m[4];
    const operator = (rest.match(/"operator":\s*"([^"]*)"/) || [])[1] || null;
    const capacity = (rest.match(/"capacityNm3h":\s*([0-9.]+)/) || [])[1] || null;
    const energy = (rest.match(/"annualEnergyGWh":\s*([0-9.]+)/) || [])[1] || null;
    const email = (rest.match(/"contactEmail":\s*"([^"]*)"/) || [])[1] || null;
    const phone = (rest.match(/"contactPhone":\s*"([^"]*)"/) || [])[1] || null;
    const website = (rest.match(/"corporateWebsite":\s*"([^"]*)"/) || [])[1] || null;
    const regId = (rest.match(/"companyRegistrationId":\s*"([^"]*)"/) || [])[1] || null;
    plants.push({ id, name, countryCode, operator, capacity, energy, email, phone, website, regId });
  }
  return plants;
}

console.log('Sample FR:', getSample('FR', 2));
console.log('Sample DE:', getSample('DE', 2));
console.log('Sample GB:', getSample('GB', 2));
console.log('Sample IT:', getSample('IT', 2));
console.log('Sample DK:', getSample('DK', 2));
