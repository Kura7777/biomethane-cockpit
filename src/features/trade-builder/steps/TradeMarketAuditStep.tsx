import React, { useMemo } from 'react';
import { Market } from '../../../domain/markets/types';
import { MARKETS, isVoluntaryMarket } from '../../../domain/markets/registry';
import { EligibilityAssessment } from '../../../domain/eligibility/types';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Scale, BookOpen, Package, ChevronRight } from 'lucide-react';

interface TradeMarketAuditStepProps {
  marketId: string;
  setMarketId: (id: string) => void;
  selectedMarket: Market;
  assessment: EligibilityAssessment;
  ghgSavingPct: number;
  origin: string;
}

export function TradeMarketAuditStep({
  marketId,
  setMarketId,
  selectedMarket,
  assessment,
  ghgSavingPct,
  origin,
}: TradeMarketAuditStepProps) {
  const isPass = assessment.overallVerdict === 'ELIGIBLE';
  const isBlock = assessment.overallVerdict === 'HARD_BLOCK';
  const isConditional = assessment.overallVerdict === 'CONDITIONAL';

  // Group markets by statutory sector
  const transportMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (m.sector === 'TRANSPORT' || ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'UK_RTFO'].includes(m.id)));
  }, []);

  const industrialMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (m.sector === 'HEAT_POWER' || m.id === 'EU_ETS_INDUSTRIAL'));
  }, []);

  const voluntaryMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (isVoluntaryMarket(m.id) || ['DE_GO', 'NL_GO', 'FR_GO', 'UK_RGGO', 'VOL_SCOPE1'].includes(m.id)));
  }, []);

  const openAuditor = (extra: Record<string, unknown> = {}) => {
    const activeDeal = (typeof window !== 'undefined' && (window as any).__ACTIVE_TRADE_BUILDER_DEAL__) || {};
    const activeCi = typeof activeDeal.carbonIntensity === 'number' ? activeDeal.carbonIntensity : Math.round(94.0 * (1 - ghgSavingPct / 100));
    window.dispatchEvent(new CustomEvent('open-compliance-auditor', {
      detail: {
        ...activeDeal,
        originCountry: origin,
        targetMarketId: marketId,
        targetMarketName: selectedMarket.name,
        carbonIntensity: activeCi,
        initialTab: 'GATE_BREAKDOWN',
        ...extra,
      },
    }));
  };

  const verdictClass = isPass ? 'pos' : isBlock ? 'neg' : 'warn';
  const gatesClear = assessment.gates.filter(g => g.verdict === 'PASS').length;

  const marketGroups: { title: string; markets: Market[]; prefix?: string }[] = [
    { title: 'National Transport Quotas (RED III Annex IX-A)', markets: transportMarkets },
    { title: 'Compliance Industrial ETS (Directive (EU) 2023/959)', markets: industrialMarkets, prefix: 'EU' },
    { title: 'Voluntary & Guarantees of Origin (Unbundled / Scope 1)', markets: voluntaryMarkets },
  ];

  return (
    <div className="tb-step">
      {/* Market Directory & Selector Card */}
      <section className="tb-panel">
        <div className="tb-panel-head">
          <h3 className="tb-panel-title">
            <Scale size={16} /> Target Compliance Destination
          </h3>
          <span className="tb-panel-meta">16 statutory jurisdictions</span>
        </div>

        {marketGroups.map(group => (
          <div key={group.title} className="tb-section">
            <span className="tb-label strong">{group.title}</span>
            <div className="tb-chips">
              {group.markets.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
                  onClick={() => setMarketId(m.id)}
                >
                  <span>{group.prefix ?? m.country}</span>
                  <span>·</span>
                  <span>{m.shortName}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Active Market Profile Card */}
      <section className="tb-panel">
        <div className="tb-panel-head">
          <div>
            <span className="tb-label">Active statutory route</span>
            <h3 className="tb-market-name">{selectedMarket.name}</h3>
          </div>
          <span className={`tb-badge ${verdictClass}`}>
            {isPass ? 'ELIGIBLE (6/6 PASS)' : isBlock ? 'HARD BLOCKED' : isConditional ? 'CONDITIONAL' : 'UNRESOLVED'}
          </span>
        </div>

        <div className="tb-facts">
          <div>
            <strong>Jurisdiction:</strong> {selectedMarket.country} ({selectedMarket.sector})
          </div>
          <div>
            <strong>Statutory Registry:</strong> {selectedMarket.registry || 'National Registry'}
          </div>
          <div className="full">
            <strong>Primary Directive:</strong> {selectedMarket.legalBasis}
          </div>
          <div>
            <strong>Unit of Account:</strong> {selectedMarket.unitLabel}
          </div>
          <div>
            <strong>Compliance Period:</strong> Annual statutory surrender
          </div>
        </div>

        {/* Voluntary Book-and-Claim Callout */}
        {isVoluntaryMarket(selectedMarket.id) && (
          <div className="tb-alert info tb-alert-block">
            <span className="tb-alert-text">
              <Package size={14} /> Unbundled Book-and-Claim Scheme
            </span>
            <p className="tb-alert-body">
              Single-leg Guarantee of Origin (GoO) registry transfer. <strong>No physical gas molecule delivery to counterparty</strong>. Biomethane remains in the {origin} domestic gas grid; buyer acquires verified environmental attributes only.
            </p>
          </div>
        )}
      </section>

      {/* Six-Gate Statutory Regulatory Audit */}
      <section className="tb-panel">
        <div className="tb-panel-head">
          <h3 className="tb-panel-title">
            <ShieldCheck size={16} /> RED III Six-Gate Regulatory Audit
          </h3>
          <div className="tb-row-start">
            <span className={`tb-label strong tb-num ${isPass ? 'tb-pos' : 'tb-neg'}`}>{gatesClear} of 6 gates clear</span>
            <button
              type="button"
              onClick={() => openAuditor()}
              className="btn btn-secondary tb-accent-btn"
              title="Run deep statutory audit with closed-domain AI & legal vault"
            >
              <Scale size={13} /> Run Forensic Statutory Audit
            </button>
          </div>
        </div>

        <ol className="tb-gates">
          {assessment.gates.map((g, gIdx) => {
            const gatePass = g.verdict === 'PASS';
            const gateBlock = g.verdict === 'HARD_BLOCK';
            const gateClass = gatePass ? 'pos' : gateBlock ? 'neg' : 'warn';
            return (
              <li key={gIdx}>
                <button
                  type="button"
                  className={`tb-gate ${gateClass}`}
                  onClick={() => openAuditor({ focusedGateIndex: gIdx })}
                  title={`Click to audit Gate ${gIdx + 1} with Chief Regulatory Officer`}
                >
                  <span className={`tb-gate-icon tb-${gateClass}`}>
                    {gatePass ? <CheckCircle2 size={16} /> : gateBlock ? <XCircle size={16} /> : <AlertTriangle size={16} />}
                  </span>
                  <span className="tb-gate-main">
                    <span className="tb-gate-title">Gate {gIdx + 1}: {g.gateLabel}</span>
                    <span className="tb-gate-reason">{g.reason}</span>
                    <span className="tb-gate-cite">
                      <BookOpen size={12} /> {g.citations[0]?.shortName || g.citations[0]?.fullReference || 'RED III Statutory Directive'}
                    </span>
                  </span>
                  <span className="tb-gate-side">
                    <span className={`tb-badge ${gateClass}`}>
                      {gatePass
                        ? (gIdx === 3 ? 'Pass · Annex IX-A' : gIdx === 4 ? `Pass · ${ghgSavingPct}% GHG` : 'Pass')
                        : gateBlock
                        ? 'Blocked'
                        : 'Conditional'}
                    </span>
                    {!gatePass && (
                      <span className="tb-gate-link">
                        Audit Gate <ChevronRight size={12} />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
