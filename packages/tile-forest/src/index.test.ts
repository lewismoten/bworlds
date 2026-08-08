import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
}));

import { createForestTilePlugin } from './index.ts';

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
  CanvasTexture: class {
    colorSpace = '';
    needsUpdate = false;
  },
  CylinderGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
} as const;

describe('tile forest', () => {
  it('creates a lower-detail distant forest model', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    const fullModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'low',
    }) as FakeGroup;

    expect(lowModel.children.length).toBeLessThan(fullModel.children.length);
    expect(
      lowModel.children.every((tree) => tree.children.length <= 2)
    ).toBe(true);
  });

  it('shows fireflies only after dark', () => {
    const plugin = createForestTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'forest' };
      },
      getTileDefinition() {
        return {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.38,
        };
      },
    };

    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const fireflyLights: FakePointLight[] = [];
    const fireflyGlows: FakeMesh[] = [];
    model.traverse((node) => {
      if (node instanceof FakePointLight && node.userData?.forestFireflyLight) {
        fireflyLights.push(node);
      }
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        fireflyGlows.push(node);
      }
    });

    expect(fireflyLights.length).toBeGreaterThan(0);
    expect(fireflyGlows.length).toBeGreaterThan(0);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(fireflyLights.every((light) => light.intensity <= 0.01)).toBe(true);
    expect(fireflyLights.every((light) => light.visible === false)).toBe(true);
    expect(
      fireflyGlows.every(
        (mesh) => ((mesh.material as FakeMaterial)?.emissiveIntensity ?? 0) <= 0.01
      )
    ).toBe(true);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      model,
      timeMs: 1200,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(fireflyLights.some((light) => light.intensity > 0.05)).toBe(true);
    expect(fireflyLights.some((light) => light.visible === true)).toBe(true);
    expect(
      fireflyGlows.some(
        (mesh) => ((mesh.material as FakeMaterial)?.emissiveIntensity ?? 0) > 0.1
      )
    ).toBe(true);
  });
});
