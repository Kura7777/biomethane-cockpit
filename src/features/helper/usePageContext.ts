import { useEffect, useRef } from 'react';
import { notifyPageContextChanged, registerPageContext, type PageContextProvider } from '../../domain/help/pageContext';

/**
 * Give the page helper a live view of this screen. `provider` is read only when the helper needs it,
 * so it can close over the latest state without re-registering; it should return a small plain object.
 * The helper is told (debounced) after every render that the data may have changed.
 */
export function usePageContext(route: string, provider: PageContextProvider, id = 'main'): void {
  const latest = useRef(provider);

  // Keep the newest closure for the stable provider below; the helper only reads it after render.
  useEffect(() => {
    latest.current = provider;
  });

  useEffect(() => {
    return registerPageContext(route, () => latest.current(), id);
  }, [route, id]);

  // No dependency list on purpose: every render may have changed what the provider returns.
  useEffect(() => {
    notifyPageContextChanged();
  });
}
