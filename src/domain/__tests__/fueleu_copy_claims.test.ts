import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Guards against misleading client-facing wording, citations and prices creeping back into the
// FuelEU Maritime shipping UI. Reads the in-scope .tsx source files as plain text (not rendered
// output) and asserts none contain banned strings/patterns. See scratch/fueleu_audit/REPORT.md
// findings #2, #6, #8, #9, #10, #12, #17, #18, #21.

const FUELEU_UI_DIR = path.resolve(__dirname, '../../features/fueleu');

function walkTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      out.push(fullPath);
    }
  }
  return out;
}

const files = walkTsxFiles(FUELEU_UI_DIR).map((absPath) => ({
  absPath,
  relPath: path.relative(path.resolve(__dirname, '../../..'), absPath),
  content: fs.readFileSync(absPath, 'utf-8'),
}));

describe('FuelEU Maritime UI copy — no misleading client-facing claims', () => {
  it('found at least one in-scope .tsx file to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('never hard-codes a €435 pool/penalty rate', () => {
    for (const f of files) {
      expect(f.content, `${f.relPath} contains a hard-coded 435`).not.toMatch(/435/);
    }
  });

  it('never claims authority via "audited"', () => {
    for (const f of files) {
      const matches = f.content.match(/\baudited\b/gi) || [];
      expect(matches, `${f.relPath} contains "audited": ${matches.join(', ')}`).toHaveLength(0);
    }
  });

  it('never claims authority via "verified" (except the allowed "no verified contact/domain on file")', () => {
    for (const f of files) {
      const lines = f.content.split('\n');
      for (const line of lines) {
        if (!/\bverified\b/i.test(line)) continue;
        const allowed = /no verified (contact|domain) on file/i.test(line) || /\bunverified\b/i.test(line);
        expect(allowed, `${f.relPath} has disallowed "verified" usage: ${line.trim()}`).toBe(true);
      }
    }
  });

  it('never uses "guarantee(d)" as a commercial claim', () => {
    for (const f of files) {
      const matches = f.content.match(/guarantee/gi) || [];
      expect(matches, `${f.relPath} contains "guarantee": ${matches.join(', ')}`).toHaveLength(0);
    }
  });

  it('never cites "Article 20" for physical Bio-LNG bunkering (only banking/borrowing may cite it)', () => {
    for (const f of files) {
      const lines = f.content.split('\n');
      for (const line of lines) {
        if (!/article 20/i.test(line)) continue;
        const bankingOrBorrowing = /banking|borrowing/i.test(line);
        expect(bankingOrBorrowing, `${f.relPath} cites Article 20 outside banking/borrowing context: ${line.trim()}`).toBe(true);
      }
    }
  });

  it('never references Thetis-MRV for pooling/penalty/transfer (those belong to the FuelEU database / administering State)', () => {
    for (const f of files) {
      const lines = f.content.split('\n');
      for (const line of lines) {
        if (!/thetis/i.test(line)) continue;
        const mentionsPoolPenaltyTransfer = /\b(pool|penalty|transfer)\b/i.test(line);
        expect(mentionsPoolPenaltyTransfer, `${f.relPath} cites Thetis-MRV on a pool/penalty/transfer line: ${line.trim()}`).toBe(false);
      }
    }
  });

  it('never mislabels RED (Directive (EU) 2018/2001) as "RED III"', () => {
    for (const f of files) {
      expect(f.content, `${f.relPath} contains "RED III (Directive (EU) 2018/2001)"`).not.toContain(
        'RED III (Directive (EU) 2018/2001)'
      );
    }
  });

  it('never books/confirms a bunker deal as if it were an executed trade', () => {
    for (const f of files) {
      expect(f.content).not.toContain('CONFIRMED & BOOKED TO BLOTTER');
      expect(f.content).not.toContain('Book & Confirm Bunker Deal');
      expect(f.content).not.toContain('Deal Confirmed & Booked');
    }
  });

  it('client-export/copy/email template strings do not leak "Desk Margin" / "Desk Structuring Margin"', () => {
    const targeted = [
      'ShippingTermSheetStep.tsx',
      'ShippingCounterpartyModal.tsx',
      'DualCommercialPathwaySimulator.tsx',
    ];
    for (const f of files) {
      if (!targeted.some((name) => f.relPath.endsWith(name))) continue;
      // The exported/copied/emailed term sheet text is built inside generateFullTermSheetText /
      // generateTermSheetText / handleCopyDealSummary / handleCopyBriefing template literals.
      // Extract those specific template literal bodies and assert they never mention desk margin.
      const templateFnNames = [
        'generateFullTermSheetText',
        'generateTermSheetText',
      ];
      for (const fnName of templateFnNames) {
        const fnStart = f.content.indexOf(`const ${fnName} = `);
        if (fnStart === -1) continue;
        const backtickStart = f.content.indexOf('`', fnStart);
        const backtickEnd = f.content.indexOf('`;', backtickStart + 1);
        if (backtickStart === -1 || backtickEnd === -1) continue;
        const templateBody = f.content.slice(backtickStart, backtickEnd);
        expect(
          templateBody,
          `${f.relPath}#${fnName} client-facing export contains Desk Margin wording`
        ).not.toMatch(/Desk (Structuring )?Margin/);
      }
    }
  });
});
