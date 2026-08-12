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
      '/debug/ambience',
      '/debug/ambience/index.html',
      '/debug/ambience.html',
      '/debug/music',
      '/debug/music/index.html',
      '/debug/music.html',
      '/debug/sounds',
      '/debug/sounds/index.html',
      '/debug/sounds.html',
      '/debug/sound-bank',
      '/debug/sound-bank/index.html',
      '/debug/sound-bank.html',
      '/debug/trees',
      '/debug/trees/index.html',
      '/debug/terrain-chunks',
      '/debug/terrain-chunks/index.html',
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
    expect(resolveDebugRouteRedirect('/debug/ambience')).toBe(
      '/debug/ambience/'
    );
    expect(resolveDebugRouteRedirect('/debug/ambience/index.html')).toBe(
      '/debug/ambience/'
    );
    expect(resolveDebugRouteRedirect('/debug/ambience.html')).toBe(
      '/debug/ambience/'
    );
    expect(resolveDebugRouteRedirect('/debug/music')).toBe('/debug/audio/');
    expect(resolveDebugRouteRedirect('/debug/music/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/debug/music.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/debug/sounds')).toBe('/debug/sounds/');
    expect(resolveDebugRouteRedirect('/debug/sounds/index.html')).toBe(
      '/debug/sounds/'
    );
    expect(resolveDebugRouteRedirect('/debug/sounds.html')).toBe(
      '/debug/sounds/'
    );
    expect(resolveDebugRouteRedirect('/debug/sound-bank')).toBe(
      '/debug/sound-bank/'
    );
    expect(resolveDebugRouteRedirect('/debug/sound-bank/index.html')).toBe(
      '/debug/sound-bank/'
    );
    expect(resolveDebugRouteRedirect('/debug/sound-bank.html')).toBe(
      '/debug/sound-bank/'
    );
    expect(resolveDebugRouteRedirect('/debug/trees')).toBe('/debug/trees/');
    expect(resolveDebugRouteRedirect('/debug/trees/index.html')).toBe(
      '/debug/trees/'
    );
    expect(resolveDebugRouteRedirect('/debug/terrain-chunks')).toBe(
      '/debug/terrain-chunks/'
    );
    expect(resolveDebugRouteRedirect('/debug/terrain-chunks/index.html')).toBe(
      '/debug/terrain-chunks/'
    );
  });

  it('preserves a mounted base path when redirecting debug routes', () => {
    expect(resolveDebugRouteRedirect('/bworlds/debug')).toBe('/bworlds/debug/');
    expect(resolveDebugRouteRedirect('/bworlds/debug/audio')).toBe(
      '/bworlds/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/ambience')).toBe(
      '/bworlds/debug/ambience/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/music')).toBe(
      '/bworlds/debug/audio/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/sounds')).toBe(
      '/bworlds/debug/sounds/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/sound-bank')).toBe(
      '/bworlds/debug/sound-bank/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/trees/index.html')).toBe(
      '/bworlds/debug/trees/'
    );
    expect(resolveDebugRouteRedirect('/bworlds/debug/terrain-chunks')).toBe(
      '/bworlds/debug/terrain-chunks/'
    );
  });

  it('leaves canonical and unrelated routes alone', () => {
    expect(resolveDebugRouteRedirect('/debug/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/audio/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/ambience/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/sounds/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/sound-bank/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/trees/')).toBeNull();
    expect(resolveDebugRouteRedirect('/debug/terrain-chunks/')).toBeNull();
    expect(resolveDebugRouteRedirect('/')).toBeNull();
    expect(resolveDebugRouteRedirect('/town')).toBeNull();
  });
});
