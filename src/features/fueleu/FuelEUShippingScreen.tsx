import React, { useState } from 'react';
import { CounterpartyDirectoryTable } from './CounterpartyDirectoryTable';
import { VesselArchetypeCalculator } from './VesselArchetypeCalculator';
import { DualCommercialPathwaySimulator } from './DualCommercialPathwaySimulator';
import {
  Ship,
  Anchor,
  Sliders,
  Scale,
  BookOpen,
  Zap,
  Info,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';

type ActiveTab = 'DIRECTORY' | 'CALCULATOR' | 'PATHWAYS';

export function FuelEUShippingScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const totalGroups = FUEL_EU_SHIPPING_COUNTERPARTIES.length;
  const totalVessels = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.vessels_in_scope, 0);

  const tabParam = searchParams.get('tab')?.toUpperCase();
  const initialTab: ActiveTab = (tabParam === 'CALCULATOR' || tabParam === 'PATHWAYS') ? tabParam : 'DIRECTORY';
  const [activeTab, setActiveTabState] = useState<ActiveTab>(initialTab);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'DIRECTORY') {
        next.delete('tab');
      } else {
        next.set('tab', tab.toLowerCase());
      }
      return next;
    }, { replace: true });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Screen Title & Statutory Gating Bar */}
      <div
        style={{
          padding: '14px 18px 10px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <h3 className="ptitle" style={{ margin: 0 }}>FuelEU Maritime Compliance Desk</h3>
            <span className="chip chip-pos">Regulation (EU) 2023/1805 Active</span>
            <span className="chip chip-info">EMSA THETIS-MRV</span>
          </div>
          <div className="subttl">
            Pan-European exposure monitoring, verified EU MRV shipping counterparties ({totalGroups} groups · {totalVessels.toLocaleString()} vessels), ship archetype calculators, and dual commercial abatement pathways.
          </div>
        </div>

        {/* Action / Reference Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => navigate('/citations')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px', height: '30px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <BookOpen size={13} style={{ color: 'var(--color-accent)' }} /> Citations &amp; Legal Basis
          </button>
          <button
            type="button"
            onClick={() => navigate('/data-sources')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '4px 10px', height: '30px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <ShieldCheck size={13} style={{ color: 'var(--color-status-pos-text)' }} /> EU MRV Provenance
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs matching App header navtab style */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          padding: '0 18px'
        }}
      >
        <button
          type="button"
          onClick={() => handleSelectTab('DIRECTORY')}
          className={`navtab ${activeTab === 'DIRECTORY' ? 'active' : ''}`}
          style={{ height: '38px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
        >
          <Ship size={13} style={{ marginRight: '6px' }} /> Counterparty Directory ({totalGroups} Groups · {totalVessels.toLocaleString()} Vessels)
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('CALCULATOR')}
          className={`navtab ${activeTab === 'CALCULATOR' ? 'active' : ''}`}
          style={{ height: '38px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
        >
          <Sliders size={13} style={{ marginRight: '6px' }} /> Vessel Archetype Exposure Calculator
        </button>

        <button
          type="button"
          onClick={() => handleSelectTab('PATHWAYS')}
          className={`navtab ${activeTab === 'PATHWAYS' ? 'active' : ''}`}
          style={{ height: '38px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
        >
          <Scale size={13} style={{ marginRight: '6px' }} /> Dual Commercial Pathways (Art. 20 &amp; 21)
        </button>
      </div>

      {/* Main Tab Body */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'DIRECTORY' && <CounterpartyDirectoryTable />}
        {activeTab === 'CALCULATOR' && <VesselArchetypeCalculator />}
        {activeTab === 'PATHWAYS' && <DualCommercialPathwaySimulator />}
      </div>
    </div>
  );
}
