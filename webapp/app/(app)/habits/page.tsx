'use client';

export default function HabitsPage() {
  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
            § Habits
          </span>
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink" style={{ fontFamily: 'var(--font-display)' }}>
            All habits
          </h1>
        </header>
        <div className="h-px w-full bg-line" />
        <p className="text-[15px] text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
          Coming in P4 (quick-add).
        </p>
      </div>
    </div>
  );
}
