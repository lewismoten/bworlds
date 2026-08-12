import { describe, expect, it, vi } from 'vitest';
import { createSignTilePlugin } from './index.ts';
import type { OverworldSignals } from '@bworlds/plugin-api';

const getOrCreatePaintedCanvasTextureMock = vi.hoisted(() =>
  vi.fn(
    (
      cache: {
        has(key: string): boolean;
        get(key: string): unknown;
        set(key: string, value: unknown): void;
      },
      key: string
    ) => {
      if (!cache.has(key)) {
        cache.set(key, { colorSpace: '', needsUpdate: false });
      }
      return cache.get(key);
    }
  )
);

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false };
  },
  createBasicMaterial(_three: unknown, options: Record<string, unknown> = {}) {
    return new FakeMaterial(options);
  },
  getOrCreatePaintedCanvasTexture: getOrCreatePaintedCanvasTextureMock,
  getSharedBoxGeometry() {
    return createSharedGeometryStub();
  },
  getSharedConeGeometry() {
    return createSharedGeometryStub();
  },
  getSharedPlaneGeometry() {
    return createSharedGeometryStub();
  },
  createTexturedPlaneMesh() {
    return {
      position: {
        x: 0,
        y: 0,
        z: 0,
        set(x: number, y: number, z: number) {
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        },
      },
      rotation: { x: 0, y: 0, z: 0 },
      scale: {
        x: 1,
        y: 1,
        z: 1,
        set() {
          return this;
        },
        setScalar() {
          return this;
        },
      },
      visible: true,
      userData: {},
      children: [],
      add() {
        return this;
      },
      traverse(visit: (child: unknown) => void) {
        visit(this);
      },
    };
  },
}));

class FakeGeometry {
  constructor(...args: number[]) {
    void args;
  }
}

class FakeMaterial {
  emissiveIntensity?: number;
  opacity?: number;
  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
  }
}

function createSharedGeometryStub() {
  return {
    groups: [
      { start: 0, count: 6, materialIndex: 0 },
      { start: 6, count: 6, materialIndex: 0 },
    ],
    clearGroups() {
      this.groups = [];
    },
    addGroup(start: number, count: number, materialIndex = 0) {
      this.groups = [{ start, count, materialIndex }];
    },
    attributes: {
      position: {
        count: 24,
      },
    },
  };
}

class FakeMatrix4 {
  elements = Array<number>(16).fill(0);

  set(...elements: number[]) {
    this.elements = [...elements];
    return this;
  }

  clone() {
    return new FakeMatrix4().set(...this.elements);
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
    setScalar: (value: number) => {
      this.scale.x = value;
      this.scale.y = value;
      this.scale.z = value;
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

class FakeInstancedMesh extends FakeNode {
  matrices: FakeMatrix4[] = [];

  constructor(
    public geometry?: object,
    public material?: FakeMaterial | FakeMaterial[],
    public count = 0
  ) {
    super();
  }

  setMatrixAt(index: number, matrix: FakeMatrix4) {
    this.matrices[index] = matrix.clone();
  }
}

class FakePointLight extends FakeNode {
  constructor(
    public color?: string,
    public intensity = 0,
    public distance?: number,
    public decay?: number
  ) {
    super();
  }
}

const fakeThree = {
  Group: FakeGroup,
  Mesh: FakeMesh,
  InstancedMesh: FakeInstancedMesh,
  Matrix4: FakeMatrix4,
  PointLight: FakePointLight,
  MeshBasicMaterial: FakeMaterial,
  MeshStandardMaterial: FakeMaterial,
  BoxGeometry: FakeGeometry,
  ConeGeometry: FakeGeometry,
  PlaneGeometry: FakeGeometry,
  DoubleSide: 'double-side',
} as const;

const plugin = createSignTilePlugin();
const classifier = plugin.tiles?.find(
  (tile) => tile.kind === 'sign'
)?.classifyOverworldTile;
const signTile = plugin.tiles?.find((tile) => tile.kind === 'sign');
type SignClassifierPayload = Parameters<NonNullable<typeof classifier>>[0];

function createSignSignals(roadSignal = 0.2): OverworldSignals {
  return {
    continent: 0.6,
    elevation: 0.4,
    moisture: 0.5,
    riverSignal: 0.1,
    roadSignal,
  };
}

function createSignClassifierPayload(
  overrides: Partial<SignClassifierPayload> = {}
): SignClassifierPayload {
  return {
    seed: 'spec',
    x: 1,
    y: 1,
    tile: { kind: 'plains' },
    nearLand: true,
    signChance: 0.999,
    signals: createSignSignals(),
    sampleTerrainSignals() {
      return createSignSignals();
    },
    townAnchors: [{ x: 8, y: 1, name: 'Oakcross' }],
    bridgeAnchors: [],
    ...overrides,
  };
}

function createSignState(name: string) {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      if (x === 9 && y === 8) {
        return { kind: 'town', poi: { type: 'town', name } };
      }
      return { kind: 'plains' };
    },
    getTileDefinition() {
      return {
        name: 'Plains',
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0,
      };
    },
  };
}

function createMultiPlacardSignState() {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      const poiNames: Record<string, string> = {
        '9:8': 'Oakcross',
        '10:8': 'Harbor Market',
        '8:10': 'Crescent Watch',
      };
      const name = poiNames[`${x}:${y}`];
      if (name) {
        return { kind: 'town', poi: { type: 'town', name } };
      }
      return { kind: 'plains' };
    },
    getTileDefinition() {
      return {
        name: 'Plains',
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0,
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
      visible: node.visible,
      childCount: node.children.length,
      material:
        node instanceof FakeMesh || node instanceof FakeInstancedMesh
          ? Array.isArray(node.material)
            ? node.material.map((material) => material.options)
            : node.material?.options
          : undefined,
      light:
        node instanceof FakePointLight
          ? {
              color: node.color,
              intensity: node.intensity,
              distance: node.distance,
              decay: node.decay,
            }
          : undefined,
      userData: node.userData,
    });
  });
  return signature;
}

function collectSignInstancedParts(model: FakeNode | undefined) {
  const parts: string[] = [];
  model?.traverse((node) => {
    if (typeof node.userData?.signInstancedPart === 'string') {
      parts.push(node.userData.signInstancedPart);
    }
  });
  return parts.sort();
}

describe('tile sign', () => {
  it('prefers placing signs beside crossroads', () => {
    const tile = classifier?.(
      createSignClassifierPayload({
        sampleTerrainSignals(x, y) {
          if (
            (x === 1 && (y === 0 || y === 2)) ||
            (y === 1 && (x === 0 || x === 2))
          ) {
            return createSignSignals(0.96);
          }
          return createSignSignals();
        },
      })
    );

    expect(tile?.kind).toBe('sign');
  });

  it('gives forks a fairly high chance of getting a sign beside the road', () => {
    const tile = classifier?.(
      createSignClassifierPayload({
        seed: 'fork-spec',
        x: 10,
        y: 10,
        signChance: 0.986,
        sampleTerrainSignals(x, y) {
          if ((x === 10 && (y === 9 || y === 11)) || (y === 10 && x === 11)) {
            return createSignSignals(0.96);
          }
          return createSignSignals();
        },
        townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
        poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
      })
    );

    expect(tile?.kind).toBe('sign');
  });

  it('detects forks when the sign sits beside the approach road', () => {
    const tile = classifier?.(
      createSignClassifierPayload({
        seed: 'fork-approach-spec',
        x: 9,
        y: 10,
        signChance: 0.99,
        sampleTerrainSignals(x, y) {
          if (
            (x === 10 && y === 10) ||
            (x === 10 && (y === 9 || y === 11)) ||
            (x === 11 && y === 10)
          ) {
            return createSignSignals(0.96);
          }
          return createSignSignals();
        },
        townAnchors: [{ x: 18, y: 10, name: 'Forkwatch' }],
        poiAnchors: [{ x: 18, y: 10, type: 'town', name: 'Forkwatch' }],
      })
    );

    expect(tile?.kind).toBe('sign');
  });

  it('keeps roadside signs sparse away from junctions', () => {
    const tile = classifier?.(
      createSignClassifierPayload({
        x: 4,
        y: 4,
        sampleTerrainSignals(x, y) {
          if (y === 4 && (x === 3 || x === 5)) {
            return createSignSignals(0.95);
          }
          return createSignSignals();
        },
        townAnchors: [{ x: 20, y: 20, name: 'Farwatch' }],
      })
    );

    expect(tile).toBeNull();
  });

  it('allows occasional signs along long roads that point toward nearby poi', () => {
    const tile = classifier?.(
      createSignClassifierPayload({
        seed: 'long-road-spec',
        x: 30,
        y: 30,
        signChance: 0.998,
        sampleTerrainSignals(x, y) {
          if (y === 31 && x >= 24 && x <= 36) {
            return createSignSignals(0.96);
          }
          return createSignSignals();
        },
        townAnchors: [{ x: 40, y: 31, name: 'Longford' }],
        poiAnchors: [{ x: 40, y: 31, type: 'town', name: 'Longford' }],
      })
    );

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'sign',
        note: expect.stringContaining('Longford'),
      })
    );
  });

  it('lights sign lanterns at night', () => {
    const model = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    let glowMesh: FakeMesh | null = null;
    let pointLight: FakePointLight | null = null;
    model?.traverse((node) => {
      if (node instanceof FakeMesh && node.userData?.poiNightLightEmitter) {
        glowMesh = node;
      }
      if (
        node instanceof FakePointLight &&
        node.userData?.poiNightLightEmitter
      ) {
        pointLight = node;
      }
    });

    expect(glowMesh).not.toBeNull();
    expect(pointLight).not.toBeNull();

    signTile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      model,
      timeMs: 0,
      cycle: { daylight: 1, twilight: 0, night: 0 },
      environment: {},
    });

    expect(
      (glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0
    ).toBeCloseTo(0.04, 6);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0, 6);
    expect(pointLight?.visible).toBe(false);

    signTile?.sync3DModel?.({
      three: fakeThree as never,
      state: {} as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      model,
      timeMs: 0,
      cycle: { daylight: 0, twilight: 0, night: 1 },
      environment: {},
    });

    expect(
      (glowMesh?.material as FakeMaterial)?.emissiveIntensity ?? 0
    ).toBeGreaterThan(1);
    expect(pointLight?.intensity ?? 0).toBeCloseTo(0.75, 6);
    expect(pointLight?.visible).toBe(true);
  });

  it('builds the full-detail sign progressively before returning the final model', () => {
    const build = signTile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    });

    expect(build).toBeDefined();
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 1,
        totalSteps: 3,
        label: 'posts',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 2,
        totalSteps: 3,
        label: 'placards',
      },
    });
    expect(build?.next()).toEqual({
      done: false,
      value: {
        completedSteps: 3,
        totalSteps: 3,
        label: 'lantern',
      },
    });

    const completed = build?.next();
    expect(completed?.done).toBe(true);
    expect(
      ((completed?.value as { children?: unknown[] } | undefined)?.children
        ?.length ?? 0) > 0
    ).toBe(true);
  });

  it('keeps the synchronous sign build aligned with the progressive final model', () => {
    const syncModel = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeGroup | undefined;
    const progressiveBuild = signTile?.create3DModelProgressive?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    });
    let progressiveModel: FakeNode | undefined;

    while (true) {
      const next = progressiveBuild?.next();
      if (next?.done) {
        progressiveModel = next.value as FakeNode | undefined;
        break;
      }
    }

    expect(createModelSignature(progressiveModel)).toEqual(
      createModelSignature(syncModel)
    );
    expect(collectSignInstancedParts(progressiveModel)).toEqual(
      collectSignInstancedParts(syncModel)
    );
  });

  it('places full-detail sign lantern parts directly under the sign root', () => {
    const model = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    const lanternParts = model?.children.filter(
      (child) => typeof child.userData?.signLanternPart === 'string'
    );
    const nestedLanternGroups = model?.children.filter(
      (child) =>
        child instanceof FakeGroup &&
        child.children.some(
          (grandchild) =>
            typeof grandchild.userData?.signLanternPart === 'string'
        )
    );

    expect(
      lanternParts?.map((child) => child.userData?.signLanternPart).sort()
    ).toEqual(['cap', 'frame', 'glow', 'point-light']);
    expect(nestedLanternGroups).toHaveLength(0);
  });

  it('reuses shared regional sign materials across repeated model builds', () => {
    const first = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;
    const second = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 9,
      tileY: 9,
    }) as FakeNode | undefined;

    expect(countSharedMaterialReferences(first, second)).toBeGreaterThanOrEqual(
      4
    );
  });

  it('reuses bounded sign style materials across different regions', () => {
    const models: Array<FakeNode | undefined> = [];

    for (let regionY = 0; regionY < 8; regionY += 1) {
      for (let regionX = 0; regionX < 8; regionX += 1) {
        models.push(
          signTile?.create3DModel?.({
            three: fakeThree as never,
            state: createSignState(`Town ${regionX}:${regionY}`),
            tile: { kind: 'sign' },
            tileX: regionX * 10,
            tileY: regionY * 10,
          }) as FakeNode | undefined
        );
      }
    }

    let highestSharedCount = 0;
    for (let index = 1; index < models.length; index += 1) {
      highestSharedCount = Math.max(
        highestSharedCount,
        countSharedMaterialReferences(models[index - 1], models[index])
      );
    }

    expect(highestSharedCount).toBeGreaterThanOrEqual(4);
  });

  it('instances repeated full-detail placard support hardware', () => {
    const model = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    const postInstances: FakeInstancedMesh[] = [];
    const placardBoardInstances: FakeInstancedMesh[] = [];
    const supportInstances: FakeInstancedMesh[] = [];
    const edgeCapInstances: FakeInstancedMesh[] = [];
    const arrowHeadInstances: FakeInstancedMesh[] = [];
    model?.traverse((node) => {
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.signInstancedPart === 'post'
      ) {
        postInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.signInstancedPart === 'placard-board'
      ) {
        placardBoardInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.signInstancedPart === 'placard-support'
      ) {
        supportInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.signInstancedPart === 'placard-edge-cap'
      ) {
        edgeCapInstances.push(node);
      }
      if (
        node instanceof FakeInstancedMesh &&
        node.userData?.signInstancedPart === 'placard-arrow-head'
      ) {
        arrowHeadInstances.push(node);
      }
    });

    expect(postInstances).toHaveLength(1);
    expect(placardBoardInstances).toHaveLength(1);
    expect(supportInstances).toHaveLength(1);
    expect(edgeCapInstances).toHaveLength(1);
    expect(arrowHeadInstances).toHaveLength(1);
    expect(postInstances[0]?.count).toBe(2);
    expect(placardBoardInstances[0]?.count).toBe(3);
    expect(supportInstances[0]?.count).toBe(3);
    expect(edgeCapInstances[0]?.count).toBe(3);
    expect(arrowHeadInstances[0]?.count).toBe(3);
    expect(postInstances[0]?.matrices).toHaveLength(2);
    expect(placardBoardInstances[0]?.matrices).toHaveLength(3);
    expect(supportInstances[0]?.matrices).toHaveLength(3);
    expect(edgeCapInstances[0]?.matrices).toHaveLength(3);
    expect(arrowHeadInstances[0]?.matrices).toHaveLength(3);
  });

  it('reuses full-detail label materials across repeated sign builds', () => {
    const first = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;
    const second = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeGroup | undefined;

    const firstLabelMaterials = first?.children
      .filter((child) => child.userData?.signFullDetailPart === 'text-plane')
      .map((child) => (child as FakeMesh).material) as
      FakeMaterial[] | undefined;
    const secondLabelMaterials = second?.children
      .filter((child) => child.userData?.signFullDetailPart === 'text-plane')
      .map((child) => (child as FakeMesh).material) as
      FakeMaterial[] | undefined;

    expect(firstLabelMaterials).toHaveLength(3);
    expect(secondLabelMaterials).toHaveLength(3);
    expect(secondLabelMaterials).toEqual(firstLabelMaterials);
  });

  it('keeps repeated sign builds on one host within the shared material budget', () => {
    const repeatedModels: FakeNode[] = [];

    for (let index = 0; index < 4; index += 1) {
      const model = signTile?.create3DModel?.({
        three: fakeThree as never,
        state: createMultiPlacardSignState() as never,
        tile: { kind: 'sign' },
        tileX: 8,
        tileY: 8,
      }) as FakeNode | undefined;
      if (model) {
        repeatedModels.push(model);
      }
    }

    const sharedMaterials = new Set<FakeMaterial>();
    repeatedModels.forEach((model) => {
      collectMeshMaterials(model).forEach((material) => {
        sharedMaterials.add(material);
      });
    });

    expect(repeatedModels).toHaveLength(4);
    expect(sharedMaterials.size).toBeLessThanOrEqual(7);
  });

  it('places full-detail sign post and placard parts directly under the sign root', () => {
    const model = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeNode | undefined;

    const rootTaggedParts = model?.children.filter(
      (child) => typeof child.userData?.signFullDetailPart === 'string'
    );
    const nestedGroups = model?.children.filter(
      (child) => child instanceof FakeGroup
    );

    expect(model?.userData?.signInstancedPart).toBe('post');
    expect(
      model?.children.some(
        (child) => child.userData?.signInstancedPart === 'placard-board'
      )
    ).toBe(true);
    expect(
      rootTaggedParts?.filter(
        (child) => child.userData?.signFullDetailPart === 'text-plane'
      )
    ).toHaveLength(3);
    expect(
      rootTaggedParts?.some(
        (child) => child.userData?.signFullDetailPart === 'back-plane'
      )
    ).toBe(false);
    expect(nestedGroups).toHaveLength(0);
  });

  it('uses the full-detail post instanced mesh as the root instead of a wrapper group', () => {
    const model = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createMultiPlacardSignState() as never,
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
    }) as FakeInstancedMesh | undefined;

    expect(model).toBeInstanceOf(FakeInstancedMesh);
    expect(model?.position).toMatchObject({ x: 8, y: 0, z: 8 });
    expect(model?.userData?.signInstancedPart).toBe('post');
    expect(model?.children.length ?? 0).toBeGreaterThanOrEqual(8);
  });

  it('builds a simpler low-detail sign silhouette without lantern or label sprites', () => {
    const full = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      detailLevel: 'full',
    }) as FakeGroup | undefined;
    const low = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      detailLevel: 'low',
    }) as FakeGroup | undefined;

    let lowPointLightCount = 0;
    low?.traverse((node) => {
      if (node instanceof FakePointLight) {
        lowPointLightCount += 1;
      }
    });
    const lowDetailParts: string[] = [];
    low?.traverse((child) => {
      if (typeof child.userData?.signLowDetailPart === 'string') {
        lowDetailParts.push(child.userData.signLowDetailPart);
      }
    });
    const nestedLowDetailGroups = low?.children.filter(
      (child) =>
        child instanceof FakeGroup &&
        child.children.some(
          (grandchild) =>
            typeof grandchild.userData?.signLowDetailPart === 'string'
        )
    );

    expect(low?.children.length ?? 0).toBeLessThan(
      full?.children.length ?? Infinity
    );
    expect(lowPointLightCount).toBe(0);
    expect(lowDetailParts.sort()).toEqual(['placard', 'post']);
    expect(nestedLowDetailGroups).toHaveLength(0);
  });

  it('uses the low-detail post mesh as the root instead of a wrapper group', () => {
    const low = signTile?.create3DModel?.({
      three: fakeThree as never,
      state: createSignState('Oakcross'),
      tile: { kind: 'sign' },
      tileX: 8,
      tileY: 8,
      detailLevel: 'low',
    }) as FakeMesh | undefined;

    expect(low).toBeInstanceOf(FakeMesh);
    expect(low?.position.x).toBe(8);
    expect(low?.position.z).toBe(8);
    expect(low?.position.y ?? 0).toBeGreaterThan(0.3);
    expect(
      low?.children.some(
        (child) => child.userData?.signLowDetailPart === 'placard'
      )
    ).toBe(true);
    expect(low?.userData?.signLowDetailPart).toBe('post');
  });
});

function countSharedMaterialReferences(
  left: FakeNode | undefined,
  right: FakeNode | undefined
): number {
  const leftMaterials = collectMeshMaterials(left);
  const rightMaterials = collectMeshMaterials(right);
  let sharedCount = 0;

  leftMaterials.forEach((material) => {
    if (rightMaterials.has(material)) {
      sharedCount += 1;
    }
  });

  return sharedCount;
}

function collectMeshMaterials(root: FakeNode | undefined): Set<FakeMaterial> {
  const materials = new Set<FakeMaterial>();
  root?.traverse((node) => {
    if (node instanceof FakeMesh || node instanceof FakeInstancedMesh) {
      if (Array.isArray(node.material)) {
        node.material.forEach((material) => materials.add(material));
      } else if (node.material) {
        materials.add(node.material);
      }
    }
  });
  return materials;
}
