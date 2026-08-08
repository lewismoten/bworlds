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
});
