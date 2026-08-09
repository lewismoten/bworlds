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
      '/debug/audio',
      '/debug/audio/index.html',
      '/debug/audio.html',
      '/debug/music',
      '/debug/music/index.html',
      '/debug/music.html',
      '/debug/trees',
      '/debug/trees/index.html',
    ]);
  });

  it('redirects slashless debug routes to their trailing slash entry pages', () => {
    expect(resolveDebugRouteRedirect('/debug')).toBe('/debug/');
    expect(resolveDebugRouteRedirect('/debug/index.html')).toBe('/debug/');
    expect(resolveDebugRouteRedirect('/debug/audio')).toBe('/debug/audio/');
    expect(resolveDebugRouteRedirect('/debug/audio/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/debug/audio.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/debug/music')).toBe('/debug/audio/');
    expect(resolveDebugRouteRedirect('/debug/music/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/debug/music.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/debug/trees')).toBe('/debug/trees/');
    expect(resolveDebugRouteRedirect('/debug/trees/index.html')).toBe(
      '/debug/trees/'
    );
  });

  it('preserves a mounted base path when redirecting debug routes', () => {
    expect(resolveDebugRouteRedirect('/bworlds/debug')).toBe('/bworlds/debug/');
    expect(resolveDebugRouteRedirect('/bworlds/debug/audio')).toBe(
      '/bworlds/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/music')).toBe(
      '/bworlds/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/trees/index.html')).toBe(
      '/bworlds/debug/trees/'
    );
  });

  it('leaves canonical and unrelated routes alone', () => {
    expect(resolveDebugRouteRedirect('/debug/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/audio/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/trees/')).toBeNull();
    expect(resolveDebugRouteRedirect('/')).toBeNull();
    expect(resolveDebugRouteRedirect('/town')).toBeNull();
  });
});
