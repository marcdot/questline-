'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getCalendarConsentUrl, getGoogleConnected, disconnectCalendar } from '@/lib/supabase/edge-functions';
import { WALK_PACE_LABELS, type WalkPace } from '@/lib/domain';

/* ─── Motion tokens ─── */
const ease = [0.2, 0, 0, 1] as const;

/* ─── Pill button ─── */
function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-150 ${
        active
          ? 'bg-accent text-white shadow-sm'
          : 'bg-surface text-ink-muted hover:text-ink border border-line'
      }`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {label}
    </button>
  );
}

export default function ProfilePage() {
  const supabase = createClient();

  /* ─── Auth ─── */
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  /* ─── Calendar ─── */
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<string | null>(null);

  /* ─── Theme ─── */
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  /* ─── XP display ─── */
  const [xpMode, setXpMode] = useState<'total' | 'period'>('total');

  /* ─── Health (Q-002): weight + default walk pace ─── */
  const [weightKg, setWeightKg] = useState('');
  const [walkPace, setWalkPace] = useState<WalkPace>('moderate');
  const [weightSaved, setWeightSaved] = useState(false);

  /* ─── Account ─── */
  const [deleting, setDeleting] = useState(false);

  /* ─── Init ─── */
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? null);

      /* Read user_settings for google_connected + theme + xp_mode */
      const { data: settings } = await supabase
        .from('user_settings')
        .select('google_connected, theme, xp_display, weight_kg, walk_pace')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        setGoogleConnected(settings.google_connected ?? false);
        setTheme(settings.theme ?? 'light');
        // DB enum is xp_display: 'simple' | 'detailed'; component uses 'total' | 'period'
        setXpMode(settings.xp_display === 'detailed' ? 'period' : 'total');
        setWeightKg(settings.weight_kg != null ? String(settings.weight_kg) : '');
        setWalkPace((settings.walk_pace as WalkPace) ?? 'moderate');
      }

      /* Sync theme class on <html> */
      document.documentElement.classList.toggle('dark', theme === 'dark');
    };
    init();
  }, [supabase, theme]);

  /* ─── Sync theme to DOM on change ─── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  /* ─── Theme toggle ─── */
  const handleThemeToggle = useCallback(async () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (userId) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: userId, theme: next, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }
  }, [theme, userId, supabase]);

  /* ─── XP mode toggle ─── */
  const handleXpModeToggle = useCallback(async (mode: 'total' | 'period') => {
    setXpMode(mode);
    if (userId) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: userId, xp_display: mode === 'period' ? 'detailed' : 'simple', updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );
    }
  }, [userId, supabase]);

  /* ─── Health: save weight (Q-002) ─── */
  const handleSaveWeight = useCallback(async () => {
    if (!userId) return;
    const w = parseFloat(weightKg);
    // Empty clears it; otherwise validate the DB check range (0 < w < 1000).
    const value = weightKg.trim() === '' ? null : w;
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value >= 1000)) return;
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, weight_kg: value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' });
    setWeightSaved(true);
    setTimeout(() => setWeightSaved(false), 1500);
  }, [userId, weightKg, supabase]);

  /* ─── Health: save default walk pace (Q-002) ─── */
  const handlePaceChange = useCallback(async (pace: WalkPace) => {
    setWalkPace(pace);
    if (!userId) return;
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, walk_pace: pace, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' });
  }, [userId, supabase]);

  /* ─── Google Calendar connect ─── */
  const handleConnectCalendar = useCallback(async () => {
    setConnecting(true);
    setCalendarStatus(null);
    try {
      const redirectTo = `${window.location.origin}/profile`;
      const url = await getCalendarConsentUrl(redirectTo);
      if (!url) {
        setCalendarStatus('Failed to get consent URL — try signing out and back in.');
        return;
      }
      /* Redirect to Google consent — after approval, user lands back on /profile */
      window.location.href = url;
    } catch {
      setCalendarStatus('Something went wrong. Try again.');
    } finally {
      setConnecting(false);
    }
  }, []);

  /* ─── Disconnect Google Calendar ─── */
  const handleDisconnectCalendar = useCallback(async () => {
    if (!userId) return;
    setConnecting(true);
    try {
      /* Edge Function revokes the grant at Google + deletes the stored refresh
         token server-side (not just the flag). The client never sees a token. */
      const { ok, error } = await disconnectCalendar();
      if (!ok) {
        setCalendarStatus(error ?? 'Failed to disconnect.');
        return;
      }
      setGoogleConnected(false);
      setCalendarStatus('Disconnected.');
    } catch {
      setCalendarStatus('Failed to disconnect.');
    } finally {
      setConnecting(false);
    }
  }, [userId]);

  /* ─── Poll google_connected on mount (handles OAuth callback redirect) ─── */
  useEffect(() => {
    const check = async () => {
      const connected = await getGoogleConnected();
      setGoogleConnected(connected);
      if (connected) setCalendarStatus('Calendar connected ✓');
    };
    /* Check immediately and then every 3s for 15s (for the OAuth redirect case) */
    check();
    const interval = setInterval(check, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 15000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  /* ─── Sign out ─── */
  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    // Full reload to /login so middleware re-runs with the cleared session.
    window.location.assign('/login');
  }, [supabase]);

  /* ─── Delete account ─── */
  const handleDeleteAccount = useCallback(async () => {
    if (!userId) return;
    const confirmed = window.confirm(
      'Are you sure? This will DELETE all your habits, quests, and data permanently. This cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      /* Delete the user's data via admin API (RPC) — all tables cascade from user_profile */
      const { error } = await supabase.rpc('admin_delete_user');
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.assign('/login');
    } catch {
      setDeleting(false);
      alert('Failed to delete account. Contact support.');
    }
  }, [userId, supabase]);

  return (
    <motion.div
      className="flex flex-col items-center px-4 py-12"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease }}
    >
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1">
          <span
            className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            § Profile
          </span>
          <h1
            className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Settings
          </h1>
        </header>

        <div className="h-px w-full bg-line" />

        {/* ═══════════════════════════════════════════
            ACCOUNT
            ═══════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
            Account
          </h2>
          <div className="rounded-[12px] border border-line bg-surface divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>Email</span>
              <span className="text-[14px] text-ink-muted font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{email ?? '—'}</span>
            </div>
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-[14px] font-medium text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            GOOGLE CALENDAR
            ═══════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
            Google Calendar
          </h2>
          <div className="rounded-[12px] border border-line bg-surface divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <span className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>Status</span>
                <p className="text-[12px] text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  {googleConnected
                    ? 'Your Google Calendar is connected. Events will be synced for quests with calendar sync enabled.'
                    : 'Connect to sync quests to your Google Calendar.'}
                </p>
              </div>
              {googleConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[12px] font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-line px-3 py-1 text-[12px] font-medium text-ink-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-muted/40" />
                  Not connected
                </span>
              )}
            </div>

            {calendarStatus && (() => {
              // Semantic colour by outcome, not flat muted (Q-004). Failure
              // copy ("Failed", "wrong", "try…") → danger; otherwise success.
              const isError = /failed|wrong|try/i.test(calendarStatus);
              return (
                <div className="px-4 py-2">
                  <p
                    role="status"
                    className={`text-[12px] ${isError ? 'text-danger' : 'text-success'}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span aria-hidden className="select-none">{isError ? '⚠ ' : '✓ '}</span>
                    {calendarStatus}
                  </p>
                </div>
              );
            })()}

            <div className="px-4 py-3">
              {googleConnected ? (
                <button
                  type="button"
                  onClick={handleDisconnectCalendar}
                  disabled={connecting}
                  className="text-[14px] font-medium text-danger hover:text-danger/80 transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {connecting ? 'Working…' : 'Disconnect Google Calendar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectCalendar}
                  disabled={connecting}
                  className="text-[14px] font-medium text-accent hover:text-accent-press transition-colors disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {connecting ? 'Connecting…' : 'Connect Google Calendar'}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            DISPLAY
            ═══════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
            Display
          </h2>
          <div className="rounded-[12px] border border-line bg-surface divide-y divide-line">
            {/* Theme */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>Theme</span>
              <div className="flex gap-2">
                <Pill active={theme === 'light'} onClick={() => { setTheme('light'); handleThemeToggle(); }} label="Light" />
                <Pill active={theme === 'dark'} onClick={() => { setTheme('dark'); handleThemeToggle(); }} label="Dark" />
              </div>
            </div>

            {/* XP display mode */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>XP display</span>
              <div className="flex gap-2">
                <Pill active={xpMode === 'total'} onClick={() => handleXpModeToggle('total')} label="Total" />
                <Pill active={xpMode === 'period'} onClick={() => handleXpModeToggle('period')} label="This period" />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            HEALTH (Q-002)
            ═══════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
            Health
          </h2>
          <div className="rounded-[12px] border border-line bg-surface divide-y divide-line">
            {/* Weight — used to estimate calories burned on walks */}
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <span className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>Weight</span>
                <p className="text-[12px] text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Used to estimate calories burned on walks.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  onBlur={handleSaveWeight}
                  placeholder="—"
                  min={1}
                  max={999}
                  step={0.1}
                  aria-label="Weight in kilograms"
                  className="w-20 rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-right text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                <span className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
                  {weightSaved ? '✓' : 'kg'}
                </span>
              </div>
            </div>

            {/* Default walk pace — selects the MET value for the estimate */}
            <div className="px-4 py-3 space-y-2">
              <span className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>Default walk pace</span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(WALK_PACE_LABELS) as WalkPace[]).map((p) => (
                  <Pill key={p} active={walkPace === p} onClick={() => handlePaceChange(p)} label={WALK_PACE_LABELS[p]} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            HABITS
            ═══════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
            Habits
          </h2>
          <div className="rounded-[12px] border border-line bg-surface divide-y divide-line">
            <div className="px-4 py-3">
              <p className="text-[13px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
                Edit your habits — tap a habit below to rename or change its colour.
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            DANGER ZONE
            ═══════════════════════════════════════════ */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-danger" style={{ fontFamily: 'var(--font-body)' }}>
            Danger zone
          </h2>
          <div className="rounded-[12px] border border-danger/30 bg-surface divide-y divide-line">
            <div className="px-4 py-3">
              <p className="text-[13px] text-ink-muted mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                Permanently delete your account and all data. This cannot be undone.
              </p>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="rounded-[10px] border border-danger/50 px-4 py-2 text-[13px] font-medium text-danger hover:bg-danger/5 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {deleting ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
