import { describe, expect, it } from 'vitest';
import {
  DEBUG_ROUTE_ALIASES,
  resolveDebugRouteRedirect,
} from './debug-route-aliases.ts';

describe('debug route aliases', () => {
  it('tracks slashless debug entry routes that should redirect to canonical urls', () => {
    expect(DEBUG_ROUTE_ALIASES).toEqual(['/debug', '/debug/music']);
  });

  it('redirects slashless debug routes to their trailing slash entry pages', () => {
    expect(resolveDebugRouteRedirect('/debug')).toBe('/debug/');
    expect(resolveDebugRouteRedirect('/debug/music')).toBe('/debug/music/');
  });

  it('leaves canonical and unrelated routes alone', () => {
    expect(resolveDebugRouteRedirect('/debug/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/music/')).toBeNull();
    expect(resolveDebugRouteRedirect('/')).toBeNull();
    expect(resolveDebugRouteRedirect('/town')).toBeNull();
  });
});
