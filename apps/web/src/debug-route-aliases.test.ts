import { describe, expect, it } from 'vitest';
import {
  DEBUG_ROUTE_ALIASES,
  resolveDebugRouteRedirect,
} from './debug-route-aliases.ts';

describe('debug route aliases', () => {
  it('tracks slashless debug entry routes that should redirect to canonical urls', () => {
    expect(DEBUG_ROUTE_ALIASES).toEqual([
      '/debug',
      '/debug/index.html',
      '/debug/music',
      '/debug/music/index.html',
      '/debug/trees',
      '/debug/trees/index.html',
    ]);
  });

  it('redirects slashless debug routes to their trailing slash entry pages', () => {
    expect(resolveDebugRouteRedirect('/debug')).toBe('/debug/');
    expect(resolveDebugRouteRedirect('/debug/index.html')).toBe('/debug/');
    expect(resolveDebugRouteRedirect('/debug/music')).toBe('/debug/music/');
    expect(resolveDebugRouteRedirect('/debug/music/index.html')).toBe(
      '/debug/music/'
    );
    expect(resolveDebugRouteRedirect('/debug/trees')).toBe('/debug/trees/');
    expect(resolveDebugRouteRedirect('/debug/trees/index.html')).toBe(
      '/debug/trees/'
    );
  });

  it('leaves canonical and unrelated routes alone', () => {
    expect(resolveDebugRouteRedirect('/debug/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/music/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/trees/')).toBeNull();
    expect(resolveDebugRouteRedirect('/')).toBeNull();
    expect(resolveDebugRouteRedirect('/town')).toBeNull();
  });
});
