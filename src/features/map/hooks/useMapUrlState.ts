import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RouteFilter,
  COUNTRIES,
  resolveCorridorParams
} from '../mapConstants';

export function useMapUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParams = useMemo(() => resolveCorridorParams(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [origin, setOrigin] = useState<string>(initialParams.origin);
  const [target, setTarget] = useState<string>(initialParams.target);
  const [filter, setFilter] = useState<RouteFilter>(initialParams.filter);

  // Keep URL query params synchronized with corridor selection. Carries the `plant` param
  // (Plants "Where can this gas go?" hand-off) forward unchanged — it's consumed elsewhere by
  // reading searchParams directly, not by this effect, so rewriting with only origin/target/filter
  // would silently drop it on the very first render.
  useEffect(() => {
    const originIso = COUNTRIES[origin]?.iso || 'DK';
    const targetIso = COUNTRIES[target]?.iso || 'DE';
    const urlOrigin = searchParams.get('origin')?.toUpperCase();
    const urlTarget = searchParams.get('target')?.toUpperCase();
    const urlFilter = searchParams.get('filter')?.toUpperCase();

    if (urlOrigin !== originIso || urlTarget !== targetIso || urlFilter !== filter) {
      const plantParam = searchParams.get('plant');
      setSearchParams(
        plantParam
          ? { origin: originIso, target: targetIso, filter, plant: plantParam }
          : { origin: originIso, target: targetIso, filter },
        { replace: true }
      );
    }
  }, [origin, target, filter, searchParams, setSearchParams]);

  // Synchronize state when deep link or URL changes externally
  useEffect(() => {
    const resolved = resolveCorridorParams(searchParams);
    if (resolved.origin !== origin) setOrigin(resolved.origin);
    if (resolved.target !== target) setTarget(resolved.target);
    if (resolved.filter !== filter) setFilter(resolved.filter);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    origin,
    setOrigin,
    target,
    setTarget,
    filter,
    setFilter,
    searchParams,
  };
}
