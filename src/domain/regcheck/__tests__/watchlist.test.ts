import { describe, it, expect } from 'vitest';
import { REGCHECK_WATCHLIST } from '../watchlist';
import { isRegcheckReport, isRegcheckItem, isRegcheckEvidence } from '../types';
import { FIXTURE_REGCHECK_REPORT } from '../fixture';

describe('Watch list integrity', () => {
  it('has unique ids across all watch list items', () => {
    const ids = REGCHECK_WATCHLIST.map(item => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('ensures every source URL uses secure HTTPS', () => {
    for (const item of REGCHECK_WATCHLIST) {
      expect(item.sources.length).toBeGreaterThan(0);
      for (const src of item.sources) {
        expect(src.url, `Source URL in item ${item.id} must start with https://`).toMatch(/^https:\/\//);
        expect(src.label.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('ensures every entry has a non-empty topic, claim, and appImpact', () => {
    for (const item of REGCHECK_WATCHLIST) {
      expect(item.id.trim().length).toBeGreaterThan(0);
      expect(item.topic.trim().length, `Item ${item.id} must have a non-empty topic`).toBeGreaterThan(0);
      expect(item.claim.trim().length, `Item ${item.id} must have a non-empty claim`).toBeGreaterThan(0);
      expect(item.appImpact.trim().length, `Item ${item.id} must have a non-empty appImpact`).toBeGreaterThan(0);
    }
  });
});

describe('Result guard validation', () => {
  it('accepts a valid fixture report', () => {
    expect(isRegcheckReport(FIXTURE_REGCHECK_REPORT)).toBe(true);
  });

  it('rejects reports with missing top-level fields', () => {
    expect(isRegcheckReport(null)).toBe(false);
    expect(isRegcheckReport(undefined)).toBe(false);
    expect(isRegcheckReport({})).toBe(false);
    expect(isRegcheckReport({ ...FIXTURE_REGCHECK_REPORT, checkedAt: '' })).toBe(false);
    expect(isRegcheckReport({ ...FIXTURE_REGCHECK_REPORT, model: '' })).toBe(false);
    expect(isRegcheckReport({ ...FIXTURE_REGCHECK_REPORT, summary: undefined })).toBe(false);
    expect(isRegcheckReport({ ...FIXTURE_REGCHECK_REPORT, items: null })).toBe(false);
    expect(isRegcheckReport({ ...FIXTURE_REGCHECK_REPORT, newItems: null })).toBe(false);
  });

  it('rejects items with invalid status values', () => {
    const invalidItem = {
      watchId: 'dk_aib_status',
      status: 'INVALID_STATUS', // Not STILL_CORRECT | CHANGED | UNCLEAR
      finding: 'Something changed',
      evidence: []
    };
    expect(isRegcheckItem(invalidItem)).toBe(false);

    const reportWithInvalidItem = {
      ...FIXTURE_REGCHECK_REPORT,
      items: [invalidItem]
    };
    expect(isRegcheckReport(reportWithInvalidItem)).toBe(false);
  });

  it('rejects items with missing watchId or finding', () => {
    expect(isRegcheckItem({
      watchId: '',
      status: 'STILL_CORRECT',
      finding: 'Valid finding',
      evidence: []
    })).toBe(false);

    expect(isRegcheckItem({
      watchId: 'valid_id',
      status: 'STILL_CORRECT',
      finding: 12345, // invalid type
      evidence: []
    })).toBe(false);
  });

  it('validates evidence structures correctly', () => {
    expect(isRegcheckEvidence({
      url: 'https://example.com',
      quote: 'Verbatim quote',
      date: '2026-10-01',
      publisher: 'Official Publisher'
    })).toBe(true);

    expect(isRegcheckEvidence({
      url: 'https://example.com',
      quote: 'Verbatim quote',
      date: null,
      publisher: 'Official Publisher'
    })).toBe(true);

    expect(isRegcheckEvidence({
      url: '',
      quote: 'Verbatim quote',
      date: null,
      publisher: 'Official Publisher'
    })).toBe(false);

    expect(isRegcheckEvidence({
      url: 'https://example.com',
      quote: null, // missing quote string
      date: null,
      publisher: 'Official Publisher'
    })).toBe(false);
  });
});
