import { describe, expect, it } from 'vitest';
import { createShipTilePlugin } from './index.ts';

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
  BoxGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  SphereGeometry: FakeGeometry,
} as const;

describe('tile ship', () => {
  it('creates an enterable ship model with a deterministic variant and night light', () => {
    const plugin = createShipTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'ship');
    const model = tile?.create3DModel?.({
      three: fakeThree as never,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile(x: number, y: number) {
          if (x === 5 && y === 4) return { kind: 'dock' };
          if (x === 5 && y === 3) return { kind: 'ocean' };
          if (x === 5 && y === 6) return { kind: 'plains' };
          return { kind: 'shore' };
        },
        getTileDefinition(kind: string) {
          return {
            name: kind,
            color: '#000000',
            miniColor: '#111111',
            walkable: kind !== 'ocean',
            wallHeight: 0,
          };
        },
      },
      tile: {
        kind: 'ship',
        poi: { type: 'ship', name: 'Spec Mast' },
      } as never,
      tileX: 5,
      tileY: 5,
    });

    expect((model as FakeNode)?.userData?.shipPoiVariant).toMatch(
      /tall-ship|broken-ship/
    );

    let sawLantern = false;
    (model as FakeNode)?.traverse((node) => {
      if (node instanceof FakePointLight) {
        sawLantern = true;
      }
    });
    expect(sawLantern).toBe(true);
  });
});
