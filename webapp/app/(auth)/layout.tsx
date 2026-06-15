/**
 * Layout for the (auth) route group (login, onboarding).
 *
 * Forces dynamic rendering so these pages aren't statically prerendered at
 * build — they construct the Supabase browser client on render, which needs
 * runtime env that isn't available during the build's static-generation pass.
 */
export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
