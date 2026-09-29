// PWA install-prompt plumbing shared by the mobile shell (MobileTabBar → DeskSheet).
//
// The `beforeinstallprompt` event only fires once and must be captured at module load time
// (before any component that wants to trigger it has mounted), so the listener below is
// registered as soon as this module is imported — Layout.tsx imports it for that side effect.

export type InstallState = 'installed' | 'available' | 'ios' | 'unsupported';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS Safari's non-standard flag for "added to home screen".
  if ((window.navigator as any).standalone === true) return true;
  return false;
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

if (typeof window !== 'undefined') {
  isInstalled = isStandalone();

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    isInstalled = true;
    deferredPrompt = null;
    notify();
  });
}

/** Current install state, recomputed on every call (cheap; no caching beyond the flags above). */
export function getInstallState(): InstallState {
  if (isInstalled || isStandalone()) return 'installed';
  if (deferredPrompt) return 'available';
  if (isIosSafari()) return 'ios';
  return 'unsupported';
}

/**
 * Triggers the saved `beforeinstallprompt` event (Android/Chromium only).
 * Resolves true if the user accepted, false otherwise (including when unsupported).
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  notify();
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    return outcome === 'accepted';
  } catch {
    return false;
  }
}

/** Subscribes to install-state changes (prompt captured, app installed). Returns an unsubscribe fn. */
export function subscribeInstall(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
