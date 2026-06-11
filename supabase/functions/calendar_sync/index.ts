// ============================================================================
// Questline — calendar_sync Edge Function
// Creates, updates, or deletes Google Calendar events for a quest.
//
// POST /
// Auth: Bearer session token (anon key + session)
// Body: { quest_id: uuid, op: "create" | "update" | "delete" }
//
// Reads refresh token from google_token (service_role), mints access token,
// calls Google Calendar API, writes calendar_link on success.
// On invalid_grant (user revoked): deletes google_token row, sets
// user_settings.google_connected=false, returns 409.
// ============================================================================
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CALENDAR_URL = 'https://www.googleapis.com/calendar/v3'

interface SyncRequest {
  quest_id: string
  op: 'create' | 'update' | 'delete'
}

interface GoogleEvent {
  summary: string
  description?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
}

serve(async (req) => {
  // Only POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Authenticate via session token ---
  const authHeader = req.headers.get('Authorization') || ''
  // User-scoped client: for auth only (getUser uses the user's session)
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const userId = user.id

  // Service-role client (no user auth headers): bypasses RLS for google_token
  // and calendar_link writes. Matches the pattern used in calendar_oauth/callback.
  const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // --- Parse and validate body ---
  let body: SyncRequest
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.quest_id || !['create', 'update', 'delete'].includes(body.op)) {
    return new Response(JSON.stringify({ error: 'Missing or invalid quest_id or op' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Fetch quest details ---
  const { data: quest, error: questError } = await userClient
    .from('quest')
    .select('id, title, cadence, weekdays, habit_id, calendar_sync')
    .eq('id', body.quest_id)
    .eq('user_id', userId)
    .single()

  if (questError || !quest) {
    return new Response(JSON.stringify({ error: 'Quest not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Read refresh token from google_token ---
  // Uses svc client (service-role, no RLS) because google_token has NO policies.
  const { data: tokenRow, error: tokenError } = await svc
    .from('google_token')
    .select('refresh_token')
    .eq('user_id', userId)
    .single()

  if (tokenError || !tokenRow) {
    return new Response(JSON.stringify({ error: 'Google Calendar not connected' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // --- Mint an access token ---
  const accessToken = await getAccessToken(tokenRow.refresh_token)
  if (!accessToken) {
    // Token is invalid/revoked — clean up and return 409
    await handleInvalidGrant(svc, userId)
    return new Response(
      JSON.stringify({ error: 'Google Calendar access revoked — re-connect required' }),
      {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  // --- Build Google event ---
  const event = buildEvent(quest)

  // --- Execute operation ---
  try {
    switch (body.op) {
      case 'create': {
        const googleEventId = await createEvent(accessToken, event)
        // Write calendar_link row (svc bypasses RLS)
        const { error: linkError } = await svc
          .from('calendar_link')
          .upsert(
            {
              user_id: userId,
              quest_id: body.quest_id,
              google_event_id: googleEventId,
              state: 'synced',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'quest_id' },
          )
        if (linkError) {
          console.error('Failed to write calendar_link:', linkError)
          return new Response(JSON.stringify({ error: 'Failed to save calendar link' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ google_event_id: googleEventId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      case 'update': {
        // Read existing link to get the google_event_id
        const { data: link } = await svc
          .from('calendar_link')
          .select('google_event_id')
          .eq('quest_id', body.quest_id)
          .eq('user_id', userId)
          .single()

        if (!link?.google_event_id) {
          return new Response(JSON.stringify({ error: 'No existing calendar event to update' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        await updateEvent(accessToken, link.google_event_id, event)

        const { error: linkError } = await svc
          .from('calendar_link')
          .upsert(
            {
              user_id: userId,
              quest_id: body.quest_id,
              google_event_id: link.google_event_id,
              state: 'synced',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'quest_id' },
          )
        if (linkError) {
          console.error('Failed to update calendar_link:', linkError)
        }

        return new Response(JSON.stringify({ google_event_id: link.google_event_id }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      case 'delete': {
        const { data: link } = await svc
          .from('calendar_link')
          .select('google_event_id')
          .eq('quest_id', body.quest_id)
          .eq('user_id', userId)
          .single()

        if (link?.google_event_id) {
          await deleteEvent(accessToken, link.google_event_id)
        }

        // Remove the calendar_link row
        await svc
          .from('calendar_link')
          .delete()
          .eq('quest_id', body.quest_id)
          .eq('user_id', userId)

        return new Response(JSON.stringify({ deleted: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown operation' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }
  } catch (err) {
    console.error(`Calendar sync (${body.op}) failed:`, err)
    return new Response(JSON.stringify({ error: 'Calendar sync failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const errorBody = await response.json()
    // invalid_grant means the user revoked access or the token is permanently dead
    if (errorBody.error === 'invalid_grant') {
      return null
    }
    console.error('Token refresh failed:', errorBody)
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data = await response.json()
  return data.access_token
}

async function handleInvalidGrant(svc: ReturnType<typeof createClient>, userId: string) {
  // Delete the revoked token
  await svc.from('google_token').delete().eq('user_id', userId)
  // Update the connection flag
  await svc
    .from('user_settings')
    .update({ google_connected: false, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
}

// ---------------------------------------------------------------------------
// Event builder
// ---------------------------------------------------------------------------

function buildEvent(quest: { title: string; cadence: string; weekdays: string[] }): GoogleEvent {
  const event: GoogleEvent = {
    summary: quest.title,
    description: `Questline quest — ${quest.cadence} cadence`,
  }

  // For daily quests, make it a date-based (all-day) recurring event
  if (quest.cadence === 'daily') {
    event.start = { date: new Date().toISOString().split('T')[0] }
    event.end = { date: new Date().toISOString().split('T')[0] }
  } else {
    // For weekly+, use dateTime with a sensible default time
    const now = new Date()
    event.start = {
      dateTime: now.toISOString(),
      timeZone: 'UTC',
    }
    event.end = {
      dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      timeZone: 'UTC',
    }
  }

  return event
}

// ---------------------------------------------------------------------------
// Google Calendar API calls
// ---------------------------------------------------------------------------

async function createEvent(accessToken: string, event: GoogleEvent): Promise<string> {
  const response = await fetch(`${GOOGLE_CALENDAR_URL}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Google Calendar create failed:', errorBody)
    throw new Error(`Google Calendar create failed: ${response.status}`)
  }

  const data = await response.json()
  return data.id
}

async function updateEvent(
  accessToken: string,
  googleEventId: string,
  event: GoogleEvent,
): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_URL}/calendars/primary/events/${googleEventId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Google Calendar update failed:', errorBody)
    throw new Error(`Google Calendar update failed: ${response.status}`)
  }
}

async function deleteEvent(accessToken: string, googleEventId: string): Promise<void> {
  const response = await fetch(
    `${GOOGLE_CALENDAR_URL}/calendars/primary/events/${googleEventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  )

  if (!response.ok && response.status !== 410) {
    // 410 Gone means already deleted — treat as success
    const errorBody = await response.text()
    console.error('Google Calendar delete failed:', errorBody)
    throw new Error(`Google Calendar delete failed: ${response.status}`)
  }
}
