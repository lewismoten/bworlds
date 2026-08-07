import { describe, expect, it } from 'vitest';
import { createFrontierFlavorRuntimePlugin } from './index.ts';

type FrontierTestTile = {
  kind: string;
  note?: string;
  regionFlavor?: string;
};

describe('runtime frontier flavor', () => {
  it('adds regional flavor metadata and plains notes', () => {
    const plugin = createFrontierFlavorRuntimePlugin();
    const tile: FrontierTestTile = { kind: 'plains' };

    plugin.decorateOverworldTile?.({
      seed: 'spec',
      x: 12,
      y: -8,
      tile,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.2,
        roadSignal: 0.3,
      },
    } as any);

    expect(tile.regionFlavor).toMatch(/-/);
    expect(tile.note).toMatch(/^A .* stretch of .* rolls into the distance\.$/);
  });

  it('preserves existing notes while still adding region flavor', () => {
    const plugin = createFrontierFlavorRuntimePlugin();
    const tile: FrontierTestTile = { kind: 'plains', note: 'Existing note.' };

    plugin.decorateOverworldTile?.({
      seed: 'spec',
      x: 2,
      y: 3,
      tile,
      signals: {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.5,
        riverSignal: 0.2,
        roadSignal: 0.3,
      },
    } as any);

    expect(tile.regionFlavor).toBeTruthy();
    expect(tile.note).toBe('Existing note.');
  });
});
