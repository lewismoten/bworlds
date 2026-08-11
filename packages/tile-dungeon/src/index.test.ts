import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createBasicMaterial(_three: unknown, options: Record<string, unknown>) {
    return { options };
  },
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createPaintedStandardMaterial(
    _three: unknown,
    options: Record<string, unknown>
  ) {
    return { options };
  },
}));

import { createDungeonTilePlugin } from './index.ts';

function createWindEnvironment(windStrength: number) {
  return {
    weather: {
      current: {
        kind: 'wind' as const,
        label: 'Wind',
        intensity: windStrength,
        cloudCover: 0.18,
        windStrength,
        precipitation: 0,
        visibility: 0.88,
        temperature: 58,
        front: {
          id: 'front-dungeon',
          kind: 'cold' as const,
          intensity: windStrength,
          humidityShift: 0.08,
          temperatureShift: -0.06,
          windDirectionDegrees: 120,
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
  scale = { x: 1, y: 1, z: 1 };
  position = { x: 0, y: 0, z: 0 };
  makeScale(x: number, y: number, z: number) {
    this.scale = { x, y, z };
    return this;
  }
  setPosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
    return this;
  }
  set(
    n11: number,
    n12: number,
    n13: number,
    n14: number,
    n21: number,
    n22: number,
    n23: number,
    n24: number,
    n31: number,
    n32: number,
    n33: number,
    n34: number,
    n41: number,
    n42: number,
    n43: number,
    n44: number
  ) {
    void n11;
    void n12;
    void n13;
    void n21;
    void n22;
    void n23;
    void n31;
    void n32;
    void n33;
    void n41;
    void n42;
    void n43;
    void n44;
    this.position = { x: n14, y: n24, z: n34 };
    return this;
  }
  clone() {
    const next = new FakeMatrix4();
    next.scale = { ...this.scale };
    next.position = { ...this.position };
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
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  CylinderGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  TorusGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  CircleGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  DoubleSide: 2,
} as const;

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

function createModelSignature(model: FakeNode) {
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
        node instanceof FakeMesh
          ? Array.isArray(node.material)
            ? node.material.map((material) =>
                normalizeMaterialOptions(material.options)
              )
            : normalizeMaterialOptions(node.material?.options)
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

function createDungeonState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile() {
      return { kind: 'dungeon' };
    },
    getTileDefinition() {
      return {
        name: 'Dungeon',
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0.65,
      };
    },
  };
}

describe('tile dungeon', () => {
  it('builds the full-detail dungeon progressively before returning the final model', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const build = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createDungeonState(),
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 6,
        label: 'shell-and-keep',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 6,
        label: 'towers',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 6,
        label: 'gate-structure',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 4,
        totalSteps: 6,
        label: 'gate-beacon',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 5,
        totalSteps: 6,
        label: 'tower-beacons',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 6,
        totalSteps: 6,
        label: 'banners',
      },
    });

    const completed = build?.next();
    const model = completed?.value as FakeGroup | undefined;
    expect(completed?.done).toBe(true);
    expect(model?.children.length).toBeGreaterThan(0);
  });

  it('keeps the synchronous dungeon build aligned with the progressive final model', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createDungeonState(),
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createDungeonState(),
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    });
    let progressiveModel: FakeGroup | undefined;
    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeGroup | undefined;
        break;
      }
    }

    expect(createModelSignature(progressiveModel!)).toEqual(
      createModelSignature(syncModel)
    );
  });

  it('adds more red beacon emitters in full-detail stronghold models than low detail', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullBeacons = new Set<string>();
    fullModel.traverse((node) => {
      const label = node.userData?.dungeonBeacon;
      if (typeof label === 'string') {
        fullBeacons.add(label);
      }
    });

    const lowBeacons = new Set<string>();
    lowModel.traverse((node) => {
      const label = node.userData?.dungeonBeacon;
      if (typeof label === 'string') {
        lowBeacons.add(label);
      }
    });

    expect(lowBeacons.has('gate')).toBe(true);
    expect(fullBeacons.has('gate')).toBe(true);
    expect(fullBeacons.size).toBeGreaterThan(lowBeacons.size);
  });

  it('passes render quality through to textured dungeon surface materials', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: createDungeonState(),
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
      renderBudget: {
        quality: 'minimal',
      } as never,
    }) as FakeGroup;

    const signature = createModelSignature(model);
    const paintedMaterials = signature
      .map((entry) => entry.material)
      .filter((material) => material && !Array.isArray(material)) as Array<
      Record<string, unknown>
    >;

    expect(
      paintedMaterials.some((material) => material.quality === 'minimal')
    ).toBe(true);
  });

  it('keeps low-detail dungeon silhouettes lighter than full-detail ones', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    }) as FakeGroup;

    expect(lowModel.children.length).toBeLessThan(fullModel.children.length);
    expect(
      lowModel.children.every((child) => child.children.length === 0)
    ).toBe(true);
  });

  it('instances repeated tower bodies and caps in full-detail dungeon models', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;

    const towerBodies: FakeInstancedMesh[] = [];
    const towerCaps: FakeInstancedMesh[] = [];
    const gatePosts: FakeInstancedMesh[] = [];
    const beaconBraziers: FakeInstancedMesh[] = [];
    const bannerPoles: FakeInstancedMesh[] = [];
    const bannerCrossbars: FakeInstancedMesh[] = [];
    fullModel.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.dungeonInstancedPart === 'tower-body'
      ) {
        towerBodies.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.dungeonInstancedPart === 'tower-cap'
      ) {
        towerCaps.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.dungeonInstancedPart === 'gate-post'
      ) {
        gatePosts.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.dungeonInstancedPart === 'beacon-brazier'
      ) {
        beaconBraziers.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.dungeonInstancedPart === 'banner-pole'
      ) {
        bannerPoles.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.dungeonInstancedPart === 'banner-crossbar'
      ) {
        bannerCrossbars.push(node);
      }
    });

    expect(towerBodies).toHaveLength(1);
    expect(towerCaps).toHaveLength(1);
    expect(gatePosts).toHaveLength(1);
    expect(beaconBraziers).toHaveLength(1);
    expect(bannerPoles).toHaveLength(1);
    expect(bannerCrossbars).toHaveLength(1);
    expect(towerBodies[0]?.count).toBeGreaterThanOrEqual(2);
    expect(towerBodies[0]?.count).toBe(towerCaps[0]?.count);
    expect(towerBodies[0]?.matrices.length).toBe(towerBodies[0]?.count);
    expect(towerCaps[0]?.matrices.length).toBe(towerCaps[0]?.count);
    expect(gatePosts[0]?.count).toBe(2);
    expect(gatePosts[0]?.matrices.length).toBe(gatePosts[0]?.count);
    expect(beaconBraziers[0]?.count).toBeGreaterThanOrEqual(2);
    expect(beaconBraziers[0]?.matrices.length).toBe(beaconBraziers[0]?.count);
    expect(bannerPoles[0]?.count).toBe(2);
    expect(bannerPoles[0]?.matrices.length).toBe(bannerPoles[0]?.count);
    expect(bannerCrossbars[0]?.count).toBe(2);
    expect(bannerCrossbars[0]?.matrices.length).toBe(bannerCrossbars[0]?.count);
  });

  it('intensifies red stronghold beacons at night', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;

    const glowMeshes: FakeMesh[] = [];
    const pointLights: FakePointLight[] = [];
    model.traverse((node) => {
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        glowMeshes.push(node);
      }
      if (
        node instanceof FakePointLight &&
        node.userData?.poiNightLightEmitter
      ) {
        pointLights.push(node);
      }
    });

    expect(glowMeshes.length).toBeGreaterThan(0);
    expect(pointLights.length).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(
      glowMeshes.every(
        (mesh) => (mesh.material as FakeMaterial).emissiveIntensity <= 0.02
      )
    ).toBe(true);
    expect(pointLights.every((light) => light.intensity <= 0.01)).toBe(true);
    expect(pointLights.every((light) => light.visible === false)).toBe(true);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(
      glowMeshes.some(
        (mesh) => (mesh.material as FakeMaterial).emissiveIntensity >= 1
      )
    ).toBe(true);
    expect(pointLights.some((light) => light.intensity >= 0.9)).toBe(true);
    expect(pointLights.every((light) => light.visible === true)).toBe(true);
  });

  it('adds windy banners to full-detail dungeon models and sways them with weather strength', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullBanners: FakeMesh[] = [];
    fullModel.traverse((node) => {
      if (
        node instanceof FakeMesh &&
        typeof node.userData?.dungeonBanner === 'string'
      ) {
        fullBanners.push(node);
      }
    });

    const lowBanners: FakeMesh[] = [];
    lowModel.traverse((node) => {
      if (
        node instanceof FakeMesh &&
        typeof node.userData?.dungeonBanner === 'string'
      ) {
        lowBanners.push(node);
      }
    });

    expect(fullBanners.length).toBeGreaterThan(0);
    expect(lowBanners.length).toBe(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      model: fullModel,
      timeMs: 1000,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: createWindEnvironment(0.08),
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
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      model: fullModel,
      timeMs: 1000,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: createWindEnvironment(0.92),
    });
    const windyRotation = fullBanners[0]?.rotation.z ?? 0;

    expect(Math.abs(windyRotation - baseRotation)).toBeGreaterThan(
      Math.abs(calmRotation - baseRotation)
    );
  });

  it('recreates dungeon regional styles after bounded cache eviction churn', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const firstModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    }) as FakeGroup;

    const firstBase = firstModel.children.find(
      (child) => child instanceof FakeMesh
    ) as FakeMesh | undefined;
    const firstMaterial = firstBase?.material;

    for (let index = 0; index <= 96; index += 1) {
      tile?.create3DModel?.({
        three: fakeThree as never,
        state,
        tile: { kind: 'dungeon' },
        tileX: index * 18,
        tileY: 0,
        detailLevel: 'low',
      });
    }

    const secondModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    }) as FakeGroup;

    const secondBase = secondModel.children.find(
      (child) => child instanceof FakeMesh
    ) as FakeMesh | undefined;
    const secondMaterial = secondBase?.material;

    expect(firstMaterial).toBeDefined();
    expect(secondMaterial).toBeDefined();
    expect(secondMaterial).not.toBe(firstMaterial);
  });

  it('reuses shared dungeon style materials across repeated builds in the same region', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    }) as FakeGroup;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 6,
      tileY: 5,
      detailLevel: 'low',
    }) as FakeGroup;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      3
    );
  });

  it('reuses full-detail gate, beacon, and banner materials across repeated builds', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      7
    );
    expect(findBeaconGlowMaterial(first)).toBe(findBeaconGlowMaterial(second));
    expect(findBannerClothMaterial(first)).toBe(
      findBannerClothMaterial(second)
    );
    expect(findGateVoidMaterial(first)).toBe(findGateVoidMaterial(second));
  });

  it('bounds shared dungeon glow material variants within a region', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();
    const glowMaterials = new Set<FakeMaterial>();

    for (let tileY = 0; tileY < 6; tileY += 1) {
      for (let tileX = 0; tileX < 6; tileX += 1) {
        const model = tile?.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'dungeon' },
          tileX,
          tileY,
          detailLevel: 'full',
        }) as FakeGroup;

        collectBeaconGlowMaterials(model).forEach((material) => {
          glowMaterials.add(material);
        });
      }
    }

    expect(glowMaterials.size).toBeLessThanOrEqual(11);
  });

  it('keeps full-detail dungeon model signatures stable after regional churn', () => {
    const plugin = createDungeonTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createDungeonState();

    const baseline = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;

    for (let index = 0; index < 144; index += 1) {
      tile?.create3DModel?.({
        three: fakeThree as never,
        state,
        tile: { kind: 'dungeon' },
        tileX: index * 18,
        tileY: 18,
        detailLevel: 'full',
      });
    }

    const resolved = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'full',
    }) as FakeGroup;

    expect(createModelSignature(resolved)).toEqual(
      createModelSignature(baseline)
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

function findBeaconGlowMaterial(root: FakeGroup) {
  let material: FakeMaterial | undefined;
  root.traverse((node) => {
    if (
      material ||
      !(node instanceof FakeMesh) ||
      typeof node.userData?.dungeonBeacon !== 'string'
    ) {
      return;
    }

    const resolved = Array.isArray(node.material)
      ? node.material[0]
      : node.material;
    if (resolved?.options?.emissive === '#ef4444') {
      material = resolved;
    }
  });
  return material;
}

function collectBeaconGlowMaterials(root: FakeGroup): Set<FakeMaterial> {
  const materials = new Set<FakeMaterial>();
  root.traverse((node) => {
    if (
      !(node instanceof FakeMesh) ||
      typeof node.userData?.dungeonBeacon !== 'string'
    ) {
      return;
    }

    const resolved = Array.isArray(node.material)
      ? node.material[0]
      : node.material;
    if (resolved?.options?.emissive === '#ef4444') {
      materials.add(resolved);
    }
  });
  return materials;
}

function findBannerClothMaterial(root: FakeGroup) {
  let material: FakeMaterial | undefined;
  root.traverse((node) => {
    if (
      material ||
      !(node instanceof FakeMesh) ||
      typeof node.userData?.dungeonBanner !== 'string'
    ) {
      return;
    }

    material = Array.isArray(node.material) ? node.material[0] : node.material;
  });
  return material;
}

function findGateVoidMaterial(root: FakeGroup) {
  let material: FakeMaterial | undefined;
  root.traverse((node) => {
    if (material || !(node instanceof FakeMesh)) {
      return;
    }

    const resolved = Array.isArray(node.material)
      ? node.material[0]
      : node.material;
    if (
      resolved &&
      typeof resolved === 'object' &&
      'options' in resolved &&
      resolved.options?.color === '#000000'
    ) {
      material = resolved;
    }
  });
  return material;
}
