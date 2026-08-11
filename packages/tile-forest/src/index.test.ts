import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@bworlds/three-support')>();
  return {
    ...actual,
    createPaintedCanvasTexture() {
      return { colorSpace: '', needsUpdate: false };
    },
  };
});

import { createForestTilePlugin, getForestMeadows } from './index.ts';
import {
  FakeGroup,
  FakeInstancedMesh,
  createForestTestState,
  fakeThree,
} from './testing/forest-test-support.ts';

function getForestTile() {
  const plugin = createForestTilePlugin();
  const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
  expect(tile).toBeDefined();
  return tile!;
}

describe('tile forest', () => {
  it('creates a lower-detail distant forest model', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const fullModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'low',
    }) as FakeGroup;

    expect(lowModel.children.length).toBeLessThan(fullModel.children.length);
    expect(lowModel.children.every((node) => node.children.length === 0)).toBe(
      true
    );
    expect(
      lowModel.children.every(
        (node) => node.userData?.renderStatKind === 'tree'
      )
    ).toBe(true);
    expect(
      lowModel.children.every((node) => node instanceof FakeInstancedMesh)
    ).toBe(true);
  });

  it('renders meadow grass only in full-detail forest models', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestMeadows(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const fullModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;
    const lowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const fullGrassInstances = fullModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestMeadow === 'grass'
    ) as FakeInstancedMesh[];
    const lowGrassInstances = lowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestMeadow === 'grass'
    ) as FakeInstancedMesh[];

    expect(fullGrassInstances.length).toBeGreaterThan(0);
    expect(fullGrassInstances.every((mesh) => mesh.count > 0)).toBe(true);
    expect(lowGrassInstances).toHaveLength(0);
  });
});
