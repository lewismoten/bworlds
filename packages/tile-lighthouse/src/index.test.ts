import { describe, expect, it } from 'vitest';
import { createLighthouseTilePlugin } from './index.ts';

class FakeGeometry {
  constructor(..._args: number[]) {}
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
  intensity: number;

  constructor(
    _color?: unknown,
    intensity = 0,
    _distance?: number,
    _decay?: number
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
  MeshBasicMaterial: FakeMaterial,
  CylinderGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  DoubleSide: 'double-side',
} as const;

describe('tile lighthouse', () => {
  it('reuses shared tower materials across repeated model builds', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 8,
      tileY: 9,
    }) as FakeNode | undefined;

    const sharedCount = countSharedMaterialReferences(first, second);

    expect(sharedCount).toBeGreaterThanOrEqual(5);
    expect(findBeamMaterial(first)).toBe(findBeamMaterial(second));
  });

  it('sweeps and reveals the beam at night', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {
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
      },
      tile: {
        kind: 'lighthouse',
        poi: { type: 'lighthouse', name: 'Beacon' },
      } as never,
      tileX: 4,
      tileY: 5,
    });

    let beamNode: FakeMesh | null = null;
    let beamPivot: FakeGroup | null = null;
    (model as FakeNode)?.traverse((node) => {
      if (node.userData?.lighthouseBeam) {
        beamNode = node as FakeMesh;
      }
      if (node.userData?.lighthouseBeamPivot) {
        beamPivot = node as FakeGroup;
      }
    });

    expect(beamNode).not.toBeNull();
    expect(beamPivot).not.toBeNull();

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {
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
      },
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(beamNode?.visible).toBe(false);
    expect((beamNode?.material as FakeMaterial)?.opacity ?? 0).toBeLessThanOrEqual(0.03);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {
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
      },
      tile: { kind: 'lighthouse' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 2100,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(beamNode?.visible).toBe(true);
    expect((beamNode?.material as FakeMaterial)?.opacity).toBeGreaterThan(0.2);
    expect(beamPivot?.rotation.y).toBeCloseTo(1, 6);
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

function findBeamMaterial(root: FakeNode | undefined): FakeMaterial | FakeMaterial[] | undefined {
  let beamMaterial: FakeMaterial | FakeMaterial[] | undefined;
  root?.traverse((node) => {
    if (node.userData?.lighthouseBeam) {
      beamMaterial = (node as FakeMesh).material;
    }
  });
  return beamMaterial;
}
