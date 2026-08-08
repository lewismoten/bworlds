import { describe, expect, it } from 'vitest';
import { createWayfindingRuntimePlugin } from './index.ts';

type WayfindingTestTile = {
  kind: string;
  note?: string;
};

const plugin = createWayfindingRuntimePlugin();
type WayfindingDecorateTownPayload = Parameters<
  NonNullable<typeof plugin.decorateTownTile>
>[0];

function createWayfindingDecorateTownPayload(
  tile: WayfindingTestTile
): WayfindingDecorateTownPayload {
  return {
    context: { id: 'town:test', type: 'town', depth: 1 },
    x: 4,
    y: 0,
    seed: 'spec',
    tile,
  };
}

describe('runtime wayfinding', () => {
  it('decorates the town road at the expected market location', () => {
    const tile: WayfindingTestTile = { kind: 'road' };

    plugin.decorateTownTile?.(createWayfindingDecorateTownPayload(tile));

    expect(tile.note).toBe('The market is busy today.');
  });

  it('ignores unrelated town tiles', () => {
    const tile: WayfindingTestTile = { kind: 'floor' };

    plugin.decorateTownTile?.({
      ...createWayfindingDecorateTownPayload(tile),
      x: 1,
      y: 1,
      tile,
    });

    expect(tile.note).toBeUndefined();
  });
});
