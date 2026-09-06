import React, { useMemo, useEffect, useState } from 'react';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { useAppState } from '../../store/context';
import { HUB_BASIS_SPREADS, INTERCONNECTION_POINTS, CAM_NC_DURATION_MULTIPLIERS, NATIONAL_BIOMETHANE_INJECTION_INCENTIVES } from '../../domain/logistics/corridors';
import { ModeCostBreakdown, CapacityDuration } from '../../domain/logistics/types';

interface LogisticsModalProps {
  originCountry: string;
  targetCountry: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyCosts?: (costs: { transferCosts: number | null; certificationCosts: number | null; logistics: number | null }) => void;
}

export function LogisticsModal({
  originCountry,
  targetCountry,
  isOpen,
  onClose,
  onApplyCosts,
}: LogisticsModalProps) {
  const { state } = useAppState();
  const [selectedDuration, setSelectedDuration] = useState<CapacityDuration>('YEARLY');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const baseGasPrice = state.marks.gasIndex.mid;

  const assessment = useMemo(() => {
    return calculateLogisticsRoute(originCountry, targetCountry, baseGasPrice, undefined, selectedDuration);
  }, [originCountry, targetCountry, baseGasPrice, selectedDuration]);

  if (!isOpen) return null;

  const originHub = HUB_BASIS_SPREADS[originCountry] || { hubName: `${originCountry} Hub`, operator: 'National TSO', basisSpreadToTtfEurMwh: 0.50 };
  const targetHub = HUB_BASIS_SPREADS[targetCountry] || { hubName: `${targetCountry} Hub`, operator: 'National TSO', basisSpreadToTtfEurMwh: 0.00 };
  const basisSpreadDiff = targetHub.basisSpreadToTtfEurMwh - originHub.basisSpreadToTtfEurMwh;

  const durationConfig = CAM_NC_DURATION_MULTIPLIERS[selectedDuration];
  const injectionIncentive = NATIONAL_BIOMETHANE_INJECTION_INCENTIVES[originCountry];

  const ipList = INTERCONNECTION_POINTS.filter(
    ip => (ip.fromCountry === originCountry && ip.toCountry === targetCountry) ||
          (ip.fromCountry === targetCountry && ip.toCountry === originCountry)
  );

  const modeList: {
    tag: string;
    mode: ModeCostBreakdown;
    title: string;
    feasibility: string;
    items: [string, string | null][];
    forList: string[];
    againstList: string[];
    legal: string;
  }[] = [
    {
      tag: 'Option A',
      mode: assessment.modes.virtualSwap,
      title: 'Virtual UDB swap',
      feasibility: assessment.modes.virtualSwap.regulatoryFeasibility === 'HIGH' ? 'High' : 'Contested',
      items: [
        ['Registry transfer', '0.90'],
        ['Certification surcharge', '0.55'],
        ['Transit ' + originCountry + ' → ' + targetCountry, assessment.modes.virtualSwap.totalCostEurMwh !== null ? (assessment.modes.virtualSwap.totalCostEurMwh - 1.45 > 0 ? (assessment.modes.virtualSwap.totalCostEurMwh - 1.45).toFixed(2) : '0.35') : null],
        ['Liquefaction', null],
      ],
      forList: ['Cheapest all-in route', 'No capacity booking on PRISMA', 'Settles inside one compliance day'],
      againstList: ['Contested in some member states', 'Requires both registries live on UDB'],
      legal: 'Reg. (EU) 2024/2792 Art. 14 · RED III Art. 30(1)',
    },
    {
      tag: 'Option B',
      mode: assessment.modes.physicalPipeline,
      title: `Continuous grid path (${selectedDuration})`,
      feasibility: assessment.physicalRoute.totalPhysicalTariffEurMwh !== null ? 'High' : 'Low',
      items: [
        [`TSO Capacity (${durationConfig.multiplier.toFixed(2)}×)`, assessment.physicalRoute.totalPhysicalTariffEurMwh !== null ? assessment.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2) : '1.80'],
        ['Shrinkage fuel gas', assessment.physicalRoute.shrinkageEurMwh !== null ? assessment.physicalRoute.shrinkageEurMwh.toFixed(2) : '0.15'],
        ['Multi-TSO balancing', '0.50'],
        ['PRISMA auction fee', '0.15'],
        ...(assessment.dsoInjectionCreditEurMwh > 0 ? [
          ['DSO injection credit', `-${assessment.dsoInjectionCreditEurMwh.toFixed(2)}`] as [string, string]
        ] : []),
      ],
      forList: ['Unambiguous UDB evidence', 'Accepted by every member state', `CAM NC ${selectedDuration} product booked`],
      againstList: ['Winter cleared prices run 3–5× summer', 'Capacity must be won on PRISMA auction'],
      legal: 'Reg. (EU) 2017/459 CAM NC · Reg. (EU) 2017/460 TAR NC',
    },
    {
      tag: 'Option C',
      mode: assessment.modes.bioLng,
      title: 'Physical bio-LNG',
      feasibility: 'Low',
      items: [
        ['Liquefaction', null],
        ['Road haulage', '2.40'],
        ['Terminal regasification', null],
        ['Registry transfer', '0.90'],
      ],
      forList: ['Reaches grid-isolated and non-EU buyers', 'Unlocks the blocked UK RTFO corridor'],
      againstList: ['Tariff incomplete — never summed around a null', 'Highest carbon cost on the delivery leg'],
      legal: 'RED III Art. 28(2) · national terminal codes',
    },
  ];

  const execution = assessment.executionSteps?.length > 0 ? assessment.executionSteps : [
    { stepNumber: 1, title: 'Origination', actor: 'Desk trader', actions: ['Confirm plant gate price and volume with the operator', 'Lock the consignment CI from the proof of sustainability'] },
    { stepNumber: 2, title: 'Hub execution', actor: 'Desk trader · middle office', actions: ['Book the transit or agree the swap with the counterparty', 'Hedge the TTF basis leg to the delivery month'] },
    { stepNumber: 3, title: 'UDB transfer', actor: 'Compliance officer', actions: ['Raise the transaction in the Union Database against target mass balance area', 'Attach the scheme certificate and Annex IX classification'] },
    { stepNumber: 4, title: 'Settlement & cancellation', actor: 'Back office', actions: ['Cancel the certificate statutorily in national registry', 'File the quota evidence with the obligated party'] },
  ];

  return (
    <div
      className="scrim noscroll"
      style={{
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '36px 24px',
        overflowY: 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Delivery playbook"
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 'min(1120px, 100%)',
          backgroundColor: 'var(--color-bg)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            padding: '14px 20px',
            backgroundColor: 'var(--color-surface)',
            borderBottom: '2px solid var(--color-divider)',
          }}
        >
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: '16px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
              }}
            >
              Delivery playbook · {originCountry} → {targetCountry}
            </h4>
            <div style={{ fontSize: '12px', marginTop: '3px' }} className="mut">
              {originHub.hubName} → {targetHub.hubName} · basis to TTF {basisSpreadDiff >= 0 ? `+€${basisSpreadDiff.toFixed(2)}` : `−€${Math.abs(basisSpreadDiff).toFixed(2)}`}/MWh · transit {assessment.physicalRoute.totalPhysicalTariffEurMwh !== null ? `€${assessment.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)}/MWh` : '€1.80/MWh'}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              marginLeft: 'auto',
              padding: '4px 10px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
            onClick={onClose}
          >
            Esc ✕
          </button>
        </div>

        {/* ENTSOG CAM NC Capacity Booking Duration Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '10px 20px',
            backgroundColor: 'var(--color-surface-sunken)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-accent-700)' }}>
              ENTSOG CAM NC Booking Horizon:
            </span>
            <span style={{ fontSize: '11px' }} className="mut">
              {durationConfig.description}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {(Object.keys(CAM_NC_DURATION_MULTIPLIERS) as CapacityDuration[]).map(dur => {
              const cfg = CAM_NC_DURATION_MULTIPLIERS[dur];
              const isSelected = selectedDuration === dur;
              return (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setSelectedDuration(dur)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 700 : 500,
                    borderRadius: '4px',
                    border: isSelected ? '1px solid var(--color-accent-700)' : '1px solid var(--color-divider)',
                    backgroundColor: isSelected ? 'var(--color-surface)' : 'transparent',
                    color: isSelected ? 'var(--color-accent-700)' : 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title={cfg.clearingMechanism}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Three mode columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '1px',
            backgroundColor: 'var(--color-divider)',
          }}
        >
          {modeList.map((o, idx) => {
            const isFeasHigh = o.feasibility === 'High';
            const totalVal = o.mode.totalCostEurMwh;
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--color-bg)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="chip">{o.tag}</span>
                  <span className={`chip ${isFeasHigh ? '' : 'chip-a'}`}>
                    {o.feasibility}
                  </span>
                </div>

                <h5 style={{ margin: 0, fontSize: '17px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                  {o.title}
                </h5>

                <div
                  className="num"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    fontSize: totalVal !== null ? '24px' : '15px',
                    color: totalVal !== null ? 'var(--color-text)' : 'var(--color-accent-700)',
                  }}
                >
                  {totalVal !== null ? `€${totalVal.toFixed(2)}` : 'Tariff incomplete'}
                </div>

                <div style={{ fontSize: '11px' }} className="mut">
                  {o.mode.timelineDays}d timeline · {o.feasibility} feasibility
                </div>

                <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
                  {o.mode.summary}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-divider)',
                  }}
                >
                  {o.items.map(([label, val], itemIdx) => (
                    <div key={itemIdx} className="kv">
                      <span className="lbl">{label}</span>
                      <span />
                      <span className="num" style={{ fontWeight: 600 }}>
                        {val === null ? (
                          <span style={{ color: 'var(--color-accent-700)' }}>unverified</span>
                        ) : (
                          val
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ paddingTop: '8px', borderTop: '1px solid var(--color-divider)' }}>
                  <div className="eyebrow">For</div>
                  {o.forList.map((t, fIdx) => (
                    <div key={fIdx} style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '3px' }}>
                      {t}
                    </div>
                  ))}
                  <div className="eyebrow" style={{ marginTop: '9px', color: 'var(--color-accent-700)' }}>
                    Against
                  </div>
                  {o.againstList.map((t, aIdx) => (
                    <div key={aIdx} style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '3px' }}>
                      {t}
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: '11px', marginTop: 'auto', paddingTop: '8px', color: 'var(--color-accent-700)' }}>
                  {o.legal}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom split: Execution steps & Hub basis */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 1fr)',
            borderTop: '2px solid var(--color-divider)',
          }}
        >
          {/* Execution steps */}
          <div style={{ padding: '16px 20px', borderRight: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Execution steps</div>
            <div style={{ marginTop: '12px' }}>
              {execution.map((e, eIdx) => (
                <div
                  key={eIdx}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-divider)',
                  }}
                >
                  <span
                    className="num"
                    style={{
                      width: '18px',
                      height: '18px',
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--color-text)',
                      color: 'var(--color-bg)',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {('phase' in e && e.phase) || ('stepNumber' in e && e.stepNumber) || eIdx + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{e.title}</div>
                    <div style={{ fontSize: '11px' }} className="mut">{e.actor}</div>
                    {e.actions.map((act, actIdx) => (
                      <div key={actIdx} style={{ fontSize: '12px', lineHeight: 1.55, marginTop: '4px' }}>
                        {act}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hub basis & Interconnection Schedule */}
          <div style={{ padding: '16px 20px' }}>
            <div className="eyebrow">ENTSOG Interconnection &amp; TSO Capacity Schedule</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1px',
                backgroundColor: 'var(--color-divider)',
                marginTop: '12px',
              }}
            >
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
                <div className="eyebrow">Origin hub</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{originHub.hubName}</div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
                <div className="eyebrow">Target hub</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{targetHub.hubName}</div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
                <div className="eyebrow">Basis to TTF</div>
                <div className="num" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {originHub.basisSpreadToTtfEurMwh >= 0 ? `+€${originHub.basisSpreadToTtfEurMwh.toFixed(2)}` : `−€${Math.abs(originHub.basisSpreadToTtfEurMwh).toFixed(2)}`}
                </div>
              </div>
              <div style={{ backgroundColor: 'var(--color-bg)', padding: '10px 14px' }}>
                <div className="eyebrow">Basis spread</div>
                <div className="num" style={{ fontSize: '15px', fontWeight: 600 }}>
                  €{Math.abs(basisSpreadDiff).toFixed(2)}
                </div>
              </div>
            </div>

            {/* National Biomethane Injection Incentive Callout */}
            {assessment.dsoInjectionCreditEurMwh > 0 && injectionIncentive && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)' }}>
                    🟢 {originCountry} Grid Injection Credit ({injectionIncentive.statutoryBasis})
                  </span>
                  <span className="num" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-success)' }}>
                    -€{assessment.dsoInjectionCreditEurMwh.toFixed(2)}/MWh
                  </span>
                </div>
                <div style={{ fontSize: '11px', marginTop: '2px', color: 'var(--color-text-secondary)' }}>
                  {injectionIncentive.description}
                </div>
              </div>
            )}

            {/* Resolved Transit Legs with CAM NC Multipliers */}
            <div style={{ marginTop: '14px' }}>
              {assessment.tsoBreakdown && assessment.tsoBreakdown.length > 0 ? (
                assessment.tsoBreakdown.map((tsoLeg, legIdx) => (
                  <div key={legIdx} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-divider)' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        Leg {tsoLeg.legIndex}: {tsoLeg.vipName}
                      </span>
                      <span className={`chip ${tsoLeg.bookedTariffEurMwh !== null ? '' : 'chip-a'}`} style={{ marginLeft: 'auto' }}>
                        {tsoLeg.platform}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '2px' }} className="mut">
                      {tsoLeg.fromTso} ➔ {tsoLeg.toTso}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        Base: {tsoLeg.baseTotalTariffEurMwh !== null ? `€${tsoLeg.baseTotalTariffEurMwh.toFixed(2)}/MWh` : 'Unverified'} (Exit €{tsoLeg.exitTariffEurMwh ?? '—'} + Entry €{tsoLeg.entryTariffEurMwh ?? '—'})
                      </span>
                      <span className="num" style={{ fontWeight: 700, color: tsoLeg.bookedTariffEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)' }}>
                        {tsoLeg.bookedTariffEurMwh !== null ? `€${tsoLeg.bookedTariffEurMwh.toFixed(2)}/MWh (${tsoLeg.durationMultiplier.toFixed(2)}×)` : 'Auction Required'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px 0', fontSize: '12px' }} className="mut">
                  Intra-country flow: No cross-border transmission interconnection bookings required.
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              {onApplyCosts && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '12px' }}
                    onClick={() => {
                      onApplyCosts({
                        transferCosts: 0.90,
                        certificationCosts: 0.55,
                        logistics: assessment.modes.virtualSwap.totalCostEurMwh,
                      });
                      onClose();
                    }}
                  >
                    Apply Virtual Swap (€{assessment.modes.virtualSwap.totalCostEurMwh?.toFixed(2) ?? '—'}/MWh)
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: '12px' }}
                    disabled={assessment.modes.physicalPipeline.totalCostEurMwh === null}
                    onClick={() => {
                      onApplyCosts({
                        transferCosts: 0.90,
                        certificationCosts: 0.55,
                        logistics: assessment.modes.physicalPipeline.totalCostEurMwh,
                      });
                      onClose();
                    }}
                  >
                    Apply Physical Path (€{assessment.modes.physicalPipeline.totalCostEurMwh?.toFixed(2) ?? '—'}/MWh)
                  </button>
                </>
              )}
            </div>

            <p style={{ fontSize: '11px', lineHeight: 1.55, margin: '12px 0 0' }} className="mut">
              Tariffs reflect ENTSOG CAM NC Commission Regulation (EU) 2017/459 &amp; TAR NC (EU) 2017/460 regulated multipliers on PRISMA.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
