/**
 * Questline — Edge Function helpers.
 *
 * Thin wrappers around the Supabase Edge Functions for Google Calendar sync.
 * The user's session token is injected automatically from the Supabase client.
 * Token stays server-side — clients never see a Google token.
 */
import { createClient } from '@/lib/supabase/client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

/** Response from calendar_oauth/start. */
interface StartResponse {
  url: string;
}

/** Response from calendar_sync. */
interface SyncResponse {
  google_event_id?: string;
  deleted?: boolean;
  error?: string;
}

/**
 * Get a Google OAuth consent URL for the current user.
 * The user should be redirected to this URL to authorise calendar access.
 * After approval, they'll be redirected back to `redirectTo`.
 */
export async function getCalendarConsentUrl(
  redirectTo: string
): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/calendar_oauth/start?redirect_to=${encodeURIComponent(redirectTo)}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    );
    if (!res.ok) return null;
    const data: StartResponse = await res.json();
    return data.url ?? null;
  } catch {
    return null;
  }
}

/**
 * Check whether the current user has connected Google Calendar.
 * Reads user_settings.google_connected.
 */
export async function getGoogleConnected(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_settings')
    .select('google_connected')
    .eq('user_id', user.id)
    .single();

  return data?.google_connected ?? false;
}

/**
 * Sync a quest to Google Calendar (create, update, or delete event).
 * Call this AFTER the quest is created/updated/deleted.
 */
export async function syncQuestToCalendar(
  questId: string,
  op: 'create' | 'update' | 'delete'
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { ok: false, error: 'Not authenticated' };
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/calendar_sync`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quest_id: questId, op }),
      }
    );
    const data: SyncResponse = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
