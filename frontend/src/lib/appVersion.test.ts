import { describe, it, expect } from 'vitest';
import { shouldReload } from './appVersion';

// shouldReload gates a hard page reload, so its safety (never reload on
// missing/garbage input) is what prevents a reload loop bricking clients.
describe('shouldReload', () => {
  it('reloads when the latest version differs from the current build', () => {
    expect(shouldReload('1720000000000', '1720000009999')).toBe(true);
  });

  it('does NOT reload when the versions match', () => {
    expect(shouldReload('1720000000000', '1720000000000')).toBe(false);
  });

  it('does NOT reload on a missing / empty / non-string latest (bad fetch, HTML error page, etc.)', () => {
    expect(shouldReload('1720000000000', undefined)).toBe(false);
    expect(shouldReload('1720000000000', null)).toBe(false);
    expect(shouldReload('1720000000000', '')).toBe(false);
    expect(shouldReload('1720000000000', 123)).toBe(false);
    expect(shouldReload('1720000000000', {})).toBe(false);
  });

  it('does NOT reload when the current build version is unknown', () => {
    expect(shouldReload(undefined, '1720000000000')).toBe(false);
    expect(shouldReload('', '1720000000000')).toBe(false);
  });
});
