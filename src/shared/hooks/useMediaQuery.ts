import { useCallback, useSyncExternalStore } from 'react';

/** Tailwind's `max-md:` breakpoint (below 768px), used throughout the mobile shell. */
export const MOBILE_QUERY = '(max-width: 767.98px)';

/** Tablet-and-below relaxations (below 1024px). */
export const TABLET_QUERY = '(max-width: 1023.98px)';

/** Touch-only devices, independent of viewport width. */
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

/**
 * Subscribes to a media query via matchMedia, re-rendering when it flips.
 * Safe to call during SSR / non-DOM environments (returns false and never subscribes).
 */
export function useMediaQuery(query: string): boolean {
  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => false, []);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => {};
      }
      const mql = window.matchMedia(query);
      // Safari < 14 only supports addListener/removeListener; modern browsers support
      // addEventListener. Both are wired for safety.
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onStoreChange);
        return () => mql.removeEventListener('change', onStoreChange);
      }
      mql.addListener(onStoreChange);
      return () => mql.removeListener(onStoreChange);
    },
    [query]
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True below 768px — the mobile shell breakpoint used across the app. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/** True on touch-primary devices (phones/tablets), regardless of viewport width. */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery(COARSE_POINTER_QUERY);
}
