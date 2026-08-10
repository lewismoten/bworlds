import { describe, expect, it } from 'vitest';
import {
  ROOT_ENTRY_PAGE_PATHS,
  resolveRootEntryHtmlPath,
  resolveRootEntryRoute,
  resolveRootEntryPagePath,
} from './root-entry-route.ts';

describe('root entry route', () => {
  it('tracks dedicated debug paths that should bypass the main game entry', () => {
    expect(ROOT_ENTRY_PAGE_PATHS).toEqual([
      '/debug/',
      '/debug/audio/',
      '/debug/sounds/',
      '/debug/trees/',
    ]);
  });

  it('resolves dedicated debug pages and leaves the game route alone', () => {
    expect(resolveRootEntryPagePath('/debug')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug/')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug.html')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug/index.html')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug/audio')).toBe('/debug/audio/');
    expect(resolveRootEntryPagePath('/debug/audio/')).toBe('/debug/audio/');
    expect(resolveRootEntryPagePath('/debug/audio.html')).toBe('/debug/audio/');
    expect(resolveRootEntryPagePath('/debug/audio/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveRootEntryPagePath('/debug/music')).toBe('/debug/audio/');
    expect(resolveRootEntryPagePath('/debug/music/')).toBe('/debug/audio/');
    expect(resolveRootEntryPagePath('/debug/music.html')).toBe('/debug/audio/');
    expect(resolveRootEntryPagePath('/debug/music/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveRootEntryPagePath('/debug/sounds')).toBe('/debug/sounds/');
    expect(resolveRootEntryPagePath('/debug/sounds/')).toBe('/debug/sounds/');
    expect(resolveRootEntryPagePath('/debug/sounds.html')).toBe(
      '/debug/sounds/'
    );
    expect(resolveRootEntryPagePath('/debug/sounds/index.html')).toBe(
      '/debug/sounds/'
    );
    expect(resolveRootEntryPagePath('/debug/trees')).toBe('/debug/trees/');
    expect(resolveRootEntryPagePath('/debug/trees/')).toBe('/debug/trees/');
    expect(resolveRootEntryPagePath('/debug/trees.html')).toBe('/debug/trees/');
    expect(resolveRootEntryPagePath('/debug/trees/index.html')).toBe(
      '/debug/trees/'
    );
    expect(resolveRootEntryPagePath('/')).toBeNull();
  });

  it('resolves debug routes mounted under a base path without losing their logical page', () => {
    expect(resolveRootEntryPagePath('/bworlds/debug')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/bworlds/debug/audio/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveRootEntryPagePath('/bworlds/debug/music/index.html')).toBe(
      '/debug/audio/'
    );
    expect(resolveRootEntryPagePath('/bworlds/debug/sounds/')).toBe(
      '/debug/sounds/'
    );
    expect(resolveRootEntryPagePath('/bworlds/debug/trees/')).toBe(
      '/debug/trees/'
    );

    expect(resolveRootEntryRoute('/bworlds/debug/index.html')).toEqual({
      pagePath: '/debug/',
      canonicalPathname: '/bworlds/debug/',
      entryHtmlPathname: '/bworlds/debug/index.html',
      matchedPathname: '/bworlds/debug/index.html',
      isAlias: true,
    });
  });

  it('resolves dedicated debug html entry files for canonical routes', () => {
    expect(resolveRootEntryHtmlPath('/debug/')).toBe('/debug/index.html');
    expect(resolveRootEntryHtmlPath('/debug/audio/')).toBe(
      '/debug/audio/index.html'
    );
    expect(resolveRootEntryHtmlPath('/debug/sounds/')).toBe(
      '/debug/sounds/index.html'
    );
    expect(resolveRootEntryHtmlPath('/debug/trees/')).toBe(
      '/debug/trees/index.html'
    );
    expect(resolveRootEntryHtmlPath('/bworlds/debug/')).toBe(
      '/bworlds/debug/index.html'
    );
    expect(resolveRootEntryHtmlPath('/')).toBeNull();
  });
});
