import type { RegcheckReport } from './types';
import { isRegcheckReport } from './types';

export const ANTHROPIC_API_KEY_STORAGE_KEY = 'biomethane_anthropic_api_key';
/** The one Gemini key: the Compliance Auditor and the desk helper both read it. */
export const GEMINI_API_KEY_STORAGE_KEY = 'biomethane_gemini_api_key';
export const REGCHECK_LAST_REPORT_STORAGE_KEY = 'biomethane_regcheck_last_report';

/**
 * An Anthropic key is one unbroken run of letters, digits, '-' and '_'. Pasting on a phone (from a note,
 * an email or a password manager) can add spaces, line breaks or zero-width characters, turn "--" into
 * an em dash or '-' into a curly dash, and capitalise the first letter. Undo those so the key sent is
 * the key that was copied. Applied on save and on read, so a key saved before this fix is repaired too.
 */
export function normaliseAnthropicApiKey(raw: string): string {
  let key = raw
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\u2014/g, '--')
    .replace(/[\u2010-\u2013\u2015\u2212]/g, '-');
  if (/^sk-ant-/i.test(key)) key = `sk-ant-${key.slice(7)}`;
  return key;
}

/**
 * Enough to tell two saved keys apart, never the key itself: the first seven characters (the public
 * "sk-ant-" prefix on a real key), the last four, and the length.
 */
export function anthropicKeyFingerprint(key: string): string {
  return key ? `${key.slice(0, 7)}…${key.slice(-4)} (${key.length} characters)` : '';
}

export function getStoredAnthropicApiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  try {
    return normaliseAnthropicApiKey(localStorage.getItem(ANTHROPIC_API_KEY_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

export function setStoredAnthropicApiKey(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ANTHROPIC_API_KEY_STORAGE_KEY, normaliseAnthropicApiKey(key));
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

/**
 * A Gemini key is one unbroken run of letters, digits, '-' and '_' (typically "AIza" + 35 characters).
 * Same phone-paste clutter as the Anthropic key: spaces, line breaks, zero-width characters and curly dashes.
 */
export function normaliseGeminiApiKey(raw: string): string {
  return raw
    .replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u2010-\u2015\u2212]/g, '-');
}

/** Enough to tell two saved keys apart, never the key itself: the first four characters, the last four, and the length. */
export function geminiKeyFingerprint(key: string): string {
  return key ? `${key.slice(0, 4)}…${key.slice(-4)} (${key.length} characters)` : '';
}

export const GEMINI_API_KEY_PERSIST_KEY = 'biomethane_gemini_api_key_persist';

export function isGeminiKeyPersisted(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(GEMINI_API_KEY_PERSIST_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getStoredGeminiApiKey(): string {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const sessionKey = sessionStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
      if (sessionKey) return normaliseGeminiApiKey(sessionKey);
    }
    if (typeof localStorage !== 'undefined') {
      const localKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
      if (localKey) return normaliseGeminiApiKey(localKey);
    }
  } catch {
    return '';
  }
  return '';
}

export function setStoredGeminiApiKey(key: string, persistToLocalStorage?: boolean): void {
  const norm = normaliseGeminiApiKey(key);
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (norm) {
        sessionStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, norm);
      } else {
        sessionStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      }
    }
    if (typeof localStorage !== 'undefined') {
      const shouldPersist = persistToLocalStorage !== false;
      if (norm && shouldPersist) {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, norm);
        localStorage.setItem(GEMINI_API_KEY_PERSIST_KEY, 'true');
      } else {
        localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
        if (persistToLocalStorage === false || !norm) {
          localStorage.removeItem(GEMINI_API_KEY_PERSIST_KEY);
        }
      }
    }
  } catch {
    // Ignore storage write failures (e.g. private browsing quota)
  }
}

export function clearStoredGeminiApiKey(): void {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      localStorage.removeItem(GEMINI_API_KEY_PERSIST_KEY);
    }
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
