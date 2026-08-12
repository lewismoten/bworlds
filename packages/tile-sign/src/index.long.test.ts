import { describe, expect, it, vi } from 'vitest';
import { createSignTilePlugin } from './index.ts';

const getOrCreatePaintedCanvasTextureMock = vi.hoisted(() =>
  vi.fn(
    (
      cache: {
        has(key: string): boolean;
        get(key: string): unknown;
        set(key: string, value: unknown): void;
      },
      key: string
    ) => {
      if (!cache.has(key)) {
        cache.set(key, { colorSpace: '', needsUpdate: false });
      }
      return cache.get(key);
    }
  )
);

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createBasicMaterial(_three: unknown, options: Record<string, unknown> = {}) {
    return new FakeMaterial(options);
  },
  getOrCreatePaintedCanvasTexture: getOrCreatePaintedCanvasTextureMock,
  getSharedBoxGeometry() {
    return createSharedGeometryStub();
  },
  getSharedConeGeometry() {
    return createSharedGeometryStub();
  },
  getSharedPlaneGeometry() {
    return createSharedGeometryStub();
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
  constructor(...args: number[]) {
    void args;
  }
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

function createSharedGeometryStub() {
  return {
    groups: [
      { start: 0, count: 6, materialIndex: 0 },
      { start: 6, count: 6, materialIndex: 0 },
    ],
    clearGroups() {
      this.groups = [];
    },
    addGroup(start: number, count: number, materialIndex = 0) {
      this.groups = [{ start, count, materialIndex }];
    },
    attributes: {
      position: {
        count: 24,
      },
    },
  };
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
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  PointLight: FakePointLight,
  MeshBasicMaterial: FakeMaterial,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  DoubleSide: 'double-side',
} as const;

const plugin = createSignTilePlugin();
const signTile = plugin.tiles?.find((tile) => tile.kind === 'sign');

function createSignState(name: string) {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      if (x === 9 && y === 8) {
        return { kind: 'town', poi: { type: 'town', name } };
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
  };
}

function createModelSignature(model: FakeGroup | undefined) {
  const signature: Array<Record<string, unknown>> = [];
  model?.traverse((node) => {
    signature.push({
      type: node.constructor.name,
      x: node.position.x,
      y: node.position.y,
      z: node.position.z,
      visible: node.visible,
      childCount: node.children.length,
      material:
        node instanceof FakeMesh || node instanceof FakeInstancedMesh
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

describe('tile sign long checks', () => {
  it('recreates sign label textures after bounded cache eviction', () => {
    getOrCreatePaintedCanvasTextureMock.mockClear();

    signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Alpha'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    });

    const firstTexture =
      getOrCreatePaintedCanvasTextureMock.mock.results[0]?.value;

    for (let index = 0; index < 192; index += 1) {
      signTile?.create3DModel?.({
        three: fakeThree as never,
        state: createSignState(`Poi ${index}`),
        tile: { kind: 'sign' },
        tileX: 8,
        tileY: 8,
      });
    }

    signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Alpha'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    });

    const recreatedTexture =
      getOrCreatePaintedCanvasTextureMock.mock.results.at(-2)?.value;

    expect(firstTexture).toBeDefined();
    expect(recreatedTexture).toBeDefined();
    expect(recreatedTexture).not.toBe(firstTexture);
  });

  it('keeps regional sign style stable after repeated model churn', () => {
    const baseline = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeGroup | undefined;

    for (let index = 0; index < 240; index += 1) {
      signTile?.create3DModel?.({
        three: fakeThree as never,
        state: createSignState(`Waypost ${index}`),
        tile: { kind: 'sign' },
        tileX: index % 24,
        tileY: Math.floor(index / 24),
      });
    }

    const resolved = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeGroup | undefined;

    expect(createModelSignature(resolved)).toEqual(
      createModelSignature(baseline)
    );
  });
});
