import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  getOrCreatePaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createTexturedPlaneMesh(_three: unknown, _texture: unknown, width: number, height: number) {
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
  createPaintedStandardMaterial(_three: unknown, options: Record<string, unknown>) {
    return { options };
  },
}));

import {
  createTownTilePlugin,
  getTownNightLightCount,
  getTownNightLightDistance,
  getTownNightLightIntensity,
} from './index.ts';

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
  PointLight: FakeLight,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
} as const;

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
    const state = {
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
    expect(
      lowModel.children.every((building) => building.children.length === 1)
    ).toBe(true);
  });

  it('activates town night lights after dark', () => {
    const plugin = createTownTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'town');
    const state = {
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
});
