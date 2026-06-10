'use client';

import { useState } from 'react';
import { useDisplayMode } from '@/lib/platform';

/**
 * Install banner — shown on iPhone Safari when NOT installed (standalone).
 * Dismissed via localStorage with a 7-day expiry.
 */
const DISMISS_KEY = 'questline_install_banner_dismissed';

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const expiry = parseInt(val, 10);
    return Date.now() < expiry;
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    // Dismiss for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  } catch { /* noop */ }
}

export default function InstallBanner() {
  const { platform, standalone } = useDisplayMode();
  // Derive initial visibility synchronously — no setState in effect
  const [dismissed, setDismissed] = useState(isDismissed());

  if (platform !== 'ios' || standalone || dismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner__content">
        <span className="install-banner__icon">📲</span>
        <div className="install-banner__text">
          <strong>Install Questline</strong>
          <p>Tap <span className="install-banner__glyph">⎙</span> Share &rarr; Add to Home Screen</p>
        </div>
      </div>
      <div className="install-banner__actions">
        <button
          className="install-banner__dismiss"
          onClick={() => { dismiss(); setDismissed(true); }}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
