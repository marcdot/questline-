/**
 * Auth callback route — handles Supabase OAuth redirects.
 *
 * After the user signs in via Google or email magic link, Supabase redirects
 * here. We exchange the code for a session, then redirect to onboarding or home.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has onboarded (has at least one habit)
      const { count } = await supabase
        .from('habit')
        .select('*', { count: 'exact', head: true });

      const hasOnboarded = (count ?? 0) > 0;
      const redirectUrl = hasOnboarded ? next : '/onboarding';

      return NextResponse.redirect(`${origin}${redirectUrl}`);
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
