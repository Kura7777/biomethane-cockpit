import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Flame, ExternalLink } from 'lucide-react';
import { FUEL_EU_SHIPPING_GROUPS, FuelEuShippingGroup } from '../../domain/fueleu/groups';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { projectStaticFleetForCounterparties } from '../../domain/fueleu/calculator';
import { GroupEntityType } from '../../domain/fueleu/types';
import { FuelEuProjectionChart } from './FuelEuProjectionChart';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

function entityTypeChip(entityType: GroupEntityType) {
  switch (entityType) {
    case 'OWNER_OPERATOR':
      return { label: 'Owner-operator', className: 'chip chip-info', title: 'This group owns and operates its vessels.' };
    case 'THIRD_PARTY_MANAGER':
      return {
        label: 'Third-party manager',
        className: 'chip',
        title: 'This entity manages vessels on behalf of owners — the compliance/commercial decision may sit with the owner, not the manager.',
      };
    case 'CRUISE':
      return { label: 'Cruise', className: 'chip chip-pos', title: 'Cruise operator.' };
    default:
      return { label: 'Unclassified', className: 'chip', title: 'Entity type not classified.' };
  }
}

function fuelCostBearerChip(g: FuelEuShippingGroup) {
  const { OWNER_OPERATOR, TIME_CHARTERER, MIXED } = g.fuelCostBearerMix;
  const total = OWNER_OPERATOR + TIME_CHARTERER + MIXED;
  if (total === 0) return { label: '—', title: 'No member data' };
  if (TIME_CHARTERER === total) {
    return { label: 'Typically charterer-paid', title: 'Time-charter segments: the vessel owner typically does not bear marine fuel cost — the time charterer does.' };
  }
  if (OWNER_OPERATOR === total) {
    return { label: 'Owner-paid', title: 'Owner-operator segments: the vessel owner typically bears marine fuel cost directly.' };
  }
  return { label: 'Mixed', title: `Mixed fuel-cost-bearer mix across members: ${OWNER_OPERATOR} owner-paid, ${TIME_CHARTERER} charterer-paid, ${MIXED} mixed.` };
}

export function GroupDirectoryTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const groups = useMemo(() => [...FUEL_EU_SHIPPING_GROUPS].sort((a, b) => b.sumOfCompanyPenalties2026 - a.sumOfCompanyPenalties2026), []);

  const membersByGroup = useMemo(() => {
    const m = new Map<string, typeof FUEL_EU_SHIPPING_COUNTERPARTIES>();
    for (const c of FUEL_EU_SHIPPING_COUNTERPARTIES) {
      const list = m.get(c.group_id) || [];
      list.push(c);
      m.set(c.group_id, list);
    }
    return m;
  }, []);

  const parentNameById = useMemo(() => {
    const m = new Map<string, string>();
    groups.forEach(g => m.set(g.id, g.name));
    return m;
  }, [groups]);

  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <table className="table" style={{ width: '100%', margin: 0 }}>
        <thead>
          <tr>
            <th style={{ width: '28px', padding: '8px 6px' }} />
            <th style={{ minWidth: '200px', textAlign: 'left', padding: '8px 12px' }}>GROUP</th>
            <th style={{ width: '150px', textAlign: 'center', padding: '8px 8px' }}>ENTITY TYPE</th>
            <th style={{ width: '110px', textAlign: 'left', padding: '8px 8px' }}>PARENT</th>
            <th style={{ width: '80px', textAlign: 'right', padding: '8px 8px' }}>MEMBERS</th>
            <th style={{ width: '80px', textAlign: 'right', padding: '8px 8px' }}>VESSELS</th>
            <th style={{ width: '110px', textAlign: 'right', padding: '8px 8px' }}>IN-SCOPE CO2</th>
            <th style={{ width: '120px', textAlign: 'right', padding: '8px 8px' }}>NET 2026 BALANCE</th>
            <th style={{ width: '110px', textAlign: 'right', padding: '8px 8px' }}>Σ PENALTIES</th>
            <th style={{ width: '80px', textAlign: 'right', padding: '8px 8px' }}>LNG SHIPS</th>
            <th style={{ width: '160px', textAlign: 'center', padding: '8px 8px' }}>FUEL COST BEARER</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(g => {
            const isExpanded = expandedId === g.id;
            const entity = entityTypeChip(g.entityType);
            const bearer = fuelCostBearerChip(g);
            const isSurplus = g.sumOfCompanyBalances2026 >= 0;
            const members = membersByGroup.get(g.id) || [];

            return (
              <React.Fragment key={g.id}>
                <tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(g.id)}>
                  <td style={{ textAlign: 'center', padding: '6px' }}>
                    {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </td>
                  <td style={{ padding: '6px 12px', fontWeight: 600, fontSize: '12.5px' }}>{g.name}</td>
                  <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                    <span className={entity.className} style={{ fontSize: '9.5px', padding: '2px 6px' }} title={entity.title}>{entity.label}</span>
                  </td>
                  <td style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--color-muted)' }}>
                    {g.parentGroupId ? (parentNameById.get(g.parentGroupId) || g.parentGroupId) : '—'}
                  </td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px' }}>{g.memberCompanyCount}</td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px' }}>{g.vessels.toLocaleString()}</td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px' }}>{Math.round(g.inScopeCo2Tco2e).toLocaleString()}</td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px', fontWeight: 700, color: isSurplus ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                    {isSurplus ? '+' : ''}{Math.round(g.sumOfCompanyBalances2026).toLocaleString()}
                  </td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px', color: 'var(--color-status-neg-text)' }}>
                    €{(g.sumOfCompanyPenalties2026 / 1e6).toFixed(2)}M
                  </td>
                  <td className="num font-mono" style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11.5px' }}>{g.lngShipCount}</td>
                  <td style={{ textAlign: 'center', padding: '6px 8px' }}>
                    <span className="chip" style={{ fontSize: '9.5px', padding: '2px 6px' }} title={bearer.title}>{bearer.label}</span>
                  </td>
                </tr>

                {isExpanded && (
                  <tr>
                    <td colSpan={11} style={{ padding: 0, backgroundColor: 'var(--color-panel-header)', borderTop: 0 }}>
                      <GroupExpansionPanel group={g} members={members} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GroupExpansionPanel({ group, members }: { group: FuelEuShippingGroup; members: typeof FUEL_EU_SHIPPING_COUNTERPARTIES }) {
  const groupPoints = useMemo(
    () =>
      projectStaticFleetForCounterparties(
        members.map(m => ({ vlsfoTonnes: m.vlsfo_tonnes, mgoTonnes: m.mgo_tonnes, lngTonnes: m.lng_tonnes }))
      ),
    [members]
  );

  return (
    <div style={{ padding: '14px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
      {/* Member DoC holders */}
      <div>
        <div className="eyebrow" style={{ fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}>
          MEMBER DOC HOLDERS ({members.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
          {members.map(m => (
            <div key={m.company_imo} style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: '3px', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.parent_name}</span>
              {m.fleetCapability === 'DUAL_FUEL_LNG' && <Flame size={11} style={{ color: '#059669', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Sourced contacts */}
      <div>
        <div className="eyebrow" style={{ fontSize: '10px', fontWeight: 700, marginBottom: '6px' }}>
          SOURCED CONTACTS ({group.contacts.length})
        </div>
        {group.contacts.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontStyle: 'italic' }}>No verified contact on file</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
            {group.contacts.map((c, i) => (
              <div key={i} style={{ fontSize: '11px', padding: '6px 8px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{c.name || c.kind}</span>
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    <ExternalLink size={10} /> source
                  </a>
                </div>
                {c.role && <div style={{ color: 'var(--color-muted)', fontSize: '10px' }}>{c.role}</div>}
                {c.email && <div style={{ fontSize: '10.5px' }}>{c.email}</div>}
                {c.phone && <div style={{ fontSize: '10.5px' }}>{c.phone}</div>}
                <div style={{ fontSize: '9.5px', color: 'var(--color-muted)', marginTop: '2px' }}>checked {c.checkedAt}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Projection chart */}
      <div>
        <FuelEuProjectionChart groupPoints={groupPoints} title={`${group.name} — Static-Fleet Projection`} width={340} height={190} />
      </div>
    </div>
  );
}
