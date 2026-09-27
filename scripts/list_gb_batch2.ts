import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';

const gbPlants = RAW_BIOMETHANE_PLANTS.filter(p => p.countryCode === 'GB');
gbPlants.sort((a, b) => (b.annualEnergyGWh || 0) - (a.annualEnergyGWh || 0));

console.log(`Total GB plants: ${gbPlants.length}`);
console.log('Batch 2 (Rank 41 to 80):');
const batch2 = gbPlants.slice(40, 80);
batch2.forEach((p, idx) => {
  console.log(`${idx + 41}. [${p.id}] ${p.name} | GWh: ${p.annualEnergyGWh} | Op: ${p.operator} | Feedstock: ${p.primaryFeedstockCategory}`);
});
