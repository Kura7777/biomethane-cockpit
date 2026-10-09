import { CustodyClauses } from '../../../domain/trade/custodyClauses';

interface CustodyClausesBlockProps {
  clauses: CustodyClauses;
  /** The confirmation prints every clause; the term sheet prints a short list of the points to agree. */
  detail: 'full' | 'summary';
}

const h4 = { margin: '0 0 8px', fontSize: '13px', fontWeight: 800 } as const;
const box = {
  padding: '12px 16px',
  backgroundColor: 'var(--color-subtier)',
  border: '1px solid var(--color-divider)',
  fontSize: '12px',
  lineHeight: 1.6,
} as const;

/** The chain-of-custody undertakings for a GO + PoS (NL GGE) or PoS-only (DE THG) deal, as they read in the draft documents. */
export function CustodyClausesBlock({ clauses, detail }: CustodyClausesBlockProps) {
  if (detail === 'summary') {
    return (
      <div style={box} data-testid="custody-clauses-summary">
        <div>Seller undertakes (points to agree):</div>
        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
          {clauses.warranties.map(w => <li key={w.ref}>{w.text}</li>)}
          {clauses.indemnity && <li>{clauses.indemnity}</li>}
          <li>{clauses.retention}</li>
        </ul>
        {clauses.timing && <div style={{ marginTop: '6px' }}><strong>Timing: </strong>{clauses.timing}</div>}
      </div>
    );
  }
  return (
    <div data-testid="custody-clauses">
      <h4 style={h4}>{clauses.heading}</h4>
      <div style={{ ...box, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <strong>Seller warranties</strong>
          <ol style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
            {clauses.warranties.map(w => <li key={w.ref}>{w.text}</li>)}
          </ol>
        </div>
        {clauses.indemnity && <div><strong>Indemnity. </strong>{clauses.indemnity}</div>}
        <div><strong>Retention. </strong>{clauses.retention}</div>
        <div>
          <strong>Deliverables</strong>
          <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
            {clauses.deliverables.map(d => <li key={d}>{d}</li>)}
          </ul>
        </div>
        {clauses.timing && <div><strong>Timing. </strong>{clauses.timing}</div>}
        {clauses.riskDisclosure.length > 0 && (
          <div>
            <strong>Risk disclosure</strong>
            <ul style={{ margin: '4px 0 0', paddingLeft: '20px' }}>
              {clauses.riskDisclosure.map(r => <li key={r}>{r}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
