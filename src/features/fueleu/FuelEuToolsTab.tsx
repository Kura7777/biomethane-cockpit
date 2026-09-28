import React, { useState } from 'react';
import { VesselArchetypeCalculator } from './VesselArchetypeCalculator';
import { DualCommercialPathwaySimulator, DualCommercialPathwayInitial } from './DualCommercialPathwaySimulator';
import './vesselArchetypeCalculator.css';

type ToolId = 'ARCHETYPES' | 'PATHWAYS';

/** Tools tab: a small segmented switch between the existing Vessel archetypes calculator and the
 *  Commercial pathways (Art. 21) simulator — same tools, unified under the FuelEU desk tokens.
 *  Also hosts the hand-off from a deficit vessel in the archetypes flow to a prefilled pathways
 *  comparison ("Compare pathways for this vessel"). */
export function FuelEuToolsTab() {
  const [tool, setTool] = useState<ToolId>('ARCHETYPES');
  const [pathwayInitial, setPathwayInitial] = useState<DualCommercialPathwayInitial | undefined>(undefined);

  // Manually switching tabs starts the target flow fresh — only the explicit hand-off below
  // carries a prefill across.
  const selectTool = (id: ToolId) => {
    setTool(id);
    setPathwayInitial(undefined);
  };

  const handleComparePathways = (initial: DualCommercialPathwayInitial) => {
    setPathwayInitial(initial);
    setTool('PATHWAYS');
  };

  return (
    <div className="fe-container fe-tools">
      <div className="fe-seg" role="group" aria-label="Tool selector">
        <button type="button" className={tool === 'ARCHETYPES' ? 'active' : ''} onClick={() => selectTool('ARCHETYPES')}>
          Vessel archetypes
        </button>
        <button type="button" className={tool === 'PATHWAYS' ? 'active' : ''} onClick={() => selectTool('PATHWAYS')}>
          Commercial pathways
        </button>
      </div>
      {tool === 'ARCHETYPES' ? (
        <VesselArchetypeCalculator onComparePathways={handleComparePathways} />
      ) : (
        <DualCommercialPathwaySimulator initial={pathwayInitial} />
      )}
    </div>
  );
}
