import { describe, expect, it } from 'vitest';
import { createCaveTilePlugin } from './index.ts';

const plugin = createCaveTilePlugin();
const caveTile = plugin.tiles?.find((tile) => tile.kind === 'cave');
const classifier = caveTile?.classifyOverworldTile;
const createWorldAction = caveTile?.createWorldAction;

type CaveClassifierPayload = Parameters<NonNullable<typeof classifier>>[0];

function createCaveClassifierPayload(
  overrides: Partial<CaveClassifierPayload> = {}
): CaveClassifierPayload {
  return {
    seed: 'spec',
    x: 5,
    y: 5,
    nearLand: true,
    tile: { kind: 'plains' },
    signals: {
      continent: 0.62,
      elevation: 0.54,
      moisture: 0.44,
      riverSignal: 0.18,
      roadSignal: 0.24,
    },
    sampleTerrainSignals(sampleX: number, sampleY: number) {
      if (
        (sampleY === 5 && sampleX >= 5 && sampleX <= 11) ||
        (sampleY === 4 && sampleX >= 5 && sampleX <= 11)
      ) {
        return {
          continent: 0.64,
          elevation: sampleY === 4 ? 0.82 : 0.58,
          moisture: 0.42,
          riverSignal: 0.12,
          roadSignal: 0.22,
        };
      }
      return {
        continent: 0.62,
        elevation: 0.52,
        moisture: 0.4,
        riverSignal: 0.12,
        roadSignal: 0.2,
      };
    },
    townAnchors: [],
    bridgeAnchors: [],
    poiAnchors: [
      { x: 5, y: 5, type: 'cave', name: 'West Mouth' },
      { x: 11, y: 5, type: 'cave', name: 'East Mouth' },
    ],
    ...overrides,
  };
}

describe('tile cave', () => {
  it('builds the full-detail cave progressively before returning the final model', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;
    const three = createFakeThree() as never;
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;

    try {
      const build = caveTile?.create3DModelProgressive?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'full',
      });

      expect(build).toBeDefined();
      expect(build?.next()).toEqual({
        done: false,
        value: {
          completedSteps: 1,
          totalSteps: 4,
          label: 'entrance-boulders',
        },
      });
      expect(build?.next()).toEqual({
        done: false,
        value: {
          completedSteps: 2,
          totalSteps: 4,
          label: 'portal-shell',
        },
      });
      expect(build?.next()).toEqual({
        done: false,
        value: {
          completedSteps: 3,
          totalSteps: 4,
          label: 'arch-and-pillars',
        },
      });
      expect(build?.next()).toEqual({
        done: false,
        value: {
          completedSteps: 4,
          totalSteps: 4,
          label: 'lantern',
        },
      });

      const completed = build?.next();
      expect(completed?.done).toBe(true);
      expect(
        ((completed?.value as { children?: unknown[] } | undefined)?.children
          ?.length ?? 0) > 0
      ).toBe(true);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('keeps the synchronous cave build aligned with the progressive final model', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;
    const three = createFakeThree() as never;
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;

    try {
      const syncModel = caveTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'full',
      }) as
        | {
            children?: Array<{
              userData?: Record<string, unknown>;
              material?: { options?: { color?: unknown } };
            }>;
          }
        | null
        | undefined;
      const progressiveBuild = caveTile?.create3DModelProgressive?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'full',
      });
      let progressiveModel:
        | {
            children?: Array<{
              userData?: Record<string, unknown>;
              material?: { options?: { color?: unknown } };
            }>;
          }
        | null
        | undefined;

      while (true) {
        const next = progressiveBuild?.next();
        if (next?.done) {
          progressiveModel = next.value as typeof progressiveModel;
          break;
        }
      }

      expect(progressiveModel?.children?.length).toBe(
        syncModel?.children?.length
      );
      expect(collectCaveInstancedParts(progressiveModel?.children)).toEqual(
        collectCaveInstancedParts(syncModel?.children)
      );
      expect(findPortalChildren(progressiveModel?.children)).toHaveLength(
        findPortalChildren(syncModel?.children).length
      );
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('uses the full-detail entrance-boulder instances as the cave root', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;
    const three = createFakeThree() as never;
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;

    try {
      const full = caveTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'full',
      }) as
        | {
            userData?: Record<string, unknown>;
            children?: unknown[];
          }
        | null
        | undefined;

      expect(full).toBeInstanceOf(
        (three as { InstancedMesh: object }).InstancedMesh
      );
      expect(full?.userData?.caveInstancedPart).toBe('entrance-boulder');
      expect((full?.children?.length ?? 0) > 0).toBe(true);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('groups nearby cave mouths along the same mountain pass into one cave system', () => {
    const west = classifier?.(
      createCaveClassifierPayload({
        x: 5,
        y: 5,
      })
    );
    const east = classifier?.(
      createCaveClassifierPayload({
        x: 11,
        y: 5,
      })
    );

    expect(west?.poi?.systemId).toBe(east?.poi?.systemId);
    expect(west?.poi?.entrances).toEqual([
      { x: 5, y: 5, name: 'West Mouth' },
      { x: 11, y: 5, name: 'East Mouth' },
    ]);
    expect(east?.poi?.entrances).toEqual(west?.poi?.entrances);
  });

  it('reuses terrain samples across overlapping cave-link pass scans', () => {
    const sampleCounts = new Map<string, number>();

    const tile = classifier?.(
      createCaveClassifierPayload({
        x: 5,
        y: 5,
        sampleTerrainSignals(sampleX: number, sampleY: number) {
          const key = `${sampleX},${sampleY}`;
          sampleCounts.set(key, (sampleCounts.get(key) ?? 0) + 1);
          if (
            (sampleY === 5 && sampleX >= 5 && sampleX <= 11) ||
            (sampleY === 4 && sampleX >= 5 && sampleX <= 11)
          ) {
            return {
              continent: 0.64,
              elevation: sampleY === 4 ? 0.82 : 0.58,
              moisture: 0.42,
              riverSignal: 0.12,
              roadSignal: 0.22,
            };
          }
          return {
            continent: 0.62,
            elevation: 0.52,
            moisture: 0.4,
            riverSignal: 0.12,
            roadSignal: 0.2,
          };
        },
        poiAnchors: [
          { x: 5, y: 5, type: 'cave', name: 'West Mouth' },
          { x: 8, y: 5, type: 'cave', name: 'Mid Mouth' },
          { x: 11, y: 5, type: 'cave', name: 'East Mouth' },
        ],
      })
    );

    expect(tile?.kind).toBe('cave');
    expect(sampleCounts.size).toBeGreaterThan(1);
    expect(Math.max(...sampleCounts.values())).toBe(1);
  });

  it('creates shared cave enter actions while preserving each entrance origin', () => {
    const westTile = classifier?.(
      createCaveClassifierPayload({
        x: 5,
        y: 5,
      })
    );
    const eastTile = classifier?.(
      createCaveClassifierPayload({
        x: 11,
        y: 5,
      })
    );

    const westAction = createWorldAction?.({
      seed: 'spec',
      x: 5,
      y: 5,
      tile: westTile!,
    });
    const eastAction = createWorldAction?.({
      seed: 'spec',
      x: 11,
      y: 5,
      tile: eastTile!,
    });
    expect(westAction).toBeDefined();
    expect(eastAction).toBeDefined();
    if (!westAction || !eastAction) {
      throw new Error('expected cave world actions');
    }

    expect(westAction.context?.id).toBe(eastAction.context?.id);
    expect(westAction.context).toEqual(
      expect.objectContaining({
        type: 'cave',
        origin: { x: 5, y: 5 },
        entrances: [
          { x: 5, y: 5, name: 'West Mouth' },
          { x: 11, y: 5, name: 'East Mouth' },
        ],
      })
    );
    expect(eastAction.context).toEqual(
      expect.objectContaining({
        type: 'cave',
        origin: { x: 11, y: 5 },
      })
    );
  });

  it('reuses shared cave portal materials across repeated builds on the same host', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    const three = createFakeThree() as never;
    const modelTile = plugin.tiles?.find((tile) => tile.kind === 'cave');
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;
    try {
      const first = modelTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
      }) as
        | { children?: Array<{ children?: Array<{ material?: unknown }> }> }
        | null
        | undefined;
      const second = modelTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 8,
        tileY: 9,
      }) as
        | { children?: Array<{ children?: Array<{ material?: unknown }> }> }
        | null
        | undefined;

      const firstPortalChildren = findPortalChildren(first?.children);
      const secondPortalChildren = findPortalChildren(second?.children);
      const findMaterialByColor = (
        children: Array<{ material?: { options?: { color?: unknown } } }>,
        color: string
      ) =>
        children.find((child) => child.material?.options?.color === color)
          ?.material;

      expect(findMaterialByColor(firstPortalChildren, '#010308')).toBe(
        findMaterialByColor(secondPortalChildren, '#010308')
      );
      expect(findMaterialByColor(firstPortalChildren, '#03060a')).toBe(
        findMaterialByColor(secondPortalChildren, '#03060a')
      );
      expect(findMaterialByColor(firstPortalChildren, '#f59e0b')).toBe(
        findMaterialByColor(secondPortalChildren, '#f59e0b')
      );
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('reuses shared cave mushroom materials across repeated builds on the same host', () => {
    const three = createFakeThree() as never;
    const mushroomTile = plugin.tiles?.find(
      (tile) => tile.kind === 'cave-mushrooms'
    );

    const first = mushroomTile?.create3DModel?.({
      tile: { kind: 'cave-mushrooms' },
      three,
      state: {} as never,
      tileX: 2,
      tileY: 3,
    }) as
      | {
          material?: unknown;
          children?: Array<{ material?: unknown }>;
        }
      | null
      | undefined;
    const second = mushroomTile?.create3DModel?.({
      tile: { kind: 'cave-mushrooms' },
      three,
      state: {} as never,
      tileX: 6,
      tileY: 7,
    }) as
      | {
          material?: unknown;
          children?: Array<{ material?: unknown }>;
        }
      | null
      | undefined;

    expect(first?.material).toBe(second?.material);
    expect(first?.children?.[0]?.material).toBe(
      second?.children?.[0]?.material
    );
  });

  it('keeps repeated full-detail cave builds on one host within the shared material budget', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;
    const three = createFakeThree() as never;
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;
    const repeatedModels: Array<{
      material?: unknown;
      children?: unknown[];
    }> = [];

    try {
      for (const [tileX, tileY] of [
        [4, 6],
        [8, 9],
        [12, 14],
        [16, 18],
      ]) {
        const model = caveTile?.create3DModel?.({
          tile: { kind: 'cave' },
          three,
          state,
          tileX,
          tileY,
          detailLevel: 'full',
        }) as
          | {
              material?: unknown;
              children?: unknown[];
            }
          | null
          | undefined;
        if (model) {
          repeatedModels.push(model);
        }
      }

      const sharedMaterials = new Set<unknown>();
      repeatedModels.forEach((model) => {
        collectMeshMaterials(model).forEach((material) => {
          sharedMaterials.add(material);
        });
      });

      expect(repeatedModels).toHaveLength(4);
      expect(sharedMaterials.size).toBeLessThanOrEqual(6);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('instances repeated cave mushrooms as shared stem and cap sets', () => {
    const three = createFakeThree() as never;
    const mushroomTile = plugin.tiles?.find(
      (tile) => tile.kind === 'cave-mushrooms'
    );

    const model = mushroomTile?.create3DModel?.({
      tile: { kind: 'cave-mushrooms' },
      three,
      state: {} as never,
      tileX: 2,
      tileY: 3,
    }) as
      | {
          userData?: Record<string, unknown>;
          count?: number;
          matrices?: Array<{ scale: { x: number; y: number; z: number } }>;
          children?: Array<{
            userData?: Record<string, unknown>;
            count?: number;
            matrices?: Array<{ scale: { x: number; y: number; z: number } }>;
          }>;
        }
      | null
      | undefined;

    expect(model?.userData?.caveInstancedPart).toBe('mushroom-stem');
    const capInstances = model?.children?.filter(
      (child) => child.userData?.caveInstancedPart === 'mushroom-cap'
    );

    expect(capInstances).toHaveLength(1);
    expect(model?.count).toBe(capInstances?.[0]?.count);
    expect((model?.count ?? 0) >= 3).toBe(true);
    expect(model?.matrices?.length).toBe(model?.count);
    expect(capInstances?.[0]?.matrices?.length).toBe(capInstances?.[0]?.count);
    expect(model?.matrices?.some((matrix) => matrix.scale.y > 1)).toBe(true);
    expect(
      capInstances?.[0]?.matrices?.some((matrix) => matrix.scale.x > 1)
    ).toBe(true);
  });

  it('returns cave mushroom stem instances directly without a wrapper group', () => {
    const three = createFakeThree() as never;
    const mushroomTile = plugin.tiles?.find(
      (tile) => tile.kind === 'cave-mushrooms'
    );

    const model = mushroomTile?.create3DModel?.({
      tile: { kind: 'cave-mushrooms' },
      three,
      state: {} as never,
      tileX: 2,
      tileY: 3,
    }) as
      | {
          userData?: Record<string, unknown>;
          children?: Array<{ userData?: Record<string, unknown> }>;
        }
      | null
      | undefined;

    expect(model?.userData?.caveInstancedPart).toBe('mushroom-stem');
    expect(model?.children).toHaveLength(1);
    expect(model?.children?.[0]?.userData?.caveInstancedPart).toBe(
      'mushroom-cap'
    );
  });

  it('instances repeated cave dripstone spires as one shared set', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    const three = createFakeThree() as never;
    const dripstoneTile = plugin.tiles?.find(
      (tile) => tile.kind === 'cave-dripstone'
    );

    try {
      const model = dripstoneTile?.create3DModel?.({
        tile: { kind: 'cave-dripstone' },
        three,
        state: {} as never,
        tileX: 2,
        tileY: 3,
      }) as
        | {
            userData?: Record<string, unknown>;
            count?: number;
            matrices?: Array<{
              scale: { x: number; y: number; z: number };
            }>;
            children?: Array<{
              userData?: Record<string, unknown>;
              count?: number;
              matrices?: Array<{
                scale: { x: number; y: number; z: number };
              }>;
            }>;
          }
        | null
        | undefined;

      expect(model?.userData?.caveInstancedPart).toBe('dripstone-spire');
      expect((model?.count ?? 0) >= 3).toBe(true);
      expect(model?.matrices?.length).toBe(model?.count);
      expect(model?.matrices?.some((matrix) => matrix.scale.y > 0.6)).toBe(
        true
      );
      expect(model?.children).toHaveLength(1);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('returns cave dripstone spire instances directly without a wrapper group', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    try {
      const three = createFakeThree() as never;
      const dripstoneTile = plugin.tiles?.find(
        (tile) => tile.kind === 'cave-dripstone'
      );
      const model = dripstoneTile?.create3DModel?.({
        tile: { kind: 'cave-dripstone' },
        three,
        state: {} as never,
        tileX: 2,
        tileY: 3,
      }) as
        | {
            userData?: Record<string, unknown>;
            children?: unknown[];
          }
        | null
        | undefined;

      expect(model?.userData?.caveInstancedPart).toBe('dripstone-spire');
      expect(model?.children).toHaveLength(1);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('instances repeated cave obstacle boulders as one shared set', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    const three = createFakeThree() as never;
    const obstacleTile = plugin.tiles?.find(
      (tile) => tile.kind === 'cave-obstacle'
    );

    try {
      const model = obstacleTile?.create3DModel?.({
        tile: { kind: 'cave-obstacle' },
        three,
        state: {} as never,
        tileX: 2,
        tileY: 3,
      }) as
        | {
            userData?: Record<string, unknown>;
            count?: number;
            matrices?: Array<{
              scale: { x: number; y: number; z: number };
            }>;
            children?: unknown[];
          }
        | null
        | undefined;

      expect(model?.userData?.caveInstancedPart).toBe('obstacle-boulder');
      expect((model?.count ?? 0) >= 2).toBe(true);
      expect(model?.matrices?.length).toBe(model?.count);
      expect(model?.matrices?.some((matrix) => matrix.scale.x > 1)).toBe(true);
      expect(model?.matrices?.some((matrix) => matrix.scale.y > 1)).toBe(true);
      expect(model?.children ?? []).toHaveLength(0);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('returns cave obstacle boulder instances directly without a wrapper group', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    try {
      const three = createFakeThree() as never;
      const obstacleTile = plugin.tiles?.find(
        (tile) => tile.kind === 'cave-obstacle'
      );
      const model = obstacleTile?.create3DModel?.({
        tile: { kind: 'cave-obstacle' },
        three,
        state: {} as never,
        tileX: 2,
        tileY: 3,
      }) as
        | {
            userData?: Record<string, unknown>;
            children?: unknown[];
          }
        | null
        | undefined;

      expect(model?.userData?.caveInstancedPart).toBe('obstacle-boulder');
      expect(model?.children ?? []).toHaveLength(0);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('builds a lightweight low-detail cave mouth silhouette for distant rendering', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    const three = createFakeThree() as never;
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;

    try {
      const full = caveTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'full',
      }) as { children?: Array<{ children?: unknown[] }> } | null | undefined;
      const low = caveTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'low',
      }) as
        | {
            userData?: Record<string, unknown>;
            children?: Array<{
              children?: unknown[];
              userData?: Record<string, unknown>;
            }>;
          }
        | null
        | undefined;

      expect(low?.children?.length ?? 0).toBeLessThan(
        full?.children?.length ?? Infinity
      );
      expect(low?.userData?.caveLowDetailPart).toBe('mound');
      expect(low?.children).toHaveLength(2);
      expect(
        [
          low?.userData?.caveLowDetailPart,
          ...(low?.children?.map(
            (child) => child.userData?.caveLowDetailPart
          ) ?? []),
        ].sort()
      ).toEqual(['mound', 'mouth-void', 'tunnel-back']);
      expect(
        low?.children?.every(
          (child) =>
            !Array.isArray(child.children) || child.children.length === 0
        )
      ).toBe(true);
    } finally {
      globalThis.document = previousDocument;
    }
  });

  it('instances repeated entrance boulders in the full-detail cave mouth', () => {
    const previousDocument = globalThis.document;
    globalThis.document = createFakeDocument() as never;

    const three = createFakeThree() as never;
    const state = {
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getTileDefinition() {
        return { walkable: true };
      },
    } as never;

    try {
      const model = caveTile?.create3DModel?.({
        tile: { kind: 'cave' },
        three,
        state,
        tileX: 4,
        tileY: 6,
        detailLevel: 'full',
      }) as
        | {
            userData?: Record<string, unknown>;
            count?: number;
            matrices?: Array<{
              scale: { x: number; y: number; z: number };
              position?: { x: number; y: number; z: number };
            }>;
            children?: Array<{
              userData?: Record<string, unknown>;
              count?: number;
              children?: Array<{
                userData?: Record<string, unknown>;
                count?: number;
                matrices?: Array<{
                  scale: { x: number; y: number; z: number };
                  position?: { x: number; y: number; z: number };
                }>;
              }>;
              matrices?: Array<{
                scale: { x: number; y: number; z: number };
                position?: { x: number; y: number; z: number };
              }>;
            }>;
          }
        | null
        | undefined;

      const boulderInstances =
        model?.userData?.caveInstancedPart === 'entrance-boulder'
          ? [model]
          : [];
      const cheekInstances = model?.children?.filter(
        (child) => child.userData?.caveInstancedPart === 'entrance-cheek'
      );
      const pillarInstances = model?.children?.filter(
        (child) => child.userData?.caveInstancedPart === 'entrance-pillar'
      );

      expect(boulderInstances).toHaveLength(1);
      expect(cheekInstances).toHaveLength(1);
      expect(pillarInstances).toHaveLength(1);
      expect((boulderInstances?.[0]?.count ?? 0) >= 3).toBe(true);
      expect(boulderInstances?.[0]?.matrices?.length).toBe(
        boulderInstances?.[0]?.count
      );
      expect(cheekInstances?.[0]?.count).toBe(2);
      expect(cheekInstances?.[0]?.matrices?.length).toBe(2);
      expect(pillarInstances?.[0]?.count).toBe(2);
      expect(pillarInstances?.[0]?.matrices?.length).toBe(2);
      expect(
        boulderInstances?.[0]?.matrices?.some((matrix) => matrix.scale.x > 1)
      ).toBe(true);
      expect(cheekInstances?.[0]?.matrices?.[0]?.position).not.toEqual(
        cheekInstances?.[0]?.matrices?.[1]?.position
      );
    } finally {
      globalThis.document = previousDocument;
    }
  });
});

function createFakeThree() {
  class Group {
    children: unknown[] = [];
    position = {
      set() {
        return undefined;
      },
    };
    rotation = { x: 0, y: 0, z: 0 };
    add(child: unknown) {
      this.children.push(child);
    }
  }
  class Matrix4 {
    scale = { x: 1, y: 1, z: 1 };
    position = { x: 0, y: 0, z: 0 };
    makeScale(x: number, y: number, z: number) {
      this.scale = { x, y, z };
      return this;
    }
    setPosition(x: number, y: number, z: number) {
      this.position = { x, y, z };
      return this;
    }
    set(
      n11: number,
      n12: number,
      n13: number,
      n14: number,
      n21: number,
      n22: number,
      n23: number,
      n24: number,
      n31: number,
      n32: number,
      n33: number,
      n34: number,
      n41: number,
      n42: number,
      n43: number,
      n44: number
    ) {
      void n11;
      void n12;
      void n13;
      void n21;
      void n22;
      void n23;
      void n31;
      void n32;
      void n33;
      void n41;
      void n42;
      void n43;
      void n44;
      this.position = { x: n14, y: n24, z: n34 };
      return this;
    }
    clone() {
      const next = new Matrix4();
      next.scale = { ...this.scale };
      next.position = { ...this.position };
      return next;
    }
  }
  class Mesh {
    children: unknown[] = [];
    position = {
      set() {
        return undefined;
      },
    };
    rotation = { x: 0, y: 0, z: 0 };
    scale = {
      set() {
        return undefined;
      },
    };
    userData: Record<string, unknown> = {};
    constructor(
      public geometry: unknown,
      public material: unknown
    ) {}
    add(child: unknown) {
      this.children.push(child);
    }
  }
  class InstancedMesh {
    children: unknown[] = [];
    rotation = { x: 0, y: 0, z: 0 };
    userData: Record<string, unknown> = {};
    matrices: Matrix4[] = [];
    constructor(
      public geometry: unknown,
      public material: unknown,
      public count: number
    ) {}
    setMatrixAt(index: number, matrix: Matrix4) {
      this.matrices[index] = matrix.clone();
    }
    add(child: unknown) {
      this.children.push(child);
    }
  }
  class PointLight {
    position = {
      set() {
        return undefined;
      },
    };
    visible = true;
    userData: Record<string, unknown> = {};
    constructor(
      public color: unknown,
      public intensity: unknown,
      public distance: unknown,
      public decay: unknown
    ) {}
  }
  class MeshBasicMaterial {
    constructor(public options: unknown) {}
  }
  class MeshStandardMaterial {
    constructor(public options: unknown) {}
  }
  class CanvasTexture {
    colorSpace: unknown;
    magFilter: unknown;
    minFilter: unknown;
    generateMipmaps = false;
    needsUpdate = false;
    wrapS: unknown;
    wrapT: unknown;
    repeat = {
      set() {
        return undefined;
      },
    };
    constructor(public canvas: unknown) {}
  }
  class SphereGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class CircleGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class PlaneGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class TorusGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class CylinderGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }
  class ConeGeometry {
    constructor(...args: unknown[]) {
      void args;
    }
  }

  return {
    Group,
    Mesh,
    InstancedMesh,
    Matrix4,
    PointLight,
    CanvasTexture,
    MeshBasicMaterial,
    MeshStandardMaterial,
    SphereGeometry,
    CircleGeometry,
    PlaneGeometry,
    TorusGeometry,
    CylinderGeometry,
    ConeGeometry,
    DoubleSide: 2,
    SRGBColorSpace: 'srgb',
    NearestFilter: 'nearest',
    RepeatWrapping: 'repeat',
  };
}

function findPortalChildren(
  children:
    | Array<{
        children?: Array<{ material?: { options?: { color?: unknown } } }>;
        material?: { options?: { color?: unknown } };
      }>
    | undefined
) {
  return (
    children?.filter(
      (child) =>
        child.material?.options?.color === '#010308' ||
        child.material?.options?.color === '#03060a' ||
        child.material?.options?.color === '#f59e0b'
    ) ?? []
  );
}

function collectCaveInstancedParts(
  children:
    | Array<{
        userData?: Record<string, unknown>;
      }>
    | undefined
) {
  return (children ?? [])
    .map((child) => child.userData?.caveInstancedPart)
    .filter((value): value is string => typeof value === 'string')
    .sort();
}

function collectMeshMaterials(
  node:
    | {
        material?: unknown;
        children?: unknown[];
      }
    | null
    | undefined
): Set<unknown> {
  const materials = new Set<unknown>();
  const stack = node ? [node] : [];

  while (stack.length > 0) {
    const current = stack.pop() as
      | {
          material?: unknown;
          children?: unknown[];
        }
      | undefined;
    if (!current) {
      continue;
    }

    if (Array.isArray(current.material)) {
      current.material.forEach((material) => materials.add(material));
    } else if (current.material) {
      materials.add(current.material);
    }

    current.children?.forEach((child) => {
      if (child && typeof child === 'object') {
        stack.push(child as { material?: unknown; children?: unknown[] });
      }
    });
  }

  return materials;
}

function createFakeDocument() {
  return {
    createElement(tagName: string) {
      if (tagName !== 'canvas') {
        throw new Error(`Unsupported element: ${tagName}`);
      }
      return {
        width: 0,
        height: 0,
        getContext(kind: string) {
          if (kind !== '2d') {
            return null;
          }
          return {
            fillStyle: '',
            beginPath() {
              return undefined;
            },
            arc() {
              return undefined;
            },
            fill() {
              return undefined;
            },
            fillRect() {
              return undefined;
            },
          };
        },
      };
    },
  };
}
