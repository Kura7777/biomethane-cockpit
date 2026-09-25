import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { hasApproximateCoordinates } from '../../domain/plants/registry';
import { evaluatePlantContactQuality } from '../../domain/plants/contactQuality';
import { showToast } from '../../app/DeskToastContainer';
import { useTheme } from '../../store/theme';
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
  ChevronUp,
  Maximize2,
  Minimize2
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deskOverride, setDeskOverride] = useState<TraderDeskOverride | null>(() => plant ? getTraderDeskOverride(plant.id) : null);
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [showRawCensus, setShowRawCensus] = useState(false);
  const [overrideTrader, setOverrideTrader] = useState('');
  const [overrideSignatory, setOverrideSignatory] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('plant_drawer_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem('plant_drawer_expanded', String(next));
      } catch {}
      return next;
    });
  };

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

  // Close on Escape key or toggle expand on 'F' key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        toggleExpanded();
      }
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

  const targetOperator = plant.verifiedDossier?.officialLegalEntity 
    || plant.registerMatch?.best?.operatorName 
    || plant.operator 
    || plant.name;
  const websiteUrl = formatExternalUrl(plant.verifiedDossier?.verifiedWebsiteUrl || plant.corporateWebsite);
  const linkedinCompanyUrl = plant.verifiedDossier?.linkedinCompanyUrl || null;
  const linkedinSearchUrl = plant.verifiedDossier?.linkedinSearchUrl || generateLinkedInOriginationUrl(
    targetOperator,
    plant.countryCode,
    plant.verifiedDossier?.parentGroup
  );

  // Contact quality evaluation & official register lookup
  const contactQuality = plant.contactQuality ?? evaluatePlantContactQuality(plant);
  const officialRegister = contactQuality.officialRegister;

  // Fields the source does not publish, or that were generated (see domain/plants/dataQuality.ts)
  const unverifiedFields = new Set(plant.fieldsUnverified ?? []);
  const tag = (field: string) => (unverifiedFields.has(field) ? ' [UNVERIFIED]' : '');

  // Theme-aware color palette
  const t = {
    bg: isDark ? '#0f172a' : '#ffffff',
    bgHeader: isDark ? '#1e293b' : '#f8fafc',
    bgCard: isDark ? '#0f172a' : '#ffffff',
    bgCardSubtle: isDark ? '#1e293b' : '#f8fafc',
    bgSunken: isDark ? '#020617' : '#f1f5f9',
    border: isDark ? '#334155' : '#e2e8f0',
    borderLight: isDark ? '#1e293b' : '#e2e8f0',
    textMain: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#cbd5e1' : '#334155',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    btnBg: isDark ? '#1e293b' : '#f1f5f9',
    btnBorder: isDark ? '#334155' : '#cbd5e1',
    btnText: isDark ? '#94a3b8' : '#475569',
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
          maxWidth: isExpanded ? '100vw' : '640px',
          height: '100%',
          backgroundColor: t.bg,
          color: t.textMain,
          borderLeft: isExpanded ? 'none' : `1px solid ${t.border}`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isDark ? '-8px 0 32px rgba(0, 0, 0, 0.8)' : '-8px 0 32px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          transition: 'max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1), width 0.25s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          style={{
            padding: isExpanded ? '16px 28px' : '18px 22px',
            backgroundColor: t.bgHeader,
            borderBottom: `1px solid ${t.border}`,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                color: isDark ? '#34d399' : '#059669',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`
              }}>
                {plant.countryCode} • {plant.country}
              </span>
              <span style={{
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                color: isDark ? '#38bdf8' : '#0284c7',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`
              }}>
                {plant.id}
              </span>
              {plant.isVerified && (
                <span style={{
                  backgroundColor: isDark ? 'rgba(6, 182, 212, 0.12)' : 'rgba(6, 182, 212, 0.1)',
                  color: isDark ? '#22d3ee' : '#0891b2',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${isDark ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.25)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <ShieldCheck size={12} /> Audited Meter
                </span>
              )}
            </div>
            <h2 style={{ fontSize: isExpanded ? '20px' : '18px', fontWeight: 700, margin: 0, color: t.textMain, letterSpacing: '-0.01em' }}>
              {plant.name}
            </h2>
            <p style={{ fontSize: '12px', color: t.textMuted, margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: t.textSecondary }}>{plant.operator || plant.legalEntityName || 'Independent Producer'}</span>
              {plant.commissioningYear && <span style={{ color: t.textMuted }}>• Comm. {plant.commissioningYear}</span>}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={toggleExpanded}
              style={{
                background: t.btnBg,
                border: `1px solid ${t.btnBorder}`,
                color: t.btnText,
                cursor: 'pointer',
                padding: '6px 11px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                transition: 'all 0.15s ease'
              }}
              title={isExpanded ? 'Collapse to side panel (or press F)' : 'Expand to full screen (or press F)'}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>{isExpanded ? 'Side Panel' : 'Full Screen'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: t.btnBg,
                border: `1px solid ${t.btnBorder}`,
                color: t.btnText,
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
        </div>

        {/* Drawer Body */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: isExpanded ? '20px 28px' : '16px 20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px',
            maxWidth: isExpanded ? '1560px' : '100%',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
          }} 
          className="noscroll"
        >
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

            <div style={{ display: 'grid', gridTemplateColumns: linkedinCompanyUrl ? '1fr 1.3fr 1.2fr 0.8fr' : '1.3fr 1.2fr 0.8fr', gap: '8px' }}>
              {linkedinCompanyUrl && (
                <a
                  href={linkedinCompanyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '7px 8px',
                    backgroundColor: 'rgba(10, 102, 194, 0.16)',
                    color: '#38bdf8',
                    fontWeight: 600,
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title="Open official verified corporate LinkedIn page"
                >
                  <Building2 size={12} style={{ color: '#0ea5e9' }} />
                  <span>Company</span>
                </a>
              )}

              <a
                href={linkedinSearchUrl}
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
                title="Search verified commercial, origination, and executive decision-makers on LinkedIn"
              >
                <Linkedin size={13} style={{ color: '#0ea5e9' }} />
                <span>Find Decision-Makers</span>
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
                  backgroundColor: deskOverride ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.1)') : t.btnBg,
                  color: deskOverride ? (isDark ? '#34d399' : '#059669') : t.textSecondary,
                  fontWeight: 500,
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: `1px solid ${deskOverride ? (isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.4)') : t.btnBorder}`,
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
                  backgroundColor: t.btnBg,
                  color: t.btnText,
                  fontWeight: 500,
                  fontSize: '11px',
                  borderRadius: '6px',
                  border: `1px solid ${t.btnBorder}`,
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

          {/* Main Content Layout: Single Column in Side Panel, Two Balanced Columns in Full Screen */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isExpanded ? 'minmax(0, 1.12fr) minmax(0, 0.88fr)' : '1fr',
            gap: isExpanded ? '20px' : '14px',
            alignItems: 'start',
            width: '100%'
          }}>
            {/* Column 1: Counterparty Identity, Verified Signatory & Leads */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
              {/* Inline Trader Desk Override Edit Form */}
              {isEditingOverride && (
            <div style={{ backgroundColor: t.bgHeader, border: `1px solid ${isDark ? '#10b981' : '#059669'}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={14} /> Log Confirmed Counterparty Signatory
                </h4>
                <button
                  type="button"
                  onClick={() => setIsEditingOverride(false)}
                  style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSaveOverride} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      Signatory / Contact Name *
                    </label>
                    <input
                      type="text"
                      value={overrideSignatory}
                      onChange={e => setOverrideSignatory(e.target.value)}
                      placeholder="e.g. Dr. H. Schmidt / Managing Director"
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      Verified By (Trader)
                    </label>
                    <input
                      type="text"
                      value={overrideTrader}
                      onChange={e => setOverrideTrader(e.target.value)}
                      placeholder="Your name or desk"
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      Direct Email
                    </label>
                    <input
                      type="email"
                      value={overrideEmail}
                      onChange={e => setOverrideEmail(e.target.value)}
                      placeholder="e.g. h.schmidt@operator.com"
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      Direct Phone
                    </label>
                    <input
                      type="text"
                      value={overridePhone}
                      onChange={e => setOverridePhone(e.target.value)}
                      placeholder="e.g. +49 171 1234567"
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                    Origination Notes & Offtake Status
                  </label>
                  <textarea
                    value={overrideNotes}
                    onChange={e => setOverrideNotes(e.target.value)}
                    placeholder="e.g. Spoke to commercial director. Plant commissioned 2021. Open to 3-year fixed PPA from Q1 2027."
                    rows={2}
                    style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  {deskOverride && (
                    <button
                      type="button"
                      onClick={handleDeleteOverride}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
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
                    style={{ padding: '6px 12px', backgroundColor: t.btnBg, color: t.textSecondary, border: `1px solid ${t.btnBorder}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
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
            <div style={{ backgroundColor: isDark ? 'rgba(6, 78, 59, 0.25)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${isDark ? '#10b981' : '#059669'}`, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} /> Confirmed by Trading Desk
                </span>
                <span style={{ fontSize: '10px', color: isDark ? '#a7f3d0' : '#065f46' }}>
                  Verified by {deskOverride.traderName} on {new Date(deskOverride.verifiedAt).toLocaleDateString()}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div>
                  <span style={{ fontSize: '10px', color: isDark ? '#6ee7b7' : '#059669', display: 'block' }}>Signatory / Contact</span>
                  <strong style={{ color: t.textMain }}>{deskOverride.counterpartySignatory}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: isDark ? '#6ee7b7' : '#059669', display: 'block' }}>Direct Email</span>
                  {deskOverride.directEmail ? (
                    <a href={`mailto:${deskOverride.directEmail}`} style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none' }}>
                      {deskOverride.directEmail}
                    </a>
                  ) : (
                    <span style={{ color: t.textMuted }}>None logged</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: isDark ? '#6ee7b7' : '#059669', display: 'block' }}>Direct Phone</span>
                  {deskOverride.directPhone ? (
                    <a href={`tel:${deskOverride.directPhone}`} style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none' }}>
                      {deskOverride.directPhone}
                    </a>
                  ) : (
                    <span style={{ color: t.textMuted }}>None logged</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: '10px', color: isDark ? '#6ee7b7' : '#059669', display: 'block' }}>Origination Status</span>
                  <span style={{ color: isDark ? '#34d399' : '#059669', fontWeight: 600 }}>Active Counterparty Target</span>
                </div>
              </div>

              {deskOverride.notes && (
                <div style={{ fontSize: '11px', color: t.textSecondary, backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(16, 185, 129, 0.1)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <strong style={{ color: isDark ? '#a7f3d0' : '#065f46' }}>Trader Notes: </strong> {deskOverride.notes}
                </div>
              )}
            </div>
          )}

          {/* Authoritative Statutory Dossier & Commercial Desk Card */}
          <div style={{ backgroundColor: t.bgCardSubtle, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} /> Counterparty Identity & Leads
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
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.06)',
                  border: isDark ? '1px solid rgba(14, 165, 233, 0.35)' : '1px solid rgba(2, 132, 199, 0.3)',
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
                        backgroundColor: isDark ? 'rgba(14, 165, 233, 0.25)' : 'rgba(14, 165, 233, 0.15)',
                        color: isDark ? '#38bdf8' : '#0284c7',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Register match — confirm
                    </span>
                    <span style={{ color: t.textMuted, fontSize: '10px' }}>
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
                  <div style={{ color: t.textMain, fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span>{plant.verifiedDossier.suggestedEntity.name}</span>
                    {plant.verifiedDossier.suggestedEntity.registerId && (
                      <span style={{ color: isDark ? '#38bdf8' : '#0284c7', fontFamily: 'monospace', fontSize: '11px', fontWeight: 600 }}>
                        ({plant.verifiedDossier.suggestedEntity.registerId})
                      </span>
                    )}
                  </div>
                  {plant.verifiedDossier.suggestedEntity.evidence && plant.verifiedDossier.suggestedEntity.evidence.length > 0 && (
                    <div style={{ color: t.textMuted, fontSize: '11px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {plant.verifiedDossier.suggestedEntity.evidence.map((ev, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>•</span> {ev}
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
                  backgroundColor: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(100, 116, 139, 0.06)',
                  border: `1px solid ${t.border}`,
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
                      backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.12)',
                      color: t.textSecondary,
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Several register candidates ({plant.registerMatch.candidates.length})
                  </span>
                  <span style={{ color: t.textMuted, fontSize: '10px' }}>
                    {plant.registerMatch.source}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {plant.registerMatch.candidates.slice(0, 3).map((cand, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        backgroundColor: t.bgSunken,
                        borderRadius: '5px',
                        border: `1px solid ${t.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        <div style={{ color: t.textMain, fontWeight: 600, fontSize: '11px' }}>
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
                            backgroundColor: t.btnBg,
                            color: t.btnText,
                            border: `1px solid ${t.btnBorder}`,
                            borderRadius: '4px',
                            fontSize: '10px',
                            cursor: 'pointer',
                          }}
                        >
                          Use
                        </button>
                      </div>
                      <div style={{ color: t.textMuted, fontSize: '10px' }}>
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
                <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Legal Operating Entity{plant.verifiedDossier?.verificationStatus !== 'REGISTER_CONFIRMED' ? ' (unverified)' : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: t.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.verifiedDossier?.officialLegalEntity || 'Not identified'}>
                    {plant.verifiedDossier?.officialLegalEntity || 'Not identified — search register'}
                  </span>
                  {plant.verifiedDossier?.officialLegalEntity && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(plant.verifiedDossier?.officialLegalEntity || '', 'Legal Entity')}
                      style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '2px', marginLeft: '4px' }}
                      title="Copy"
                    >
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Statutory Registration ID
                </span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{ fontFamily: 'monospace', color: plant.verifiedDossier?.statutoryRegistrationId ? (isDark ? '#34d399' : '#059669') : t.textMuted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
                      style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '2px', marginLeft: '4px' }}
                      title="Copy"
                    >
                      <Copy size={11} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Parent Portfolio / Group
                </span>
                <span style={{ fontWeight: 500, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {plant.verifiedDossier?.parentGroup || 'Not identified'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                  Group Desk (research note)
                </span>
                <span style={{ fontWeight: 500, color: isDark ? '#38bdf8' : '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                  {plant.verifiedDossier?.groupTradingDeskLocation || '—'}
                </span>
              </div>
            </div>

            {/* Commercial Origination Contacts */}
            {deskOverride && (
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '10px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '6px' }}>
                  Confirmed Trader Contact (Override)
                </span>
                <div style={{ backgroundColor: t.bgSunken, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: t.textMain, fontSize: '12px' }}>{deskOverride.counterpartySignatory}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>Verified by {deskOverride.traderName}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '11px' }}>
                      {deskOverride.directEmail && (
                        <a href={`mailto:${deskOverride.directEmail}`} style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none' }}>
                          {deskOverride.directEmail}
                        </a>
                      )}
                      {deskOverride.directPhone && (
                        <a href={`tel:${deskOverride.directPhone}`} style={{ color: t.textSecondary, textDecoration: 'none' }}>
                          {deskOverride.directPhone}
                        </a>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)', color: isDark ? '#34d399' : '#059669' }}>
                    Confirmed
                  </span>
                </div>
              </div>
            )}

            {!deskOverride && plant.verifiedDossier && plant.verifiedDossier.commercialContacts.length > 0 && (
              <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Leads to follow up — not verified ({plant.verifiedDossier.commercialContacts.length})
                </span>
                {plant.verifiedDossier.commercialContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: t.bgSunken,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${t.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: t.textMain, fontSize: '12px' }}>{contact.fullName}</div>
                      <div style={{ fontSize: '11px', color: t.textMuted }}>{contact.title}</div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '3px', fontSize: '11px' }}>
                        {contact.workEmail && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <a href={`mailto:${contact.workEmail}`} style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none' }}>
                              {contact.workEmail}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.workEmail || '', 'Email')}
                              style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
                              title="Copy Email"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        )}
                        {contact.directPhone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <a href={`tel:${contact.directPhone}`} style={{ color: t.textSecondary, textDecoration: 'none' }}>
                              {contact.directPhone}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.directPhone || '', 'Phone')}
                              style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
                              title="Copy Phone"
                            >
                              <Copy size={10} />
                            </button>
                          </div>
                        )}
                        <a
                          href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`"${targetOperator.replace(/\b(SAS|SARL|GmbH(\s*&\s*Co\.?\s*KG)?|Ltd|Limited|SpA|Srl|ApS|A\/S|B\.V\.|BV|AG|SE|e\.V\.)\b/gi, '').replace(/[()[\]"']/g, '').trim()}" "${contact.title.replace(/\s*—\s*/g, ' ')}"`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: isDark ? '#38bdf8' : '#0284c7',
                            fontSize: '10px',
                            textDecoration: 'none',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(2, 132, 199, 0.08)',
                            border: isDark ? '1px solid rgba(56, 189, 248, 0.2)' : '1px solid rgba(2, 132, 199, 0.25)',
                          }}
                          title={`Search for "${contact.title}" at ${targetOperator} on LinkedIn`}
                        >
                          <Linkedin size={9} />
                          <span>Search role</span>
                        </a>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                        color: t.textSecondary,
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
                borderTop: `1px solid ${t.border}`,
                paddingTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: t.textMuted }}>
                <Scale size={13} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                <span>Register: <strong style={{ color: t.textSecondary }}>{officialRegister.registerName}</strong></span>
              </div>
              <a
                href={officialRegister.searchUrl || officialRegister.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                  color: isDark ? '#38bdf8' : '#0284c7',
                  border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(2, 132, 199, 0.3)',
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

            {/* Corporate Portal Link & Corporate LinkedIn Profile (if available) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '6px', borderTop: `1px dashed ${t.border}` }}>
              {websiteUrl && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: t.textMuted }}>Corporate Website:</span>
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Globe size={11} />
                    <span>{websiteUrl.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
              {linkedinCompanyUrl && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                  <span style={{ color: t.textMuted }}>Corporate LinkedIn:</span>
                  <a
                    href={linkedinCompanyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Linkedin size={11} style={{ color: '#0ea5e9' }} />
                    <span>Company Page</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            {/* Collapsible Raw Census Audit Details */}
            <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowRawCensus(!showRawCensus)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: t.textMuted,
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
                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: t.bgSunken, borderRadius: '6px', border: `1px solid ${t.border}`, fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: t.textMuted }}>Raw Email:</span>
                    <span style={{ color: contactQuality.confidence === 'UNDELIVERABLE' ? '#ef4444' : t.textSecondary, fontFamily: 'monospace' }}>
                      {plant.contactEmail || 'Unpublished'} {contactQuality.confidence === 'UNDELIVERABLE' ? '(Bounce)' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: t.textMuted }}>Raw Phone:</span>
                    <span style={{ color: t.textSecondary, fontFamily: 'monospace' }}>{plant.contactPhone || 'Unpublished'}</span>
                  </div>
                  {plant.headquartersAddress && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ color: t.textMuted, flexShrink: 0 }}>Raw Address:</span>
                      <span style={{ color: t.textSecondary, textAlign: 'right' }}>{plant.headquartersAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Column 2: Physical & Technical Parameters, Data Provenance */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
            {/* Section 2: Physical & Technical Parameters */}
            <div style={{ backgroundColor: t.bgCard, borderRadius: '12px', border: `1px solid ${t.border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={{ fontSize: '11px', fontWeight: 800, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} /> Physical Capacity & Technical Parameters
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: t.bgSunken, padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block' }}>Annual Volume</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: t.textMain, display: 'block', marginTop: '2px' }}>
                    {plant.annualEnergyGWh ? `${plant.annualEnergyGWh} GWh` : '—'}
                  </span>
                  <span style={{ fontSize: '9px', color: t.textMuted, display: 'block' }}>
                    {plant.annualEnergyGWh ? `${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y` : ''}
                  </span>
                </div>

                <div style={{ backgroundColor: t.bgSunken, padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block' }}>Flow Capacity</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: t.textMain, display: 'block', marginTop: '2px' }}>
                    {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()}` : '—'}
                  </span>
                  <span style={{ fontSize: '9px', color: t.textMuted, display: 'block' }}>Nm³/h injection</span>
                </div>

                <div style={{ backgroundColor: t.bgSunken, padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block' }}>Audited CI</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: ciValue < 0 ? (isDark ? '#10b981' : '#059669') : (isDark ? '#f59e0b' : '#d97706'), display: 'block', marginTop: '2px' }}>
                    {ciValue}
                  </span>
                  <span style={{ fontSize: '9px', color: t.textMuted, display: 'block' }}>gCO₂e/MJ</span>
                </div>

                <div style={{ backgroundColor: t.bgSunken, padding: '10px', borderRadius: '8px', border: `1px solid ${t.border}` }}>
                  <span style={{ fontSize: '10px', color: t.textMuted, display: 'block' }}>Upgrading Tech</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: t.textMain, display: 'block', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.upgradingTechnology || 'Membrane'}>
                    {plant.upgradingTechnology || 'Membrane'}
                  </span>
                  <span style={{ fontSize: '9px', color: t.textMuted, display: 'block' }}>Separation</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: `1px solid ${t.border}`, fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted }}>Primary Feedstock:</span>
                  <span style={{ fontWeight: 600, color: isDark ? '#10b981' : '#059669' }}>{plant.primaryFeedstockCategory || 'Agricultural Biomass'}</span>
                </div>
                {plant.feedstockDetails && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: t.textMuted, flexShrink: 0 }}>Substrate Mix:</span>
                    <span style={{ color: t.textSecondary, textAlign: 'right' }}>{plant.feedstockDetails}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted }}>Grid Operator (TSO/DSO):</span>
                  <span style={{ fontFamily: 'monospace', color: t.textSecondary }}>{plant.networkOperator || 'National Gas Grid'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: t.textMuted }}>Grid Connection Level:</span>
                  <span style={{ color: t.textSecondary }}>{plant.gridConnectionType || 'Distribution Grid Injection (DSO)'}</span>
                </div>
                {plant.supportScheme && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: t.textMuted }}>Statutory Subsidy Regime:</span>
                    <span style={{ fontWeight: 600, color: isDark ? '#fbbf24' : '#d97706' }}>
                      {plant.supportScheme} {plant.supportExpiryDate ? `(Expiry: ${plant.supportExpiryDate})` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Statutory Provenance */}
            <div style={{ backgroundColor: t.bgCard, borderRadius: '10px', padding: '14px', border: `1px solid ${t.border}`, fontSize: '11px', color: t.textMuted, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: t.textMain, fontWeight: 600 }}>
                <ShieldCheck size={14} style={{ color: isDark ? '#10b981' : '#059669' }} />
                <span>Data Provenance</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.5, color: t.textSecondary }}>
                {plant.provenance || 'Source not recorded.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Footer */}
      <div style={{ padding: isExpanded ? '14px 28px' : '14px 22px', backgroundColor: t.bgHeader, borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: t.textMuted }}>
        <span>
          Coordinates: {plant.coordinates && !hasApproximateCoordinates(plant)
            ? `${plant.coordinates[0].toFixed(4)}, ${plant.coordinates[1].toFixed(4)}`
            : 'Unverified (country centroid placeholder)'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={toggleExpanded}
            style={{
              padding: '6px 12px',
              backgroundColor: t.btnBg,
              color: t.btnText,
              border: `1px solid ${t.btnBorder}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px'
            }}
            title={isExpanded ? 'Collapse to side panel (F)' : 'Expand to full screen (F)'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isExpanded ? 'Side Panel' : 'Full Screen'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              backgroundColor: t.btnBg,
              color: t.btnText,
              border: `1px solid ${t.btnBorder}`,
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
    </div>
  );
}
