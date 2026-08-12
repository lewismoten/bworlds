import { describe, expect, it, vi } from 'vitest';
import { createRouteTilePlugin } from './index.ts';

vi.mock('@bworlds/three-support', async () => {
  const actual = await vi.importActual<typeof import('@bworlds/three-support')>(
    '@bworlds/three-support'
  );
  return {
    ...actual,
    createPaintedCanvasTexture() {
      return { colorSpace: '', needsUpdate: false };
    },
    getOrCreatePaintedCanvasTexture() {
      return { colorSpace: '', needsUpdate: false };
    },
    createQuadraticBezierPoints(
      three: unknown,
      start: unknown,
      control: unknown,
      end: unknown
    ) {
      void three;
      return [start, control, end];
    },
    createRibbonMesh(
      three: unknown,
      points: unknown[],
      width: number,
      material: unknown
    ) {
      void three;
      void points;
      void width;
      return new FakeMesh(undefined, material as FakeMaterial);
    },
    createTexturedPlaneMesh() {
      return new FakeMesh();
    },
  };
});

class FakeGeometry {
  constructor(...args: number[]) {
    void args;
  }
}

class FakeVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
}

class FakeMaterial {
  constructor(public options: Record<string, unknown> = {}) {}
}

class FakeMatrix4 {
  elements = Array<number>(16).fill(0);

  set(...elements: number[]) {
    this.elements = [...elements];
    return this;
  }

  clone() {
    return new FakeMatrix4().set(...this.elements);
  }
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
  scale = { x: 1, y: 1, z: 1 };
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

class FakeInstancedMesh extends FakeNode {
  matrices: FakeMatrix4[] = [];

  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[],
    public count = 0
  ) {
    super();
  }

  setMatrixAt(index: number, matrix: FakeMatrix4) {
    this.matrices[index] = matrix.clone();
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  MeshBasicMaterial: FakeMaterial,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  Vector3: FakeVector3,
  DoubleSide: 'DoubleSide',
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
        walkable: kind !== 'ocean',
        wallHeight: 0,
      };
    },
  };
}

function createIsolatedRoadModelState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', depth: 0, type: 'overworld' as const };
    },
    getCurrentTile(x: number, y: number) {
      if (x === 12 && y === -4) {
        return { kind: 'road' };
      }
      return { kind: 'plains' };
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

function createRoutedDockModelState() {
  const dockTiles = new Set(['0:0', '1:0', '22:0', '23:0', '11:22', '12:22']);
  const poiNames: Record<string, string> = {
    '-1:0': 'Beacon Point',
    '24:0': 'Harbor Market',
    '13:23': 'Crescent Watch',
  };

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
      if (poiNames[key]) {
        return { kind: 'shore', poi: { type: 'town', name: poiNames[key] } };
      }
      const onTopRoute = y === 0 && x >= 2 && x <= 21;
      const onRightRoute = x === 23 && y >= 1 && y <= 21;
      const onBottomRightRoute = y === 22 && x >= 13 && x <= 23;
      const onBottomLeftRoute = y === 22 && x >= 0 && x <= 10;
      const onLeftRoute = x === 0 && y >= 1 && y <= 21;
      if (
        onTopRoute ||
        onRightRoute ||
        onBottomRightRoute ||
        onBottomLeftRoute ||
        onLeftRoute
      ) {
        return {
          kind:
            (x === 23 && y === 22) || (x === 12 && y === 21)
              ? 'bridge'
              : 'ocean',
        };
      }
      return { kind: 'shore' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: kind !== 'ocean',
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

  it('reuses precomputed dock footprints across repeated nearby classifications', () => {
    const poiAnchors = [
      { x: 11, y: 4, type: 'ship' as const, name: 'Harbor Mast' },
    ];
    const sampleCalls: string[] = [];
    const sampleTerrainSignals = (sampleX: number, sampleY: number) => {
      sampleCalls.push(`${sampleX}:${sampleY}`);
      if (sampleX === 10 && sampleY === 4) {
        return {
          continent: 0.58,
          elevation: 0.24,
          moisture: 0.52,
          riverSignal: 0.1,
          roadSignal: 0.52,
        };
      }
      if (sampleY === 4 && sampleX >= 12 && sampleX <= 14) {
        return {
          continent: 0.24,
          elevation: 0.08,
          moisture: 0.66,
          riverSignal: 0.08,
          roadSignal: 0.16,
        };
      }
      return {
        continent: 0.6,
        elevation: 0.18,
        moisture: 0.54,
        riverSignal: 0.08,
        roadSignal: 0.18,
      };
    };

    const dockXs = [12, 13, 14];
    for (const [index, dockX] of dockXs.entries()) {
      expect(
        classifier?.(
          createRouteClassifierPayload({
            x: dockX,
            y: 4,
            tile: { kind: 'shore' },
            signals: {
              continent: 0.38,
              elevation: 0.18,
              moisture: 0.6,
              riverSignal: 0.08,
              roadSignal: 0.94,
            },
            sampleTerrainSignals,
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors,
          })
        )
      ).toEqual(
        expect.objectContaining({
          kind: 'dock',
        })
      );

      if (index === 0) {
        expect(sampleCalls).toEqual([
          '10:4',
          '12:4',
          '13:4',
          '14:4',
          '11:3',
          '11:5',
        ]);
        continue;
      }

      expect(sampleCalls).toHaveLength(6);
    }
  });

  it('reuses connected route resolvers across repeated classifications', () => {
    let coordinateReads = 0;
    const townAnchors = [
      {
        get x() {
          coordinateReads += 1;
          return 0;
        },
        get y() {
          coordinateReads += 1;
          return 0;
        },
        name: 'Oakcross',
      } as { x: number; y: number; name: string },
    ];
    const bridgeAnchors: Array<{ x: number; y: number }> = [];

    expect(
      classifier?.(
        createRouteClassifierPayload({
          x: 0,
          y: 0,
          tile: { kind: 'plains' },
          townAnchors,
          bridgeAnchors,
          poiAnchors: [],
        })
      )
    ).toEqual(
      expect.objectContaining({
        kind: 'road',
      })
    );

    const readsAfterFirstClassification = coordinateReads;
    expect(readsAfterFirstClassification).toBeGreaterThan(0);

    expect(
      classifier?.(
        createRouteClassifierPayload({
          x: 0,
          y: 0,
          tile: { kind: 'plains' },
          townAnchors,
          bridgeAnchors,
          poiAnchors: [],
        })
      )
    ).toEqual(
      expect.objectContaining({
        kind: 'road',
      })
    );

    expect(coordinateReads - readsAfterFirstClassification).toBeLessThan(
      readsAfterFirstClassification
    );
  });

  it('resolves the 3D road floor kind from dominant neighboring terrain', () => {
    expect(resolver?.(createRouteFloorPayload())).toBe('plains');
  });

  it('returns an isolated low-detail road ribbon directly without a wrapper group', () => {
    const state = createIsolatedRoadModelState();
    const model = roadTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'road' } as never,
      tileX: 12,
      tileY: -4,
      detailLevel: 'low',
    }) as FakeMesh;

    expect(model).toBeInstanceOf(FakeMesh);
    expect(model.children).toHaveLength(0);
    expect(model.position.x).toBe(12);
    expect(model.position.y).toBe(0);
    expect(model.position.z).toBe(-4);
  });

  it('renders lowered paddle-boat boarding ramps on non-route docks', () => {
    const state = createDockModelState();
    const model = dockTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'dock' } as never,
      tileX: 2,
      tileY: 0,
    }) as FakeGroup;

    const paddleBoatMarkers: Array<Record<string, unknown>> = [];
    model.traverse((node) => {
      if (
        node.userData?.dockPaddleBoat ||
        node.userData?.dockPaddleBoatRampLowered
      ) {
        paddleBoatMarkers.push(node.userData);
      }
    });

    expect(
      paddleBoatMarkers.some((marker) => marker.dockPaddleBoat === true)
    ).toBe(true);
    expect(
      paddleBoatMarkers.some(
        (marker) => marker.dockPaddleBoatRampLowered === true
      )
    ).toBe(true);
  });

  it('creates a boardable ship action from docks on a valid route', () => {
    const state = createRoutedDockModelState();
    const action = dockTile?.createWorldAction?.({
      seed: 'spec',
      x: 0,
      y: 0,
      tile: { kind: 'dock' } as never,
      state: state as never,
    });

    expect(action).toEqual(
      expect.objectContaining({
        type: 'enter',
        context: expect.objectContaining({
          type: 'ship',
          label: expect.any(String),
          destination: { x: 11, y: 22 },
          routeStops: [
            expect.objectContaining({ name: 'Beacon Point' }),
            expect.objectContaining({ name: 'Crescent Watch' }),
            expect.objectContaining({ name: 'Harbor Market' }),
          ],
        }),
        spawn: { x: 0, y: 4 },
      })
    );
  });
});
