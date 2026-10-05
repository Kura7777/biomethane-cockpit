// scripts/verify-14-spot-checks.mjs
// Empirical Verification & Adversarial Stress Harness for the 14 Mandatory Statutory Spot Checks
// Audited Route Matrix Freeze: 2026-10-04

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

async function run() {
  console.log('================================================================');
  console.log('  14 MANDATORY STATUTORY SPOT CHECKS EMPIRICAL TEST HARNESS     ');
  console.log('================================================================\n');

  const { GO_ROUTES, POS_ROUTES, POS_SCHEMES, ROUTE_AUDIT_ACCESSED } = await import(
    '../../src/domain/routes/routeMatrix.generated.ts'
  );
  const { COUNTRIES, REGISTRIES, POS_ORIGIN } = await import('./rules.mjs');

  const passed = [];
  const failed = [];

  function test(id, description, assertionFn) {
    try {
      assertionFn();
      passed.push({ id, description });
      console.log(`[PASS] Check ${id}: ${description}`);
    } catch (err) {
      failed.push({ id, description, error: err.message });
      console.error(`[FAIL] Check ${id}: ${description}`);
      console.error(`       Error: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // CHECK 1: DK > DE: GO = POSSIBLE (PUBLISHED) via ERGAR
  // -------------------------------------------------------------
  test(1, 'DK > DE: GO = POSSIBLE (PUBLISHED) via ERGAR', () => {
    const route = GO_ROUTES['DK_DE'];
    if (!route) throw new Error('GO_ROUTES["DK_DE"] does not exist');
    if (route.status !== 'POSSIBLE') throw new Error(`Expected status POSSIBLE, got ${route.status}`);
    if (route.grade !== 'PUBLISHED') throw new Error(`Expected grade PUBLISHED, got ${route.grade}`);
    if (route.via !== 'ERGAR') throw new Error(`Expected via ERGAR, got ${route.via}`);
    if (!route.reason.toLowerCase().includes('energinet') && !route.reason.toLowerCase().includes('dena')) {
      throw new Error(`Reason does not cite Energinet/dena: ${route.reason}`);
    }
    if (!Array.isArray(route.sources) || route.sources.length === 0) {
      throw new Error('Sources array is empty');
    }
  });

  // -------------------------------------------------------------
  // CHECK 2: DK > AT: GO = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(2, 'DK > AT: GO = NOT_POSSIBLE', () => {
    const route = GO_ROUTES['DK_AT'];
    if (!route) throw new Error('GO_ROUTES["DK_AT"] does not exist');
    if (route.status !== 'NOT_POSSIBLE') throw new Error(`Expected status NOT_POSSIBLE, got ${route.status}`);
    // Energinet: ex-domain is only allowed where the destination registry is not an ERGaR member; AT is one.
    if (route.workaround) {
      throw new Error(`Expected NO ex-domain workaround (destination registry is an ERGaR participant), got: ${route.workaround}`);
    }
  });

  // -------------------------------------------------------------
  // CHECK 3: DK > GB: GO = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(3, 'DK > GB: GO = NOT_POSSIBLE', () => {
    const route = GO_ROUTES['DK_GB'];
    if (!route) throw new Error('GO_ROUTES["DK_GB"] does not exist');
    if (route.status !== 'NOT_POSSIBLE') throw new Error(`Expected status NOT_POSSIBLE, got ${route.status}`);
    // Energinet: ex-domain is only allowed where the destination registry is not an ERGaR member; GB is one.
    if (route.workaround) {
      throw new Error(`Expected NO ex-domain workaround (destination registry is an ERGaR participant), got: ${route.workaround}`);
    }
  });

  // -------------------------------------------------------------
  // CHECK 4: DE > DK: GO = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(4, 'DE > DK: GO = NOT_POSSIBLE', () => {
    const route = GO_ROUTES['DE_DK'];
    if (!route) throw new Error('GO_ROUTES["DE_DK"] does not exist');
    if (route.status !== 'NOT_POSSIBLE') throw new Error(`Expected status NOT_POSSIBLE, got ${route.status}`);
    if (!route.reason.toLowerCase().includes('not allowed') && !route.reason.toLowerCase().includes('prohibit')) {
      throw new Error(`Expected reason to indicate prohibited/not allowed imports: ${route.reason}`);
    }
  });

  // -------------------------------------------------------------
  // CHECK 5: NL > DE: GO = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(5, 'NL > DE: GO = NOT_POSSIBLE', () => {
    const route = GO_ROUTES['NL_DE'];
    if (!route) throw new Error('GO_ROUTES["NL_DE"] does not exist');
    if (route.status !== 'NOT_POSSIBLE') throw new Error(`Expected status NOT_POSSIBLE, got ${route.status}`);
    if (!route.reason.toLowerCase().includes('verticer') && !route.reason.toLowerCase().includes('ergar')) {
      throw new Error(`Expected reason citing VertiCer/ERGaR exit: ${route.reason}`);
    }
  });

  // -------------------------------------------------------------
  // CHECK 6: DK > CZ: GO = NOT_POSSIBLE (ex-domain workaround), PoS = POSSIBLE (CZ_TRANSPORT)
  // -------------------------------------------------------------
  test(6, 'DK > CZ: GO = NOT_POSSIBLE (ex-domain workaround), PoS = POSSIBLE (CZ_TRANSPORT)', () => {
    const goRoute = GO_ROUTES['DK_CZ'];
    if (!goRoute) throw new Error('GO_ROUTES["DK_CZ"] does not exist');
    if (goRoute.status !== 'NOT_POSSIBLE') throw new Error(`Expected GO status NOT_POSSIBLE, got ${goRoute.status}`);
    if (!goRoute.workaround || !goRoute.workaround.toLowerCase().includes('ex-domain')) {
      throw new Error(`Expected GO workaround to mention ex-domain, got: ${goRoute.workaround}`);
    }

    const posRoute = POS_ROUTES['DK_CZ'];
    if (!posRoute) throw new Error('POS_ROUTES["DK_CZ"] does not exist');
    if (posRoute.summary.status !== 'POSSIBLE') {
      throw new Error(`Expected PoS summary status POSSIBLE, got ${posRoute.summary.status}`);
    }
    const czTransport = posRoute.schemes.find(s => s.schemeId === 'CZ_TRANSPORT');
    if (!czTransport) throw new Error('CZ_TRANSPORT scheme not found in DK > CZ PoS schemes');
    if (czTransport.status !== 'POSSIBLE') {
      throw new Error(`Expected CZ_TRANSPORT status POSSIBLE, got ${czTransport.status}`);
    }
  });

  // -------------------------------------------------------------
  // CHECK 7: SE <-> AIB members: GO = POSSIBLE (all 13 connected EECS gas members in both directions, plus SE > CH)
  // -------------------------------------------------------------
  test(7, 'SE <-> AIB members: GO = POSSIBLE (13 members both directions); SE > CH = OPEN', () => {
    const aibConnected = Object.entries(REGISTRIES)
      .filter(([iso, r]) => r.aib === 'CONNECTED')
      .map(([iso]) => iso);

    // 13 bidirectional members (excluding SE and CH)
    const thirteenMembers = aibConnected.filter(iso => iso !== 'SE' && iso !== 'CH');
    if (thirteenMembers.length !== 13) {
      throw new Error(`Expected exactly 13 EECS gas members besides SE & CH, found ${thirteenMembers.length}: ${thirteenMembers.join(',')}`);
    }

    for (const iso of thirteenMembers) {
      const seToM = GO_ROUTES[`SE_${iso}`];
      if (!seToM || seToM.status !== 'POSSIBLE' || seToM.via !== 'AIB') {
        throw new Error(`SE -> ${iso} failed: status=${seToM?.status}, via=${seToM?.via}`);
      }
      const mToSe = GO_ROUTES[`${iso}_SE`];
      if (!mToSe || mToSe.status !== 'POSSIBLE' || mToSe.via !== 'AIB') {
        throw new Error(`${iso} -> SE failed: status=${mToSe?.status}, via=${mToSe?.via}`);
      }
    }

    // SE > CH is OPEN (via AIB): Pronovo's import list omits SE and no transfer is observed (same as LT > CH, HU > CH)
    const seToCh = GO_ROUTES['SE_CH'];
    if (!seToCh || seToCh.status !== 'AWAITING_REGISTRY' || seToCh.via !== 'AIB') {
      throw new Error(`SE -> CH expected AWAITING_REGISTRY (audit OPEN) via AIB: status=${seToCh?.status}, via=${seToCh?.via}`);
    }

    // Complementary check: CH -> SE is NOT_POSSIBLE (CH is import-only)
    const chToSe = GO_ROUTES['CH_SE'];
    if (!chToSe || chToSe.status !== 'NOT_POSSIBLE') {
      throw new Error(`CH -> SE expected NOT_POSSIBLE (import-only), got ${chToSe?.status}`);
    }
  });

  // -------------------------------------------------------------
  // CHECK 8: any EU origin > DE (THG): PoS = POSSIBLE
  // -------------------------------------------------------------
  test(8, 'any EU origin > DE (THG): PoS = POSSIBLE (OPEN where the origin export right is open); IE = OPEN', () => {
    const euOrigins = COUNTRIES.filter(c => POS_ORIGIN[c]?.inEuMassBalanceSystem && c !== 'DE');
    if (euOrigins.length !== 23) {
      throw new Error(`Expected 23 other EU countries, found ${euOrigins.length}`);
    }

    for (const orig of euOrigins) {
      // Origins whose PoS export right is open (BE BG GR HR LU RO SI) are capped at OPEN
      const expected = POS_ORIGIN[orig].exportStatus === 'OPEN' ? 'OPEN' : 'POSSIBLE';
      const posRoute = POS_ROUTES[`${orig}_DE`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_DE"] missing`);
      if (posRoute.summary.status !== expected) {
        throw new Error(`${orig} -> DE PoS summary status is ${posRoute.summary.status}, expected ${expected}`);
      }
      const deThg = posRoute.schemes.find(s => s.schemeId === 'DE_THG');
      if (!deThg || deThg.status !== expected) {
        throw new Error(`${orig} -> DE scheme DE_THG status is ${deThg?.status}, expected ${expected}`);
      }
    }
    // Ireland: German statute covers the EU excise territory, but the Commission reading conflicts: OPEN
    if (POS_ROUTES['IE_DE'].summary.status !== 'OPEN') throw new Error('IE -> DE PoS must be OPEN');
  });

  // -------------------------------------------------------------
  // CHECK 9: any origin > NL (ERE): PoS = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(9, 'any origin > NL (ERE): PoS = NOT_POSSIBLE', () => {
    const foreignOrigins = COUNTRIES.filter(c => c !== 'NL');
    if (foreignOrigins.length !== 27) {
      throw new Error(`Expected 27 foreign origins, found ${foreignOrigins.length}`);
    }

    for (const orig of foreignOrigins) {
      const posRoute = POS_ROUTES[`${orig}_NL`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_NL"] missing`);
      const nlEre = posRoute.schemes.find(s => s.schemeId === 'NL_ERE');
      if (!nlEre) throw new Error(`Scheme NL_ERE not found in ${orig} -> NL`);
      if (nlEre.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> NL scheme NL_ERE status is ${nlEre.status}, expected NOT_POSSIBLE`);
      }
      if (posRoute.summary.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> NL summary status is ${posRoute.summary.status}, expected NOT_POSSIBLE`);
      }
    }
  });

  // -------------------------------------------------------------
  // CHECK 10: any foreign origin > IT (CIC): PoS = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(10, 'any foreign origin > IT (CIC): PoS = NOT_POSSIBLE', () => {
    const foreignOrigins = COUNTRIES.filter(c => c !== 'IT');
    if (foreignOrigins.length !== 27) {
      throw new Error(`Expected 27 foreign origins, found ${foreignOrigins.length}`);
    }

    for (const orig of foreignOrigins) {
      const posRoute = POS_ROUTES[`${orig}_IT`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_IT"] missing`);
      const itCic = posRoute.schemes.find(s => s.schemeId === 'IT_CIC');
      if (!itCic) throw new Error(`Scheme IT_CIC not found in ${orig} -> IT`);
      if (itCic.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> IT scheme IT_CIC status is ${itCic.status}, expected NOT_POSSIBLE`);
      }
      if (posRoute.summary.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> IT summary status is ${posRoute.summary.status}, expected NOT_POSSIBLE`);
      }
    }
  });

  // -------------------------------------------------------------
  // CHECK 11: any foreign origin > FR (TIRUERT): PoS = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(11, 'any foreign origin > FR (TIRUERT): PoS = NOT_POSSIBLE', () => {
    const foreignOrigins = COUNTRIES.filter(c => c !== 'FR');
    if (foreignOrigins.length !== 27) {
      throw new Error(`Expected 27 foreign origins, found ${foreignOrigins.length}`);
    }

    for (const orig of foreignOrigins) {
      const posRoute = POS_ROUTES[`${orig}_FR`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_FR"] missing`);
      const frTiruert = posRoute.schemes.find(s => s.schemeId === 'FR_TIRUERT');
      if (!frTiruert) throw new Error(`Scheme FR_TIRUERT not found in ${orig} -> FR`);
      if (frTiruert.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> FR scheme FR_TIRUERT status is ${frTiruert.status}, expected NOT_POSSIBLE`);
      }
      if (posRoute.summary.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> FR summary status is ${posRoute.summary.status}, expected NOT_POSSIBLE`);
      }
    }
  });

  // -------------------------------------------------------------
  // CHECK 12: EU > GB (RTFO): PoS = POSSIBLE
  // -------------------------------------------------------------
  test(12, 'EU > GB (RTFO): PoS = POSSIBLE (OPEN where the origin export right is open)', () => {
    const euOrigins = COUNTRIES.filter(c => POS_ORIGIN[c]?.inEuMassBalanceSystem);
    if (euOrigins.length !== 24) {
      throw new Error(`Expected 24 EU origins, found ${euOrigins.length}`);
    }

    for (const orig of euOrigins) {
      const expected = POS_ORIGIN[orig].exportStatus === 'OPEN' ? 'OPEN' : 'POSSIBLE';
      const posRoute = POS_ROUTES[`${orig}_GB`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_GB"] missing`);
      const gbRtfo = posRoute.schemes.find(s => s.schemeId === 'GB_RTFO');
      if (!gbRtfo) throw new Error(`Scheme GB_RTFO not found in ${orig} -> GB`);
      if (gbRtfo.status !== expected) {
        throw new Error(`${orig} -> GB scheme GB_RTFO status is ${gbRtfo.status}, expected ${expected}`);
      }
      if (posRoute.summary.status !== expected) {
        throw new Error(`${orig} -> GB summary status is ${posRoute.summary.status}, expected ${expected}`);
      }
      if (!gbRtfo.conditions || !gbRtfo.conditions.toLowerCase().includes('pipeline')) {
        throw new Error(`${orig} -> GB condition does not mention pipeline: ${gbRtfo.conditions}`);
      }
    }
  });

  // -------------------------------------------------------------
  // CHECK 13: any foreign origin > CH (tax relief): PoS = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(13, 'any foreign origin > CH (tax relief): PoS = NOT_POSSIBLE', () => {
    const foreignOrigins = COUNTRIES.filter(c => c !== 'CH');
    if (foreignOrigins.length !== 27) {
      throw new Error(`Expected 27 foreign origins, found ${foreignOrigins.length}`);
    }

    for (const orig of foreignOrigins) {
      const posRoute = POS_ROUTES[`${orig}_CH`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_CH"] missing`);
      const chTax = posRoute.schemes.find(s => s.schemeId === 'CH_TAX_RELIEF');
      if (!chTax) throw new Error(`Scheme CH_TAX_RELIEF not found in ${orig} -> CH`);
      if (chTax.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> CH scheme CH_TAX_RELIEF status is ${chTax.status}, expected NOT_POSSIBLE`);
      }
      if (posRoute.summary.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> CH summary status is ${posRoute.summary.status}, expected NOT_POSSIBLE`);
      }
    }
  });

  // -------------------------------------------------------------
  // CHECK 14: any foreign origin > NO: PoS = NOT_POSSIBLE
  // -------------------------------------------------------------
  test(14, 'any foreign origin > NO: PoS = NOT_POSSIBLE', () => {
    const foreignOrigins = COUNTRIES.filter(c => c !== 'NO');
    if (foreignOrigins.length !== 27) {
      throw new Error(`Expected 27 foreign origins, found ${foreignOrigins.length}`);
    }

    for (const orig of foreignOrigins) {
      const posRoute = POS_ROUTES[`${orig}_NO`];
      if (!posRoute) throw new Error(`POS_ROUTES["${orig}_NO"] missing`);
      if (posRoute.schemes.length === 0) {
        throw new Error(`No schemes found in ${orig} -> NO`);
      }
      for (const s of posRoute.schemes) {
        if (s.status !== 'NOT_POSSIBLE') {
          throw new Error(`${orig} -> NO scheme ${s.schemeId} status is ${s.status}, expected NOT_POSSIBLE`);
        }
      }
      if (posRoute.summary.status !== 'NOT_POSSIBLE') {
        throw new Error(`${orig} -> NO summary status is ${posRoute.summary.status}, expected NOT_POSSIBLE`);
      }
    }
  });

  // -------------------------------------------------------------
  // ADVERSARIAL STRESS SUITE: Structural Invariants & Edge Cases
  // -------------------------------------------------------------
  console.log('\n--- ADVERSARIAL STRESS SUITE: Structural Invariants & Edge Cases ---');

  test('S1', 'Corridor count: exactly 756 GO and 756 PoS corridors', () => {
    const goCount = Object.keys(GO_ROUTES).length;
    const posCount = Object.keys(POS_ROUTES).length;
    if (goCount !== 756) throw new Error(`GO_ROUTES has ${goCount} corridors, expected 756`);
    if (posCount !== 756) throw new Error(`POS_ROUTES has ${posCount} corridors, expected 756`);
  });

  test('S2', 'Self-loops: zero origin === destination pairs in matrix', () => {
    for (const key of Object.keys(GO_ROUTES)) {
      const [orig, dest] = key.split('_');
      if (orig === dest) throw new Error(`Found self-loop in GO_ROUTES: ${key}`);
    }
    for (const key of Object.keys(POS_ROUTES)) {
      const [orig, dest] = key.split('_');
      if (orig === dest) throw new Error(`Found self-loop in POS_ROUTES: ${key}`);
    }
  });

  test('S3', 'Audit freeze timestamp is strictly 2026-10-04', () => {
    if (ROUTE_AUDIT_ACCESSED !== '2026-10-04') {
      throw new Error(`Expected 2026-10-04, got ${ROUTE_AUDIT_ACCESSED}`);
    }
  });

  test('S4', 'Asymmetry Stress: DK > DE (POSSIBLE) vs DE > DK (NOT_POSSIBLE)', () => {
    if (GO_ROUTES['DK_DE'].status !== 'POSSIBLE') throw new Error('DK > DE should be POSSIBLE');
    if (GO_ROUTES['DE_DK'].status !== 'NOT_POSSIBLE') throw new Error('DE > DK should be NOT_POSSIBLE');
  });

  test('S5', 'Asymmetry Stress: SE > CH (OPEN) vs CH > SE (NOT_POSSIBLE)', () => {
    if (GO_ROUTES['SE_CH'].status !== 'AWAITING_REGISTRY') throw new Error('SE > CH should be AWAITING_REGISTRY (audit OPEN)');
    if (GO_ROUTES['CH_SE'].status !== 'NOT_POSSIBLE') throw new Error('CH > SE should be NOT_POSSIBLE');
  });

  test('S6', 'Ex-Domain Workaround Coverage: Present for DK > ES and DK > CZ', () => {
    if (!GO_ROUTES['DK_ES'].workaround?.toLowerCase().includes('ex-domain')) {
      throw new Error(`DK > ES missing ex-domain workaround: ${GO_ROUTES['DK_ES'].workaround}`);
    }
    if (!GO_ROUTES['DK_CZ'].workaround?.toLowerCase().includes('ex-domain')) {
      throw new Error(`DK > CZ missing ex-domain workaround: ${GO_ROUTES['DK_CZ'].workaround}`);
    }
  });

  test('S7', 'All citations in GO_ROUTES and POS_ROUTES are valid URLs', () => {
    let invalidUrls = 0;
    for (const [key, route] of Object.entries(GO_ROUTES)) {
      for (const s of route.sources || []) {
        if (!s.url || (!s.url.startsWith('https://') && !s.url.startsWith('http://'))) {
          invalidUrls++;
        }
      }
    }
    for (const [key, route] of Object.entries(POS_ROUTES)) {
      for (const sc of route.schemes || []) {
        for (const s of sc.sources || []) {
          if (!s.url || (!s.url.startsWith('https://') && !s.url.startsWith('http://'))) {
            invalidUrls++;
          }
        }
      }
    }
    if (invalidUrls > 0) throw new Error(`Found ${invalidUrls} invalid citation URLs`);
  });

  // -------------------------------------------------------------
  // SUMMARY & VERDICT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL CHECKS: ${passed.length + failed.length}`);
  console.log(`PASSED: ${passed.length}`);
  console.log(`FAILED: ${failed.length}`);
  console.log('================================================================\n');

  if (failed.length > 0) {
    console.error('VERDICT: REJECT - The following checks failed:');
    for (const f of failed) {
      console.error(`- Check ${f.id} (${f.description}): ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE - All 14 mandatory statutory spot checks and 7 stress tests PASSED completely!');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
