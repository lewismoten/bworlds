import { describe, expect, it } from 'vitest';
import { getPlayerSpatialSummary } from './player-spatial-summary.ts';

describe('player spatial summary', () => {
  it('captures current context, tile, snapped grid coordinates, gps, and facing once', () => {
    const context = {
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
    } as const;
    const tile = {
      kind: 'plains',
      note: 'Open grass.',
    } as const;
    const state = {
      player: {
        x: 12.5,
        y: -4.25,
        facing: Math.PI / 3,
      },
      getCurrentContext() {
        return context;
      },
      getCurrentTile() {
        return tile;
      },
    };

    const summary = getPlayerSpatialSummary(state as never);

    expect(summary.context).toBe(context);
    expect(summary.tile).toBe(tile);
    expect(summary.gridX).toBe(13);
    expect(summary.gridY).toBe(-4);
    expect(summary.playerX).toBe(12.5);
    expect(summary.playerY).toBe(-4.25);
    expect(summary.facing).toBe(Math.PI / 3);
    expect(summary.gps).toEqual({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
    });
  });
});
