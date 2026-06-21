// ============================================================================
// Questline — retention_warn Edge Function
// Emails users ~30 days before their 12-month inactivity deletion, then marks
// them warned. Triggered daily by pg_cron (see supabase/RETENTION-CRON.md).
// Guarded by a shared CRON_SECRET header — not a user-facing endpoint.
// Set verify_jwt = OFF (the cron caller has no Supabase JWT).
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SVC = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET')!
const APP_URL = Deno.env.get('APP_URL') || 'https://questline.marcdot.site'
const FROM = 'Questline <noreply@send.marcdot.site>'

serve(async (req) => {
  // Only the scheduler (knows the secret) may trigger this.
  if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  const db = createClient(SUPABASE_URL, SVC, { auth: { persistSession: false } })
  const { data: users, error } = await db.rpc('users_to_warn')
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  for (const u of (users ?? []) as Array<{ id: string; email: string | null }>) {
    if (!u.email) continue
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: u.email,
        subject: 'Your Questline account will be deleted soon',
        html:
          `<p>Your Questline account has been inactive for nearly 12 months and is ` +
          `scheduled for deletion in about 30 days.</p>` +
          `<p><a href="${APP_URL}">Log in</a> any time to keep it — that's all it takes.</p>` +
          `<p>If you do nothing, your account and all its data will be permanently deleted.</p>`,
      }),
    })
    // Mark warned only on a successful send (so a failed send retries next run).
    if (r.ok) {
      await db.from('user_profile')
        .update({ inactivity_warned_at: new Date().toISOString() })
        .eq('id', u.id)
      sent++
    }
  }

  return new Response(JSON.stringify({ warned: sent }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
})
