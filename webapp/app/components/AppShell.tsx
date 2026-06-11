'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDisplayMode } from '@/lib/platform';
import InstallBanner from '@/components/InstallBanner';

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
  const { standalone, platform } = useDisplayMode();
  const pathname = usePathname();

  /* App mode (bottom tab bar) for the installed PWA AND iPhone Safari — per
     ios/BUILD.md §2: iPhone-Safari-not-installed gets the same app UI + the
     install banner. Desktop / Android browser get the plain responsive layout. */
  const appMode = standalone || platform === 'ios';

  if (!appMode) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Install banner only when running in iOS Safari (not yet installed) */}
      {!standalone && <InstallBanner />}
      <main className="app-shell__content">{children}</main>

      <nav className="app-tab-bar" role="tablist">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              'app-tab' +
              (tab.highlight ? ' app-tab--highlight' : '') +
              (!tab.highlight && pathname === tab.href ? ' app-tab--active' : '')
            }
            role="tab"
            aria-current={pathname === tab.href ? 'page' : undefined}
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
