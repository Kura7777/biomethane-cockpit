import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { getMarketById, MARKETS } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { TradeAssessment } from '../../domain/trade/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { showToast } from '../../app/DeskToastContainer';
import { Columns3, X, FileCheck, History } from 'lucide-react';
import { LegalPackageModal } from '../trade-builder/LegalPackageModal';
import { DealAuditModal } from './DealAuditModal';
import { apiClient } from '../../domain/api/client';
import { deskSync } from '../../domain/sync/deskSync';
import { useAuth } from '../../shared/auth/useAuth';
import { DealRecord, DealStatus, DealAuditEntry } from '../../domain/deals/types';

interface DossierItem {
  id: string;
  title: string;
  meta: string;
  chip: string;
  chipClass?: string;
  category: 'Booked' | 'Declined' | 'Drifted';
  volume: string;
  netback: string;
  margin: string;
  note: string;
  drift: string;
  tone?: 'ok' | 'blocked' | 'warn';
  marketId: string;
  originCountry: string;
  feedstock: string;
  ci: number;
  volumeMwh: number;
  netbackVal: number;
  marginVal: number;
  rawAssessment?: TradeAssessment;
  auditTrail?: DealAuditEntry[];
  lifecycleStatus?: DealStatus;
}

const DEFAULT_DOSSIERS: DossierItem[] = [
  {
    id: 'DSK-2026-0114',
    title: 'DK manure → Germany THG',
    meta: 'REF DSK-2026-0114 · saved 14 Aug 2026',
    chip: 'Booked',
    chipClass: 'chip',
    category: 'Booked',
    volume: '10,000 MWh',
    netback: '+€72.07',
    margin: '46%',
    note: 'Dual-branch dossier carried at 1× single counting. Both branches, the persistent distinction and all six gate citations are attached to the ticket.',
    drift: 'DE THG mark +€3.10 since save · netback +€0.98',
    tone: 'ok',
    marketId: 'DE_THG',
    originCountry: 'DK',
    feedstock: 'manure',
    ci: -100,
    volumeMwh: 10000,
    netbackVal: 72.07,
    marginVal: 33.15,
  },
  {
    id: 'DSK-2026-0109',
    title: 'UK RTFO grid-injected food waste',
    meta: 'REF DSK-2026-0109 · saved 11 Aug 2026',
    chip: 'Declined',
    chipClass: 'chip chip-a',
    category: 'Declined',
    volume: '15,000 MWh',
    netback: '—',
    margin: '—',
    note: 'Retained as the evidence of why the corridor was declined: grid injection cannot evidence UDB ingestion for the RTFO, so the trade hard-blocks at gate 2.',
    drift: 'No marks affect a blocked route',
    tone: 'blocked',
    marketId: 'UK_RTFO',
    originCountry: 'DK',
    feedstock: 'food_waste',
    ci: -30,
    volumeMwh: 15000,
    netbackVal: 0,
    marginVal: 0,
  },
  {
    id: 'DSK-2026-0112',
    title: 'DK manure → Netherlands ERE',
    meta: 'REF DSK-2026-0112 · saved 12 Aug 2026',
    chip: 'Booked',
    chipClass: 'chip',
    category: 'Booked',
    volume: '12,000 MWh',
    netback: '+€58.40',
    margin: '37%',
    note: 'ERE structurally advantages the low-CI molecule — 1 ERE is 1 kg CO₂e avoided with no multipliers, so the negative CI carries the whole margin.',
    drift: 'NL ERE mark unchanged · netback flat',
    tone: 'ok',
    marketId: 'NL_ERE',
    originCountry: 'DK',
    feedstock: 'manure',
    ci: -100,
    volumeMwh: 12000,
    netbackVal: 58.40,
    marginVal: 21.60,
  },
  {
    id: 'DSK-2026-0104',
    title: 'AT EGG green gas quota',
    meta: 'REF DSK-2026-0104 · saved 4 Aug 2026',
    chip: 'Drifted',
    chipClass: 'chip chip-a',
    category: 'Drifted',
    volume: '6,000 MWh',
    netback: '+€6.40',
    margin: '4%',
    note: 'Priced against a simulated level. Thin margin means a 5% move in the EGG mark flips the route loss-making, so it needs a broker quote before booking.',
    drift: 'Priced off simulated marks · 12d old',
    tone: 'warn',
    marketId: 'AT_EGG',
    originCountry: 'DK',
    feedstock: 'manure',
    ci: -100,
    volumeMwh: 6000,
    netbackVal: 6.40,
    marginVal: 0.25,
  },
];

export function LibraryScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const { role, can, user } = useAuth();

  const [filter, setFilter] = useState<'All' | 'Booked' | 'Declined' | 'Drifted'>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [activeLegalAssessment, setActiveLegalAssessment] = useState<TradeAssessment | null>(null);
  const [activeAuditDeal, setActiveAuditDeal] = useState<{ id: string; title: string; auditTrail: DealAuditEntry[] } | null>(null);
  const [ledgerDeals, setLedgerDeals] = useState<DealRecord[]>([]);

  const refreshLedger = () => {
    apiClient.getDeals().then(res => {
      if (res.deals && res.deals.length > 0) {
        setLedgerDeals(res.deals);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    refreshLedger();
    const unsub = deskSync.onSyncEvent(ev => {
      if (ev.type === 'DEAL_BOOKED' || ev.type === 'DEAL_TRANSITIONED') {
        refreshLedger();
      }
    });
    return unsub;
  }, []);

  const savedList = state.savedAssessments;

  // Convert saved assessments and ledger deals to card format
  const displayDossiers: DossierItem[] = useMemo(() => {
    if (ledgerDeals.length > 0) {
      const mappedLedger: DossierItem[] = ledgerDeals.map(deal => {
        const statusStr = deal.status as string;
        const isDeclined = statusStr === 'DRAFT' || statusStr === 'ARCHIVED';
        const isBooked = deal.status === 'EXECUTED' || deal.status === 'SETTLED' || statusStr === 'CONFIRMED';
        const cat: 'Booked' | 'Declined' | 'Drifted' = isDeclined ? 'Declined' : isBooked ? 'Booked' : 'Drifted';
        return {
          id: deal.id,
          title: deal.tradeTitle,
          meta: `REF ${deal.id} · updated ${new Date(deal.updatedAt).toLocaleDateString('en-GB')}`,
          chip: deal.status,
          chipClass: isDeclined ? 'chip chip-a' : 'chip',
          category: cat,
          volume: `${deal.volumeMWh.toLocaleString()} MWh`,
          netback: deal.netbackEur > 0 ? `+€${deal.netbackEur.toFixed(2)}` : deal.netbackEur === 0 ? '—' : `−€${Math.abs(deal.netbackEur).toFixed(2)}`,
          margin: deal.deskMarginEur > 0 ? `€${deal.deskMarginEur.toFixed(2)}` : '—',
          note: deal.notes || `${deal.marketName} transaction recorded in ledger.`,
          drift: `Ledger: ${deal.status} · ${deal.auditTrail?.length || 1} audit events`,
          tone: isDeclined ? 'blocked' : 'ok',
          marketId: deal.marketId,
          originCountry: deal.originCountry,
          feedstock: deal.feedstock,
          ci: deal.carbonIntensity,
          volumeMwh: deal.volumeMWh,
          netbackVal: deal.netbackEur,
          marginVal: deal.deskMarginEur,
          auditTrail: deal.auditTrail,
          lifecycleStatus: deal.status,
          rawAssessment: deal.assessment || savedList.find(s => s.id === deal.id),
        };
      });

      const missingSaved: DossierItem[] = savedList
        .filter(s => !ledgerDeals.some(d => d.id === s.id))
        .map(a => {
          const net = a.netback.netNetback ?? 0;
          const isHardBlock = a.eligibility.overallVerdict === 'HARD_BLOCK';
          const vol = a.consignment.volumeMWh ?? 120000;
          const margin = a.netback.deskMargin ?? 0;
          return {
            id: a.id,
            title: `${a.consignment.originCountryName || a.consignment.originCountry} ${a.consignment.feedstockName || a.consignment.feedstock} → ${a.targetMarketName}`,
            meta: `REF ${a.id} · saved ${new Date(a.createdAt).toLocaleDateString('en-GB')}`,
            chip: isHardBlock ? 'Declined' : 'Booked',
            chipClass: isHardBlock ? 'chip chip-a' : 'chip',
            category: isHardBlock ? 'Declined' : 'Booked',
            volume: `${vol.toLocaleString()} MWh`,
            netback: isHardBlock ? '—' : net > 0 ? `+€${net.toFixed(2)}` : `−€${Math.abs(net).toFixed(2)}`,
            margin: isHardBlock ? '—' : margin > 0 ? `€${margin.toFixed(2)}` : 'Unset',
            note: a.userNotes || `${a.targetMarketName} assessment under RED III criteria.`,
            drift: isHardBlock ? 'No marks affect a blocked route' : 'Recomputed against live marks',
            tone: isHardBlock ? 'blocked' : 'ok',
            marketId: a.targetMarketId,
            originCountry: a.consignment.originCountry,
            feedstock: a.consignment.feedstock,
            ci: a.consignment.carbonIntensity,
            volumeMwh: vol,
            netbackVal: net,
            marginVal: margin,
            rawAssessment: a,
          };
        });

      return [...missingSaved, ...mappedLedger];
    }

    if (savedList.length > 0) {
      return savedList.map(a => {
        const net = a.netback.netNetback ?? 0;
        const isHardBlock = a.eligibility.overallVerdict === 'HARD_BLOCK';
        const vol = a.consignment.volumeMWh ?? 120000;
        const margin = a.netback.deskMargin ?? 0;
        return {
          id: a.id,
          title: `${a.consignment.originCountryName || a.consignment.originCountry} ${a.consignment.feedstockName || a.consignment.feedstock} → ${a.targetMarketName}`,
          meta: `REF ${a.id} · saved ${new Date(a.createdAt).toLocaleDateString('en-GB')}`,
          chip: isHardBlock ? 'Declined' : 'Booked',
          chipClass: isHardBlock ? 'chip chip-a' : 'chip',
          category: isHardBlock ? 'Declined' : 'Booked',
          volume: `${vol.toLocaleString()} MWh`,
          netback: isHardBlock ? '—' : net > 0 ? `+€${net.toFixed(2)}` : `−€${Math.abs(net).toFixed(2)}`,
          margin: isHardBlock ? '—' : margin > 0 ? `€${margin.toFixed(2)}` : 'Unset',
          note: a.userNotes || `${a.targetMarketName} assessment under RED III criteria.`,
          drift: isHardBlock ? 'No marks affect a blocked route' : 'Recomputed against live marks',
          tone: isHardBlock ? 'blocked' : 'ok',
          marketId: a.targetMarketId,
          originCountry: a.consignment.originCountry,
          feedstock: a.consignment.feedstock,
          ci: a.consignment.carbonIntensity,
          volumeMwh: vol,
          netbackVal: net,
          marginVal: margin,
          rawAssessment: a,
        };
      });
    }

    return DEFAULT_DOSSIERS;
  }, [ledgerDeals, savedList]);

  const filteredDossiers = useMemo(() => {
    if (filter === 'All') return displayDossiers;
    return displayDossiers.filter(d => d.category === filter);
  }, [displayDossiers, filter]);

  const handleRecalculate = (dossier: DossierItem) => {
    if (dossier.rawAssessment) {
      const a = dossier.rawAssessment;
      const market = getMarketById(a.targetMarketId);
      if (!market) return;
      const newEl = evaluateEligibility(a.consignment, market);
      const newNet = computeNetback(market, a.consignment, state.marks, state.costs, state.marks.pricingSides);
      const updated: TradeAssessment = {
        ...a,
        eligibility: newEl,
        netback: newNet,
        marks: state.marks,
        costs: state.costs,
      };
      dispatch({ type: 'SAVE_ASSESSMENT', assessment: updated });
      showToast(`Recalculated dossier ${dossier.id} against live marks`);
    } else {
      showToast(`Recalculating ${dossier.title}...`);
      navigate(buildDealUrl({ marketId: dossier.marketId, originCountry: dossier.originCountry }));
    }
  };

  const handleOpen = (dossier: DossierItem) => {
    navigate(buildDealUrl({
      marketId: dossier.marketId,
      originCountry: dossier.originCountry,
      feedstock: dossier.feedstock,
      ci: dossier.ci,
      volume: dossier.volumeMwh,
    }));
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const comparedDossiers = useMemo(() => {
    return displayDossiers.filter(d => selectedIds.includes(d.id));
  }, [displayDossiers, selectedIds]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
          padding: '16px 18px',
          borderBottom: '2px solid var(--color-divider)',
        }}
      >
        <div>
          <h3 className="ptitle font-heading font-extrabold text-[20px] m-0">Dossier library</h3>
          <div className="subttl text-[12px] mt-1">
            Booked and declined trade dossiers with their citations · a declined corridor is the evidence of why it was declined
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedIds.length >= 2 && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setIsCompareOpen(true)}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Compare {selectedIds.length}</span>
            </button>
          )}

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['All', 'Booked', 'Declined', 'Drifted'] as const).map(f => (
              <button
                key={f}
                type="button"
                className={`chip ${filter === f ? 'chip-a' : ''} cursor-pointer`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Hairline Card Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1px',
          background: 'var(--color-divider)',
        }}
      >
        {filteredDossiers.map(d => {
          const isSelected = selectedIds.includes(d.id);
          return (
            <div
              key={d.id}
              style={{
                background: isSelected ? 'var(--color-surface)' : 'var(--color-bg)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px 18px 12px',
                  borderBottom: '1px solid var(--color-divider)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(d.id)}
                      className="cursor-pointer text-[11px] font-semibold text-text/70 hover:text-text"
                      title={isSelected ? 'Deselect' : 'Select for comparison'}
                    >
                      [{isSelected ? '✓' : ' '}]
                    </button>
                    <h5 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }} className="font-heading truncate">
                      {d.title}
                    </h5>
                  </div>
                  <div className="num mut text-[11px] mt-1">
                    {d.meta}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <span className={d.chipClass || 'chip'}>{d.chip}</span>
                </div>
              </div>

              {/* 3-cell Stat Strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1px',
                  background: 'var(--color-divider)',
                }}
              >
                <div style={{ background: 'var(--color-bg)', padding: '10px 18px' }}>
                  <div className="eyebrow">Volume</div>
                  <div className="num" style={{ fontSize: '15px', fontWeight: 600 }}>{d.volume}</div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: '10px 18px' }}>
                  <div className="eyebrow">Netback</div>
                  <div className="num" style={{ fontSize: '15px', fontWeight: 600 }}>{d.netback}</div>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: '10px 18px' }}>
                  <div className="eyebrow">Margin</div>
                  <div className="num" style={{ fontSize: '15px', fontWeight: 600 }}>{d.margin}</div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '12px 18px 14px', borderTop: '1px solid var(--color-divider)' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.55, margin: '0 0 10px' }} className="mut">
                  {d.note}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: d.tone === 'blocked' ? 'var(--color-accent-700)' : d.tone === 'warn' ? 'var(--color-accent-800)' : 'inherit',
                    }}
                  >
                    {d.drift}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {d.auditTrail && d.auditTrail.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => setActiveAuditDeal({ id: d.id, title: d.title, auditTrail: d.auditTrail || [] })}
                      >
                        Audit
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        if (d.rawAssessment) {
                          setActiveLegalAssessment(d.rawAssessment);
                        } else {
                          const market = getMarketById(d.marketId) || MARKETS[0];
                          const feedInfo = FEEDSTOCK_REGISTRY[d.feedstock] || FEEDSTOCK_REGISTRY.manure;
                          const c: Consignment = {
                            ...REFERENCE_CONSIGNMENTS.DANISH_MANURE,
                            id: d.id,
                            name: d.title,
                            originCountry: d.originCountry,
                            originCountryName: d.originCountry,
                            feedstock: d.feedstock,
                            feedstockName: feedInfo.name,
                            annexClassification: feedInfo.annexClassification,
                            carbonIntensity: d.ci,
                            volumeMWh: d.volumeMwh,
                          };
                          const el = evaluateEligibility(c, market);
                          const nb = computeNetback(market, c, state.marks, state.costs, state.marks.pricingSides);
                          setActiveLegalAssessment({
                            id: d.id,
                            createdAt: new Date().toISOString(),
                            consignment: c,
                            targetMarketId: market.id,
                            targetMarketName: market.name,
                            eligibility: el,
                            netback: nb,
                            marks: state.marks,
                            costs: state.costs,
                            userNotes: d.note,
                          });
                        }
                      }}
                      title="Preview EFET Term Sheet & export official PDF"
                    >
                      <span>📄</span>
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleRecalculate(d)}
                    >
                      Recalculate
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={() => handleOpen(d)}
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Modal */}
      {isCompareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Side-by-side trade comparison"
          className="scrim"
          style={{ alignItems: 'flex-start', justifyContent: 'center', padding: '36px 24px', overflowY: 'auto' }}
        >
          <div className="panel" style={{ width: 'min(1080px, 100%)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                background: 'var(--color-surface)',
                borderBottom: '2px solid var(--color-divider)',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 800 }}>
                  Side-by-side trade comparison
                </h4>
                <div style={{ fontSize: '12px', marginTop: '3px' }} className="mut">
                  Comparing {comparedDossiers.length} structured trade dossiers across compliance destinations
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                onClick={() => setIsCompareOpen(false)}
              >
                Esc ✕
              </button>
            </div>

            <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
              <table className="table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    {comparedDossiers.map(d => (
                      <th key={d.id}>{d.title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Reference</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id} className="num">{d.id}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Destination</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id}>{d.marketId}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Volume</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id} className="num">{d.volume}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Netback</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id} className="num font-semibold">{d.netback}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Desk Margin</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id} className="num font-semibold">{d.margin}</td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Status</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id}><span className={d.chipClass || 'chip'}>{d.chip}</span></td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Action</td>
                    {comparedDossiers.map(d => (
                      <td key={d.id}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                          onClick={() => {
                            setIsCompareOpen(false);
                            handleOpen(d);
                          }}
                        >
                          Open in Desk
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {activeAuditDeal && (
        <DealAuditModal
          isOpen={true}
          onClose={() => setActiveAuditDeal(null)}
          dealId={activeAuditDeal.id}
          dealTitle={activeAuditDeal.title}
          auditTrail={activeAuditDeal.auditTrail}
        />
      )}

      {/* Legal Package Modal */}
      {activeLegalAssessment && (
        <LegalPackageModal
          isOpen={true}
          onClose={() => setActiveLegalAssessment(null)}
          assessment={activeLegalAssessment}
        />
      )}
    </div>
  );
}
