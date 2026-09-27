import { RAW_BIOMETHANE_PLANTS } from '../src/domain/plants/plantsData';

const p = RAW_BIOMETHANE_PLANTS.find(x => x.id === 'plant_uk_45');
console.log(p);
