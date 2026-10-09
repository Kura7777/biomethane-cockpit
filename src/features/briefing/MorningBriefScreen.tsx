import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { loadPlantsAsync } from '../../domain/plants/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import {
  buildBriefMarks, buildBriefOrderBook, buildBriefRoutes, buildConsignmentLadder, buildFueleuSeries,
  greetingFor, ladderHeadline, latestFueleu, summariseFreshness, summariseSupplyByCountry, type CountrySupply,
} from '../../domain/briefing/morningBrief';
import { DEFAULT_USER } from '../../domain/auth/authStore';
import { BriefHero } from './BriefHero';
import { BriefKpis } from './BriefKpis';
import { BriefLadder } from './BriefLadder';
import { BriefMarketBoard } from './BriefMarketBoard';
import { BriefFuelEU } from './BriefFuelEU';
import { BriefOrderBook } from './BriefOrderBook';
import { BriefRoutes } from './BriefRoutes';
import { BriefSupply } from './BriefSupply';
import { BriefWatch } from './BriefWatch';
import './brief.css';

/** The arbitrage scan on the brief uses the desk's default origination feedstock and a 10 GWh lot. */
const ROUTE_FEEDSTOCK = 'manure';
const ROUTE_VOLUME_MWH = 10000;

const SECTIONS: [string, string][] = [
  ['netback', 'Netback ladder'], ['board', 'Market board'], ['fueleu', 'FuelEU'], ['book', 'Broker book'],
  ['routes', 'Routes'], ['supply', 'Supply'], ['watch', 'Regulatory watch'],
];

/**
 * The desk's front page: what the book is worth this morning, how much of that rests on stale or
 * estimated marks, and where to go next. Everything is read live from the desk state, so editing a
 * mark or pasting a broker run on the Pricing desk changes this page at once.
 */
export function MorningBriefScreen() {
  const { state } = useAppState();
  const navigate = useNavigate();
  const [now] = useState(() => new Date());
  const [consignmentId, setConsignmentId] = useState(state.activeConsignmentId ?? state.consignments[0]?.id ?? '');
  const [boardQuery, setBoardQuery] = useState('');
  const [supply, setSupply] = useState<CountrySupply[] | null>(null);

  useEffect(() => {
    let live = true;
    loadPlantsAsync().then(p => { if (live) setSupply(summariseSupplyByCountry(p)); }).catch(() => { if (live) setSupply([]); });
    return () => { live = false; };
  }, []);

  const consignment = state.consignments.find(c => c.id === consignmentId) ?? state.consignments[0];
  const marks = useMemo(() => buildBriefMarks(state.marks), [state.marks]);
  const freshness = useMemo(() => summariseFreshness(marks), [marks]);
  const ladder = useMemo(
    () => (consignment ? buildConsignmentLadder(consignment, state.marks, state.costs) : []),
    [consignment, state.marks, state.costs],
  );
  const headline = useMemo(() => ladderHeadline(ladder), [ladder]);
  const routes = useMemo(() => buildBriefRoutes(state.marks, state.costs, ROUTE_FEEDSTOCK, ROUTE_VOLUME_MWH), [state.marks, state.costs]);
  const fueleu = useMemo(() => buildFueleuSeries(), []);
  const fueleuTraded = useMemo(() => latestFueleu(fueleu, 'TRADE'), [fueleu]);
  const book = useMemo(() => buildBriefOrderBook(state.pricingBook), [state.pricingBook]);
  const tickers = useMemo(() => marks.filter(m => m.category !== 'EMERGING' && m.mid !== null), [marks]);

  const plantCount = supply ? supply.reduce((s, r) => s + r.plants, 0) : null;
  const supplyTWh = supply ? supply.reduce((s, r) => s + r.annualGWh, 0) / 1000 : null;

  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="ds-page-shell bf" data-testid="morning-brief">
      <BriefHero
        greeting={greetingFor(now)}
        firstName={DEFAULT_USER.name.split(' ')[0]}
        today={now}
        tickers={tickers}
        onTick={m => { setBoardQuery(m.shortName); go('board'); }}
      />

      <nav className="bf-nav" aria-label="Brief sections">
        {SECTIONS.map(([id, label]) => <button key={id} type="button" className="bf-chip" onClick={() => go(id)}>{label}</button>)}
        <button type="button" className="bf-chip" onClick={() => navigate('/pricing')}>Update marks →</button>
      </nav>

      <BriefKpis
        headline={headline}
        consignmentName={consignment?.name ?? '—'}
        thg={marks.find(m => m.marketId === 'DE_THG')}
        eua={marks.find(m => m.marketId === 'EU_ETS1')}
        fueleu={fueleuTraded}
        freshness={freshness}
        plantCount={plantCount}
        supplyTWh={supplyTWh}
      />

      <BriefLadder consignments={state.consignments} consignmentId={consignment?.id ?? ''} onConsignment={setConsignmentId} rows={ladder} />

      <BriefMarketBoard marks={marks} query={boardQuery} onQuery={setBoardQuery} />

      <section className="bf-sec" id="fueleu">
        <h2>FuelEU pooling</h2>
        <p className="lede">Surplus prices for the 2026 compliance year. OceanScore OPX is offer-side; BetterSea is executed trades (VWAP, or the month's average where no VWAP was published).</p>
        <div className="bf-card bf-rise">
          <h3>FuelEU surplus price · €/tCO₂e</h3>
          <p className="note">Hover a point for the print and its note.</p>
          <BriefFuelEU points={fueleu} />
        </div>
      </section>

      <BriefOrderBook rows={book} />

      <BriefRoutes routes={routes} feedstockName={FEEDSTOCK_REGISTRY[ROUTE_FEEDSTOCK]?.name ?? ROUTE_FEEDSTOCK} />

      <BriefSupply rows={supply} />

      <BriefWatch />

      <p className="bf-foot">
        Read live from the desk: marks and costs from the Pricing desk, netbacks from the netback engine, routes from the arbitrage scan,
        the order book from your pricing book. {freshness.estimates > 0 && <>{freshness.estimates} marks are estimates or simulated seeds, so treat their rankings as indicative.</>}
      </p>
    </div>
  );
}
