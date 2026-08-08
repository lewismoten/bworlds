import { describe, expect, it } from 'vitest';
import { createOverworldCompositionPlugin } from './index.ts';

describe('map overworld glider travel', () => {
  it('offers a glider action from mountain-adjacent high ground', () => {
    const plugin = createOverworldCompositionPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      context: {
        id: 'overworld',
        label: 'Overworld',
        type: 'overworld',
        depth: 0,
        origin: { x: 0, y: 0 },
      },
      plugins: {
        getDefaultTileKind() {
          return 'plains';
        },
        getTileDefinition(kind: string) {
          return {
            name: kind,
            color: '#000',
            miniColor: '#111',
            walkable: !['mountain', 'ocean', 'river', 'wall'].includes(kind),
            wallHeight: 0,
          };
        },
        createWorldAction() {
          return null;
        },
        classifyTerrainTile({ x, y }: { x: number; y: number }) {
          if (x === 0 && y === -1) {
            return { kind: 'mountain' };
          }
          if (x >= 4) {
            return { kind: 'plains' };
          }
          return { kind: 'road' };
        },
        classifyOverworldTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateOverworldTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateTownTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateBuildingTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateDepthTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        resolveOverworldTile() {
          return null;
        },
        resolveOverworldAnchors() {
          return {
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors: [],
          };
        },
      } as never,
    });
    if (!map) {
      throw new Error('Expected overworld map plugin to create an overworld map.');
    }

    const action = map.getAction?.(0, 0, {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentTile(sampleX: number, sampleY: number) {
        return map.getTile(sampleX, sampleY);
      },
    } as never);

    expect(action).toEqual(
      expect.objectContaining({
        type: 'enter',
        context: expect.objectContaining({
          type: 'glider',
          destination: { x: 4, y: 0 },
        }),
        spawn: { x: 0, y: 1 },
      })
    );
  });
});
