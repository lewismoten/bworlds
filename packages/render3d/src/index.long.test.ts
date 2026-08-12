import { describe, expect, it, vi } from 'vitest';
import { createDungeonTilePlugin } from '@bworlds/tile-dungeon';
import { createForestTilePlugin } from '@bworlds/tile-forest';
import { createLighthouseTilePlugin } from '@bworlds/tile-lighthouse';
import { createTownTilePlugin } from '@bworlds/tile-town';
import {
  collectSceneResourceStats,
  validateTileModelAgainstRenderBudget,
} from './index.ts';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return {
      colorSpace: '',
      needsUpdate: false,
      image: { width: 16, height: 16 },
    };
  },
  getOrCreatePaintedCanvasTexture() {
    return {
      colorSpace: '',
      needsUpdate: false,
      image: { width: 16, height: 16 },
    };
  },
  applySurfaceTextureSampling(texture: Record<string, unknown>) {
    return texture;
  },
  createTexturedPlaneMesh(
    _three: unknown,
    _texture: unknown,
    width: number,
    height: number
  ) {
    return {
      type: 'Mesh',
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
      scale: { x: width, y: height, z: 1 },
      userData: {},
      visible: true,
      children: [],
      add() {},
      traverse(visit: (child: unknown) => void) {
        visit(this);
      },
    };
  },
  createPaintedStandardMaterial(
    _three: unknown,
    options: Record<string, unknown>
  ) {
    return {
      ...options,
      userData: {},
      clone() {
        return { ...this, userData: {} };
      },
      dispose() {},
    };
  },
  createBasicMaterial(_three: unknown, options: Record<string, unknown>) {
    return {
      ...options,
      userData: {},
      clone() {
        return { ...this, userData: {} };
      },
      dispose() {},
    };
  },
  getSharedCylinderGeometry(three: unknown, ...args: number[]) {
    void three;
    void args;
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
  getSharedConeGeometry(three: unknown, ...args: number[]) {
    void three;
    void args;
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
  getSharedBoxGeometry(three: unknown, ...args: number[]) {
    void three;
    void args;
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
  getSharedPlaneGeometry(three: unknown, ...args: number[]) {
    void three;
    void args;
    return {
      attributes: {
        position: {
          count: 6,
          array: new Float32Array(6 * 3),
        },
      },
    };
  },
  getSharedSphereGeometry(three: unknown, ...args: number[]) {
    void three;
    void args;
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
}));

class FakePluginGeometry {
  attributes: Record<string, unknown>;

  constructor(...args: number[]) {
    void args;
    this.attributes = {
      position: {
        count: 24,
        array: new Float32Array(24 * 3),
      },
    };
  }

  setAttribute(name: string, attribute: unknown) {
    this.attributes[name] = attribute;
    return this;
  }
}

class FakePluginMaterial {
  opacity?: number;
  emissiveIntensity?: number;
  uniforms?: Record<string, { value: unknown }>;
  userData: Record<string, unknown> = {};

  constructor(public options: Record<string, unknown> = {}) {
    if (typeof options.opacity === 'number') {
      this.opacity = options.opacity;
    }
    if (typeof options.emissiveIntensity === 'number') {
      this.emissiveIntensity = options.emissiveIntensity;
    }
    if (options.uniforms && typeof options.uniforms === 'object') {
      this.uniforms = options.uniforms as Record<string, { value: unknown }>;
    }
  }

  clone() {
    return new FakePluginMaterial({ ...this.options });
  }

  dispose() {}
}

class FakePluginNode {
  type = 'Group';
  isLight = false;
  castShadow = false;
  receiveShadow = false;
  matrixAutoUpdate = true;
  userData?: Record<string, unknown>;
  material?: unknown;
  geometry?: unknown;
  children: FakePluginNode[] = [];
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
  visible = true;

  add(...children: FakePluginNode[]) {
    this.children.push(...children);
    return this;
  }

  updateMatrix() {
    this.matrixAutoUpdate = false;
  }

  traverse(visit: (child: FakePluginNode) => void) {
    visit(this);
    this.children.forEach((child) => child.traverse(visit));
  }
}

class FakePluginGroup extends FakePluginNode {}

class FakePluginMesh extends FakePluginNode {
  type = 'Mesh';

  constructor(
    geometry?: unknown,
    material?: FakePluginMaterial | FakePluginMaterial[]
  ) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class FakePluginInstancedMesh extends FakePluginMesh {
  type = 'InstancedMesh';
  matrices: unknown[] = [];

  constructor(
    geometry: unknown,
    material: FakePluginMaterial | FakePluginMaterial[] | undefined,
    public count: number
  ) {
    super(geometry, material);
  }

  setMatrixAt(index: number, matrix: unknown) {
    this.matrices[index] = matrix;
  }
}

class FakePluginPointLight extends FakePluginNode {
  type = 'PointLight';
  isLight = true;

  constructor(
    public color?: unknown,
    public intensity = 0,
    public distance?: number,
    public decay?: number
  ) {
    super();
  }
}

class FakePluginMatrix4 {
  elements = Array<number>(16).fill(0);
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
    this.elements = [
      n11,
      n12,
      n13,
      n14,
      n21,
      n22,
      n23,
      n24,
      n31,
      n32,
      n33,
      n34,
      n41,
      n42,
      n43,
      n44,
    ];
    this.scale = {
      x: Math.hypot(n11, n12, n13),
      y: Math.hypot(n21, n22, n23),
      z: Math.hypot(n31, n32, n33),
    };
    this.position = { x: n14, y: n24, z: n34 };
    return this;
  }
}

class FakePluginFloat32BufferAttribute {
  array: Float32Array;
  count: number;

  constructor(values: number[], itemSize: number) {
    this.array = new Float32Array(values);
    this.count = values.length / itemSize;
  }
}

const fakePluginThree = {
  Group: FakePluginGroup,
  Mesh: FakePluginMesh,
  InstancedMesh: FakePluginInstancedMesh,
  PointLight: FakePluginPointLight,
  MeshStandardMaterial: FakePluginMaterial,
  MeshBasicMaterial: FakePluginMaterial,
  SphereGeometry: FakePluginGeometry,
  CylinderGeometry: FakePluginGeometry,
  ConeGeometry: FakePluginGeometry,
  BoxGeometry: FakePluginGeometry,
  PlaneGeometry: FakePluginGeometry,
  CircleGeometry: FakePluginGeometry,
  Matrix4: FakePluginMatrix4,
  Float32BufferAttribute: FakePluginFloat32BufferAttribute,
  DoubleSide: 'double-side',
} as const;

describe('render3d representative render-budget integrations', () => {
  it('accepts representative nearby world tile models at full detail', () => {
    const forestPlugin = createForestTilePlugin();
    const forestTile = forestPlugin.tiles?.find(
      (entry) => entry.kind === 'forest'
    );
    const townPlugin = createTownTilePlugin();
    const townTile = townPlugin.tiles?.find((entry) => entry.kind === 'town');
    const lighthousePlugin = createLighthouseTilePlugin();
    const lighthouseTile = lighthousePlugin.tiles?.find(
      (entry) => entry.kind === 'lighthouse'
    );

    const state = createPluginRenderState();
    const forestModel = forestTile?.create3DModel?.({
      three: fakePluginThree as never,
      state,
      tile: { kind: 'forest' },
      tileX: 8,
      tileY: 6,
      detailLevel: 'full',
    });
    const townModel = townTile?.create3DModel?.({
      three: fakePluginThree as never,
      state,
      tile: {
        kind: 'town',
        poi: {
          id: 'town-poi',
          name: 'Oak Hollow',
          type: 'town',
          x: 4,
          y: 4,
        },
      } as never,
      tileX: 4,
      tileY: 4,
      detailLevel: 'full',
    });
    const lighthouseModel = lighthouseTile?.create3DModel?.({
      three: fakePluginThree as never,
      state,
      tile: { kind: 'lighthouse' },
      tileX: 3,
      tileY: 3,
      detailLevel: 'full',
    });

    expect(
      validateTileModelAgainstRenderBudget(forestModel as never, 'full')
    ).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
    expect(
      validateTileModelAgainstRenderBudget(townModel as never, 'full')
    ).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
    expect(
      validateTileModelAgainstRenderBudget(lighthouseModel as never, 'full')
    ).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
  });

  it('accepts representative distant lighthouse models at low detail', () => {
    const lighthousePlugin = createLighthouseTilePlugin();
    const lighthouseTile = lighthousePlugin.tiles?.find(
      (entry) => entry.kind === 'lighthouse'
    );
    const state = createPluginRenderState();
    const lighthouseModel = lighthouseTile?.create3DModel?.({
      three: fakePluginThree as never,
      state,
      tile: { kind: 'lighthouse' },
      tileX: 3,
      tileY: 3,
      detailLevel: 'low',
    });

    expect(
      validateTileModelAgainstRenderBudget(lighthouseModel as never, 'low')
    ).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
  });

  it('accepts representative distant dungeon models at low detail', () => {
    const dungeonPlugin = createDungeonTilePlugin();
    const dungeonTile = dungeonPlugin.tiles?.find(
      (entry) => entry.kind === 'dungeon'
    );
    const state = createPluginRenderState();
    const dungeonModel = dungeonTile?.create3DModel?.({
      three: fakePluginThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    });

    expect(
      validateTileModelAgainstRenderBudget(dungeonModel as never, 'low')
    ).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
  });

  it('keeps visible instanced meshes in a representative nearby scene', () => {
    const root = createRepresentativeNearbySceneRoot();
    const stats = collectSceneResourceStats(root as never);

    expect(stats).toEqual(
      expect.objectContaining({
        instancedMeshCount: expect.any(Number),
        visibleInstancedMeshCount: expect.any(Number),
        renderedInstanceCount: expect.any(Number),
      })
    );
    expect(stats.visibleInstancedMeshCount).toBeGreaterThan(0);
    expect(stats.renderedInstanceCount).toBeGreaterThan(0);
  });

  it('fails when representative nearby scene materials regress sharply', () => {
    const root = createRepresentativeNearbySceneRoot();
    const stats = collectSceneResourceStats(root as never);
    const sampledStats = {
      materialCount: stats.materialCount,
      sharedMaterialCount: stats.sharedMaterialCount,
      clonedMaterialCount: stats.clonedMaterialCount,
      colorVariantMaterialCount: stats.colorVariantMaterialCount,
      shaderDefineSignatureCount: stats.shaderDefineSignatureCount,
      textureCount: stats.textureCount,
      visibleMeshCount: stats.visibleMeshCount,
      oneChildGroupCount: stats.oneChildGroupCount,
      oneChildGroupPlainWrapperCount: stats.oneChildGroupPlainWrapperCount,
      oneChildGroupTransformCount: stats.oneChildGroupTransformCount,
      oneChildGroupTaggedCount: stats.oneChildGroupTaggedCount,
    };

    expect(
      sampledStats.materialCount,
      `Representative nearby scene unique materials regressed: ${JSON.stringify(
        sampledStats
      )}`
    ).toBeLessThanOrEqual(24);
    expect(
      sampledStats.clonedMaterialCount,
      `Representative nearby scene cloned materials regressed: ${JSON.stringify(
        sampledStats
      )}`
    ).toBeLessThanOrEqual(16);
    expect(
      sampledStats.shaderDefineSignatureCount,
      `Representative nearby scene shader-define variants regressed: ${JSON.stringify(
        sampledStats
      )}`
    ).toBeLessThanOrEqual(1);
    expect(
      sampledStats.oneChildGroupPlainWrapperCount,
      `Representative nearby scene plain one-child wrappers regressed: ${JSON.stringify(
        sampledStats
      )}`
    ).toBeLessThanOrEqual(8);
  });
});

function createRepresentativeNearbySceneRoot(): FakePluginGroup {
  const forestPlugin = createForestTilePlugin();
  const forestTile = forestPlugin.tiles?.find(
    (entry) => entry.kind === 'forest'
  );
  const townPlugin = createTownTilePlugin();
  const townTile = townPlugin.tiles?.find((entry) => entry.kind === 'town');
  const lighthousePlugin = createLighthouseTilePlugin();
  const lighthouseTile = lighthousePlugin.tiles?.find(
    (entry) => entry.kind === 'lighthouse'
  );
  const state = createPluginRenderState();

  const forestModel = forestTile?.create3DModel?.({
    three: fakePluginThree as never,
    state,
    tile: { kind: 'forest' },
    tileX: 8,
    tileY: 6,
    detailLevel: 'full',
  });
  const townModel = townTile?.create3DModel?.({
    three: fakePluginThree as never,
    state,
    tile: {
      kind: 'town',
      poi: {
        id: 'town-poi',
        name: 'Oak Hollow',
        type: 'town',
        x: 4,
        y: 4,
      },
    } as never,
    tileX: 4,
    tileY: 4,
    detailLevel: 'full',
  });
  const lighthouseModel = lighthouseTile?.create3DModel?.({
    three: fakePluginThree as never,
    state,
    tile: { kind: 'lighthouse' },
    tileX: 3,
    tileY: 3,
    detailLevel: 'full',
  });

  const root = new FakePluginGroup();
  root.add(
    forestModel as FakePluginNode,
    townModel as FakePluginNode,
    lighthouseModel as FakePluginNode
  );
  return root;
}

function createPluginRenderState() {
  return {
    player: { x: 4, y: 4, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile() {
      return { kind: 'plains' };
    },
    getTileDefinition() {
      return {
        name: 'Plains',
        color: '#000000',
        miniColor: '#111111',
        walkable: true,
        wallHeight: 0.18,
      };
    },
    getEnvironment() {
      return {
        weather: {
          current: {
            kind: 'clear',
            label: 'Clear',
            intensity: 0,
            cloudCover: 0.2,
            windStrength: 0.2,
            precipitation: 0,
            visibility: 0.95,
            temperature: 68,
          },
        },
      };
    },
  };
}
