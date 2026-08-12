import { describe, expect, it, vi } from 'vitest';
import { createQuarryTilePlugin } from './index.ts';

class FakeGeometry {
  constructor(...args: number[]) {
    void args;
  }
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

class FakeMatrix4 {
  position = { x: 0, y: 0, z: 0 };
  scale = { x: 1, y: 1, z: 1 };

  makeScale(x: number, y: number, z: number) {
    this.scale = { x, y, z };
    return this;
  }

  setPosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
    return this;
  }

  clone() {
    const next = new FakeMatrix4();
    next.position = { ...this.position };
    next.scale = { ...this.scale };
    return next;
  }
}

vi.mock('@bworlds/three-support', () => {
  const mountainTerrainMaterialCache = new WeakMap<
    object,
    { mountainMaterial: FakeMaterial }
  >();

  return {
    createMountainTerrainMaterials(three: object) {
      let cached = mountainTerrainMaterialCache.get(three);
      if (!cached) {
        cached = {
          mountainMaterial: new FakeMaterial({ color: '#7c6f65' }),
        };
        mountainTerrainMaterialCache.set(three, cached);
      }
      return cached;
    },
    createBasicMaterial(three: unknown, options: Record<string, unknown>) {
      void three;
      return new FakeMaterial(options);
    },
  };
});

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

class FakeInstancedMesh extends FakeNode {
  matrices: FakeMatrix4[] = [];

  constructor(
    public geometry?: object,
    public material?: FakeMaterial,
    public count = 0
  ) {
    super();
  }

  setMatrixAt(index: number, matrix: FakeMatrix4) {
    this.matrices[index] = matrix.clone();
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
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
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

  it('instances the repeated quarry rubble stones instead of emitting one mesh per stone', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createQuarryState(),
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    const stoneInstances = model?.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.quarryInstancedPart === 'rubble-stone'
    ) as FakeInstancedMesh[];
    const standaloneStoneMeshes = model?.children.filter(
      (child) =>
        child instanceof FakeMesh &&
        child.material instanceof FakeMaterial &&
        child.material.options.color === '#9c9186' &&
        child.position.y < 0.1 &&
        Math.hypot(child.position.x, child.position.z) > 0.4
    );

    expect(stoneInstances).toHaveLength(1);
    expect(stoneInstances[0]?.count).toBe(6);
    expect(stoneInstances[0]?.matrices).toHaveLength(6);
    expect(
      stoneInstances[0]?.matrices.some((matrix) => matrix.scale.x > 0.14)
    ).toBe(true);
    expect(standaloneStoneMeshes).toHaveLength(0);
  });

  it('instances the repeated quarry cart wheels instead of emitting one mesh per wheel', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createQuarryState(),
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    const wheelInstances = model?.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.quarryInstancedPart === 'cart-wheel'
    ) as FakeInstancedMesh[];
    const standaloneWheelMeshes = model?.children.filter(
      (child) =>
        child instanceof FakeMesh &&
        child.material instanceof FakeMaterial &&
        child.material.options.color === '#2f261f' &&
        child.position.y === 0.04
    );

    expect(wheelInstances).toHaveLength(1);
    expect(wheelInstances[0]?.count).toBe(2);
    expect(wheelInstances[0]?.matrices).toHaveLength(2);
    expect(
      wheelInstances[0]?.matrices.every((matrix) => matrix.position.z > 0)
    ).toBe(true);
    expect(standaloneWheelMeshes).toHaveLength(0);
  });

  it('instances the repeated quarry derrick posts instead of emitting one mesh per post', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createQuarryState(),
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    const derrickPostInstances = model?.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.quarryInstancedPart === 'derrick-post'
    ) as FakeInstancedMesh[];
    const standalonePosts = model?.children.filter(
      (child) =>
        child instanceof FakeMesh &&
        child.material instanceof FakeMaterial &&
        child.material.options.color === '#7a573b' &&
        child.position.y === 0.28
    );

    expect(derrickPostInstances).toHaveLength(1);
    expect(derrickPostInstances[0]?.count).toBe(2);
    expect(derrickPostInstances[0]?.matrices).toHaveLength(2);
    expect(
      derrickPostInstances[0]?.matrices[0]?.position.x !==
        derrickPostInstances[0]?.matrices[1]?.position.x ||
        derrickPostInstances[0]?.matrices[0]?.position.z !==
          derrickPostInstances[0]?.matrices[1]?.position.z
    ).toBe(true);
    expect(
      derrickPostInstances[0]?.matrices.every(
        (matrix) => matrix.position.y === 0.19
      )
    ).toBe(true);
    expect(standalonePosts).toHaveLength(0);
  });

  it('reuses shared quarry materials across repeated model builds', () => {
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
      tileX: 9,
      tileY: 8,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      5
    );
  });

  it('keeps repeated quarry builds on one host within the shared material budget', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const state = createQuarryState();
    const repeatedModels: FakeNode[] = [];

    for (const [tileX, tileY] of [
      [8, 8],
      [9, 8],
      [10, 8],
      [11, 8],
    ]) {
      const model = tile?.create3DModel?.({
        three: fakeThree as never,
        state,
        tile: { kind: 'quarry' } as never,
        tileX,
        tileY,
      }) as FakeNode | undefined;
      if (model) {
        repeatedModels.push(model);
      }
    }

    const sharedMaterials = new Set<FakeMaterial>();
    repeatedModels.forEach((model) => {
      collectMeshMaterials(model).forEach((material) => {
        sharedMaterials.add(material);
      });
    });

    expect(repeatedModels).toHaveLength(4);
    expect(sharedMaterials.size).toBeLessThanOrEqual(6);
  });

  it('builds the quarry progressively before returning the final model', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const build = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createQuarryState(),
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 3,
        label: 'pit-rubble',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 3,
        label: 'derrick',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 3,
        label: 'cart-lantern',
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous quarry build aligned with the progressive final model', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const state = createQuarryState();
    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    });
    let progressiveModel: FakeNode | undefined;

    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeNode | undefined;
        break;
      }
    }

    expect(createModelSignature(progressiveModel)).toEqual(
      createModelSignature(syncModel)
    );
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
    }) as FakeNode | undefined;

    let glowMesh: FakeMesh | null = null;
    let pointLight: FakePointLight | null = null;
    model?.traverse((node) => {
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        glowMesh = node;
      }
      if (
        node instanceof FakePointLight &&
        node.userData?.poiNightLightEmitter
      ) {
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

    expect(
      (glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0
    ).toBeCloseTo(0.02, 6);
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

    expect(
      (glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0
    ).toBeGreaterThan(1);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0.76, 6);
    expect(pointLight?.visible).toBe(true);
  });

  it('uses the quarry rim mesh as the root instead of a wrapper group', () => {
    const plugin = createQuarryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'quarry');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createQuarryState(),
      tile: { kind: 'quarry' } as never,
      tileX: 8,
      tileY: 8,
    }) as FakeMesh | undefined;

    expect(model).toBeInstanceOf(FakeMesh);
    expect(model?.position).toMatchObject({ x: 8, y: 0.09, z: 8 });
    expect(model?.children.length ?? 0).toBeGreaterThanOrEqual(8);
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
    if (node instanceof FakeMesh || node instanceof FakeInstancedMesh) {
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => materials.add(material));
      } else if (node.material) {
        materials.add(node.material);
      }
    }
  });
  return materials;
}
