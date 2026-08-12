import { describe, expect, it } from 'vitest';
import { createStationTilePlugin } from './index.ts';

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
  Mesh: FakeMesh,
  PointLight: FakePointLight,
  MeshBasicMaterial: FakeMaterial,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
} as const;

describe('tile station', () => {
  it('creates an enterable anchored station point of interest', () => {
    const plugin = createStationTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'station');

    const classified = tile?.classifyOverworldTile?.({
      seed: 'spec',
      x: 6,
      y: 4,
      nearLand: true,
      tile: { kind: 'plains' },
      poiAnchors: [
        { x: 6, y: 4, type: 'station', name: 'Copper Lantern Station' },
      ],
    } as never);

    expect(classified).toEqual(
      expect.objectContaining({
        kind: 'station',
        poi: expect.objectContaining({
          type: 'station',
          name: 'Copper Lantern Station',
        }),
      })
    );
  });

  it('reuses shared station materials across repeated model builds', () => {
    const plugin = createStationTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'station');
    const sharedHost = { ...fakeThree };
    const first = tile?.create3DModel?.({
      three: sharedHost as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: sharedHost as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 8,
      tileY: 9,
    }) as FakeNode | undefined;
    const otherHost = tile?.create3DModel?.({
      three: { ...fakeThree } as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 12,
      tileY: 13,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      4
    );
    expect(countSharedMaterialReferences(first, otherHost)).toBe(0);
  });

  it('builds the station progressively before returning the final model', () => {
    const plugin = createStationTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'station');
    const build = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 4,
      tileY: 5,
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 3,
        label: 'hall',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 3,
        label: 'roof-canopy',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 3,
        label: 'lamp',
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous station build aligned with the progressive final model', () => {
    const plugin = createStationTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'station');
    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 4,
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

    expect(createModelSignature(progressiveModel)).toEqual(
      createModelSignature(syncModel)
    );
  });

  it('uses the station base mesh as the root instead of a wrapper group', () => {
    const plugin = createStationTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'station');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'station' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeMesh | undefined;

    expect(model).toBeInstanceOf(FakeMesh);
    expect(model?.position).toMatchObject({ x: 4, y: 0.09, z: 5 });
    expect(model?.children).toHaveLength(5);
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
