import { describe, expect, it } from 'vitest';
import { resolveAppBootstrapRoute } from './app-bootstrap-route.ts';

describe('app bootstrap route', () => {
  it('keeps dedicated debug pages on the debug entry even when the browser starts on slashless aliases', () => {
    expect(
      resolveAppBootstrapRoute({
        pathname: '/debug',
        search: '?seed=123',
        hash: '#music',
      })
    ).toEqual({
      canonicalUrl: '/debug/?seed=123#music',
      pagePath: '/debug/',
    });
  });

  it('keeps dedicated debug pages on the debug entry when the app is mounted under a base path', () => {
    expect(
      resolveAppBootstrapRoute({
        pathname: '/bworlds/debug/index.html',
        search: '?seed=123',
      })
    ).toEqual({
      canonicalUrl: '/bworlds/debug/?seed=123',
      pagePath: '/debug/',
    });
  });

  it('resolves canonical debug entry pages without forcing another redirect', () => {
    expect(
      resolveAppBootstrapRoute({
        pathname: '/debug/music/',
      })
    ).toEqual({
      canonicalUrl: null,
      pagePath: '/debug/music/',
    });
  });

  it('leaves the main game route alone', () => {
    expect(
      resolveAppBootstrapRoute({
        pathname: '/',
      })
    ).toEqual({
      canonicalUrl: null,
      pagePath: null,
    });
  });
});
