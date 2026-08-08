import { describe, expect, it, vi } from 'vitest';
import { createSignTilePlugin } from './index.ts';
import type { OverworldSignals } from '@bworlds/plugin-api';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  getOrCreatePaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createTexturedPlaneMesh() {
    return {
      position: {
        x: 0,
        y: 0,
        z: 0,
        set(x: number, y: number, z: number) {
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        },
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: {
        x: 1,
        y: 1,
        z: 1,
        set() {
          return this;
        },
        setScalar() {
          return this;
        },
      },
      visible: true,
      userData: {},
      children: [],
      add() {
        return this;
      },
      traverse(visit: (child: unknown) => void) {
        visit(this);
      },
    };
  },
}));

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  emissiveIntensity?: number;
  opacity?: number;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
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
  scale = {
    x: 1,
    y: 1,
    z: 1,
    set: (x: number, y: number, z: number) => {
      this.scale.x = x;
      this.scale.y = y;
      this.scale.z = z;
      return this.scale;
    },
    setScalar: (value: number) => {
      this.scale.x = value;
      this.scale.y = value;
      this.scale.z = value;
      return this.scale;
    },
  };
  userData?: Record<string, unknown>;
  visible = true;
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

class FakePointLight extends FakeNode {
  constructor(
    public color?: string,
    public intensity = 0,
    public distance?: number,
    public decay?: number
  ) {
    super();
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
} as const;

const plugin = createSignTilePlugin();
const classifier = plugin.tiles?.find((tile) => tile.kind === 'sign')
  ?.classifyOverworldTile;
const signTile = plugin.tiles?.find((tile) => tile.kind === 'sign');
type SignClassifierPayload = Parameters<NonNullable<typeof classifier>>[0];

function createSignSignals(roadSignal = 0.2): OverworldSignals {
  return {
    continent: 0.6,
    elevation: 0.4,
    moisture: 0.5,
    riverSignal: 0.1,
    roadSignal,
  };
}

function createSignClassifierPayload(
  overrides: Partial<SignClassifierPayload> = {}
): SignClassifierPayload {
  return {
    seed: 'spec',
    x: 1,
    y: 1,
    tile: { kind: 'plains' },
    nearLand: true,
    signChance: 0.999,
    signals: createSignSignals(),
    sampleTerrainSignals() {
      return createSignSignals();
    },
    townAnchors: [{ x: 8, y: 1, name: 'Oakcross' }],
    bridgeAnchors: [],
    ...overrides,
  };
}

describe('tile sign', () => {
  it('prefers placing signs beside crossroads', () => {
    const tile = classifier?.(createSignClassifierPayload({
      sampleTerrainSignals(x, y) {
        if ((x === 1 && (y === 0 || y === 2)) || (y === 1 && (x === 0 || x === 2))) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
    }));

    expect(tile?.kind).toBe('sign');
  });

  it('gives forks a fairly high chance of getting a sign beside the road', () => {
    const tile = classifier?.(createSignClassifierPayload({
      seed: 'fork-spec',
      x: 10,
      y: 10,
      signChance: 0.986,
      sampleTerrainSignals(x, y) {
        if ((x === 10 && (y === 9 || y === 11)) || (y === 10 && x === 11)) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
      poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
    }));

    expect(tile?.kind).toBe('sign');
  });

  it('detects forks when the sign sits beside the approach road', () => {
    const tile = classifier?.(createSignClassifierPayload({
      seed: 'fork-approach-spec',
      x: 9,
      y: 10,
      signChance: 0.99,
      sampleTerrainSignals(x, y) {
        if (
          (x === 10 && y === 10) ||
          (x === 10 && (y === 9 || y === 11)) ||
          (x === 11 && y === 10)
        ) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
      poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
    }));

    expect(tile?.kind).toBe('sign');
  });

  it('keeps roadside signs sparse away from junctions', () => {
    const tile = classifier?.(createSignClassifierPayload({
      x: 4,
      y: 4,
      sampleTerrainSignals(x, y) {
        if (y === 4 && (x === 3 || x === 5)) {
          return createSignSignals(0.95);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 20, y: 20, name: 'Farwatch' }],
    }));

    expect(tile).toBeNull();
  });

  it('allows occasional signs along long roads that point toward nearby poi', () => {
    const tile = classifier?.(createSignClassifierPayload({
      seed: 'long-road-spec',
      x: 30,
      y: 30,
      signChance: 0.998,
      sampleTerrainSignals(x, y) {
        if (y === 31 && x >= 24 && x <= 36) {
          return createSignSignals(0.96);
        }
        return createSignSignals();
      },
      townAnchors: [{ x: 40, y: 31, name: 'Longford' }],
      poiAnchors: [{ x: 40, y: 31, type: 'town', name: 'Longford' }],
    }));

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'sign',
        note: expect.stringContaining('Longford'),
      })
    );
  });

  it('lights sign lanterns at night', () => {
    const model = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile(x: number, y: number) {
          if (x === 9 && y === 8) {
            return { kind: 'town', poi: { type: 'town', name: 'Oakcross' } };
          }
          return { kind: 'plains' };
        },
        getTileDefinition() {
          return {
            name: 'Plains',
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      },
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeGroup | undefined;

    let glowMesh: FakeMesh | null = null;
    let pointLight: FakePointLight | null = null;
    model?.traverse((node) => {
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        glowMesh = node;
      }
      if (node instanceof FakePointLight && node.userData?.poiNightLightEmitter) {
        pointLight = node;
      }
    });

    expect(glowMesh).not.toBeNull();
    expect(pointLight).not.toBeNull();

    signTile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect((glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeCloseTo(0.04, 6);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0, 6);
    expect(pointLight?.visible).toBe(false);

    signTile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect((glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeGreaterThan(1);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0.75, 6);
    expect(pointLight?.visible).toBe(true);
  });
});
