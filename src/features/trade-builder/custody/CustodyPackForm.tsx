import React from 'react';
import { Market } from '../../../domain/markets/types';
import {
  Claims,
  CustodyPack,
  DealStructure,
  EnergyBasis,
  GoRecord,
  PosRecord,
  SupportType,
} from '../../../domain/consignment/types';
import {
  custodyPartsForMarket,
  defaultDealStructure,
  emptyGoRecord,
  emptyPosRecord,
  missingPosFields,
} from '../../../domain/consignment/custody';
import { GateResult } from '../../../domain/eligibility/types';
import { PRODUCING_ORIGINS } from '../../../domain/arbitrage/origins';
import { summariseChecklist } from './checklistModel';
import './custody.css';

/** Annex VI of the RED: the steps a PoS gives its total CI in. */
const ANNEX_VI_STEPS: Array<{ key: string; label: string }> = [
  { key: 'eec', label: 'eec · cultivation / extraction' },
  { key: 'el', label: 'el · land-use change' },
  { key: 'ep', label: 'ep · processing' },
  { key: 'etd', label: 'etd · transport & distribution' },
  { key: 'eu', label: 'eu · fuel in use' },
  { key: 'esca', label: 'esca · soil carbon accumulation' },
  { key: 'eccs', label: 'eccs · CO₂ capture & storage' },
  { key: 'eccr', label: 'eccr · CO₂ capture & replacement' },
];

const SCHEME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ISCC_EU', label: 'ISCC EU' },
  { value: 'REDCERT_EU', label: 'REDcert EU' },
  { value: '2BSVS', label: '2BSvs' },
  { value: 'KZR_INIG', label: 'KZR INiG' },
  { value: 'ISCC_PLUS', label: 'ISCC PLUS (voluntary)' },
];

const SUPPORT_OPTIONS: Array<{ value: SupportType; label: string }> = [
  { value: 'UNKNOWN', label: 'Not confirmed' },
  { value: 'NONE', label: 'No support' },
  { value: 'INVESTMENT', label: 'Investment aid only' },
  { value: 'OPERATING', label: 'Operating aid' },
];

const BASIS_OPTIONS: Array<{ value: EnergyBasis; label: string }> = [
  { value: 'UNKNOWN', label: 'Not confirmed' },
  { value: 'HHV', label: 'HHV (gross / PCS)' },
  { value: 'LHV', label: 'LHV (net)' },
];

const tri = (v: boolean | null): string => (v === null ? '' : v ? 'yes' : 'no');
const fromTri = (v: string): boolean | null => (v === '' ? null : v === 'yes');
const numOrNull = (v: string): number | null => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v));

interface CustodyPackFormProps {
  market: Market;
  origin: string;
  custody: CustodyPack | null;
  onChange: (patch: (c: CustodyPack) => CustodyPack) => void;
  onOpenPoS: () => void;
  /** The chain-of-custody gate, for the one-line status under the heading. */
  gate?: GateResult;
  /** Opens the checklist (the gate audit step in the stepper). */
  onViewChecklist?: () => void;
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  span2?: boolean;
  children: React.ReactNode;
}

function Field({ id, label, hint, span2, children }: FieldProps) {
  return (
    <div className={`cp-field${span2 ? ' cp-field--span2' : ''}`}>
      <label htmlFor={id} className="cp-label">{label}</label>
      {children}
      {hint && <span className="cp-hint">{hint}</span>}
    </div>
  );
}

/**
 * The chain-of-custody pack: the GO and PoS records, the claims, the deal structure and the planned
 * booking date. Which parts show depends on the market: NL GGE asks for both documents for the same
 * MWh, a GO market only the GO, a PoS market only the PoS.
 */
export function CustodyPackForm({ market, origin, custody, onChange, onOpenPoS, gate, onViewChecklist }: CustodyPackFormProps) {
  const parts = custodyPartsForMarket(market);
  const go = custody?.go ?? null;
  const pos = custody?.pos ?? null;
  const claims: Claims = custody?.claims ?? { notUsedElsewhere: null, prtrGrant: 'UNKNOWN', prtrLegalCheckDone: false, ownTraderCertified: null, counterpartyCertified: null };
  const structure: DealStructure = custody?.structure ?? defaultDealStructure();
  const summary = gate?.checklist ? summariseChecklist(gate) : null;
  const registryHint = PRODUCING_ORIGINS[origin]?.primaryRegistry;

  const patchGo = (p: Partial<GoRecord>) => onChange(c => ({ ...c, go: { ...(c.go ?? emptyGoRecord(origin)), ...p } }));
  const patchPos = (p: Partial<PosRecord>) => onChange(c => ({ ...c, pos: { ...(c.pos ?? emptyPosRecord()), ...p } }));
  const patchClaims = (p: Partial<Claims>) => onChange(c => ({ ...c, claims: { ...c.claims, ...p } }));
  const patchStep = (key: string, value: number | null) => onChange(c => {
    const base = c.pos ?? emptyPosRecord();
    const steps = { ...(base.ciSteps ?? {}) };
    if (value === null) delete steps[key]; else steps[key] = value;
    return { ...c, pos: { ...base, ciSteps: Object.keys(steps).length > 0 ? steps : null } };
  });

  const stepsFilled = Object.keys(pos?.ciSteps ?? {}).length;
  const missing = parts.pos ? missingPosFields(pos) : [];

  return (
    <div className="cp" data-testid="custody-pack">
      {summary && (
        <p className="cp-status" data-testid="custody-status">
          <span className={`cl-verdict cl-verdict--${summary.tone}`}>{summary.label}</span>
          <span>
            {summary.counts.FAIL + summary.counts.WARN + summary.counts.TODO} open item{summary.counts.FAIL + summary.counts.WARN + summary.counts.TODO === 1 ? '' : 's'}
            {summary.lawNote ? ' · law not yet in force' : ''}
          </span>
          {onViewChecklist && <button type="button" className="cp-link" onClick={onViewChecklist}>View checklist →</button>}
        </p>
      )}

      {parts.go && (
        <fieldset className="cp-group">
          <legend>Guarantee of Origin (GO)</legend>
          <div className="cp-grid">
            <Field id="cust-go-registry" label="Registry" hint={registryHint ? `Origin registry: ${registryHint}` : undefined}>
              <input id="cust-go-registry" className="input" value={go?.registry ?? ''} onChange={e => patchGo({ registry: e.target.value })} />
            </Field>
            <Field id="cust-go-series" label="Series / certificate no.">
              <input id="cust-go-series" className="input" value={go?.seriesNumber ?? ''} onChange={e => patchGo({ seriesNumber: e.target.value })} />
            </Field>
            <Field id="cust-go-issue-date" label="Issue date">
              <input id="cust-go-issue-date" type="date" className="input" value={go?.issueDate ?? ''} onChange={e => patchGo({ issueDate: e.target.value })} />
            </Field>
            <Field id="cust-go-mwh" label="Energy (MWh)" hint="As shown on the GO, on its own energy basis">
              <input id="cust-go-mwh" type="number" min="0" step="any" className="input" value={go?.energyMWh ?? ''} onChange={e => patchGo({ energyMWh: numOrNull(e.target.value) })} />
            </Field>
            <Field id="cust-go-prod-start" label="Production period from">
              <input id="cust-go-prod-start" type="date" className="input" value={go?.productionStart ?? ''} onChange={e => patchGo({ productionStart: e.target.value })} />
            </Field>
            <Field id="cust-go-prod-end" label="Production period to">
              <input id="cust-go-prod-end" type="date" className="input" value={go?.productionEnd ?? ''} onChange={e => patchGo({ productionEnd: e.target.value })} />
            </Field>
            <Field id="cust-go-basis" label="Energy basis">
              <select id="cust-go-basis" className="input" value={go?.energyBasis ?? 'UNKNOWN'} onChange={e => patchGo({ energyBasis: e.target.value as EnergyBasis })}>
                {BASIS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field id="cust-go-support" label="Support type on the GO">
              <select id="cust-go-support" className="input" value={go?.supportType ?? 'UNKNOWN'} onChange={e => patchGo({ supportType: e.target.value as SupportType })}>
                {SUPPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field id="cust-go-grid" label="Injected into the grid">
              <select id="cust-go-grid" className="input" value={tri(go?.gridInjected ?? null)} onChange={e => patchGo({ gridInjected: fromTri(e.target.value) })}>
                <option value="">Not confirmed</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </Field>
          </div>
        </fieldset>
      )}

      {parts.pos && (
        <fieldset className="cp-group">
          <legend>Proof of Sustainability (PoS)</legend>
          <p className="cp-hint cp-upload">
            <button type="button" className="cp-link" onClick={onOpenPoS} data-testid="custody-pos-upload">Fill from a PoS text or file</button>
            {' '}or enter the fields below.
            {missing.length > 0 && pos && (
              <span data-testid="custody-pos-missing"> Enter manually: {missing.join(', ')}.</span>
            )}
          </p>
          <div className="cp-grid">
            <Field id="cust-pos-number" label="PoS number">
              <input id="cust-pos-number" className="input" value={pos?.posNumber ?? ''} onChange={e => patchPos({ posNumber: e.target.value || null })} />
            </Field>
            <Field id="cust-pos-udb" label="UDB number" hint="If the PoS is recorded in the Union Database">
              <input id="cust-pos-udb" className="input" value={pos?.udbNumber ?? ''} onChange={e => patchPos({ udbNumber: e.target.value || null })} />
            </Field>
            <Field id="cust-pos-scheme" label="Scheme">
              <select id="cust-pos-scheme" className="input" value={pos?.scheme ?? ''} onChange={e => patchPos({ scheme: e.target.value || null })}>
                <option value="">Not confirmed</option>
                {SCHEME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field id="cust-pos-feedstock" label="Feedstock">
              <input id="cust-pos-feedstock" className="input" value={pos?.feedstock ?? ''} onChange={e => patchPos({ feedstock: e.target.value || null })} />
            </Field>
            <Field id="cust-pos-origin" label="Feedstock origin country" hint="ISO code, e.g. ES">
              <input id="cust-pos-origin" className="input" maxLength={2} value={pos?.feedstockOriginCountry ?? ''} onChange={e => patchPos({ feedstockOriginCountry: e.target.value.toUpperCase() || null })} />
            </Field>
            <Field id="cust-pos-ci" label="CI total (gCO₂e/MJ)">
              <input id="cust-pos-ci" type="number" step="any" className="input" value={pos?.ciTotal ?? ''} onChange={e => patchPos({ ciTotal: numOrNull(e.target.value) })} />
            </Field>
            <Field id="cust-pos-mwh" label="Energy (MWh)" hint="As shown on the PoS">
              <input id="cust-pos-mwh" type="number" min="0" step="any" className="input" value={pos?.mwh ?? ''} onChange={e => patchPos({ mwh: numOrNull(e.target.value) })} />
            </Field>
            <Field id="cust-pos-support" label="Support declared on the PoS">
              <select id="cust-pos-support" className="input" value={pos?.supportDeclared ?? 'UNKNOWN'} onChange={e => patchPos({ supportDeclared: e.target.value as SupportType })}>
                {SUPPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <details className="cp-steps">
            <summary>Per-step CI (Annex VI){stepsFilled > 0 ? ` · ${stepsFilled} entered` : ''}</summary>
            <div className="cp-grid">
              {ANNEX_VI_STEPS.map(s => (
                <Field key={s.key} id={`cust-pos-step-${s.key}`} label={s.label}>
                  <input
                    id={`cust-pos-step-${s.key}`}
                    type="number"
                    step="any"
                    className="input"
                    value={pos?.ciSteps?.[s.key] ?? ''}
                    onChange={e => patchStep(s.key, numOrNull(e.target.value))}
                  />
                </Field>
              ))}
            </div>
          </details>
        </fieldset>
      )}

      <fieldset className="cp-group">
        <legend>Claims</legend>
        <div className="cp-grid">
          <Field id="cust-claim-unused" label="Not used or claimed elsewhere" hint="Spanish transport / quota, NL ERE, DE THG, ETS1">
            <select id="cust-claim-unused" className="input" value={tri(claims.notUsedElsewhere)} onChange={e => patchClaims({ notUsedElsewhere: fromTri(e.target.value) })}>
              <option value="">Not confirmed</option>
              <option value="yes">Confirmed by seller</option>
              <option value="no">Already used elsewhere</option>
            </select>
          </Field>
          {origin === 'ES' && (
            <>
              <Field id="cust-claim-prtr" label="Spanish PRTR grant">
                <select id="cust-claim-prtr" className="input" value={claims.prtrGrant} onChange={e => patchClaims({ prtrGrant: e.target.value as Claims['prtrGrant'] })}>
                  <option value="UNKNOWN">Not confirmed</option>
                  <option value="NONE">No grant</option>
                  <option value="YES">Plant has a PRTR grant</option>
                </select>
              </Field>
              {(claims.prtrGrant === 'YES' || claims.prtrOtherProgramme) && (
                <Field id="cust-claim-prtr-legal" label="Grant terms checked" hint={claims.prtrGrant !== 'YES' ? 'PRTR-funded grant under another programme: check its terms.' : undefined}>
                  <select id="cust-claim-prtr-legal" className="input" value={claims.prtrLegalCheckDone ? 'yes' : 'no'} onChange={e => patchClaims({ prtrLegalCheckDone: e.target.value === 'yes' })}>
                    <option value="no">Legal check not done</option>
                    <option value="yes">Legal check done: sale permitted</option>
                  </select>
                </Field>
              )}
            </>
          )}
          <Field id="cust-claim-own" label="Our entity certified">
            <select id="cust-claim-own" className="input" value={tri(claims.ownTraderCertified)} onChange={e => patchClaims({ ownTraderCertified: fromTri(e.target.value) })}>
              <option value="">Not confirmed</option>
              <option value="yes">Certified economic operator</option>
              <option value="no">Not certified</option>
            </select>
          </Field>
          <Field id="cust-claim-cpty" label="Counterparty certified">
            <select id="cust-claim-cpty" className="input" value={tri(claims.counterpartyCertified)} onChange={e => patchClaims({ counterpartyCertified: fromTri(e.target.value) })}>
              <option value="">Not confirmed</option>
              <option value="yes">Certified economic operator</option>
              <option value="no">Not certified</option>
            </select>
          </Field>
        </div>
      </fieldset>

      {parts.paired && (
        <fieldset className="cp-group">
          <legend>Deal structure</legend>
          <div id="cust-structure" className="tb-chips" role="group" aria-label="Deal structure">
            <button
              type="button"
              className={`chip ${structure === 'BUNDLE_AT_ORIGIN' ? 'chip-a' : ''}`}
              onClick={() => onChange(c => ({ ...c, structure: 'BUNDLE_AT_ORIGIN' }))}
            >
              A · Bundle at origin (PVB)
            </button>
            <button
              type="button"
              className={`chip ${structure === 'BUNDLE_DELIVERED_TTF' ? 'chip-a' : ''}`}
              onClick={() => onChange(c => ({ ...c, structure: 'BUNDLE_DELIVERED_TTF' }))}
            >
              B · Delivered TTF
            </button>
          </div>
          <span className="cp-hint">
            {structure === 'BUNDLE_AT_ORIGIN'
              ? 'Gas, GO and PoS change hands at the origin hub; the buyer needs access there. No hub spread.'
              : 'Gas, GO and PoS delivered at TTF; the origin-hub to TTF spread is a cost on the ticket.'}
            {' '}Default and spread are set on <a href="#/pricing">Pricing desk</a>.
          </span>
          <div className="cp-grid">
            <Field id="cust-booking" label="Planned NEa booking date" hint="Checked against GO expiry and the 1 May booking window">
              <input
                id="cust-booking"
                type="date"
                className="input"
                value={custody?.plannedBookingDate ?? ''}
                onChange={e => onChange(c => ({ ...c, plannedBookingDate: e.target.value || null }))}
              />
            </Field>
          </div>
        </fieldset>
      )}
    </div>
  );
}
