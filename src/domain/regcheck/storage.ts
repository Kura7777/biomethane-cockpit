import type { RegcheckReport } from './types';
import { isRegcheckReport } from './types';

export const ANTHROPIC_API_KEY_STORAGE_KEY = 'biomethane_anthropic_api_key';
export const REGCHECK_LAST_REPORT_STORAGE_KEY = 'biomethane_regcheck_last_report';

export function getStoredAnthropicApiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return localStorage.getItem(ANTHROPIC_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredAnthropicApiKey(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ANTHROPIC_API_KEY_STORAGE_KEY, key.trim());
  } catch {
    // Ignore localStorage write failures (e.g. private browsing quota)
  }
}

export function clearStoredAnthropicApiKey(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ANTHROPIC_API_KEY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function getLastRegcheckReport(): RegcheckReport | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REGCHECK_LAST_REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isRegcheckReport(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveLastRegcheckReport(report: RegcheckReport): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(REGCHECK_LAST_REPORT_STORAGE_KEY, JSON.stringify(report));
  } catch {
    // Ignore localStorage write errors
  }
}

export function clearLastRegcheckReport(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(REGCHECK_LAST_REPORT_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function getDaysSinceChecked(checkedAt: string): number {
  const checkTime = new Date(checkedAt).getTime();
  if (isNaN(checkTime)) return 999;
  const now = Date.now();
  const diffMs = Math.max(0, now - checkTime);
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isRegcheckStale(report: RegcheckReport | null): boolean {
  if (!report) return true;
  return getDaysSinceChecked(report.checkedAt) >= 7;
}
