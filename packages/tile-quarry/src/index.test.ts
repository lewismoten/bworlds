import { describe, expect, it, vi } from 'vitest';
import { createQuarryTilePlugin } from './index.ts';

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  emissiveIntensity?: number;
  options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
  }
}

vi.mock('@bworlds/three-support', () => ({
  createMountainTerrainMaterials() {
    return {
      mountainMaterial: new FakeMaterial({ color: '#7c6f65' }),
    };
  },
  createBasicMaterial(_three: unknown, options: Record<string, unknown>) {
    return new FakeMaterial(options);
  },
}));

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
  intensity: number;

  constructor(
    public color?: string,
    intensity = 0,
    public distance?: number,
    public decay?: number
  ) {
    super();
    this.intensity = intensity;
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  CylinderGeometry: FakeGeometry,
  BoxGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  TorusGeometry: FakeGeometry,
} as const;

function createQuarryState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      if (x === 7 && y === 8) return { kind: 'road' };
      if (x === 8 && y === 9) return { kind: 'plains' };
      if (x === 8 && y === 7) return { kind: 'mountain' };
      return { kind: 'plains' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: kind !== 'mountain',
        wallHeight: kind === 'mountain' ? 0.95 : 0,
      };
    },
  };
}

function createModelSignature(model: FakeNode | undefined) {
  const signature: Array<Record<string, unknown>> = [];
  model?.traverse((node) => {
    signature.push({
      type: node.constructor.name,
      x: node.position.x,
      y: node.position.y,
      z: node.position.z,
      rotationX: node.rotation.x,
      rotationY: node.rotation.y,
      rotationZ: node.rotation.z,
      scaleX: node.scale.x,
      scaleY: node.scale.y,
      scaleZ: node.scale.z,
      visible: node.visible,
      childCount: node.children.length,
      material:
        node instanceof FakeMesh
          ? Array.isArray(node.material)
            ? node.material.map((material) => material.options)
            : node.material?.options
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

describe('tile quarry', () => {
  it('creates deterministic quarry model signatures for the same tile', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const state = createQuarryState();

    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    expect(createModelSignature(second)).toEqual(createModelSignature(first));
  });

  it('lights quarry lanterns at night', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createQuarryState(),
      tile: { kind: 'quarry' } as never,
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

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect((glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeCloseTo(0.02, 6);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0, 6);
    expect(pointLight?.visible).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect((glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeGreaterThan(1);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0.76, 6);
    expect(pointLight?.visible).toBe(true);
  });
});
