import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MarksScreen } from '../marks/MarksScreen';
import { CostsScreen } from './CostsScreen';
import { AssumptionsScreen } from '../settings/AssumptionsScreen';
import { Tabs, TabItem } from '../../shared/ui/Tabs';
import { useAppState } from '../../store/context';
import { isDeThgBundleMarkId } from '../../domain/markets/deThgBundle';
import { isSimulatedMark } from '../../domain/marks/applyMarks';

type PricingTab = 'prices' | 'costs' | 'assumptions';

function isValidTab(v: string | null): v is PricingTab {
  return v === 'prices' || v === 'costs' || v === 'assumptions';
}

/**
 * The one place the desk is priced: market prices (marks), costs, and desk assumptions.
 * Tab lives in the URL (?tab=) so links can open a specific section — #/assumptions redirects
 * to the assumptions tab here, and every "Edit costs" link opens straight to the costs tab.
 */
export function PricingScreen() {
  const [params, setParams] = useSearchParams();
  const { state } = useAppState();
  const tabParam = params.get('tab');
  const activeTab: PricingTab = isValidTab(tabParam) ? tabParam : 'prices';

  const markSourceCounts = useMemo(() => {
    let broker = 0;
    let manual = 0;
    let simulated = 0;
    Object.entries(state.marks.marks).filter(([id]) => !isDeThgBundleMarkId(id)).map(([, m]) => m).forEach(m => {
      if (isSimulatedMark(m)) {
        simulated++;
      } else if (m.source?.toLowerCase().includes('manual') || m.provenance?.sourceName?.toLowerCase().includes('manual')) {
        manual++;
      } else {
        broker++;
      }
    });
    return { broker, manual, simulated };
  }, [state.marks.marks]);

  const setTab = (tab: PricingTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    setParams(next, { replace: true });
  };

  const tabs: TabItem<PricingTab>[] = [
    { id: 'prices', label: 'Market prices' },
    { id: 'costs', label: 'Costs' },
    { id: 'assumptions', label: 'Desk assumptions' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>
          Everything that prices the app is set here: market prices, costs and desk assumptions.
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className="chip chip-info">{markSourceCounts.broker} broker</span>
          <span className="chip chip-pos">{markSourceCounts.manual} manual</span>
          <span className="chip chip-warn">{markSourceCounts.simulated} simulated</span>
        </div>
      </div>

      <div style={{ padding: '10px 18px 0', backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-divider)' }}>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setTab} ariaLabel="Pricing desk sections" />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {activeTab === 'prices' && <MarksScreen />}
        {activeTab === 'costs' && <CostsScreen />}
        {activeTab === 'assumptions' && <AssumptionsScreen />}
      </div>
    </div>
  );
}
