// Offline mutation queue for pantry/shopping writes (task 11 — offline
// support). Backed by localStorage so it survives a reload while offline.
//
// This module is intentionally a leaf: it knows nothing about Supabase or
// React. `lib/database.ts` enqueues entries here when a mutation fails due
// to a genuine network error, and drains them (replaying the real Supabase
// calls) once back online. Keeping the dependency one-directional avoids a
// circular import between the two modules.

export type QueueEntity = 'pantry' | 'shopping';
export type QueueOperation = 'add' | 'update' | 'delete';

export interface AddPayload<T = unknown> {
  /** Client-generated id the item was optimistically shown under, before Supabase assigns a real one. */
  tempId: string;
  item: T;
}

export interface UpdatePayload<T = unknown> {
  targetId: string;
  updates: T;
}

export interface DeletePayload {
  targetId: string;
}

// The queue is a heterogeneous, JSON-serialized store — entries are written
// with their concrete payload type (see database.ts's enqueue() call sites,
// each typed via AddPayload<PantryAddInput> etc.) and read back generically,
// so storage uses `unknown` item/updates rather than a specific shape.
export type QueuePayload = AddPayload<unknown> | UpdatePayload<unknown> | DeletePayload;

export interface QueueEntry {
  id: string;
  entity: QueueEntity;
  operation: QueueOperation;
  payload: QueuePayload;
  timestamp: number;
}

const STORAGE_KEY = 'gg_offline_queue';

/** Fired on window whenever the persisted queue changes (enqueue/drain), so UI can re-read its length reactively. */
export const QUEUE_CHANGE_EVENT = 'gg-offline-queue-change';

/** Fired on window after a queued 'add' entry successfully syncs, carrying the tempId → real-id mapping so callers can reconcile local state. */
export const ITEM_SYNCED_EVENT = 'gg-offline-item-synced';

export interface ItemSyncedDetail {
  entity: QueueEntity;
  tempId: string;
  realId: string;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Id used to optimistically key a newly-added item in local UI state before it's synced. */
export function generateOfflineId(): string {
  return `offline-${generateId()}`;
}

export function getQueue(): QueueEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueueEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage full/unavailable — the entry that triggered this save is
    // lost, but a mutation call site must never throw because of it.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(QUEUE_CHANGE_EVENT));
  }
}

export function enqueue(entity: QueueEntity, operation: QueueOperation, payload: QueuePayload): QueueEntry {
  const entry: QueueEntry = {
    id: generateId(),
    entity,
    operation,
    payload,
    timestamp: Date.now(),
  };
  const queue = getQueue();
  queue.push(entry);
  saveQueue(queue);
  return entry;
}

export function removeEntry(id: string): void {
  saveQueue(getQueue().filter((e) => e.id !== id));
}

export function getQueueLength(): number {
  return getQueue().length;
}

/**
 * Heuristic for "this failed because we're offline / the request never
 * reached the server" vs. a genuine auth/validation/server error. Only the
 * former should be queued for later replay — queuing a real error (e.g. a
 * bad RLS policy, a constraint violation) would silently hide it from the
 * user and keep retrying forever.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (!error || typeof error !== 'object') return false;
  const e = error as { message?: unknown; name?: unknown };
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  if (!msg) return false;
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    (e.name === 'TypeError' && msg.includes('fetch'))
  );
}
