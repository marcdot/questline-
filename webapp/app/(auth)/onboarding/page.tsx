"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

/** The 8 habit colours from the design system (docs/03 §2). */
const HABIT_COLORS = [
  { value: "#E8743B", label: "Ember" },
  { value: "#E0B040", label: "Gold" },
  { value: "#5AA469", label: "Fern" },
  { value: "#3E9CA8", label: "Teal" },
  { value: "#4F86C6", label: "Sky" },
  { value: "#7A6CD8", label: "Iris" },
  { value: "#C85A8E", label: "Rose" },
  { value: "#8A8F98", label: "Slate" },
];

/** Common first habits to suggest. */
const SUGGESTED_HABITS = [
  "Morning pages",
  "Read for 20 min",
  "Gratitude journal",
  "Meditate",
  "Walk 30 min",
  "Drink water",
  "Practice guitar",
  "Learn a language",
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"habit" | "quest" | "done">("habit");
  const [habitName, setHabitName] = useState("");
  const [habitColor, setHabitColor] = useState(HABIT_COLORS[0].value);
  const [questTitle, setQuestTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Step 1: Create the first habit. */
  async function handleCreateHabit() {
    const name = habitName.trim();
    if (!name) return;

    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase.from("habit").insert({
        user_id: user.id,
        name,
        color: habitColor,
        sort_order: 0,
      });

      if (insertError) throw insertError;

      setStep("quest");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create habit.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  /** Step 2: Create the first quest + seed today's instance. */
  async function handleCreateQuest() {
    const title = questTitle.trim();
    if (!title) return;

    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the habit we just created
      const { data: habits, error: fetchError } = await supabase
        .from("habit")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;
      if (!habits || habits.length === 0) throw new Error("No habit found");

      // Create the quest
      const { error: questError } = await supabase
        .from("quest")
        .insert({
          user_id: user.id,
          habit_id: habits[0].id,
          title,
          cadence: "daily",
          target_count: 1,
          weekdays: [],
          active_from: new Date().toISOString().split("T")[0],
        })
        .select("id")
        .single();

      if (questError) throw questError;

      // Seed today's instance via ensure_instances RPC (idempotent)
      const today = new Date().toISOString().split("T")[0];
      const { error: instanceError } = await supabase.rpc("ensure_instances", {
        p_date: today,
      });

      if (instanceError) throw instanceError;

      setStep("done");

      // Brief pause then redirect to home
      setTimeout(() => {
        router.refresh();
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create quest.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* ─── Step indicator ─── */}
        <div className="flex items-center justify-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              step === "habit" ? "bg-accent" : "bg-success"
            }`}
          />
          <div className="h-px w-6 bg-line" />
          <span
            className={`h-2 w-2 rounded-full ${
              step === "quest" ? "bg-accent" : step === "done" ? "bg-success" : "bg-line"
            }`}
          />
          <div className="h-px w-6 bg-line" />
          <span
            className={`h-2 w-2 rounded-full ${
              step === "done" ? "bg-success" : "bg-line"
            }`}
          />
        </div>

        {step === "habit" && (
          <>
            {/* ─── Step 1: Create habit ─── */}
            <header className="space-y-2 text-center">
              <h1
                className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Name your habit
              </h1>
              <p
                className="text-[15px] leading-[1.55] text-ink-muted"
                style={{ fontFamily: "var(--font-body)" }}
              >
                What&apos;s the first thing you want to track?
              </p>
            </header>

            {error && (
              <motion.div
                className="rounded-[12px] border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              {/* Habit name input */}
              <input
                type="text"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                placeholder="e.g. Morning pages"
                className="w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-ink-disabled outline-none transition-colors focus:border-accent"
                style={{ fontFamily: "var(--font-body)" }}
              />

              {/* Suggested habits */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_HABITS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setHabitName(suggestion)}
                    className="rounded-full border border-line px-3 py-1.5 text-[12px] text-ink-muted transition-colors hover:border-accent hover:text-accent"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {/* Colour picker */}
              <div className="space-y-2">
                <p
                  className="text-[13px] font-medium text-ink-muted"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Colour
                </p>
                <div className="flex flex-wrap gap-3">
                  {HABIT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setHabitColor(c.value)}
                      className={`h-9 w-9 rounded-full transition-all ${
                        habitColor === c.value
                          ? "ring-2 ring-offset-2 ring-offset-page ring-accent scale-110"
                          : ""
                      }`}
                      style={{ backgroundColor: c.value }}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateHabit}
                disabled={loading || !habitName.trim()}
                className="w-full rounded-[12px] bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {loading ? "Creating…" : "Continue"}
              </button>
            </div>
          </>
        )}

        {step === "quest" && (
          <>
            {/* ─── Step 2: Create first quest ─── */}
            <header className="space-y-2 text-center">
              <h1
                className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your first quest
              </h1>
              <p
                className="text-[15px] leading-[1.55] text-ink-muted"
                style={{ fontFamily: "var(--font-body)" }}
              >
                What&apos;s the daily action you want to complete?
              </p>
            </header>

            {error && (
              <motion.div
                className="rounded-[12px] border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ fontFamily: "var(--font-body)" }}
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                value={questTitle}
                onChange={(e) => setQuestTitle(e.target.value)}
                placeholder="e.g. Write one page"
                className="w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-ink-disabled outline-none transition-colors focus:border-accent"
                style={{ fontFamily: "var(--font-body)" }}
              />

              <p
                className="text-[13px] leading-[1.4] text-ink-muted"
                style={{ fontFamily: "var(--font-body)" }}
              >
                This will be a daily quest with a target of 1. You can customise
                it later.
              </p>

              <button
                onClick={handleCreateQuest}
                disabled={loading || !questTitle.trim()}
                className="w-full rounded-[12px] bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {loading ? "Creating…" : "Start my journey"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <motion.div
            className="space-y-4 text-center"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success text-2xl text-white"
            >
              ✓
            </div>
            <h1
              className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              You&apos;re all set!
            </h1>
            <p
              className="text-[15px] leading-[1.55] text-ink-muted"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Your first quest is ready. Let&apos;s begin.
            </p>
          </motion.div>
        )}
      </div>
    </motion.main>
  );
}
