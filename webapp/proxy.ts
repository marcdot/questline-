/**
 * Questline — Proxy (Next.js 16 route guard).
 *
 * Replaces the deprecated middleware convention. Runs before every matching
 * request to:
 * 1. Refresh the Supabase session cookie on every request.
 * 2. Redirect unauthenticated users from authed routes → /login.
 * 3. Redirect authenticated users from auth pages → /onboarding or /home.
 *
 * See: docs/08 §S3 — sessions via @supabase/ssr (cookie-based, not localStorage).
 */
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Paths that do NOT require authentication. */
const PUBLIC_PATHS = ['/login', '/login/', '/auth/callback', '/auth/callback/', '/privacy', '/privacy/'];

/** Check if a pathname is in the public list. */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Authenticated user on public auth pages → redirect ──
  if (user && (pathname === '/login' || pathname === '/login/')) {
    // Check if they've completed onboarding (has a habit)
    const { count } = await supabase
      .from('habit')
      .select('*', { count: 'exact', head: true });

    const hasOnboarded = (count ?? 0) > 0;

    const url = request.nextUrl.clone();
    url.pathname = hasOnboarded ? '/' : '/onboarding';
    return NextResponse.redirect(url);
  }

  // ── Unauthenticated user on private routes → redirect to login ──
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
