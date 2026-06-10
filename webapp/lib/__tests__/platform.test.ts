import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlatform, isStandalone } from '../platform';
import { renderHook } from '@testing-library/react';
import { useDisplayMode } from '../platform';

/* ------------------------------------------------------------------ */
/*  getPlatform()                                                      */
/* ------------------------------------------------------------------ */

describe('getPlatform()', () => {
  it('returns "desktop" when navigator is undefined (SSR)', () => {
    const nav = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true });
    expect(getPlatform()).toBe('desktop');
    Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
  });

  it('returns "ios" for iPhone user-agent', () => {
    expect(getPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('ios');
  });

  it('returns "ios" for iPadOS (MacIntel + touch)', () => {
    expect(getPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'MacIntel', 5)).toBe('ios');
  });

  it('returns "android" for Android user-agent', () => {
    expect(getPlatform('Mozilla/5.0 (Linux; Android 14)')).toBe('android');
  });

  it('returns "desktop" for a typical desktop UA', () => {
    expect(getPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
  });
});

/* ------------------------------------------------------------------ */
/*  isStandalone()                                                     */
/* ------------------------------------------------------------------ */

describe('isStandalone()', () => {
  beforeEach(() => {
    // Clean up any stubs
    Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
  });

  it('returns false when window is undefined (SSR)', () => {
    const win = globalThis.window;
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true });
    expect(isStandalone()).toBe(false);
    Object.defineProperty(globalThis, 'window', { value: win, configurable: true });
  });

  it('returns true when display-mode: standalone matches', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(isStandalone()).toBe(true);
  });

  it('returns true when navigator.standalone is true (iOS Safari)', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    });
    expect(isStandalone()).toBe(true);
  });

  it('returns false for in-browser mode', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    expect(isStandalone()).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  useDisplayMode() hook                                              */
/* ------------------------------------------------------------------ */

describe('useDisplayMode()', () => {
  it('defaults to desktop + not-standalone on initial render (SSR-safe)', () => {
    const { result } = renderHook(() => useDisplayMode());
    expect(result.current.platform).toBe('desktop');
    expect(result.current.standalone).toBe(false);
  });

  it('updates to the real platform on mount', () => {
    Object.defineProperty(globalThis.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) …',
      configurable: true,
    });

    const { result } = renderHook(() => useDisplayMode());
    // After mount effect fires, platform updates
    expect(result.current.platform).toBe('ios');
  });
});
