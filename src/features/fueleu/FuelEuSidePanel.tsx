import React, { useMemo, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { FuelEuShippingGroup } from '../../domain/fueleu/groups';
import { ShippingCounterparty } from '../../domain/fueleu/types';
import { projectStaticFleetForCounterparties, projectStaticFleet } from '../../domain/fueleu/calculator';
import { getAssumption, fuelEuPoolBidPriceEurPerTco2e } from '../../domain/assumptions/registry';
import { FuelEuProjectionChart } from './FuelEuProjectionChart';

export interface FuelEuDirectoryRow {
  kind: 'GROUP' | 'COMPANY';
  group: FuelEuShippingGroup;
  /** Present only for a COMPANY row. */
  company?: ShippingCounterparty;
  /** All member companies of this row's group (used for DoC holders / do-nothing chart on a group row). */
  members: ShippingCounterparty[];
}

export interface FuelEuSidePanelProps {
  row: FuelEuDirectoryRow;
  onClose: () => void;
  onBuildTermSheet: (company: ShippingCounterparty) => void;
  onAddToPool: (groupId: string) => void;
}

function entityTypeLabel(entityType: FuelEuShippingGroup['entityType']): string {
  switch (entityType) {
    case 'OWNER_OPERATOR':
      return 'Owner-operator';
    case 'THIRD_PARTY_MANAGER':
      return 'Third-party manager';
    case 'CRUISE':
      return 'Cruise';
    default:
      return 'Unclassified';
  }
}

function dominantSegment(members: ShippingCounterparty[]): string {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.segment, (counts.get(m.segment) || 0) + 1);
  let best = '—';
  let bestCount = -1;
  for (const [seg, count] of counts) {
    if (count > bestCount) {
      best = seg;
      bestCount = count;
    }
  }
  return best;
}

/** 420px right-hand side panel: selected row detail, do-nothing penalty path chart, DoC holders, contacts, footer actions. */
export function FuelEuSidePanel({ row, onClose, onBuildTermSheet, onAddToPool }: FuelEuSidePanelProps) {
  const [assume2025NonCompliant, setAssume2025NonCompliant] = useState(true);

  const { group, company, members } = row;
  const isSurplus = row.kind === 'COMPANY' && company ? company.compliance_balance_2026_tco2e >= 0 : group.sumOfCompanyBalances2026 >= 0;

  const name = row.kind === 'COMPANY' && company ? company.parent_name : group.name;
  const meta =
    row.kind === 'COMPANY' && company
      ? `${group.name} · ${company.segment}`
      : `${entityTypeLabel(group.entityType)} · ${dominantSegment(members).replace(/ ship$/i, '')} · ${group.memberCompanyCount} entities`;

  const balanceTco2e = row.kind === 'COMPANY' && company ? company.compliance_balance_2026_tco2e : group.sumOfCompanyBalances2026;
  const penaltyEur = row.kind === 'COMPANY' && company ? company.penalty_2026_y1_eur : group.sumOfCompanyPenalties2026;

  const offer = getAssumption('fueleu.poolBuyPriceEurPerTco2e');
  const bid = fuelEuPoolBidPriceEurPerTco2e();
  const poolCostEur = Math.abs(balanceTco2e) * offer;
  const surplusValueEur = Math.abs(balanceTco2e) * bid;

  const projectionMembers = row.kind === 'COMPANY' && company ? [company] : members;
  const groupPoints = useMemo(
    () =>
      projectStaticFleetForCounterparties(
        projectionMembers.map(m => ({ vlsfoTonnes: m.vlsfo_tonnes, mgoTonnes: m.mgo_tonnes, lngTonnes: m.lng_tonnes, assume2025NonCompliant }))
      ),
    [projectionMembers, assume2025NonCompliant]
  );
  // A real (not fabricated) escalation series for the panel chart's ×N tag at 2030: runs the same
  // calculator function on the row's combined tonnages as one fleet, so the multiplier reflects an
  // actual Art. 23(2) trajectory rather than an invented number — consistent with this codebase's
  // existing "group view assumes uniform status" simplification (see projectStaticFleetForCounterparties's doc note).
  const multiplierSeries = useMemo(() => {
    const combined = projectionMembers.reduce(
      (acc, m) => ({
        vlsfoTonnes: acc.vlsfoTonnes + m.vlsfo_tonnes,
        mgoTonnes: acc.mgoTonnes + m.mgo_tonnes,
        lngTonnes: acc.lngTonnes + m.lng_tonnes,
      }),
      { vlsfoTonnes: 0, mgoTonnes: 0, lngTonnes: 0 }
    );
    return projectStaticFleet({ ...combined, assume2025NonCompliant });
  }, [projectionMembers, assume2025NonCompliant]);

  const docHolders = row.kind === 'COMPANY' && company ? [company] : members;

  const handleBuildTermSheet = () => {
    if (row.kind === 'COMPANY' && company) {
      onBuildTermSheet(company);
      return;
    }
    // Group row: the group's largest member company by vessel count.
    const largest = [...members].sort((a, b) => b.vessels_in_scope - a.vessels_in_scope)[0];
    if (largest) onBuildTermSheet(largest);
  };

  return (
    <aside className="fe-aside">
      <div className="fe-aside-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{name}</div>
            <div style={{ color: 'var(--fe-muted)', fontSize: '12px', marginTop: '4px' }}>{meta}</div>
          </div>
          <button type="button" aria-label="Close panel" onClick={onClose} className="fe-icon-btn fe-icon-btn-sm">
            <X size={14} />
          </button>
        </div>
        <div className="fe-aside-stats">
          <div>
            <div style={{ color: 'var(--fe-muted)', fontSize: '12px' }}>2026 balance</div>
            <div className="num" style={{ fontSize: '15px', fontWeight: 500, color: isSurplus ? 'var(--fe-surplus)' : 'var(--fe-deficit)' }}>
              {isSurplus ? '+' : '−'}{(Math.abs(balanceTco2e) / 1000).toFixed(1)} kt
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--fe-muted)', fontSize: '12px' }}>Penalty</div>
            <div className="num" style={{ fontSize: '15px', fontWeight: 500 }}>€{(penaltyEur / 1e6).toFixed(1)}M</div>
          </div>
          <div>
            <div style={{ color: 'var(--fe-muted)', fontSize: '12px' }}>{isSurplus ? 'Surplus value' : 'Pool cost'}</div>
            <div className="num" style={{ fontSize: '15px', fontWeight: 500 }}>
              €{((isSurplus ? surplusValueEur : poolCostEur) / 1e6).toFixed(1)}M
            </div>
          </div>
        </div>
      </div>

      <div className="fe-aside-body">
        <div className="fe-aside-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 500 }}>Do-nothing penalty path</div>
            <div className="fe-seg" role="group" aria-label="2025 compliance assumption" style={{ height: '26px' }}>
              <button
                type="button"
                className={assume2025NonCompliant ? 'active' : ''}
                style={{ padding: '0 8px', fontSize: '12px' }}
                onClick={() => setAssume2025NonCompliant(true)}
                title="Treat 2025 as the ship's first non-compliant reporting period"
              >
                Not settled
              </button>
              <button
                type="button"
                className={!assume2025NonCompliant ? 'active' : ''}
                style={{ padding: '0 8px', fontSize: '12px' }}
                onClick={() => setAssume2025NonCompliant(false)}
                title="Treat 2025 as settled/compliant"
              >
                2025 settled
              </button>
            </div>
          </div>
          <FuelEuProjectionChart groupPoints={groupPoints} multiplierSeries={multiplierSeries} title="" width={380} height={150} variant="panel" />
        </div>

        <div className="fe-aside-section">
          <div style={{ fontWeight: 500 }}>DoC holders</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
            {docHolders.map(m => (
              <div key={m.company_imo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.parent_name}</span>
                <span className="num" style={{ color: 'var(--fe-muted)' }}>{m.vessels_in_scope} vessels</span>
              </div>
            ))}
          </div>
        </div>

        <div className="fe-aside-section" style={{ flexGrow: 1 }}>
          <div style={{ fontWeight: 500 }}>Contacts</div>
          {group.contacts.length === 0 ? (
            <div style={{ color: 'var(--fe-muted)', fontSize: '12px', lineHeight: 1.5 }}>No verified contact on file.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.contacts.map((c, i) => (
                <div key={i} style={{ fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 500 }}>{c.name || c.kind}</span>
                    <a href={c.sourceUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--fe-accent)' }}>
                      <ExternalLink size={10} /> source
                    </a>
                  </div>
                  {c.role && <div style={{ color: 'var(--fe-muted)', fontSize: '11px' }}>{c.role}</div>}
                  {c.email && <div>{c.email}</div>}
                  {c.phone && <div>{c.phone}</div>}
                  <div style={{ color: 'var(--fe-muted)', fontSize: '10.5px', marginTop: '2px' }}>checked {c.checkedAt}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fe-aside-footer">
        <button type="button" className="fe-btn-primary" onClick={handleBuildTermSheet}>
          Build term sheet
        </button>
        <button type="button" className="fe-btn-secondary" onClick={() => onAddToPool(group.id)}>
          Add to pool
        </button>
      </div>
    </aside>
  );
}
