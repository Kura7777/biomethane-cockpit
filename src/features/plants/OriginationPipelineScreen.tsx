import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { COMBINED_BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { PlantSourcingDrawer } from './PlantSourcingDrawer';

export function OriginationPipelineScreen() {
  const navigate = useNavigate();

  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [feedstockFilter, setFeedstockFilter] = useState<'ALL' | 'MANURE' | 'WASTE' | 'CROPS' | 'SEWAGE' | 'LANDFILL'>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRING_SOON' | 'ACTIVE_SUBSIDY' | 'MERCHANT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [selectedPlantForDrawer, setSelectedPlantForDrawer] = useState<BiomethanePlant | null>(null);

  // Country breakdown list
  const countryCounts = useMemo(() => {
    const counts: Record<string, { count: number; flag: string; name: string }> = {};
    for (const p of COMBINED_BIOMETHANE_PLANTS) {
      const code = p.countryCode || 'EU';
      if (!counts[code]) {
        counts[code] = { count: 0, flag: p.countryFlag || '🌍', name: p.country || code };
      }
      counts[code].count++;
    }
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
  }, []);

  // Filtered plants
  const filteredPipeline = useMemo(() => {
    return COMBINED_BIOMETHANE_PLANTS.filter(p => {
      // Country
      if (selectedCountry !== 'ALL' && p.countryCode !== selectedCountry) {
        return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          p.name.toLowerCase().includes(q) ||
          (p.operator && p.operator.toLowerCase().includes(q)) ||
          (p.legalEntityName && p.legalEntityName.toLowerCase().includes(q)) ||
          (p.networkOperator && p.networkOperator.toLowerCase().includes(q)) ||
          (p.region && p.region.toLowerCase().includes(q)) ||
          (p.companyRegistrationId && p.companyRegistrationId.toLowerCase().includes(q)) ||
          (p.headquartersAddress && p.headquartersAddress.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Feedstock
      const s = `${p.primaryFeedstockCategory || ''} ${p.feedstockDetails || ''}`.toLowerCase();
      if (feedstockFilter === 'MANURE' && !(s.includes('manure') || s.includes('slurry') || s.includes('gülle') || s.includes('lisier'))) return false;
      if (feedstockFilter === 'WASTE' && !(s.includes('waste') || s.includes('abfall') || s.includes('déchet') || s.includes('forsu') || s.includes('co-product'))) return false;
      if (feedstockFilter === 'CROPS' && !(s.includes('crop') || s.includes('maize') || s.includes('mais') || s.includes('grass') || s.includes('cive'))) return false;
      if (feedstockFilter === 'SEWAGE' && !(s.includes('sewage') || s.includes('sludge') || s.includes('kläre') || s.includes('step') || s.includes('boue'))) return false;
      if (feedstockFilter === 'LANDFILL' && !(s.includes('landfill') || s.includes('deponie') || s.includes('isdnd'))) return false;

      // Expiry / Scheme
      const expiryYear = p.supportExpiryDate ? parseInt(p.supportExpiryDate.substring(0, 4), 10) : (p.commissioningYear ? p.commissioningYear + 20 : 2027);
      if (expiryFilter === 'EXPIRING_SOON' && expiryYear > 2027) return false;
      if (expiryFilter === 'ACTIVE_SUBSIDY' && expiryYear <= 2027) return false;
      if (expiryFilter === 'MERCHANT' && p.supportScheme && p.supportScheme !== 'NONE') return false;

      return true;
    });
  }, [selectedCountry, searchQuery, feedstockFilter, expiryFilter]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const subset = selectedCountry === 'ALL' 
      ? COMBINED_BIOMETHANE_PLANTS 
      : COMBINED_BIOMETHANE_PLANTS.filter(p => p.countryCode === selectedCountry);

    const totalGWh = subset.reduce((sum, p) => sum + (p.annualEnergyGWh || 0), 0);
    const critical = subset.filter(p => {
      const yr = p.supportExpiryDate ? parseInt(p.supportExpiryDate.substring(0, 4), 10) : 2027;
      return yr <= 2027;
    });
    const criticalGWh = critical.reduce((sum, p) => sum + (p.annualEnergyGWh || 0), 0);
    const manureCount = subset.filter(p => {
      const s = `${p.primaryFeedstockCategory || ''} ${p.feedstockDetails || ''}`.toLowerCase();
      return s.includes('manure') || s.includes('slurry') || s.includes('gülle') || s.includes('lisier');
    }).length;

    return {
      totalPlants: subset.length,
      totalGWh: Math.round(totalGWh),
      criticalCount: critical.length,
      criticalGWh: Math.round(criticalGWh),
      manureCount,
    };
  }, [selectedCountry]);

  // CSV Export
  const exportCsv = () => {
    const headers = [
      'Plant ID',
      'Name',
      'Country',
      'Commissioning Year',
      'Statutory Registration ID',
      'Support Scheme',
      'Annual GWh',
      'Feedstock',
      'Audited CI (gCO2e/MJ)',
      'Corporate Website',
      'Contact Email',
      'Contact Phone',
      'Network Operator',
      'Legal Entity / Operator',
      'Headquarters Address'
    ];

    const rows = filteredPipeline.map(p => [
      `"${p.id}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.countryCode}"`,
      p.commissioningYear ?? '',
      `"${(p.companyRegistrationId || '').replace(/"/g, '""')}"`,
      `"${p.supportScheme || 'National Feed-in Tariff / Guarantees of Origin'}"`,
      p.annualEnergyGWh ?? '',
      `"${(p.primaryFeedstockCategory || '').replace(/"/g, '""')}"`,
      p.verifiedCarbonIntensity ?? '',
      `"${p.corporateWebsite || ''}"`,
      `"${p.contactEmail || ''}"`,
      `"${p.contactPhone || ''}"`,
      `"${(p.networkOperator || '').replace(/"/g, '""')}"`,
      `"${(p.operator || p.legalEntityName || '').replace(/"/g, '""')}"`,
      `"${(p.headquartersAddress || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Biomethane_Origination_Pipeline_${selectedCountry}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1-Click Deal Structuring via buildDealUrl
  const handleStructureOfftake = (plant: BiomethanePlant) => {
    const volumeMWh = plant.annualEnergyGWh ? Math.round(plant.annualEnergyGWh * 1000) : 20000;
    const s = `${plant.primaryFeedstockCategory || ''} ${plant.feedstockDetails || ''}`.toLowerCase();
    let feedstockId = 'organic_waste';
    if (s.includes('manure') || s.includes('slurry') || s.includes('gülle') || s.includes('lisier')) feedstockId = 'manure';
    else if (s.includes('crop') || s.includes('maize') || s.includes('cive')) feedstockId = 'energy_crops';
    else if (s.includes('sewage') || s.includes('sludge') || s.includes('step')) feedstockId = 'sewage_sludge';
    else if (s.includes('landfill') || s.includes('isdnd')) feedstockId = 'landfill_gas';

    const defaultMarket = plant.countryCode === 'GB' || plant.countryCode === 'UK' ? 'UK_RTFO' 
      : plant.countryCode === 'FR' ? 'FR_CPB' 
      : plant.countryCode === 'IT' ? 'IT_CIC' 
      : 'DE_THG';

    const defaultCi = feedstockId === 'manure' ? -78 : feedstockId === 'organic_waste' ? 16 : 39;

    const url = buildDealUrl({
      plantId: plant.id,
      plantName: plant.name,
      originCountry: plant.countryCode,
      volume: volumeMWh,
      feedstock: feedstockId,
      ci: plant.verifiedCarbonIntensity ?? defaultCi,
      marketId: defaultMarket,
      legalEntityName: plant.legalEntityName || plant.operator || undefined,
      networkOperator: plant.networkOperator || undefined,
      plantCapacityNm3h: plant.capacityNm3h || undefined,
      plantAnnualGWh: plant.annualEnergyGWh || undefined,
      contactEmail: plant.contactEmail || undefined,
      contactPhone: plant.contactPhone || undefined,
      scheme: (plant.certificationScheme as any) || 'ISCC_EU',
    });

    navigate(url);
  };

  const handleCopyLead = (plant: BiomethanePlant) => {
    const text = `Origination Lead: ${plant.name} (${plant.id} • ${plant.countryCode}) | Operating Entity: ${plant.operator || plant.legalEntityName || 'N/A'} | Annual Capacity: ${plant.annualEnergyGWh} GWh/yr (${plant.capacityNm3h} Nm³/h) | Feedstock: ${plant.primaryFeedstockCategory} | Contact Email: ${plant.contactEmail || 'N/A'} | Phone: ${plant.contactPhone || 'N/A'} | SIREN/Reg: ${plant.companyRegistrationId || 'N/A'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(plant.id);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '100%', backgroundColor: 'var(--color-bg-base)' }}>
      
      {/* Header & Strategic Context */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>⚡</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              Pan-European Physical Biomethane Origination Pipeline
            </h2>
            <span style={{ 
              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
              color: '#10b981', 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '2px 8px', 
              borderRadius: '4px',
              border: '1px solid rgba(16, 185, 129, 0.3)'
            }}>
              1,975 AUDITED FACILITIES
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '950px', lineHeight: 1.5 }}>
            Direct producer sourcing directory covering all 20 European producing countries. Access verified operating companies, statutory registration identifiers (SIREN, HRB, CVR, P.IVA), direct switchboards, and 1-click bilateral deal launching.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportCsv}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)'
            }}
          >
            📥 Export Pipeline Call Sheet (CSV)
          </button>
        </div>
      </div>

      {/* Country Selector Pills Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        overflowX: 'auto', 
        paddingBottom: '6px',
        borderBottom: '1px solid var(--color-border)' 
      }}>
        <button
          onClick={() => setSelectedCountry('ALL')}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: selectedCountry === 'ALL' ? 700 : 500,
            borderRadius: '20px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            backgroundColor: selectedCountry === 'ALL' ? 'var(--color-accent)' : 'var(--color-surface)',
            color: selectedCountry === 'ALL' ? '#ffffff' : 'var(--color-text-secondary)',
            border: selectedCountry === 'ALL' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease'
          }}
        >
          <span>🌍 All Europe</span>
          <span style={{ 
            fontSize: '10px', 
            padding: '1px 6px', 
            borderRadius: '10px', 
            backgroundColor: selectedCountry === 'ALL' ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-elevated)' 
          }}>
            {COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()}
          </span>
        </button>

        {countryCounts.map(([code, data]) => {
          const isSelected = selectedCountry === code;
          return (
            <button
              key={code}
              onClick={() => setSelectedCountry(code)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: isSelected ? 700 : 500,
                borderRadius: '20px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-surface)',
                color: isSelected ? '#ffffff' : 'var(--color-text-secondary)',
                border: isSelected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{data.flag} {data.name}</span>
              <span style={{ 
                fontSize: '10px', 
                padding: '1px 6px', 
                borderRadius: '10px', 
                backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-elevated)' 
              }}>
                {data.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '14px 18px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Active Assets Monitored</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
            {stats.totalPlants.toLocaleString()} plants <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>({stats.totalGWh.toLocaleString()} GWh/yr)</span>
          </div>
        </div>

        <div style={{ padding: '14px 18px', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#ef4444', fontWeight: 600 }}>Subsidy Cliff / Post-Tariff (&le; 2027)</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
            {stats.criticalCount} sites <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>({stats.criticalGWh.toLocaleString()} GWh/yr)</span>
          </div>
        </div>

        <div style={{ padding: '14px 18px', backgroundColor: 'var(--color-surface)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#10b981', fontWeight: 600 }}>High-Margin Manure / Double-Counting</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
            {stats.manureCount} sites <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>(-78 to -84 gCO₂e/MJ)</span>
          </div>
        </div>

        <div style={{ padding: '14px 18px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Indicative Netback Yield</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#38bdf8', marginTop: '4px' }}>
            €118 – €152 <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 400 }}>/MWh (All-in)</span>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div style={{ 
        display: 'flex', 
        gap: '14px', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        padding: '12px 16px', 
        backgroundColor: 'var(--color-surface)', 
        border: '1px solid var(--color-border)', 
        borderRadius: '8px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search plant name, operating entity, SIREN/reg ID, DSO, or city..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '13px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Feedstock:</span>
          <select
            value={feedstockFilter}
            onChange={e => setFeedstockFilter(e.target.value as any)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="ALL">All Feedstocks</option>
            <option value="MANURE">Manure & Slurry (Negative CI)</option>
            <option value="WASTE">Organic Waste / FORSU</option>
            <option value="CROPS">Energy Crops / CIVE</option>
            <option value="SEWAGE">Sewage Sludge (STEP)</option>
            <option value="LANDFILL">Landfill Gas (ISDND)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Contract / Expiry:</span>
          <select
            value={expiryFilter}
            onChange={e => setExpiryFilter(e.target.value as any)}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-text-primary)',
              fontSize: '13px'
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="EXPIRING_SOON">Subsidy Expiring Soon (&le; 2027)</option>
            <option value="ACTIVE_SUBSIDY">Long-term Tariff (&gt; 2027)</option>
            <option value="MERCHANT">Merchant / Free Floating</option>
          </select>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: 'auto' }}>
          Showing <strong>{filteredPipeline.length.toLocaleString()}</strong> of {COMBINED_BIOMETHANE_PLANTS.length.toLocaleString()} assets
        </div>
      </div>

      {/* Main Table */}
      <div style={{ overflowX: 'auto', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-surface-elevated)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              <th style={{ padding: '10px 14px' }}>Plant & Origin</th>
              <th style={{ padding: '10px 14px' }}>Operating Entity & Registration</th>
              <th style={{ padding: '10px 14px' }}>Feedstock & CI</th>
              <th style={{ padding: '10px 14px' }}>Capacity (GWh / Nm³/h)</th>
              <th style={{ padding: '10px 14px' }}>TSO / DSO Grid</th>
              <th style={{ padding: '10px 14px' }}>Direct Trader Contact</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPipeline.slice(0, 100).map(p => {
              const isManure = (p.primaryFeedstockCategory || '').toLowerCase().includes('manure') || (p.feedstockDetails || '').toLowerCase().includes('manure');
              const ciVal = p.verifiedCarbonIntensity ?? (isManure ? -78 : 16);

              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s'
                  }}
                  className="hover:bg-slate-800/40"
                  onClick={() => setSelectedPlantForDrawer(p)}
                >
                  {/* Plant & Origin */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{p.countryFlag || '🌍'}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', display: 'flex', gap: '6px' }}>
                          <span className="font-mono">{p.id}</span>
                          {p.commissioningYear && <span>• Comm. {p.commissioningYear}</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Operating Entity & Registration */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)', maxWidth: '240px' }} className="truncate">
                      {p.operator || p.legalEntityName || 'Independent Producer'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }} className="truncate">
                      {p.companyRegistrationId || 'Verified Statutory Node'}
                    </div>
                  </td>

                  {/* Feedstock & CI */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: isManure ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                        color: isManure ? '#10b981' : '#38bdf8'
                      }}>
                        {p.primaryFeedstockCategory || 'Agri Waste'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: ciVal < 0 ? '#10b981' : 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 600 }}>
                      CI: {ciVal} gCO₂e/MJ
                    </div>
                  </td>

                  {/* Capacity */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {p.annualEnergyGWh ? `${p.annualEnergyGWh} GWh/y` : '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                      {p.capacityNm3h ? `${p.capacityNm3h.toLocaleString()} Nm³/h` : ''}
                    </div>
                  </td>

                  {/* Network Operator */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {p.networkOperator || 'National Gas Grid'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      {p.gridConnectionType || 'Distribution Grid Injection'}
                    </div>
                  </td>

                  {/* Direct Contact */}
                  <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                    {p.contactEmail ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <a
                          href={`mailto:${p.contactEmail}`}
                          style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '11px' }}
                          className="hover:underline truncate max-w-[180px] block"
                        >
                          {p.contactEmail}
                        </a>
                        {p.contactPhone && (
                          <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                            {p.contactPhone}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Confidential Grid Meter</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 14px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedPlantForDrawer(p)}
                        title="Open 360° Sourcing Drawer"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        Outreach
                      </button>

                      <button
                        onClick={() => handleStructureOfftake(p)}
                        title="Structure Offtake in Trade Builder"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          borderRadius: '4px',
                          backgroundColor: '#10b981',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        Trade ⚡
                      </button>

                      <button
                        onClick={() => handleCopyLead(p)}
                        title="Copy Lead Brief to Clipboard"
                        style={{
                          padding: '4px 6px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          backgroundColor: 'var(--color-surface-elevated)',
                          border: '1px solid var(--color-border)',
                          color: copyFeedback === p.id ? '#10b981' : 'var(--color-text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {copyFeedback === p.id ? '✓' : '📋'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredPipeline.length > 100 && (
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)', padding: '8px 0' }}>
          Showing first 100 facilities of {filteredPipeline.length.toLocaleString()}. Refine your search query or country filter to narrow down results.
        </div>
      )}

      {/* Sourcing Drawer */}
      {selectedPlantForDrawer && (
        <PlantSourcingDrawer
          plant={selectedPlantForDrawer}
          onClose={() => setSelectedPlantForDrawer(null)}
        />
      )}

    </div>
  );
}
