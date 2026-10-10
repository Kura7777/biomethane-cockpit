import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiomethanePlant, TraderDeskOverride } from '../../domain/plants/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { plantDealParams, feedstockKeyForPlant, defaultMarketForOrigin, plantCi } from '../../domain/trade/dealDefaults';
import { hasApproximateCoordinates } from '../../domain/plants/registry';
import { evaluatePlantContactQuality } from '../../domain/plants/contactQuality';
import { showToast } from '../../app/DeskToastContainer';
import { useTheme } from '../../store/theme';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import './plantsMobile.css';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { generateLinkedInOriginationUrl } from '../../domain/plants/statutoryDossiers';
import { 
  getTraderDeskOverride, 
  saveTraderDeskOverride, 
  deleteTraderDeskOverride 
} from '../../domain/plants/deskOverridesStore';
import {
  getBestResearchContact,
  formatExternalUrl,
  buildPlantOriginationBrief
} from './plantBriefBuilders';
import { getPlantDrawerTheme } from './drawer/plantDrawerTheme';
import { PlantDrawerHeader } from './drawer/PlantDrawerHeader';
import { PlantOverrideEditor } from './drawer/PlantOverrideEditor';
import { PlantTabCommercial } from './drawer/PlantTabCommercial';
import { PlantTabTechnical } from './drawer/PlantTabTechnical';
import { PlantTabCompliance } from './drawer/PlantTabCompliance';
import { PlantTabAllDetails } from './drawer/PlantTabAllDetails';

export { getBestResearchContact };

type DrawerTab = 'ALL' | 'COMMERCIAL' | 'TECHNICAL' | 'COMPLIANCE';

interface PlantSourcingDrawerProps {
  plant: BiomethanePlant | null;
  onClose: () => void;
}

export function PlantSourcingDrawer({ plant, onClose }: PlantSourcingDrawerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const t = getPlantDrawerTheme(isDark);
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<DrawerTab>('COMMERCIAL');
  const [deskOverride, setDeskOverride] = useState<TraderDeskOverride | null>(() => plant ? getTraderDeskOverride(plant.id) : null);
  const [isEditingOverride, setIsEditingOverride] = useState(false);
  const [overrideTrader, setOverrideTrader] = useState('');
  const [overrideSignatory, setOverrideSignatory] = useState('');
  const [overrideEmail, setOverrideEmail] = useState('');
  const [overridePhone, setOverridePhone] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  const [isExpandedStored, setIsExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('plant_drawer_expanded') === 'true';
    } catch {
      return false;
    }
  });
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
    const handleOverrideUpdate = (e: Event) => {
      const custom = e as CustomEvent<{ plantId?: string }>;
      if (plant && (custom.detail?.plantId === plant.id || custom.detail?.plantId === 'all')) {
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
    showToast(`Copied ${key} to clipboard`, 'info');
  };

  const feedstockKey = feedstockKeyForPlant(plant);
  const defaultMarket = defaultMarketForOrigin(plant.countryCode);
  const volumeMWh = plant.annualEnergyGWh ? Math.round(plant.annualEnergyGWh * 1000) : undefined;
  const ciValue = plantCi(plant).ci;

  const handleStartEditOverride = () => {
    setOverrideTrader(deskOverride?.traderName || 'Front-Office Trader');
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
    const summary = buildPlantOriginationBrief(plant, ciValue);
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

  const contactQuality = plant.contactQuality ?? evaluatePlantContactQuality(plant);
  const officialRegister = contactQuality.officialRegister;

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

        {/* Header / Executive Summary Hero */}
        <PlantDrawerHeader
          plant={plant}
          isExpanded={isExpanded}
          toggleExpanded={toggleExpanded}
          onClose={onClose}
          isDark={isDark}
          t={t}
          ciValue={ciValue}
          deskOverride={deskOverride}
          linkedinSearchUrl={linkedinSearchUrl}
          handleLaunchTrade={handleLaunchTrade}
          handleAuditPlantDiligence={handleAuditPlantDiligence}
          handleStartEditOverride={handleStartEditOverride}
          handleCopyTermSheet={handleCopyTermSheet}
          onNavigateMap={() => {
            onClose();
            navigate(`/map?origin=${encodeURIComponent(plant.countryCode)}&plant=${encodeURIComponent(plant.id)}`);
          }}
        />

        {/* Tab Navigation */}
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
          className="noscroll psd-body"
        >
          {isEditingOverride && (
            <PlantOverrideEditor
              deskOverride={deskOverride}
              overrideSignatory={overrideSignatory}
              setOverrideSignatory={setOverrideSignatory}
              overrideTrader={overrideTrader}
              setOverrideTrader={setOverrideTrader}
              overrideEmail={overrideEmail}
              setOverrideEmail={setOverrideEmail}
              overridePhone={overridePhone}
              setOverridePhone={setOverridePhone}
              overrideNotes={overrideNotes}
              setOverrideNotes={setOverrideNotes}
              isDark={isDark}
              t={t}
              handleSaveOverride={handleSaveOverride}
              handleDeleteOverride={handleDeleteOverride}
              setIsEditingOverride={setIsEditingOverride}
            />
          )}

          {activeTab === 'COMMERCIAL' && (
            <PlantTabCommercial
              plant={plant}
              isExpanded={isExpanded}
              isDark={isDark}
              t={t}
              deskOverride={deskOverride}
              isEditingOverride={isEditingOverride}
              setIsEditingOverride={setIsEditingOverride}
              setOverrideSignatory={setOverrideSignatory}
              targetOperator={targetOperator}
              websiteUrl={websiteUrl}
              linkedinCompanyUrl={linkedinCompanyUrl}
              contactQuality={contactQuality}
              officialRegister={officialRegister}
              copyToClipboard={copyToClipboard}
            />
          )}

          {activeTab === 'TECHNICAL' && (
            <PlantTabTechnical
              plant={plant}
              ciValue={ciValue}
              isDark={isDark}
              t={t}
            />
          )}

          {activeTab === 'COMPLIANCE' && (
            <PlantTabCompliance
              plant={plant}
              isDark={isDark}
              t={t}
              contactQuality={contactQuality}
              handleAuditPlantDiligence={handleAuditPlantDiligence}
            />
          )}

          {activeTab === 'ALL' && (
            <PlantTabAllDetails
              plant={plant}
              isExpanded={isExpanded}
              isDark={isDark}
              t={t}
              ciValue={ciValue}
              deskOverride={deskOverride}
              isEditingOverride={isEditingOverride}
              setIsEditingOverride={setIsEditingOverride}
              setOverrideSignatory={setOverrideSignatory}
              targetOperator={targetOperator}
              websiteUrl={websiteUrl}
              linkedinCompanyUrl={linkedinCompanyUrl}
              contactQuality={contactQuality}
              officialRegister={officialRegister}
              handleAuditPlantDiligence={handleAuditPlantDiligence}
              copyToClipboard={copyToClipboard}
            />
          )}
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
