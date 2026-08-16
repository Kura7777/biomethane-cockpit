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
  lines.push('TRADE ASSESSMENT');
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
  lines.push(`Sell certificates into ${assessment.targetMarketName}.`);
  lines.push('');

  // Status
  const emoji = VERDICT_EMOJI[el.overallVerdict] ?? '❓';
  lines.push(`STATUS: ${emoji} ${el.overallVerdict} — ${el.summary}`);
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Regulatory checklist
  lines.push('REGULATORY CHECKLIST');
  lines.push('');
  el.gates.forEach((gate, i) => {
    const gEmoji = GATE_VERDICT_EMOJI[gate.verdict] ?? '❓';
    const padded = `${i + 1}. ${gate.gateLabel}`.padEnd(52);
    lines.push(`${padded} ${gEmoji} ${gate.verdict}`);
    lines.push(`   ${gate.reason}`);
    if (gate.remedy) {
      lines.push(`   Remedy: ${gate.remedy}`);
    }
    lines.push('   ─────────────────────────────────────────────────────');
    if (gate.citations.length > 0) {
      gate.citations.forEach(cit => {
        lines.push(`   Legal basis: ${cit.shortName}`);
        lines.push(`   Full ref: ${cit.fullReference}`);
        lines.push(`   Source: ${cit.sourceUrl}`);
      });
    }
    lines.push(`   Verified: ${gate.citations[0]?.verifiedDate ?? 'N/A'} │ Confidence: ${gate.confidence}`);
    lines.push('');
  });

  // Economics
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('ECONOMICS');
  lines.push('');

  if (nb.certificateValue) {
    lines.push('Carbon intensity conversion:');
    lines.push(`  ${nb.certificateValue.unitConversion}`);
    lines.push('');
    lines.push('Certificate value:');
    lines.push(`  ${nb.certificateValue.calculation}`);
    if (nb.certificateValue.capped) {
      lines.push(`  ⚠ CAPPED: ${nb.certificateValue.capReason}`);
    }
    lines.push(`  Result: €${nb.certificateValue.valueEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh`);
  } else {
    lines.push('Certificate value: No mark set for this market');
  }

  // Germany double counting branches
  if (nb.uncertaintyBranches && nb.uncertaintyBranches.length > 0) {
    lines.push('');
    lines.push('UNCERTAINTY BRANCHES (German double counting):');
    for (const b of nb.uncertaintyBranches) {
      lines.push(`  ${b.branchLabel.toUpperCase()}:`);
      lines.push(`    Certificate: €${b.certificateValue.valueEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Net netback: €${b.netNetback?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Margin: €${b.impliedMargin?.toFixed(2) ?? 'N/A'}/MWh (${b.marginPercent?.toFixed(1) ?? 'N/A'}%)`);
      if (b.totalPnL !== null) {
        lines.push(`    Total P&L: €${b.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
  }

  lines.push('');
  lines.push(`Molecule value (TTF):          €${nb.moleculeValue?.toFixed(2) ?? 'Not set'}/MWh`);
  lines.push(`Transfer costs:                −€${assessment.costs.transferCosts?.toFixed(2) ?? 'Not set'}/MWh`);
  lines.push(`Certification costs:           −€${assessment.costs.certificationCosts?.toFixed(2) ?? 'Not set'}/MWh`);
  lines.push(`Logistics:                     −€${assessment.costs.logistics?.toFixed(2) ?? 'Not set'}/MWh`);
  lines.push(`Other costs:                   −€${assessment.costs.otherCosts?.toFixed(2) ?? 'Not set'}/MWh`);
  lines.push(`Delivered cost (procurement):  −€${assessment.costs.deliveredCost?.toFixed(2) ?? 'Not set'}/MWh`);
  lines.push('');
  lines.push(`NET NETBACK:     €${nb.netNetback?.toFixed(2) ?? 'N/A'}/MWh`);
  lines.push(`IMPLIED MARGIN:  €${nb.impliedMargin?.toFixed(2) ?? 'N/A'}/MWh (${nb.marginPercent?.toFixed(1) ?? 'N/A'}%)`);
  if (nb.totalPnL !== null) {
    lines.push(`TOTAL P&L:       €${nb.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  // Key risks
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push('KEY RISKS');
  const nonPassGates = el.gates.filter(g => g.verdict !== 'PASS');
  if (nonPassGates.length > 0) {
    for (const g of nonPassGates) {
      lines.push(`• ${g.gateLabel}: ${g.verdict} — ${g.reason.split('.')[0]}.`);
    }
  } else {
    lines.push('• No regulatory risks identified.');
  }
  lines.push('• Market: Subject to mark volatility and counterparty credit risk.');
  lines.push('• FX: Any cross-currency component exposed to exchange rate movement.');
  lines.push('');
  lines.push(`Assessment generated: ${assessment.createdAt}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
