import { MARKETS, isVoluntaryMarket } from '../../../domain/markets/registry';
import { Market } from '../../../domain/markets/types';
import { EligibilityAssessment, GateResult } from '../../../domain/eligibility/types';

interface TradeGridDestinationColProps {
  marketId: string;
  setMarketId: (id: string) => void;
  selectedMarket: Market;
  assessment: EligibilityAssessment;
  origin: string;
  ghgSavingPct: number;
}

export function TradeGridDestinationCol({
  marketId,
  setMarketId,
  selectedMarket,
  assessment,
  origin,
  ghgSavingPct,
}: TradeGridDestinationColProps) {
  return (
    <div style={{ borderRight: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '13px 18px',
          borderBottom: '2px solid var(--color-divider)',
        }}
      >
        <span
          className="num"
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          2
        </span>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
          Destination &amp; legal validation
        </h4>
      </div>

      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-divider)' }}>
        <div className="eyebrow">Target market</div>
        <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '6px 0 8px' }} className="mut">
          16 compliance mechanisms across 15 jurisdictions — France runs two in parallel.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {MARKETS.filter(m => m.status === 'ACTIVE').map(m => (
            <button
              key={m.id}
              type="button"
              className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
              onClick={() => setMarketId(m.id)}
            >
              {m.shortName}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--color-divider)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h5 style={{ margin: 0, fontSize: '17px' }}>{selectedMarket.name}</h5>
          <span className={`chip ${assessment.overallVerdict === 'HARD_BLOCK' ? 'chip-a' : ''}`}>
            {assessment.overallVerdict === 'ELIGIBLE'
              ? 'Eligible'
              : assessment.overallVerdict === 'CONDITIONAL'
              ? 'Conditional'
              : assessment.overallVerdict === 'UNRESOLVED'
              ? 'Unresolved'
              : 'Blocked'}
          </span>
        </div>
        <div style={{ fontSize: '12px', marginTop: '3px' }} className="mut">
          {selectedMarket.legalBasis} · {selectedMarket.registry || 'Statutory registry'}
        </div>

        {isVoluntaryMarket(selectedMarket.id) && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 10px',
              backgroundColor: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: '3px',
              fontSize: '12px',
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: 'var(--color-blue-700, #1d4ed8)', marginBottom: '2px' }}>
              <span>📦 UNBUNDLED BOOK-AND-CLAIM TRADE</span>
            </div>
            <div style={{ color: 'var(--color-text)' }}>
              Single-leg Guarantee of Origin (GoO) transfer. <strong>No physical gas delivery to counterparty</strong>. Biomethane molecules remain in {origin} domestic grid; buyer acquires environmental attributes only.
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '6px 18px 18px' }} className="noscroll">
        <div className="eyebrow" style={{ margin: '10px 0 4px' }}>
          Gate audit · {assessment.gates.filter((g: GateResult) => g.verdict === 'PASS').length} of {assessment.gates.length} clear
        </div>
        {assessment.gates.map((g: GateResult, gIdx: number) => {
          const isPass = g.verdict === 'PASS';
          const isBlock = g.verdict === 'HARD_BLOCK';
          const isUnresolved = g.verdict === 'UNRESOLVED';
          return (
            <div key={gIdx} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{g.gateLabel}</span>
                <span className={`chip ${isBlock ? 'chip-a' : ''}`}>
                  {isPass
                    ? (gIdx === 3 ? 'Pass · IX-A' : gIdx === 4 ? `Pass · ${ghgSavingPct}%` : 'Pass')
                    : isBlock
                    ? 'Blocked'
                    : isUnresolved
                    ? 'Unresolved'
                    : 'Conditional'}
                </span>
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '3px' }} className="mut">
                {g.reason}
              </div>
              <div style={{ fontSize: '12px', marginTop: '3px', color: 'var(--color-accent-700)' }}>
                {g.citations[0]?.shortName || g.citations[0]?.fullReference || 'RED III Statutory Directive'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
