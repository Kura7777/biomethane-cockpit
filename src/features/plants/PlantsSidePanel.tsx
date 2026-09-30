import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { BiomethanePlant, CountryMacroStat } from '../../domain/plants/types';
import { Sheet } from '../../shared/ui';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';

const DATA_QUALITY_LABELS: Record<string, string> = {
  approximateCoordinates: 'Approximate location',
  syntheticAddress: 'Address not sourced',
  placeholderRegion: 'Region is a placeholder',
  duplicateOf: 'Possible duplicate',
  contactConfidence: 'Contact unverified',
};

function contactStatus(plant: BiomethanePlant): { dot: 'amber' | 'grey' | 'red'; label: string } {
  const label = plant.contactQuality?.confidenceLabel || '';
  if (label.startsWith('Unverified Lead')) return { dot: 'amber', label: 'Unverified lead' };
  if (label.startsWith('Indirect')) return { dot: 'grey', label: 'Switchboard' };
  if (label.startsWith('Synthetic')) return { dot: 'red', label: 'Do not use' };
  return { dot: 'grey', label: 'No contact' };
}

export interface PlantsSidePanelProps {
  plant: BiomethanePlant | null;
  countryStats: CountryMacroStat[];
  maxCountryPlants: number;
  selectedCountry: string;
  onSelectCountry: (iso: string) => void;
  onClose: () => void;
  onPriceDeal: (plant: BiomethanePlant) => void;
  onOpenDossier: (plant: BiomethanePlant) => void;
  /** Mobile only: whether the detail sheet is open (the list is full width, detail is a sheet). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/** Sticky right-hand panel: selected plant detail with a "price a deal" / "full dossier" footer,
 *  or — when nothing is selected — the country totals rail it replaces. The detail can be
 *  expanded into a large centred dialog for reading it at a bigger size. */
export function PlantsSidePanel({
  plant,
  countryStats,
  maxCountryPlants,
  selectedCountry,
  onSelectCountry,
  onClose,
  onPriceDeal,
  onOpenDossier,
  mobileOpen = false,
  onMobileClose,
}: PlantsSidePanelProps) {
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef<HTMLElement>(null);

  // Selecting another plant (or closing) always returns to the side panel
  useEffect(() => {
    setExpanded(false);
  }, [plant?.id]);

  useEffect(() => {
    if (!expanded) return;
    expandedRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  if (isMobile && !plant) return null;

  if (!plant) {
    return (
      <aside className="ds-aside plants-aside">
        <div className="ds-aside-section">
          <div className="ds-panel-section-heading">Country totals</div>
          <div className="plants-country-hint">Click a country to filter the census.</div>
        </div>
        <div className="ds-aside-body">
          <div className="plants-country-list">
            {countryStats.map(c => {
              const barWidth = (c.activePlants / maxCountryPlants) * 100;
              const isSelected = selectedCountry === c.iso;
              return (
                <button
                  type="button"
                  key={c.iso}
                  className={`plants-country-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectCountry(isSelected ? 'ALL' : c.iso)}
                >
                  <div className="plants-country-row-top">
                    <span>{c.flag}</span>
                    <span className="plants-country-iso num">{c.iso}</span>
                    <span className="plants-country-name">{c.country}</span>
                    <span className="num plants-country-count">{c.activePlants.toLocaleString()}</span>
                    <span className="num plants-country-twh">{c.installedCapacityTWh ? `${c.installedCapacityTWh.toFixed(1)} TWh` : '—'}</span>
                  </div>
                  <div className="plants-country-bar-track">
                    <div className="plants-country-bar-fill" style={{ width: `${barWidth}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }

  const status = contactStatus(plant);
  const ci = plant.verifiedCarbonIntensity;
  const flags: string[] = [];
  if (plant.dataQuality) {
    if (plant.dataQuality.approximateCoordinates) flags.push(DATA_QUALITY_LABELS.approximateCoordinates);
    if (plant.dataQuality.syntheticAddress) flags.push(DATA_QUALITY_LABELS.syntheticAddress);
    if (plant.dataQuality.placeholderRegion) flags.push(DATA_QUALITY_LABELS.placeholderRegion);
    if (plant.dataQuality.duplicateOf) flags.push(DATA_QUALITY_LABELS.duplicateOf);
    if (plant.dataQuality.contactConfidence) flags.push(DATA_QUALITY_LABELS.contactConfidence);
  }
  flags.push('CI is feedstock default');

  const footerButtonsInner = (
    <>
      <button type="button" className="btn btn-primary plants-panel-btn" onClick={() => onPriceDeal(plant)}>
        Price a deal
      </button>
      <button type="button" className="btn btn-secondary plants-panel-btn" onClick={() => onOpenDossier(plant)}>
        Full dossier
      </button>
    </>
  );
  const footerButtons = <div className="ds-aside-footer">{footerButtonsInner}</div>;

  const renderPanel = (isExpanded: boolean, inSheet = false) => (
    <aside
      ref={isExpanded ? expandedRef : undefined}
      className={`ds-aside plants-aside ${isExpanded ? 'plants-aside-expanded' : ''} ${inSheet ? 'plants-aside-sheet' : ''}`}
      role={isExpanded ? 'dialog' : undefined}
      aria-modal={isExpanded ? true : undefined}
      aria-label={isExpanded ? `${plant.name} details` : undefined}
      tabIndex={isExpanded ? -1 : undefined}
    >
      <div className="ds-aside-section">
        {!inSheet && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <div className="ds-panel-title">{plant.name}</div>
            <div className="ds-panel-meta plants-panel-meta">
              <span className="plants-iso-tag num">{plant.countryCode}</span>
              {plant.region && <> · {plant.region}</>}
              {plant.commissioningYear && <> · Active since {plant.commissioningYear}</>}
            </div>
          </div>
          <div className="plants-panel-actions">
            <button
              type="button"
              aria-label={isExpanded ? 'Exit full screen' : 'Expand panel'}
              title={isExpanded ? 'Exit full screen (Esc)' : 'Expand panel'}
              onClick={() => setExpanded(!isExpanded)}
              className="ds-icon-btn ds-icon-btn-sm"
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button type="button" aria-label="Close panel" title="Close panel" onClick={onClose} className="ds-icon-btn ds-icon-btn-sm">
              <X size={14} />
            </button>
          </div>
        </div>}

        <div className="plants-panel-stats">
          <div>
            <div className="ds-panel-stat-label">Output</div>
            <div className="ds-panel-stat-value num">{plant.annualEnergyGWh ? plant.annualEnergyGWh.toFixed(1) : '—'} <span className="unit">GWh/y</span></div>
          </div>
          <div>
            <div className="ds-panel-stat-label">Capacity</div>
            <div className="ds-panel-stat-value num">{plant.capacityNm3h ? plant.capacityNm3h.toLocaleString() : '—'} <span className="unit">Nm³/h</span></div>
          </div>
          <div>
            <div className="ds-panel-stat-label">CI (default)</div>
            <div className={`ds-panel-stat-value num ${ci !== null && ci !== undefined && ci < 0 ? 'plants-ci-negative' : ''}`}>
              {ci !== null && ci !== undefined ? ci.toFixed(1) : '—'} <span className="unit">g/MJ</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ds-aside-body">
        <div className="ds-aside-section">
          <div className="ds-panel-section-heading">Supply</div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Feedstock</span>
            <span>{plant.primaryFeedstockCategory || '—'}</span>
          </div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Support scheme</span>
            <span>{plant.supportScheme || '—'}</span>
          </div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Grid operator</span>
            <span>{plant.networkOperator || '—'}</span>
          </div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Connection level</span>
            <span>{plant.gridConnectionLevel || plant.gridConnectionType || '—'}</span>
          </div>
        </div>

        <div className="ds-aside-section">
          <div className="ds-panel-section-heading">Counterparty</div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Legal entity</span>
            <span>{plant.legalEntityName || plant.operator || '—'}</span>
          </div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Registration ID</span>
            <span className="plants-panel-row-value">
              {plant.companyRegistrationId ? (
                <>
                  <span className="num">{plant.companyRegistrationId}</span>{' '}
                  <span className="plants-badge plants-badge-pos">Register-confirmed</span>
                </>
              ) : (
                <span className="plants-badge plants-badge-warn">Unverified</span>
              )}
            </span>
          </div>
          <div className="plants-panel-row">
            <span className="plants-panel-row-label">Contact status</span>
            <span className="plants-contact-status">
              <span className={`plants-dot plants-dot-${status.dot}`} />
              {status.label}
            </span>
          </div>
          <div className="plants-panel-note">Verify the operating entity in the national register before outreach.</div>
        </div>

        <div className="ds-aside-section" style={{ flexGrow: 1 }}>
          <div className="ds-panel-section-heading">Data quality</div>
          <div className="plants-flag-chips">
            {flags.map((f, i) => (
              <span key={i} className="plants-flag-chip">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {!inSheet && footerButtons}
    </aside>
  );

  if (isMobile) {
    return (
      <Sheet
        open={mobileOpen}
        onClose={() => onMobileClose?.()}
        variant="full"
        title={plant.name}
        subtitle={[plant.countryCode, plant.region, plant.commissioningYear ? `Active since ${plant.commissioningYear}` : null].filter(Boolean).join(' · ')}
        footer={<div className="plants-sheet-footer">{footerButtonsInner}</div>}
        testId="plant-detail-sheet"
      >
        {renderPanel(false, true)}
      </Sheet>
    );
  }

  return (
    <>
      {renderPanel(false)}
      {expanded &&
        createPortal(
          <div
            className="scrim plants-expand-scrim"
            onMouseDown={e => {
              if (e.target === e.currentTarget) setExpanded(false);
            }}
          >
            {renderPanel(true)}
          </div>,
          document.body,
        )}
    </>
  );
}
