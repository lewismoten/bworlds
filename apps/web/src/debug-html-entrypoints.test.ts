import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DEBUG_HTML_ENTRY_PATHS = [
  'apps/web/debug.html',
  'apps/web/debug/index.html',
  'apps/web/debug/audio.html',
  'apps/web/debug/audio/index.html',
  'apps/web/debug/ambience.html',
  'apps/web/debug/ambience/index.html',
  'apps/web/debug/music.html',
  'apps/web/debug/music/index.html',
  'apps/web/debug/sounds.html',
  'apps/web/debug/sounds/index.html',
  'apps/web/debug/trees.html',
  'apps/web/debug/trees/index.html',
] as const;

describe('debug html entrypoints', () => {
  it('route every debug entry through the shared app bootstrap', () => {
    for (const relativePath of DEBUG_HTML_ENTRY_PATHS) {
      const html = fs.readFileSync(
        path.join(process.cwd(), relativePath),
        'utf8'
      );

      expect(html).toContain('<script type="module" src="/src/app-entry.ts">');
    }
  });
});
