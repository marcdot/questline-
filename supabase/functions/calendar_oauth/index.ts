// ============================================================================
// Questline — calendar_oauth Edge Function
// Server-side Google OAuth code flow.
// Routes:
//   GET /start  — returns Google consent URL (access_type=offline&prompt=consent)
//   GET /callback?code=...&state=...  — exchanges code, stores refresh token
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const APP_URL = Deno.env.get('APP_URL') || 'questline://'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

serve(async (req) => {
  const url = new URL(req.url)
  // Strip the function base path to get the route
  const path = url.pathname.replace(/^\/functions\/v1\/calendar_oauth/, '')

  // --- Route: /start (GET or POST) ---
  if (path === '/start' || (req.method === 'POST' && (path === '/' || path === ''))) {
    return handleStart(req)
  }

  // --- Route: /callback (GET only) ---
  if (path === '/callback' && req.method === 'GET') {
    return handleCallback(req)
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ---------------------------------------------------------------------------
// GET /start — Build and return the Google consent URL
// Requires a valid Supabase session (Authorization: Bearer <access_token>)
// ---------------------------------------------------------------------------
async function handleStart(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization') || ''
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // State carries the user_id so /callback knows who to attach the token to.
  // Also carry an optional redirect target from the client.
  const reqUrl = new URL(req.url)
  const redirectTo = reqUrl.searchParams.get('redirect_to') || APP_URL
  const statePayload = JSON.stringify({ user_id: user.id, redirect_to: redirectTo })
  const encodedState = btoa(statePayload)

  const consentUrl = new URL(GOOGLE_AUTH_URL)
  consentUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  consentUrl.searchParams.set('redirect_uri', `${SUPABASE_URL}/functions/v1/calendar_oauth/callback`)
  consentUrl.searchParams.set('response_type', 'code')
  consentUrl.searchParams.set('scope', SCOPES)
  consentUrl.searchParams.set('access_type', 'offline')
  consentUrl.searchParams.set('prompt', 'consent')
  consentUrl.searchParams.set('state', encodedState)

  return new Response(JSON.stringify({ url: consentUrl.toString() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// GET /callback — Exchange code, store refresh token, redirect
// ---------------------------------------------------------------------------
async function handleCallback(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')

  if (!code || !stateParam) {
    return new Response('Missing code or state parameter', { status: 400 })
  }

  // Decode and validate state
  let state: { user_id: string; redirect_to: string }
  try {
    state = JSON.parse(atob(stateParam))
  } catch {
    return new Response('Invalid state parameter', { status: 400 })
  }

  if (!state.user_id) {
    return new Response('State missing user_id', { status: 400 })
  }

  // 1. Exchange authorization code for tokens
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${SUPABASE_URL}/functions/v1/calendar_oauth/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok) {
    console.error('Token exchange failed:', tokenData)
    return new Response(JSON.stringify({ error: 'Token exchange failed', details: tokenData }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!tokenData.refresh_token) {
    // This can happen if the user already granted offline access and Google
    // doesn't issue a new refresh token. In that case we need a different flow.
    // For now, fail explicitly — the user should revoke access and re-consent.
    console.error('No refresh_token in response:', tokenData)
    return new Response(JSON.stringify({ error: 'No refresh_token received — revoke app access and try again' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Store the refresh token in google_token (service_role bypasses RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { error: upsertError } = await supabase
    .from('google_token')
    .upsert(
      {
        user_id: state.user_id,
        refresh_token: tokenData.refresh_token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (upsertError) {
    console.error('Failed to store token in google_token:', upsertError)
    return new Response(JSON.stringify({ error: 'Failed to store token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Set google_connected = true on user_settings
  const { error: settingsError } = await supabase
    .from('user_settings')
    .update({ google_connected: true, updated_at: new Date().toISOString() })
    .eq('user_id', state.user_id)

  if (settingsError) {
    console.error('Failed to update user_settings:', settingsError)
    // Non-fatal — token is stored, but flag won't reflect it
  }

  // 4. Redirect back to the app
  const redirectTo = state.redirect_to || APP_URL
  return new Response(null, {
    status: 302,
    headers: { Location: redirectTo },
  })
}
