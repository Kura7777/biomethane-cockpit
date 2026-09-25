import { useSyncExternalStore } from 'react';
import { getAssumptionsVersion, subscribeAssumptions } from '../../domain/assumptions/registry';

/** Re-renders on any commercial-assumption change; returns a version number for memo dependencies. */
export function useAssumptionsVersion(): number {
  return useSyncExternalStore(subscribeAssumptions, getAssumptionsVersion, getAssumptionsVersion);
}
