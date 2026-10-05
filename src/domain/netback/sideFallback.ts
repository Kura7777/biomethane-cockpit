import type { PriceSide } from '../markets/types';

/**
 * The warning shown wherever a certificate value is displayed when the side the desk asked for
 * was not quoted and another side was used instead. null when the requested side was used.
 */
export function markSideWarning(requested: PriceSide | null | undefined, used: PriceSide | null | undefined): string | null {
  if (!requested || !used || requested === used) return null;
  const usedText = used === 'mid' ? 'at mid' : used === 'offer' ? 'off the offer' : 'off the bid';
  return `No ${requested} quoted, priced ${usedText}`;
}
