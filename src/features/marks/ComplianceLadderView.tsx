import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { MARKETS } from '../../domain/markets/registry';
import { Market } from '../../domain/markets/types';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { resolveMarketForQuote, rowFeedsMarket, rowHasPrice } from '../../domain/marks/applyMarks';
import { showToast } from '../../app/DeskToastContainer';
import { ShieldCheck, Scale, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

interface ComplianceLadderViewProps {
  quotes: PricingBookEntry[];
  onCellEdit: (id: string, field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume', val: string) => void;
}

interface StatutoryMarketDef {
  marketId: string;
  country: string;
  flag: string;
  name: string;
  shortName: string;
  scheme: string;
  legalBasis: string;
  registry: string;
  unit: string;
  obligation2026: string;
  obligation2030: string;
  statutoryCeiling: string;
  ceilingNumeric: number; // in native unit
  currentMidFallback: number;
}

const STATUTORY_SCHEMES: StatutoryMarketDef[] = [
  {
    marketId: 'DE_THG',
    country: 'DE',
    flag: '🇩🇪',
    name: 'Germany THG-Quote',
    shortName: 'DE THG',
    scheme: '38. BImSchV Transport GHG Quota',
    legalBasis: '§37a BImSchG, 38. BImSchV, Zweites Gesetz zur Weiterentwicklung (Drs 21/5530)',
    registry: 'dena Biogasregister / UBA',
    unit: '€/tCO₂e',
    obligation2026: '10.5% – 12.0%',
    obligation2030: '25.0% RED III target',
    statutoryCeiling: '€600.00/tCO₂e buyout penalty',
    ceilingNumeric: 600.0,
    currentMidFallback: 285.0,
  },
  {
    marketId: 'NL_ERE',
    country: 'NL',
    flag: '🇳🇱',
    name: 'Netherlands ERE',
    shortName: 'NL ERE',
    scheme: 'Wet milieubeheer / Regeling energie vervoer (REV)',
    legalBasis: 'Wet milieubeheer titel 9.7, Regeling energie vervoer',
    registry: 'NEa REV / myVertiCer',
    unit: '€/kgCO₂e',
    obligation2026: '28.4% energy in transport',
    obligation2030: '38.0% RED III target',
    statutoryCeiling: 'NEa non-compliance administrative penalty',
    ceilingNumeric: 0.60,
    currentMidFallback: 0.34,
  },
  {
    marketId: 'UK_RTFO',
    country: 'UK',
    flag: '🇬🇧',
    name: 'UK RTFO (Renewable Transport Fuel Obligation)',
    shortName: 'UK RTFO',
    scheme: 'RTFO Order 2007 (Transport Compliance)',
    legalBasis: 'Energy Act 2004, Renewable Transport Fuel Obligations Order 2007',
    registry: 'DfT RTFO Operating System (ROS)',
    unit: 'p/RTFC',
    obligation2026: '14.6% main obligation',
    obligation2030: '20.5% statutory target',
    statutoryCeiling: '50.00 p/RTFC statutory buyout cap',
    ceilingNumeric: 50.0,
    currentMidFallback: 21.75,
  },
  {
    marketId: 'FR_CPB',
    country: 'FR',
    flag: '🇫🇷',
    name: 'France CPB (Certificats de Production de Biogaz)',
    shortName: 'FR CPB',
    scheme: 'TIRUERT / Code de l\'énergie incorporation mandate',
    legalBasis: 'Code de l\'énergie Art. L.446-24 et seq., Décret n° 2024-302',
    registry: 'EEX / Registre national CPB',
    unit: '€/MWh',
    obligation2026: '0.41% natural gas supply',
    obligation2030: '8.50% statutory trajectory',
    statutoryCeiling: '€100.00/MWh hard statutory penalty cap',
    ceilingNumeric: 100.0,
    currentMidFallback: 78.5,
  },
  {
    marketId: 'IT_CIC',
    country: 'IT',
    flag: '🇮🇹',
    name: 'Italy CIC (Certificati di Immissione in Consumo)',
    shortName: 'IT CIC',
    scheme: 'Decreto Biometano 2018 / 2022 Transport Mandate',
    legalBasis: 'Decreto Ministeriale 2 marzo 2018, D.M. 15 settembre 2022',
    registry: 'GSE (Gestore dei Servizi Energetici)',
    unit: '€/CIC',
    obligation2026: 'National transport bio-quota',
    obligation2030: 'RED III advanced quota',
    statutoryCeiling: '€375.00/CIC fixed withdrawal tariff',
    ceilingNumeric: 375.0,
    currentMidFallback: 310.0,
  },
  {
    marketId: 'FUELEU',
    country: 'EU',
    flag: '🇪🇺',
    name: 'FuelEU Maritime Compliance Deficit',
    shortName: 'FuelEU',
    scheme: 'Regulation (EU) 2023/1805 Maritime GHG Intensity',
    legalBasis: 'Regulation (EU) 2023/1805 on the use of renewable fuels in maritime transport',
    registry: 'FuelEU Maritime Database / Thetis-EU MRV',
    unit: '€/tCO₂e',
    obligation2026: '-2.0% GHG intensity vs 91.16 gCO₂e/MJ baseline',
    obligation2030: '-6.0% GHG intensity target',
    statutoryCeiling: '€2,400.00/t VLSFO-eq statutory penalty',
    ceilingNumeric: 2400.0,
    currentMidFallback: 285.0,
  },
];

export function ComplianceLadderView({ quotes, onCellEdit }: ComplianceLadderViewProps) {
  const { state, dispatch } = useAppState();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '12px 16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderLeft: '4px solid var(--color-warn)',
          borderRadius: 'var(--radius-panel)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Scale className="w-5 h-5" style={{ color: 'var(--color-warn)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>
              National Statutory Compliance Quotas (RED III &amp; Domestic Transport Mandates)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              These instruments are non-conflicting pure statutory compliance attributes. Each scheme enforces statutory non-compliance penalties and specific national mass balance registries.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="chip chip-warn">RED III Annex IX-A</span>
          <span className="chip chip-info">UDB Mass Balance</span>
        </div>
      </div>

      {/* Scheme Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        {STATUTORY_SCHEMES.map(scheme => {
          // Find matching quotes for this market
          const matchingQuotes = quotes.filter(q => {
            const mId = resolveMarketForQuote(q);
            return mId === scheme.marketId || q.id.toLowerCase().includes(scheme.marketId.toLowerCase());
          });

          // Active reference row
          const activeRefId = state.referenceRowIds?.[scheme.marketId];
          const activeRefQuote = matchingQuotes.find(q => q.id === activeRefId);

          // Get desk mark level from state.marks
          const deskMark = state.marks.marks[scheme.marketId];
          const deskMid = deskMark?.mid ?? (activeRefQuote?.bidPriceNumeric != null && activeRefQuote?.offerPriceNumeric != null
            ? (activeRefQuote.bidPriceNumeric + activeRefQuote.offerPriceNumeric) / 2
            : scheme.currentMidFallback);

          // Proximity to ceiling
          const capPct = scheme.ceilingNumeric > 0 ? Math.min(100, Math.round((deskMid / scheme.ceilingNumeric) * 100)) : null;

          return (
            <div
              key={scheme.marketId}
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderRadius: 'var(--radius-panel)',
                overflow: 'hidden',
              }}
            >
              {/* Header Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  backgroundColor: 'var(--color-panel-header)',
                  borderBottom: '1px solid var(--color-divider)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{scheme.flag}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
                        {scheme.name}
                      </h4>
                      <span className="chip chip-info" style={{ fontSize: '11px', fontWeight: 700 }}>
                        {scheme.unit}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {scheme.scheme} · Registry: <strong>{scheme.registry}</strong>
                    </div>
                  </div>
                </div>

                {/* Right side stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>Active Desk Mark Mid</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)' }} className="num">
                      {deskMid.toFixed(scheme.unit === '€/kgCO₂e' || scheme.unit === 'p/RTFC' ? 3 : 2)} {scheme.unit}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => navigate(`/trade?market=${scheme.marketId}`)}
                  >
                    Open in Trade Builder <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-header info ribbon: Obligation & Ceiling */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '8px',
                  padding: '8px 18px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderBottom: '1px solid var(--color-divider)',
                  fontSize: '11.5px',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>2026 Target: </span>
                  <strong>{scheme.obligation2026}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>2030 Trajectory: </span>
                  <strong>{scheme.obligation2030}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--color-muted)' }}>Statutory Buyout / Cap: </span>
                  <strong style={{ color: 'var(--color-warn)' }}>{scheme.statutoryCeiling}</strong>
                  {capPct !== null && (
                    <span style={{ marginLeft: '6px', color: 'var(--color-muted)' }}>
                      ({capPct}% of cap)
                    </span>
                  )}
                </div>
              </div>

              {/* Quotes Blotter for this statutory scheme */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '100px', textAlign: 'center' }}>Vintage / Tenor</th>
                      <th style={{ minWidth: '180px' }}>Feedstock / Specification</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Certified</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>CI Score</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>BID Price</th>
                      <th style={{ width: '110px', textAlign: 'right' }}>OFFER Price</th>
                      <th style={{ width: '95px', textAlign: 'right' }}>BID Vol</th>
                      <th style={{ width: '95px', textAlign: 'right' }}>OFFER Vol</th>
                      <th style={{ minWidth: '150px' }}>Price Provenance</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Reference Mark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingQuotes.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '16px', color: 'var(--color-muted)' }}>
                          No standalone broker quotes in book for {scheme.name}. Desk using statutory directive / modelled baseline.
                        </td>
                      </tr>
                    ) : (
                      matchingQuotes.map(q => {
                        const isRef = Boolean(state.referenceRowIds?.[scheme.marketId] === q.id);
                        const isTradeable = q.isTradeable;

                        return (
                          <tr
                            key={q.id}
                            style={{
                              backgroundColor: isRef ? 'var(--color-surface-selected, rgba(234, 179, 8, 0.04))' : undefined,
                            }}
                          >
                            {/* Vintage / Tenor */}
                            <td style={{ textAlign: 'center', fontWeight: 700 }} className="num">
                              {q.vintage || '2026'}
                            </td>

                            {/* Feedstock */}
                            <td>
                              <span style={{ fontWeight: isRef ? 700 : 500 }}>
                                {q.feedstock}
                              </span>
                            </td>

                            {/* Certified */}
                            <td style={{ textAlign: 'center', fontSize: '11.5px' }} className="mut">
                              {q.certified}
                            </td>

                            {/* CI Score */}
                            <td style={{ textAlign: 'center', fontWeight: 600 }} className="num">
                              {q.ciScore || '—'}
                            </td>

                            {/* BID Price */}
                            <td>
                              <input
                                type="text"
                                value={q.bidPrice}
                                onChange={e => onCellEdit(q.id, 'bidPrice', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              />
                            </td>

                            {/* OFFER Price */}
                            <td>
                              <input
                                type="text"
                                value={q.offerPrice}
                                onChange={e => onCellEdit(q.id, 'offerPrice', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              />
                            </td>

                            {/* BID Vol */}
                            <td>
                              <input
                                type="text"
                                value={isTradeable ? q.bidVolume : '—'}
                                disabled={!isTradeable}
                                onChange={e => onCellEdit(q.id, 'bidVolume', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  opacity: isTradeable ? 1 : 0.5,
                                }}
                              />
                            </td>

                            {/* OFFER Vol */}
                            <td>
                              <input
                                type="text"
                                value={isTradeable ? q.offerVolume : '—'}
                                disabled={!isTradeable}
                                onChange={e => onCellEdit(q.id, 'offerVolume', e.target.value)}
                                placeholder="—"
                                className="input num"
                                style={{
                                  width: '100%',
                                  textAlign: 'right',
                                  padding: '2px 6px',
                                  fontSize: '12px',
                                  opacity: isTradeable ? 1 : 0.5,
                                }}
                              />
                            </td>

                            {/* Price Provenance */}
                            <td style={{ fontSize: '11.5px' }}>
                              <span style={{ color: 'var(--color-text)' }}>{q.derivedFrom || q.provenanceTier}</span>
                            </td>

                            {/* Reference Mark Toggle */}
                            <td style={{ textAlign: 'center' }}>
                              {isRef ? (
                                <span className="chip chip-warn" style={{ fontSize: '11px', fontWeight: 700 }}>
                                  ★ Active Mark
                                </span>
                              ) : rowFeedsMarket(q, scheme.marketId) && rowHasPrice(q) ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ fontSize: '11px', padding: '1px 6px', minHeight: '22px' }}
                                  onClick={() => {
                                    dispatch({ type: 'SET_MARKET_REFERENCE_ROW', marketId: scheme.marketId, rowId: q.id });
                                    showToast(`Set as ${scheme.marketId} reference mark`);
                                  }}
                                >
                                  Use as mark
                                </button>
                              ) : (
                                <span style={{ color: 'var(--color-muted)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
