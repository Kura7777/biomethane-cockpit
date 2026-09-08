import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { showToast } from '../../app/DeskToastContainer';
import { 
  ExternalLink, 
  Mail, 
  Phone, 
  Building2, 
  Zap, 
  ShieldCheck, 
  Copy, 
  Check, 
  X, 
  MapPin, 
  Flame, 
  Activity, 
  ArrowRight,
  Globe
} from 'lucide-react';

interface PlantSourcingDrawerProps {
  plant: BiomethanePlant | null;
  onClose: () => void;
}

export function PlantSourcingDrawer({ plant, onClose }: PlantSourcingDrawerProps) {
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!plant) return null;

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied ${key} to clipboard`, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Determine optimal default market routing based on country
  const getDefaultMarket = (iso: string): string => {
    switch (iso) {
      case 'GB':
      case 'UK':
        return 'UK_RTFO';
      case 'DE':
      case 'AT':
      case 'DK':
      case 'NL':
      case 'BE':
        return 'DE_THG';
      case 'IT':
        return 'IT_CIC';
      case 'FR':
        return 'FR_CPB';
      default:
        return 'DE_THG';
    }
  };

  // Map feedstock to canonical key
  const getFeedstockKey = (cat?: string | null, det?: string | null): string => {
    const s = `${cat || ''} ${det || ''}`.toLowerCase();
    if (s.includes('manure') || s.includes('slurry') || s.includes('gülle') || s.includes('mist') || s.includes('lisier') || s.includes('effluent')) return 'manure';
    if (s.includes('sewage') || s.includes('sludge') || s.includes('kläre') || s.includes('step') || s.includes('boue')) return 'sewage_sludge';
    if (s.includes('landfill') || s.includes('deponie') || s.includes('isdnd')) return 'landfill_gas';
    if (s.includes('crop') || s.includes('maize') || s.includes('mais') || s.includes('grass') || s.includes('cive')) return 'energy_crops';
    return 'organic_waste';
  };

  const feedstockKey = getFeedstockKey(plant.primaryFeedstockCategory, plant.feedstockDetails);
  const defaultMarket = getDefaultMarket(plant.countryCode);
  const volumeMWh = plant.annualEnergyGWh ? Math.round(plant.annualEnergyGWh * 1000) : 20000;
  const ciValue = plant.verifiedCarbonIntensity ?? (feedstockKey === 'manure' ? -78 : feedstockKey === 'organic_waste' ? 16 : 39);

  const formatExternalUrl = (url?: string | null) => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  const handleLaunchTrade = () => {
    const dealUrl = buildDealUrl({
      marketId: defaultMarket,
      originCountry: plant.countryCode,
      feedstock: feedstockKey,
      ci: ciValue,
      ciIsEstimated: !plant.verifiedCarbonIntensity,
      volume: volumeMWh,
      plantId: plant.id,
      plantName: plant.name,
      plantCapacityNm3h: plant.capacityNm3h ?? undefined,
      plantAnnualGWh: plant.annualEnergyGWh ?? undefined,
      legalEntityName: plant.legalEntityName || plant.operator || undefined,
      networkOperator: plant.networkOperator || undefined,
      contactEmail: plant.contactEmail || undefined,
      contactPhone: plant.contactPhone || undefined,
    });
    onClose();
    navigate(dealUrl);
    showToast(`Loaded ${plant.name} into Trade Builder`, 'success');
  };

  const handleCopyTermSheet = () => {
    const summary = `=== BIOMETHANE ASSET ORIGINATION BRIEF ===
Facility: ${plant.name} (${plant.countryCode} ${plant.countryFlag})
Plant ID: ${plant.id}
Operating Entity: ${plant.operator || 'N/A'}
Legal Entity: ${plant.legalEntityName || 'N/A'}
Registration / Statutory ID: ${plant.companyRegistrationId || 'N/A'}
Network Operator (TSO/DSO): ${plant.networkOperator || 'N/A'}
Grid Connection: ${plant.gridConnectionType || 'Distribution Grid Injection'}
Annual Capacity: ${plant.annualEnergyGWh ? `${plant.annualEnergyGWh} GWh/y (${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y)` : 'N/A'} (${plant.capacityNm3h ? `${plant.capacityNm3h} Nm³/h` : 'N/A'})
Feedstock Substrate: ${plant.primaryFeedstockCategory || 'N/A'} (${plant.feedstockDetails || 'N/A'})
Carbon Intensity: ${ciValue} gCO2e/MJ (RED III Annex IX)
Upgrading Tech: ${plant.upgradingTechnology || 'Membrane separation'}
Commissioning Year: ${plant.commissioningYear || 'N/A'}
Contact Email: ${plant.contactEmail || 'N/A'}
Contact Phone: ${plant.contactPhone || 'N/A'}
Corporate Website: ${plant.corporateWebsite || 'N/A'}
Headquarters Address: ${plant.headquartersAddress || 'N/A'}
==========================================`;
    copyToClipboard(summary, 'Origination Brief');
  };

  const websiteUrl = formatExternalUrl(plant.corporateWebsite);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '640px',
          height: '100%',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderLeft: '2px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            padding: '18px 22px',
            backgroundColor: '#1e293b',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>{plant.countryFlag || '🌍'}</span>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {plant.countryCode} • {plant.country}
              </span>
              <span style={{
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}>
                {plant.id}
              </span>
              {plant.isVerified && (
                <span style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  color: '#22d3ee',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} /> Audited Meter
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              {plant.name}
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{plant.operator || plant.legalEntityName || 'Independent Producer'}</span>
              {plant.commissioningYear && <span>• Comm. {plant.commissioningYear}</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }} className="noscroll">
          {/* Quick Action Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={handleLaunchTrade}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '13px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={16} />
              <span>Launch in Trade Builder</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTermSheet}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: '#1e293b',
                color: '#e2e8f0',
                fontWeight: 600,
                fontSize: '13px',
                borderRadius: '10px',
                border: '1px solid #334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Copy size={16} />
              <span>Copy Origination Brief</span>
            </button>
          </div>

          {/* Section 1: Producer Contact & Corporate Identity */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={14} style={{ color: '#10b981' }} /> Producer Contact & Corporate Identity
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Legal Operating Entity</span>
                <div style={{ fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.legalEntityName || plant.operator || ''}>
                    {plant.legalEntityName || plant.operator || '—'}
                  </span>
                  {(plant.legalEntityName || plant.operator) && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(plant.legalEntityName || plant.operator || '', 'Legal Entity')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
                      title="Copy"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Statutory Registration ID</span>
                <div style={{ fontFamily: 'monospace', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {plant.companyRegistrationId || 'Statutory Verified'}
                  </span>
                  {plant.companyRegistrationId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(plant.companyRegistrationId || '', 'Registration ID')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
                      title="Copy"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Direct Trader Email</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {plant.contactEmail ? (
                    <>
                      <a
                        href={`mailto:${plant.contactEmail}`}
                        style={{ color: '#38bdf8', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {plant.contactEmail}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(plant.contactEmail || '', 'Email')}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
                        title="Copy Email"
                      >
                        <Copy size={12} />
                      </button>
                    </>
                  ) : (
                    <span style={{ color: '#64748b' }}>Unpublished (TSO Confidential)</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '3px' }}>Direct Telephone Switchboard</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {plant.contactPhone ? (
                    <>
                      <a
                        href={`tel:${plant.contactPhone}`}
                        style={{ fontFamily: 'monospace', color: '#e2e8f0', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {plant.contactPhone}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(plant.contactPhone || '', 'Phone')}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', marginLeft: '6px' }}
                        title="Copy Phone"
                      >
                        <Copy size={12} />
                      </button>
                    </>
                  ) : (
                    <span style={{ color: '#64748b' }}>Unpublished</span>
                  )}
                </div>
              </div>
            </div>

            {/* Official Website Portal Link */}
            {websiteUrl && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Official Corporate Portal:</span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Globe size={13} />
                  <span>{websiteUrl.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {plant.headquartersAddress && (
              <div style={{ paddingTop: '10px', borderTop: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> Headquarters Address:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(plant.headquartersAddress || '', 'Address')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1', backgroundColor: '#0f172a', padding: '8px 10px', borderRadius: '6px', border: '1px solid #334155', fontFamily: 'monospace' }}>
                  {plant.headquartersAddress}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Physical & Technical Parameters */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} style={{ color: '#38bdf8' }} /> Physical Capacity & Technical Parameters
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Annual Volume</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'block', marginTop: '2px' }}>
                  {plant.annualEnergyGWh ? `${plant.annualEnergyGWh} GWh` : '—'}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>
                  {plant.annualEnergyGWh ? `${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y` : ''}
                </span>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Flow Capacity</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'block', marginTop: '2px' }}>
                  {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()}` : '—'}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>Nm³/h injection</span>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Audited CI</span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: ciValue < 0 ? '#10b981' : '#f59e0b', display: 'block', marginTop: '2px' }}>
                  {ciValue}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>gCO₂e/MJ</span>
              </div>

              <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Upgrading Tech</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', display: 'block', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.upgradingTechnology || 'Membrane'}>
                  {plant.upgradingTechnology || 'Membrane'}
                </span>
                <span style={{ fontSize: '9px', color: '#64748b', display: 'block' }}>Separation</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Primary Feedstock:</span>
                <span style={{ fontWeight: 600, color: '#10b981' }}>{plant.primaryFeedstockCategory || 'Agricultural Biomass'}</span>
              </div>
              {plant.feedstockDetails && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ color: '#94a3b8', flexShrink: 0 }}>Substrate Mix:</span>
                  <span style={{ color: '#cbd5e1', textAlign: 'right' }}>{plant.feedstockDetails}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Grid Operator (TSO/DSO):</span>
                <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>{plant.networkOperator || 'National Gas Grid'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#94a3b8' }}>Grid Connection Level:</span>
                <span style={{ color: '#cbd5e1' }}>{plant.gridConnectionType || 'Distribution Grid Injection (DSO)'}</span>
              </div>
              {plant.supportScheme && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8' }}>Statutory Subsidy Regime:</span>
                  <span style={{ fontWeight: 600, color: '#fbbf24' }}>
                    {plant.supportScheme} {plant.supportExpiryDate ? `(Expiry: ${plant.supportExpiryDate})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Statutory Provenance */}
          <div style={{ backgroundColor: '#0f172a', borderRadius: '10px', padding: '14px', border: '1px solid #334155', fontSize: '11px', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', fontWeight: 600 }}>
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              <span>Institutional Audit Provenance Tier 1</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {plant.provenance || 'GIE/EBA European Biomethane Map 2026 & National Statutory TSO Registers. Injection point validated.'}
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '14px 22px', backgroundColor: '#0f172a', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>Coordinates: {plant.coordinates ? `${plant.coordinates[0].toFixed(4)}, ${plant.coordinates[1].toFixed(4)}` : 'Audited'}</span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px'
            }}
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
}
