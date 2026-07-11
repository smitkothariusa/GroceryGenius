import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Without vitest's `globals: true` mode, React Testing Library's automatic
// afterEach cleanup never registers -- do it explicitly so each test starts
// with an empty document body.
afterEach(() => {
  cleanup();
});

// --- jsdom polyfills ---
// jsdom implements neither of these, but the authenticated App tree touches
// both (InstallBanner reads matchMedia('(display-mode: standalone)');
// recipe generation calls .scrollIntoView() on the results grid). Without
// them the components throw at render. Provide inert stubs so tests that
// exercise the real UI don't crash on unrelated browser APIs.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),      // deprecated
    removeListener: vi.fn(),   // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// Object URL helpers (used by print/export paths) — jsdom leaves them undefined.
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn();
}
