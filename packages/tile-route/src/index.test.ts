import { describe, expect, it } from 'vitest';
import { createRouteTilePlugin } from './index.ts';

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  constructor(public options: Record<string, unknown> = {}) {}
}

class FakeNode {
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
      return this.position;
    },
  };
  rotation = { x: 0, y: 0, z: 0 };
  userData?: Record<string, unknown>;
  children: FakeNode[] = [];
  add(...children: FakeNode[]) {
    this.children.push(...children);
    return this;
  }
  traverse(visit: (child: FakeNode) => void) {
    visit(this);
    this.children.forEach((child) => child.traverse(visit));
  }
}

class FakeGroup extends FakeNode {}

class FakeMesh extends FakeNode {
  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
} as const;

const plugin = createRouteTilePlugin();
const roadTile = plugin.tiles?.find((tile) => tile.kind === 'road');
const dockTile = plugin.tiles?.find((tile) => tile.kind === 'dock');
const classifier = roadTile?.classifyOverworldTile;
const resolver = roadTile?.resolveFloorKind3D;
type RouteClassifierPayload = Parameters<NonNullable<typeof classifier>>[0];
type RouteFloorPayload = Parameters<NonNullable<typeof resolver>>[0];

function createRouteClassifierPayload(
  overrides: Partial<RouteClassifierPayload> = {}
): RouteClassifierPayload {
  return {
    seed: 'spec',
    x: 5,
    y: 0,
    tile: { kind: 'sign' },
    nearLand: true,
    signals: {
      continent: 0.6,
      elevation: 0.4,
      moisture: 0.4,
      riverSignal: 0.2,
      roadSignal: 0.95,
    },
    sampleTerrainSignals() {
      return {
        continent: 0.6,
        elevation: 0.4,
        moisture: 0.4,
        riverSignal: 0.2,
        roadSignal: 0.95,
      };
    },
    townAnchors: [{ x: 0, y: 0, name: 'Oakcross' }],
    bridgeAnchors: [],
    poiAnchors: [],
    ...overrides,
  };
}

function createRouteFloorPayload(): RouteFloorPayload {
  return {
    tile: { kind: 'road' },
    tileX: 0,
    tileY: 0,
    state: {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', depth: 0, type: 'overworld' };
      },
      getCurrentTile(x: number, y: number) {
        const key = `${x}:${y}`;
        const kinds: Record<string, string> = {
          '-1:-1': 'plains',
          '0:-1': 'plains',
          '1:-1': 'forest',
          '-1:0': 'plains',
          '1:0': 'road',
          '-1:1': 'forest',
          '0:1': 'plains',
          '1:1': 'river',
        };
        return { kind: kinds[key] ?? 'road' };
      },
      getTileDefinition(kind: string) {
        return {
          name: kind,
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0,
        };
      },
    },
  };
}

function createDockModelState() {
  const dockTiles = new Set(['0:0', '1:0', '2:0', '3:0']);
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', depth: 0, type: 'overworld' as const };
    },
    getCurrentTile(x: number, y: number) {
      const key = `${x}:${y}`;
      if (dockTiles.has(key)) {
        return { kind: 'dock' };
      }
      if (y === 0 && x === -1) {
        return { kind: 'road' };
      }
      if (Math.abs(y) === 1 && x >= 0 && x <= 3) {
        return { kind: 'ocean' };
      }
      return { kind: 'shore' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0,
      };
    },
  };
}

describe('tile route', () => {
  it('does not overwrite point-of-interest or sign tiles with roads', () => {
    expect(classifier?.(createRouteClassifierPayload())).toBeNull();

    expect(
      classifier?.(
        createRouteClassifierPayload({
          x: 0,
          y: 0,
          tile: { kind: 'cave' },
        })
      )
    ).toBeNull();
  });

  it('creates docks for coastal lighthouse approaches instead of bridges', () => {
    expect(
      classifier?.(
        createRouteClassifierPayload({
          x: 7,
          y: 0,
          tile: { kind: 'shore' },
          signals: {
            continent: 0.39,
            elevation: 0.22,
            moisture: 0.5,
            riverSignal: 0.1,
            roadSignal: 0.95,
          },
          sampleTerrainSignals(sampleX: number, sampleY: number) {
            if (sampleX === 6 && sampleY === 0) {
              return {
                continent: 0.5,
                elevation: 0.3,
                moisture: 0.5,
                riverSignal: 0.1,
                roadSignal: 0.7,
              };
            }
            if (sampleX >= 8) {
              return {
                continent: 0.2,
                elevation: 0.1,
                moisture: 0.6,
                riverSignal: 0.1,
                roadSignal: 0.2,
              };
            }
            return {
              continent: 0.44,
              elevation: 0.2,
              moisture: 0.5,
              riverSignal: 0.1,
              roadSignal: 0.2,
            };
          },
          townAnchors: [],
          bridgeAnchors: [],
          poiAnchors: [{ x: 6, y: 0, type: 'lighthouse', name: 'Beacon Point' }],
        })
      )
    ).toEqual(
      expect.objectContaining({
        kind: 'dock',
      })
    );
  });

  it('creates docks for coastal ship approaches', () => {
    expect(
      classifier?.(
        createRouteClassifierPayload({
          x: 12,
          y: 4,
          tile: { kind: 'shore' },
          signals: {
            continent: 0.38,
            elevation: 0.18,
            moisture: 0.6,
            riverSignal: 0.08,
            roadSignal: 0.94,
          },
          sampleTerrainSignals(sampleX: number, sampleY: number) {
            if (sampleX === 11 && sampleY === 4) {
              return {
                continent: 0.58,
                elevation: 0.24,
                moisture: 0.52,
                riverSignal: 0.1,
                roadSignal: 0.52,
              };
            }
            if (sampleX >= 13 && sampleY === 4) {
              return {
                continent: 0.24,
                elevation: 0.08,
                moisture: 0.66,
                riverSignal: 0.08,
                roadSignal: 0.16,
              };
            }
            return {
              continent: 0.44,
              elevation: 0.18,
              moisture: 0.54,
              riverSignal: 0.08,
              roadSignal: 0.18,
            };
          },
          townAnchors: [],
          bridgeAnchors: [],
          poiAnchors: [{ x: 11, y: 4, type: 'ship', name: 'Harbor Mast' }],
        })
      )
    ).toEqual(
      expect.objectContaining({
        kind: 'dock',
      })
    );
  });

  it('rejects coast-parallel ocean spans as bridges', () => {
    expect(
      classifier?.(
        createRouteClassifierPayload({
          x: 10,
          y: 3,
          tile: { kind: 'ocean' },
          signals: {
            continent: 0.2,
            elevation: 0.1,
            moisture: 0.6,
            riverSignal: 0.1,
            roadSignal: 0.96,
          },
          sampleTerrainSignals(sampleX: number, sampleY: number) {
            const coastBand = sampleY === 2 || sampleY === 1;
            return {
              continent: coastBand ? 0.62 : 0.2,
              elevation: 0.2,
              moisture: 0.5,
              riverSignal: 0.1,
              roadSignal:
                sampleY === 3 && sampleX >= 8 && sampleX <= 12 ? 0.97 : 0.2,
            };
          },
          townAnchors: [],
          bridgeAnchors: [],
          poiAnchors: [],
        })
      )
    ).toBeNull();
  });

  it('resolves the 3D road floor kind from dominant neighboring terrain', () => {
    expect(resolver?.(createRouteFloorPayload())).toBe('plains');
  });

  it('renders multiple boats across long dock clusters', () => {
    const state = createDockModelState();
    const models = [0, 1, 2, 3].map((tileX) =>
      dockTile?.create3DModel?.({
        three: fakeThree as never,
        state: state as never,
        tile: { kind: 'dock' } as never,
        tileX,
        tileY: 0,
      })
    );

    const longDockBoatMarkers = models.flatMap((model) => {
      const markers: number[] = [];
      (model as FakeNode | undefined)?.traverse((node) => {
        if (node.userData?.dockBoat) {
          markers.push(Number(node.userData.dockBoatClusterLength));
        }
      });
      return markers;
    });

    expect(longDockBoatMarkers).toEqual([4, 4]);
  });
});
