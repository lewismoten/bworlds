import { describe, expect, it, vi } from 'vitest';
import {
  buildCanonicalDebugRouteUrl,
  redirectToCanonicalDebugRoute,
} from './debug-route-guard.ts';

describe('debug route guard', () => {
  it('builds canonical urls for slashless debug entry routes', () => {
    expect(
      buildCanonicalDebugRouteUrl({
        pathname: '/debug',
        search: '?seed=123',
        hash: '#music',
      })
    ).toBe('/debug/?seed=123#music');

    expect(
      buildCanonicalDebugRouteUrl({
        pathname: '/debug/music',
      })
    ).toBe('/debug/audio/');

    expect(
      buildCanonicalDebugRouteUrl({
        pathname: '/bworlds/debug',
        search: '?seed=123',
      })
    ).toBe('/bworlds/debug/?seed=123');
  });

  it('skips non-debug routes and already canonical debug pages', () => {
    expect(
      buildCanonicalDebugRouteUrl({
        pathname: '/',
      })
    ).toBeNull();

    expect(
      buildCanonicalDebugRouteUrl({
        pathname: '/debug/',
      })
    ).toBeNull();
  });

  it('redirects through location.replace only when needed', () => {
    const replace = vi.fn();

    expect(
      redirectToCanonicalDebugRoute({
        pathname: '/debug/trees',
        replace,
      })
    ).toBe(true);
    expect(replace).toHaveBeenCalledWith('/debug/trees/');

    replace.mockClear();

    expect(
      redirectToCanonicalDebugRoute({
        pathname: '/play',
        replace,
      })
    ).toBe(false);
    expect(replace).not.toHaveBeenCalled();
  });
});
