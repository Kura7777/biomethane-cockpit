import type { TermStatus } from '../../domain/help/termStatus';
import './term.css';

/** "In force" / "Not yet law" / "Under review" pill for a regulatory glossary term. */
export function TermStatusBadge({ status }: { status: TermStatus }) {
  return (
    <span className={`term-status term-status--${status.tone}`} title={`Checked ${status.checked}`} data-testid="term-status">
      {status.label}
    </span>
  );
}
