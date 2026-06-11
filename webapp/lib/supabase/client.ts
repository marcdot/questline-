/**
 * Questline — Supabase browser client (client components).
 *
 * Uses @supabase/ssr createBrowserClient for App Router cookie-based auth.
 * Sessions are stored in httpOnly/secure cookies (never localStorage).
 * See docs/08 §S3 for security compliance.
 */
import { createBrowserClient } from '@supabase/ssr';

/** Singleton browser client. */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.'
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      skipAutoInitialize: true,
    },
  });
  return client;
}
