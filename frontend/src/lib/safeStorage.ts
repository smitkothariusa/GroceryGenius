// frontend/src/lib/safeStorage.ts

/**
 * localStorage that can't crash the app.
 *
 * `localStorage` is not always usable, and the failure is not a friendly
 * `undefined` — it throws or is null:
 *   - Chrome/Edge with "Block third-party cookies"/site data blocked throw
 *     `SecurityError: Failed to read the 'localStorage' property from
 *     'Window': Access is denied for this document.` on merely *touching*
 *     `window.localStorage`, before any getItem call.
 *   - Some iOS/embedded webviews (in-app browsers) expose it as null, giving
 *     `null is not an object (evaluating 'localStorage.getItem')`.
 *   - Safari Private Browsing and full-quota devices throw on setItem.
 *
 * Both of the first two were hitting the ROOT error boundary in production
 * (13 `boundary:root` rows in error_logs), i.e. a fully crashed app rather
 * than a degraded one — because the reads run inside `useState` initializers
 * during App's first render (App.tsx's `activeTab`, RecipesContext's
 * `gg_recipe_mode`, AchievementsPanel's `hidden`), so a throw there takes the
 * whole tree down.
 *
 * Every value stored through here is a UI preference (active tab, recipe mode,
 * dismissed banners, cached location). None of it is worth a crash, so when
 * the real store is unavailable we fall back to an in-memory map: preferences
 * then last for the session instead of persisting, which is the correct
 * degradation for a private/blocked-storage context anyway.
 */

const memory = new Map<string, string>();

/** The real store, or null when it's blocked/absent/throwing. */
function backingStore(): Storage | null {
  try {
    // NOTE: this property access is itself what throws under blocked storage,
    // which is why it lives inside the try rather than being read once at
    // module scope — doing that at import time would crash before React mounts
    // and defeat the whole purpose of this module.
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export const safeStorage = {
  getItem(key: string): string | null {
    const store = backingStore();
    if (!store) return memory.get(key) ?? null;
    try {
      // Prefer the persisted value, but fall back to memory: setItem may have
      // failed (quota/private mode) on an otherwise-readable store, in which
      // case the value only ever made it into `memory` and would otherwise be
      // invisible to the very session that just wrote it.
      return store.getItem(key) ?? memory.get(key) ?? null;
    } catch {
      return memory.get(key) ?? null;
    }
  },

  setItem(key: string, value: string): void {
    const store = backingStore();
    if (store) {
      try {
        store.setItem(key, value);
        return;
      } catch {
        // Quota exceeded or blocked mid-session — fall through to memory so the
        // value is at least readable for the rest of this session.
      }
    }
    memory.set(key, value);
  },

  removeItem(key: string): void {
    memory.delete(key);
    const store = backingStore();
    if (!store) return;
    try {
      store.removeItem(key);
    } catch {
      // Already gone from the memory fallback; nothing else to do.
    }
  },
};
