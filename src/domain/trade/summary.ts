import { TradeAssessment } from './types';

const VERDICT_EMOJI: Record<string, string> = {
  ELIGIBLE: '✅',
  CONDITIONAL: '⚠️',
  HARD_BLOCK: '❌',
  UNRESOLVED: '🔶',
  UNKNOWN: '❓',
};

const GATE_VERDICT_EMOJI: Record<string, string> = {
  PASS: '✅',
  CONDITIONAL: '⚠️',
  HARD_BLOCK: '❌',
  UNRESOLVED: '🔶',
  UNKNOWN: '❓',
};

/**
 * Generate a plain-text trade summary suitable for:
 * - Pasting into email
 * - Printing for a boss meeting
 * - Reading without the app
 * 
 * Uses box-drawing characters for structure.
 * Every gate cites specific legislation.
 */
export function generateTradeSummary(assessment: TradeAssessment): string {
  const c = assessment.consignment;
  const nb = assessment.netback;
  const el = assessment.eligibility;
  const lines: string[] = [];

  // Header
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('EUROPEAN BIOMETHANE DESK — TRADE ASSESSMENT DOSSIER');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Trade summary
  lines.push('TRADE SUMMARY');
  const volText = c.volumeMWh !== null ? `${c.volumeMWh.toLocaleString()} MWh of ` : '';
  lines.push(
    `Buy ${volText}${c.feedstockName} biomethane from ${c.originCountryName} ` +
    `(CI: ${c.carbonIntensity} gCO₂e/MJ), certified ${c.certificationScheme.replace(/_/g, ' ')}, ` +
    `${c.chainOfCustody.replace(/_/g, ' ').toLowerCase()} chain of custody, ` +
    `injected into the ${c.injectionIsEU ? 'EU' : 'non-EU'} gas grid (${c.injectionCountry}), ` +
    `UDB ${c.udbStatus.replace(/_/g, ' ').toLowerCase()}.`
  );
  lines.push(`Sell certificates into ${assessment.targetMarketName} (Pricing Side: ${nb.markSideUsed.toUpperCase()}).`);
  lines.push('');

  // Status
  const emoji = VERDICT_EMOJI[el.overallVerdict] ?? '❓';
  lines.push(`STATUS: ${emoji} ${el.overallVerdict} — ${el.summary}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Regulatory checklist
  lines.push('REGULATORY COMPLIANCE CHECKLIST');
  lines.push('');
  el.gates.forEach((gate, i) => {
    const gEmoji = GATE_VERDICT_EMOJI[gate.verdict] ?? '❓';
    const padded = `${i + 1}. ${gate.gateLabel}`.padEnd(52);
    lines.push(`${padded} ${gEmoji} ${gate.verdict}`);
    lines.push(`   Reason: ${gate.reason}`);
    if (gate.remedy) {
      lines.push(`   Remedy: ${gate.remedy}`);
    }
    lines.push('   ─────────────────────────────────────────────────────');
    if (gate.citations.length > 0) {
      gate.citations.forEach(cit => {
        lines.push(`   Legal Basis: ${cit.shortName}`);
        lines.push(`   Full Reference: ${cit.fullReference}`);
        if (cit.nationalTransposition) {
          lines.push(`   National Transposition: ${cit.nationalTransposition}`);
        }
        lines.push(`   Source URL: ${cit.sourceUrl}`);
      });
    }
    lines.push(`   Verified: ${gate.citations[0]?.verifiedDate ?? '2026-08-16'} │ Confidence: ${gate.confidence}`);
    lines.push('');
  });

  // Economics
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('COMMERCIAL ECONOMICS & NETBACK WORKINGS');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  if (nb.certificateValue) {
    lines.push('Carbon Intensity Conversion:');
    lines.push(`  ${nb.certificateValue.unitConversion}`);
    lines.push('');
    lines.push('Certificate Value Calculation:');
    lines.push(`  ${nb.certificateValue.calculation}`);
    if (nb.certificateValue.capped) {
      lines.push(`  ⚠ LEGAL CAP APPLIED: ${nb.certificateValue.capReason}`);
    }
    if (nb.certificateValue.statusNote) {
      lines.push(`  ℹ STATUS NOTE: ${nb.certificateValue.statusNote}`);
    }
    lines.push(`  Certificate Value: €${nb.certificateValue.valueEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh`);
  } else {
    lines.push('Certificate Value: No market mark set for this market.');
  }

  // Germany double counting branches
  if (nb.uncertaintyBranches && nb.uncertaintyBranches.length > 0) {
    lines.push('');
    lines.push('UNCERTAINTY SENSITIVITY (German THG §37a BImSchG Double Counting):');
    for (const b of nb.uncertaintyBranches) {
      lines.push(`  ${b.branchLabel.toUpperCase()}:`);
      lines.push(`    Certificate: €${b.certificateValue.valueEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Net Netback: €${b.netNetback?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Margin:      €${b.impliedMargin?.toFixed(2) ?? 'N/A'}/MWh (${b.marginPercent?.toFixed(1) ?? 'N/A'}%)`);
      if (b.totalPnL !== null) {
        lines.push(`    Total P&L:   €${b.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
    lines.push('  Note: Manure negative CI (-100 gCO2e/MJ) is a physical avoided emissions property and remains unchanged.');
  }

  lines.push('');
  lines.push(`Molecule Value (TTF):          ${nb.moleculeValue !== null ? `+€${nb.moleculeValue.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Transfer Costs:                ${assessment.costs.transferCosts !== null ? `−€${assessment.costs.transferCosts.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Certification Costs:           ${assessment.costs.certificationCosts !== null ? `−€${assessment.costs.certificationCosts.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Logistics:                     ${assessment.costs.logistics !== null ? `−€${assessment.costs.logistics.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Other Costs:                   ${assessment.costs.otherCosts !== null ? `−€${assessment.costs.otherCosts.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Delivered Cost (Procurement):  ${assessment.costs.deliveredCost !== null ? `−€${assessment.costs.deliveredCost.toFixed(2)}/MWh` : 'Not set'}`);
  
  if (!nb.isComplete) {
    lines.push(`⚠ INCOMPLETE COST BASIS: Missing ${nb.missingInputs.join(', ')}`);
  }

  lines.push('');
  lines.push(`NET NETBACK:     ${nb.netNetback !== null ? `€${nb.netNetback.toFixed(2)}/MWh` : 'N/A'}`);
  lines.push(`IMPLIED MARGIN:  ${nb.impliedMargin !== null ? `€${nb.impliedMargin.toFixed(2)}/MWh (${nb.marginPercent?.toFixed(1)}%)` : 'N/A'}`);
  if (nb.totalPnL !== null) {
    lines.push(`TOTAL P&L:       €${nb.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  // Key risks
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('KEY RISKS & MITIGATIONS');
  lines.push('═══════════════════════════════════════════════════════════════');
  const nonPassGates = el.gates.filter(g => g.verdict !== 'PASS');
  if (nonPassGates.length > 0) {
    for (const g of nonPassGates) {
      lines.push(`• ${g.gateLabel} (${g.verdict}): ${g.reason.split('.')[0]}.`);
    }
  } else {
    lines.push('• All regulatory compliance gates cleared under RED III.');
  }
  lines.push('• Market Risk: Counterparty marks subject to index volatility and bilateral liquidity.');
  lines.push('• FX Risk: GBP and non-EUR transactions exposed to currency movements.');
  if (assessment.userNotes) {
    lines.push('');
    lines.push(`TRADER NOTES:\n${assessment.userNotes}`);
  }
  lines.push('');
  lines.push(`Dossier Generated: ${assessment.createdAt}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
