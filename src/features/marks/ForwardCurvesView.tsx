import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { generateForwardCurves, STATUTORY_OBLIGATION_TRAJECTORIES } from '../../domain/curves/engine';
import { buildTenorDefinitions, getDefaultForwardCurveMatrix } from '../../domain/curves/forwardMarks';
import { PricingBookEntry } from '../../domain/markets/brokerRun.seed';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, Zap, Info } from 'lucide-react';

interface ForwardCurvesViewProps {
  quotes: PricingBookEntry[];
}

export function ForwardCurvesView({ quotes }: ForwardCurvesViewProps) {
  const { state } = useAppState();
  const navigate = useNavigate();

  // Forward Curve Book generated from current live marks
  const curveBook = useMemo(() => {
    return generateForwardCurves(state.marks, state.marks.gasIndex.mid);
  }, [state.marks]);

  const defaultMatrix = useMemo(() => getDefaultForwardCurveMatrix(), []);
  const tenorDefs = useMemo(() => buildTenorDefinitions(), []);

  // Check for direct physical bundled broker quotes in pricingBook (e.g. DE_THG_BUNDLE)
  const bundledBrokerQuotes = useMemo(() => {
    return quotes.filter(q => q.productClass === 'BUNDLED_COMPLIANCE' || q.class === 'BUNDLED' || q.id.includes('bundle') || q.id.includes('thg_b'));
  }, [quotes]);

  // Base prompt TTF gas price
  const promptTtf = state.marks.gasIndex.mid ?? 38.5;

  // Selected curve underlying view: 'BUNDLED_DE' | 'TTF_GAS' | 'DE_THG' | 'NL_ERE' | 'GO_DE'
  const [selectedCurve, setSelectedCurve] = useState<'BUNDLED_DE' | 'TTF_GAS' | 'DE_THG' | 'NL_ERE' | 'GO_DE'>('BUNDLED_DE');

  // Derive tenor rows merging rolling tenors and multi-year calendar strips
  const tenorRows = useMemo(() => {
    const rows = [
      {
        tenorId: 'M_PLUS_1',
        label: 'Prompt Month (M+1)',
        window: tenorDefs.find(t => t.tenor === 'M_PLUS_1')?.deliveryPeriod || 'Aug 2026',
        category: 'PROMPT',
        ttfBid: defaultMatrix.gasForwardCurve.M_PLUS_1?.bid ?? (promptTtf - 0.3),
        ttfOffer: defaultMatrix.gasForwardCurve.M_PLUS_1?.offer ?? (promptTtf + 0.3),
        ttfMid: defaultMatrix.gasForwardCurve.M_PLUS_1?.mid ?? promptTtf,
        // Sourced physical quote check (e.g. H2 2026 or prompt)
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('2026') || q.vintage.includes('H2')),
        statutoryEscalator: '12.0% obligation',
        season: 'NEUTRAL',
      },
      {
        tenorId: 'M_PLUS_2',
        label: 'Prompt Month (M+2)',
        window: tenorDefs.find(t => t.tenor === 'M_PLUS_2')?.deliveryPeriod || 'Sep 2026',
        category: 'PROMPT',
        ttfBid: defaultMatrix.gasForwardCurve.M_PLUS_2?.bid ?? (promptTtf + 0.5),
        ttfOffer: defaultMatrix.gasForwardCurve.M_PLUS_2?.offer ?? (promptTtf + 1.1),
        ttfMid: defaultMatrix.gasForwardCurve.M_PLUS_2?.mid ?? (promptTtf + 0.8),
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('2026') || q.vintage.includes('H2')),
        statutoryEscalator: '12.0% obligation',
        season: 'NEUTRAL',
      },
      {
        tenorId: 'Q1_2027',
        label: 'Q1 2027 (Winter Peak)',
        window: 'Jan 2027 – Mar 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q1?.bid ?? (promptTtf + 3.0),
        ttfOffer: defaultMatrix.gasForwardCurve.Q1?.offer ?? (promptTtf + 3.6),
        ttfMid: defaultMatrix.gasForwardCurve.Q1?.mid ?? (promptTtf + 3.3),
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('H1') || q.vintage.includes('2027')),
        statutoryEscalator: '14.5% obligation (+2.5%)',
        season: 'WINTER',
      },
      {
        tenorId: 'Q2_2027',
        label: 'Q2 2027 (Summer Injection)',
        window: 'Apr 2027 – Jun 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q2?.bid ?? (promptTtf - 1.7),
        ttfOffer: defaultMatrix.gasForwardCurve.Q2?.offer ?? (promptTtf - 1.1),
        ttfMid: defaultMatrix.gasForwardCurve.Q2?.mid ?? (promptTtf - 1.4),
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('H1') || q.vintage.includes('2027')),
        statutoryEscalator: '14.5% obligation',
        season: 'SUMMER',
      },
      {
        tenorId: 'Q3_2027',
        label: 'Q3 2027 (Summer Trough)',
        window: 'Jul 2027 – Sep 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q3?.bid ?? (promptTtf - 3.3),
        ttfOffer: defaultMatrix.gasForwardCurve.Q3?.offer ?? (promptTtf - 2.7),
        ttfMid: defaultMatrix.gasForwardCurve.Q3?.mid ?? (promptTtf - 3.0),
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('H2') || q.vintage.includes('2027')),
        statutoryEscalator: '14.5% obligation',
        season: 'SUMMER',
      },
      {
        tenorId: 'Q4_2027',
        label: 'Q4 2027 (Winter Compliance)',
        window: 'Oct 2027 – Dec 2027',
        category: 'QUARTER',
        ttfBid: defaultMatrix.gasForwardCurve.Q4?.bid ?? (promptTtf + 1.3),
        ttfOffer: defaultMatrix.gasForwardCurve.Q4?.offer ?? (promptTtf + 1.9),
        ttfMid: defaultMatrix.gasForwardCurve.Q4?.mid ?? (promptTtf + 1.6),
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('H2') || q.vintage.includes('2027')),
        statutoryEscalator: '14.5% obligation',
        season: 'WINTER',
      },
      {
        tenorId: 'CAL_2027',
        label: 'Cal 2027 (Full Year Baseload)',
        window: 'Jan 2027 – Dec 2027',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2027?.bid ?? 33.3,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2027?.offer ?? 33.9,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2027?.mid ?? 33.6,
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('2027')),
        statutoryEscalator: '14.5% obligation (+2.5%)',
        season: 'ANNUAL',
      },
      {
        tenorId: 'CAL_2028',
        label: 'Cal 2028 (Baseload Forward)',
        window: 'Jan 2028 – Dec 2028',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2028?.bid ?? 31.0,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2028?.offer ?? 31.8,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2028?.mid ?? 31.4,
        bundledQuote: bundledBrokerQuotes.find(q => q.vintage.includes('2028')),
        statutoryEscalator: '17.5% obligation (+3.0%)',
        season: 'ANNUAL',
      },
      {
        tenorId: 'CAL_2029',
        label: 'Cal 2029 (Baseload Forward)',
        window: 'Jan 2029 – Dec 2029',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2029?.bid ?? 28.5,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2029?.offer ?? 29.3,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2029?.mid ?? 28.9,
        bundledQuote: undefined,
        statutoryEscalator: '21.0% obligation (+3.5%)',
        season: 'ANNUAL',
      },
      {
        tenorId: 'CAL_2030',
        label: 'Cal 2030 (RED III Milestone)',
        window: 'Jan 2030 – Dec 2030',
        category: 'CALENDAR',
        ttfBid: curveBook.ttfGasCurve.tenors.CAL_2030?.bid ?? 27.5,
        ttfOffer: curveBook.ttfGasCurve.tenors.CAL_2030?.offer ?? 28.3,
        ttfMid: curveBook.ttfGasCurve.tenors.CAL_2030?.mid ?? 27.9,
        bundledQuote: undefined,
        statutoryEscalator: '25.0% obligation (+4.0%)',
        season: 'ANNUAL',
      },
    ];

    // Compute delivered prices, green premium, and time spreads vs Prompt M+1
    const promptMid = rows[0].ttfMid;

    return rows.map((r, idx) => {
      // If direct broker quote exists with numeric price, use it
      const hasBrokerMid = r.bundledQuote?.bidPriceNumeric != null && r.bundledQuote?.offerPriceNumeric != null;
      let bundledMid: number;
      let bundledBid: number;
      let bundledOffer: number;
      let isBrokerSourced = false;

      if (hasBrokerMid) {
        bundledBid = r.bundledQuote!.bidPriceNumeric!;
        bundledOffer = r.bundledQuote!.offerPriceNumeric!;
        bundledMid = (bundledBid + bundledOffer) / 2;
        isBrokerSourced = true;
      } else if (r.bundledQuote?.offerPriceNumeric != null) {
        bundledOffer = r.bundledQuote.offerPriceNumeric;
        bundledBid = bundledOffer - 4.0;
        bundledMid = bundledOffer - 2.0;
        isBrokerSourced = true;
      } else {
        // Modelled bundled price: TTF gas forward + implied green attribute premium
        // In 2026: ~€109.80/MWh green premium. Tightens upwards with RED III mandate tightening
        const yearOffset = idx >= 6 ? (idx - 5) * 6.5 : 0;
        const modelledGreenPremium = 109.80 + yearOffset;
        bundledMid = Number((r.ttfMid + modelledGreenPremium).toFixed(2));
        bundledBid = Number((bundledMid - 3.0).toFixed(2));
        bundledOffer = Number((bundledMid + 3.0).toFixed(2));
      }

      const greenPremium = Number((bundledMid - r.ttfMid).toFixed(2));
      const timeSpread = Number((r.ttfMid - promptMid).toFixed(2));
      const bundledTimeSpread = idx === 0 ? 0 : Number((bundledMid - (rows[0].bundledQuote?.offerPriceNumeric ? rows[0].bundledQuote.offerPriceNumeric - 2 : promptMid + 109.80)).toFixed(2));

      return {
        ...r,
        bundledBid,
        bundledOffer,
        bundledMid,
        isBrokerSourced,
        greenPremium,
        timeSpread,
        bundledTimeSpread,
        volume: r.bundledQuote?.offerVolume || (idx <= 1 ? '15 GWh' : idx <= 5 ? '30 GWh' : '50 GWh'),
      };
    });
  }, [defaultMatrix, tenorDefs, promptTtf, bundledBrokerQuotes, curveBook]);

  // Front prompt bundled quote
  const promptRow = tenorRows[0];
  const cal27Row = tenorRows.find(r => r.tenorId === 'CAL_2027') || tenorRows[6];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Institutional Macro Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {/* Card 1: Front-Month Natural Gas Benchmark */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid var(--color-accent)',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              TTF Gas (Front-Month M+1)
            </span>
            <span className="chip chip-info" style={{ fontSize: '10px' }}>EEX Index</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }} className="num">
            €{promptRow.ttfMid.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
            Bid €{promptRow.ttfBid.toFixed(2)} · Offer €{promptRow.ttfOffer.toFixed(2)}
          </div>
        </div>

        {/* Card 2: Cal+1 Forward Gas Term Structure */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid #8b5cf6',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              TTF Cal 2027 Baseload
            </span>
            <span className="chip" style={{ fontSize: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              Backwardation
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }} className="num">
            €{cal27Row.ttfMid.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDownRight className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
            <span>Time spread vs prompt: <strong style={{ color: '#ef4444' }}>{cal27Row.timeSpread >= 0 ? `+€${cal27Row.timeSpread.toFixed(2)}` : `-€${Math.abs(cal27Row.timeSpread).toFixed(2)}`}</strong></span>
          </div>
        </div>

        {/* Card 3: Implied Biomethane Green Premium */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid var(--color-pnl-pos)',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              Implied Green Premium (Spread)
            </span>
            <span className="chip chip-pos" style={{ fontSize: '10px' }}>Annex IX-A Yield</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px', color: 'var(--color-pnl-pos)' }} className="num">
            +€{promptRow.greenPremium.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', marginLeft: '4px' }}>/MWh</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
            Bundled Mid €{promptRow.bundledMid.toFixed(2)} less TTF €{promptRow.ttfMid.toFixed(2)}
          </div>
        </div>

        {/* Card 4: RED III Mandate Tightening */}
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            borderLeft: '4px solid #d97706',
            borderRadius: 'var(--radius-panel)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
              RED III Mandate Escalator
            </span>
            <span className="chip chip-warn" style={{ fontSize: '10px' }}>Statutory Ramp</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 2px' }} className="num">
            12.0% → 25.0%
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--color-muted)' }}>
            German 38. BImSchV transport GHG deficit trajectory to 2030
          </div>
        </div>
      </div>

      {/* CME-Inspired Forward Quotes Strip */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          borderRadius: 'var(--radius-panel)',
          overflow: 'hidden',
        }}
      >
        {/* Table Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-panel-header)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp className="w-4 h-4 text-accent" style={{ color: 'var(--color-accent)' }} />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>
              European Biomethane Forward Curve Strip (Prompt M+1 → Cal 2030)
            </h4>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Curve Reference:</span>
            <span className="chip chip-info" style={{ fontWeight: 600 }}>THE / TTF Grid Bundled</span>
          </div>
        </div>

        {/* Institutional Forward Quotes Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ minWidth: '170px' }}>Contract / Tenor</th>
                <th style={{ width: '135px', textAlign: 'center' }}>Delivery Window</th>
                <th style={{ width: '115px', textAlign: 'right' }}>TTF Gas Index</th>
                <th style={{ width: '115px', textAlign: 'right' }}>Biomethane Bid</th>
                <th style={{ width: '115px', textAlign: 'right' }}>Biomethane Offer</th>
                <th style={{ width: '110px', textAlign: 'right' }}>Bundled Mid</th>
                <th style={{ width: '125px', textAlign: 'right' }}>Green Spread</th>
                <th style={{ width: '120px', textAlign: 'center' }}>Time Spread</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Volume</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Source</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tenorRows.map((row, idx) => {
                const isContango = row.timeSpread > 0;
                const isBackwardation = row.timeSpread < 0;

                return (
                  <tr
                    key={row.tenorId}
                    style={{
                      backgroundColor: idx === 0 ? 'var(--color-surface-selected, rgba(234, 179, 8, 0.04))' : undefined,
                    }}
                  >
                    {/* Contract / Tenor */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {idx === 0 && (
                          <span className="chip chip-warn" style={{ fontSize: '10px', padding: '1px 5px', fontWeight: 700 }}>
                            PROMPT
                          </span>
                        )}
                        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                          {row.label}
                        </span>
                      </div>
                    </td>

                    {/* Delivery Window */}
                    <td style={{ textAlign: 'center', fontSize: '12px' }} className="mut">
                      {row.window}
                    </td>

                    {/* Base TTF Gas Index */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">
                      €{row.ttfMid.toFixed(2)}
                    </td>

                    {/* Bundled Biomethane Bid */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">
                      €{row.bundledBid.toFixed(2)}
                    </td>

                    {/* Bundled Biomethane Offer */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text)' }} className="num">
                      €{row.bundledOffer.toFixed(2)}
                    </td>

                    {/* Bundled Mid */}
                    <td style={{ textAlign: 'right', fontWeight: 800 }} className="num">
                      €{row.bundledMid.toFixed(2)}
                    </td>

                    {/* Implied Green Spread */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-pnl-pos)' }} className="num">
                      +€{row.greenPremium.toFixed(2)}
                    </td>

                    {/* Time Spread vs Prompt */}
                    <td style={{ textAlign: 'center' }}>
                      {idx === 0 ? (
                        <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>Benchmark</span>
                      ) : (
                        <span
                          className={`chip ${isContango ? 'chip-pos' : isBackwardation ? 'chip-neutral' : ''}`}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isBackwardation ? 'rgba(239, 68, 68, 0.12)' : undefined,
                            color: isBackwardation ? '#ef4444' : undefined,
                          }}
                        >
                          {row.timeSpread >= 0 ? `+€${row.timeSpread.toFixed(2)}` : `-€${Math.abs(row.timeSpread).toFixed(2)}`}
                        </span>
                      )}
                    </td>

                    {/* Volume */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="num">
                      {row.volume}
                    </td>

                    {/* Source */}
                    <td style={{ textAlign: 'center' }}>
                      {row.isBrokerSourced ? (
                        <span className="chip chip-info" style={{ fontSize: '11px', padding: '1px 6px' }} title="Direct OTC broker run quote">
                          📑 Broker
                        </span>
                      ) : (
                        <span className="chip chip-neutral" style={{ fontSize: '11px', padding: '1px 6px' }} title="Calibrated statutory forward model">
                          🔬 Modelled
                        </span>
                      )}
                    </td>

                    {/* Trade Builder Action */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                          navigate(`/trade?tenor=${encodeURIComponent(row.tenorId)}&gas=${row.ttfMid}&bundle=${row.bundledMid}`);
                        }}
                        title={`Build consignment trade for delivery in ${row.window}`}
                      >
                        Trade <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Explainer Bar */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--color-panel-header)',
            borderTop: '1px solid var(--color-divider)',
            fontSize: '12px',
            color: 'var(--color-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
          <span>
            <strong>Trading Invariant</strong>: Bundled delivered biomethane is priced as <em>Wholesale Gas Index (TTF/THE) + Implied Green Attribute Premium</em>. Forward time spreads reflect European natural gas seasonal storage injection patterns (Summer/Winter) compounded with statutory RED III quota deficit trajectories.
          </span>
        </div>
      </div>
    </div>
  );
}
