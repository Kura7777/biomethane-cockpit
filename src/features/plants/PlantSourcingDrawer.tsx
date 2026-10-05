import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiomethanePlant } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { plantDealParams, feedstockKeyForPlant, defaultMarketForOrigin, plantCi } from '../../domain/trade/dealDefaults';
import { hasApproximateCoordinates } from '../../domain/plants/registry';
import { evaluatePlantContactQuality } from '../../domain/plants/contactQuality';
import { showToast } from '../../app/DeskToastContainer';
import { useTheme } from '../../store/theme';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import './plantsMobile.css';
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

const scopeOrder: Record<string, number> = {
  PLANT_OPERATOR: 30,
  PARENT_COMMERCIAL: 20,
  GENERAL_OR_PRESS: 10,
};

const typeOrder: Record<string, number> = {
  SALES_OR_ENERGY_EMAIL: 5,
  GENERIC_EMAIL: 4,
  COMPANY_SWITCHBOARD: 3,
  CONTACT_FORM: 2,
  NAMED_PERSON: 1,
};

export function getBestResearchContact(research?: BiomethanePlant['research']): { text: string; isVerified: boolean; contact?: any } {
  if (!research || !research.contacts || research.contacts.length === 0) {
    return { text: 'no verified contact', isVerified: false };
  }
  const verified = research.contacts.filter(c => c.check?.status === 'VERIFIED');
  if (verified.length === 0) {
    return { text: 'no verified contact', isVerified: false };
  }
  const sorted = [...verified].sort((a, b) => {
    const sA = scopeOrder[a.contactScope || ''] || 0;
    const sB = scopeOrder[b.contactScope || ''] || 0;
    if (sB !== sA) return sB - sA;
    const tA = typeOrder[a.type] || 0;
    const tB = typeOrder[b.type] || 0;
    return tB - tA;
  });
  const top = sorted[0];
  return {
    text: `${top.type}: ${top.value}`,
    isVerified: true,
    contact: top,
  };
}

type DrawerTab = 'ALL' | 'COMMERCIAL' | 'TECHNICAL' | 'COMPLIANCE';

interface PlantSourcingDrawerProps {
  plant: BiomethanePlant | null;
  onClose: () => void;
}

export function PlantSourcingDrawer({ plant, onClose }: PlantSourcingDrawerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<DrawerTab>('COMMERCIAL');
  const [showMatchEvidence, setShowMatchEvidence] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deskOverride, setDeskOverride] = useState<TraderDeskOverride | null>(() => plant ? getTraderDeskOverride(plant.id) : null);
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [showRawCensus, setShowRawCensus] = useState(false);
  const [showUnconfirmedContacts, setShowUnconfirmedContacts] = useState(false);
  const [overrideTrader, setOverrideTrader] = useState('');
  const [overrideSignatory, setOverrideSignatory] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const isMobile = useIsMobile();
  const [isExpandedStored, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('plant_drawer_expanded') === 'true';
    } catch {
      return false;
    }
  });
  // On phones the drawer is always full-screen, so the "expanded" layout variants never apply.
  const isExpanded = isExpandedStored && !isMobile;

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

  const feedstockKey = feedstockKeyForPlant(plant);
  const defaultMarket = defaultMarketForOrigin(plant.countryCode);
  // Audited annual energy only — never a generic placeholder volume.
  const volumeMWh = plant.annualEnergyGWh ? Math.round(plant.annualEnergyGWh * 1000) : undefined;
  const ciValue = plantCi(plant).ci;

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
      ...plantDealParams(plant),
      legalEntityName: verifiedLegal,
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
      className="psd-scrim"
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
        className="psd-panel"
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
        <div className="psd-mobile-bar">
          <div className="psd-mobile-bar-title">{plant.name}</div>
          <button type="button" className="psd-mobile-bar-close" onClick={onClose} aria-label="Close" data-testid="plant-drawer-close">
            <X size={20} />
          </button>
        </div>

        {/* Header / Executive Plant Summary Hero */}
        <div
          className="psd-header"
          style={{
            padding: isExpanded ? '18px 28px 14px 28px' : '16px 20px 12px 20px',
            backgroundColor: t.bgHeader,
            borderBottom: `1px solid ${t.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Top Bar: Badges, Title, and Panel Controls */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  color: isDark ? '#34d399' : '#059669',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {plant.countryCode} • {plant.country}
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: t.textMuted,
                  fontWeight: 600
                }}>
                  {plant.id}
                </span>
                {plant.isVerified && (
                  <span style={{
                    color: isDark ? '#22d3ee' : '#0891b2',
                    fontSize: '11px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <ShieldCheck size={12} /> Audited Meter
                  </span>
                )}
              </div>

              <h2 className="psd-title" style={{ fontSize: isExpanded ? '22px' : '18px', fontWeight: 800, margin: 0, color: t.textMain, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {plant.name}
              </h2>
              <p style={{ fontSize: '12px', color: t.textMuted, margin: '3px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ color: t.textSecondary, fontWeight: 500 }}>{plant.operator || plant.legalEntityName || 'Independent Producer'}</span>
                {plant.commissioningYear && <span>• Comm. {plant.commissioningYear}</span>}
                {plant.networkOperator && <span>• Grid: <strong style={{ color: t.textSecondary }}>{plant.networkOperator}</strong></span>}
              </p>
            </div>

            {/* Panel Controls */}
            <div className="psd-controls" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={toggleExpanded}
                className="psd-expand-btn"
                style={{
                  background: t.btnBg,
                  border: `1px solid ${t.btnBorder}`,
                  color: t.btnText,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '11px',
                  fontWeight: 600
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
                  background: t.btnBg,
                  border: `1px solid ${t.btnBorder}`,
                  color: t.btnText,
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Close (Esc)"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Trader Core Summary Numbers (Open, borderless typography) */}
          <div className="psd-numbers" style={{
            display: 'flex',
            alignItems: 'center',
            gap: isExpanded ? '24px' : '14px',
            flexWrap: 'wrap',
            paddingTop: '8px',
            borderTop: `1px solid ${t.borderLight}`
          }}>
            <div>
              <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Annual Energy</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <strong style={{ fontSize: '15px', color: t.textMain, fontWeight: 800 }}>
                  {plant.annualEnergyGWh ? `${plant.annualEnergyGWh.toLocaleString()} GWh/y` : '—'}
                </strong>
                {plant.annualEnergyGWh && (
                  <span style={{ fontSize: '11px', color: t.textMuted }}>
                    ({(plant.annualEnergyGWh * 1000).toLocaleString()} MWh)
                  </span>
                )}
              </div>
            </div>

            <div style={{ height: '22px', width: '1px', backgroundColor: t.border }} />

            <div>
              <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Injection Flow</span>
              <strong style={{ fontSize: '15px', color: t.textMain, fontWeight: 800 }}>
                {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()} Nm³/h` : '—'}
              </strong>
            </div>

            <div style={{ height: '22px', width: '1px', backgroundColor: t.border }} />

            <div>
              <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Audited CI</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <strong style={{ fontSize: '15px', fontWeight: 800, color: ciValue < 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#fbbf24' : '#d97706') }}>
                  {ciValue}
                </strong>
                <span style={{ fontSize: '11px', color: t.textMuted }}>gCO₂e/MJ</span>
              </div>
            </div>

            <div style={{ height: '22px', width: '1px', backgroundColor: t.border }} />

            <div>
              <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Primary Feedstock</span>
              <strong style={{ fontSize: '13px', color: isDark ? '#10b981' : '#059669', fontWeight: 700 }}>
                {plant.primaryFeedstockCategory || 'Agricultural Biomass'}
              </strong>
            </div>

            <div style={{ height: '22px', width: '1px', backgroundColor: t.border }} />

            <div>
              <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Optimal Route</span>
              <strong style={{ fontSize: '13px', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700 }}>
                {defaultMarket}
              </strong>
            </div>
          </div>

          {/* Primary Desk Action Toolbar */}
          <div className="psd-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '2px' }}>
            <button
              type="button"
              onClick={handleLaunchTrade}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                color: isDark ? '#fbbf24' : '#d97706',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.3)'}`,
                cursor: 'pointer'
              }}
            >
              <Scale size={14} />
              <span>Facility Diligence</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/map?origin=${encodeURIComponent(plant.countryCode)}`);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                backgroundColor: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                color: isDark ? '#60a5fa' : '#2563eb',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(37, 99, 235, 0.3)'}`,
                cursor: 'pointer'
              }}
              title={`View cross-border corridors for ${plant.countryCode}`}
            >
              <MapPin size={14} />
              <span>Where can this gas go?</span>
            </button>

            <a
              href={linkedinSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                backgroundColor: isDark ? 'rgba(14, 165, 233, 0.12)' : 'rgba(2, 132, 199, 0.08)',
                color: isDark ? '#38bdf8' : '#0284c7',
                fontWeight: 600,
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.25)'}`,
                textDecoration: 'none'
              }}
            >
              <Linkedin size={13} />
              <span>Find Decision-Makers</span>
            </a>

            <button
              type="button"
              onClick={handleStartEditOverride}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                backgroundColor: t.btnBg,
                color: deskOverride ? (isDark ? '#34d399' : '#059669') : t.textSecondary,
                fontWeight: 500,
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${t.btnBorder}`,
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={13} />
              <span>{deskOverride ? 'Edit Desk Override' : 'Log Desk Signatory'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyTermSheet}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 10px',
                backgroundColor: t.btnBg,
                color: t.btnText,
                fontWeight: 500,
                fontSize: '12px',
                borderRadius: '6px',
                border: `1px solid ${t.btnBorder}`,
                cursor: 'pointer'
              }}
              title="Copy term sheet summary to clipboard"
            >
              <Copy size={12} />
              <span>Copy Brief</span>
            </button>
          </div>
        </div>

        {/* Clean Underline Tab Navigation */}
        <div className="psd-tabs" style={{
          display: 'flex',
          alignItems: 'center',
          padding: isExpanded ? '0 28px' : '0 20px',
          backgroundColor: t.bg,
          borderBottom: `1px solid ${t.border}`,
          gap: '8px'
        }}>
          {[
            { id: 'COMMERCIAL', label: 'Counterparty & Origination', count: plant.verifiedDossier?.commercialContacts.length || 0 },
            { id: 'TECHNICAL', label: 'Technical & Grid Specs' },
            { id: 'COMPLIANCE', label: 'Statutory Diligence & Audit' },
            { id: 'ALL', label: 'All Details' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DrawerTab)}
                style={{
                  padding: '11px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${isDark ? '#38bdf8' : '#0284c7'}` : '2px solid transparent',
                  color: isActive ? (isDark ? '#38bdf8' : '#0284c7') : t.textMuted,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '8px',
                    backgroundColor: isActive ? (isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 132, 199, 0.12)') : t.bgSunken,
                    color: isActive ? (isDark ? '#38bdf8' : '#0284c7') : t.textMuted
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Drawer Body: Clean, Box-Free Tab Content */}
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
          className="noscroll psd-body"
        >

          {/* Inline Trader Desk Override Edit Form */}
          {isEditingOverride && (
            <div style={{ backgroundColor: t.bgHeader, border: `1px solid ${isDark ? '#10b981' : '#059669'}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <div className="psd-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      Signatory / Contact Name *
                    </label>
                    <input
                      type="text"
                      value={overrideSignatory}
                      onChange={e => setOverrideSignatory(e.target.value)}
                      placeholder="e.g. Dr. H. Schmidt / Managing Director"
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
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
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div className="psd-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
                      Direct Email
                    </label>
                    <input
                      type="email"
                      value={overrideEmail}
                      onChange={e => setOverrideEmail(e.target.value)}
                      placeholder="e.g. h.schmidt@operator.com"
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
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
                      style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
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
                    placeholder="e.g. Spoke to commercial director. Open to 3-year fixed PPA from Q1 2027."
                    rows={2}
                    style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
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

          {/* Main Tab Content Layout: Single Column in Tab Mode, Balanced Two Columns in 'ALL' Full Screen */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: (activeTab === 'ALL' && isExpanded) ? 'minmax(0, 1.15fr) minmax(0, 0.85fr)' : '1fr',
            gap: isExpanded ? '28px' : '20px',
            alignItems: 'start',
            width: '100%'
          }}>

            {/* TAB 1: Commercial & Counterparty Origination */}
            {(activeTab === 'ALL' || activeTab === 'COMMERCIAL') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                
                {/* Desk Confirmed Signatory Callout (if active) */}
                {deskOverride && !isEditingOverride && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '6px',
                    backgroundColor: isDark ? 'rgba(6, 78, 59, 0.25)' : 'rgba(16, 185, 129, 0.08)',
                    borderLeft: `3px solid ${isDark ? '#34d399' : '#059669'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} /> Desk Confirmed Signatory
                      </span>
                      <span style={{ fontSize: '11px', color: t.textMuted }}>
                        Verified by {deskOverride.traderName} on {new Date(deskOverride.verifiedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', flexWrap: 'wrap' }}>
                      <strong style={{ color: t.textMain }}>{deskOverride.counterpartySignatory}</strong>
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

                    {deskOverride.notes && (
                      <div style={{ fontSize: '11px', color: t.textSecondary, marginTop: '2px' }}>
                        <strong>Notes:</strong> {deskOverride.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Quality & Outreach Risk Alerts (Clean compact inline text, no heavy boxes) */}
                {contactQuality.confidence === 'UNDELIVERABLE' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: isDark ? '#fca5a5' : '#dc2626' }}>
                    <AlertOctagon size={13} style={{ flexShrink: 0 }} />
                    <span><strong>Synthetic address:</strong> {plant.contactEmail} was auto-generated from place name; it will bounce or reach an unrelated party (e.g. the town hall). Approach operator via official register or LinkedIn below.</span>
                  </div>
                )}
                {contactQuality.confidence === 'INDIRECT' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: isDark ? '#fcd34d' : '#d97706' }}>
                    <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                    <span><strong>Shared Switchboard:</strong> Contact connects to central EPC/hotline. Direct origination pathways are provided in the table below.</span>
                  </div>
                )}
                {contactQuality.isPersonalEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: isDark ? '#fdba74' : '#c2410c' }}>
                    <ShieldAlert size={13} style={{ flexShrink: 0 }} />
                    <span><strong>Personal Mailbox:</strong> Likely private farmer/sole trader email. Phone first or use verified corporate lead.</span>
                  </div>
                )}

                {/* Suggested Register Match Callout (Clean single-line text banner, NO BOX) */}
                {plant.verifiedDossier?.suggestedEntity && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: isDark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(2, 132, 199, 0.05)',
                    borderLeft: `3px solid ${isDark ? '#38bdf8' : '#0284c7'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#38bdf8' : '#0284c7' }}>
                          {plant.verifiedDossier.suggestedEntity.matchKind === 'INJECTION_SITE'
                            ? 'Injection-site match (ODRE) — operator not verified'
                            : plant.verifiedDossier.suggestedEntity.matchKind === 'PROJECT_DATABASE'
                            ? 'Planning-database match (REPD) — confirm operator'
                            : 'Register match — confirm'}:
                        </span>
                        <strong style={{ color: t.textMain }}>{plant.verifiedDossier.suggestedEntity.name}</strong>
                        {plant.verifiedDossier.suggestedEntity.registerId && (
                          <span style={{ color: isDark ? '#38bdf8' : '#0284c7', fontFamily: 'monospace', fontSize: '11px' }}>
                            ({plant.verifiedDossier.suggestedEntity.idLabel}: {plant.verifiedDossier.suggestedEntity.registerId})
                          </span>
                        )}
                        {plant.verifiedDossier.suggestedEntity.matchKind === 'OPERATOR_REGISTER' && plant.verifiedDossier.suggestedEntity.unitId && (
                          <span style={{ color: t.textMuted, fontFamily: 'monospace', fontSize: '11px' }}>
                            (MaStR unit: {plant.verifiedDossier.suggestedEntity.unitId})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {plant.verifiedDossier.suggestedEntity.evidence && plant.verifiedDossier.suggestedEntity.evidence.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowMatchEvidence(!showMatchEvidence)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isDark ? '#38bdf8' : '#0284c7',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: 0
                            }}
                          >
                            <span>{showMatchEvidence ? 'Hide Signals' : `Match Evidence (${plant.verifiedDossier.suggestedEntity.evidence.length})`}</span>
                            {showMatchEvidence ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                          </button>
                        )}
                        {plant.verifiedDossier.suggestedEntity.matchKind === 'OPERATOR_REGISTER' && (
                          <button
                            type="button"
                            onClick={() => {
                              setOverrideSignatory(plant.verifiedDossier?.suggestedEntity?.name || '');
                              setIsEditingOverride(true);
                            }}
                            style={{
                              padding: '3px 8px',
                              backgroundColor: '#0284c7',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Use as Signatory
                          </button>
                        )}
                      </div>
                    </div>
                    {showMatchEvidence && plant.verifiedDossier.suggestedEntity.evidence && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                        {plant.verifiedDossier.suggestedEntity.evidence.map((ev, i) => (
                          <span key={i} style={{ fontSize: '11px', color: t.textSecondary }}>
                            • {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Ambiguous Register Candidates (if any) */}
                {plant.registerMatch?.status === 'AMBIGUOUS' && plant.registerMatch.candidates && plant.registerMatch.candidates.length > 0 && (
                  <div style={{ padding: '8px 12px', borderLeft: `3px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                      Multiple Register Candidates ({plant.registerMatch.candidates.length})
                    </span>
                    {plant.registerMatch.candidates.slice(0, 3).map((cand, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '11px' }}>
                        <div>
                          <strong style={{ color: t.textMain }}>{cand.operatorName}</strong>
                          {cand.operatorRegisterId && <span style={{ fontFamily: 'monospace', color: t.textMuted }}> ({cand.operatorRegisterId})</span>}
                          {cand.town && <span style={{ color: t.textMuted }}> • {cand.town}</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOverrideSignatory(cand.operatorName);
                            setIsEditingOverride(true);
                          }}
                          style={{ padding: '2px 8px', backgroundColor: t.btnBg, color: t.btnText, border: `1px solid ${t.btnBorder}`, borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Core Entity Identity (Clean Definition List, NO BOXES) */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isExpanded ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)',
                  gap: '14px 18px',
                  paddingBottom: '14px',
                  borderBottom: `1px solid ${t.borderLight}`
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Legal Operating Entity
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '12px', color: t.textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator || 'Not identified'}>
                        {plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator || 'Not identified — search register'}
                      </strong>
                      {(plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator) && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(plant.verifiedDossier?.officialLegalEntity || plant.legalEntityName || plant.operator || '', 'Legal Entity')}
                          style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'monospace', color: plant.verifiedDossier?.statutoryRegistrationId ? (isDark ? '#34d399' : '#059669') : t.textMuted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {plant.verifiedDossier?.statutoryRegistrationId || (plant.registrationCheck && plant.registrationCheck.status !== 'CONFIRMED' ? 'Source ID rejected by register' : 'Not verified — search register')}
                      </span>
                      {plant.verifiedDossier?.statutoryRegistrationId && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(plant.verifiedDossier?.statutoryRegistrationId || '', 'Registration ID')}
                          style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '1px' }}
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
                    <span style={{ fontSize: '12px', fontWeight: 500, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {plant.verifiedDossier?.parentGroup || 'Not identified'}
                    </span>
                  </div>

                  <div>
                    <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                      Trading Desk Location
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#38bdf8' : '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {plant.verifiedDossier?.groupTradingDeskLocation || '—'}
                    </span>
                  </div>
                </div>

                {/* Researched Counterparty Block (Official Desk Research) */}
                {plant.research && (
                  <div style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : '#f8fafc',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {/* Header with Title and Tier Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={16} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Researched Counterparty
                        </span>
                      </div>

                      {/* Tier Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(() => {
                          const displayTier = plant.research.effectiveTier || plant.research.tier;
                          return (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor:
                                displayTier === 'READY'
                                  ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.12)')
                                  : displayTier === 'ENTITY_ONLY'
                                  ? (isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.12)')
                                  : (isDark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.12)'),
                              color:
                                displayTier === 'READY'
                                  ? (isDark ? '#34d399' : '#059669')
                                  : displayTier === 'ENTITY_ONLY'
                                  ? (isDark ? '#fbbf24' : '#d97706')
                                  : (isDark ? '#94a3b8' : '#64748b'),
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {displayTier === 'READY' && <CheckCircle2 size={12} />}
                              {displayTier === 'ENTITY_ONLY' && <AlertTriangle size={12} />}
                              {displayTier === 'UNRESOLVED' && <AlertOctagon size={12} />}
                              {displayTier === 'READY' ? 'Outreach-ready (sourced)' : displayTier === 'ENTITY_ONLY' ? 'ENTITY_ONLY' : 'UNRESOLVED'}
                            </span>
                          );
                        })()}
                        <span style={{ fontSize: '10px', color: t.textMuted }}>
                          Updated {new Date(plant.research.researchedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Discrepancy Warning if Raw Registry Contact Differs */}
                    {plant.contactEmail && plant.research.contacts && plant.research.contacts.length > 0 &&
                      !plant.research.contacts.some(c => c.value.toLowerCase().trim() === plant.contactEmail?.toLowerCase().trim()) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        padding: '6px 10px',
                        borderRadius: '5px',
                        backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.08)',
                        color: isDark ? '#fbbf24' : '#b45309',
                        border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)'}`
                      }}>
                        <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Registry contact differs from researched contact:</strong> Initial dataset listed <code>{plant.contactEmail}</code>, but verified research identified official desk <code>{plant.research.contacts.map(c => c.value).join(', ')}</code>.
                        </span>
                      </div>
                    )}

                    {/* Entity details grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: isExpanded ? 'repeat(3, 1fr)' : 'repeat(1, 1fr)', gap: '10px', fontSize: '12px' }}>
                      {plant.research.legalEntity && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Operating Company (SPV)</span>
                            {plant.research.legalEntity.check && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: plant.research.legalEntity.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: plant.research.legalEntity.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {plant.research.legalEntity.check.status === 'VERIFIED' ? '✓ verified' : plant.research.legalEntity.check.status.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <strong style={{ color: t.textMain }}>{plant.research.legalEntity.value}</strong>
                            <a href={plant.research.legalEntity.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${plant.research.legalEntity.sourceUrl} (${plant.research.legalEntity.retrievedAt})`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                          {plant.research.legalEntity.note && (
                            <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', marginTop: '1px' }}>{plant.research.legalEntity.note}</span>
                          )}
                        </div>
                      )}

                      {plant.research.registrationId && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Confirmed Registration / CIF</span>
                            {plant.research.registrationId.check && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: plant.research.registrationId.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: plant.research.registrationId.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {plant.research.registrationId.check.status === 'VERIFIED' ? '✓ verified' : plant.research.registrationId.check.status.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <code style={{ color: isDark ? '#34d399' : '#059669', fontWeight: 700 }}>{plant.research.registrationId.value}</code>
                            <a href={plant.research.registrationId.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${plant.research.registrationId.sourceUrl}`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                          {plant.research.registrationId.note && (
                            <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', marginTop: '1px' }}>{plant.research.registrationId.note}</span>
                          )}
                        </div>
                      )}

                      {plant.research.parentGroup && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Parent Group / Developer</span>
                            {plant.research.parentGroup.check && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: plant.research.parentGroup.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: plant.research.parentGroup.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {plant.research.parentGroup.check.status === 'VERIFIED' ? '✓ verified' : plant.research.parentGroup.check.status.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span style={{ color: t.textSecondary, fontWeight: 600 }}>{plant.research.parentGroup.value}</span>
                            <a href={plant.research.parentGroup.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${plant.research.parentGroup.sourceUrl}`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      )}

                      {plant.research.website && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Corporate Website</span>
                            {plant.research.website.check && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: plant.research.website.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: plant.research.website.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {plant.research.website.check.status === 'VERIFIED' ? '✓ verified' : plant.research.website.check.status.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <a href={plant.research.website.value} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Globe size={12} /> {plant.research.website.value.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        </div>
                      )}

                      {plant.research.plantLink && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Verified Plant Link</span>
                            {plant.research.plantLink.check && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: plant.research.plantLink.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: plant.research.plantLink.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {plant.research.plantLink.check.status === 'VERIFIED' ? '✓ verified' : plant.research.plantLink.check.status.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <a href={plant.research.plantLink.value} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#38bdf8' : '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <ExternalLink size={12} /> Asset Confirmation Link
                            </a>
                          </div>
                          {plant.research.plantLink.note && (
                            <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', marginTop: '1px' }}>{plant.research.plantLink.note}</span>
                          )}
                        </div>
                      )}

                      {plant.research.siteAddress && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Audited Physical Address</span>
                            {plant.research.siteAddress.check && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: plant.research.siteAddress.check.status === 'VERIFIED' ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: plant.research.siteAddress.check.status === 'VERIFIED' ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {plant.research.siteAddress.check.status === 'VERIFIED' ? '✓ verified' : plant.research.siteAddress.check.status.toLowerCase().replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <span style={{ color: t.textSecondary, display: 'block', marginTop: '2px' }}>
                            {plant.research.siteAddress.value}
                            {plant.research.siteCoordinates && (
                              <span style={{ color: t.textMuted, fontSize: '10px', display: 'block' }}>
                                ({plant.research.siteCoordinates.value[0].toFixed(4)}, {plant.research.siteCoordinates.value[1].toFixed(4)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Best Verified Contact */}
                      {(() => {
                        const best = getBestResearchContact(plant.research);
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontSize: '10px', color: t.textMuted, textTransform: 'uppercase' }}>Best Contact</span>
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                backgroundColor: best.isVerified ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                color: best.isVerified ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                              }}>
                                {best.isVerified ? '✓ verified' : 'no verified contact'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <strong style={{
                                color: best.isVerified ? t.textMain : (isDark ? '#f87171' : '#dc2626'),
                                fontSize: '12px'
                              }}>
                                {best.text}
                              </strong>
                              {best.contact?.sourceUrl && (
                                <a href={best.contact.sourceUrl} target="_blank" rel="noopener noreferrer" title={`Source: ${best.contact.sourceUrl}`} style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Researched Contacts List (Verified + Collapsible Unconfirmed) */}
                    {plant.research.contacts && plant.research.contacts.length > 0 && (() => {
                      const allContacts = plant.research.contacts;
                      const verified = allContacts.filter(c => c.check?.status === 'VERIFIED');
                      const unconfirmed = allContacts.filter(c => c.check && c.check.status !== 'VERIFIED');

                      const sortedVerified = [...verified].sort((a, b) => {
                        const sA = scopeOrder[a.contactScope || ''] || 0;
                        const sB = scopeOrder[b.contactScope || ''] || 0;
                        if (sB !== sA) return sB - sA;
                        const tA = typeOrder[a.type] || 0;
                        const tB = typeOrder[b.type] || 0;
                        return tB - tA;
                      });

                      const renderContactRow = (contact: typeof allContacts[0], idx: number) => {
                        const isVerified = contact.check?.status === 'VERIFIED';
                        const isGeneralPress = contact.contactScope === 'GENERAL_OR_PRESS';
                        return (
                          <div key={idx} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                            border: `1px solid ${t.borderLight}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.1)',
                                color: isDark ? '#38bdf8' : '#0284c7'
                              }}>
                                {contact.type}
                              </span>
                              <strong style={{ fontSize: '12px', color: t.textMain }}>{contact.value}</strong>
                              {contact.check && (
                                <span style={{
                                  fontSize: '9px',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 600,
                                  backgroundColor: isVerified ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)') : (isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)'),
                                  color: isVerified ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626')
                                }}>
                                  {isVerified ? '✓ verified' : contact.check.status.toLowerCase().replace(/_/g, ' ')}
                                </span>
                              )}
                              {isGeneralPress && (
                                <span style={{ fontSize: '10px', color: isDark ? '#fbbf24' : '#d97706', fontWeight: 600 }}>
                                  General/press inbox — not a commercial contact
                                </span>
                              )}
                              {contact.role && <span style={{ fontSize: '11px', color: t.textMuted }}>• {contact.role}</span>}
                              {contact.personName && <span style={{ fontSize: '11px', color: t.textSecondary }}>({contact.personName})</span>}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(contact.value, 'Contact')}
                                style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', padding: '2px' }}
                                title="Copy contact"
                              >
                                <Copy size={11} />
                              </button>
                              <a
                                href={contact.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Source: ${contact.sourceUrl}${contact.note ? `\nQuote: "${contact.note}"` : ''}`}
                                style={{
                                  color: isDark ? '#38bdf8' : '#0284c7',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  textDecoration: 'none'
                                }}
                              >
                                <ExternalLink size={11} />
                                <span>{contact.retrievedAt ? new Date(contact.retrievedAt).toISOString().split('T')[0] : 'source'}</span>
                              </a>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${t.borderLight}`, paddingTop: '10px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase' }}>
                            Researched Outreach Channels ({allContacts.length})
                          </span>

                          {/* Verified contacts displayed first, or explicit 'no verified contact' */}
                          {sortedVerified.length > 0 ? (
                            sortedVerified.map((c, i) => renderContactRow(c, i))
                          ) : (
                            <div style={{
                              padding: '6px 10px',
                              borderRadius: '5px',
                              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)'}`,
                              color: isDark ? '#f87171' : '#dc2626',
                              fontSize: '11px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                              <span>no verified contact</span>
                            </div>
                          )}

                          {/* Collapsible toggle for unconfirmed contacts */}
                          {unconfirmed.length > 0 && (
                            <div style={{ marginTop: '4px' }}>
                              <button
                                type="button"
                                onClick={() => setShowUnconfirmedContacts(!showUnconfirmedContacts)}
                                style={{
                                  background: 'none',
                                  border: `1px solid ${t.border}`,
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  color: t.textMuted,
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>Unconfirmed ({unconfirmed.length})</span>
                                {showUnconfirmedContacts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>

                              {showUnconfirmedContacts && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                                  {unconfirmed.map((c, i) => renderContactRow(c, i))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Offtake / Injection Notes */}
                    {plant.research.injectionOrOfftakeNotes && plant.research.injectionOrOfftakeNotes.length > 0 && (
                      <div style={{ fontSize: '11px', color: t.textSecondary, borderTop: `1px solid ${t.borderLight}`, paddingTop: '8px' }}>
                        <strong>Offtake & Grid Notes: </strong>
                        {plant.research.injectionOrOfftakeNotes.map((n, i) => (
                          <span key={i}>
                            {n.value}{' '}
                            <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: isDark ? '#38bdf8' : '#0284c7' }}>
                              [source]
                            </a>
                            {i < plant.research!.injectionOrOfftakeNotes.length - 1 ? '; ' : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Open Questions for Trader */}
                    {plant.research.openQuestions && plant.research.openQuestions.length > 0 && (
                      <div style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)',
                        borderLeft: '3px solid #ef4444',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
                          Open Questions Before Contacting:
                        </span>
                        {plant.research.openQuestions.map((q, idx) => (
                          <span key={idx} style={{ fontSize: '11px', color: t.textSecondary }}>
                            • {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Origination Pathways & Direct Leads (Clean Row List, NO BOXES) */}
                {plant.verifiedDossier && plant.verifiedDossier.commercialContacts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Commercial Leads & Origination Pathways ({plant.verifiedDossier.commercialContacts.length})
                      </span>
                      <span style={{ fontSize: '11px', color: t.textMuted }}>
                        Target: <strong style={{ color: t.textSecondary }}>{targetOperator}</strong>
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {plant.verifiedDossier.commercialContacts.map((contact, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '10px 0',
                            borderBottom: idx < plant.verifiedDossier!.commercialContacts.length - 1 ? `1px solid ${t.borderLight}` : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '14px'
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '12px', color: t.textMain }}>{contact.fullName}</strong>
                              <span style={{
                                fontSize: '9px',
                                fontWeight: 600,
                                padding: '1px 6px',
                                borderRadius: '3px',
                                backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                                color: t.textSecondary,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em'
                              }}>
                                {LEAD_SOURCE_LABEL[contact.source]}
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted, marginTop: '2px' }}>
                              {contact.title}
                              {contact.source === 'SOURCE_DATASET' && plant.research?.contacts && plant.research.contacts.length > 0 && contact.workEmail &&
                                !plant.research.contacts.some(c => c.value.toLowerCase().trim() === contact.workEmail?.toLowerCase().trim()) && (
                                <span style={{ marginLeft: '8px', color: isDark ? '#fbbf24' : '#d97706', fontStyle: 'italic', fontWeight: 500 }}>
                                  — Registry contact differs from researched contact
                                </span>
                              )}
                            </div>

                            {/* Contact Channels if available */}
                            {(contact.workEmail || contact.directPhone) && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '3px', fontSize: '11px', flexWrap: 'wrap' }}>
                                {contact.workEmail && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Mail size={11} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
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
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Phone size={11} style={{ color: t.textMuted }} />
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
                              </div>
                            )}
                          </div>

                          {/* Direct Action: LinkedIn Role Search */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <a
                              href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`"${targetOperator.replace(/\b(SAS|SARL|GmbH(\s*&\s*Co\.?\s*KG)?|Ltd|Limited|SpA|Srl|ApS|A\/S|B\.V\.|BV|AG|SE|e\.V\.)\b/gi, '').replace(/[()[\]"']/g, '').trim()}" "${contact.title.replace(/\s*—\s*/g, ' ')}"`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '5px',
                                color: isDark ? '#38bdf8' : '#0284c7',
                                fontSize: '11px',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                              title={`Search LinkedIn for ${contact.title} at ${targetOperator}`}
                            >
                              <Linkedin size={12} />
                              <span>Search Role ↗</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clean Verification Links Row (NO BOX) */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  paddingTop: '12px',
                  borderTop: `1px solid ${t.borderLight}`,
                  fontSize: '11px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: t.textMuted }}>
                    <Scale size={13} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                    <span>Register: <strong style={{ color: t.textSecondary }}>{officialRegister.registerName}</strong></span>
                  </div>

                  <a
                    href={officialRegister.searchUrl || officialRegister.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Verify in {officialRegister.registerName.split(' ')[0]} ↗
                  </a>

                  {websiteUrl && (
                    <>
                      <span style={{ color: t.border }}>•</span>
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: isDark ? '#60a5fa' : '#2563eb', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Globe size={11} />
                        <span>Corporate Website ↗</span>
                      </a>
                    </>
                  )}

                  {linkedinCompanyUrl && (
                    <>
                      <span style={{ color: t.border }}>•</span>
                      <a
                        href={linkedinCompanyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Linkedin size={11} />
                        <span>Company Page ↗</span>
                      </a>
                    </>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: Physical & Technical Parameters */}
            {(activeTab === 'ALL' || activeTab === 'TECHNICAL') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px', borderBottom: `1px solid ${t.borderLight}` }}>
                  <Activity size={15} style={{ color: isDark ? '#38bdf8' : '#0284c7' }} />
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Physical Capacity & Technical Parameters
                  </h3>
                </div>

                {/* Clean Open Key-Value Specification Rows (NO BOX) */}
                <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Annual Injected Energy:</span>
                    <strong style={{ color: t.textMain }}>
                      {plant.annualEnergyGWh ? `${plant.annualEnergyGWh.toLocaleString()} GWh/y (${(plant.annualEnergyGWh * 1000).toLocaleString()} MWh/y)` : '—'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Hourly Biomethane Flow:</span>
                    <strong style={{ color: t.textMain }}>
                      {plant.capacityNm3h ? `${plant.capacityNm3h.toLocaleString()} Nm³/h` : '—'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Audited Carbon Intensity:</span>
                    <strong style={{ color: ciValue < 0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#fbbf24' : '#d97706') }}>
                      {ciValue} gCO₂e/MJ {plant.verifiedCarbonIntensity ? '(Audited)' : '(RED III Annex IX Default)'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Primary Feedstock Category:</span>
                    <strong style={{ color: isDark ? '#10b981' : '#059669' }}>
                      {plant.primaryFeedstockCategory || 'Agricultural Biomass'}
                    </strong>
                  </div>

                  {plant.feedstockDetails && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}`, gap: '16px' }}>
                      <span style={{ color: t.textMuted, flexShrink: 0 }}>Substrate Mix / Recipe:</span>
                      <span style={{ color: t.textSecondary, textAlign: 'right' }}>{plant.feedstockDetails}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Upgrading Separation Technology:</span>
                    <strong style={{ color: t.textMain }}>{plant.upgradingTechnology || 'Membrane separation'}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Grid Operator (TSO/DSO):</span>
                    <span style={{ fontFamily: 'monospace', color: t.textSecondary }}>{plant.networkOperator || 'National Gas Grid'}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                    <span style={{ color: t.textMuted }}>Grid Connection Level:</span>
                    <span style={{ color: t.textSecondary }}>{plant.gridConnectionType || 'Distribution Grid Injection (DSO)'}</span>
                  </div>

                  {plant.supportScheme && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: `1px solid ${t.borderLight}` }}>
                      <span style={{ color: t.textMuted }}>Statutory Subsidy Regime:</span>
                      <strong style={{ color: isDark ? '#fbbf24' : '#d97706' }}>
                        {plant.supportScheme} {plant.supportExpiryDate ? `(Expiry: ${plant.supportExpiryDate})` : ''}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: Compliance & Provenance */}
            {(activeTab === 'ALL' || activeTab === 'COMPLIANCE') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px', borderBottom: `1px solid ${t.borderLight}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Scale size={15} style={{ color: isDark ? '#10b981' : '#059669' }} />
                    <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: t.textMain, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Statutory Diligence & Provenance
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAuditPlantDiligence}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                      color: isDark ? '#fbbf24' : '#d97706',
                      border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(217, 119, 6, 0.3)'}`,
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Run 6-Gate Audit ↗
                  </button>
                </div>

                {/* Raw Census Baseline Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRawCensus(!showRawCensus)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: t.textMuted,
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <span>Raw Census Baseline (GIE / EBA 2026)</span>
                    {showRawCensus ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {showRawCensus && (
                    <div style={{ marginTop: '8px', padding: '10px 0', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${t.borderLight}` }}>
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

                {/* Institutional Provenance Declaration */}
                <div style={{ paddingTop: '8px', borderTop: `1px solid ${t.borderLight}`, fontSize: '11px', color: t.textMuted, lineHeight: 1.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: t.textMain, fontWeight: 600, marginBottom: '2px' }}>
                    <ShieldCheck size={12} style={{ color: isDark ? '#10b981' : '#059669' }} />
                    <span>Data Provenance Tier</span>
                  </div>
                  <span style={{ color: t.textSecondary }}>
                    {plant.provenance || 'Source attribution recorded under statutory census guidelines.'}
                  </span>
                </div>
              </div>
            )}

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
            className="psd-expand-btn"
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
