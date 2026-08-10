import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('music debug layout styles', () => {
  it('keeps the music debug control panel from clipping on the right', () => {
    const stylesheet = fs.readFileSync(
      path.join(process.cwd(), 'apps/web/src/music-debug.css'),
      'utf8'
    );

    expect(stylesheet).toContain('.music-debug-card {\n  min-width: 0;');
    expect(stylesheet).toContain(
      '.music-debug-grid {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));'
    );
    expect(stylesheet).toContain('.music-debug-actions {\n  display: grid;');
    expect(stylesheet).toContain(
      'grid-template-columns: repeat(2, minmax(0, 1fr));'
    );
    expect(stylesheet).toContain('.music-debug-actions > * {\n  min-width: 0;');
    expect(stylesheet).toContain(
      '.music-debug-export-controls {\n  display: grid;'
    );
    expect(stylesheet).toContain(
      '.music-debug-export-label {\n  display: flex;'
    );
    expect(stylesheet).toContain('.music-debug-toggle {\n  display: flex;');
    expect(stylesheet).toContain('@media (max-width: 960px)');
    expect(stylesheet).toContain(
      '.music-debug-actions {\n    grid-template-columns: 1fr;'
    );
  });
});
