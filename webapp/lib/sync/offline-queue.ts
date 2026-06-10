/**
 * Questline — Offline queue (idempotent event buffer)
 *
 * Buffers quest events locally when offline, flushes on reconnect.
 * Each event carries a client-generated UUID for idempotency — the server
 * applies each UUID at most once (see docs/05 §7).
 *
 * Storage: localStorage keyed by user ID so events survive page reload
 * and are scoped per user.
 */

import type { EventKind } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

/* ─── Types ─── */

export interface QueuedEvent {
  id: string;           // client-generated UUID (idempotency key)
  instance_id: string;
  kind: EventKind;
  delta: number;
  created_at: string;   // ISO timestamp
  retries: number;
}

export interface QueueState {
  events: QueuedEvent[];
  lastFlushAttempt: string | null;
}

/* ─── Storage keys ─── */

function storageKey(userId: string): string {
  return `questline:queue:${userId}`;
}

/* ─── UUID v4 generator (crypto.randomUUID or fallback) ─── */

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ─── Queue operations ─── */

/**
 * Load the current queue from localStorage.
 */
export function loadQueue(userId: string): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const state: QueueState = JSON.parse(raw);
    return state.events ?? [];
  } catch {
    return [];
  }
}

/**
 * Save queue to localStorage.
 */
export function saveQueue(userId: string, events: QueuedEvent[]): void {
  try {
    const state: QueueState = {
      events,
      lastFlushAttempt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // localStorage full or blocked — silently fail; events remain in memory
  }
}

/**
 * Enqueue a new quest event. Returns the generated event ID.
 * If we're online, immediately flush. Otherwise buffers.
 */
export async function enqueueEvent(
  userId: string,
  instanceId: string,
  kind: EventKind,
  delta: number,
): Promise<string> {
  const eventId = generateId();
  const event: QueuedEvent = {
    id: eventId,
    instance_id: instanceId,
    kind,
    delta,
    created_at: new Date().toISOString(),
    retries: 0,
  };

  const events = loadQueue(userId);
  events.push(event);
  saveQueue(userId, events);

  // If we think we're online, try flushing immediately
  if (navigator.onLine) {
    const flushed = await flushQueue(userId);
    if (flushed > 0) return eventId;
  }

  return eventId;
}

/**
 * Flush all queued events to the server via apply_quest_event RPC.
 * Returns the number of events successfully flushed.
 * Idempotent — server deduplicates by event UUID.
 */
export async function flushQueue(userId: string): Promise<number> {
  const events = loadQueue(userId);
  if (events.length === 0) return 0;

  const supabase = createClient();
  const flushed: string[] = [];
  const remaining: QueuedEvent[] = [];

  for (const event of events) {
    try {
      const { error } = await supabase.rpc('apply_quest_event', {
        p_event_id: event.id,
        p_instance_id: event.instance_id,
        p_kind: event.kind,
        p_delta: event.delta,
        p_client_ts: event.created_at,
      });

      if (error) {
        // If it's a network/unreachable error, keep in queue
        if (error.message?.includes('Failed to fetch') || error.code === 'NETWORK_ERROR') {
          remaining.push({ ...event, retries: event.retries + 1 });
        }
        // Otherwise (e.g. validation error), drop it — no point retrying
        // But still log it. Server invariant: bad data won't apply.
        continue;
      }

      flushed.push(event.id);
    } catch {
      // Network error during call — keep for retry
      remaining.push({ ...event, retries: event.retries + 1 });
    }
  }

  // Re-save remaining events (limit retries to prevent infinite loops)
  const retryable = remaining.filter((e) => e.retries < 10);
  saveQueue(userId, retryable);

  return flushed.length;
}

/**
 * Clear the entire queue (used on logout / queue purge).
 */
export function clearQueue(userId: string): void {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Set up online/offline listener to auto-flush when connectivity returns.
 * Returns an unsubscribe function.
 */
export function setupAutoFlush(userId: string): () => void {
  const handleOnline = async () => {
    await flushQueue(userId);
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}
