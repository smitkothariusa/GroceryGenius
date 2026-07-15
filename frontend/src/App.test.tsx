import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import './i18n';
import App from './App';

const realStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');

afterEach(() => {
  if (realStorage) Object.defineProperty(window, 'localStorage', realStorage);
});

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  // Regression: App reads localStorage in a `useState` initializer (activeTab),
  // as do RecipesContext (gg_recipe_mode) and AchievementsPanel (hidden). Those
  // run during the first render, so a browser that makes localStorage throw took
  // the whole tree down to the root error boundary — a crashed app, not a
  // degraded one. Production logged 13 such `boundary:root` rows ("Failed to
  // read the 'localStorage' property...", "null is not an object (evaluating
  // 'localStorage.getItem')"). Reads now go through lib/safeStorage.
  it('renders when localStorage ACCESS THROWS (site data blocked)', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException(
          "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
          'SecurityError',
        );
      },
    });

    expect(() => render(<App />)).not.toThrow();
  });

  it('renders when localStorage is null (iOS in-app webview)', () => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => null });

    expect(() => render(<App />)).not.toThrow();
  });
});
