import { describe, it, expect } from 'vitest';
import { getMarketById } from '../markets/registry';
import { parseProofOfSustainability } from '../consignment/posParser';
import {
  custodyPartsForMarket,
  defaultDealStructure,
  emptyCustodyPack,
  missingPosFields,
  posRecordFromParsed,
} from '../consignment/custody';

describe('custody pack helpers', () => {
  it('asks NL GGE for both documents, a GO market for the GO only and a PoS market for the PoS only', () => {
    expect(custodyPartsForMarket(getMarketById('NL_GGE')!)).toEqual({ paired: true, go: true, pos: true });
    expect(custodyPartsForMarket(getMarketById('DE_GO')!)).toEqual({ paired: false, go: true, pos: false });
    expect(custodyPartsForMarket(getMarketById('DE_THG')!)).toEqual({ paired: false, go: false, pos: true });
  });

  it('starts an empty pack on the desk default structure with nothing declared', () => {
    const pack = emptyCustodyPack();
    expect(pack.structure).toBe(defaultDealStructure());
    expect(pack.go).toBeNull();
    expect(pack.pos).toBeNull();
    expect(pack.claims).toMatchObject({ notUsedElsewhere: null, prtrGrant: 'UNKNOWN', ownTraderCertified: null });
  });

  it('maps an uploaded PoS into a record and lists what is still to enter', () => {
    const rec = posRecordFromParsed(parseProofOfSustainability('ISCC EU\nPoS Number: EU-ISCC-PoS-ES-000123\nTotal GHG emissions: -40 gCO2eq/MJ'));
    expect(rec.posNumber).toBe('EU-ISCC-PoS-ES-000123');
    expect(rec.ciTotal).toBe(-40);
    expect(rec.supportDeclared).toBe('UNKNOWN');
    expect(missingPosFields(rec)).toEqual(['feedstock', 'feedstock origin', 'support declared', 'MWh']);
  });
});
