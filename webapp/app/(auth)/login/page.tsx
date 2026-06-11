"use client";

import { useState, Component, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

/* ─── Error boundary to catch render-phase crashes ─── */
class LoginErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            color: "#9e2b25",
          }}
        >
          <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: "14px", maxWidth: "400px", color: "#726e66" }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #e1ddd5",
              background: "#fcfbf9",
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        // Sign-up with email confirmation — tell user to check email
        setError("Check your email for the confirmation link.");
        setLoading(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      router.refresh();
      router.push("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setLoading(false);
    }
  }

  return (
    <LoginErrorBoundary>
    <motion.main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* ─── Header ─── */}
        <header className="space-y-2 text-center">
          <span
            className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            § Questline
          </span>
          <h1
            className="text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "login" ? "Welcome back" : "Begin your quest"}
          </h1>
          <p
            className="text-[15px] leading-[1.55] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {mode === "login"
              ? "Sign in to continue your journey."
              : "Create an account to start tracking."}
          </p>
        </header>

        {/* ─── Error message ─── */}
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

        {/* ─── Email form ─── */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-[13px] font-medium text-ink-muted"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-ink-disabled outline-none transition-colors focus:border-accent"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-[13px] font-medium text-ink-muted"
              style={{ fontFamily: "var(--font-body)" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-[12px] border border-line bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-ink-disabled outline-none transition-colors focus:border-accent"
              style={{ fontFamily: "var(--font-body)" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[12px] bg-accent px-4 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontFamily: "var(--font-body)" }}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {/* ─── Divider ─── */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            style={{ fontFamily: "var(--font-body)" }}
          >
            or
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>

        {/* ─── Google sign-in ─── */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
          style={{ fontFamily: "var(--font-body)" }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* ─── Toggle mode ─── */}
        <p className="text-center text-[13px] text-ink-muted">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="font-medium text-accent underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="font-medium text-accent underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </motion.main>
    </LoginErrorBoundary>
  );
}
