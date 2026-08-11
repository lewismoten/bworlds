import { describe, expect, it } from 'vitest';

import { createPlainsTilePlugin } from './index.ts';

class FakeGeometry {
  args: number[];

  constructor(...args: number[]) {
    this.args = args;
  }
}

class FakeMaterial {
  constructor(public options: Record<string, unknown> = {}) {}
}

class FakeMesh {
  position = {
    x: 0,
    y: 0,
    z: 0,
    set: (x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
    },
  };
  rotation = { x: 0, y: 0, z: 0 };
  receiveShadow = false;
  userData?: Record<string, unknown>;

  constructor(
    public geometry?: FakeGeometry,
    public material?: FakeMaterial
  ) {}
}

const fakeThree = {
  PlaneGeometry: FakeGeometry,
  Mesh: FakeMesh,
  MeshStandardMaterial: FakeMaterial,
} as const;

function getPlainsTile() {
  const tile = createPlainsTilePlugin().tiles?.find(
    (entry) => entry.kind === 'plains'
  );
  expect(tile).toBeDefined();
  return tile!;
}

function createState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile() {
      return { kind: 'plains' };
    },
    getTileDefinition() {
      return {
        name: 'Plains',
        color: '#7fb069',
        miniColor: '#95c779',
        walkable: true,
        wallHeight: 0,
      };
    },
  };
}

describe('tile plains', () => {
  it('builds a native low-cost plains model for both detail levels', () => {
    const tile = getPlainsTile();
    const state = createState();

    const fullModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'plains' },
      tileX: 4,
      tileY: -3,
      detailLevel: 'full',
    }) as FakeMesh;
    const lowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'plains' },
      tileX: 4,
      tileY: -3,
      detailLevel: 'low',
    }) as FakeMesh;

    expect(fullModel.geometry?.args).toEqual([0.94, 0.94]);
    expect(lowModel.geometry?.args).toEqual([0.88, 0.88]);
    expect(fullModel.position).toMatchObject({ x: 4, y: 0.006, z: -3 });
    expect(lowModel.position).toMatchObject({ x: 4, y: 0.004, z: -3 });
    expect(fullModel.rotation.x).toBeCloseTo(-Math.PI * 0.5, 5);
    expect(lowModel.rotation.x).toBeCloseTo(-Math.PI * 0.5, 5);
    expect(fullModel.userData).toMatchObject({
      renderStatKind: 'ground',
      plainsDetailLevel: 'full',
    });
    expect(lowModel.userData).toMatchObject({
      renderStatKind: 'ground',
      plainsDetailLevel: 'low',
    });
  });

  it('reuses the cached plains material and per-detail geometries on one host', () => {
    const tile = getPlainsTile();
    const state = createState();

    const firstFull = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'plains' },
      tileX: 0,
      tileY: 0,
      detailLevel: 'full',
    }) as FakeMesh;
    const secondFull = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'plains' },
      tileX: 1,
      tileY: 1,
      detailLevel: 'full',
    }) as FakeMesh;
    const lowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'plains' },
      tileX: 2,
      tileY: 2,
      detailLevel: 'low',
    }) as FakeMesh;

    expect(firstFull.material).toBe(secondFull.material);
    expect(firstFull.material).toBe(lowModel.material);
    expect(firstFull.geometry).toBe(secondFull.geometry);
    expect(firstFull.geometry).not.toBe(lowModel.geometry);
  });
});
