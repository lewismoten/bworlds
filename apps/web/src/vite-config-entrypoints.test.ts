import path from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../vite.config.ts';

describe('web vite config', () => {
  it('serves the web app as a multi-page app so debug entrypoints do not fall back to the main explorer', () => {
    expect(config.appType).toBe('mpa');
  });

  it('publishes debug entry aliases for routes without trailing slashes', () => {
    const input = config.build?.rollupOptions?.input;

    expect(input).toEqual(
      expect.objectContaining({
        debug: path.join(process.cwd(), 'apps/web', 'debug', 'index.html'),
        debugAlias: path.join(process.cwd(), 'apps/web', 'debug.html'),
        debugAudio: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'audio',
          'index.html'
        ),
        debugAudioAlias: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'audio.html'
        ),
        debugMusic: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'music',
          'index.html'
        ),
        debugMusicAlias: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'music.html'
        ),
        debugSounds: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'sounds',
          'index.html'
        ),
        debugSoundsAlias: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'sounds.html'
        ),
        debugTrees: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'trees',
          'index.html'
        ),
        debugTreesAlias: path.join(
          process.cwd(),
          'apps/web',
          'debug',
          'trees.html'
        ),
      })
    );
  });
});
