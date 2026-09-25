import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { hasApproximateCoordinates } from '../../domain/plants/registry';
import { evaluatePlantContactQuality } from '../../domain/plants/contactQuality';
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
  Globe,
  Scale,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Info,
  Linkedin,
  UserCheck,
  PlusCircle,
  Trash2,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { generateLinkedInOriginationUrl } from '../../domain/plants/statutoryDossiers';
import { 
  getTraderDeskOverride, 
  saveTraderDeskOverride, 
  deleteTraderDeskOverride 
} from '../../domain/plants/deskOverridesStore';
import { TraderDeskOverride, CommercialContactLead } from '../../domain/plants/types';

const LEAD_SOURCE_LABEL: Record<CommercialContactLead['source'], string> = {
  SOURCE_DATASET: 'From registry data',
  SUGGESTED_ROLE: 'Role to ask for',
  INDUSTRY_DIRECTORY: 'Industry association',
  DESK_VERIFIED: 'Desk verified',
};

interface PlantSourcingDrawerProps {
  plant: BiomethanePlant | null;
  onClose: () => void;
}

export function PlantSourcingDrawer({ plant, onClose }: PlantSourcingDrawerProps) {
  const navigate = useNavigate();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deskOverride, setDeskOverride] = useState<TraderDeskOverride | null>(() => plant ? getTraderDeskOverride(plant.id) : null);
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [showRawCensus, setShowRawCensus] = useState(false);
  const [overrideTrader, setOverrideTrader] = useState('');
  const [overrideSignatory, setOverrideSignatory] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  useEffect(() => {
    if (plant) {
      setDeskOverride(getTraderDeskOverride(plant.id));
      setIsEditingOverride(false);
    }
  }, [plant?.id]);

  useEffect(() => {
    const handleOverrideUpdate = (e: any) => {
      if (plant && (e.detail?.plantId === plant.id || e.detail?.plantId === 'all')) {
        setDeskOverride(getTraderDeskOverride(plant.id));
      }
    };
    window.addEventListener('plant-override-updated', handleOverrideUpdate);
    return () => window.removeEventListener('plant-override-updated', handleOverrideUpdate);
  }, [plant?.id]);

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

  // Map feedstock to a FEEDSTOCK_REGISTRY key. Mixed organics map to food_waste — the plant
  // dataset's `organic_waste` is not a registry key, and emitting it made the Trade Builder
  // relabel the deal as manure and drop UK RTFO waste double counting.
  const getFeedstockKey = (cat?: string | null, det?: string | null): string => {
    if (plant.canonicalFeedstockKey) {
      return plant.canonicalFeedstockKey === 'organic_waste' ? 'food_waste' : plant.canonicalFeedstockKey;
    }
    const s = `${cat || ''} ${det || ''}`.toLowerCase();
    if (s.includes('manure') || s.includes('slurry') || s.includes('gülle') || s.includes('mist') || s.includes('lisier') || s.includes('effluent')) return 'manure';
    if (s.includes('sewage') || s.includes('sludge') || s.includes('kläre') || s.includes('step') || s.includes('boue')) return 'sewage_sludge';
    if (s.includes('landfill') || s.includes('deponie') || s.includes('isdnd')) return 'landfill_gas';
    if (s.includes('crop') || s.includes('maize') || s.includes('mais') || s.includes('grass') || s.includes('cive')) return 'energy_crops';
    return 'food_waste';
  };

  const feedstockKey = getFeedstockKey(plant.primaryFeedstockCategory, plant.feedstockDetails);
  const defaultMarket = getDefaultMarket(plant.countryCode);
  // Audited annual energy only — never a generic placeholder volume.
  const volumeMWh = plant.annualEnergyGWh ? Math.round(plant.annualEnergyGWh * 1000) : undefined;
  const ciValue = plant.verifiedCarbonIntensity ?? (feedstockKey === 'manure' ? -78 : feedstockKey === 'energy_crops' ? 39 : 16);

  const formatExternalUrl = (url?: string | null) => {
    if (!url) return '';
    return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
  };

  const handleStartEditOverride = () => {
    setOverrideTrader(deskOverride?.traderName || 'Front-Office Trader');
    // Pre-fill only what the desk or a register has confirmed — never a generated lead
    const registerEntity = plant.verifiedDossier?.verificationStatus === 'REGISTER_CONFIRMED' ? plant.verifiedDossier.officialLegalEntity : null;
    setOverrideSignatory(deskOverride?.counterpartySignatory || registerEntity || '');
    setOverrideEmail(deskOverride?.directEmail || '');
    setOverridePhone(deskOverride?.directPhone || '');
    setOverrideNotes(deskOverride?.notes || '');
    setIsEditingOverride(true);
  };

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideSignatory.trim()) {
      showToast('Counterparty Signatory / Contact Name is required', 'warn');
      return;
    }
    const newOverride: TraderDeskOverride = {
      plantId: plant.id,
      traderName: overrideTrader.trim() || 'Front-Office Trader',
      counterpartySignatory: overrideSignatory.trim(),
      directEmail: overrideEmail.trim() || null,
      directPhone: overridePhone.trim() || null,
      notes: overrideNotes.trim() || null,
      verifiedAt: new Date().toISOString(),
      isConfirmed: true,
    };
    saveTraderDeskOverride(newOverride);
    setDeskOverride(newOverride);
    setIsEditingOverride(false);
    showToast(`Saved desk-verified contact for ${plant.name}`, 'success');
  };

  const handleDeleteOverride = () => {
    deleteTraderDeskOverride(plant.id);
    setDeskOverride(null);
    setIsEditingOverride(false);
    showToast(`Cleared desk override for ${plant.name}`, 'info');
  };

  const handleLaunchTrade = () => {
    // Only desk-confirmed contacts travel into the deal; an unknown entity stays blank
    const verifiedLegal = deskOverride?.counterpartySignatory || plant.verifiedDossier?.officialLegalEntity || undefined;
    const verifiedEmail = deskOverride?.directEmail || undefined;
    const verifiedPhone = deskOverride?.directPhone || undefined;

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
      legalEntityName: verifiedLegal,
      networkOperator: plant.networkOperator || undefined,
      contactEmail: verifiedEmail,
      contactPhone: verifiedPhone,
    });
    onClose();
    navigate(dealUrl);
    showToast(`Loaded ${plant.name} into Trade Builder`, 'success');
  };

  const handleAuditPlantDiligence = () => {
    window.dispatchEvent(
      new CustomEvent('open-compliance-auditor', {
        detail: {
          originCountry: plant.countryCode,
          targetMarketId: defaultMarket,
                                      destinationMarket: defaultMarket,
          feedstockCategory: feedstockKey,
                                      feedstock: feedstockKey,
          carbonIntensity: ciValue,
                                      ghgIntensity: ciValue,
          annualVolumeMWh: volumeMWh,
                                      volumeMWh: volumeMWh,
          counterparty: plant.legalEntityName || plant.operator || `${plant.name} Producer`,
          plantName: plant.name,
          operatorName: plant.operator,
          gridOperator: plant.networkOperator,
          initialTab: 'GATE_BREAKDOWN',
          focusedGateIndex: 0,
        }
      })
    );
  };

  const handleCopyTermSheet = () => {
    const summary = `=== BIOMETHANE ASSET ORIGINATION BRIEF ===
Facility: ${plant.name} (${plant.countryCode} ${plant.countryFlag})
Plant ID: ${plant.id}
Operating Entity: ${plant.operator || 'N/A'}
Legal Entity: ${plant.legalEntityName || 'N/A'}${tag('legalEntityName')}
Registration / Statutory ID: ${plant.companyRegistrationId || 'Not verified'}
Network Operator (TSO/DSO): ${plant.networkOperator || 'N/A'}
Grid Connection: ${plant.gridConnectionType || 'Distribution Grid Injection'}
Annual Capacity: ${plant.annualEnergyGWh ? `${plant.annualEnergyGWh} GWh/y (${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y)` : 'N/A'} (${plant.capacityNm3h ? `${plant.capacityNm3h} Nm³/h` : 'N/A'})
Feedstock Substrate: ${plant.primaryFeedstockCategory || 'N/A'} (${plant.feedstockDetails || 'N/A'})
Carbon Intensity: ${ciValue} gCO2e/MJ (RED III Annex IX)
Upgrading Tech: ${plant.upgradingTechnology || 'Membrane separation'}
Commissioning Year: ${plant.commissioningYear || 'N/A'}${tag('commissioningYear')}
Contact Email: ${plant.contactEmail || 'N/A'}${tag('contactEmail')}
Contact Phone: ${plant.contactPhone || 'N/A'}${tag('contactPhone')}
Corporate Website: ${plant.corporateWebsite || 'N/A'}${tag('corporateWebsite')}
Headquarters Address: ${plant.headquartersAddress || 'N/A'}${tag('headquartersAddress')}
==========================================`;
    copyToClipboard(summary, 'Origination Brief');
  };

  const websiteUrl = formatExternalUrl(plant.corporateWebsite);

  // Contact quality evaluation & official register lookup
  const contactQuality = plant.contactQuality ?? evaluatePlantContactQuality(plant);
  const officialRegister = contactQuality.officialRegister;

  // Fields the source does not publish, or that were generated (see domain/plants/dataQuality.ts)
  const unverifiedFields = new Set(plant.fieldsUnverified ?? []);
  const tag = (field: string) => (unverifiedFields.has(field) ? ' [UNVERIFIED]' : '');


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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                {plant.countryCode} • {plant.country}
              </span>
              <span style={{
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}>
                {plant.id}
              </span>
              {plant.isVerified && (
                <span style={{
                  backgroundColor: 'rgba(6, 182, 212, 0.12)',
                  color: '#22d3ee',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} /> Audited Meter
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {plant.name}
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#cbd5e1' }}>{plant.operator || plant.legalEntityName || 'Independent Producer'}</span>
              {plant.commissioningYear && <span style={{ color: '#64748b' }}>• Comm. {plant.commissioningYear}</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }} className="noscroll">
          {/* Action Toolbar: Row 1 Primary Trades (2 buttons) + Row 2 Utilities (3 buttons) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={handleLaunchTrade}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Zap size={14} />
                <span>Launch in Trade Builder</span>
              </button>

              <button
                type="button"
                onClick={handleAuditPlantDiligence}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  backgroundColor: 'rgba(217, 119, 6, 0.12)',
                  color: '#f59e0b',
                  fontWeight: 600,
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Run 6-Gate Statutory Audit & State Aid diligence for this facility"
              >
                <Scale size={14} />
                <span>Facility Statutory Diligence</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.9fr', gap: '8px' }}>
              <a
                href={generateLinkedInOriginationUrl(plant.verifiedDossier?.officialLegalEntity || plant.operator || plant.name)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  backgroundColor: 'rgba(10, 102, 194, 0.12)',
                  color: '#38bdf8',
                  fontWeight: 500,
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
                title="Search verified commercial and origination leads on LinkedIn"
              >
                <Linkedin size={13} style={{ color: '#0ea5e9' }} />
                <span>LinkedIn Leads</span>
              </a>

              <button
                type="button"
                onClick={handleStartEditOverride}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 10px',
                  backgroundColor: deskOverride ? 'rgba(16, 185, 129, 0.12)' : '#1e293b',
                  color: deskOverride ? '#34d399' : '#cbd5e1',
                  fontWeight: 500,
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: `1px solid ${deskOverride ? 'rgba(16, 185, 129, 0.3)' : '#334155'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <PlusCircle size={13} />
                <span>{deskOverride ? 'Edit Desk Override' : 'Log Verified Contact'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyTermSheet}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '7px 10px',
                  backgroundColor: '#1e293b',
                  color: '#94a3b8',
                  fontWeight: 500,
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Copy term sheet summary to clipboard"
              >
                <Copy size={12} />
                <span>Copy Brief</span>
              </button>
            </div>
          </div>

          {/* Inline Trader Desk Override Edit Form */}
          {isEditingOverride && (
            <div style={{ backgroundColor: '#0f172a', border: '1px solid #10b981', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={14} /> Log Confirmed Counterparty Signatory
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingOverride(false)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveOverride} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Signatory / Contact Name *
                    </label>
                    <input
                      type="text"
                      value={overrideSignatory}
                      onChange={e => setOverrideSignatory(e.target.value)}
                      placeholder="e.g. Dr. H. Schmidt / Managing Director"
                      style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Verified By (Trader)
                    </label>
                    <input
                      type="text"
                      value={overrideTrader}
                      onChange={e => setOverrideTrader(e.target.value)}
                      placeholder="Your name or desk"
                      style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Direct Email
                    </label>
                    <input
                      type="email"
                      value={overrideEmail}
                      onChange={e => setOverrideEmail(e.target.value)}
                      placeholder="e.g. h.schmidt@operator.com"
                      style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                      Direct Phone
                    </label>
                    <input
                      type="text"
                      value={overridePhone}
                      onChange={e => setOverridePhone(e.target.value)}
                      placeholder="e.g. +49 171 1234567"
                      style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    Origination Notes & Offtake Status
                  </label>
                  <textarea
                    value={overrideNotes}
                    onChange={e => setOverrideNotes(e.target.value)}
                    placeholder="e.g. Spoke to commercial director. Plant commissioned 2021. Open to 3-year fixed PPA from Q1 2027."
                    rows={2}
                    style={{ width: '100%', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '6px 10px', color: '#fff', fontSize: '12px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  {deskOverride && (
                    <button
                      type="button"
                      onClick={handleDeleteOverride}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Trash2 size={13} /> Clear Override
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingOverride(false)}
                    style={{ padding: '6px 12px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '6px 14px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save to Desk Record
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Card: Trader Confirmed Contact (Desk Verified) */}
          {deskOverride && !isEditingOverride && (
            <div style={{ backgroundColor: 'rgba(6, 78, 59, 0.25)', border: '1px solid #10b981', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} /> Confirmed by Trading Desk
                </span>
                <span style={{ fontSize: '10px', color: '#a7f3d0' }}>
                  Verified by {deskOverride.traderName} on {new Date(deskOverride.verifiedAt).toLocaleDateString()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#6ee7b7', display: 'block' }}>Signatory / Contact</span>
                  <strong style={{ color: '#ffffff' }}>{deskOverride.counterpartySignatory}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#6ee7b7', display: 'block' }}>Direct Email</span>
                  {deskOverride.directEmail ? (
                    <a href={`mailto:${deskOverride.directEmail}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                      {deskOverride.directEmail}
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>None logged</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#6ee7b7', display: 'block' }}>Direct Phone</span>
                  {deskOverride.directPhone ? (
                    <a href={`tel:${deskOverride.directPhone}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                      {deskOverride.directPhone}
                    </a>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>None logged</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: '#6ee7b7', display: 'block' }}>Origination Status</span>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Active Counterparty Target</span>
                </div>
              </div>

              {deskOverride.notes && (
                <div style={{ fontSize: '11px', color: '#cbd5e1', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <strong style={{ color: '#a7f3d0' }}>Trader Notes: </strong> {deskOverride.notes}
                </div>
              )}
            </div>
          )}

          {/* Authoritative Statutory Dossier & Commercial Desk Card */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} style={{ color: '#38bdf8' }} /> Counterparty Identity & Leads
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {plant.verifiedDossier && (
                  plant.verifiedDossier.verificationStatus === 'REGISTER_CONFIRMED' ? (
                    <span title={plant.verifiedDossier.verificationSource} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '4px', fontWeight: 700 }}>
                      Register-confirmed{plant.verifiedDossier.verifiedAt ? ` ${plant.verifiedDossier.verifiedAt}` : ''}
                    </span>
                  ) : (
                    <span title={plant.verifiedDossier.verificationSource} style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', borderRadius: '4px', fontWeight: 700 }}>
                      Unverified — check register
                    </span>
                  )
                )}
                {deskOverride && (
                  <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={10} /> Confirmed by Desk
                  </span>
                )}
              </div>
            </div>

            {/* Quality & Outreach Risk Warning Banners */}
            {contactQuality.confidence === 'UNDELIVERABLE' && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#fca5a5',
                  lineHeight: 1.4,
                }}
              >
                <AlertOctagon size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                <span>
                  <strong>Synthetic address — do not use:</strong> {plant.contactEmail} was constructed from the place name; it will bounce or reach an unrelated party. Find the operator via the official register or LinkedIn below.
                </span>
              </div>
            )}

            {contactQuality.confidence === 'INDIRECT' && (
              <div
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#fcd34d',
                  lineHeight: 1.4,
                }}
              >
                <AlertTriangle size={14} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <span>
                  <strong>Shared Switchboard:</strong> Contact connects to central EPC/hotline. Direct origination pathway provided below.
                </span>
              </div>
            )}

            {contactQuality.isPersonalEmail && (
              <div
                style={{
                  backgroundColor: 'rgba(234, 88, 12, 0.12)',
                  border: '1px solid rgba(234, 88, 12, 0.3)',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  color: '#fdba74',
                  lineHeight: 1.4,
                }}
              >
                <ShieldAlert size={14} style={{ color: '#f97316', flexShrink: 0 }} />
                <span>
                  <strong>Personal mailbox:</strong> likely a farmer or sole trader. Unsolicited marketing email generally needs prior consent (ePrivacy / PECR) — phone first, or find a registered business contact.
                </span>
              </div>
            )}

            {/* Blue Register Match — Suggestion for Trader Confirmation */}
            {plant.verifiedDossier?.suggestedEntity && (
              <div
                style={{
                  backgroundColor: 'rgba(14, 165, 233, 0.08)',
                  border: '1px solid rgba(14, 165, 233, 0.35)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        backgroundColor: 'rgba(14, 165, 233, 0.25)',
                        color: '#38bdf8',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Register match — confirm
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                      {plant.verifiedDossier.suggestedEntity.source}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOverrideSignatory(plant.verifiedDossier?.suggestedEntity?.name || '');
                      setIsEditingOverride(true);
                    }}
                    style={{
                      padding: '4px 9px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="Pre-fill Log Verified Contact form with this operator name for trader confirmation"
                  >
                    <UserCheck size={12} /> Use as signatory
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span>{plant.verifiedDossier.suggestedEntity.name}</span>
                    {plant.verifiedDossier.suggestedEntity.registerId && (
                      <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>
                        ({plant.verifiedDossier.suggestedEntity.registerId})
                      </span>
                    )}
                  </div>
                  {plant.verifiedDossier.suggestedEntity.evidence && plant.verifiedDossier.suggestedEntity.evidence.length > 0 && (
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {plant.verifiedDossier.suggestedEntity.evidence.map((ev, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#38bdf8' }}>•</span> {ev}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ambiguous Register Candidates (Top 3) */}
            {plant.registerMatch?.status === 'AMBIGUOUS' && plant.registerMatch.candidates && plant.registerMatch.candidates.length > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(148, 163, 184, 0.08)',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      backgroundColor: 'rgba(148, 163, 184, 0.2)',
                      color: '#cbd5e1',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Several register candidates ({plant.registerMatch.candidates.length})
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '10px' }}>
                    {plant.registerMatch.source}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {plant.registerMatch.candidates.slice(0, 3).map((cand, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.25)',
                        borderRadius: '5px',
                        border: '1px solid #334155',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '11px' }}>
                          {cand.operatorName}
                          {cand.operatorRegisterId ? ` (${cand.operatorRegisterId})` : ''}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideSignatory(cand.operatorName);
                            setIsEditingOverride(true);
                          }}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: '#334155',
                            color: '#e2e8f0',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          Use
                        </button>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                        {cand.town ? `${cand.town} • ` : ''}
                        {cand.evidence.join('; ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Core Entity Grid (2x2 Aligned) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', fontSize: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Legal Operating Entity{plant.verifiedDossier?.verificationStatus !== 'REGISTER_CONFIRMED' ? ' (unverified)' : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.verifiedDossier?.officialLegalEntity || 'Not identified'}>
                    {plant.verifiedDossier?.officialLegalEntity || 'Not identified — search register'}
                  </span>
                  {plant.verifiedDossier?.officialLegalEntity && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(plant.verifiedDossier?.officialLegalEntity || '', 'Legal Entity')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', marginLeft: '4px' }}
                      title="Copy"
                    >
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Statutory Registration ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{ fontFamily: 'monospace', color: plant.verifiedDossier?.statutoryRegistrationId ? '#34d399' : '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={
                      plant.registrationCheck
                        ? `${plant.verifiedDossier?.verificationSource || ''}\n[Source: ${plant.registrationCheck.source} | Checked: ${plant.registrationCheck.checkedAt}]`
                        : plant.verifiedDossier?.verificationSource
                    }
                  >
                    {plant.verifiedDossier?.statutoryRegistrationId || (plant.registrationCheck && plant.registrationCheck.status !== 'CONFIRMED' ? 'Source ID rejected by register' : 'Not verified — search register')}
                  </span>
                  {plant.verifiedDossier?.statutoryRegistrationId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(plant.verifiedDossier?.statutoryRegistrationId || '', 'Registration ID')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', marginLeft: '4px' }}
                      title="Copy"
                    >
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Parent Portfolio / Group
                </span>
                <span style={{ fontWeight: 500, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {plant.verifiedDossier?.parentGroup || 'Not identified'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Group Desk (research note)
                </span>
                <span style={{ fontWeight: 500, color: '#38bdf8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {plant.verifiedDossier?.groupTradingDeskLocation || '—'}
                </span>
              </div>
            </div>

            {/* Commercial Origination Contacts */}
            {deskOverride && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                  Confirmed Trader Contact (Override)
                </span>
                <div style={{ backgroundColor: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px' }}>{deskOverride.counterpartySignatory}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>Verified by {deskOverride.traderName}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '11px' }}>
                      {deskOverride.directEmail && (
                        <a href={`mailto:${deskOverride.directEmail}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                          {deskOverride.directEmail}
                        </a>
                      )}
                      {deskOverride.directPhone && (
                        <a href={`tel:${deskOverride.directPhone}`} style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                          {deskOverride.directPhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                    Confirmed
                  </span>
                </div>
              </div>
            )}

            {!deskOverride && plant.verifiedDossier && plant.verifiedDossier.commercialContacts.length > 0 && (
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Leads to follow up — not verified ({plant.verifiedDossier.commercialContacts.length})
                </span>
                {plant.verifiedDossier.commercialContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#1e293b',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px' }}>{contact.fullName}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{contact.title}</div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '11px' }}>
                        {contact.workEmail && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <a href={`mailto:${contact.workEmail}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                              {contact.workEmail}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.workEmail || '', 'Email')}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '1px' }}
                              title="Copy Email"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        )}
                        {contact.directPhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <a href={`tel:${contact.directPhone}`} style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                              {contact.directPhone}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.directPhone || '', 'Phone')}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '1px' }}
                              title="Copy Phone"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(148, 163, 184, 0.15)',
                        color: '#cbd5e1',
                        flexShrink: 0,
                      }}
                    >
                      {LEAD_SOURCE_LABEL[contact.source]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Official Statutory Registry Verification Strip */}
            <div
              style={{
                borderTop: '1px solid #1e293b',
                paddingTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <Scale size={13} style={{ color: '#38bdf8' }} />
                <span>Register: <strong style={{ color: '#cbd5e1' }}>{officialRegister.registerName}</strong></span>
              </div>
              <a
                href={officialRegister.searchUrl || officialRegister.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
                title={`Open official register search for ${officialRegister.countryName}`}
              >
                <span>Verify in {officialRegister.registerName.split(' ')[0]}</span>
                <ExternalLink size={10} />
              </a>
            </div>

            {/* Corporate Portal Link (if available) */}
            {websiteUrl && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', paddingTop: '6px', borderTop: '1px dashed #1e293b' }}>
                <span style={{ color: '#94a3b8' }}>Corporate Website:</span>
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Globe size={11} />
                  <span>{websiteUrl.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            )}

            {/* Collapsible Raw Census Audit Details */}
            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowRawCensus(!showRawCensus)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {showRawCensus ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                <span>{showRawCensus ? 'Hide Raw Census Baseline' : 'Audit Raw Census Baseline (GIE/EBA 2026)'}</span>
              </button>

              {showRawCensus && (
                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#020617', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Raw Email:</span>
                    <span style={{ color: contactQuality.confidence === 'UNDELIVERABLE' ? '#f87171' : '#cbd5e1', fontFamily: 'monospace' }}>
                      {plant.contactEmail || 'Unpublished'} {contactQuality.confidence === 'UNDELIVERABLE' ? '(Bounce)' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Raw Phone:</span>
                    <span style={{ color: '#cbd5e1', fontFamily: 'monospace' }}>{plant.contactPhone || 'Unpublished'}</span>
                  </div>
                  {plant.headquartersAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ color: '#64748b', flexShrink: 0 }}>Raw Address:</span>
                      <span style={{ color: '#94a3b8', textAlign: 'right' }}>{plant.headquartersAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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
              <span>Data Provenance</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.5 }}>
              {plant.provenance || 'Source not recorded.'}
            </p>
          </div>
        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '14px 22px', backgroundColor: '#0f172a', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
          <span>
            Coordinates: {plant.coordinates && !hasApproximateCoordinates(plant)
              ? `${plant.coordinates[0].toFixed(4)}, ${plant.coordinates[1].toFixed(4)}`
              : 'Unverified (country centroid placeholder)'}
          </span>
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
