"use client";

import { motion } from "framer-motion";

/**
 * P0 — Placeholder Home screen.
 *
 * Renders the Questline brand with theme tokens applied (warm-grey, Bricolage
 * Grotesque, ember accent). Will be replaced with the real dashboard in P3.
 */
export default function Home() {
  return (
    <motion.main
      className="flex min-h-screen flex-col items-center px-4 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
    >
      <div className="w-full max-w-md space-y-10">
        {/* ─── Header ─── */}
        <header className="space-y-2">
          <span
            className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            § Questline
          </span>
          <h1
            className="text-[40px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome
          </h1>
          <p
            className="text-[15px] leading-[1.55] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Your habit journey starts here. Warm ink on warm-grey — restraint,
            not cosy cream.
          </p>
        </header>

        {/* ─── Hairline ─── */}
        <div className="h-px w-full bg-line" />

        {/* ─── Placeholder card ─── */}
        <div className="rounded-[16px] border border-line bg-surface p-5 shadow-sm">
          <p
            className="text-[15px] font-medium leading-[1.55] text-ink"
            style={{ fontFamily: "var(--font-body)" }}
          >
            No active quests yet.
          </p>
          <p
            className="mt-1 text-[13px] leading-[1.4] tracking-[0.01em] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Plant your first quest to get started. Tap the{" "}
            <span className="text-accent">+</span> to begin.
          </p>
        </div>

        {/* ─── Theme token showcase ─── */}
        <div className="space-y-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Tokens
          </p>
          <div className="flex flex-wrap gap-2">
            <Swatch label="accent" className="bg-accent" />
            <Swatch label="xp" className="bg-xp" />
            <Swatch label="success" className="bg-success" />
            <Swatch label="danger" className="bg-danger" />
            <Swatch label="habit·ember" className="bg-habit-ember" />
            <Swatch label="habit·fern" className="bg-habit-fern" />
            <Swatch label="habit·iris" className="bg-habit-iris" />
          </div>
        </div>

        {/* ─── Framer Motion badge ─── */}
        <motion.div
          className="rounded-[12px] border border-line bg-surface p-4 text-center"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          <p className="text-[13px] text-ink-muted">
            ✦ Framer Motion micro-interactions ready ✦
          </p>
        </motion.div>
      </div>
    </motion.main>
  );
}

/* ─── Small colour swatch component ─── */
function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <motion.div
      className={`flex items-center gap-2 rounded-[8px] border border-line px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      <div className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </motion.div>
  );
}
