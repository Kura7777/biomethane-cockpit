import { useState, useEffect, useMemo } from 'react';
import { SetURLSearchParams } from 'react-router-dom';
import { CertificationScheme, ChainOfCustody, UDBStatus, PoSStatus } from '../../../domain/consignment/types';
import { feedstockDefaultCi, getAssumption } from '../../../domain/assumptions/registry';
import { BIOMETHANE_PLANTS } from '../../../domain/plants/registry';
import { parseDealParams } from '../../../domain/trade/dealParams';
import { ParsedPoSCertificate } from '../../../domain/consignment/posParser';
import { showToast } from '../../../app/DeskToastContainer';
import { getDefaultMarketForOrigin, newDealId } from '../options';
import { useDealSchedule } from './useDealSchedule';

export function useDealInputs(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  selectedMarketIdFromStore: string | null
) {
  const deal = useMemo(() => parseDealParams(searchParams), [searchParams]);
  const linkedPlant = useMemo(() => (deal.plantId ? BIOMETHANE_PLANTS.find(p => p.id === deal.plantId) : null), [deal.plantId]);

  // Each deal gets its own blotter id: a reopened deal keeps the one it was saved under, a new deal
  // gets a fresh one, so two deals on the same route never overwrite each other in the blotter.
  const [dealId, setDealId] = useState<string>(() => deal.dealId || newDealId());

  // A new link arriving while the builder is open is a different deal: give it its own id. Step and
  // view-mode changes rewrite the URL too, so they are left out of the comparison.
  const dealLinkKey = useMemo(() => {
    const p = new URLSearchParams(searchParams);
    p.delete('step');
    p.delete('mode');
    return p.toString();
  }, [searchParams]);

  const [idLinkKey, setIdLinkKey] = useState(dealLinkKey);
  if (idLinkKey !== dealLinkKey) {
    setIdLinkKey(dealLinkKey);
    setDealId(deal.dealId || newDealId());
  }

  const [origin, setOrigin] = useState<string>(deal.originCountry || 'DK');
  const [feedstockKey, setFeedstockKey] = useState<string>(deal.feedstock || 'manure');
  const [scheme, setScheme] = useState<CertificationScheme>((deal.scheme as CertificationScheme) || 'ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>((deal.coc as ChainOfCustody) || 'MASS_BALANCE');
  const [udbStatus, setUdbStatus] = useState<UDBStatus>(deal.udb || 'PENDING');
  const [posStatus, setPosStatus] = useState<PoSStatus>(deal.pos || 'PENDING');
  const [ci, setCi] = useState<number>(
    deal.ci !== null && deal.ci !== undefined ? deal.ci : (feedstockDefaultCi(deal.feedstock || 'manure') ?? feedstockDefaultCi('manure')!)
  );
  // Where the CI on screen came from: the deal link, a feedstock/benchmark estimate, an uploaded PoS, or a manual slider edit.
  // Plant CIs in the census are feedstock defaults, so a plant-linked CI is never shown as verified.
  const [ciSource, setCiSource] = useState<'deal' | 'estimate' | 'pos' | 'manual'>('deal');
  const [marketId, setMarketId] = useState<string>(
    deal.marketId || selectedMarketIdFromStore || getDefaultMarketForOrigin(deal.originCountry)
  );

  const plantTotalMWh = deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh
    ? Math.round((deal.plantAnnualGWh || linkedPlant!.annualEnergyGWh!) * 1000)
    : null;
  const [volumeMwh, setVolumeMwh] = useState<number>(
    deal.volume || (plantTotalMWh || getAssumption('deal.defaultVolumeMwh'))
  );
  const [plantCommittedMwh, setPlantCommittedMwh] = useState<number>(deal.plantCommittedVolume || 0);

  const schedule = useDealSchedule(deal);

  // Load a deal's values when a new link arrives. Keyed on the link without step/mode: moving
  // between steps rewrites the URL, and re-running this then would undo the trader's edits.
  useEffect(() => {
    if (deal.marketId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync URL deal link on dealLinkKey change without overwriting intermediate edits
      setMarketId(deal.marketId);
    } else if (deal.originCountry) {
      // Apply statutory default routing when no explicit market was specified
      setMarketId(getDefaultMarketForOrigin(deal.originCountry));
    }
    if (deal.originCountry) setOrigin(deal.originCountry);
    if (deal.feedstock) setFeedstockKey(deal.feedstock);
    if (deal.ci !== null && deal.ci !== undefined) {
      setCi(deal.ci);
      setCiSource('deal');
    }
    if (deal.volume) {
      setVolumeMwh(deal.volume);
    } else if (deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh) {
      setVolumeMwh(Math.round((deal.plantAnnualGWh || linkedPlant!.annualEnergyGWh!) * 1000));
    }
    if (deal.scheme) setScheme(deal.scheme as CertificationScheme);
    if (deal.coc) setChainOfCustody(deal.coc as ChainOfCustody);
    if (deal.udb) setUdbStatus(deal.udb);
    if (deal.pos) setPosStatus(deal.pos);
    if (deal.plantCommittedVolume !== undefined) setPlantCommittedMwh(deal.plantCommittedVolume);
    if (deal.complianceYear) schedule.setComplianceYear(deal.complianceYear);
    if (deal.productionStartDate) schedule.setProdStartDate(deal.productionStartDate);
    if (deal.productionEndDate) schedule.setProdEndDate(deal.productionEndDate);
    if (deal.deliveryStartDate) schedule.setDeliveryStartDate(deal.deliveryStartDate);
    if (deal.deliveryEndDate) schedule.setDeliveryEndDate(deal.deliveryEndDate);
    if (deal.deliveryProfile) schedule.setDeliveryProfile(deal.deliveryProfile);
  }, [dealLinkKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyPoS = (parsed: ParsedPoSCertificate) => {
    if (parsed.countryCode) setOrigin(parsed.countryCode);
    if (parsed.scheme && parsed.scheme !== 'UNKNOWN') setScheme(parsed.scheme);
    if (parsed.chainOfCustody) setChainOfCustody(parsed.chainOfCustody);
    if (parsed.canonicalFeedstock) setFeedstockKey(parsed.canonicalFeedstock);
    if (parsed.carbonIntensityGCo2Mj !== undefined) {
      setCi(parsed.carbonIntensityGCo2Mj);
      setCiSource('pos');
    }
    if (parsed.volumeMWh) setVolumeMwh(parsed.volumeMWh);
  };

  const handleResetDeal = () => {
    setOrigin('DK');
    setFeedstockKey('manure');
    setScheme('ISCC_EU');
    setChainOfCustody('MASS_BALANCE');
    setUdbStatus('PENDING');
    setPosStatus('PENDING');
    setCi(feedstockDefaultCi('manure')!);
    setCiSource('deal');
    setVolumeMwh(getAssumption('deal.defaultVolumeMwh'));
    setMarketId('DE_THG');
    schedule.resetSchedule();
    setDealId(newDealId());
    setSearchParams(() => {
      const next = new URLSearchParams();
      next.set('step', '1');
      return next;
    });
    showToast('Trade parameters reset to default benchmarks', 'SUCCESS');
  };

  return {
    deal,
    linkedPlant,
    dealId,
    setDealId,
    dealLinkKey,
    origin,
    setOrigin,
    feedstockKey,
    setFeedstockKey,
    scheme,
    setScheme,
    chainOfCustody,
    setChainOfCustody,
    udbStatus,
    setUdbStatus,
    posStatus,
    setPosStatus,
    ci,
    setCi,
    ciSource,
    setCiSource,
    marketId,
    setMarketId,
    volumeMwh,
    setVolumeMwh,
    plantCommittedMwh,
    setPlantCommittedMwh,
    plantTotalMWh,
    schedule,
    handleApplyPoS,
    handleResetDeal,
  };
}
