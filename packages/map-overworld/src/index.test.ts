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
      throw new Error(
        'Expected overworld map plugin to create an overworld map.'
      );
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

describe('map overworld balloon travel', () => {
  it('offers a balloon action from open ground near a road', () => {
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
            return { kind: 'road' };
          }
          return { kind: 'plains' };
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
      throw new Error(
        'Expected overworld map plugin to create an overworld map.'
      );
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
          type: 'balloon',
          destination: { x: 8, y: 0 },
        }),
        spawn: { x: 0, y: 1 },
      })
    );
  });
});

describe('map overworld blimp travel', () => {
  it('offers a blimp action from open ground near a station', () => {
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
            return { kind: 'station' };
          }
          return { kind: 'plains' };
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
      throw new Error(
        'Expected overworld map plugin to create an overworld map.'
      );
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
          type: 'blimp',
          destination: { x: 12, y: 0 },
        }),
        spawn: { x: 0, y: 1 },
      })
    );
  });
});

describe('map overworld plane travel', () => {
  it('offers a plane action from a straight road runway', () => {
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
          if (y === 0 && x >= 0 && x <= 3) {
            return { kind: 'road' };
          }
          return { kind: 'plains' };
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
      throw new Error(
        'Expected overworld map plugin to create an overworld map.'
      );
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
          type: 'plane',
          destination: { x: 16, y: 0 },
        }),
        spawn: { x: 0, y: 1 },
      })
    );
  });
});

describe('map overworld airship travel', () => {
  it('offers an airship action from land beside a ship', () => {
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
            return { kind: 'ship' };
          }
          return { kind: 'plains' };
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
      throw new Error(
        'Expected overworld map plugin to create an overworld map.'
      );
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
          type: 'airship',
          destination: { x: 18, y: 0 },
        }),
        spawn: { x: 0, y: 1 },
      })
    );
  });
});

describe('map overworld caching', () => {
  it('keeps overworld tiles deterministic after bounded cache eviction churn', () => {
    const plugin = createOverworldCompositionPlugin();
    const map = plugin.createMap?.({
      seed: 'cache-spec',
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
          if ((x + y) % 11 === 0) {
            return { kind: 'forest' };
          }
          if (x % 7 === 0) {
            return { kind: 'road' };
          }
          if (y % 5 === 0) {
            return { kind: 'river' };
          }
          return { kind: 'plains' };
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
      throw new Error(
        'Expected overworld map plugin to create an overworld map.'
      );
    }

    const baseline = map.getTile(13, 17);

    for (let index = 0; index < 9000; index += 1) {
      map.getTile((index % 180) - 90, Math.floor(index / 180) - 25);
    }

    expect(map.getTile(13, 17)).toEqual(baseline);
  });
});
