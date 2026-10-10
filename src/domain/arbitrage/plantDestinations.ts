import { compareDestinations, DestinationRow } from './destinationComparison';
import { feedstockKeyForPlant } from '../trade/dealDefaults';
import { plantFeedstockForCi, reportedCiForPlant } from '../plants/compliance';
import type { BiomethanePlant } from '../plants/types';
import type { CostInputs, MarksState } from '../netback/types';

/**
 * "Where can this gas go?" for one plant (or an origin with no plant): the plant's own feedstock,
 * its published CI when it has one, else that feedstock's default CI. The map's comparison and the
 * plant drawer's "Optimal route" both read this, so they cannot disagree.
 */
export function compareDestinationsForPlant(args: {
  origin: string;
  plant: BiomethanePlant | null;
  marks: MarksState;
  costs: CostInputs;
}): DestinationRow[] {
  const { origin, plant, marks, costs } = args;
  return compareDestinations({
    origin,
    marks,
    costs,
    feedstockKey: plant ? feedstockKeyForPlant(plant) : undefined,
    feedstockMixed: plant ? Boolean(plantFeedstockForCi(plant.id)?.mixed) : false,
    reportedCi: plant ? reportedCiForPlant(plant.id) : null,
  });
}
