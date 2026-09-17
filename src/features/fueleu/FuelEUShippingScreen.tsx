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
          padding: '12px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h3 className="ptitle" style={{ margin: 0, fontSize: '18px', letterSpacing: '-0.01em' }}>
              FuelEU Maritime Compliance Desk
            </h3>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '2px 7px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-subtier)',
                color: 'var(--color-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', display: 'inline-block' }} />
              REGULATION (EU) 2023/1805
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '2px 7px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-subtier)',
                color: 'var(--color-muted)',
              }}
            >
              EMSA THETIS-MRV AUDITED
            </span>
          </div>
          <div className="subttl" style={{ fontSize: '12px' }}>
            Pan-European compliance ledger · {totalGroups.toLocaleString()} shipping groups · {totalVessels.toLocaleString()} commercial vessels · Article 20 physical Bio-LNG &amp; Article 21 pooling
          </div>
        </div>

        {/* Action / Reference Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => navigate('/citations')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '0 10px', height: '28px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <BookOpen size={12} style={{ color: 'var(--color-accent)' }} /> Citations &amp; Legal Basis
          </button>
          <button
            type="button"
            onClick={() => navigate('/data-sources')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '0 10px', height: '28px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <ShieldCheck size={12} style={{ color: 'var(--color-status-pos-text)' }} /> EU MRV Provenance
          </button>
        </div>
      </div>

      {/* Institutional Desk Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          padding: '0 18px',
          gap: '2px',
        }}
      >
        {[
          { id: 'DIRECTORY' as const, label: `Counterparty Directory (${totalGroups.toLocaleString()})`, icon: Ship },
          { id: 'CALCULATOR' as const, label: 'Vessel Archetypes', icon: Sliders },
          { id: 'PATHWAYS' as const, label: 'Commercial Pathways (Art. 21)', icon: Scale },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              style={{
                height: '36px',
                padding: '0 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
                color: isActive ? 'var(--color-text)' : 'var(--color-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 150ms ease',
              }}
            >
              <Icon size={13} style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
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
