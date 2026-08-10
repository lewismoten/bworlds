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
