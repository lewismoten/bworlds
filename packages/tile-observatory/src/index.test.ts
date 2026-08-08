import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createMountainTerrainMaterials() {
    return {
      mountainMaterial: { id: 'mountain-material' },
      snowMaterial: { id: 'snow-material' },
    };
  },
}));

import { createObservatoryTilePlugin } from './index.ts';

class FakeGeometry {
  constructor(..._args: number[]) {}
}

class FakeMaterial {
  constructor(public options: Record<string, unknown> = {}) {}
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

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  MeshStandardMaterial: FakeMaterial,
  CylinderGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
  BoxGeometry: FakeGeometry,
} as const;

describe('tile observatory', () => {
  it('opens the dome and reveals the telescope at night', () => {
    const plugin = createObservatoryTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'observatory');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile() {
          return { kind: 'mountain' };
        },
        getTileDefinition(kind: string) {
          return {
            name: kind,
            color: '#000000',
            miniColor: '#111111',
            walkable: kind !== 'mountain',
            wallHeight: 0,
          };
        },
      },
      tile: {
        kind: 'observatory',
        poi: { type: 'observatory', name: 'Spec Dome' },
      } as never,
      tileX: 4,
      tileY: 5,
    });

    let domePivot: FakeNode | null = null;
    let telescope: FakeNode | null = null;
    (model as FakeNode)?.traverse((node) => {
      if (node.userData?.observatoryDome) {
        domePivot = node;
      }
      if (node.userData?.observatoryTelescope) {
        telescope = node;
      }
    });

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'observatory' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(domePivot?.rotation.y ?? 0).toBeCloseTo(0, 6);
    expect(telescope?.visible).toBe(false);

    tile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'observatory' },
      tileX: 4,
      tileY: 5,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect((domePivot?.rotation.y ?? 0)).toBeGreaterThan(0.8);
    expect(telescope?.visible).toBe(true);
    expect((telescope?.rotation.x ?? 0)).toBeLessThan(0);
  });
});
