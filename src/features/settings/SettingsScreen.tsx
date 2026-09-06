import React, { useState } from 'react';
import { useAppState } from '../../store/context';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import { showToast } from '../../app/DeskToastContainer';

export function SettingsScreen() {
  const { state } = useAppState();
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSaveSettings = () => {
    setSaveSuccess(true);
    showToast('Desk settings updated successfully');
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const originCode = state.consignments.find(c => c.id === state.activeConsignmentId)?.originCountry || 'DK';
  const originName = PRODUCING_ORIGINS[originCode]?.countryName || 'Denmark';

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: 'var(--color-bg)', padding: '24px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '2px solid var(--color-divider)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }} className="font-heading">
              Desk Settings
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }} className="mut">
              Desk trading defaults, pricing side mode, and state import / export.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            {saveSuccess ? '✓ Settings Saved' : 'Save Changes'}
          </button>
        </div>

        {/* SECTION 2: DESK TRADING DEFAULTS */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', flex: 'none' }} />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="font-heading">
              Trading Desk Parameters &amp; Defaults
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">
                Pricing Side Mode
              </span>
              <span className="num" style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-accent-700)', marginTop: '4px' }}>
                {state.marks.pricingSides.certificateSide.toUpperCase()} SIDE
              </span>
              <span style={{ fontSize: '11px' }} className="mut">
                Controls whether netbacks evaluate off Bid, Mid, or Offer marks across all screens.
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">
                Active Benchmark Origin
              </span>
              <span className="num" style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>
                {originCode} ({originName})
              </span>
              <span style={{ fontSize: '11px' }} className="mut">
                Default production origin loaded on opportunity scanner and trade tickets.
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">
                Regulatory Framework
              </span>
              <span className="num" style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>
                RED III / UDB 2026
              </span>
              <span style={{ fontSize: '11px' }} className="mut">
                Directive (EU) 2023/2413 statutory rules and Union Database mass balance gates.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM DIAGNOSTICS & EXPORTS */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }} className="font-heading">
            Data Snapshots &amp; Maintenance
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Export Desk Snapshot</div>
              <div style={{ fontSize: '11px' }} className="mut">Download current marks and custom costs as JSON</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const data = {
                  marks: state.marks,
                  costs: state.costs,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `biomethane-desk-settings-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Settings snapshot exported to JSON');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Export JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

