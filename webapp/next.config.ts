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
};

export default nextConfig;
