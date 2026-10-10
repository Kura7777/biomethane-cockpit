import { useMemo } from 'react';
import {
  ShieldCheck,
  Minimize2,
  Maximize2,
  X,
  Zap,
  Scale,
  MapPin,
  Linkedin,
  PlusCircle,
  Copy
} from 'lucide-react';
import { BiomethanePlant, TraderDeskOverride } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';
import { plantEnergyFigure, researchedOperatingSince, researchedPlantEntity } from '../../../domain/plants/compliance';
import { useAppState } from '../../../store/context';
import { compareDestinationsForPlant } from '../../../domain/arbitrage/plantDestinations';
import { bestDestination } from '../../../domain/arbitrage/destinationComparison';

interface PlantDrawerHeaderProps {
  plant: BiomethanePlant;
  isExpanded: boolean;
  toggleExpanded: () => void;
  onClose: () => void;
  isDark: boolean;
  t: PlantDrawerTheme;
  ciValue: number;
  deskOverride: TraderDeskOverride | null;
  linkedinSearchUrl: string;
  handleLaunchTrade: () => void;
  handleAuditPlantDiligence: () => void;
  handleStartEditOverride: () => void;
  handleCopyTermSheet: () => void;
  onNavigateMap: () => void;
}

export function PlantDrawerHeader({
  plant,
  isExpanded,
  toggleExpanded,
  onClose,
  isDark,
  t,
  ciValue,
  deskOverride,
  linkedinSearchUrl,
  handleLaunchTrade,
  handleAuditPlantDiligence,
  handleStartEditOverride,
  handleCopyTermSheet,
  onNavigateMap,
}: PlantDrawerHeaderProps) {
  const energy = plantEnergyFigure(plant);
  const { state } = useAppState();
  const entity = researchedPlantEntity(plant.id);
  const since = researchedOperatingSince(plant.id);
  // Same comparison as the map's "Where can this gas go?", so the two cannot disagree.
  const best = useMemo(
    () => bestDestination(compareDestinationsForPlant({ origin: plant.countryCode, plant, marks: state.marks, costs: state.costs })),
    [plant, state.marks, state.costs],
  );
  return (
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
                <ShieldCheck size={12} /> Verified Attributes
              </span>
            )}
          </div>

          <h2 className="psd-title" style={{ fontSize: isExpanded ? '22px' : '18px', fontWeight: 800, margin: 0, color: t.textMain, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {plant.name}
          </h2>
          <p style={{ fontSize: '12px', color: t.textMuted, margin: '3px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {entity ? (
              <span style={{ color: t.textSecondary, fontWeight: 500 }} data-testid="plant-header-entity">
                {entity.name} <a href={entity.url} target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted, fontWeight: 400 }}>(researched)</a>
              </span>
            ) : (
              <span style={{ color: t.textSecondary, fontWeight: 500 }}>{plant.operator || plant.legalEntityName || 'Independent Producer'}</span>
            )}
            {since ? (
              <span data-testid="plant-header-since">
                • Operating since {since.value} <a href={since.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: t.textMuted }}>(researched)</a>
              </span>
            ) : plant.commissioningYear && <span>• Comm. {plant.commissioningYear}</span>}
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
            <strong style={{ fontSize: '15px', color: t.textMain, fontWeight: 800 }} data-testid="plant-annual-energy">
              {energy ? `${energy.gwh.toLocaleString()} GWh/y` : '—'}
            </strong>
            {energy && (
              <span style={{ fontSize: '11px', color: t.textMuted }}>
                ({(energy.gwh * 1000).toLocaleString()} MWh)
              </span>
            )}
          </div>
          {energy?.label && (
            <span style={{ fontSize: '10px', color: t.textMuted, display: 'block' }} data-testid="plant-energy-label">{energy.label}</span>
          )}
          {energy?.year && energy.source && (
            <span style={{ fontSize: '10px', color: t.textMuted, display: 'block' }} data-testid="plant-energy-actual">
              Actual {energy.year} · <a href={energy.source.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: t.textSecondary }}>source</a>
            </span>
          )}
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
          <span style={{ fontSize: '10px', color: t.textMuted, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>CI (feedstock default)</span>
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
          <strong style={{ fontSize: '13px', color: isDark ? '#38bdf8' : '#0284c7', fontWeight: 700 }} data-testid="plant-optimal-route">
            {best ? best.label : 'No open route'}
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
          onClick={onNavigateMap}
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
  );
}
