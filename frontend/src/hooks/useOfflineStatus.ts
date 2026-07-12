import { useCallback, useEffect, useRef, useState } from 'react';
import { getQueueLength, QUEUE_CHANGE_EVENT, ITEM_SYNCED_EVENT, type QueueEntity, type ItemSyncedDetail } from '../lib/offlineQueue';
import { drainOfflineQueue } from '../lib/database';

interface UseOfflineStatusOptions {
  /** Called after a drain successfully syncs 1+ queued entries (for a success toast). */
  onSynced?: (syncedCount: number) => void;
  /** Called for each queued 'add' that synced, so callers can swap the client-side temp id for the real one in local UI state. */
  onItemSynced?: (entity: QueueEntity, tempId: string, realId: string) => void;
}

interface UseOfflineStatusResult {
  /** navigator.onLine, kept live via 'online'/'offline' listeners. */
  isOnline: boolean;
  /** Entries currently waiting in the offline queue. */
  pendingCount: number;
  /** True while a drain is in flight. */
  isSyncing: boolean;
}

/**
 * Tracks browser online/offline state and drives the offline mutation queue
 * (frontend/src/lib/offlineQueue.ts + database.ts's drainOfflineQueue): it
 * drains once on mount if the queue is non-empty, and again every time the
 * browser fires 'online'. Mount this once near the app root (see App.tsx) —
 * it doesn't own any UI itself, just state + side effects for OfflineBanner
 * and the app-level toast/reconciliation callbacks to consume.
 */
export function useOfflineStatus(options?: UseOfflineStatusOptions): UseOfflineStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [pendingCount, setPendingCount] = useState<number>(() => getQueueLength());
  const [isSyncing, setIsSyncing] = useState(false);

  const drainingRef = useRef(false);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const drain = useCallback(async () => {
    if (drainingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    drainingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await drainOfflineQueue();
      setPendingCount(getQueueLength());
      if (result.syncedCount > 0 && !result.stoppedOnError) {
        optionsRef.current?.onSynced?.(result.syncedCount);
      }
    } finally {
      drainingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      drain();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = () => setPendingCount(getQueueLength());
    const handleItemSynced = (e: Event) => {
      const detail = (e as CustomEvent<ItemSyncedDetail>).detail;
      if (detail) {
        optionsRef.current?.onItemSynced?.(detail.entity, detail.tempId, detail.realId);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(QUEUE_CHANGE_EVENT, handleQueueChange);
    window.addEventListener(ITEM_SYNCED_EVENT, handleItemSynced);

    // Once on mount: the app may have been reloaded while entries were
    // still queued from a previous offline session.
    if (getQueueLength() > 0 && (typeof navigator === 'undefined' || navigator.onLine)) {
      drain();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(QUEUE_CHANGE_EVENT, handleQueueChange);
      window.removeEventListener(ITEM_SYNCED_EVENT, handleItemSynced);
    };
  }, [drain]);

  return { isOnline, pendingCount, isSyncing };
}
