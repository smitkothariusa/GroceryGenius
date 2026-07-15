/**
 * The point of safeStorage is that a blocked/absent localStorage must never
 * throw into a caller, because the callers are `useState` initializers that
 * run during App's first render — a throw there crashed the whole app to the
 * root error boundary in production (13 `boundary:root` rows).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safeStorage } from './safeStorage';

const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

/** Replace window.localStorage for one test. `get` may throw, mimicking the
 *  SecurityError browsers raise on the property access itself. */
function stubStorage(get: () => Storage | null) {
  Object.defineProperty(window, 'localStorage', { get, configurable: true });
}

afterEach(() => {
  if (realStorage) Object.defineProperty(window, 'localStorage', realStorage);
});

describe('safeStorage with a working localStorage', () => {
  beforeEach(() => {
    if (realStorage) Object.defineProperty(window, 'localStorage', realStorage);
    window.localStorage.clear();
  });

  it('reads and writes through to the real store', () => {
    safeStorage.setItem('k', 'v');
    expect(window.localStorage.getItem('k')).toBe('v');
    expect(safeStorage.getItem('k')).toBe('v');
  });

  it('removes through to the real store', () => {
    window.localStorage.setItem('k', 'v');
    safeStorage.removeItem('k');
    expect(window.localStorage.getItem('k')).toBeNull();
    expect(safeStorage.getItem('k')).toBeNull();
  });

  it('returns null for a missing key', () => {
    expect(safeStorage.getItem('nope')).toBeNull();
  });
});

describe('safeStorage when localStorage ACCESS THROWS (blocked site data)', () => {
  // Chrome/Edge with site data blocked throw SecurityError on merely touching
  // window.localStorage — this is the case that took the app down.
  beforeEach(() => {
    stubStorage(() => {
      throw new DOMException(
        "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
        'SecurityError',
      );
    });
  });

  it('does not throw on read/write/remove', () => {
    expect(() => safeStorage.setItem('k', 'v')).not.toThrow();
    expect(() => safeStorage.getItem('k')).not.toThrow();
    expect(() => safeStorage.removeItem('k')).not.toThrow();
  });

  it('falls back to in-memory so preferences still work for the session', () => {
    safeStorage.setItem('activeTab', 'recipes');
    expect(safeStorage.getItem('activeTab')).toBe('recipes');
    safeStorage.removeItem('activeTab');
    expect(safeStorage.getItem('activeTab')).toBeNull();
  });
});

describe('safeStorage when localStorage is null (iOS webview)', () => {
  beforeEach(() => stubStorage(() => null));

  it('does not throw and falls back to in-memory', () => {
    expect(() => safeStorage.setItem('k', 'v')).not.toThrow();
    expect(safeStorage.getItem('k')).toBe('v');
    expect(safeStorage.getItem('absent')).toBeNull();
  });
});

describe('safeStorage when setItem throws (quota / private mode)', () => {
  it('still makes the value readable for the session', () => {
    const store = {
      getItem: () => null,
      setItem: () => { throw new DOMException('QuotaExceededError'); },
      removeItem: () => {},
    } as unknown as Storage;
    stubStorage(() => store);

    expect(() => safeStorage.setItem('k', 'v')).not.toThrow();
    expect(safeStorage.getItem('k')).toBe('v');
  });
});
