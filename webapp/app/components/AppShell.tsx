'use client';

import Link from 'next/link';
import { useDisplayMode } from '@/lib/platform';

/* ─── Bottom-tab definition ─── */
interface Tab {
  label: string;
  href: string;
  /** Icon character shown instead of the label (plus/CTA). */
  icon?: string;
  /** Visually elevated CTA tab. */
  highlight?: boolean;
}

const tabs: Tab[] = [
  { label: 'Home', href: '/' },
  { label: 'Habits', href: '/habits' },
  { label: '', href: '/new', icon: '+', highlight: true },
  { label: 'Stats', href: '/stats' },
  { label: 'Profile', href: '/profile' },
];

/* ─── AppShell ─── */
export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { standalone } = useDisplayMode();

  /* In non-standalone (browser, desktop) render content directly — the
     shell is only needed in installed-PWA / app mode. */
  if (!standalone) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <main className="app-shell__content">{children}</main>

      <nav className="app-tab-bar" role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              'app-tab' + (tab.highlight ? ' app-tab--highlight' : '')
            }
            role="tab"
            aria-label={tab.label || 'Create new'}
          >
            {tab.highlight ? (
              <span className="app-tab__icon app-tab__icon--plus">
                {tab.icon}
              </span>
            ) : (
              <span className="app-tab__label">{tab.label}</span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
