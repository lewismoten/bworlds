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
      _three: unknown,
      start: unknown,
      control: unknown,
      end: unknown
    ) {
      return [start, control, end];
    },
    createRibbonMesh(
      _three: unknown,
      _points: unknown[],
      _width: number,
      material: unknown
    ) {
      return new FakeMesh(undefined, material as FakeMaterial);
    },
    createTexturedPlaneMesh() {
      return new FakeMesh();
    },
  };
});

class FakeGeometry {
  constructor(..._args: number[]) {}
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

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  Vector3: FakeVector3,
} as const;

const plugin = createRouteTilePlugin();
const roadTile = plugin.tiles?.find((tile) => tile.kind === 'road');
const bridgeTile = plugin.tiles?.find((tile) => tile.kind === 'bridge');
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

function createForestLogBridgeState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', depth: 0, type: 'overworld' as const };
    },
    getCurrentTile(x: number, y: number) {
      const key = `${x}:${y}`;
      const kinds: Record<string, string> = {
        '0:0': 'bridge',
        '0:-1': 'forest',
        '0:1': 'forest',
        '-1:0': 'river',
        '1:0': 'river',
      };
      return { kind: kinds[key] ?? 'plains' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: kind !== 'river',
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
          poiAnchors: [
            { x: 6, y: 0, type: 'lighthouse', name: 'Beacon Point' },
          ],
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

  it('creates isolated fallen-log bridges across forest-banked rivers', () => {
    let result: ReturnType<NonNullable<typeof classifier>> = null;

    for (let y = 0; y < 20 && !result; y += 1) {
      for (let x = 0; x < 20; x += 1) {
        result =
          classifier?.(
            createRouteClassifierPayload({
              x,
              y,
              tile: { kind: 'river' },
              signals: {
                continent: 0.6,
                elevation: 0.22,
                moisture: 0.62,
                riverSignal: 0.86,
                roadSignal: 0.18,
              },
              sampleTerrainSignals(sampleX: number, sampleY: number) {
                if (sampleX === x && Math.abs(sampleY - y) === 1) {
                  return {
                    continent: 0.66,
                    elevation: 0.3,
                    moisture: 0.78,
                    riverSignal: 0.18,
                    roadSignal: 0.22,
                  };
                }
                if (Math.abs(sampleX - x) === 1 && sampleY === y) {
                  return {
                    continent: 0.58,
                    elevation: 0.18,
                    moisture: 0.64,
                    riverSignal: 0.88,
                    roadSignal: 0.12,
                  };
                }
                return {
                  continent: 0.58,
                  elevation: 0.24,
                  moisture: 0.48,
                  riverSignal: 0.16,
                  roadSignal: 0.18,
                };
              },
              townAnchors: [],
              bridgeAnchors: [],
              poiAnchors: [],
            })
          ) ?? null;
        if (result) {
          break;
        }
      }
    }

    expect(result).toEqual(
      expect.objectContaining({
        kind: 'bridge',
        note: expect.stringContaining('fallen tree'),
      })
    );
  });

  it('creates multi-tile bridge crossings across wider river spans', () => {
    const sampleTerrainSignals = (sampleX: number, sampleY: number) => {
      if (sampleY !== 0) {
        return {
          continent: 0.62,
          elevation: 0.26,
          moisture: 0.46,
          riverSignal: 0.14,
          roadSignal: 0.2,
        };
      }
      if (sampleX === 0 || sampleX === 1) {
        return {
          continent: 0.61,
          elevation: 0.18,
          moisture: 0.55,
          riverSignal: sampleX === 0 ? 0.88 : 0.86,
          roadSignal: sampleX === 0 ? 0.95 : 0.94,
        };
      }
      return {
        continent: 0.64,
        elevation: 0.24,
        moisture: 0.42,
        riverSignal: 0.18,
        roadSignal: 0.96,
      };
    };

    const leftBridge = classifier?.(
      createRouteClassifierPayload({
        x: 0,
        y: 0,
        tile: { kind: 'river' },
        signals: sampleTerrainSignals(0, 0),
        sampleTerrainSignals,
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      })
    );
    const rightBridge = classifier?.(
      createRouteClassifierPayload({
        x: 1,
        y: 0,
        tile: { kind: 'river' },
        signals: sampleTerrainSignals(1, 0),
        sampleTerrainSignals,
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      })
    );

    expect(leftBridge).toEqual(
      expect.objectContaining({
        kind: 'bridge',
      })
    );
    expect(rightBridge).toEqual(
      expect.objectContaining({
        kind: 'bridge',
      })
    );
  });

  it('resolves the 3D road floor kind from dominant neighboring terrain', () => {
    expect(resolver?.(createRouteFloorPayload())).toBe('plains');
  });

  it('renders isolated forest bridges as fallen logs with the matching traversal axis', () => {
    const state = createForestLogBridgeState();
    const profile = bridgeTile?.getTraversalProfile3D?.({
      state: state as never,
      tile: { kind: 'bridge' } as never,
      tileX: 0,
      tileY: 0,
    });
    const model = bridgeTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'bridge' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeGroup;

    expect(profile).toEqual(
      expect.objectContaining({
        slideAxis: 'ns',
      })
    );

    const markers = new Set<string>();
    model.traverse((node) => {
      const marker = node.userData?.forestLogBridge;
      if (typeof marker === 'string') {
        markers.add(marker);
      }
    });

    expect(markers.has('ns')).toBe(true);
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

  it('renders a dock route sign with the boat name and destination stops', () => {
    const state = createRoutedDockModelState();
    const model = dockTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'dock' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeGroup;

    let signData: Record<string, unknown> | null = null;
    model.traverse((node) => {
      if (node.userData?.dockRouteSign) {
        signData = node.userData;
      }
    });

    expect(signData).toEqual(
      expect.objectContaining({
        dockRouteSign: true,
        dockRouteBoatName: expect.any(String),
        dockRouteStops: ['Crescent Watch', 'Harbor Market'],
      })
    );
  });

  it('keeps deterministic dock and bridge visuals stable after bounded cache eviction churn', () => {
    const dockState = createRoutedDockModelState();
    const bridgeState = createForestLogBridgeState();
    const captureDockSign = () => {
      const model = dockTile?.create3DModel?.({
        three: fakeThree as never,
        state: dockState as never,
        tile: { kind: 'dock' } as never,
        tileX: 0,
        tileY: 0,
      }) as FakeGroup;
      let signData: Record<string, unknown> | null = null;
      model.traverse((node) => {
        if (node.userData?.dockRouteSign) {
          signData = node.userData;
        }
      });
      return signData;
    };
    const captureBridgeMarkers = () => {
      const model = bridgeTile?.create3DModel?.({
        three: fakeThree as never,
        state: bridgeState as never,
        tile: { kind: 'bridge' } as never,
        tileX: 0,
        tileY: 0,
      }) as FakeGroup;
      const markers = new Set<string>();
      model.traverse((node) => {
        const marker = node.userData?.forestLogBridge;
        if (typeof marker === 'string') {
          markers.add(marker);
        }
      });
      return [...markers].sort();
    };

    const baselineDockSign = captureDockSign();
    const baselineBridgeMarkers = captureBridgeMarkers();

    for (let index = 0; index < 1200; index += 1) {
      const tileX = (index % 80) - 40;
      const tileY = Math.floor(index / 80) - 10;
      bridgeTile?.create3DModel?.({
        three: fakeThree as never,
        state: bridgeState as never,
        tile: { kind: 'bridge' } as never,
        tileX,
        tileY,
      });
      dockTile?.create3DModel?.({
        three: fakeThree as never,
        state: dockState as never,
        tile: { kind: 'dock' } as never,
        tileX,
        tileY,
      });
    }

    expect(captureDockSign()).toEqual(baselineDockSign);
    expect(captureBridgeMarkers()).toEqual(baselineBridgeMarkers);
  });

  it('reuses shared road materials across repeated road model builds', () => {
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', depth: 0, type: 'overworld' as const };
      },
      getCurrentTile() {
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
    const first = roadTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'road' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeNode | undefined;
    const second = roadTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'road' } as never,
      tileX: 1,
      tileY: 0,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      2
    );
  });

  it('reuses shared dock materials across repeated dock model builds', () => {
    const state = createDockModelState();
    const first = dockTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'dock' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeNode | undefined;
    const second = dockTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'dock' } as never,
      tileX: 1,
      tileY: 0,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      3
    );
  });

  it('reuses shared bridge materials across repeated bridge model builds', () => {
    const state = createForestLogBridgeState();
    const first = bridgeTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'bridge' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeNode | undefined;
    const second = bridgeTile?.create3DModel?.({
      three: fakeThree as never,
      state: state as never,
      tile: { kind: 'bridge' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      2
    );
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

  it('creates a boardable paddle-boat action from docks without a route ship', () => {
    const state = createDockModelState();
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
          type: 'boat',
          label: 'Paddle Boat',
        }),
        spawn: { x: 0, y: 0 },
      })
    );
  });
});

function countSharedMaterialReferences(
  left: FakeNode | undefined,
  right: FakeNode | undefined
): number {
  const leftMaterials = collectMeshMaterials(left);
  const rightMaterials = collectMeshMaterials(right);
  let sharedCount = 0;

  leftMaterials.forEach((material) => {
    if (rightMaterials.has(material)) {
      sharedCount += 1;
    }
  });

  return sharedCount;
}

function collectMeshMaterials(root: FakeNode | undefined): Set<FakeMaterial> {
  const materials = new Set<FakeMaterial>();
  root?.traverse((node) => {
    if (node instanceof FakeMesh) {
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => materials.add(material));
      } else if (node.material) {
        materials.add(node.material);
      }
    }
  });
  return materials;
}
