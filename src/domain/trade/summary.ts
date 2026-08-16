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
    const verDate = gate.citations[0]?.verifiedDate ? gate.citations[0].verifiedDate : '—';
    lines.push(`   Verified: ${verDate} │ Confidence: ${gate.confidence}`);
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

    // Provenance line
    const prov = nb.certificateValue.provenance;
    if (prov && prov.sourceType) {
      const namePart = prov.sourceName ? `${prov.sourceName} ` : '';
      const typePart = `(${prov.sourceType})`;
      const obsDate = prov.observedAt ? prov.observedAt.slice(0, 10) : 'unspecified date';
      const ageText = nb.certificateValue.markAgeDays !== null && nb.certificateValue.markAgeDays !== undefined
        ? `, ${nb.certificateValue.markAgeDays} day${nb.certificateValue.markAgeDays === 1 ? '' : 's'} old`
        : '';
      lines.push(`  Mark source: ${namePart}${typePart}, observed ${obsDate}${ageText}`);
    } else if (nb.certificateValue.isModelled) {
      lines.push('  Mark source: MODELLED — Theoretical regulatory deficit closure model (no market mark recorded).');
    } else {
      lines.push('  Mark source: NOT RECORDED — this price cannot be substantiated.');
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
      lines.push(`    Certificate Value:  €${b.certificateValue.valueEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Net Netback:        €${b.netNetback?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Gross Value Spread: €${b.grossValueSpread?.toFixed(2) ?? b.impliedMargin?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Producer Share(90%):−€${b.producerPayable?.toFixed(2) ?? 'N/A'}/MWh`);
      lines.push(`    Realised Desk Margin:€${b.deskMargin?.toFixed(2) ?? 'N/A'}/MWh`);
      if (b.deskPnL !== null) {
        lines.push(`    Total Desk P&L:     €${b.deskPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
      }
    }
    if (c.carbonIntensity < 0 || c.feedstock.includes('manure')) {
      lines.push(`  Note: Feedstock negative CI (${c.carbonIntensity} gCO₂e/MJ) reflects avoided methane emissions under RED III Annex V and is unaffected by double counting policy changes.`);
    } else {
      lines.push(`  Note: Feedstock carbon intensity (${c.carbonIntensity} gCO₂e/MJ) is calculated under RED III Annex V.`);
    }
  }

  lines.push('');
  lines.push(`Molecule Value (TTF):          ${nb.moleculeValue !== null ? `+€${nb.moleculeValue.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Transfer Costs:                ${assessment.costs.transferCosts !== null ? `−€${assessment.costs.transferCosts.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Certification Costs:           ${assessment.costs.certificationCosts !== null ? `−€${assessment.costs.certificationCosts.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Logistics:                     ${assessment.costs.logistics !== null ? `−€${assessment.costs.logistics.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Other Costs:                   ${assessment.costs.otherCosts !== null ? `−€${assessment.costs.otherCosts.toFixed(2)}/MWh` : 'Not set'}`);
  lines.push(`Base Producer Procurement Cost:${assessment.costs.deliveredCost !== null ? `−€${assessment.costs.deliveredCost.toFixed(2)}/MWh` : 'Not set'}`);
  
  if (!nb.isComplete) {
    lines.push(`⚠ INCOMPLETE COST BASIS: Missing ${nb.missingInputs.join(', ')}`);
  }

  lines.push('');
  const incompleteSuffix = !nb.isComplete ? ` (INCOMPLETE — missing: ${nb.missingInputs.join(', ')})` : '';
  lines.push(`DELIVERED VALUE STACK:     ${nb.netNetback !== null ? `€${nb.netNetback.toFixed(2)}/MWh${incompleteSuffix}` : 'N/A'}`);
  if (assessment.costs.producerPricing?.mode === 'INDEX_LINKED') {
    const sharePct = assessment.costs.producerPricing.indexLinkedShare !== null ? (assessment.costs.producerPricing.indexLinkedShare * 100).toFixed(1) : 'N/A';
    lines.push(`PRODUCER PAYABLE (${sharePct}%):  ${nb.producerPayable !== null ? `−€${nb.producerPayable.toFixed(2)}/MWh (Index-linked value share)` : 'Not set'}`);
  } else {
    lines.push(`PRODUCER PAYABLE (Fixed):  ${nb.producerPayable !== null ? `−€${nb.producerPayable.toFixed(2)}/MWh (All-in fixed procurement price)` : 'Not set'}`);
  }
  lines.push('─────────────────────────────────────────────────────────────');
  lines.push(`REALISED DESK MARGIN:      ${nb.deskMargin !== null ? `€${nb.deskMargin.toFixed(2)}/MWh (${nb.marginPercent?.toFixed(1)}% margin)` : 'N/A'}`);
  if (nb.deskPnL !== null) {
    lines.push(`TOTAL CONTRACT DESK P&L:   €${nb.deskPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (on ${c.volumeMWh?.toLocaleString() ?? 0} MWh)`);
  }

  // Key risks
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('KEY RISKS & MITIGATIONS');
  lines.push('═══════════════════════════════════════════════════════════════');
  const nonPassGates = el.gates.filter(g => g.verdict !== 'PASS');
  if (nonPassGates.length > 0) {
    for (const g of nonPassGates) {
      lines.push(`• ${g.gateLabel} (${g.verdict}): ${g.reason}`);
    }
  } else {
    lines.push('• All regulatory compliance gates cleared under applicable legal framework.');
  }
  lines.push('• Market Risk: Counterparty marks subject to index volatility and bilateral liquidity.');
  lines.push('• FX Risk: Non-EUR transactions exposed to currency movements.');
  if (assessment.userNotes) {
    lines.push('');
    lines.push(`TRADER NOTES:\n${assessment.userNotes}`);
  }
  lines.push('');
  lines.push(`Dossier Generated: ${assessment.createdAt}`);
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
