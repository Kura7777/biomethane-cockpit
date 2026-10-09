import React, { useMemo } from 'react';
import { Market } from '../../../domain/markets/types';
import { MARKETS, isVoluntaryMarket } from '../../../domain/markets/registry';
import { EligibilityAssessment } from '../../../domain/eligibility/types';
import { CustodyPack } from '../../../domain/consignment/types';
import { custodyPartsForMarket } from '../../../domain/consignment/custody';
import { CocChecklistPanel } from '../custody/CocChecklistPanel';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Scale, BookOpen, Package, ChevronRight } from 'lucide-react';

interface TradeMarketAuditStepProps {
  marketId: string;
  setMarketId: (id: string) => void;
  selectedMarket: Market;
  assessment: EligibilityAssessment;
  ghgSavingPct: number;
  origin: string;
  /** The deal's custody pack, so checklist rows can say which field is still empty. */
  custody?: CustodyPack | null;
  /** Jump to the field that fixes a checklist row (opens the product step first). */
  onFixField?: (fieldId: string) => void;
}

export function TradeMarketAuditStep({
  marketId,
  setMarketId,
  selectedMarket,
  assessment,
  ghgSavingPct,
  origin,
  custody = null,
  onFixField,
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

  // The Dutch green-gas obligation is EMERGING (not yet law), so it is not in the ACTIVE groups above.
  const gasObligationMarkets = useMemo(() => MARKETS.filter(m => m.requiresGoAndPos), []);

  const voluntaryMarkets = useMemo(() => {
    return MARKETS.filter(m => m.status === 'ACTIVE' && (isVoluntaryMarket(m.id) || ['DE_GO', 'NL_GO', 'FR_GO', 'UK_RGGO', 'VOL_SCOPE1'].includes(m.id)));
  }, []);

  const openAuditor = (extra: Record<string, unknown> = {}) => {
    const activeDeal = (typeof window !== 'undefined' && (window as unknown as { __ACTIVE_TRADE_BUILDER_DEAL__?: Record<string, unknown> }).__ACTIVE_TRADE_BUILDER_DEAL__) || {};
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
    { title: 'Green-gas obligation (GO + PoS together)', markets: gasObligationMarkets },
    { title: 'Voluntary & Guarantees of Origin (Unbundled / Scope 1)', markets: voluntaryMarkets },
  ];

  return (
    <div className="tb-form">
      {/* Market Directory & Selector */}
      <div className="tb-form-row">
        <span className="tb-form-label">Market</span>
        <div className="tb-form-control">
          {marketGroups.map(group => {
            // The group heading already gives the jurisdiction/prefix context, so chips show
            // just the market's short name with its leading country code stripped (e.g.
            // "DE THG" -> "THG") — unless two markets in the group would then read the same,
            // in which case only those keep a muted country-code prefix to disambiguate.
            const displayName = (m: Market) => (
              m.shortName.startsWith(`${m.country} `) ? m.shortName.slice(m.country.length + 1) : m.shortName
            );
            const displayNameCounts = new Map<string, number>();
            group.markets.forEach(m => {
              const name = displayName(m);
              displayNameCounts.set(name, (displayNameCounts.get(name) || 0) + 1);
            });
            return (
              <div key={group.title} className="tb-section">
                <span className="tb-caption">{group.title}</span>
                <div className="tb-chips">
                  {group.markets.map(m => {
                    const name = displayName(m);
                    const needsPrefix = (displayNameCounts.get(name) || 0) > 1;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
                        onClick={() => setMarketId(m.id)}
                      >
                        {needsPrefix && <span className="mut">{m.country}·</span>}
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="tb-hint">16 statutory jurisdictions</p>
        </div>
      </div>

      {/* Active Market Profile */}
      <div className="tb-form-row">
        <span className="tb-form-label">Active route</span>
        <div className="tb-form-control">
          <span className="tb-form-value">
            {selectedMarket.name}{' '}
            <span className={`tb-badge ${verdictClass}`}>
              {isPass ? `ELIGIBLE (${assessment.gates.length}/${assessment.gates.length} PASS)` : isBlock ? 'HARD BLOCKED' : isConditional ? 'CONDITIONAL' : 'UNRESOLVED'}
            </span>
          </span>
          <dl className="tb-facts-list">
            <div>
              <dt>Jurisdiction</dt>
              <dd>{selectedMarket.country} ({selectedMarket.sector})</dd>
            </div>
            <div>
              <dt>Statutory Registry</dt>
              <dd>{selectedMarket.registry || 'National Registry'}</dd>
            </div>
            <div>
              <dt>Primary Directive</dt>
              <dd>{selectedMarket.legalBasis}</dd>
            </div>
            <div>
              <dt>Unit of Account</dt>
              <dd>{selectedMarket.unitLabel}</dd>
            </div>
            <div>
              <dt>Compliance Period</dt>
              <dd>Annual statutory surrender</dd>
            </div>
          </dl>

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
        </div>
      </div>

      {/* Statutory Regulatory Audit */}
      <div className="tb-form-row">
        <span className="tb-form-label">Gate audit</span>
        <div className="tb-form-control">
          <div className="tb-row">
            <span className={`tb-form-value tb-num ${isPass ? 'tb-pos' : 'tb-neg'}`}>
              <ShieldCheck size={16} /> {gatesClear} of {assessment.gates.length} gates clear
            </span>
            <button
              type="button"
              onClick={() => openAuditor()}
              className="btn btn-secondary"
              title="Run deep statutory audit with closed-domain AI & legal vault"
            >
              <Scale size={13} /> Run Forensic Statutory Audit
            </button>
          </div>
          <p className="tb-hint">RED III Regulatory Audit · select a gate to audit it</p>

          <ol className="tb-gates">
            {assessment.gates.map((g, gIdx) => {
              // Chain of custody is one checklist (origin, GO/PoS route, pairing, aid, deadlines, claims).
              if (g.gate === 'CHAIN_OF_CUSTODY' && g.checklist) {
                return (
                  <li key={gIdx} className="tb-gate-checklist">
                    <CocChecklistPanel
                      gate={g}
                      origin={origin}
                      targetCountry={selectedMarket.country}
                      custody={custody}
                      parts={custodyPartsForMarket(selectedMarket)}
                      onFix={onFixField}
                      onAudit={() => openAuditor({ focusedGateIndex: gIdx })}
                    />
                  </li>
                );
              }
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
        </div>
      </div>
    </div>
  );
}
