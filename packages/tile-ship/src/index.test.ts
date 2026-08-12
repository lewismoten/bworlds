import { describe, expect, it } from 'vitest';
import { createShipTilePlugin } from './index.ts';

class FakeGeometry {
  constructor(...args: number[]) {
    void args;
  }
}

class FakeMaterial {
  opacity?: number;
  options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
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
  intensity: number;

  constructor(
    color?: unknown,
    intensity = 0,
    distance?: number,
    decay?: number
  ) {
    super();
    void color;
    void distance;
    void decay;
    this.intensity = intensity;
  }
}

const fakeThree = {
  Group: FakeGroup,
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  Mesh: FakeMesh,
  PointLight: FakePointLight,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
} as const;

function createShipState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      if (x === 5 && y === 4) return { kind: 'dock' };
      if (x === 5 && y === 3) return { kind: 'ocean' };
      if (x === 5 && y === 6) return { kind: 'plains' };
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

function createShipModelSignature(model: FakeNode | undefined) {
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
              intensity: node.intensity,
            }
          : undefined,
      userData: node.userData,
    });
  });
  return signature;
}

describe('tile ship', () => {
  it('reuses shared ship materials across repeated model builds', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: { kind: 'ship' } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: { kind: 'ship' } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      5
    );
  });

  it('creates an enterable ship model with a deterministic variant and night light', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    });

    expect((model as FakeNode)?.userData?.shipPoiVariant).toMatch(
      /tall-ship|broken-ship/
    );

    let sawLantern = false;
    (model as FakeNode)?.traverse((node) => {
      if (node instanceof FakePointLight) {
        sawLantern = true;
      }
    });
    expect(sawLantern).toBe(true);
  });

  it('instances repeated tall-ship rigging parts instead of emitting one mesh per mast, yard, and sail', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    let targetTile: { x: number; y: number } | null = null;

    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const model = tile?.create3DModel?.({
          three: fakeThree as never,
          state: createShipState(),
          tile: { kind: 'ship' } as never,
          tileX,
          tileY,
        }) as FakeNode | undefined;
        if (model?.userData?.shipPoiVariant === 'tall-ship') {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: { kind: 'ship' } as never,
      tileX: targetTile!.x,
      tileY: targetTile!.y,
    }) as FakeNode | undefined;

    const mastInstances: FakeInstancedMesh[] = [];
    const yardInstances: FakeInstancedMesh[] = [];
    const sailInstances: FakeInstancedMesh[] = [];
    model?.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.shipInstancedPart === 'mast'
      ) {
        mastInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.shipInstancedPart === 'yard'
      ) {
        yardInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.shipInstancedPart === 'sail'
      ) {
        sailInstances.push(node);
      }
    });

    expect(mastInstances).toHaveLength(1);
    expect(yardInstances).toHaveLength(1);
    expect(sailInstances).toHaveLength(1);
    expect(mastInstances[0]?.count).toBe(2);
    expect(yardInstances[0]?.count).toBe(2);
    expect(sailInstances[0]?.count).toBe(2);
    expect(mastInstances[0]?.matrices).toHaveLength(2);
    expect(yardInstances[0]?.matrices).toHaveLength(2);
    expect(sailInstances[0]?.matrices).toHaveLength(2);
    expect(
      mastInstances[0]?.matrices.some((matrix) => matrix.scale.y > 0.8)
    ).toBe(true);
    expect(
      sailInstances[0]?.matrices.some((matrix) => matrix.scale.x > 0.4)
    ).toBe(true);
  });

  it('builds ship models progressively before returning the final model', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeNode | undefined;
    const expectedFinalLabel =
      syncModel?.userData?.shipPoiVariant === 'tall-ship'
        ? 'rigging'
        : 'wreckage';
    const build = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 3,
        label: 'hull',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 3,
        label: 'lantern',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 3,
        label: expectedFinalLabel,
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous ship build aligned with the progressive final model', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeNode | undefined;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    });
    let progressiveModel: FakeNode | undefined;

    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeNode | undefined;
        break;
      }
    }

    expect(createShipModelSignature(progressiveModel)).toEqual(
      createShipModelSignature(syncModel)
    );
  });

  it('keeps ship model signatures stable after repeated model churn', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const baseline = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeNode | undefined;

    for (let index = 0; index < 240; index += 1) {
      tile?.create3DModel?.({
        three: fakeThree as never,
        state: createShipState(),
        tile: {
          kind: 'ship',
          poi: { type: 'ship', name: `Ship ${index}` },
        } as never,
        tileX: index % 24,
        tileY: Math.floor(index / 24),
      });
    }

    const resolved = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeNode | undefined;

    expect(createShipModelSignature(resolved)).toEqual(
      createShipModelSignature(baseline)
    );
  });

  it('uses the hull mesh as the ship root instead of a wrapper group', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createShipState(),
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    }) as FakeMesh | undefined;

    expect(model).toBeInstanceOf(FakeMesh);
    expect(model?.position).toMatchObject({ x: 5, y: 0.11, z: 5.05 });
    expect(model?.userData?.shipPoiVariant).toMatch(/tall-ship|broken-ship/);
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
