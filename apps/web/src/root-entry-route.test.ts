import { describe, expect, it } from 'vitest';
import {
  ROOT_ENTRY_PAGE_PATHS,
  resolveRootEntryPagePath,
} from './root-entry-route.ts';

describe('root entry route', () => {
  it('tracks dedicated debug paths that should bypass the main game entry', () => {
    expect(ROOT_ENTRY_PAGE_PATHS).toEqual([
      '/debug/',
      '/debug/music/',
      '/debug/trees/',
    ]);
  });

  it('resolves dedicated debug pages and leaves the game route alone', () => {
    expect(resolveRootEntryPagePath('/debug')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug/')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug.html')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug/index.html')).toBe('/debug/');
    expect(resolveRootEntryPagePath('/debug/music')).toBe('/debug/music/');
    expect(resolveRootEntryPagePath('/debug/music/')).toBe('/debug/music/');
    expect(resolveRootEntryPagePath('/debug/music.html')).toBe('/debug/music/');
    expect(resolveRootEntryPagePath('/debug/music/index.html')).toBe(
      '/debug/music/'
    );
    expect(resolveRootEntryPagePath('/debug/trees')).toBe('/debug/trees/');
    expect(resolveRootEntryPagePath('/debug/trees/')).toBe('/debug/trees/');
    expect(resolveRootEntryPagePath('/debug/trees.html')).toBe('/debug/trees/');
    expect(resolveRootEntryPagePath('/debug/trees/index.html')).toBe(
      '/debug/trees/'
    );
    expect(resolveRootEntryPagePath('/')).toBeNull();
  });
});
