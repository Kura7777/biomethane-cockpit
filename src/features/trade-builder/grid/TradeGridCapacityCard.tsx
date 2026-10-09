import React from 'react';
import { DealParams } from '../../../domain/trade/dealParams';
import { BiomethanePlant } from '../../../domain/plants/types';

interface TradeGridCapacityCardProps {
  volumeMwh: number;
  setVolumeMwh: (vol: number) => void;
  plantTotalMWh: number | null;
  plantCommittedMwh: number;
  setPlantCommittedMwh: (vol: number) => void;
  availablePlantCapacity: number | null;
  isOversubscribed: boolean;
  plantCommittedPct: number | null;
  deal: Partial<DealParams>;
  linkedPlant: BiomethanePlant | null | undefined;
}

export function TradeGridCapacityCard({
  volumeMwh,
  setVolumeMwh,
  plantTotalMWh,
  plantCommittedMwh,
  setPlantCommittedMwh,
  availablePlantCapacity,
  isOversubscribed,
  plantCommittedPct,
}: TradeGridCapacityCardProps) {
  return (
    <div style={{ padding: '14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderLeft: '4px solid var(--color-accent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span className="eyebrow" style={{ margin: 0 }}>Contract Traded Volume</span>
        <span className="num" style={{ fontWeight: 800, fontSize: '15px' }}>{volumeMwh.toLocaleString()} MWh</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="number"
          min="100"
          step="500"
          className="input num"
          style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}
          value={volumeMwh}
          onChange={e => setVolumeMwh(Math.max(0, Number(e.target.value) || 0))}
          aria-label="Contract Traded Volume in MWh"
        />
        <span className="mut" style={{ fontSize: '12px', fontWeight: 600 }}>MWh</span>
      </div>

      {/* Quick Tranche Selection */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
        <button
          type="button"
          className={`chip ${volumeMwh === 10000 ? 'chip-a' : ''}`}
          style={{ fontSize: '12px', padding: '2px 6px' }}
          onClick={() => setVolumeMwh(10000)}
        >
          10k MWh (Cargo)
        </button>
        {plantTotalMWh && (
          <>
            <button
              type="button"
              className={`chip ${volumeMwh === Math.round(plantTotalMWh / 4) ? 'chip-a' : ''}`}
              style={{ fontSize: '12px', padding: '2px 6px' }}
              onClick={() => setVolumeMwh(Math.round(plantTotalMWh / 4))}
            >
              25% ({Math.round(plantTotalMWh / 4).toLocaleString()} MWh)
            </button>
            <button
              type="button"
              className={`chip ${volumeMwh === Math.round(plantTotalMWh / 2) ? 'chip-a' : ''}`}
              style={{ fontSize: '12px', padding: '2px 6px' }}
              onClick={() => setVolumeMwh(Math.round(plantTotalMWh / 2))}
            >
              50% ({Math.round(plantTotalMWh / 2).toLocaleString()} MWh)
            </button>
            <button
              type="button"
              className={`chip ${availablePlantCapacity !== null && volumeMwh === availablePlantCapacity ? 'chip-a' : ''}`}
              style={{ fontSize: '12px', padding: '2px 6px' }}
              onClick={() => availablePlantCapacity && setVolumeMwh(availablePlantCapacity)}
            >
              100% Avail ({availablePlantCapacity?.toLocaleString()} MWh)
            </button>
          </>
        )}
      </div>

      {/* Plant Capacity & Existing Commitment Tracking */}
      {plantTotalMWh && (
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--color-divider)', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span className="mut">Facility Nameplate Capacity:</span>
            <span className="num" style={{ fontWeight: 600 }}>{plantTotalMWh.toLocaleString()} MWh/yr</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span className="mut">Prior Committed / Sold Volume:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                min="0"
                max={plantTotalMWh}
                step="1000"
                className="input num"
                style={{ height: '22px', width: '80px', fontSize: '12px', padding: '1px 4px', textAlign: 'right' }}
                value={plantCommittedMwh}
                onChange={e => setPlantCommittedMwh(Math.max(0, Number(e.target.value) || 0))}
                aria-label="Prior committed volume in MWh"
              />
              <span className="dim">MWh</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span className="mut">Uncommitted Available Capacity:</span>
            <span className="num" style={{ fontWeight: 700, color: (availablePlantCapacity ?? 0) <= 0 ? 'var(--color-pnl-neg)' : 'var(--color-pnl-pos)' }}>
              {availablePlantCapacity?.toLocaleString()} MWh
            </span>
          </div>

          {/* Utilization Progress Bar */}
          <div style={{ position: 'relative', height: '6px', backgroundColor: 'var(--color-neutral-200)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${Math.min(100, (plantCommittedMwh / plantTotalMWh) * 100)}%`,
                backgroundColor: 'var(--color-neutral-500)',
              }}
              title={`Committed to others: ${plantCommittedMwh.toLocaleString()} MWh`}
            />
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(100, (plantCommittedMwh / plantTotalMWh) * 100)}%`,
                top: 0,
                bottom: 0,
                width: `${Math.min(100 - (plantCommittedMwh / plantTotalMWh) * 100, (volumeMwh / plantTotalMWh) * 100)}%`,
                backgroundColor: isOversubscribed ? 'var(--color-pnl-neg)' : 'var(--color-accent)',
              }}
              title={`This trade: ${volumeMwh.toLocaleString()} MWh`}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '3px' }} className="dim">
            <span>Allocation: {((volumeMwh / plantTotalMWh) * 100).toFixed(1)}% of plant</span>
            <span>Total allocated: {plantCommittedPct}%</span>
          </div>

          {isOversubscribed && (
            <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: 'var(--color-status-warn-bg)', border: '1px solid var(--color-status-warn-border)', color: 'var(--color-status-warn-ink)', borderRadius: 'var(--radius-control)', fontWeight: 600, fontSize: '12px', lineHeight: 1.3 }}>
              ⚠️ Oversubscription Warning: Contract volume ({volumeMwh.toLocaleString()} MWh) exceeds available plant capacity ({availablePlantCapacity?.toLocaleString()} MWh) by {(volumeMwh - (availablePlantCapacity ?? 0)).toLocaleString()} MWh. Risk of physical delivery default.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
