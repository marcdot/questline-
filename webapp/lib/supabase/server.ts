/**
 * Questline — Supabase server client (server components and route handlers).
 *
 * Uses @supabase/ssr createServerClient with the Next.js cookies API.
 * Session is read from httpOnly cookies — never from localStorage.
 * See docs/08 §S3 for security compliance.
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing sessions
            // and will just happen prerendering.
          }
        },
      },
    }
  );
}
