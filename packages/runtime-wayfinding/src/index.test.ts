import { describe, expect, it } from 'vitest';
import { createWayfindingRuntimePlugin } from './index.ts';

type WayfindingTestTile = {
  kind: string;
  note?: string;
};

describe('runtime wayfinding', () => {
  it('decorates the town road at the expected market location', () => {
    const plugin = createWayfindingRuntimePlugin();
    const tile: WayfindingTestTile = { kind: 'road' };

    plugin.decorateTownTile?.({
      context: { id: 'town:test', type: 'town', depth: 1 },
      x: 4,
      y: 0,
      seed: 'spec',
      tile,
    } as any);

    expect(tile.note).toBe('The market is busy today.');
  });

  it('ignores unrelated town tiles', () => {
    const plugin = createWayfindingRuntimePlugin();
    const tile: WayfindingTestTile = { kind: 'floor' };

    plugin.decorateTownTile?.({
      context: { id: 'town:test', type: 'town', depth: 1 },
      x: 1,
      y: 1,
      seed: 'spec',
      tile,
    } as any);

    expect(tile.note).toBeUndefined();
  });
});
