import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedStandardMaterial(_three: unknown, options: Record<string, unknown>) {
    return { options };
  },
  getSharedSphereGeometry(_three: unknown, ...args: number[]) {
    return new FakeGeometry(...args);
  },
}));

import {
  createRuinsTilePlugin,
  RUINS_STYLE_CACHE_MAX_ENTRIES,
} from './index.ts';

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  emissiveIntensity?: number;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
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
  visible = true;
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
  SphereGeometry: FakeGeometry,
} as const;

function createRuinsState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile() {
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
  };
}

function normalizeMaterialOptions(options: Record<string, unknown> | undefined) {
  if (!options) {
    return undefined;
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (typeof value === 'function') {
      continue;
    }
    normalized[key] = value;
  }
  return normalized;
}

function createModelSignature(model: FakeGroup) {
  const signature: Array<Record<string, unknown>> = [];
  model.traverse((node) => {
    signature.push({
      type: node.constructor.name,
      x: node.position.x,
      y: node.position.y,
      z: node.position.z,
      rotationY: node.rotation.y,
      visible: node.visible,
      childCount: node.children.length,
      material:
        node instanceof FakeMesh
          ? Array.isArray(node.material)
            ? node.material.map((material) =>
                normalizeMaterialOptions(material.options)
              )
            : normalizeMaterialOptions(node.material?.options)
          : undefined,
      light:
        node instanceof FakePointLight
          ? {
              color: node.color,
              intensity: node.intensity,
              distance: node.distance,
              decay: node.decay,
            }
          : undefined,
      userData: node.userData,
    });
  });
  return signature;
}

describe('tile ruins', () => {
  it('emits a faint blue light at night', () => {
    const plugin = createRuinsTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ruins');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createRuinsState(),
      tile: { kind: 'ruins' },
      tileX: 6,
      tileY: 4,
    }) as FakeGroup;

    let glowMesh: FakeMesh | null = null;
    let pointLight: FakePointLight | null = null;
    model.traverse((node) => {
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        glowMesh = node;
      }
      if (node instanceof FakePointLight && node.userData?.poiNightLightEmitter) {
        pointLight = node;
      }
    });

    expect(glowMesh).not.toBeNull();
    expect(pointLight).not.toBeNull();

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'ruins' },
      tileX: 6,
      tileY: 4,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect((glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeCloseTo(0.01, 6);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0, 6);
    expect(pointLight?.visible).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'ruins' },
      tileX: 6,
      tileY: 4,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect((glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeGreaterThan(0.5);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0.38, 6);
    expect(pointLight?.visible).toBe(true);
  });

  it('keeps ruins model signatures stable after repeated regional churn', () => {
    const plugin = createRuinsTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ruins');
    const state = createRuinsState();

    const baseline = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'ruins' },
      tileX: 6,
      tileY: 4,
    }) as FakeGroup;

    for (let index = 0; index < RUINS_STYLE_CACHE_MAX_ENTRIES + 64; index += 1) {
      tile?.create3DModel?.({
        three: fakeThree as never,
        state,
        tile: { kind: 'ruins' },
        tileX: index * 16,
        tileY: 0,
      });
    }

    const resolved = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'ruins' },
      tileX: 6,
      tileY: 4,
    }) as FakeGroup;

    expect(createModelSignature(resolved)).toEqual(createModelSignature(baseline));
  });

  it('reuses the cached glow material for ruins in the same region', () => {
    const plugin = createRuinsTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ruins');
    const state = createRuinsState();

    const leftModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'ruins' },
      tileX: 6,
      tileY: 4,
    }) as FakeGroup;
    const rightModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'ruins' },
      tileX: 11,
      tileY: 9,
    }) as FakeGroup;

    const leftGlow = leftModel.children.find(
      (node) => node instanceof FakeMesh && node.userData?.poiNightLightEmitter
    ) as FakeMesh | undefined;
    const rightGlow = rightModel.children.find(
      (node) => node instanceof FakeMesh && node.userData?.poiNightLightEmitter
    ) as FakeMesh | undefined;

    expect(leftGlow?.material).toBe(rightGlow?.material);
  });
});
