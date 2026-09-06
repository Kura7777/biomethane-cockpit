import React, { useState, useMemo } from 'react';
import { DATA_SOURCES_DIRECTORY, DataSourceRecord, ProvenanceTier } from '../../domain/provenance/dataSourcesDirectory';

type CategoryFilter = 'All' | 'Plants' | 'Pricing' | 'Registries' | 'Logistics';

function formatCadence(freq: string): string {
  switch (freq) {
    case 'REAL_TIME_API':
      return 'Real-time API';
    case 'DAILY':
      return 'Daily';
    case 'MONTHLY':
      return 'Monthly';
    case 'ANNUAL':
      return 'Annual';
    case 'STATUTORY_FIXED':
      return 'Fixed';
    default:
      return freq;
  }
}

function getTierDisplay(tier: ProvenanceTier): { label: string; isAccent: boolean } {
  switch (tier) {
    case 'BROKER_REPORTED_QUOTE':
      return { label: 'Broker reported', isAccent: true };
    case 'MODELLED_ENGINEERING':
      return { label: 'Modelled engineering', isAccent: true };
    case 'STATUTORY_DIRECTIVE':
      return { label: 'Statutory directive', isAccent: false };
    case 'TSO_OFFICIAL_DATA':
      return { label: 'TSO official', isAccent: false };
    case 'INDUSTRY_BODY_CENSUS':
      return { label: 'Industry census', isAccent: false };
    case 'BUYER_SPECIFIED_RFQ':
      return { label: 'Buyer specified', isAccent: false };
    default:
      return { label: tier, isAccent: false };
  }
}

export function DataSourcesScreen() {
  const [filter, setFilter] = useState<CategoryFilter>('All');

  const filteredSources = useMemo(() => {
    return DATA_SOURCES_DIRECTORY.filter(s => {
      if (filter === 'All') return true;
      if (filter === 'Plants') return s.category === 'PLANTS_INFRASTRUCTURE';
      if (filter === 'Pricing') return s.category === 'MARKET_PRICING_BENCHMARKS' || s.category === 'FEEDSTOCKS_CARBON_INTENSITY';
      if (filter === 'Registries') return s.category === 'REGISTRIES_MASS_BALANCE';
      if (filter === 'Logistics') return s.category === 'LOGISTICS_INTERCONNECTORS';
      return true;
    });
  }, [filter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
          padding: '16px 18px',
          borderBottom: '2px solid var(--color-divider)',
        }}
      >
        <div>
          <h3 className="ptitle font-heading font-extrabold text-[20px] m-0">Data sources &amp; provenance</h3>
          <div className="subttl text-[12px] mt-1">
            Every figure on the desk resolves to one of these sources, with its authority, cadence and the fields it does not cover
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {(['All', 'Plants', 'Pricing', 'Registries', 'Logistics'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              className={`chip ${filter === cat ? 'chip-a' : ''} cursor-pointer`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '0 18px 18px', overflowX: 'auto' }}>
        <table className="table" style={{ fontSize: '13px' }}>
          <thead>
            <tr>
              <th>Source</th>
              <th style={{ width: '220px' }}>Authority</th>
              <th style={{ width: '130px' }}>Category</th>
              <th style={{ width: '160px' }}>Coverage</th>
              <th style={{ width: '110px' }}>Cadence</th>
              <th style={{ width: '170px' }}>Provenance tier</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.map(s => {
              const tierInfo = getTierDisplay(s.provenanceTier);
              return (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: '11px' }} className="mut">
                      {s.legalBasis || s.sourceDocumentOrUrl}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{s.authority}</td>
                  <td style={{ fontSize: '12px' }}>{s.categoryLabel}</td>
                  <td className="num" style={{ fontSize: '12px' }}>{s.coverageCount}</td>
                  <td style={{ fontSize: '12px' }}>{formatCadence(s.updateFrequency)}</td>
                  <td>
                    <span className={`chip ${tierInfo.isAccent ? 'chip-a' : ''}`}>
                      {tierInfo.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
