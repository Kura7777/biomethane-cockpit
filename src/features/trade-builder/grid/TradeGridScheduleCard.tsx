import { DeliveryProfile } from '../../../domain/consignment/types';
import { Market } from '../../../domain/markets/types';
import { getVtpForMarket } from '../options';

interface TradeGridScheduleCardProps {
  complianceYear: number;
  handleComplianceYearChange: (yr: number) => void;
  vintagePreset: string;
  handleVintagePreset: (preset: string) => void;
  prodStartDate: string;
  setProdStartDate: (date: string) => void;
  prodEndDate: string;
  setProdEndDate: (date: string) => void;
  deliveryProfile: DeliveryProfile;
  setDeliveryProfile: (profile: DeliveryProfile) => void;
  monthlyRateMwh: number;
  dailyRateMwh: number;
  statutorySurrenderDeadline: string;
  selectedMarket: Market;
}

export function TradeGridScheduleCard({
  complianceYear,
  handleComplianceYearChange,
  vintagePreset,
  handleVintagePreset,
  prodStartDate,
  setProdStartDate,
  prodEndDate,
  setProdEndDate,
  deliveryProfile,
  setDeliveryProfile,
  monthlyRateMwh,
  dailyRateMwh,
  statutorySurrenderDeadline,
  selectedMarket,
}: TradeGridScheduleCardProps) {
  return (
    <div style={{ paddingTop: '16px', borderTop: '2px solid var(--color-divider)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div className="eyebrow" style={{ margin: 0 }}>Production &amp; Delivery Schedule</div>
        <span className="chip chip-a" style={{ fontSize: '12px' }}>
          EFET Biomethane Schedule
        </span>
      </div>

      {/* Compliance Year */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>Compliance Year</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          {[2025, 2026, 2027].map(yr => (
            <button
              key={yr}
              type="button"
              className={`chip ${complianceYear === yr ? 'chip-a' : ''}`}
              style={{ fontSize: '12px', padding: '2px 8px' }}
              onClick={() => handleComplianceYearChange(yr)}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      {/* Production Period Presets */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '12px' }} className="mut">Production Vintage (Gas Grid Injection)</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
          {[
            { key: 'CAL_YEAR', label: `Cal-${complianceYear}` },
            { key: 'Q1', label: `Q1-${complianceYear}` },
            { key: 'Q2', label: `Q2-${complianceYear}` },
            { key: 'Q3', label: `Q3-${complianceYear}` },
            { key: 'Q4', label: `Q4-${complianceYear}` },
            { key: 'PROMPT', label: 'Prompt Month' },
            { key: 'CUSTOM', label: 'Custom' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              className={`chip ${vintagePreset === p.key ? 'chip-a' : ''}`}
              style={{ fontSize: '12px', padding: '2px 6px' }}
              onClick={() => handleVintagePreset(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <div>
          <label className="dim" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Injection Start</label>
          <input
            type="date"
            className="input"
            style={{ fontSize: '12px', padding: '3px 6px', width: '100%' }}
            value={prodStartDate}
            onChange={e => {
              setProdStartDate(e.target.value);
              handleVintagePreset('CUSTOM');
            }}
            aria-label="Biomethane injection start date"
          />
        </div>
        <div>
          <label className="dim" style={{ fontSize: '12px', display: 'block', marginBottom: '2px' }}>Injection End</label>
          <input
            type="date"
            className="input"
            style={{ fontSize: '12px', padding: '3px 6px', width: '100%' }}
            value={prodEndDate}
            onChange={e => {
              setProdEndDate(e.target.value);
              handleVintagePreset('CUSTOM');
            }}
            aria-label="Biomethane injection end date"
          />
        </div>
      </div>

      {/* Delivery Profile & Flow Rate */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px' }} className="mut">Physical Delivery Profile</span>
          <span className="num" style={{ fontSize: '12px', fontWeight: 600 }}>
            {deliveryProfile === 'FLAT_MONTHLY' ? `~${monthlyRateMwh.toLocaleString()} MWh/mo` : deliveryProfile === 'FLAT_DAILY' ? `~${dailyRateMwh.toLocaleString()} MWh/day` : '100% Bullet Transfer'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[
            { key: 'FLAT_MONTHLY', label: 'Flat Monthly' },
            { key: 'FLAT_DAILY', label: 'Flat Daily' },
            { key: 'BULLET', label: 'Bullet Transfer' },
          ].map(prof => (
            <button
              key={prof.key}
              type="button"
              className={`chip ${deliveryProfile === prof.key ? 'chip-a' : ''}`}
              style={{ fontSize: '12px', padding: '2px 6px' }}
              onClick={() => setDeliveryProfile(prof.key as DeliveryProfile)}
            >
              {prof.label}
            </button>
          ))}
        </div>
      </div>

      {/* Delivery Point & Statutory Deadline Card */}
      <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-panel-header)', border: '1px solid var(--color-divider)', fontSize: '12px', lineHeight: 1.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span className="mut">Grid Delivery Point (VTP):</span>
          <strong style={{ color: 'var(--color-text)' }}>{getVtpForMarket(selectedMarket.country)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span className="mut">Registry Surrender Deadline:</span>
          <strong style={{ color: 'var(--color-accent-700)' }}>{statutorySurrenderDeadline}</strong>
        </div>
        <div className="dim" style={{ fontSize: '12px', marginTop: '4px' }}>
          UDB Mass Balance Rule: Certificates must be balanced and surrendered within 12 months of injection month end (RED III Art. 30).
        </div>
      </div>
    </div>
  );
}
