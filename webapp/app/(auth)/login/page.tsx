"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--ink)', fontFamily: 'var(--font-body)' }}>
      <div className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* ─── Header ─── */}
        <header style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            § Questline
          </span>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              fontFamily: 'var(--font-display)',
              margin: 0,
            }}
          >
            {mode === "login" ? "Welcome back" : "Begin your quest"}
          </h1>
          <p
            style={{
              fontSize: '15px',
              lineHeight: 1.55,
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-body)',
              margin: 0,
            }}
          >
            {mode === "login"
              ? "Sign in to continue your journey."
              : "Create an account to start tracking."}
          </p>
        </header>

        {/* ─── Error message ─── */}
        {error && (
          <div
            style={{
              borderRadius: '12px',
              border: '1px solid rgba(158, 43, 37, 0.3)',
              backgroundColor: 'rgba(158, 43, 37, 0.05)',
              padding: '12px',
              fontSize: '13px',
              color: 'var(--danger)',
              fontFamily: 'var(--font-body)',
            }}
          >
            {error}
          </div>
        )}

        {/* ─── Email form ─── */}
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="email"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink-muted)',
                fontFamily: 'var(--font-body)',
              }}
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
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--surface)',
                padding: '12px 16px',
                fontSize: '15px',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              htmlFor="password"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink-muted)',
                fontFamily: 'var(--font-body)',
              }}
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
              style={{
                width: '100%',
                borderRadius: '12px',
                border: '1px solid var(--line)',
                backgroundColor: 'var(--surface)',
                padding: '12px 16px',
                fontSize: '15px',
                color: 'var(--ink)',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'var(--font-body)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              borderRadius: '12px',
              backgroundColor: 'var(--accent)',
              padding: '12px 16px',
              fontSize: '15px',
              fontWeight: 600,
              color: '#fff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              fontFamily: 'var(--font-body)',
            }}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {/* ─── Divider ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--line)' }} />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            or
          </span>
          <div style={{ height: '1px', flex: 1, backgroundColor: 'var(--line)' }} />
        </div>

        {/* ─── Google sign-in ─── */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          style={{
            width: '100%',
            borderRadius: '12px',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--surface)',
            padding: '12px 16px',
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--ink)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontFamily: 'var(--font-body)',
          }}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true" style={{ width: 20, height: 20, flexShrink: 0 }}>
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
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--ink-muted)', fontFamily: 'var(--font-body)' }}>
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                style={{
                  fontWeight: 500,
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  padding: 0,
                }}
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
                style={{
                  fontWeight: 500,
                  color: 'var(--accent)',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  padding: 0,
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
