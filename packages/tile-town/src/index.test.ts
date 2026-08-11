import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  getOrCreatePaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createTexturedPlaneMesh(
    _three: unknown,
    _texture: unknown,
    width: number,
    height: number
  ) {
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
      scale: { x: width, y: height, z: 1 },
      userData: {},
      visible: true,
      children: [],
      add() {},
      traverse(visit: (child: unknown) => void) {
        visit(this);
      },
    };
  },
  createPaintedStandardMaterial(
    _three: unknown,
    options: Record<string, unknown>
  ) {
    return { options };
  },
}));

import {
  createTownTilePlugin,
  getTownBuildingCount,
  getTownNightLightCount,
  getTownNightLightDistance,
  getTownNightLightIntensity,
} from './index.ts';

function createWindEnvironment(windStrength: number) {
  return {
    weather: {
      current: {
        kind: 'wind' as const,
        label: 'Wind',
        intensity: windStrength,
        cloudCover: 0.2,
        windStrength,
        precipitation: 0,
        visibility: 0.9,
        temperature: 66,
        front: {
          id: 'front-town',
          kind: 'warm' as const,
          intensity: windStrength,
          humidityShift: 0.1,
          temperatureShift: 0.05,
          windDirectionDegrees: 90,
          speed: windStrength,
        },
      },
    },
  };
}

class FakeGeometry {
  constructor(...args: number[]) {
    void args;
  }
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
    public count = 1
  ) {
    super();
  }

  setMatrixAt(index: number, matrix: FakeMatrix4) {
    this.matrices[index] = matrix.clone();
  }
}
class FakeLight extends FakeNode {
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
  PointLight: FakeLight,
  MeshStandardMaterial: FakeMaterial,
  Matrix4: FakeMatrix4,
  BoxGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  DoubleSide: 2,
} as const;

function createTownState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile() {
      return { kind: 'town' };
    },
    getTileDefinition() {
      return {
        name: 'Town',
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0.5,
      };
    },
  };
}

function normalizeMaterialOptions(
  options: Record<string, unknown> | undefined
) {
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
      rotationX: node.rotation.x,
      rotationY: node.rotation.y,
      rotationZ: node.rotation.z,
      visible: node.visible,
      childCount: node.children.length,
      material:
        node instanceof FakeMesh || node instanceof FakeInstancedMesh
          ? Array.isArray(node.material)
            ? node.material.map((material) =>
                normalizeMaterialOptions(material.options)
              )
            : normalizeMaterialOptions(node.material?.options)
          : undefined,
      light:
        node instanceof FakeLight
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

describe('tile town', () => {
  it('scales town night lights with town size', () => {
    expect(getTownNightLightCount(3)).toBe(1);
    expect(getTownNightLightCount(6)).toBe(2);
    expect(getTownNightLightIntensity(3)).toBeCloseTo(0.9, 6);
    expect(getTownNightLightIntensity(6)).toBeCloseTo(1.2, 6);
    expect(getTownNightLightDistance(3)).toBeCloseTo(3.8, 6);
    expect(getTownNightLightDistance(6)).toBeCloseTo(4.8, 6);
  });

  it('creates a lower-detail distant town model', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();
    const descriptorCount = getTownBuildingCount(3, 7);

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'low',
    }) as FakeGroup;

    expect(lowModel.children.length).toBeLessThan(fullModel.children.length);
    const lowBodyInstances = lowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.townInstancedPart === 'low-building-body'
    ) as FakeInstancedMesh[];
    expect(lowBodyInstances).toHaveLength(1);
    expect(lowBodyInstances[0]?.count).toBe(descriptorCount);
    expect(lowBodyInstances[0]?.matrices).toHaveLength(descriptorCount);
    expect(
      fullModel.children.some(
        (child) =>
          child instanceof FakeInstancedMesh &&
          child.userData?.townInstancedPart === 'building-body'
      )
    ).toBe(true);
  });

  it('passes render quality through to textured town surface materials', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createTownState(),
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
      renderBudget: {
        quality: 'reduced',
      } as never,
    }) as FakeGroup;

    const signature = createModelSignature(model);
    const paintedMaterials = signature
      .map((entry) => entry.material)
      .filter((material) => material && !Array.isArray(material)) as Array<
      Record<string, unknown>
    >;

    expect(
      paintedMaterials.some((material) => material.quality === 'reduced')
    ).toBe(true);
  });

  it('uses the shared town profile to scale overworld building counts by town', () => {
    const counts = new Set(
      [
        [3, 7],
        [18, -11],
        [25, 9],
        [48, -16],
      ].map(([x, y]) => getTownBuildingCount(x, y))
    );

    expect(getTownBuildingCount(3, 7)).toBeGreaterThan(0);
    expect(getTownBuildingCount(3, 7)).toBe(getTownBuildingCount(3, 7));
    expect(counts.size).toBeGreaterThan(1);
  });

  it('activates town night lights after dark', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    const lights: FakeLight[] = [];
    model.traverse((node) => {
      if (node instanceof FakeLight && node.userData?.poiNightLightEmitter) {
        lights.push(node);
      }
    });

    expect(lights.length).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'town' },
      tileX: 3,
      tileY: 7,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(lights.every((light) => light.intensity <= 0.01)).toBe(true);
    expect(lights.every((light) => light.visible === false)).toBe(true);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'town' },
      tileX: 3,
      tileY: 7,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(lights.every((light) => light.intensity >= 0.9)).toBe(true);
    expect(lights.every((light) => light.visible === true)).toBe(true);
  });

  it('instances repeated full-detail town window panes instead of emitting one mesh per window', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    const windowInstances: FakeInstancedMesh[] = [];
    const standaloneWindowPanes: FakeMesh[] = [];
    model.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.townInstancedPart === 'window-pane'
      ) {
        windowInstances.push(node);
      }
      if (
        node instanceof FakeMesh &&
        node.userData?.poiNightLightEmitter &&
        node.userData?.townInstancedPart !== 'window-pane'
      ) {
        standaloneWindowPanes.push(node);
      }
    });

    expect(windowInstances).toHaveLength(1);
    expect(windowInstances[0]?.count).toBeGreaterThan(0);
    expect(windowInstances[0]?.matrices).toHaveLength(
      windowInstances[0]?.count ?? 0
    );
    expect(standaloneWindowPanes).toHaveLength(0);

    const windowMaterial = windowInstances[0]?.material;
    expect(windowMaterial).toBeInstanceOf(FakeMaterial);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'town' },
      tileX: 3,
      tileY: 7,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(
      (windowMaterial as FakeMaterial).emissiveIntensity
    ).toBeLessThanOrEqual(0.08);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'town' },
      tileX: 3,
      tileY: 7,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect((windowMaterial as FakeMaterial).emissiveIntensity).toBeGreaterThan(
      0.08
    );
  });

  it('instances repeated full-detail town building bodies, roofs, and doors', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    const bodyInstances = model.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.townInstancedPart === 'building-body'
    ) as FakeInstancedMesh[];
    const roofInstances = model.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.townInstancedPart === 'building-roof'
    ) as FakeInstancedMesh[];
    const doorInstances = model.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.townInstancedPart === 'building-door'
    ) as FakeInstancedMesh[];
    expect(bodyInstances).toHaveLength(1);
    expect(roofInstances).toHaveLength(1);
    expect(doorInstances).toHaveLength(1);
    expect(bodyInstances[0]?.count).toBeGreaterThan(0);
    expect(roofInstances[0]?.count).toBe(bodyInstances[0]?.count);
    expect(doorInstances[0]?.count).toBe(bodyInstances[0]?.count);
    expect(bodyInstances[0]?.matrices).toHaveLength(
      bodyInstances[0]?.count ?? 0
    );
    expect(roofInstances[0]?.matrices).toHaveLength(
      roofInstances[0]?.count ?? 0
    );
    expect(doorInstances[0]?.matrices).toHaveLength(
      doorInstances[0]?.count ?? 0
    );
  });

  it('places town name sign parts directly under the town root', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    const signParts = model.children.filter(
      (child) => typeof child.userData?.townSignPart === 'string'
    );
    const nestedGroups = model.children.filter(
      (child) => child instanceof FakeGroup
    );

    expect(signParts).toHaveLength(5);
    expect(
      signParts.map((child) => child.userData?.townSignPart).sort()
    ).toEqual(['back-label', 'cap', 'front-label', 'placard', 'post']);
    expect(nestedGroups).toHaveLength(0);
  });

  it('adds windy banners to full-detail town models and sways them with weather strength', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullBanners: FakeMesh[] = [];
    fullModel.traverse((node) => {
      if (
        node instanceof FakeMesh &&
        typeof node.userData?.townBanner === 'number'
      ) {
        fullBanners.push(node);
      }
    });

    const lowBanners: FakeMesh[] = [];
    lowModel.traverse((node) => {
      if (
        node instanceof FakeMesh &&
        typeof node.userData?.townBanner === 'number'
      ) {
        lowBanners.push(node);
      }
    });
    const bannerPoleInstances = fullModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.townInstancedPart === 'banner-pole'
    ) as FakeInstancedMesh[];
    const bannerCrossbarInstances = fullModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.townInstancedPart === 'banner-crossbar'
    ) as FakeInstancedMesh[];

    expect(fullBanners.length).toBeGreaterThan(0);
    expect(lowBanners.length).toBe(0);
    expect(bannerPoleInstances).toHaveLength(1);
    expect(bannerCrossbarInstances).toHaveLength(1);
    expect(bannerPoleInstances[0]?.count).toBe(fullBanners.length);
    expect(bannerCrossbarInstances[0]?.count).toBe(fullBanners.length);
    expect(bannerPoleInstances[0]?.matrices).toHaveLength(fullBanners.length);
    expect(bannerCrossbarInstances[0]?.matrices).toHaveLength(
      fullBanners.length
    );

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'town' },
      tileX: 3,
      tileY: 7,
      model: fullModel,
      timeMs: 1000,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: createWindEnvironment(0.1),
    });
    const baseRotation =
      typeof fullBanners[0]?.userData?.poiWindResponder === 'object' &&
      fullBanners[0]?.userData?.poiWindResponder &&
      'baseRotation' in fullBanners[0].userData.poiWindResponder
        ? Number(fullBanners[0].userData.poiWindResponder.baseRotation)
        : 0;
    const calmRotation = fullBanners[0]?.rotation.z ?? 0;

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'town' },
      tileX: 3,
      tileY: 7,
      model: fullModel,
      timeMs: 1000,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: createWindEnvironment(0.95),
    });
    const windyRotation = fullBanners[0]?.rotation.z ?? 0;

    expect(Math.abs(windyRotation - baseRotation)).toBeGreaterThan(
      Math.abs(calmRotation - baseRotation)
    );
  });

  it('keeps full-detail town model signatures stable after regional churn', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const baseline = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    for (let index = 0; index < 144; index += 1) {
      tile?.create3DModel?.({
        three: fakeThree as never,
        state,
        tile: {
          kind: 'town',
          poi: { type: 'town', name: `Town ${index}` },
        } as never,
        tileX: index * 18,
        tileY: 18,
        detailLevel: 'full',
      });
    }

    const resolved = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    expect(createModelSignature(resolved)).toEqual(
      createModelSignature(baseline)
    );
  });

  it('reuses shared town style materials across repeated builds in the same region', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 4,
      tileY: 8,
      detailLevel: 'full',
    }) as FakeGroup;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      4
    );
  });

  it('reuses full-detail banner cloth materials across repeated builds', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = createTownState();

    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } } as never,
      tileX: 3,
      tileY: 7,
      detailLevel: 'full',
    }) as FakeGroup;

    expect(findTownBannerMaterial(first)).toBe(findTownBannerMaterial(second));
    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      5
    );
  });
});

function countSharedMaterialReferences(
  left: FakeGroup,
  right: FakeGroup
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

function collectMeshMaterials(root: FakeGroup): Set<FakeMaterial> {
  const materials = new Set<FakeMaterial>();
  root.traverse((node) => {
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

function findTownBannerMaterial(root: FakeGroup) {
  let material: FakeMaterial | undefined;
  root.traverse((node) => {
    if (
      material ||
      !(node instanceof FakeMesh) ||
      typeof node.userData?.townBanner !== 'number'
    ) {
      return;
    }

    material = Array.isArray(node.material) ? node.material[0] : node.material;
  });
  return material;
}
