/**
 * Auth-protected layout for (app) route group.
 *
 * All pages under app/(app)/ are only accessible to authenticated users.
 * The proxy.ts guards the route at the server level; this layout provides
 * the AppShell wrapper for the authenticated experience (bottom tab bar).
 */
import AppShell from "@/app/components/AppShell";

// Authed, per-user pages — render on demand, never statically prerender at
// build (no SEO value, and prerendering would run the Supabase client before
// runtime env exists). Keeps the build independent of build-time env inlining.
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
