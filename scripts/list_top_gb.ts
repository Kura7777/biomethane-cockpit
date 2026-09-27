import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';

const gbPlants = RAW_BIOMETHANE_PLANTS.filter(p => p.countryCode === 'GB');
gbPlants.sort((a, b) => (b.annualEnergyGWh || 0) - (a.annualEnergyGWh || 0));

console.log(`Total GB plants in dataset: ${gbPlants.length}`);
console.log('Top 40 by capacity:');
const top40 = gbPlants.slice(0, 40);
top40.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.id}] ${p.name} | Cap: ${p.capacityNm3h} Nm3/h | GWh: ${p.annualEnergyGWh} | Op: ${p.operator} | Feedstock: ${p.primaryFeedstockCategory}`);
});
