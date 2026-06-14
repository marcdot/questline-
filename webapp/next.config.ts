import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Dev-only: Next 16 blocks cross-origin requests to dev assets/endpoints by
  // default. Real-device testing (iPhone on the LAN) hits the machine's LAN IP,
  // not localhost — without this, post-login client navigation/RSC fetches are
  // blocked and the app appears to hang on the login screen. Ignored in prod.
  allowedDevOrigins: ["10.0.0.3", "*.trycloudflare.com", "*.loca.lt", "*.ngrok-free.app"],

  // ── Security headers (public site hardening) ──
  // Applied to every response. CSP is pragmatic (Next/Framer need inline
  // styles + the Next runtime needs inline/eval scripts); the strong wins are
  // frame-ancestors (clickjacking), nosniff, referrer & permissions policy,
  // and locking connect-src to self + Supabase.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://accounts.google.com",
      "object-src 'none'",
      // NOTE: no 'upgrade-insecure-requests' — it breaks HTTP dev/LAN-device
      // testing. HTTPS is enforced in prod by the Strict-Transport-Security
      // (HSTS) header below + serving the portfolio site over TLS.
    ].join("; ");
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
