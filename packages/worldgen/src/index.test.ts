import { describe, expect, it } from 'vitest';
import { PluginRegistry } from '@bworlds/plugin-api';
import { createWorldGenerator, defaultPlugins } from './index.ts';

function createGenerator() {
  const plugins = new PluginRegistry();
  for (const plugin of defaultPlugins) plugins.register(plugin);
  return createWorldGenerator({ seed: 'spec', plugins });
}

describe('world generator', () => {
  it('is deterministic for overworld tiles', () => {
    const generator = createGenerator();
    expect(generator.sampleOverworld(10, 20)).toEqual(
      generator.sampleOverworld(10, 20)
    );
  });

  it('creates enterable points of interest somewhere near the origin', () => {
    const generator = createGenerator();
    let found = null;
    for (let y = -300; y <= 300 && !found; y += 1) {
      for (let x = -300; x <= 300; x += 1) {
        const tile = generator.sampleOverworld(x, y);
        if (tile.poi) {
          found = tile;
          break;
        }
      }
    }
    expect(found?.poi?.type).toMatch(/town|dungeon|cave/);
  });
});
