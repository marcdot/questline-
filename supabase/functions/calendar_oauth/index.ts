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

/** HMAC-SHA256 sign a string using GOOGLE_CLIENT_SECRET as the key. */
async function hmacSign(payload: string): Promise<string> {
  const keyData = new TextEncoder().encode(GOOGLE_CLIENT_SECRET)
  const data = new TextEncoder().encode(payload)
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Build a signed state string. */
async function buildState(userId: string, redirectTo: string): Promise<string> {
  const payload = JSON.stringify({ user_id: userId, redirect_to: redirectTo })
  const sig = await hmacSign(payload)
  return btoa(JSON.stringify({ payload, sig }))
}

/** Verify a state string. Returns decoded payload or null if forged. */
async function verifyState(stateParam: string): Promise<{ user_id: string; redirect_to: string } | null> {
  try {
    const outer = JSON.parse(atob(stateParam))
    if (!outer.payload || !outer.sig) return null
    const expectedSig = await hmacSign(outer.payload)
    if (outer.sig !== expectedSig) return null
    return JSON.parse(outer.payload)
  } catch { return null }
}

serve(async (req) => {
  // Log real URL to diagnose route matching on Supabase Edge
  console.log('[calendar_oauth] req.url:', req.url)

  // Match on the last path segment (works regardless of base path)
  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  const route = segments[segments.length - 1]

  if (route === 'start') {
    return handleStart(req)
  }

  if (route === 'callback' && req.method === 'GET') {
    return handleCallback(req)
  }

  return new Response(JSON.stringify({ error: `Not Found — route: ${route}`, path: url.pathname }), {
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

  // Rate limit consent-URL minting (per user) — header-less service-role client
  // so the limiter call runs as service_role (check_rate_limit is locked to it).
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: allowed } = await svc.rpc('check_rate_limit', {
    p_key: `${user.id}:calendar_oauth_start`,
    p_max: 10,
    p_window_secs: 60,
  })
  if (allowed === false) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded — slow down.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    })
  }

  // State carries the user_id so /callback knows who to attach the token to.
  // HMAC-signed to prevent forgery (FIX 1 — security).
  const reqUrl = new URL(req.url)
  const redirectTo = reqUrl.searchParams.get('redirect_to') || APP_URL
  const encodedState = await buildState(user.id, redirectTo)

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

  // Validate state (HMAC-signed — reject forgeries)
  const state = await verifyState(stateParam)
  if (!state) {
    return new Response('Forged or invalid state parameter — rejected', { status: 403 })
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
