import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('main layout and hmr wiring', () => {
  it('keeps the game viewport first while preserving the sidebar and compact dock controls', () => {
    const source = readSource('apps/web/src/main.ts');
    const stylesheet = readSource('apps/web/src/styles.css');

    expect(source).not.toContain('<section class="hero">');
    expect(source).toContain('<aside class="sidebar">');
    expect(source).toContain('<div class="card" id="celestial-tools-card">');
    expect(source).not.toContain('<section class="utility-panels">');
    expect(source).toContain(
      '<section class="control-dock card" aria-label="Quick controls">'
    );
    expect(source).toContain('<div class="dock-row">');
    expect(source).not.toContain('<div class="controls controls-compact">');
    expect(source).not.toContain('id="content-pack-label"');
    expect(source).not.toContain('id="content-pack-form"');
    expect(source).not.toContain('id="status"');
    expect(source).toContain(
      '</main>\n  <div class="app-utility-storage" aria-hidden="true">'
    );
    expect(stylesheet).toContain('.control-dock {\n  position: fixed;');
    expect(stylesheet).toContain('display: flex;');
    expect(stylesheet).toContain('left: 0.75rem;');
    expect(stylesheet).toContain('right: 0.75rem;');
    expect(stylesheet).toContain('width: auto;');
    expect(stylesheet).toContain('max-width: none;');
    expect(stylesheet).toContain('.dock-row {\n  display: grid;');
    expect(stylesheet).toContain('grid-auto-flow: column;');
    expect(stylesheet).not.toContain('.controls-compact {\n  display: flex;');
    expect(stylesheet).toContain('width: 100%;');
    expect(stylesheet).toContain('justify-content: center;');
    expect(stylesheet).toContain('.dashboard {\n  display: grid;');
    expect(stylesheet).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(stylesheet).toContain('.inspector-header {\n  display: flex;');
    expect(stylesheet).toContain('justify-content: flex-start;');
    expect(stylesheet).toContain('.inspector-tabs {\n  display: flex;');
    expect(stylesheet).toContain('overflow-x: auto;');
    expect(stylesheet).toContain('.inspector-tab {');
    expect(stylesheet).toContain('flex: 0 0 auto;');
    expect(stylesheet).not.toContain('id="content-pack-label"');
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
    const ambienceDebugSource = readSource(
      'apps/web/src/ambience-debug-page.ts'
    );
    const musicDebugSource = readSource('apps/web/src/music-debug-page.ts');
    const soundDebugSource = readSource('apps/web/src/sound-debug-page.ts');
    const treeDebugSource = readSource('apps/web/src/tree-debug-page.ts');

    expect(debugDirectorySource).toContain(
      'const pageLifecycleAbortController ='
    );
    expect(debugDirectorySource).toContain(
      'pageLifecycleAbortController?.abort();'
    );

    expect(ambienceDebugSource).toContain(
      'const pageLifecycleAbortController ='
    );
    expect(ambienceDebugSource).toContain(
      'pageLifecycleAbortController?.abort();'
    );

    expect(musicDebugSource).toContain('const pageLifecycleAbortController =');
    expect(musicDebugSource).toContain(
      'pageLifecycleAbortController?.abort();'
    );

    expect(soundDebugSource).toContain('const pageLifecycleAbortController =');
    expect(soundDebugSource).toContain(
      'pageLifecycleAbortController?.abort();'
    );

    expect(treeDebugSource).toContain('const pageLifecycleAbortController =');
    expect(treeDebugSource).toContain('pageLifecycleAbortController?.abort();');
  });
});
