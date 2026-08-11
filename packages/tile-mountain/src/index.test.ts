import { describe, expect, it, vi } from 'vitest';
import { createMountainTilePlugin } from './index.ts';

vi.mock('@bworlds/three-support', () => ({
  createMountainTerrainMaterials() {
    return {
      mountainMaterial: new FakeMaterial({ color: '#6b7280' }),
      snowMaterial: new FakeMaterial({ color: '#f8fafc' }),
    };
  },
}));

class FakeGeometry {
  constructor(...args: number[]) {
    void args;
  }
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
  ConeGeometry: FakeGeometry,
} as const;

function createFakeThreeHost() {
  return {
    Group: FakeGroup,
    Mesh: FakeMesh,
    MeshStandardMaterial: FakeMaterial,
    ConeGeometry: FakeGeometry,
  } as const;
}

function createMountainState(kindResolver: (x: number, y: number) => string) {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      return { kind: kindResolver(x, y) };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: kind !== 'mountain',
        wallHeight: kind === 'mountain' ? 0.95 : 0,
      };
    },
  };
}

function createModelSignature(model: FakeNode | undefined) {
  const signature: Array<Record<string, unknown>> = [];
  model?.traverse((node) => {
    signature.push({
      type: node.constructor.name,
      x: node.position.x,
      y: node.position.y,
      z: node.position.z,
      rotationY: node.rotation.y,
      scaleZ: node.scale.z,
      childCount: node.children.length,
      material:
        node instanceof FakeMesh
          ? Array.isArray(node.material)
            ? node.material.map((material) => material.options)
            : node.material?.options
          : undefined,
    });
  });
  return signature;
}

describe('tile mountain', () => {
  it('builds mountain models progressively before returning the final model', () => {
    const plugin = createMountainTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'mountain');
    const state = createMountainState((x, y) => {
      const distance = Math.abs(x) + Math.abs(y);
      return distance <= 2 ? 'mountain' : 'plains';
    });

    const build = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 0,
      tileY: 0,
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 4,
        label: 'base',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 4,
        label: 'upper',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 4,
        label: 'crown',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 4,
        totalSteps: 4,
        label: 'snowcap',
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous mountain build aligned with the progressive final model', () => {
    const plugin = createMountainTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'mountain');
    const state = createMountainState((x, y) => {
      const distance = Math.abs(x) + Math.abs(y);
      return distance <= 2 ? 'mountain' : 'plains';
    });

    const syncModel = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeGroup | undefined;
    const progressiveBuild = tile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 0,
      tileY: 0,
    });
    let progressiveModel: FakeGroup | undefined;

    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeGroup | undefined;
        break;
      }
    }

    expect(createModelSignature(progressiveModel)).toEqual(
      createModelSignature(syncModel)
    );
  });

  it('creates deterministic mountain model signatures for the same tile', () => {
    const plugin = createMountainTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'mountain');
    const state = createMountainState(() => 'plains');

    const first = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 4,
      tileY: -3,
    }) as FakeNode | undefined;
    const second = tile?.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 4,
      tileY: -3,
    }) as FakeNode | undefined;

    expect(createModelSignature(second)).toEqual(createModelSignature(first));
  });

  it('builds taller mountain stacks when fully surrounded by mountains', () => {
    const plugin = createMountainTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'mountain');
    const isolatedState = createMountainState(() => 'plains');
    const surroundedState = createMountainState((x, y) => {
      const distance = Math.abs(x) + Math.abs(y);
      return distance <= 2 ? 'mountain' : 'plains';
    });

    const isolated = tile?.create3DModel?.({
      three: fakeThree as never,
      state: isolatedState,
      tile: { kind: 'mountain' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeGroup | undefined;
    const surrounded = tile?.create3DModel?.({
      three: fakeThree as never,
      state: surroundedState,
      tile: { kind: 'mountain' } as never,
      tileX: 0,
      tileY: 0,
    }) as FakeGroup | undefined;

    expect(isolated?.children).toHaveLength(2);
    expect(surrounded?.children.length ?? 0).toBeGreaterThanOrEqual(4);
  });

  it('keeps mountain materials scoped to the current Three host', () => {
    const plugin = createMountainTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'mountain');
    const state = createMountainState(() => 'plains');
    const firstHost = createFakeThreeHost();
    const secondHost = createFakeThreeHost();

    const firstModel = tile?.create3DModel?.({
      three: firstHost as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 4,
      tileY: -3,
    }) as FakeGroup | undefined;
    const secondModel = tile?.create3DModel?.({
      three: secondHost as never,
      state,
      tile: { kind: 'mountain' } as never,
      tileX: 4,
      tileY: -3,
    }) as FakeGroup | undefined;

    const firstBase = firstModel?.children[0] as FakeMesh | undefined;
    const secondBase = secondModel?.children[0] as FakeMesh | undefined;

    expect(firstBase?.material).toBeDefined();
    expect(secondBase?.material).toBeDefined();
    expect(secondBase?.material).not.toBe(firstBase?.material);
  });
});
