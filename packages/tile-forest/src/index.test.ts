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

import {
  createForestTilePlugin,
  getForestBirds,
  getForestLandmark,
  getForestMeadows,
  getForestTreeSpeciesIds,
} from './index.ts';
import {
  FakeGroup,
  FakeInstancedMesh,
  FakeMesh,
  FakeNode,
  FakePoints,
  createForestTestState,
  fakeThree,
} from './testing/forest-test-support.ts';

function getForestTile() {
  const plugin = createForestTilePlugin();
  const tile = plugin.tiles?.find((entry) => entry.kind === 'forest');
  expect(tile).toBeDefined();
  return tile!;
}

function createForestModelSignature(root: FakeNode) {
  const signature: string[] = [];
  root.traverse((node) => {
    const userDataParts = Object.entries(node.userData ?? {})
      .filter(([, value]) =>
        ['string', 'number', 'boolean'].includes(typeof value)
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}:${String(value)}`);
    signature.push(
      [
        node.constructor.name,
        `children:${node.children.length}`,
        `position:${node.position.x},${node.position.y},${node.position.z}`,
        `scale:${node.scale.x},${node.scale.y},${node.scale.z}`,
        ...userDataParts,
      ].join('|')
    );
  });
  return signature;
}

describe('tile forest', () => {
  it('builds the full-detail forest progressively before returning the final model', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const build = tile.create3DModelProgressive?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 6,
        label: 'trees-primary',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 6,
        label: 'trees-secondary',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 6,
        label: 'hollows-and-markings',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 4,
        totalSteps: 6,
        label: 'understory-and-wildlife',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 5,
        totalSteps: 6,
        label: 'landmarks-and-floor',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 6,
        totalSteps: 6,
        label: 'close-effects',
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous forest build aligned with the progressive final model', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const syncModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const progressiveBuild = tile.create3DModelProgressive?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    });
    let progressiveModel: FakeGroup | undefined;

    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeGroup | undefined;
        break;
      }
    }

    expect(createForestModelSignature(progressiveModel!)).toEqual(
      createForestModelSignature(syncModel)
    );
  });

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

  it('keeps the low-detail forest material set within a small shared budget', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const lowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'low',
    }) as FakeGroup;

    const materials = new Set<unknown>();
    lowModel.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.renderStatKind === 'tree' &&
        node.material
      ) {
        const nodeMaterials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        nodeMaterials.forEach((material) => materials.add(material));
      }
    });

    expect(materials.size).toBeLessThanOrEqual(3);
  });

  it('keeps low-detail forest tree materials within budget across sampled tiles', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const lowModel = tile.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'forest' },
          tileX,
          tileY,
          detailLevel: 'low',
        }) as FakeGroup;

        const materials = new Set<unknown>();
        lowModel.traverse((node) => {
          if (
            node instanceof FakeInstancedMesh &&
            node.userData?.renderStatKind === 'tree' &&
            node.material
          ) {
            const nodeMaterials = Array.isArray(node.material)
              ? node.material
              : [node.material];
            nodeMaterials.forEach((material) => materials.add(material));
          }
        });

        expect(materials.size).toBeLessThanOrEqual(3);
      }
    }
  });

  it('reuses full-detail forest family materials in low-detail tree instances', () => {
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

    const fullMaterials = new Set<unknown>();
    fullModel.traverse((node) => {
      if (
        (node instanceof FakeMesh || node instanceof FakeInstancedMesh) &&
        node.material
      ) {
        const nodeMaterials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        nodeMaterials.forEach((material) => fullMaterials.add(material));
      }
    });

    const lowMaterials = new Set<unknown>();
    lowModel.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.renderStatKind === 'tree' &&
        node.material
      ) {
        const nodeMaterials = Array.isArray(node.material)
          ? node.material
          : [node.material];
        nodeMaterials.forEach((material) => lowMaterials.add(material));
      }
    });

    expect(lowMaterials.size).toBeGreaterThan(0);
    lowMaterials.forEach((material) => {
      expect(fullMaterials.has(material)).toBe(true);
    });
  });

  it('collapses mixed low-detail forest tiles to one shared trunk mesh', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const speciesIds = new Set(getForestTreeSpeciesIds(tileX, tileY));
        if (
          speciesIds.has('pine') &&
          (speciesIds.has('oak') || speciesIds.has('birch'))
        ) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const lowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'low',
    }) as FakeGroup;

    const instancedTrunks = lowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestTreeLowDetailInstancedPart === 'trunk'
    ) as FakeInstancedMesh[];
    const instancedCanopies = lowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestTreeLowDetailInstancedPart === 'canopy'
    ) as FakeInstancedMesh[];

    expect(instancedTrunks).toHaveLength(1);
    expect(instancedCanopies.length).toBeGreaterThan(1);
    expect(instancedTrunks[0]?.count).toBeGreaterThan(1);
    const totalCanopyInstances = instancedCanopies.reduce(
      (sum, mesh) => sum + mesh.count,
      0
    );
    expect(totalCanopyInstances).toBe(instancedTrunks[0]?.count);
  });

  it('reuses invariant full-detail forest accessory materials across tiles on one host', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    const markerToMaterials = new Map<string, Set<unknown>>();
    const expectedMarkers = new Set([
      'forestLandmark:stone-ring',
      'forestLandmark:mushroom-ring-stem',
      'forestLandmark:mushroom-ring-cap',
      'forestHollowInstanced',
      'forestOwlBodyInstanced',
      'forestOwlEye',
      'forestSpider:body',
      'forestSpider:legs',
      'forestCarvingInstanced',
      'forestWeb',
      'forestMeadow:grass',
      'forestMeadow:flower-stem',
      'forestMeadow:white',
      'forestMeadow:yellow',
      'forestTrail:breadcrumb',
      'forestBird:left-wing',
      'forestBird:right-wing',
      'forestBird:body',
    ]);

    outer: for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const model = tile.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'forest' },
          tileX,
          tileY,
          detailLevel: 'full',
        }) as FakeGroup;

        model.traverse((node) => {
          const materialOwner = node as FakeNode & {
            material?: unknown | unknown[];
          };
          if (!materialOwner.material) {
            return;
          }
          const marker = getForestAccessoryMaterialMarker(node);
          if (!marker) {
            return;
          }
          if (!markerToMaterials.has(marker)) {
            markerToMaterials.set(marker, new Set());
          }
          const materials = Array.isArray(materialOwner.material)
            ? materialOwner.material
            : [materialOwner.material];
          materials.forEach((material) =>
            markerToMaterials.get(marker)!.add(material)
          );
        });

        const allMarkersFound = [...expectedMarkers].every((marker) =>
          markerToMaterials.has(marker)
        );
        if (allMarkersFound) {
          break outer;
        }
      }
    }

    expect(
      [...expectedMarkers].every((marker) => markerToMaterials.has(marker))
    ).toBe(true);
    expectedMarkers.forEach((marker) => {
      expect(markerToMaterials.get(marker)?.size).toBe(1);
    });
  });

  it('keeps sampled full-detail forest materials within a bounded shared palette on one host', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    const materials = new Set<unknown>();

    for (let tileY = 0; tileY < 8; tileY += 1) {
      for (let tileX = 0; tileX < 8; tileX += 1) {
        const model = tile.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'forest' },
          tileX,
          tileY,
          detailLevel: 'full',
        }) as FakeGroup;

        model.traverse((node) => {
          if (
            (node instanceof FakeMesh || node instanceof FakeInstancedMesh) &&
            node.material
          ) {
            const nodeMaterials = Array.isArray(node.material)
              ? node.material
              : [node.material];
            nodeMaterials.forEach((material) => materials.add(material));
          }
        });
      }
    }

    expect(materials.size).toBeLessThanOrEqual(14);
  });

  it('shares full-detail broadleaf trunk and foliage materials across oak and birch trees on one host', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    const broadleafTrunkMaterials = new Set<unknown>();
    const broadleafFoliageMaterials = new Set<unknown>();
    const pineTrunkMaterials = new Set<unknown>();
    const pineFoliageMaterials = new Set<unknown>();

    for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const model = tile.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'forest' },
          tileX,
          tileY,
          detailLevel: 'full',
        }) as FakeGroup;
        collectTreeFamilyMaterials(model, {
          broadleafTrunkMaterials,
          broadleafFoliageMaterials,
          pineTrunkMaterials,
          pineFoliageMaterials,
        });
      }
    }

    expect(broadleafTrunkMaterials.size).toBe(1);
    expect(broadleafFoliageMaterials.size).toBe(1);
    expect(pineTrunkMaterials.size).toBe(1);
    expect(pineFoliageMaterials.size).toBe(1);
    expect([...broadleafTrunkMaterials][0]).not.toBe(
      [...pineTrunkMaterials][0]
    );
    expect([...broadleafFoliageMaterials][0]).not.toBe(
      [...pineFoliageMaterials][0]
    );
  });

  it('keeps each sampled forest species within a one-material trunk and foliage budget on one host', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    const speciesTargets = new Map<
      'oak' | 'birch' | 'pine',
      { x: number; y: number }
    >();

    outer: for (let tileY = 0; tileY < 32; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        const speciesIds = new Set(getForestTreeSpeciesIds(tileX, tileY));
        if (speciesIds.size !== 1) {
          continue;
        }
        const [speciesId] = [...speciesIds];
        if (
          (speciesId === 'oak' ||
            speciesId === 'birch' ||
            speciesId === 'pine') &&
          !speciesTargets.has(speciesId)
        ) {
          speciesTargets.set(speciesId, { x: tileX, y: tileY });
          if (speciesTargets.size === 3) {
            break outer;
          }
        }
      }
    }

    expect(speciesTargets.size).toBe(3);

    const speciesBuckets = new Map<
      'oak' | 'birch' | 'pine',
      { trunkMaterials: Set<unknown>; foliageMaterials: Set<unknown> }
    >();

    speciesTargets.forEach((coordinates, speciesId) => {
      const model = tile.create3DModel?.({
        three: fakeThree as never,
        state,
        tile: { kind: 'forest' },
        tileX: coordinates.x,
        tileY: coordinates.y,
        detailLevel: 'full',
      }) as FakeGroup;
      const trunkMaterials = new Set<unknown>();
      const foliageMaterials = new Set<unknown>();

      model.children.forEach((child) => {
        child.traverse((node) => {
          const materialOwner = node as FakeNode & {
            material?: unknown | unknown[];
          };
          if (!materialOwner.material) {
            return;
          }
          const material = Array.isArray(materialOwner.material)
            ? materialOwner.material[0]
            : materialOwner.material;
          if (!material) {
            return;
          }
          if (
            node.userData?.forestTreeTrunkSegment ||
            node.userData?.forestTreeBranchInstanced
          ) {
            trunkMaterials.add(material);
          }
          if (node.userData?.forestTreeFoliageInstanced) {
            foliageMaterials.add(material);
          }
        });
      });

      speciesBuckets.set(speciesId, {
        trunkMaterials,
        foliageMaterials,
      });
    });

    expect(speciesBuckets.get('oak')?.trunkMaterials.size).toBe(1);
    expect(speciesBuckets.get('oak')?.foliageMaterials.size).toBe(1);
    expect(speciesBuckets.get('birch')?.trunkMaterials.size).toBe(1);
    expect(speciesBuckets.get('birch')?.foliageMaterials.size).toBe(1);
    expect(speciesBuckets.get('pine')?.trunkMaterials.size).toBe(1);
    expect(speciesBuckets.get('pine')?.foliageMaterials.size).toBe(1);
    expect(
      [...(speciesBuckets.get('oak')?.trunkMaterials ?? new Set())][0]
    ).toBe([...(speciesBuckets.get('birch')?.trunkMaterials ?? new Set())][0]);
    expect(
      [...(speciesBuckets.get('oak')?.foliageMaterials ?? new Set())][0]
    ).toBe(
      [...(speciesBuckets.get('birch')?.foliageMaterials ?? new Set())][0]
    );
    expect(
      [...(speciesBuckets.get('oak')?.trunkMaterials ?? new Set())][0]
    ).not.toBe(
      [...(speciesBuckets.get('pine')?.trunkMaterials ?? new Set())][0]
    );
    expect(
      [...(speciesBuckets.get('oak')?.foliageMaterials ?? new Set())][0]
    ).not.toBe(
      [...(speciesBuckets.get('pine')?.foliageMaterials ?? new Set())][0]
    );
  });

  it('instances full-detail tree branches and foliage within each tree', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const model = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const branchInstances: FakeInstancedMesh[] = [];
    const foliageInstances: FakeInstancedMesh[] = [];
    model.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.forestTreeBranchInstanced
      ) {
        branchInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.forestTreeFoliageInstanced
      ) {
        foliageInstances.push(node);
      }
    });

    expect(branchInstances.length).toBeGreaterThan(0);
    expect(branchInstances.every((mesh) => mesh.count > 0)).toBe(true);
    expect(branchInstances.length).toBeLessThanOrEqual(2);
    expect(foliageInstances.length).toBeGreaterThan(0);
    expect(foliageInstances.every((mesh) => mesh.count > 0)).toBe(true);
    expect(foliageInstances.length).toBeLessThanOrEqual(2);
  });

  it('places full-detail tree instance sets directly under the tile root', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const model = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const treeWrapperGroups: FakeGroup[] = [];
    model.traverse((node) => {
      if (
        node instanceof FakeGroup &&
        node !== model &&
        node.userData?.renderStatKind === 'tree'
      ) {
        treeWrapperGroups.push(node);
      }
    });

    expect(treeWrapperGroups).toHaveLength(0);
  });

  it('batches full-detail tree trunk segments into instanced meshes', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    const model = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;

    const trunkInstances: FakeInstancedMesh[] = [];
    const trunkMeshes: FakeMesh[] = [];
    model.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        typeof node.userData?.forestTreeTrunkInstancedSegment === 'string'
      ) {
        trunkInstances.push(node);
      }
      if (
        node instanceof FakeMesh &&
        typeof node.userData?.forestTreeTrunkSegment === 'string'
      ) {
        trunkMeshes.push(node);
      }
    });

    expect(trunkInstances.length).toBeGreaterThan(0);
    expect(trunkInstances.every((mesh) => mesh.count > 0)).toBe(true);
    expect(trunkMeshes).toHaveLength(0);
  });

  it('collapses reduced-quality full-detail forest tiles entirely to background low-detail tree instances', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    state.player.x = 8;
    state.player.y = 6;

    const defaultModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    }) as FakeGroup;
    const reducedModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'full',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    const defaultTreeGroups: FakeGroup[] = [];
    const reducedTreeGroups: FakeGroup[] = [];
    const reducedBackgroundInstances: FakeInstancedMesh[] = [];
    defaultModel.traverse((node) => {
      if (
        node instanceof FakeGroup &&
        node.userData?.renderStatKind === 'tree'
      ) {
        defaultTreeGroups.push(node);
      }
    });
    reducedModel.traverse((node) => {
      if (
        node instanceof FakeGroup &&
        node.userData?.renderStatKind === 'tree'
      ) {
        reducedTreeGroups.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        typeof node.userData?.forestTreeLowDetailInstancedPart === 'string'
      ) {
        reducedBackgroundInstances.push(node);
      }
    });

    expect(defaultTreeGroups).toHaveLength(0);
    expect(reducedTreeGroups).toHaveLength(0);
    expect(reducedBackgroundInstances.length).toBeGreaterThan(0);
  });

  it('collapses nearby reduced-quality forest tiles fully to low-detail tree instances', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    state.player.x = 8;
    state.player.y = 6;

    const reducedNearbyModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 9,
      tileY: 6,
      detailLevel: 'full',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'full',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    const reducedTreeGroups: FakeGroup[] = [];
    const reducedBackgroundInstances: FakeInstancedMesh[] = [];
    reducedNearbyModel.traverse((node) => {
      if (
        node instanceof FakeGroup &&
        node.userData?.renderStatKind === 'tree'
      ) {
        reducedTreeGroups.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        typeof node.userData?.forestTreeLowDetailInstancedPart === 'string'
      ) {
        reducedBackgroundInstances.push(node);
      }
    });

    expect(reducedTreeGroups).toHaveLength(0);
    expect(reducedBackgroundInstances.length).toBeGreaterThan(0);
  });

  it('collapses reduced-quality near forest canopies to one shared instanced mesh while keeping trunks grounded', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    let targetTile: { x: number; y: number } | null = null;

    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        const speciesIds = new Set(getForestTreeSpeciesIds(tileX, tileY));
        if (
          speciesIds.has('pine') &&
          (speciesIds.has('oak') || speciesIds.has('birch'))
        ) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();
    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;

    const reducedModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'full',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    const instancedTrunks: FakeInstancedMesh[] = [];
    const instancedCanopies: FakeInstancedMesh[] = [];
    reducedModel.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.forestTreeLowDetailInstancedPart === 'trunk'
      ) {
        instancedTrunks.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.forestTreeLowDetailInstancedPart === 'canopy'
      ) {
        instancedCanopies.push(node);
      }
    });

    expect(instancedTrunks).toHaveLength(1);
    expect(instancedCanopies).toHaveLength(1);
    expect(instancedCanopies[0]?.count).toBeGreaterThan(0);
  });

  it('keeps low-detail trunk instances on the player tile while reduced quality is active', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    state.player.x = 8;
    state.player.y = 6;

    const reducedLowModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'low',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'low',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    const instancedTrunks = reducedLowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestTreeLowDetailInstancedPart === 'trunk'
    );
    const instancedCanopies = reducedLowModel.children.filter(
      (child) =>
        child instanceof FakeInstancedMesh &&
        child.userData?.forestTreeLowDetailInstancedPart === 'canopy'
    ) as FakeInstancedMesh[];

    expect(instancedTrunks).toHaveLength(1);
    expect(instancedCanopies).toHaveLength(1);
    expect(instancedCanopies[0]?.count).toBeGreaterThan(0);
  });

  it('skips some distant reduced-quality forest background tiles entirely', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    state.player.x = 8;
    state.player.y = 6;

    const reducedDistantModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 10,
      tileY: 8,
      detailLevel: 'low',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'low',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    expect(reducedDistantModel.children).toHaveLength(0);
  });

  it('keeps nearby reduced-quality low-detail forest tiles inside the immediate ring', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    state.player.x = 8;
    state.player.y = 6;

    const reducedNearbyModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 9,
      tileY: 7,
      detailLevel: 'low',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'low',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    expect(reducedNearbyModel.children.length).toBeGreaterThan(0);
  });

  it('skips more distant reduced-quality low-detail forest tiles beyond the immediate ring', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    state.player.x = 8;
    state.player.y = 6;

    const reducedFarModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 10,
      tileY: 8,
      detailLevel: 'low',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'low',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    expect(reducedFarModel.children).toHaveLength(0);
  });

  it('renders forest fireflies only at full quality close detail', () => {
    const tile = getForestTile();
    const state = createForestTestState(8, 6);

    const fullModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
      renderBudget: {
        quality: 'full',
        detailLevel: 'full',
        targetFps: 60,
        visibilityRadius: 18,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;
    const reducedModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'full',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    const fullFireflies: FakePoints[] = [];
    const reducedFireflies: FakePoints[] = [];
    fullModel.traverse((node) => {
      if (node instanceof FakePoints && node.userData?.forestFirefly) {
        fullFireflies.push(node);
      }
    });
    reducedModel.traverse((node) => {
      if (node instanceof FakePoints && node.userData?.forestFirefly) {
        reducedFireflies.push(node);
      }
    });

    expect(fullFireflies.length).toBeGreaterThan(0);
    expect(reducedFireflies).toHaveLength(0);
  });

  it('skips optional forest accessory details when reduced quality is active', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    let targetTile: { x: number; y: number } | null = null;
    let fullMarkers: string[] = [];

    outer: for (let tileY = 0; tileY < 24; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        state.player.x = tileX;
        state.player.y = tileY;
        const fullModel = tile.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'forest' },
          tileX,
          tileY,
          detailLevel: 'full',
          renderBudget: {
            quality: 'full',
            detailLevel: 'full',
            targetFps: 60,
            visibilityRadius: 18,
            frame: {},
            pendingBuild: {},
          },
        }) as FakeGroup;
        const markers = collectForestAccessoryMarkers(fullModel);
        if (markers.length > 0) {
          targetTile = { x: tileX, y: tileY };
          fullMarkers = markers;
          break outer;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    state.player.x = targetTile!.x;
    state.player.y = targetTile!.y;
    const reducedModel = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
      renderBudget: {
        quality: 'reduced',
        detailLevel: 'full',
        targetFps: 60,
        visibilityRadius: 10,
        frame: {},
        pendingBuild: {},
      },
    }) as FakeGroup;

    expect(fullMarkers.length).toBeGreaterThan(0);
    expect(collectForestAccessoryMarkers(reducedModel)).toEqual([]);
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

  it('instances animated birds instead of emitting one group per bird', () => {
    const tile = getForestTile();
    const state = createForestTestState();

    let targetTile: { x: number; y: number } | null = null;
    for (let tileY = 0; tileY < 24 && !targetTile; tileY += 1) {
      for (let tileX = 0; tileX < 24; tileX += 1) {
        if (getForestBirds(tileX, tileY).length > 0) {
          targetTile = { x: tileX, y: tileY };
          break;
        }
      }
    }

    expect(targetTile).not.toBeNull();

    const model = tile.create3DModel?.({
      three: fakeThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: targetTile!.x,
      tileY: targetTile!.y,
      detailLevel: 'full',
    }) as FakeGroup;

    const birdInstanceParts = new Set<string>();
    let legacyBirdGroups = 0;
    model.traverse((node) => {
      if (node.userData?.forestBirdInstancedPart) {
        birdInstanceParts.add(String(node.userData.forestBirdInstancedPart));
      }
      if (
        node instanceof FakeGroup &&
        node.userData?.forestBird &&
        !Array.isArray(node.userData.forestBird)
      ) {
        legacyBirdGroups += 1;
      }
    });

    expect(birdInstanceParts).toEqual(
      new Set(['left-wing', 'right-wing', 'body'])
    );
    expect(legacyBirdGroups).toBe(0);
  });

  it('reuses landmark geometries across repeated forest landmark tiles on one host', () => {
    const tile = getForestTile();
    const state = createForestTestState();
    const geometryByMarker = new Map<string, Set<unknown>>();
    const expectedMarkers = new Set([
      'stone-ring',
      'mushroom-ring-stem',
      'mushroom-ring-cap',
    ]);

    outer: for (let tileY = 0; tileY < 32; tileY += 1) {
      for (let tileX = 0; tileX < 32; tileX += 1) {
        if (!getForestLandmark(tileX, tileY)) {
          continue;
        }
        const model = tile.create3DModel?.({
          three: fakeThree as never,
          state,
          tile: { kind: 'forest' },
          tileX,
          tileY,
          detailLevel: 'full',
        }) as FakeGroup;
        model.traverse((node) => {
          if (
            node instanceof FakeInstancedMesh &&
            node.userData?.forestLandmarkInstancedPart
          ) {
            const marker = String(node.userData.forestLandmarkInstancedPart);
            if (!geometryByMarker.has(marker)) {
              geometryByMarker.set(marker, new Set());
            }
            geometryByMarker.get(marker)!.add(node.geometry);
          }
        });

        const allMarkersFound = [...expectedMarkers].every((marker) =>
          geometryByMarker.has(marker)
        );
        if (allMarkersFound) {
          break outer;
        }
      }
    }

    expect(
      [...expectedMarkers].every((marker) => geometryByMarker.has(marker))
    ).toBe(true);
    expectedMarkers.forEach((marker) => {
      expect(geometryByMarker.get(marker)?.size).toBe(1);
    });
  });
});

function getForestAccessoryMaterialMarker(node: FakeNode): string | null {
  const landmarkMarker = node.userData?.forestLandmarkInstancedPart;
  if (
    landmarkMarker === 'stone-ring' ||
    landmarkMarker === 'mushroom-ring-stem' ||
    landmarkMarker === 'mushroom-ring-cap'
  ) {
    return `forestLandmark:${landmarkMarker}`;
  }
  if (node.userData?.forestHollowInstanced) {
    return 'forestHollowInstanced';
  }
  if (node.userData?.forestOwlBodyInstanced) {
    return 'forestOwlBodyInstanced';
  }
  if (node.userData?.forestOwlEye) {
    return 'forestOwlEye';
  }
  const spiderMarker = node.userData?.forestSpider;
  if (spiderMarker === 'body' || spiderMarker === 'legs') {
    return `forestSpider:${spiderMarker}`;
  }
  if (node.userData?.forestCarvingInstanced) {
    return 'forestCarvingInstanced';
  }
  if (node.userData?.forestWeb) {
    return 'forestWeb';
  }
  const meadowMarker = node.userData?.forestMeadow;
  if (
    meadowMarker === 'grass' ||
    meadowMarker === 'flower-stem' ||
    meadowMarker === 'white' ||
    meadowMarker === 'yellow'
  ) {
    return `forestMeadow:${meadowMarker}`;
  }
  if (node.userData?.forestTrail === 'breadcrumb') {
    return 'forestTrail:breadcrumb';
  }
  const birdMarker = node.userData?.forestBirdInstancedPart;
  if (
    birdMarker === 'left-wing' ||
    birdMarker === 'right-wing' ||
    birdMarker === 'body'
  ) {
    return `forestBird:${birdMarker}`;
  }
  return null;
}

function collectForestAccessoryMarkers(model: FakeGroup): string[] {
  const markers = new Set<string>();
  model.traverse((node) => {
    const marker = getForestAccessoryMaterialMarker(node);
    if (marker) {
      markers.add(marker);
    }
  });
  return [...markers].sort();
}

function collectTreeFamilyMaterials(
  model: FakeGroup,
  buckets: {
    broadleafTrunkMaterials: Set<unknown>;
    broadleafFoliageMaterials: Set<unknown>;
    pineTrunkMaterials: Set<unknown>;
    pineFoliageMaterials: Set<unknown>;
  }
): void {
  for (const child of model.children) {
    const family =
      child.userData?.forestTreeForm === 'pine' ? 'pine' : 'broadleaf';
    child.traverse((node) => {
      const materialOwner = node as FakeNode & {
        material?: unknown | unknown[];
      };
      if (!materialOwner.material) {
        return;
      }
      const material = Array.isArray(materialOwner.material)
        ? materialOwner.material[0]
        : materialOwner.material;
      if (!material) {
        return;
      }
      if (
        node.userData?.forestTreeTrunkSegment ||
        node.userData?.forestTreeBranchInstanced
      ) {
        (family === 'pine'
          ? buckets.pineTrunkMaterials
          : buckets.broadleafTrunkMaterials
        ).add(material);
      }
      if (node.userData?.forestTreeFoliageInstanced) {
        (family === 'pine'
          ? buckets.pineFoliageMaterials
          : buckets.broadleafFoliageMaterials
        ).add(material);
      }
    });
  }
}
