/**
 * Platform detection module — Questline PWA (ios stream iP0)
 *
 * Detects the user's platform and display mode so the app can present
 * an iOS-native-looking app shell when running as an installed PWA.
 *
 * Exports:
 *   getPlatform()    → 'ios' | 'android' | 'desktop'
 *   isStandalone()   → true when running as installed PWA (display-mode: standalone)
 *   useDisplayMode() → React hook returning { platform, standalone }
 */

/* ------------------------------------------------------------------ */
/*  Platform detection                                                 */
/* ------------------------------------------------------------------ */

/** Normalised platform identifier. */
export type Platform = 'ios' | 'android' | 'desktop';

/**
 * Detect the current platform from user-agent heuristics.
 * SSR-safe: returns 'desktop' when `navigator` is undefined.
 *
 * @param uaOverride     - optional UA string (for testing); defaults to navigator.userAgent
 * @param platOverride   - optional navigator.platform override (for testing iPadOS trap)
 * @param touchOverride  - optional maxTouchPoints override (for testing iPadOS trap)
 */
export function getPlatform(uaOverride?: string, platOverride?: string, touchOverride?: number): Platform {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = (uaOverride ?? navigator.userAgent?.toLowerCase() ?? '').toLowerCase();
  const platform = platOverride ?? (navigator as unknown as Record<string, string>).platform;

  // iPadOS 13+ masquerades as MacIntel — trap it with touch-point check
  const maxTouch = touchOverride ?? navigator.maxTouchPoints;
  const isIpadOs = platform === 'MacIntel' && typeof maxTouch === 'number' && maxTouch > 1;

  const isIphone = /iphone|ipod/.test(ua);
  const isIos = isIphone || isIpadOs;

  if (isIos) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

/* ------------------------------------------------------------------ */
/*  Standalone (installed PWA) detection                               */
/* ------------------------------------------------------------------ */

/**
 * Returns `true` when the page is running in a standalone PWA window
 * (i.e. "Add to Home Screen" on iOS / "Install" on Android).
 * SSR-safe.
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/* ------------------------------------------------------------------ */
/*  React hook                                                         */
/* ------------------------------------------------------------------ */

import { useSyncExternalStore } from 'react';

export interface DisplayMode {
  platform: Platform;
  standalone: boolean;
}

/** SSR snapshot — cached to avoid React warning. */
const SERVER_SNAPSHOT: DisplayMode = { platform: 'desktop', standalone: false };

function getServerSnapshot(): DisplayMode {
  return SERVER_SNAPSHOT;
}

function subscribeToPlatform(cb: () => void): () => void {
  // Re-evaluate on display-mode changes (installed PWA ↔ browser)
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

let cachedSnapshot: DisplayMode | null = null;

function getSnapshot(): DisplayMode {
  const platform = getPlatform();
  const standalone = isStandalone();
  if (
    !cachedSnapshot ||
    cachedSnapshot.platform !== platform ||
    cachedSnapshot.standalone !== standalone
  ) {
    cachedSnapshot = { platform, standalone };
  }
  return cachedSnapshot;
}

/**
 * React hook that resolves the current display mode.
 *
 * SSR-safe via `getServerSnapshot`. Uses `useSyncExternalStore` to avoid
 * hydration mismatch and the "setState synchronously in useLayout/useEffect" lint.
 */
export function useDisplayMode(): DisplayMode {
  return useSyncExternalStore(subscribeToPlatform, getSnapshot, getServerSnapshot);
}
