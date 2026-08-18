import { SourcingSearchResult } from '../arbitrage/types';
import { MarksState } from '../netback/types';
import { MARKETS } from '../markets/registry';

/**
 * Formats a SourcingSearchResult into a clean, human-readable plain text note.
 * Zero styling required, perfectly formatted for email or trade ticket attachment.
 */
export function generateSourcingNoteText(
  result: SourcingSearchResult,
  marks: MarksState
): string {
  const req = result.request;
  const lines: string[] = [];

  // Header
  lines.push('BIOMETHANE SOURCING NOTE');
  lines.push(`Generated: ${result.generatedAt}   Counterparty: ${req.counterparty || '—'}`);
  lines.push('');

  // Request Summary
  const volumeText = req.volumeMwh !== null
    ? `${req.volumeMwh.toLocaleString('en-GB')} MWh`
    : 'Volume unstated';

  const marketName = req.targetMarketId === 'ANY'
    ? 'Pan-European (ANY)'
    : (MARKETS.find(m => m.id === req.targetMarketId)?.name || req.targetMarketId);

  const deliveryPeriodText = req.delivery?.type
    ? `${req.delivery.type}${req.delivery.complianceYear ? ` (Compliance Year ${req.delivery.complianceYear})` : ''}`
    : (req.delivery?.complianceYear ? `Compliance Year ${req.delivery.complianceYear}` : 'Spot / prompt delivery');

  lines.push('REQUEST');
  lines.push(`  ${volumeText} · ${marketName} · ${deliveryPeriodText}`);

  const constraintParts: string[] = [];
  if (req.constraints.maxCarbonIntensity !== null) {
    constraintParts.push(`max CI ${req.constraints.maxCarbonIntensity} gCO₂e/MJ`);
  }
  if (req.constraints.maxDeliveredCostEurMwh !== null) {
    constraintParts.push(`max cost €${req.constraints.maxDeliveredCostEurMwh}/MWh`);
  }
  if (req.scheme !== 'ANY') {
    constraintParts.push(`${req.scheme.replace('_', ' ')} required`);
  }
  if (req.constraints.physicalDeliveryRequired) {
    constraintParts.push('physical delivery (segregation) required');
  } else if (req.chainOfCustody) {
    constraintParts.push(req.chainOfCustody.replace('_', ' ').toLowerCase());
  }

  if (constraintParts.length > 0) {
    lines.push(`  Constraints: ${constraintParts.join(' · ')}`);
  }
  if (req.notes) {
    lines.push(`  Notes: ${req.notes}`);
  }
  lines.push('');

  // Tradeable Routes
  if (result.tradeable.length === 0) {
    lines.push('NO TRADEABLE ROUTES FOUND MATCHING CONSTRAINTS');
    lines.push('');
  } else {
    result.tradeable.forEach((route, index) => {
      lines.push(`ROUTE ${index + 1} — ${route.originCountryName} → ${route.targetMarketName}`);
      
      const schemeText = route.certificationScheme.replace('_', ' ');
      const cocText = route.chainOfCustody.replace('_', ' ').toLowerCase();
      lines.push(`  ${route.feedstockName} · CI ${route.carbonIntensity} gCO₂e/MJ · ${schemeText} · ${cocText}`);
      
      const netbackStr = route.totalTerminalValueStackEurPerMWh !== null
        ? `€${route.totalTerminalValueStackEurPerMWh.toFixed(2)}/MWh`
        : 'Unpriced';
      const marginStr = route.deskNetMarginEurPerMWh !== null
        ? `€${route.deskNetMarginEurPerMWh.toFixed(2)}/MWh`
        : 'Unset';
      
      lines.push(`  Netback     ${netbackStr.padEnd(17)}Desk margin   ${marginStr}`);

      const notionalStr = route.totalTerminalValueStackEurPerMWh !== null && req.volumeMwh !== null
        ? `€${Math.round(route.totalTerminalValueStackEurPerMWh * req.volumeMwh).toLocaleString('en-GB')}`
        : '—';
      const pnlStr = route.totalDealProfitEur !== null
        ? `€${Math.round(route.totalDealProfitEur).toLocaleString('en-GB')}`
        : 'Unset';

      lines.push(`  Notional    ${notionalStr.padEnd(17)}Desk P&L      ${pnlStr}`);

      const passedGates = route.eligibility.gates.filter(g => g.verdict === 'PASS').length;
      lines.push(`  Regulatory: ${passedGates} of ${route.eligibility.gates.length} gates clear`);
      
      route.eligibility.gates.forEach(g => {
        const cite = g.citations?.[0]?.shortName || g.gateLabel;
        lines.push(`    · ${g.gateLabel} — ${cite} [${g.verdict}]`);
      });

      if (route.toConfirm && route.toConfirm.length > 0) {
        lines.push('  TO CONFIRM');
        route.toConfirm.forEach(item => {
          lines.push(`    · ${item}`);
        });
      }

      lines.push('');
    });
  }

  // Blocked Routes
  if (result.blocked.length > 0) {
    lines.push(`BLOCKED (${result.blocked.length})`);
    result.blocked.slice(0, 10).forEach(route => {
      const blockingGate = route.eligibility.gates.find(g => g.verdict === 'HARD_BLOCK');
      const gateTitle = blockingGate?.gateLabel || route.eligibility.blockingGate || 'Regulatory Gate';
      const earnedStr = route.totalTerminalValueStackEurPerMWh !== null
        ? `would have earned €${route.totalTerminalValueStackEurPerMWh.toFixed(2)}/MWh`
        : 'unpriced';

      lines.push(`  ${route.originCountryName} → ${route.targetMarketName} · ${gateTitle} · ${earnedStr}`);
      const remedy = blockingGate?.remedy || route.eligibility.summary;
      lines.push(`    Remedy: ${remedy}`);
    });
    if (result.blocked.length > 10) {
      lines.push(`    ... and ${result.blocked.length - 10} more blocked routes`);
    }
    lines.push('');
  }

  // Provenance Summary
  const provenanceCounts: Record<string, number> = {};
  const checkedMarkets = new Set<string>();

  result.tradeable.forEach(r => checkedMarkets.add(r.targetMarketId));
  result.blocked.forEach(r => checkedMarkets.add(r.targetMarketId));

  checkedMarkets.forEach(mId => {
    const entry = marks.marks[mId];
    const srcType = entry?.provenance?.sourceType || (entry?.source === 'SIMULATED' ? 'SIMULATED' : 'ESTIMATE');
    provenanceCounts[srcType] = (provenanceCounts[srcType] || 0) + 1;
  });

  const provSummary = Object.entries(provenanceCounts)
    .map(([type, count]) => `${count} ${type}`)
    .join(' · ');

  if (provSummary) {
    lines.push(`Mark provenance: ${provSummary}`);
  }
  lines.push('Decision support only. Verify against primary sources before contracting.');

  return lines.join('\n');
}
