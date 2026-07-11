import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Without vitest's `globals: true` mode, React Testing Library's automatic
// afterEach cleanup never registers -- do it explicitly so each test starts
// with an empty document body.
afterEach(() => {
  cleanup();
});
