import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, CircleDashed, MapPin, BookOpen, Scale } from 'lucide-react';
import { CustodyPack } from '../../../domain/consignment/types';
import { CustodyParts } from '../../../domain/consignment/custody';
import { GateChecklistItem, GateChecklistStatus, GateResult } from '../../../domain/eligibility/types';
import { MobileCardList } from '../../../shared/ui/MobileCardList';
import { useIsMobile } from '../../../shared/hooks/useMediaQuery';
import { corridorFilterFor, fieldTargetFor, summariseChecklist } from './checklistModel';
import './custody.css';

interface CocChecklistPanelProps {
  gate: GateResult;
  /** Origin and target country, for the "see corridor on map" link on route rows. */
  origin: string;
  targetCountry: string;
  custody: CustodyPack | null;
  parts: CustodyParts;
  /** Jump to the field that fixes a row. Omitted: rows show no fix link. */
  onFix?: (fieldId: string) => void;
  /** Open the forensic auditor on this gate. */
  onAudit?: () => void;
}

const STATUS_TONE: Record<GateChecklistStatus, 'pos' | 'neg' | 'warn' | 'muted'> = {
  PASS: 'pos', FAIL: 'neg', WARN: 'warn', TODO: 'muted',
};

function StatusIcon({ status }: { status: GateChecklistStatus }) {
  if (status === 'PASS') return <CheckCircle2 size={16} />;
  if (status === 'FAIL') return <XCircle size={16} />;
  if (status === 'WARN') return <AlertTriangle size={16} />;
  return <CircleDashed size={16} />;
}

function StatusChip({ status }: { status: GateChecklistStatus }) {
  return <span className={`cl-chip cl-chip--${STATUS_TONE[status]}`} data-testid={`cl-status-${status.toLowerCase()}`}>{status}</span>;
}

function Citations({ item }: { item: GateChecklistItem }) {
  const cites = item.citations.filter(c => c.shortName);
  if (cites.length === 0) return null;
  return (
    <span className="cl-cites">
      <BookOpen size={12} aria-hidden="true" />
      {cites.map((c, i) => (
        <React.Fragment key={`${c.shortName}-${i}`}>
          {i > 0 && ', '}
          {c.sourceUrl
            ? <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer">{c.shortName}</a>
            : <span>{c.shortName}</span>}
        </React.Fragment>
      ))}
    </span>
  );
}

/**
 * The one chain-of-custody checklist: verdict on top, one row per item (status chip, detail,
 * sources), and every open row links to the field that fixes it. Replaces the separate UDB,
 * cross-border PoS and registry-transfer displays. Rows turn into cards on a phone.
 */
export function CocChecklistPanel({ gate, origin, targetCountry, custody, parts, onFix, onAudit }: CocChecklistPanelProps) {
  const isMobile = useIsMobile();
  const items = gate.checklist ?? [];
  const summary = summariseChecklist(gate);
  const open = summary.counts.FAIL + summary.counts.WARN + summary.counts.TODO;

  const corridorUrl = (id: string) => {
    const filter = corridorFilterFor(id);
    return filter ? `#/map?origin=${encodeURIComponent(origin)}&target=${encodeURIComponent(targetCountry)}&filter=${filter}` : null;
  };

  const rowAction = (item: GateChecklistItem): React.ReactNode => {
    const map = item.status !== 'PASS' ? corridorUrl(item.id) : null;
    const target = item.status !== 'PASS' ? fieldTargetFor(item, custody, parts) : null;
    if (map) {
      return (
        <a href={map} className="cl-fix" data-testid={`cl-map-${item.id}`}>
          <MapPin size={12} aria-hidden="true" /> See corridor on map
        </a>
      );
    }
    if (target && onFix) {
      return (
        <button type="button" className="cl-fix" onClick={() => onFix(target)} data-testid={`cl-fix-${item.id}`}>
          {item.status === 'TODO' ? 'Enter it' : 'Fix it'} →
        </button>
      );
    }
    return null;
  };

  return (
    <section className="cl" aria-label="Chain-of-custody checklist" data-testid="coc-checklist">
      <header className="cl-head">
        <div className="cl-head-main">
          <h4 className="cl-title">Chain-of-custody checklist</h4>
          <span className={`cl-verdict cl-verdict--${summary.tone}`} data-testid="coc-verdict">{summary.label}</span>
        </div>
        <p className="cl-sub">
          {items.length - open} of {items.length} clear{open > 0 ? ` · ${open} open` : ''}
          {summary.lawNote ? <> · <span data-testid="coc-law-note">{summary.lawNote}</span></> : null}
        </p>
        {onAudit && (
          <button type="button" className="btn btn-secondary cl-audit" onClick={onAudit}>
            <Scale size={13} /> Audit this gate
          </button>
        )}
      </header>

      {isMobile ? (
        <MobileCardList
          items={items}
          getKey={i => i.id}
          testId="coc-checklist-cards"
          title={i => i.label}
          badges={i => <StatusChip status={i.status} />}
          fields={i => [
            { label: 'Detail', value: i.detail, span: 2 },
            ...(i.remedy && i.status !== 'PASS' ? [{ label: 'Remedy', value: i.remedy, span: 2 as const }] : []),
            ...(i.citations.some(c => c.shortName) ? [{ label: 'Sources', value: <Citations item={i} />, span: 2 as const }] : []),
            ...(rowAction(i) ? [{ label: 'Fix', value: rowAction(i), span: 2 as const }] : []),
          ]}
        />
      ) : (
        <ol className="cl-rows">
          {items.map(item => (
            <li key={item.id} className={`cl-row cl-row--${STATUS_TONE[item.status]}`} data-testid={`cl-row-${item.id}`}>
              <span className={`cl-icon cl-icon--${STATUS_TONE[item.status]}`}><StatusIcon status={item.status} /></span>
              <span className="cl-main">
                <span className="cl-label">{item.label}</span>
                <span className="cl-detail">{item.detail}</span>
                {item.remedy && item.status !== 'PASS' && <span className="cl-remedy"><strong>Remedy: </strong>{item.remedy}</span>}
                <Citations item={item} />
              </span>
              <span className="cl-side">
                <StatusChip status={item.status} />
                {rowAction(item)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
