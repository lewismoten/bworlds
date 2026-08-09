import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('main layout and hmr wiring', () => {
  it('keeps celestial tabs in the sidebar while moving secondary controls below the dashboard', () => {
    const source = readSource('apps/web/src/main.ts');

    expect(source).toContain('<aside class="sidebar">');
    expect(source).toContain('<div class="card" id="celestial-tools-card">');
    expect(source).toContain('<section class="utility-panels">');
    expect(source).toContain('<h2>Content Packs</h2>');
    expect(source).toContain('<h2>Status</h2>');
    expect(source).toContain('<h2>Legend</h2>');
    expect(source).toContain('<h2>Controls</h2>');
  });

  it('cleans up global main-page listeners during hot replacement', () => {
    const source = readSource('apps/web/src/main.ts');

    expect(source).toContain('const pageLifecycleAbortController =');
    expect(source).toContain('pageLifecycleSignal');
    expect(source).toContain('pageLifecycleAbortController?.abort();');
    expect(source).toContain("window.addEventListener(\n  'keydown'");
    expect(source).toContain('capture: true, signal: pageLifecycleSignal');
  });
});

describe('debug page hot-update persistence', () => {
  it('cleans up page listeners for debug directory, audio debug, and tree debug pages', () => {
    const debugDirectorySource = readSource(
      'apps/web/src/debug-directory-page.ts'
    );
    const musicDebugSource = readSource('apps/web/src/music-debug-page.ts');
    const treeDebugSource = readSource('apps/web/src/tree-debug-page.ts');

    expect(debugDirectorySource).toContain(
      'const pageLifecycleAbortController ='
    );
    expect(debugDirectorySource).toContain(
      'pageLifecycleAbortController?.abort();'
    );

    expect(musicDebugSource).toContain('const pageLifecycleAbortController =');
    expect(musicDebugSource).toContain(
      'pageLifecycleAbortController?.abort();'
    );

    expect(treeDebugSource).toContain('const pageLifecycleAbortController =');
    expect(treeDebugSource).toContain('pageLifecycleAbortController?.abort();');
  });
});
