import type { AssessmentStatus, TradeAssessment } from '../domain/trade/types';

/** Statuses that mean the deal has been committed to: deleting one must be typed-confirmed. */
export const COMMITTED_STATUSES: readonly AssessmentStatus[] = ['AGREED', 'TRANSFERRED'];

/** The word a trader types to delete a committed deal. */
export const DELETE_CONFIRM_WORD = 'DELETE';

export function statusOfDeal(a: Pick<TradeAssessment, 'status'>): AssessmentStatus {
  return a.status ?? 'INDICATIVE';
}

export function isCommittedDeal(a: Pick<TradeAssessment, 'status'>): boolean {
  return COMMITTED_STATUSES.includes(statusOfDeal(a));
}

/** TRANSFERRED is final (the certificates have moved): no status may follow it. */
export function canTransition(from: AssessmentStatus, to: AssessmentStatus): boolean {
  if (from === to) return true;
  return from !== 'TRANSFERRED';
}

export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_CONFIRM_WORD;
}
