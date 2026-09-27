import React, { useState } from 'react';
import { VesselArchetypeCalculator } from './VesselArchetypeCalculator';
import { DualCommercialPathwaySimulator } from './DualCommercialPathwaySimulator';

type ToolId = 'ARCHETYPES' | 'PATHWAYS';

/** Tools tab: a small segmented switch between the existing Vessel archetypes calculator and the
 *  Commercial pathways (Art. 21) simulator — same tools, unified under the FuelEU desk tokens. */
export function FuelEuToolsTab() {
  const [tool, setTool] = useState<ToolId>('ARCHETYPES');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--fe-line)', backgroundColor: 'var(--fe-surface)' }}>
        <div className="fe-seg" role="group" aria-label="Tool selector">
          <button type="button" className={tool === 'ARCHETYPES' ? 'active' : ''} onClick={() => setTool('ARCHETYPES')}>
            Vessel archetypes
          </button>
          <button type="button" className={tool === 'PATHWAYS' ? 'active' : ''} onClick={() => setTool('PATHWAYS')}>
            Commercial pathways
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {tool === 'ARCHETYPES' ? <VesselArchetypeCalculator /> : <DualCommercialPathwaySimulator />}
      </div>
    </div>
  );
}
