import {
  DEFAULT_DAY_LENGTH_MS,
  DEFAULT_YEAR_LENGTH_DAYS,
  getDaylightCycleState,
} from '@bworlds/core';
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
  BoxGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
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
    expect((firstBeamMeshes[0]?.material as FakeMaterial | undefined)?.options.color).toBe(
      (secondBeamMeshes[0]?.material as FakeMaterial | undefined)?.options.color
    );
  });

  it('varies lighthouse beam colors across different regions while keeping local styles shared', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const coordinates = [
      { x: 4, y: 5 },
      { x: 40, y: 5 },
      { x: 4, y: 40 },
      { x: 40, y: 40 },
    ];
    const beamColors = new Set<string>();

    coordinates.forEach(({ x, y }) => {
      const model = tile?.create3DModel?.({
        three: fakeThree as never,
        state: {} as never,
        tile: { kind: 'lighthouse' } as never,
        tileX: x,
        tileY: y,
      }) as FakeNode | undefined;
      const beamMeshes = collectBeamMeshes(model);
      const color = (beamMeshes[0]?.material as FakeMaterial | undefined)?.options.color;
      if (typeof color === 'string') {
        beamColors.add(color);
      }
    });

    expect(beamColors.size).toBeGreaterThan(1);
  });

  it('varies lighthouse sweep configuration by region while keeping local settings shared', () => {
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
    const differentRegions = [
      { x: 4, y: 5 },
      { x: 40, y: 5 },
      { x: 4, y: 40 },
      { x: 40, y: 40 },
    ].map(({ x, y }) =>
      tile?.create3DModel?.({
        three: fakeThree as never,
        state: {} as never,
        tile: { kind: 'lighthouse' } as never,
        tileX: x,
        tileY: y,
      }) as FakeNode | undefined
    );
    const firstPivot = findBeamPivot(first);
    const secondPivot = findBeamPivot(second);
    const signatures = new Set(
      differentRegions
        .map((model) => {
          const pivot = findBeamPivot(model);
          return pivot
            ? `${pivot.userData?.lighthouseBeamRotationDirection}:${pivot.userData?.lighthouseBeamRotationDurationMs}`
            : null;
        })
        .filter((value): value is string => typeof value === 'string')
    );

    expect(firstPivot?.userData?.lighthouseBeamRotationDurationMs).toBe(
      secondPivot?.userData?.lighthouseBeamRotationDurationMs
    );
    expect(firstPivot?.userData?.lighthouseBeamRotationDirection).toBe(
      secondPivot?.userData?.lighthouseBeamRotationDirection
    );
    expect(signatures.size).toBeGreaterThan(1);
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

  it('builds a lantern room with glass, metal framing, and a dedicated lens source', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const glassMeshes = collectTaggedMeshes(model, 'lighthouseGlass');
    const frameMeshes = collectTaggedMeshes(model, 'lighthouseFrame');
    const lensMeshes = collectTaggedMeshes(model, 'lighthouseLens');
    const balconyMeshes = collectTaggedMeshes(model, 'lighthouseBalcony');
    const balconyRailMeshes = collectTaggedMeshes(model, 'lighthouseBalconyRail');
    const wallGlowMeshes = collectTaggedMeshes(model, 'lighthouseWallGlow');

    expect(glassMeshes).toHaveLength(1);
    expect(frameMeshes).toHaveLength(6);
    expect(lensMeshes).toHaveLength(1);
    expect(balconyMeshes).toHaveLength(1);
    expect(balconyRailMeshes).toHaveLength(5);
    expect(wallGlowMeshes).toHaveLength(4);
    expect((glassMeshes[0]?.material as FakeMaterial | undefined)?.options.transparent).toBe(true);
    expect((glassMeshes[0]?.material as FakeMaterial | undefined)?.options.opacity).toBeCloseTo(
      0.42,
      6
    );
    expect((frameMeshes[0]?.material as FakeMaterial | undefined)?.options.color).toBe('#5d6673');
    expect((lensMeshes[0]?.material as FakeMaterial | undefined)?.options.emissive).toBe(
      '#ffe9a8'
    );
    expect((balconyMeshes[0]?.material as FakeMaterial | undefined)?.options.color).toBe(
      '#8b7358'
    );
    expect((balconyRailMeshes[0]?.material as FakeMaterial | undefined)?.options.color).toBe(
      '#5d6673'
    );
    expect(balconyMeshes[0]?.position.y).toBeLessThan(glassMeshes[0]?.position.y ?? Infinity);
    expect((wallGlowMeshes[0]?.material as FakeMaterial | undefined)?.options.emissive).toBe(
      '#f8d7a1'
    );
  });

  it('builds a simplified low-detail lighthouse silhouette without the beam rig', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const full = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'full',
    }) as FakeNode | undefined;
    const low = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      detailLevel: 'low',
    }) as FakeNode | undefined;

    expect(collectBeamMeshes(low)).toHaveLength(0);
    expect((low?.children.length ?? 0)).toBeLessThan(full?.children.length ?? Infinity);
    expect(collectTaggedMeshes(low, 'lighthouseLens')).toHaveLength(1);
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
    const rotationDurationMs =
      typeof beamPivot?.userData?.lighthouseBeamRotationDurationMs === 'number'
        ? beamPivot.userData.lighthouseBeamRotationDurationMs
        : 2100;
    const rotationDirection =
      beamPivot?.userData?.lighthouseBeamRotationDirection === -1 ? -1 : 1;

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
      timeMs: rotationDurationMs / 3,
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
    const expectedRotation =
      ((((rotationDurationMs / 3 / rotationDurationMs) * Math.PI * 2 * rotationDirection) %
        (Math.PI * 2)) +
        Math.PI * 2) %
      (Math.PI * 2);
    expect(beamPivot?.rotation.y).toBeCloseTo(expectedRotation, 6);
  });

  it('activates from the shared seasonal sunset cycle and stays off after sunrise', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamNodes = collectBeamMeshes(model);
    const summerDay = Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.25);
    const winterDay = Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.75);
    const summerNoon = getDaylightCycleState(
      (summerDay + 0.5) * DEFAULT_DAY_LENGTH_MS,
      {
        dayLengthMs: DEFAULT_DAY_LENGTH_MS,
        yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
      }
    );
    const summerAfterSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', 0.04);
    const summerAfterSunrise = getCycleOffsetFromBoundary(summerDay, 'sunrise', 0.08);
    const winterAfterSunset = getCycleOffsetFromBoundary(winterDay, 'sunset', 0.08);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: summerNoon,
      environment: {},
    });
    expect(beamNodes.some((beam) => beam.visible)).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: summerAfterSunset,
      environment: {},
    });
    const summerSunsetOpacity = (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;
    expect(beamNodes.some((beam) => beam.visible)).toBe(true);
    expect(summerSunsetOpacity).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: summerAfterSunrise,
      environment: {},
    });
    expect(beamNodes.some((beam) => beam.visible)).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: winterAfterSunset,
      environment: {},
    });
    const winterSunsetOpacity = (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;
    expect(winterSunsetOpacity).toBeGreaterThan(0);
    expect(summerAfterSunset.sunsetProgress).toBeGreaterThan(winterAfterSunset.sunsetProgress);
  });

  it('fades the lighthouse beam gradually across the sunset boundary', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const beamNodes = collectBeamMeshes(model);
    const summerDay = Math.floor(DEFAULT_YEAR_LENGTH_DAYS * 0.25);
    const beforeSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', -0.08);
    const atSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', -0.02);
    const afterSunset = getCycleOffsetFromBoundary(summerDay, 'sunset', 0.02);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: beforeSunset,
      environment: {},
    });
    const beforeOpacity = (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: atSunset,
      environment: {},
    });
    const atOpacity = (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: afterSunset,
      environment: {},
    });
    const afterOpacity = (beamNodes[0]?.material as FakeMaterial | undefined)?.opacity ?? 0;

    expect(beforeOpacity).toBeLessThan(atOpacity);
    expect(atOpacity).toBeLessThan(afterOpacity);
    expect(beamNodes.some((beam) => beam.visible)).toBe(true);
  });

  it('keeps the lantern lens glowing at night even when the beam points away', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const lens = collectTaggedMeshes(model, 'lighthouseLens')[0];
    const beamPivot = findBeamPivot(model);
    const rotationDurationMs =
      typeof beamPivot?.userData?.lighthouseBeamRotationDurationMs === 'number'
        ? beamPivot.userData.lighthouseBeamRotationDurationMs
        : 2100;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: rotationDurationMs * 0.5,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(lens?.visible).toBe(true);
    expect((lens?.material as FakeMaterial | undefined)?.emissiveIntensity ?? 0).toBeGreaterThan(
      1.5
    );
    expect(beamPivot?.rotation.y).toBeGreaterThanOrEqual(0);
  });

  it('adds a warm glow to nearby tower surfaces at night', () => {
    const plugin = createLighthouseTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'lighthouse');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
    }) as FakeNode | undefined;
    const wallGlowMeshes = collectTaggedMeshes(model, 'lighthouseWallGlow');

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'lighthouse' } as never,
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(wallGlowMeshes).toHaveLength(4);
    wallGlowMeshes.forEach((mesh) => {
      expect((mesh.material as FakeMaterial | undefined)?.emissiveIntensity ?? 0).toBeGreaterThan(
        0.4
      );
    });
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

function collectTaggedMeshes(root: FakeNode | undefined, key: string): FakeMesh[] {
  const meshes: FakeMesh[] = [];
  root?.traverse((node) => {
    if (node.userData?.[key]) {
      meshes.push(node as FakeMesh);
    }
  });
  return meshes;
}

function findBeamPivot(root: FakeNode | undefined): FakeGroup | undefined {
  let pivot: FakeGroup | undefined;
  root?.traverse((node) => {
    if (node.userData?.lighthouseBeamPivot) {
      pivot = node as FakeGroup;
    }
  });
  return pivot;
}

function getCycleOffsetFromBoundary(
  dayNumber: number,
  boundary: 'sunrise' | 'sunset',
  offsetProgress: number
) {
  const anchor = getDaylightCycleState(dayNumber * DEFAULT_DAY_LENGTH_MS, {
    dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
  });
  const progress =
    boundary === 'sunrise' ? anchor.sunriseProgress : anchor.sunsetProgress;
  return getDaylightCycleState(
    (dayNumber + progress + offsetProgress) * DEFAULT_DAY_LENGTH_MS,
    {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
      yearLengthDays: DEFAULT_YEAR_LENGTH_DAYS,
    }
  );
}
