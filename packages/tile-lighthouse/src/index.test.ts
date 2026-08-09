import { describe, expect, it } from 'vitest';
import { createLighthouseTilePlugin } from './index.ts';

class FakeGeometry {
  args: number[];

  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMaterial {
  opacity?: number;
  emissiveIntensity?: number;
  options: Record<string, unknown>;

  constructor(options: Record<string, unknown> = {}) {
    this.options = options;
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
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
  castShadow?: boolean;
  receiveShadow?: boolean;

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
    const firstChildren = first?.children as FakeMesh[] | undefined;
    const secondChildren = second?.children as FakeMesh[] | undefined;
    const firstBeamPivot = firstChildren?.[5] as FakeGroup | undefined;
    const secondBeamPivot = secondChildren?.[5] as FakeGroup | undefined;
    const firstBeamMeshes = collectBeamMeshes(first);
    const secondBeamMeshes = collectBeamMeshes(second);

    expect(sharedCount).toBeGreaterThanOrEqual(5);
    expect(firstBeamMeshes).toHaveLength(3);
    expect(firstBeamMeshes[0]?.material).toBe(secondBeamMeshes[0]?.material);
    expect(firstChildren?.[0]?.geometry).toBe(secondChildren?.[0]?.geometry);
    expect((firstBeamPivot?.children[0] as FakeMesh | undefined)?.geometry).toBe(
      (secondBeamPivot?.children[0] as FakeMesh | undefined)?.geometry
    );
  });

  it('builds a tapered emissive beam from the lantern room without beam shadows', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamMeshes = collectBeamMeshes(model);

    expect(beamMeshes).toHaveLength(3);
    expect(beamMeshes.map((beam) => beam.rotation.z)).toEqual(
      expect.arrayContaining([Math.PI / 2])
    );
    expect(beamMeshes.map((beam) => beam.position.x)).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.69, 6),
        expect.closeTo(1.81, 6),
        expect.closeTo(3.12, 6),
      ])
    );
    expect(
      beamMeshes.map((beam) => (beam.geometry as FakeGeometry | undefined)?.args[0])
    ).toEqual([0.1, 0.19, 0.32]);
    expect(
      beamMeshes.map((beam) => (beam.geometry as FakeGeometry | undefined)?.args[1])
    ).toEqual([1.1, 1.22, 1.48]);
    beamMeshes.forEach((beam) => {
      expect(beam.castShadow).toBe(false);
      expect(beam.receiveShadow).toBe(false);
      expect((beam.material as FakeMaterial)?.options.emissive).toBe('#ffe9a8');
    });
  });

  it('sweeps and fades the beam by distance at night', () => {
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

    const beamNodes: FakeMesh[] = [];
    let beamPivot: FakeGroup | null = null;
    (model as FakeNode)?.traverse((node) => {
      if (node.userData?.lighthouseBeam) {
        beamNodes.push(node as FakeMesh);
      }
      if (node.userData?.lighthouseBeamPivot) {
        beamPivot = node as FakeGroup;
      }
    });

    expect(beamNodes).toHaveLength(3);
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

    beamNodes.forEach((beamNode) => {
      expect(beamNode.visible).toBe(false);
      expect((beamNode.material as FakeMaterial)?.opacity ?? 0).toBeLessThanOrEqual(0.01);
      expect((beamNode.material as FakeMaterial)?.emissiveIntensity ?? 0).toBeLessThanOrEqual(
        0.01
      );
    });

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

    beamNodes.forEach((beamNode) => {
      expect(beamNode.visible).toBe(true);
    });
    expect((beamNodes[0]?.material as FakeMaterial)?.opacity ?? 0).toBeGreaterThan(
      (beamNodes[1]?.material as FakeMaterial)?.opacity ?? 0
    );
    expect((beamNodes[1]?.material as FakeMaterial)?.opacity ?? 0).toBeGreaterThan(
      (beamNodes[2]?.material as FakeMaterial)?.opacity ?? 0
    );
    expect(
      (beamNodes[0]?.material as FakeMaterial)?.emissiveIntensity ?? 0
    ).toBeGreaterThan((beamNodes[2]?.material as FakeMaterial)?.emissiveIntensity ?? 0);
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

function collectBeamMeshes(root: FakeNode | undefined): FakeMesh[] {
  const beams: FakeMesh[] = [];
  root?.traverse((node) => {
    if (node.userData?.lighthouseBeam) {
      beams.push(node as FakeMesh);
    }
  });
  return beams;
}
