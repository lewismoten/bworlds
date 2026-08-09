import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createBasicMaterial(_three: unknown, options: Record<string, unknown>) {
    return { options };
  },
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createPaintedStandardMaterial(_three: unknown, options: Record<string, unknown>) {
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
  constructor(..._args: number[]) {}
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
class FakeMesh extends FakeNode {
  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[]
  ) {
    super();
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

function normalizeMaterialOptions(options: Record<string, unknown> | undefined) {
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
      if (node instanceof FakePointLight && node.userData?.poiNightLightEmitter) {
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
      if (node instanceof FakeMesh && typeof node.userData?.dungeonBanner === 'string') {
        fullBanners.push(node);
      }
    });

    const lowBanners: FakeMesh[] = [];
    lowModel.traverse((node) => {
      if (node instanceof FakeMesh && typeof node.userData?.dungeonBanner === 'string') {
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

    const firstBase = firstModel.children.find((child) => child instanceof FakeMesh) as
      | FakeMesh
      | undefined;
    const firstMaterial = firstBase?.material;

    for (let index = 0; index < 96; index += 1) {
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

    const secondBase = secondModel.children.find((child) => child instanceof FakeMesh) as
      | FakeMesh
      | undefined;
    const secondMaterial = secondBase?.material;

    expect(firstMaterial).toBeDefined();
    expect(secondMaterial).toBeDefined();
    expect(secondMaterial).not.toBe(firstMaterial);
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

    expect(createModelSignature(resolved)).toEqual(createModelSignature(baseline));
  });
});
