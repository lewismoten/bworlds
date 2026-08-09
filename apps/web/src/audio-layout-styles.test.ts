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
    expect(stylesheet).toContain('.audio-volume-controls');
    expect(stylesheet).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(stylesheet).toContain('.audio-volume-row output');
    expect(stylesheet).toContain('text-align: left;');
    expect(stylesheet).toContain('.build-controls select,');
    expect(stylesheet).toContain('.build-controls button');
  });
});
