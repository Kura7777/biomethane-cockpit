import { BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';
import { normalizePlantRegistry } from '../src/domain/plants/dataQuality';

const plants = normalizePlantRegistry(BIOMETHANE_PLANTS);
const es = plants.filter(p => p.countryCode === 'ES');

console.log(`Total ES plants: ${es.length}`);
console.log('ID | Name | Operator | Status | Feedstock | Email | Phone');
for (const p of es.sort((a,b) => a.id.localeCompare(b.id))) {
  console.log(`${p.id} | ${p.name} | ${p.operator} | ${p.status} | ${p.primaryFeedstockCategory} | ${p.contactEmail} | ${p.contactPhone}`);
}
