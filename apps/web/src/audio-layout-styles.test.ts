import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('audio layout styles', () => {
  it('keeps audio parameter controls responsive on skinny screens', () => {
    const stylesheet = fs.readFileSync(
      path.join(process.cwd(), 'apps/web/src/styles.css'),
      'utf8'
    );

    expect(stylesheet).toContain('@media (max-width: 720px)');
    expect(stylesheet).toContain('.control-dock');
    expect(stylesheet).toContain('position: fixed;');
    expect(stylesheet).toContain(
      '--control-dock-offset: max(0.75rem, env(safe-area-inset-bottom, 0px));'
    );
    expect(stylesheet).toContain(
      '--control-dock-height: clamp(4.5rem, 9vh, 6rem);'
    );
    expect(stylesheet).toContain('bottom: var(--control-dock-offset);');
    expect(stylesheet).toContain(
      'calc(var(--control-dock-height) + var(--control-dock-offset) + 0.75rem);'
    );
    expect(stylesheet).toContain('.dock-row');
    expect(stylesheet).toContain('display: flex;');
    expect(stylesheet).toContain('flex-wrap: nowrap;');
    expect(stylesheet).toContain('left: 0.75rem;');
    expect(stylesheet).toContain('right: 0.75rem;');
    expect(stylesheet).toContain('width: calc(100vw - 1.5rem);');
    expect(stylesheet).toContain('max-width: 72rem;');
    expect(stylesheet).toContain('.dock-icon-button');
    expect(stylesheet).toContain('overflow-x: auto;');
    expect(stylesheet).toContain('justify-content: space-between;');
    expect(stylesheet).toContain('.audio-volume-controls');
    expect(stylesheet).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(stylesheet).toContain('.audio-volume-row output');
    expect(stylesheet).toContain('text-align: left;');
    expect(stylesheet).toContain('.build-controls select,');
    expect(stylesheet).toContain('.build-controls button');
  });
});
