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
    }) as { children?: Array<{ material?: unknown }> } | null | undefined;
    const second = mushroomTile?.create3DModel?.({
      tile: { kind: 'cave-mushrooms' },
      three,
      state: {} as never,
      tileX: 6,
      tileY: 7,
    }) as { children?: Array<{ material?: unknown }> } | null | undefined;

    expect(first?.children?.[0]?.material).toBe(
      second?.children?.[0]?.material
    );
    expect(first?.children?.[1]?.material).toBe(
      second?.children?.[1]?.material
    );
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
          children?: Array<{
            userData?: Record<string, unknown>;
            count?: number;
            matrices?: Array<{ scale: { x: number; y: number; z: number } }>;
          }>;
        }
      | null
      | undefined;

    const stemInstances = model?.children?.filter(
      (child) => child.userData?.caveInstancedPart === 'mushroom-stem'
    );
    const capInstances = model?.children?.filter(
      (child) => child.userData?.caveInstancedPart === 'mushroom-cap'
    );

    expect(stemInstances).toHaveLength(1);
    expect(capInstances).toHaveLength(1);
    expect(stemInstances?.[0]?.count).toBe(capInstances?.[0]?.count);
    expect((stemInstances?.[0]?.count ?? 0) >= 3).toBe(true);
    expect(stemInstances?.[0]?.matrices?.length).toBe(
      stemInstances?.[0]?.count
    );
    expect(capInstances?.[0]?.matrices?.length).toBe(capInstances?.[0]?.count);
    expect(
      stemInstances?.[0]?.matrices?.some((matrix) => matrix.scale.y > 1)
    ).toBe(true);
    expect(
      capInstances?.[0]?.matrices?.some((matrix) => matrix.scale.x > 1)
    ).toBe(true);
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

      const spireInstances = model?.children?.filter(
        (child) => child.userData?.caveInstancedPart === 'dripstone-spire'
      );

      expect(spireInstances).toHaveLength(1);
      expect((spireInstances?.[0]?.count ?? 0) >= 3).toBe(true);
      expect(spireInstances?.[0]?.matrices?.length).toBe(
        spireInstances?.[0]?.count
      );
      expect(
        spireInstances?.[0]?.matrices?.some((matrix) => matrix.scale.y > 0.6)
      ).toBe(true);
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

      const boulderInstances = model?.children?.filter(
        (child) => child.userData?.caveInstancedPart === 'obstacle-boulder'
      );

      expect(boulderInstances).toHaveLength(1);
      expect((boulderInstances?.[0]?.count ?? 0) >= 2).toBe(true);
      expect(boulderInstances?.[0]?.matrices?.length).toBe(
        boulderInstances?.[0]?.count
      );
      expect(
        boulderInstances?.[0]?.matrices?.some((matrix) => matrix.scale.x > 1)
      ).toBe(true);
      expect(
        boulderInstances?.[0]?.matrices?.some((matrix) => matrix.scale.y > 1)
      ).toBe(true);
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
      expect(low?.children).toHaveLength(3);
      expect(
        low?.children?.map((child) => child.userData?.caveLowDetailPart).sort()
      ).toEqual(['mound', 'mouth-void', 'tunnel-back']);
      expect(
        low?.children?.every((child) => !Array.isArray(child.children))
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

      const boulderInstances = model?.children?.filter(
        (child) => child.userData?.caveInstancedPart === 'entrance-boulder'
      );
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
  }
  class InstancedMesh {
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
