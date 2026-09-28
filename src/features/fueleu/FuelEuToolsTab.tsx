import React, { useState } from 'react';
import { VesselArchetypeCalculator } from './VesselArchetypeCalculator';
import { DualCommercialPathwaySimulator } from './DualCommercialPathwaySimulator';
import './vesselArchetypeCalculator.css';

type ToolId = 'ARCHETYPES' | 'PATHWAYS';

/** Tools tab: a small segmented switch between the existing Vessel archetypes calculator and the
 *  Commercial pathways (Art. 21) simulator — same tools, unified under the FuelEU desk tokens. */
export function FuelEuToolsTab() {
  const [tool, setTool] = useState<ToolId>('ARCHETYPES');

  return (
    <div className="fe-container fe-tools">
      <div className="fe-seg" role="group" aria-label="Tool selector">
        <button type="button" className={tool === 'ARCHETYPES' ? 'active' : ''} onClick={() => setTool('ARCHETYPES')}>
          Vessel archetypes
        </button>
        <button type="button" className={tool === 'PATHWAYS' ? 'active' : ''} onClick={() => setTool('PATHWAYS')}>
          Commercial pathways
        </button>
      </div>
      {tool === 'ARCHETYPES' ? <VesselArchetypeCalculator /> : <DualCommercialPathwaySimulator />}
    </div>
  );
}
