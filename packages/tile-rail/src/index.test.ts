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

    expect(model).toBeTruthy();
    expect(model?.children.length ?? 0).toBeGreaterThanOrEqual(1);
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
    }) as FakeNode | null | undefined;

    const railInstances = collectRailNodes(model).filter(
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
    }) as FakeNode | null | undefined;

    const sleeperInstances = collectRailNodes(model).filter(
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
    }) as FakeNode | null | undefined;
    const second = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state,
      tileX: 1,
      tileY: 0,
    }) as FakeNode | null | undefined;

    const firstRail = collectRailNodes(first).find(
      (child) => child.userData?.railInstancedPart === 'rail'
    );
    const secondRail = collectRailNodes(second).find(
      (child) => child.userData?.railInstancedPart === 'rail'
    );
    const firstSleepers = collectRailNodes(first).find(
      (child) => child.userData?.railInstancedPart === 'sleeper'
    );
    const secondSleepers = collectRailNodes(second).find(
      (child) => child.userData?.railInstancedPart === 'sleeper'
    );

    expect(firstRail?.material).toBe(secondRail?.material);
    expect(firstSleepers?.material).toBe(secondSleepers?.material);
    expect(firstRail?.geometry).toBe(secondRail?.geometry);
    expect(firstSleepers?.geometry).toBe(secondSleepers?.geometry);
  });

  it('builds rails progressively before returning the final model', () => {
    const plugin = createRailTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'rail');
    const three = createFakeThree() as never;
    const build = tile?.create3DModelProgressive?.({
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
    });

    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 2,
        label: 'rails',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 2,
        label: 'sleepers',
      },
    });
    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as FakeNode | undefined)?.children?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous rail build aligned with the progressive final model', () => {
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

    const syncModel = tile?.create3DModel?.({
      tile: { kind: 'rail' },
      three,
      state,
      tileX: 0,
      tileY: 0,
    }) as FakeNode | undefined;
    const build = tile?.create3DModelProgressive?.({
      tile: { kind: 'rail' },
      three,
      state,
      tileX: 0,
      tileY: 0,
    });
    let progressiveModel: FakeNode | undefined;
    while (true) {
      const next = build?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeNode | undefined;
        break;
      }
    }

    expect(createModelSignature(progressiveModel)).toEqual(
      createModelSignature(syncModel)
    );
  });

  it('uses the rail instanced mesh as the tile root instead of a wrapper group', () => {
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
      tileX: 4,
      tileY: 7,
    }) as FakeNode | undefined;

    expect(model?.userData?.railInstancedPart).toBe('rail');
    expect(model?.position).toMatchObject({ x: 4, y: 0, z: 7 });
  });
});

function collectRailNodes(root: FakeNode | null | undefined): FakeNode[] {
  const nodes: FakeNode[] = [];
  root?.traverse((node) => {
    nodes.push(node);
  });
  return nodes;
}

function createModelSignature(root: FakeNode | undefined) {
  const signature: string[] = [];
  root?.traverse((node) => {
    const part =
      (node.userData?.railInstancedPart as string | undefined) ?? 'group';
    const count =
      'count' in node && typeof node.count === 'number' ? node.count : 0;
    signature.push(`${part}:${count}:${node.rotation?.y ?? 0}`);
  });
  return signature;
}

function createFakeThree() {
  class BaseNode {
    children: unknown[] = [];
    position = {
      x: 0,
      y: 0,
      z: 0,
      set: (x = 0, y = 0, z = 0) => {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
        return undefined;
      },
    };
    rotation = { y: 0 };
    add(child: unknown) {
      this.children.push(child);
    }
    traverse(visit: (child: FakeNode) => void) {
      visit(this as never);
      for (const child of this.children as FakeNode[]) {
        child.traverse(visit);
      }
    }
  }
  class Matrix4 {
    makeScale() {
      return this;
    }
    setPosition() {
      return this;
    }
  }
  class Group extends BaseNode {}
  class Mesh extends BaseNode {
    userData: Record<string, unknown> = { railPart: 'rail' };
    geometry: unknown;
    material: unknown;
    constructor(geometry: unknown, material: unknown) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }
  class InstancedMesh extends BaseNode {
    userData: Record<string, unknown> = {};
    geometry: unknown;
    material: unknown;
    count: number;
    constructor(geometry: unknown, material: unknown, count: number) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.count = count;
    }
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

type FakeNode = {
  children?: FakeNode[];
  userData?: Record<string, unknown>;
  rotation: { y: number };
  position?: { x: number; y: number; z: number };
  material?: unknown;
  geometry?: unknown;
  traverse(visit: (child: FakeNode) => void): void;
  add?(child: FakeNode): void;
  count?: number;
};
