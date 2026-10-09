import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COUNTRIES,
  CountryMeta,
  MapView,
  RouteFilter,
  AcceptForeignStatus,
  SellCategory,
  classifyRoute,
  getBestAcceptsForeign,
  POSSIBLE_STATUSES
} from '../mapConstants';
import { getTradePlaybook, getPlaybookDealUrl } from '../tradePlaybook';
import { COMBINED_BIOMETHANE_PLANTS } from '../../../domain/plants/registry';
import { calculateLogisticsRoute, calculateDijkstraCorridor } from '../../../domain/logistics/engine';
import { useAssumptionsVersion } from '../../../shared/hooks/useAssumptionsVersion';
import { getMarketAndCocForRoute } from '../../../domain/trade/dealDefaults';
import { getCertificateRoute, getCertificateRoutesFrom, CertificateRoute } from '../../../domain/registries/certificateRoutes';

interface UseMapSelectionProps {
  origin: string;
  setOrigin: (origin: string) => void;
  target: string;
  setTarget: (target: string) => void;
  filter: RouteFilter;
  searchParams: URLSearchParams;
  isMobile: boolean;
  setPanelOpen: (open: boolean) => void;
}

export function useMapSelection({
  origin,
  setOrigin,
  target,
  setTarget,
  filter,
  searchParams,
  isMobile,
  setPanelOpen,
}: UseMapSelectionProps) {
  const navigate = useNavigate();
  const [selectedCountryName, setSelectedCountryName] = useState<string>(target);
  const [mode, setMode] = useState<'ORIGIN' | 'TARGET'>('TARGET');
  const [view, setView] = useState<MapView>('SELL');

  const originMeta: CountryMeta = COUNTRIES[origin] || COUNTRIES['Denmark'];
  const targetMeta: CountryMeta = COUNTRIES[target] || COUNTRIES['Germany'];
  const selectedMeta: CountryMeta = COUNTRIES[selectedCountryName] || COUNTRIES['Germany'];

  const countryAcceptsForeign = useMemo(() => {
    const map: Record<string, { status: AcceptForeignStatus; schemeName?: string }> = {};
    Object.values(COUNTRIES).forEach(c => {
      map[c.iso] = getBestAcceptsForeign(c.iso);
    });
    return map;
  }, []);

  const complianceCounts = useMemo(() => {
    const counts: Record<AcceptForeignStatus, number> = { YES: 0, GO_REQUIRED: 0, OPEN: 0, NO: 0, NO_SCHEME: 0 };
    Object.values(COUNTRIES).forEach(c => {
      const best = countryAcceptsForeign[c.iso];
      if (best) counts[best.status]++;
    });
    return counts;
  }, [countryAcceptsForeign]);

  const allIsos = useMemo(() => Object.values(COUNTRIES).map(c => c.iso), []);
  const nameByIso = useMemo(() => {
    const m: Record<string, string> = {};
    Object.values(COUNTRIES).forEach(c => { m[c.iso] = c.name; });
    return m;
  }, []);

  const certRoutes = useMemo(() => getCertificateRoutesFrom(originMeta.iso, allIsos), [originMeta.iso, allIsos]);
  const routeByIso = useMemo(() => {
    const m: Record<string, CertificateRoute> = {};
    certRoutes.forEach(r => { m[r.target] = r; });
    return m;
  }, [certRoutes]);

  const categoryCounts = useMemo(() => {
    const counts: Record<SellCategory, number> = { SELL_NOW: 0, CHECK_FIRST: 0, CLOSED: 0, NO_DATA: 0 };
    certRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      counts[cat]++;
    });
    return counts;
  }, [certRoutes, filter]);

  const topRoutes = useMemo(() => {
    const sellNow = certRoutes.filter(r => classifyRoute(r, filter) === 'SELL_NOW');
    const sorted = [...sellNow].sort((a, b) => {
      const aBoth = POSSIBLE_STATUSES.includes(a.status) && a.pos?.status === 'POSSIBLE';
      const bBoth = POSSIBLE_STATUSES.includes(b.status) && b.pos?.status === 'POSSIBLE';
      if (aBoth && !bBoth) return -1;
      if (!aBoth && bBoth) return 1;
      const aName = nameByIso[a.target] || a.target;
      const bName = nameByIso[b.target] || b.target;
      return aName.localeCompare(bName);
    });
    return sorted.slice(0, 3).map(r => {
      const name = nameByIso[r.target] || r.target;
      const goOk = POSSIBLE_STATUSES.includes(r.status);
      const posOk = r.pos?.status === 'POSSIBLE';
      let badge = 'GO';
      if (goOk && posOk) badge = 'GO + PoS';
      else if (posOk) badge = 'PoS';
      return { iso: r.target, name, badge };
    });
  }, [certRoutes, filter, nameByIso]);

  const tradeableBreakdown = useMemo(() => {
    let both = 0;
    let certOnly = 0;
    let posOnly = 0;
    certRoutes.forEach(r => {
      const cat = classifyRoute(r, filter);
      if (cat === 'SELL_NOW') {
        const goPossible = POSSIBLE_STATUSES.includes(r.status);
        const posPossible = r.pos?.status === 'POSSIBLE';
        if (goPossible && posPossible) both++;
        else if (goPossible) certOnly++;
        else if (posPossible) posOnly++;
      }
    });
    return { both, certOnly, posOnly };
  }, [certRoutes, filter]);

  const currentRoute = useMemo(() => getCertificateRoute(originMeta.iso, targetMeta.iso), [originMeta.iso, targetMeta.iso]);

  const currentPlaybook = useMemo(() => {
    return getTradePlaybook(originMeta.iso, targetMeta.iso, currentRoute);
  }, [originMeta.iso, targetMeta.iso, currentRoute]);

  const assumptionsVersion = useAssumptionsVersion();

  const corridorCalculation = useMemo(() => {
    return calculateLogisticsRoute(originMeta.iso, targetMeta.iso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originMeta.iso, targetMeta.iso, assumptionsVersion]);

  const dijkstraPath = useMemo(() => {
    return calculateDijkstraCorridor(originMeta.iso, targetMeta.iso);
  }, [originMeta.iso, targetMeta.iso]);

  const handleCountryClick = (cName: string) => {
    const cMeta = COUNTRIES[cName];
    if (!cMeta) return;

    setSelectedCountryName(cName);
    if (view === 'SELL') {
      if (cName === origin) {
        return;
      }
      setTarget(cName);
      if (isMobile) {
        setPanelOpen(true);
      }
      return;
    }
    if (mode === 'ORIGIN') {
      if (cName !== target) setOrigin(cName);
    } else {
      if (cName !== origin) setTarget(cName);
    }
    if (isMobile) {
      setPanelOpen(true);
    }
  };

  const setOriginFromMenu = (cName: string) => {
    if (cName === target) setTarget(origin);
    setOrigin(cName);
    setSelectedCountryName(cName);
  };

  const setTargetFromMenu = (cName: string) => {
    if (cName === origin) setOrigin(target);
    setTarget(cName);
    setSelectedCountryName(cName);
  };

  const handleSwapCorridor = () => {
    const prevOrigin = origin;
    const prevTarget = target;
    setOrigin(prevTarget);
    setTarget(prevOrigin);
    setSelectedCountryName(prevTarget);
  };

  const currentTradeTarget = useMemo(() => getMarketAndCocForRoute(currentRoute, filter), [currentRoute, filter]);

  const linkedPlantId = searchParams.get('plant');
  const linkedPlant = useMemo(() => {
    if (!linkedPlantId) return null;
    return COMBINED_BIOMETHANE_PLANTS.find(p => p.id === linkedPlantId) ?? null;
  }, [linkedPlantId]);
  const activeLinkedPlant = linkedPlant && linkedPlant.countryCode === originMeta.iso ? linkedPlant : null;

  const handleSimulateTrade = () => {
    if (!currentTradeTarget) return;
    const dealUrl = getPlaybookDealUrl(originMeta.iso, targetMeta.iso, currentRoute, filter, activeLinkedPlant);
    if (dealUrl) {
      navigate(dealUrl);
    }
  };

  return {
    selectedCountryName,
    setSelectedCountryName,
    mode,
    setMode,
    view,
    setView,
    originMeta,
    targetMeta,
    selectedMeta,
    countryAcceptsForeign,
    complianceCounts,
    allIsos,
    nameByIso,
    certRoutes,
    routeByIso,
    categoryCounts,
    topRoutes,
    tradeableBreakdown,
    currentRoute,
    currentPlaybook,
    corridorCalculation,
    dijkstraPath,
    currentTradeTarget,
    activeLinkedPlant,
    handleCountryClick,
    setOriginFromMenu,
    setTargetFromMenu,
    handleSwapCorridor,
    handleSimulateTrade,
  };
}
