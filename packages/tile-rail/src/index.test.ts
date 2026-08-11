import { describe, expect, it } from 'vitest';
import { createRailTilePlugin } from './index.ts';

describe('tile rail', () => {
  it('creates a walkable rail tile definition', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');

    expect(tile?.definition).toEqual(
      expect.objectContaining({
        name: 'Rail Track',
        walkable: true,
      })
    );
  });

  it('renders sleepers and rails in overworld scenes', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');
    const three = createFakeThree() as never;
    const model = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state: {
        getCurrentContext() {
          return { type: 'overworld' };
        },
        getCurrentTile() {
          return { kind: 'rail' };
        },
      } as never,
      tileX: 0,
      tileY: 0,
    }) as { children?: unknown[] } | null | undefined;

    expect(model?.children.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('instances repeated rails instead of emitting two standalone meshes', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');
    const three = createFakeThree() as never;
    const model = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state: {
        getCurrentContext() {
          return { type: 'overworld' };
        },
        getCurrentTile() {
          return { kind: 'rail' };
        },
      } as never,
      tileX: 0,
      tileY: 0,
    }) as
      | {
          children?: Array<{
            userData?: Record<string, unknown>;
            count?: number;
          }>;
        }
      | null
      | undefined;

    const railInstances = model?.children?.filter(
      (child) => child.userData?.railInstancedPart === 'rail'
    );

    expect(railInstances).toHaveLength(1);
    expect(railInstances?.[0]?.count).toBe(2);
  });

  it('instances repeated sleepers instead of emitting four standalone meshes', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');
    const three = createFakeThree() as never;
    const model = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state: {
        getCurrentContext() {
          return { type: 'overworld' };
        },
        getCurrentTile() {
          return { kind: 'rail' };
        },
      } as never,
      tileX: 0,
      tileY: 0,
    }) as
      | {
          children?: Array<{
            userData?: Record<string, unknown>;
            count?: number;
          }>;
        }
      | null
      | undefined;

    const sleeperInstances = model?.children?.filter(
      (child) => child.userData?.railInstancedPart === 'sleeper'
    );

    expect(sleeperInstances).toHaveLength(1);
    expect(sleeperInstances?.[0]?.count).toBe(4);
  });

  it('reuses shared rail materials across repeated builds on the same host', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');
    const three = createFakeThree() as never;
    const state = {
      getCurrentContext() {
        return { type: 'overworld' };
      },
      getCurrentTile() {
        return { kind: 'rail' };
      },
    } as never;

    const first = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state,
      tileX: 0,
      tileY: 0,
    }) as
      | {
          children?: Array<{
            material: unknown;
            geometry: unknown;
            userData?: Record<string, unknown>;
          }>;
        }
      | null
      | undefined;
    const second = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state,
      tileX: 1,
      tileY: 0,
    }) as
      | {
          children?: Array<{
            material: unknown;
            geometry: unknown;
            userData?: Record<string, unknown>;
          }>;
        }
      | null
      | undefined;

    const firstRail = first?.children?.find(
      (child) => child.userData?.railInstancedPart === 'rail'
    );
    const secondRail = second?.children?.find(
      (child) => child.userData?.railInstancedPart === 'rail'
    );
    const firstSleepers = first?.children?.find(
      (child) => child.userData?.railInstancedPart === 'sleeper'
    );
    const secondSleepers = second?.children?.find(
      (child) => child.userData?.railInstancedPart === 'sleeper'
    );

    expect(firstRail?.material).toBe(secondRail?.material);
    expect(firstSleepers?.material).toBe(secondSleepers?.material);
    expect(firstRail?.geometry).toBe(secondRail?.geometry);
    expect(firstSleepers?.geometry).toBe(secondSleepers?.geometry);
  });
});

function createFakeThree() {
  class Matrix4 {
    makeScale() {
      return this;
    }
    setPosition() {
      return this;
    }
  }
  class Group {
    children: unknown[] = [];
    position = {
      set() {
        return undefined;
      },
    };
    add(child: unknown) {
      this.children.push(child);
    }
  }
  class Mesh {
    position = {
      set() {
        return undefined;
      },
    };
    rotation = { y: 0 };
    userData: Record<string, unknown> = { railPart: 'rail' };
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
  }
  class InstancedMesh {
    rotation = { y: 0 };
    userData: Record<string, unknown> = {};
    constructor(
      public geometry: unknown,
      public material: unknown,
      public count: number
    ) {}
    setMatrixAt() {
      return undefined;
    }
  }
  class MeshBasicMaterial {
    constructor(public options: unknown) {}
  }
  class BoxGeometry {
    constructor(
      public width: number,
      public height: number,
      public depth: number
    ) {}
  }

  return {
    Group,
    Mesh,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    BoxGeometry,
  };
}
