import path from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../vite.config.ts';

describe('web vite config', () => {
  it('publishes debug entry aliases for routes without trailing slashes', () => {
    const input = config.build?.rollupOptions?.input;

    expect(input).toEqual(
      expect.objectContaining({
        debug: path.join(process.cwd(), 'apps/web', 'debug', 'index.html'),
        debugAlias: path.join(process.cwd(), 'apps/web', 'debug.html'),
        debugMusic: path.join(process.cwd(), 'apps/web', 'debug', 'music', 'index.html'),
        debugMusicAlias: path.join(process.cwd(), 'apps/web', 'debug', 'music.html'),
      })
    );
  });
});
