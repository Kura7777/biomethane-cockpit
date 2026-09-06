import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  COMBINED_BIOMETHANE_PLANTS,
  COUNTRY_MACRO_STATS, 
  searchPlants 
} from '../../domain/plants/registry';
import { BiomethanePlant } from '../../domain/plants/types';

export function PlantsScreen() {
  const navigate = useNavigate();
  const [plantQuery, setPlantQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'GRID_INJECTED' | 'DE' | 'FR' | 'DK' | 'IT' | 'NL' | 'GB' | 'ES'>('ALL');
  const [modalPlant, setModalPlant] = useState<BiomethanePlant | null>(null);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalPlant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredPlants = useMemo(() => {
    let list = plantQuery.trim() ? searchPlants(plantQuery) : COMBINED_BIOMETHANE_PLANTS;

    if (selectedFilter === 'GRID_INJECTED') {
      list = list.filter(p => p.isVerified || Boolean(p.networkOperator) || (p.gridConnectionType && !p.gridConnectionType.toLowerCase().includes('off-grid')));
    } else if (selectedFilter === 'DE') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'DE');
    } else if (selectedFilter === 'FR') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'FR');
    } else if (selectedFilter === 'DK') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'DK');
    } else if (selectedFilter === 'IT') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'IT');
    } else if (selectedFilter === 'NL') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'NL');
    } else if (selectedFilter === 'GB') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'GB');
    } else if (selectedFilter === 'ES') {
      list = list.filter(p => (p.countryCode || '').toUpperCase() === 'ES');
    }

    return list;
  }, [plantQuery, selectedFilter]);

  const maxMacroPlants = useMemo(() => {
    const values = COUNTRY_MACRO_STATS.map(c => c.activePlants);
    return Math.max(...values, 1);
  }, []);

  const renderUnrecorded = (val: string | number | null | undefined) => {
    if (val === null || val === undefined || val === '') {
      return <span style={{ color: 'var(--color-neutral-600)' }}>unrecorded</span>;
    }
    return val;
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 320px',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* ─── Left Column: Table & Filters ─── */}
      <div
        style={{
          borderRight: '2px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        {/* Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '20px',
            padding: '16px 18px',
            borderBottom: '2px solid var(--color-divider)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 className="ptitle">Plant registry</h3>
            <div className="subttl">
              1,975 facilities across 28 jurisdictions · GIE / EBA European Biomethane Map 2026, annual census
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '5px 10px', height: '32px' }}
              onClick={() => navigate('/registries')}
            >
              Registries & Flows →
            </button>
            <input
              className="input"
              style={{ width: '190px' }}
              placeholder="Filter facility name"
              aria-label="Filter facility name"
              value={plantQuery}
              onChange={e => setPlantQuery(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`chip ${selectedFilter === 'ALL' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('ALL')}
              >
                All (1,975)
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'GRID_INJECTED' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('GRID_INJECTED')}
                title="Filter for verified grid-injected biomethane facilities connected to TSO/DSO networks"
              >
                ⚡ Grid Injected
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'DE' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('DE')}
              >
                🇩🇪 DE
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'FR' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('FR')}
              >
                🇫🇷 FR
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'DK' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('DK')}
              >
                🇩🇰 DK
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'IT' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('IT')}
              >
                🇮🇹 IT
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'NL' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('NL')}
              >
                🇳🇱 NL
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'GB' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('GB')}
              >
                🇬🇧 GB
              </button>
              <button
                type="button"
                className={`chip ${selectedFilter === 'ES' ? 'chip-a' : ''}`}
                onClick={() => setSelectedFilter('ES')}
              >
                🇪🇸 ES
              </button>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {filteredPlants.length === 0 ? (
          <div
            style={{
              padding: '56px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '10px',
              maxWidth: '520px',
            }}
          >
            <div className="eyebrow">No matching facility</div>
            <h4 style={{ margin: 0, fontSize: '22px' }}>
              Nothing in the register matches &ldquo;{plantQuery}&rdquo;
            </h4>
            <p style={{ fontSize: '13px', lineHeight: 1.6, margin: 0 }} className="mut">
              The GIE/EBA census indexes facilities by the name the national TSO publishes, which is often the commune rather than the operator&apos;s trading name. Try the commune, or clear the filter and use the country chips.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setPlantQuery('');
                setSelectedFilter('ALL');
              }}
            >
              Clear filter
            </button>
          </div>
        ) : (
          <div style={{ padding: '0 18px 18px', flex: 1, overflowY: 'auto' }} className="noscroll">
            <table className="table" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '34px' }}>CC</th>
                  <th>Facility</th>
                  <th style={{ width: '150px' }}>Operator</th>
                  <th style={{ width: '90px', textAlign: 'right' }}>Nm³/h</th>
                  <th style={{ width: '88px', textAlign: 'right' }}>GWh/y</th>
                  <th style={{ width: '150px' }}>Feedstock</th>
                  <th style={{ width: '118px' }}>Provenance</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants.map(p => {
                  const isVer = !!p.isVerified;
                  return (
                    <tr
                      key={p.id}
                      data-click="1"
                      onClick={() => setModalPlant(p)}
                    >
                      <td className="num mut" style={{ fontWeight: 600 }}>{p.countryCode}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{renderUnrecorded(p.operator || p.legalEntityName)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {renderUnrecorded(p.capacityNm3h ? p.capacityNm3h.toLocaleString() : null)}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {renderUnrecorded(p.annualEnergyGWh ? p.annualEnergyGWh.toFixed(1) : null)}
                      </td>
                      <td>{renderUnrecorded(p.primaryFeedstockCategory || p.feedstockDetails)}</td>
                      <td>
                        <span className={`chip ${isVer ? '' : 'chip-a'}`}>
                          {isVer ? 'Verified' : 'Name only'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Unverified census footer note */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 18px',
            borderTop: '2px solid var(--color-accent)',
            backgroundColor: 'var(--color-accent-100)',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              padding: '3px 8px',
              flex: 'none',
            }}
          >
            Unverified
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-accent-900)' }}>
            1,843 of 1,975 facilities carry facility name and country only — capacity, coordinates and operator are unverified in the GIE/EBA source map. Do not price a trade off an unverified row.
          </span>
        </div>
      </div>

      {/* ─── Right Column: Country Totals Rail ─── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface)',
          minWidth: 0,
        }}
      >
        <div style={{ padding: '16px 18px', borderBottom: '2px solid var(--color-divider)' }}>
          <div className="eyebrow">Country totals</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }} className="mut">
            Facilities and installed production by jurisdiction
          </div>
        </div>

        <div style={{ padding: '12px 18px', overflowY: 'auto' }} className="noscroll">
          {COUNTRY_MACRO_STATS.map(c => {
            const barWidth = (c.activePlants / maxMacroPlants) * 100;
            return (
              <div key={c.iso} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                  <span className="num" style={{ width: '24px', fontSize: '12px', fontWeight: 600 }}>{c.iso}</span>
                  <span style={{ flex: 1, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.country}
                  </span>
                  <span className="num" style={{ fontSize: '13px', fontWeight: 600 }}>{c.activePlants}</span>
                  <span className="num mut" style={{ fontSize: '11px', width: '56px', textAlign: 'right' }}>
                    {c.installedCapacityTWh ? `${c.installedCapacityTWh.toFixed(1)} TWh` : '—'}
                  </span>
                </div>
                <div style={{ height: '3px', marginTop: '6px', backgroundColor: 'color-mix(in srgb, var(--color-text) 10%, transparent)' }}>
                  <div style={{ height: '3px', width: `${barWidth}%`, backgroundColor: 'var(--color-text)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Facility Record Modal ─── */}
      {modalPlant && (
        <div
          className="scrim"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Facility record"
          onClick={() => setModalPlant(null)}
        >
          <div
            className="panel"
            style={{
              width: 'min(520px, 100%)',
              backgroundColor: 'var(--color-bg)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '14px 18px',
                backgroundColor: 'var(--color-surface)',
                borderBottom: '2px solid var(--color-divider)',
              }}
            >
              <div>
                <h5 style={{ margin: 0, fontSize: '17px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  {modalPlant.name}
                </h5>
                <div className="eyebrow" style={{ marginTop: '3px' }}>
                  {modalPlant.countryCode} · facility record
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`chip ${modalPlant.isVerified ? '' : 'chip-a'}`}>
                  {modalPlant.isVerified ? 'Verified' : 'Name only'}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setModalPlant(null)}
                >
                  Esc ✕
                </button>
              </div>
            </div>

            {/* 2x4 Hairline Field Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1px',
                backgroundColor: 'var(--color-divider)',
              }}
            >
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Operator</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {renderUnrecorded(modalPlant.operator || modalPlant.legalEntityName)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Status</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  Active · injecting
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Capacity Nm³/h</div>
                <div className="num" style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {renderUnrecorded(modalPlant.capacityNm3h ? modalPlant.capacityNm3h.toLocaleString() : null)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Annual energy GWh</div>
                <div className="num" style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {renderUnrecorded(modalPlant.annualEnergyGWh ? modalPlant.annualEnergyGWh.toFixed(1) : null)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Feedstock</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {renderUnrecorded(modalPlant.primaryFeedstockCategory || modalPlant.feedstockDetails)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Upgrading technology</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {renderUnrecorded(modalPlant.upgradingTechnology)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Grid connection</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {renderUnrecorded(modalPlant.networkOperator)}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '11px 16px' }}>
                <div className="eyebrow">Registry</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {modalPlant.countryCode === 'DE' ? 'dena Biogasregister' : modalPlant.countryCode === 'DK' ? 'Energinet' : modalPlant.countryCode === 'FR' ? 'EEX / ODRE' : modalPlant.countryCode === 'NL' ? 'VertiCer' : 'National registry'}
                </div>
              </div>
            </div>

            {/* Modal Provenance Note */}
            <div style={{ padding: '14px 18px', borderTop: '2px solid var(--color-divider)' }}>
              <p style={{ fontSize: '12px', lineHeight: 1.6, margin: 0 }} className="mut">
                Source: GIE / EBA European Biomethane Map 2026, an annual industry census. 1,843 of 1,975 facilities carry facility name and country only — where a field reads <span style={{ color: 'var(--color-neutral-600)' }}>unrecorded</span> the national TSO does not publish an individual meter declaration. Do not price a trade against an unverified row.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
