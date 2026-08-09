import { describe, expect, it, vi } from 'vitest';

vi.mock('@bworlds/three-support', () => ({
  createPaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false, image: { width: 16, height: 16 } };
  },
  getOrCreatePaintedCanvasTexture() {
    return { colorSpace: '', needsUpdate: false, image: { width: 16, height: 16 } };
  },
  createTexturedPlaneMesh(_three: unknown, _texture: unknown, width: number, height: number) {
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
  createPaintedStandardMaterial(_three: unknown, options: Record<string, unknown>) {
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
  getSharedCylinderGeometry(_three: unknown, ..._args: number[]) {
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
  getSharedConeGeometry(_three: unknown, ..._args: number[]) {
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
  getSharedBoxGeometry(_three: unknown, ..._args: number[]) {
    return {
      attributes: {
        position: {
          count: 24,
          array: new Float32Array(24 * 3),
        },
      },
    };
  },
  getSharedSphereGeometry(_three: unknown, ..._args: number[]) {
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

import { createForestTilePlugin } from '@bworlds/tile-forest';
import { createDungeonTilePlugin } from '@bworlds/tile-dungeon';
import { createLighthouseTilePlugin } from '@bworlds/tile-lighthouse';
import { createTownTilePlugin } from '@bworlds/tile-town';
import { setRenderBudgetPartMetadata } from '@bworlds/plugin-api';
import {
  acceptTilePluginModelForRenderBudget,
  acceptTilePluginModelForRenderBudgetWithResult,
  collectSceneResourceStats,
  collectChunkDrawCallStats,
  collectVisibleTileResourceStats,
  countRecentMetricEvents,
  disposeObject3DResources,
  applyObjectDistanceFade,
  clampCameraPitch,
  createTilePluginRenderBudget,
  DEFAULT_CAMERA_PITCH,
  getTileModelHardLimits,
  getRecentRenderDebugEvents,
  getRecentLabeledCountStats,
  getRecentCountStats,
  getRecentDurationStats,
  getRecentLabeledDurationStats,
  getRecentOwnedMaterialLifecycleCounts,
  getRenderChurnStats,
  getSharedBoxGeometry,
  getSharedPlaneGeometry,
  SHARED_RENDER_GEOMETRY_CACHE_MAX_ENTRIES,
  getWaterFloorBodyProfile,
  buildPendingWorldBuildQueue,
  createFrameTimeBudget,
  getDecoratedTileSurfaceHeight,
  getEffectivePendingWorldBuildBudget,
  getBoundaryPriority,
  getFarLandModelOpacity,
  getFacingVisibilityBucket,
  freezeStaticObjectTransforms,
  getRemainingFrameTimeBudgetMs,
  getWorldCurvatureOffset,
  getWeatherFogRange,
  getLodThresholdSummary,
  getSkyAuroraSignature,
  getSkyConstellationSignature,
  getSkyEventSignature,
  getSkyMilkyWaySignature,
  getSkyPositionSignature,
  getTileDrawCallLimit,
  getTileModelDrawCallRatioWarning,
  getWrappedBatchWindow,
  getTwilightSkyPalette,
  getTileModelDetailLevel,
  getTileModelLowDetailDistance,
  getTileModelDetailLevelFromSquaredDistance,
  getTileModelDetailLevelWithHysteresis,
  getPendingWorldBuildDetailLevel,
  getVisibleWorldTileBuildOrder,
  pickCornerBoundaryProfile,
  prepareObjectForDistanceFade,
  reconcilePendingWorldBuildQueue,
  recordRenderDebugEvent,
  recordRecentCountMetric,
  recordRecentLabeledCountMetric,
  recordRecentMetric,
  recordRecentDurationMetric,
  recordRecentLabeledDurationMetric,
  resetOwnedMaterialLifecycleMetrics,
  isFrameTimeBudgetExhausted,
  shouldProcessPendingWorldBuildEntry,
  shouldEvaluateTileModelDetailLevel,
  shouldKeepTileModelFullDetailLonger,
  shouldSyncWorldCurvature,
  shouldSyncTileModelDetailLevels,
  summarizeVisibleTileKinds,
  summarizeRemovedTileModelBudgetParts,
  syncDynamicTileNodes,
  updateFarLandModelVisibility,
  validateTileDrawCallBudget,
  validateTileModelCostEstimateAgainstRenderBudget,
  validateTileModelAgainstRenderBudget,
  shouldRenderWorldTile,
} from './index.ts';

type SkySignatureCycle = Parameters<typeof getSkyConstellationSignature>[0];

class FakePluginGeometry {
  attributes: Record<string, unknown>;

  constructor(..._args: number[]) {
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

describe('render3d visibility helpers', () => {
  it('collects unique scene material and geometry counts for debug diagnostics', () => {
    const sharedTexture = createMockTexture(32, 16);
    const uniqueTexture = createMockTexture(8, 8, false);
    const sharedMaterial = createMockMaterial({
      map: sharedTexture,
      transparent: true,
      alphaTest: 0.08,
      side: 2,
      type: 'MeshStandardMaterial',
    });
    const otherMaterial = createMockMaterial({
      emissiveMap: uniqueTexture,
      transparent: true,
      fog: false,
      vertexShader: 'void main() {}',
      fragmentShader: 'void main() {}',
      type: 'ShaderMaterial',
    });
    const sharedGeometry = createMockStatGeometry('shared-geometry', 24);
    const otherGeometry = createMockStatGeometry('other-geometry', 12);
    const root = createMockObject3D(undefined, [
      createMockObject3D(sharedMaterial, [], sharedGeometry, {
        renderStatKind: 'tree',
      }),
      createMockObject3D([sharedMaterial, otherMaterial], [], sharedGeometry),
      createMockObject3D(otherMaterial, [], otherGeometry),
    ]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 4,
      visibleObjectCount: 4,
      invisibleObjectCount: 0,
      groupCount: 1,
      meshCount: 3,
      instancedMeshCount: 0,
      visibleInstancedMeshCount: 0,
      renderedInstanceCount: 0,
      visibleMeshCount: 3,
      drawCallCount: 3,
      maxHierarchyDepth: 1,
      averageHierarchyDepth: 0.75,
      emptyGroupCount: 0,
      oneChildGroupCount: 0,
      matrixAutoUpdateCount: 0,
      staticMatrixAutoUpdateCount: 0,
      pointsCount: 0,
      lineObjectCount: 0,
      cameraCount: 0,
      activeParticleSystemCount: 0,
      activeParticleCount: 0,
      spriteCount: 0,
      lightCount: 0,
      ambientLightCount: 0,
      directionalLightCount: 0,
      pointLightCount: 0,
      spotLightCount: 0,
      hemisphereLightCount: 0,
      dynamicLightCount: 0,
      shadowLightCount: 0,
      vertexCount: 36,
      materialRefCount: 4,
      geometryRefCount: 3,
      materialCount: 2,
      sharedMaterialCount: 2,
      clonedMaterialCount: 0,
      transparentMaterialCount: 2,
      alphaTestMaterialCount: 1,
      doubleSidedMaterialCount: 1,
      fogMaterialCount: 1,
      customShaderMaterialCount: 1,
      materialTypes: 'MeshStandardMaterial:1, ShaderMaterial:1',
      materialsCreatedDuringSamplingWindow: 0,
      materialsDisposedDuringSamplingWindow: 0,
      geometryCount: 2,
      sharedGeometryCount: 1,
      geometryBytes: 432,
      vertexBufferBytes: 432,
      indexBufferBytes: 0,
      averageVerticesPerGeometry: 18,
      largestGeometryVertexCount: 24,
      largestGeometryBytes: 288,
      textureCount: 2,
      textureMemoryEstimateBytes: 2987,
      treeCount: 1,
      treeObjectCount: 1,
      treeMeshCount: 1,
      treeMaterialRefCount: 1,
    });
  });

  it('disposes only tile-owned materials and geometries when removing a tile node', () => {
    const sharedMaterial = createMockMaterial();
    const otherMaterial = createMockMaterial();
    const sharedGeometry = createMockGeometry(18);
    const otherGeometry = createMockGeometry(12);
    const root = createMockObject3D(undefined, [
      createMockObject3D(sharedMaterial, [], sharedGeometry),
      createMockObject3D([sharedMaterial, otherMaterial], [], otherGeometry),
    ]);

    disposeObject3DResources(root as never);

    expect(sharedMaterial.dispose).toHaveBeenCalledTimes(0);
    expect(otherMaterial.dispose).toHaveBeenCalledTimes(0);
    expect(sharedGeometry.dispose).toHaveBeenCalledTimes(0);
    expect(otherGeometry.dispose).toHaveBeenCalledTimes(0);
  });

  it('keeps shared fade materials untouched during disposal when no clones are created', () => {
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);

    prepareObjectForDistanceFade(root as never);
    disposeObject3DResources(root as never);

    expect(sourceMaterial.dispose).toHaveBeenCalledTimes(0);
    expect(child.material).toBe(sourceMaterial);
  });

  it('does not create owned fade materials while preparing distance-faded models', () => {
    resetOwnedMaterialLifecycleMetrics();
    const nowSpy = vi.spyOn(performance, 'now');
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);

    nowSpy.mockReturnValue(1000);
    prepareObjectForDistanceFade(root as never);
    expect(getRecentOwnedMaterialLifecycleCounts(1000)).toEqual({
      createdCount: 0,
      disposedCount: 0,
    });

    nowSpy.mockReturnValue(1400);
    disposeObject3DResources(root as never);
    expect(getRecentOwnedMaterialLifecycleCounts(1400)).toEqual({
      createdCount: 0,
      disposedCount: 0,
    });
    expect(getRecentOwnedMaterialLifecycleCounts(2401)).toEqual({
      createdCount: 0,
      disposedCount: 0,
    });

    nowSpy.mockRestore();
    resetOwnedMaterialLifecycleMetrics();
  });

  it('records additional object-type counts for points, lines, sprites, visible meshes, dynamic lights, and shadow lights', () => {
    const visibleInstancedMesh = createMockObject3D(
      {},
      [],
      createMockStatGeometry('instanced-geometry', 4),
      {},
      'InstancedMesh'
    );
    (visibleInstancedMesh as { count?: number }).count = 24;
    const root = createMockObject3D(undefined, [
      createMockObject3D({}, [], createMockStatGeometry('visible-geometry', 8), {}, 'Mesh'),
      createMockObject3D(
        {},
        [],
        createMockStatGeometry('hidden-geometry', 6),
        {},
        'Mesh',
        false,
        false,
        false
      ),
      visibleInstancedMesh,
      createMockObject3D(undefined, [], undefined, {}, 'Points'),
      createMockObject3D(undefined, [], undefined, {}, 'Line'),
      createMockObject3D(undefined, [], undefined, {}, 'LineLoop'),
      createMockObject3D(undefined, [], undefined, {}, 'PerspectiveCamera'),
      createMockObject3D(undefined, [], undefined, {}, 'Sprite'),
      createMockObject3D(undefined, [], undefined, {}, 'AmbientLight', true, false),
      createMockObject3D(undefined, [], undefined, {}, 'HemisphereLight', true, false),
      createMockObject3D(undefined, [], undefined, {}, 'SpotLight', true, false),
      createMockObject3D(undefined, [], undefined, {}, 'PointLight', true, true),
      createMockObject3D(undefined, [], undefined, {}, 'DirectionalLight', true, false),
    ]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 14,
      visibleObjectCount: 13,
      invisibleObjectCount: 1,
      groupCount: 1,
      meshCount: 3,
      instancedMeshCount: 1,
      visibleInstancedMeshCount: 1,
      renderedInstanceCount: 24,
      visibleMeshCount: 2,
      drawCallCount: 3,
      maxHierarchyDepth: 1,
      averageHierarchyDepth: 13 / 14,
      emptyGroupCount: 0,
      oneChildGroupCount: 0,
      matrixAutoUpdateCount: 0,
      staticMatrixAutoUpdateCount: 0,
      pointsCount: 1,
      lineObjectCount: 2,
      cameraCount: 1,
      activeParticleSystemCount: 1,
      activeParticleCount: 0,
      spriteCount: 1,
      lightCount: 5,
      ambientLightCount: 1,
      directionalLightCount: 1,
      pointLightCount: 1,
      spotLightCount: 1,
      hemisphereLightCount: 1,
      dynamicLightCount: 2,
      shadowLightCount: 1,
      vertexCount: 18,
      materialRefCount: 3,
      geometryRefCount: 3,
      materialCount: 3,
      sharedMaterialCount: 0,
      clonedMaterialCount: 0,
      transparentMaterialCount: 0,
      alphaTestMaterialCount: 0,
      doubleSidedMaterialCount: 0,
      fogMaterialCount: 3,
      customShaderMaterialCount: 0,
      materialTypes: 'Material:3',
      materialsCreatedDuringSamplingWindow: 0,
      materialsDisposedDuringSamplingWindow: 0,
      geometryCount: 3,
      sharedGeometryCount: 0,
      geometryBytes: 216,
      vertexBufferBytes: 216,
      indexBufferBytes: 0,
      averageVerticesPerGeometry: 6,
      largestGeometryVertexCount: 8,
      largestGeometryBytes: 96,
      textureCount: 0,
      textureMemoryEstimateBytes: 0,
      treeCount: 0,
      treeObjectCount: 0,
      treeMeshCount: 0,
      treeMaterialRefCount: 0,
    });
  });

  it('counts only visible point clouds as active particle systems and sums their particles', () => {
    const root = createMockObject3D(undefined, [
      createMockObject3D(
        createMockMaterial(),
        [],
        createMockStatGeometry('visible-particles', 18),
        {},
        'Points',
        false,
        false,
        true
      ),
      createMockObject3D(
        createMockMaterial(),
        [],
        createMockStatGeometry('hidden-particles', 7),
        {},
        'Points',
        false,
        false,
        false
      ),
    ]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 3,
      visibleObjectCount: 2,
      invisibleObjectCount: 1,
      groupCount: 1,
      meshCount: 2,
      instancedMeshCount: 0,
      visibleInstancedMeshCount: 0,
      renderedInstanceCount: 0,
      visibleMeshCount: 1,
      drawCallCount: 2,
      maxHierarchyDepth: 1,
      averageHierarchyDepth: 2 / 3,
      emptyGroupCount: 0,
      oneChildGroupCount: 0,
      matrixAutoUpdateCount: 0,
      staticMatrixAutoUpdateCount: 0,
      pointsCount: 2,
      lineObjectCount: 0,
      cameraCount: 0,
      activeParticleSystemCount: 1,
      activeParticleCount: 18,
      spriteCount: 0,
      lightCount: 0,
      ambientLightCount: 0,
      directionalLightCount: 0,
      pointLightCount: 0,
      spotLightCount: 0,
      hemisphereLightCount: 0,
      dynamicLightCount: 0,
      shadowLightCount: 0,
      vertexCount: 25,
      materialRefCount: 2,
      geometryRefCount: 2,
      materialCount: 2,
      sharedMaterialCount: 0,
      clonedMaterialCount: 0,
      transparentMaterialCount: 0,
      alphaTestMaterialCount: 0,
      doubleSidedMaterialCount: 0,
      fogMaterialCount: 2,
      customShaderMaterialCount: 0,
      materialTypes: 'Material:2',
      materialsCreatedDuringSamplingWindow: 0,
      materialsDisposedDuringSamplingWindow: 0,
      geometryCount: 2,
      sharedGeometryCount: 0,
      geometryBytes: 300,
      vertexBufferBytes: 300,
      indexBufferBytes: 0,
      averageVerticesPerGeometry: 12.5,
      largestGeometryVertexCount: 18,
      largestGeometryBytes: 216,
      textureCount: 0,
      textureMemoryEstimateBytes: 0,
      treeCount: 0,
      treeObjectCount: 0,
      treeMeshCount: 0,
      treeMaterialRefCount: 0,
    });
  });

  it('reuses shared box and plane geometries for repeated tile shapes', () => {
    expect(getSharedBoxGeometry(1, 0.03, 1)).toBe(
      getSharedBoxGeometry(1, 0.03, 1)
    );
    expect(getSharedPlaneGeometry(1, 1)).toBe(getSharedPlaneGeometry(1, 1));
    expect(getSharedBoxGeometry(1, 0.03, 1)).not.toBe(
      getSharedBoxGeometry(1, 0.28, 1)
    );
  });

  it('recreates shared geometries deterministically after bounded cache eviction churn', () => {
    const baselineBox = getSharedBoxGeometry(1, 0.03, 1);
    const baselinePlane = getSharedPlaneGeometry(1, 1);

    for (
      let index = 0;
      index < SHARED_RENDER_GEOMETRY_CACHE_MAX_ENTRIES + 32;
      index += 1
    ) {
      getSharedBoxGeometry(1 + index * 0.01, 0.03 + index * 0.001, 1);
      getSharedPlaneGeometry(1 + index * 0.01, 1 + index * 0.01);
    }

    const resolvedBox = getSharedBoxGeometry(1, 0.03, 1);
    const resolvedPlane = getSharedPlaneGeometry(1, 1);

    expect(resolvedBox).not.toBe(baselineBox);
    expect(resolvedPlane).not.toBe(baselinePlane);
    expect((resolvedBox as { parameters?: unknown }).parameters).toEqual(
      (baselineBox as { parameters?: unknown }).parameters
    );
    expect((resolvedPlane as { parameters?: unknown }).parameters).toEqual(
      (baselinePlane as { parameters?: unknown }).parameters
    );
  });

  it('identifies when water can use a single full-tile body mesh', () => {
    expect(
      getWaterFloorBodyProfile({ north: 0, east: 0, south: 0, west: 0 })
    ).toEqual({
      width: 1,
      depth: 1,
      centerX: 0,
      centerZ: 0,
      fillsTile: true,
    });

    expect(
      getWaterFloorBodyProfile({ north: 0.1, east: 0.2, south: 0.1, west: 0 })
    ).toEqual({
      width: 0.8,
      depth: 0.8,
      centerX: -0.1,
      centerZ: 0,
      fillsTile: false,
    });
  });

  it('counts descendant objects inside tagged tree roots for per-tree budget diagnostics', () => {
    const branch = createMockObject3D(
      {},
      [],
      createMockStatGeometry('branch-geometry', 10)
    );
    const canopy = createMockObject3D(
      {},
      [],
      createMockStatGeometry('canopy-geometry', 16)
    );
    const treeRoot = createMockObject3D(undefined, [branch, canopy], undefined, {
      renderStatKind: 'tree',
    });
    const root = createMockObject3D(undefined, [treeRoot]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 4,
      visibleObjectCount: 4,
      invisibleObjectCount: 0,
      groupCount: 2,
      meshCount: 2,
      instancedMeshCount: 0,
      visibleInstancedMeshCount: 0,
      renderedInstanceCount: 0,
      visibleMeshCount: 2,
      drawCallCount: 2,
      maxHierarchyDepth: 2,
      averageHierarchyDepth: 1.25,
      emptyGroupCount: 0,
      oneChildGroupCount: 1,
      matrixAutoUpdateCount: 0,
      staticMatrixAutoUpdateCount: 0,
      pointsCount: 0,
      lineObjectCount: 0,
      cameraCount: 0,
      activeParticleSystemCount: 0,
      activeParticleCount: 0,
      spriteCount: 0,
      lightCount: 0,
      ambientLightCount: 0,
      directionalLightCount: 0,
      pointLightCount: 0,
      spotLightCount: 0,
      hemisphereLightCount: 0,
      dynamicLightCount: 0,
      shadowLightCount: 0,
      vertexCount: 26,
      materialRefCount: 2,
      geometryRefCount: 2,
      materialCount: 2,
      sharedMaterialCount: 0,
      clonedMaterialCount: 0,
      transparentMaterialCount: 0,
      alphaTestMaterialCount: 0,
      doubleSidedMaterialCount: 0,
      fogMaterialCount: 2,
      customShaderMaterialCount: 0,
      materialTypes: 'Material:2',
      materialsCreatedDuringSamplingWindow: 0,
      materialsDisposedDuringSamplingWindow: 0,
      geometryCount: 2,
      sharedGeometryCount: 0,
      geometryBytes: 312,
      vertexBufferBytes: 312,
      indexBufferBytes: 0,
      averageVerticesPerGeometry: 13,
      largestGeometryVertexCount: 16,
      largestGeometryBytes: 192,
      textureCount: 0,
      textureMemoryEstimateBytes: 0,
      treeCount: 1,
      treeObjectCount: 3,
      treeMeshCount: 2,
      treeMaterialRefCount: 2,
    });
  });

  it('tracks hierarchy depth plus empty and single-child groups', () => {
    const emptyGroup = createMockObject3D();
    const nestedMesh = createMockObject3D(
      createMockMaterial(),
      [],
      createMockStatGeometry('nested-geometry', 3)
    );
    const oneChildGroup = createMockObject3D(undefined, [nestedMesh]);
    const deepLeaf = createMockObject3D(
      createMockMaterial(),
      [],
      createMockStatGeometry('deep-geometry', 5)
    );
    const deepBranch = createMockObject3D(undefined, [
      createMockObject3D(undefined, [deepLeaf]),
    ]);
    const root = createMockObject3D(undefined, [emptyGroup, oneChildGroup, deepBranch]);

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 7,
      visibleObjectCount: 7,
      invisibleObjectCount: 0,
      groupCount: 5,
      meshCount: 2,
      instancedMeshCount: 0,
      visibleInstancedMeshCount: 0,
      renderedInstanceCount: 0,
      visibleMeshCount: 2,
      drawCallCount: 2,
      maxHierarchyDepth: 3,
      averageHierarchyDepth: 10 / 7,
      emptyGroupCount: 1,
      oneChildGroupCount: 3,
      matrixAutoUpdateCount: 0,
      staticMatrixAutoUpdateCount: 0,
      pointsCount: 0,
      lineObjectCount: 0,
      cameraCount: 0,
      activeParticleSystemCount: 0,
      activeParticleCount: 0,
      spriteCount: 0,
      lightCount: 0,
      ambientLightCount: 0,
      directionalLightCount: 0,
      pointLightCount: 0,
      spotLightCount: 0,
      hemisphereLightCount: 0,
      dynamicLightCount: 0,
      shadowLightCount: 0,
      vertexCount: 8,
      materialRefCount: 2,
      geometryRefCount: 2,
      materialCount: 2,
      sharedMaterialCount: 0,
      clonedMaterialCount: 0,
      transparentMaterialCount: 0,
      alphaTestMaterialCount: 0,
      doubleSidedMaterialCount: 0,
      fogMaterialCount: 2,
      customShaderMaterialCount: 0,
      materialTypes: 'Material:2',
      materialsCreatedDuringSamplingWindow: 0,
      materialsDisposedDuringSamplingWindow: 0,
      geometryCount: 2,
      sharedGeometryCount: 0,
      geometryBytes: 96,
      vertexBufferBytes: 96,
      indexBufferBytes: 0,
      averageVerticesPerGeometry: 4,
      largestGeometryVertexCount: 5,
      largestGeometryBytes: 60,
      textureCount: 0,
      textureMemoryEstimateBytes: 0,
      treeCount: 0,
      treeObjectCount: 0,
      treeMeshCount: 0,
      treeMaterialRefCount: 0,
    });
  });

  it('counts static objects that keep matrixAutoUpdate enabled separately from tagged dynamic responders', () => {
    const staticLeaf = createMockObject3D(
      createMockMaterial(),
      [],
      createMockStatGeometry('matrix-static-leaf', 4),
      {},
      'Mesh',
      false,
      false,
      true,
      false
    );
    const animatedLeaf = createMockObject3D(
      createMockMaterial(),
      [],
      createMockStatGeometry('matrix-animated-leaf', 6),
      {
        poiWindResponder: {
          axis: 'z',
        },
      },
      'Mesh',
      false,
      false,
      true,
      true
    );
    const animatedGroup = createMockObject3D(
      undefined,
      [animatedLeaf],
      undefined,
      {},
      'Group',
      false,
      false,
      true,
      true
    );
    const root = createMockObject3D(
      undefined,
      [staticLeaf, animatedGroup],
      undefined,
      {},
      'Group',
      false,
      false,
      true,
      false
    );

    expect(collectSceneResourceStats(root as never)).toEqual({
      object3dCount: 4,
      visibleObjectCount: 4,
      invisibleObjectCount: 0,
      groupCount: 2,
      meshCount: 2,
      instancedMeshCount: 0,
      visibleInstancedMeshCount: 0,
      renderedInstanceCount: 0,
      visibleMeshCount: 2,
      drawCallCount: 2,
      maxHierarchyDepth: 2,
      averageHierarchyDepth: 1,
      emptyGroupCount: 0,
      oneChildGroupCount: 1,
      matrixAutoUpdateCount: 2,
      staticMatrixAutoUpdateCount: 1,
      pointsCount: 0,
      lineObjectCount: 0,
      cameraCount: 0,
      activeParticleSystemCount: 0,
      activeParticleCount: 0,
      spriteCount: 0,
      lightCount: 0,
      ambientLightCount: 0,
      directionalLightCount: 0,
      pointLightCount: 0,
      spotLightCount: 0,
      hemisphereLightCount: 0,
      dynamicLightCount: 0,
      shadowLightCount: 0,
      vertexCount: 10,
      materialRefCount: 2,
      geometryRefCount: 2,
      materialCount: 2,
      sharedMaterialCount: 0,
      clonedMaterialCount: 0,
      transparentMaterialCount: 0,
      alphaTestMaterialCount: 0,
      doubleSidedMaterialCount: 0,
      fogMaterialCount: 2,
      customShaderMaterialCount: 0,
      materialTypes: 'Material:2',
      materialsCreatedDuringSamplingWindow: 0,
      materialsDisposedDuringSamplingWindow: 0,
      geometryCount: 2,
      sharedGeometryCount: 0,
      geometryBytes: 120,
      vertexBufferBytes: 120,
      indexBufferBytes: 0,
      averageVerticesPerGeometry: 5,
      largestGeometryVertexCount: 6,
      largestGeometryBytes: 72,
      textureCount: 0,
      textureMemoryEstimateBytes: 0,
      treeCount: 0,
      treeObjectCount: 0,
      treeMeshCount: 0,
      treeMaterialRefCount: 0,
    });
  });

  it('tracks recent tile-build and lod churn with a rolling one-second window', () => {
    const timestamps = [100, 450];

    recordRecentMetric(timestamps, 900);
    expect(timestamps).toEqual([100, 450, 900]);
    expect(countRecentMetricEvents(timestamps, 950)).toBe(3);
    expect(countRecentMetricEvents(timestamps, 1405)).toBe(2);

    recordRecentMetric(timestamps, 2405);
    expect(timestamps).toEqual([2405]);
    expect(countRecentMetricEvents(timestamps, 2600)).toBe(1);
  });

  it('summarizes recent render churn counters for debug stats', () => {
    expect(
      getRenderChurnStats(
        {
          tileNodeBuilds: [100, 450, 900],
          tileBuilds: [450, 900],
          pendingCancelledEntries: [450, 800],
          lodChecks: [900],
          lodReplacements: [100, 450],
          pendingFlushCounts: [],
          tileBuildDurations: [],
          tilePluginBuildDurations: [],
          tileModelBudgetViolations: [],
        },
        950
      )
    ).toEqual({
      tileNodeBuildsPerSecond: 3,
      tileBuildsPerSecond: 2,
      pendingCancelledEntriesPerSecond: 2,
      lodChecksPerSecond: 1,
      lodReplacementsPerSecond: 2,
    });

    expect(
      getRenderChurnStats(
        {
          tileNodeBuilds: [100, 450, 900],
          tileBuilds: [450, 900],
          pendingCancelledEntries: [450, 800],
          lodChecks: [900],
          lodReplacements: [100, 450],
          pendingFlushCounts: [],
          tileBuildDurations: [],
          tilePluginBuildDurations: [],
          tileModelBudgetViolations: [],
        },
        1505
      )
    ).toEqual({
      tileNodeBuildsPerSecond: 1,
      tileBuildsPerSecond: 1,
      pendingCancelledEntriesPerSecond: 1,
      lodChecksPerSecond: 1,
      lodReplacementsPerSecond: 0,
    });
  });

  it('always allows one pending world build entry but stops once the budget or entry cap is exhausted', () => {
    expect(
      shouldProcessPendingWorldBuildEntry(100, 105, 0, {
        pendingBuildBudgetMs: 1,
        maxPendingBuildTiles: 4,
      })
    ).toBe(true);

    expect(
      shouldProcessPendingWorldBuildEntry(100, 100.5, 1, {
        pendingBuildBudgetMs: 1,
        maxPendingBuildTiles: 4,
      })
    ).toBe(true);

    expect(
      shouldProcessPendingWorldBuildEntry(100, 101.5, 1, {
        pendingBuildBudgetMs: 1,
        maxPendingBuildTiles: 4,
      })
    ).toBe(false);

    expect(
      shouldProcessPendingWorldBuildEntry(100, 100.2, 4, {
        pendingBuildBudgetMs: 10,
        maxPendingBuildTiles: 4,
      })
    ).toBe(false);
  });

  it('forces progressive first-frame world builds and clamps expensive rebuild streaks', () => {
    expect(
      getEffectivePendingWorldBuildBudget({
        pendingBuildBudgetMs: 3.5,
        maxPendingBuildTiles: 8,
        pendingQueueLength: 24,
        visibleTileCount: 0,
      })
    ).toEqual({
      pendingBuildBudgetMs: 0.75,
      maxPendingBuildTiles: 1,
    });

    expect(
      getEffectivePendingWorldBuildBudget({
        pendingBuildBudgetMs: 3.5,
        maxPendingBuildTiles: 8,
        pendingQueueLength: 10,
        visibleTileCount: 6,
        recentTileBuildAverageMs: 2.2,
        recentTileBuildMaxMs: 4.8,
      })
    ).toEqual({
      pendingBuildBudgetMs: 2.2,
      maxPendingBuildTiles: 1,
    });
  });

  it('tracks recent pending flush sizes with rolling average and max stats', () => {
    const samples = [
      { nowMs: 100, count: 2 },
      { nowMs: 450, count: 4 },
    ];

    recordRecentCountMetric(samples, { nowMs: 900, count: 6 });
    expect(getRecentCountStats(samples, 950)).toEqual({
      averageCount: 4,
      maxCount: 6,
    });

    expect(getRecentCountStats(samples, 1405)).toEqual({
      averageCount: 5,
      maxCount: 6,
    });

    recordRecentCountMetric(samples, { nowMs: 2405, count: 3 });
    expect(samples).toEqual([{ nowMs: 2405, count: 3 }]);
    expect(getRecentCountStats(samples, 2600)).toEqual({
      averageCount: 3,
      maxCount: 3,
    });
  });

  it('tracks shared frame generation budgets and reports when they are exhausted', () => {
    const budget = createFrameTimeBudget(2.5, 100);

    expect(getRemainingFrameTimeBudgetMs(budget, 101)).toBeCloseTo(1.5, 6);
    expect(isFrameTimeBudgetExhausted(budget, 102.49)).toBe(false);
    expect(isFrameTimeBudgetExhausted(budget, 102.5)).toBe(true);
  });

  it('adapts the shared render budget to the requested tile detail and remaining frame time', () => {
    expect(
      createTilePluginRenderBudget(
        {
          quality: 'reduced',
          detailLevel: 'full',
          targetFps: 30,
          visibilityRadius: 14,
          frame: {
            currentMs: 20,
            smoothedMs: 24,
            generationBudgetMs: 2.5,
            limits: {
              soft: 1000 / 42,
              hard: 1000 / 28,
            },
          },
          pendingBuild: {
            budgetMs: 1.75,
            maxTiles: 3,
            tileLimits: {
              soft: 4,
              hard: 2,
            },
          },
        },
        'low',
        1.1
      )
    ).toEqual({
      quality: 'reduced',
      detailLevel: 'low',
      targetFps: 30,
      visibilityRadius: 14,
      frame: {
        currentMs: 20,
        smoothedMs: 24,
        generationBudgetMs: 2.5,
        remainingGenerationBudgetMs: 1.1,
        limits: {
          soft: 1000 / 42,
          hard: 1000 / 28,
        },
      },
      pendingBuild: {
        budgetMs: 1.75,
        maxTiles: 3,
        tileLimits: {
          soft: 4,
          hard: 2,
        },
      },
    });
    expect(createTilePluginRenderBudget(undefined, 'full')).toBeUndefined();
  });

  it('defines stricter hard caps for low-detail tile models than full-detail ones', () => {
    expect(getTileModelHardLimits('full')).toEqual({
      object3dCount: 128,
      groupCount: 64,
      meshCount: 96,
      drawCallCount: 80,
      instancedMeshCount: 16,
      pointsCount: 8,
      particleEmitterCount: 2,
      lineObjectCount: 12,
      spriteCount: 12,
      geometryCount: 96,
      invalidPositionCoordinateCount: 0,
      pointVertexCount: 1_024,
      lineSegmentCount: 1_024,
      oversizedGeometryBoundsCount: 0,
      maxGeometryVertexCount: 25_000,
      indexedVertexCount: 75_000,
      maxGeometryTriangleCount: 25_000,
      triangleCount: 50_000,
      maxGeometryAttributeCount: 10,
      maxCustomGeometryAttributeCount: 4,
      maxGeometryVertexAttributeByteSize: 1_200_000,
      maxGeometryGroupCount: 12,
      maxGeometryDrawRangeCount: 0,
      invalidGeometryIndexTypeCount: 0,
      invalidRenderBudgetPartMetadataCount: 0,
      ultraDenseTinyGeometryCount: 0,
      materialCount: 16,
      textureCount: 16,
      lightCount: 4,
      shadowLightCount: 1,
      vertexCount: 50_000,
    });
    expect(getTileModelHardLimits('low')).toEqual({
      object3dCount: 32,
      groupCount: 16,
      meshCount: 16,
      drawCallCount: 16,
      instancedMeshCount: 4,
      pointsCount: 2,
      particleEmitterCount: 1,
      lineObjectCount: 4,
      spriteCount: 2,
      geometryCount: 16,
      invalidPositionCoordinateCount: 0,
      pointVertexCount: 128,
      lineSegmentCount: 128,
      oversizedGeometryBoundsCount: 0,
      maxGeometryVertexCount: 1_500,
      indexedVertexCount: 12_000,
      maxGeometryTriangleCount: 1_000,
      triangleCount: 3_000,
      maxGeometryAttributeCount: 6,
      maxCustomGeometryAttributeCount: 2,
      maxGeometryVertexAttributeByteSize: 192_000,
      maxGeometryGroupCount: 4,
      maxGeometryDrawRangeCount: 0,
      invalidGeometryIndexTypeCount: 0,
      invalidRenderBudgetPartMetadataCount: 0,
      ultraDenseTinyGeometryCount: 0,
      materialCount: 3,
      textureCount: 4,
      lightCount: 1,
      shadowLightCount: 0,
      vertexCount: 8_000,
    });
  });

  it('rejects over-budget plugin cost estimates before expensive model generation', () => {
    expect(
      validateTileModelCostEstimateAgainstRenderBudget(
        {
          meshCount: 20,
          drawCallCount: 17,
          triangleCount: 4_000,
        },
        'low'
      )
    ).toEqual({
      accepted: false,
      estimate: {
        meshCount: 20,
        drawCallCount: 17,
        triangleCount: 4_000,
      },
      limits: expect.objectContaining({
        meshCount: 16,
        drawCallCount: 16,
        triangleCount: 3_000,
      }),
      violations: [
        {
          metric: 'meshCount',
          actual: 20,
          limit: 16,
        },
        {
          metric: 'drawCallCount',
          actual: 17,
          limit: 16,
        },
        {
          metric: 'triangleCount',
          actual: 4_000,
          limit: 3_000,
        },
      ],
    });
  });

  it('accepts models that stay within the requested lod hard limits', () => {
    const texture = createMockTexture(16, 16);
    const material = createMockMaterial({ map: texture });
    const root = createMockObject3D(undefined, [
      createMockObject3D(material, [], createMockStatGeometry('mesh-a', 48)),
      createMockObject3D(material, [], createMockStatGeometry('mesh-b', 24)),
    ]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: true,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        object3dCount: 3,
        meshCount: 2,
        instancedMeshCount: 0,
        pointsCount: 0,
        lineObjectCount: 0,
        spriteCount: 0,
        geometryCount: 2,
        drawCallCount: 2,
        invalidPositionCoordinateCount: 0,
        pointVertexCount: 0,
        lineSegmentCount: 0,
        oversizedGeometryBoundsCount: 0,
        maxGeometryVertexCount: 48,
        indexedVertexCount: 0,
        maxGeometryTriangleCount: 16,
        triangleCount: 24,
        maxGeometryAttributeCount: 1,
        maxCustomGeometryAttributeCount: 0,
        maxGeometryVertexAttributeByteSize: 576,
        maxGeometryGroupCount: 0,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
        materialCount: 1,
        textureCount: 1,
        lightCount: 0,
        shadowLightCount: 0,
        vertexCount: 72,
      }),
      violations: [],
    });
  });

  it('rejects models that exceed the requested lod hard limits', () => {
    const materialA = createMockMaterial({ map: createMockTexture(16, 16) });
    const materialB = createMockMaterial({ map: createMockTexture(16, 16) });
    const materialC = createMockMaterial({ map: createMockTexture(16, 16) });
    const materialD = createMockMaterial({ map: createMockTexture(16, 16) });
    const shadowLight = createMockObject3D(
      undefined,
      [],
      undefined,
      {},
      'SpotLight',
      true,
      true
    );
    const root = createMockObject3D(undefined, [
      createMockObject3D(materialA, [], createMockStatGeometry('mesh-a', 2500)),
      createMockObject3D(materialB, [], createMockStatGeometry('mesh-b', 2500)),
      createMockObject3D(materialC, [], createMockStatGeometry('mesh-c', 2500)),
      createMockObject3D(materialD, [], createMockStatGeometry('mesh-d', 2500)),
      shadowLight,
    ]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          maxGeometryVertexCount: 2_500,
          indexedVertexCount: 0,
          maxGeometryTriangleCount: 833,
          triangleCount: 833,
        }),
        violations: [
          {
            metric: 'maxGeometryVertexCount',
            actual: 2_500,
            limit: 1_500,
          },
        ],
      })
    );
  });

  it('rejects models that exceed instanced, points, line, sprite, and geometry caps', () => {
    const sharedMaterial = createMockMaterial();
    const children = [
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('instanced-a', 24), {}, 'InstancedMesh'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('instanced-b', 24), {}, 'InstancedMesh'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('instanced-c', 24), {}, 'InstancedMesh'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('instanced-d', 24), {}, 'InstancedMesh'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('instanced-e', 24), {}, 'InstancedMesh'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('points-a', 12), {}, 'Points'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('points-b', 12), {}, 'Points'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('points-c', 12), {}, 'Points'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('line-a', 6), {}, 'Line'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('line-b', 6), {}, 'LineLoop'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('line-c', 6), {}, 'LineSegments'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('line-d', 6), {}, 'Line'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('line-e', 6), {}, 'LineLoop'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('sprite-a', 4), {}, 'Sprite'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('sprite-b', 4), {}, 'Sprite'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('sprite-c', 4), {}, 'Sprite'),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('geometry-16', 4)),
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('geometry-17', 4)),
    ];
    const root = createMockObject3D(undefined, children);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          meshCount: 5,
          instancedMeshCount: 5,
          pointsCount: 0,
          lineObjectCount: 0,
          spriteCount: 0,
          geometryCount: 5,
          pointVertexCount: 0,
          particleEmitterCount: 0,
          lineSegmentCount: 0,
          maxGeometryVertexCount: 24,
          indexedVertexCount: 0,
          maxGeometryTriangleCount: 8,
          triangleCount: 40,
        }),
        violations: [
          {
            metric: 'instancedMeshCount',
            actual: 5,
            limit: 4,
          },
        ],
      })
    );
  });

  it('rejects models that exceed point and line-segment caps', () => {
    const sharedMaterial = createMockMaterial();
    const densePoints = createMockObject3D(
      sharedMaterial,
      [],
      createMockStatGeometry('dense-points', 129),
      {},
      'Points'
    );
    const denseLine = createMockObject3D(
      sharedMaterial,
      [],
      createMockStatGeometry('dense-line', 130),
      {},
      'Line'
    );
    const root = createMockObject3D(undefined, [densePoints, denseLine]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          pointVertexCount: 129,
          lineSegmentCount: 0,
          maxGeometryVertexCount: 129,
          indexedVertexCount: 0,
          maxGeometryTriangleCount: 0,
          triangleCount: 0,
        }),
        violations: [
          {
            metric: 'pointVertexCount',
            actual: 129,
            limit: 128,
          },
        ],
      })
    );
  });

  it('rejects models that exceed the particle-emitter cap independently of raw point counts', () => {
    const sharedMaterial = createMockMaterial();
    const root = createMockObject3D(undefined, [
      createMockObject3D(
        sharedMaterial,
        [],
        createMockStatGeometry('particle-a', 12),
        {
          renderParticleEmitter: {
            particleCount: 12,
            label: 'mist-a',
          },
        },
        'Points'
      ),
      createMockObject3D(
        sharedMaterial,
        [],
        createMockStatGeometry('particle-b', 12),
        {
          renderParticleEmitter: {
            particleCount: 12,
            label: 'mist-b',
          },
        },
        'Points'
      ),
      createMockObject3D(
        sharedMaterial,
        [],
        createMockStatGeometry('particle-c', 12),
        {
          renderParticleEmitter: {
            particleCount: 12,
            label: 'mist-c',
          },
        },
        'Points'
      ),
    ]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'full')).toEqual(
      expect.objectContaining({
        accepted: false,
        stats: expect.objectContaining({
          pointsCount: 3,
          particleEmitterCount: 3,
        }),
        violations: [
          {
            metric: 'particleEmitterCount',
            actual: 3,
            limit: 2,
          },
        ],
      })
    );
  });

  it('rejects obviously oversized geometry before expensive coordinate scans run', () => {
    const explosiveArray = new Proxy(
      { length: 75_003 },
      {
        get(target, property) {
          if (property === 'length') {
            return target.length;
          }
          throw new Error('expensive geometry scan should not run');
        },
      }
    );
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      {
        attributes: {
          position: {
            count: 25_001,
            array: explosiveArray,
          },
        },
      }
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'full')).toEqual(
      expect.objectContaining({
        accepted: false,
        stats: expect.objectContaining({
          maxGeometryVertexCount: 25_001,
        }),
        violations: [
          {
            metric: 'maxGeometryVertexCount',
            actual: 25_001,
            limit: 25_000,
          },
        ],
      })
    );
  });

  it('rejects models containing non-finite geometry coordinates', () => {
    const geometry = createMockStatGeometry('invalid-position', 3);
    (
      geometry.attributes.position.array as Float32Array
    )[4] = Number.POSITIVE_INFINITY;
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      geometry
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'full')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('full'),
      stats: expect.objectContaining({
        invalidPositionCoordinateCount: 1,
        pointVertexCount: 0,
        lineSegmentCount: 0,
        oversizedGeometryBoundsCount: 0,
        maxGeometryVertexCount: 3,
        indexedVertexCount: 0,
        maxGeometryTriangleCount: 1,
        triangleCount: 1,
        maxGeometryAttributeCount: 1,
        maxCustomGeometryAttributeCount: 0,
        maxGeometryVertexAttributeByteSize: 36,
        maxGeometryGroupCount: 0,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'invalidPositionCoordinateCount',
          actual: 1,
          limit: 0,
        },
      ],
    });
  });

  it('rejects models whose single largest geometry exceeds the per-mesh vertex cap', () => {
    const root = createMockObject3D(undefined, [
      createMockObject3D(
        createMockMaterial(),
        [],
        createMockStatGeometry('too-dense', 1_501)
      ),
    ]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          maxGeometryVertexCount: 1_501,
          indexedVertexCount: 0,
          maxGeometryTriangleCount: 500,
          triangleCount: 500,
        }),
        violations: [
          {
            metric: 'maxGeometryVertexCount',
            actual: 1_501,
            limit: 1_500,
          },
        ],
      })
    );
  });

  it('rejects models containing geometry with unreasonable bounds', () => {
    const geometry = createMockPositionGeometry([
      0, 0, 0,
      18, 0, 0,
      0, 1, 0,
    ]);
    const root = createMockObject3D(createMockMaterial(), [], geometry);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        oversizedGeometryBoundsCount: 1,
        indexedVertexCount: 0,
        maxGeometryTriangleCount: 1,
        triangleCount: 1,
        maxGeometryAttributeCount: 1,
        maxCustomGeometryAttributeCount: 0,
        maxGeometryVertexAttributeByteSize: 36,
        maxGeometryGroupCount: 0,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'oversizedGeometryBoundsCount',
          actual: 1,
          limit: 0,
        },
      ],
    });
  });

  it('rejects models whose indexed vertex count exceeds the model cap', () => {
    const geometry = createMockIndexedGeometry(64, 12_001);
    const root = createMockObject3D(createMockMaterial(), [], geometry);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          indexedVertexCount: 12_001,
          maxGeometryTriangleCount: 4_000,
          triangleCount: 4_000,
        }),
        violations: [
          {
            metric: 'indexedVertexCount',
            actual: 12_001,
            limit: 12_000,
          },
        ],
      })
    );
  });

  it('rejects models whose largest geometry exceeds the per-mesh triangle cap', () => {
    const geometry = createMockIndexedGeometry(64, 3_003);
    const root = createMockObject3D(createMockMaterial(), [], geometry);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          indexedVertexCount: 3_003,
          maxGeometryTriangleCount: 1_001,
          triangleCount: 1_001,
        }),
        violations: [
          {
            metric: 'maxGeometryTriangleCount',
            actual: 1_001,
            limit: 1_000,
          },
        ],
      })
    );
  });

  it('rejects models whose total triangle count exceeds the model cap', () => {
    const sharedMaterial = createMockMaterial();
    const root = createMockObject3D(undefined, [
      createMockObject3D(
        sharedMaterial,
        [],
        createMockIndexedGeometry(64, 2_400)
      ),
      createMockObject3D(
        sharedMaterial,
        [],
        createMockIndexedGeometry(64, 2_400)
      ),
      createMockObject3D(
        sharedMaterial,
        [],
        createMockIndexedGeometry(64, 2_400)
      ),
      createMockObject3D(
        sharedMaterial,
        [],
        createMockIndexedGeometry(64, 2_400)
      ),
    ]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        limits: getTileModelHardLimits('low'),
        stats: expect.objectContaining({
          meshCount: 4,
          geometryCount: 4,
          indexedVertexCount: 9_600,
          maxGeometryTriangleCount: 800,
          triangleCount: 3_200,
        }),
        violations: [
          {
            metric: 'triangleCount',
            actual: 3_200,
            limit: 3_000,
          },
        ],
      })
    );
  });

  it('rejects models whose geometry exposes too many attributes', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockRichAttributeGeometry(48, {
        normal: 3,
        uv: 2,
        color: 3,
        tangent: 4,
        weights: 4,
        customA: 1,
        customB: 1,
      })
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        maxGeometryAttributeCount: 8,
        maxCustomGeometryAttributeCount: 3,
        maxGeometryGroupCount: 0,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'maxGeometryAttributeCount',
          actual: 8,
          limit: 6,
        },
        {
          metric: 'maxCustomGeometryAttributeCount',
          actual: 3,
          limit: 2,
        },
      ],
    });
  });

  it('rejects models whose geometry attribute buffers grow past the byte cap', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockRichAttributeGeometry(1_500, {
        customA: 20,
        customB: 20,
      })
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        maxGeometryVertexAttributeByteSize: 258_000,
        maxGeometryGroupCount: 0,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'maxGeometryVertexAttributeByteSize',
          actual: 258_000,
          limit: 192_000,
        },
      ],
    });
  });

  it('rejects models whose geometry uses too many groups', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockGroupedGeometry(48, 5)
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        maxGeometryGroupCount: 5,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'maxGeometryGroupCount',
          actual: 5,
          limit: 4,
        },
      ],
    });
  });

  it('rejects models whose estimated draw calls exceed the per-model cap', () => {
    const sharedMaterial = createMockMaterial();
    const root = createMockObject3D(
      undefined,
      Array.from({ length: 5 }, (_unused, index) =>
        createMockObject3D(
          sharedMaterial,
          [],
          createMockGroupedGeometry(24, 4),
          {
            drawCallIndex: index,
          }
        )
      )
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        meshCount: 5,
        drawCallCount: 20,
        maxGeometryGroupCount: 4,
        maxGeometryDrawRangeCount: 0,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'drawCallCount',
          actual: 20,
          limit: 16,
        },
      ],
    });
  });

  it('caps total draw calls per tile after floor and model content are combined', () => {
    const sharedMaterial = createMockMaterial();
    const root = createMockObject3D(undefined, [
      createMockObject3D(sharedMaterial, [], createMockStatGeometry('tile-floor', 24)),
      ...Array.from({ length: 5 }, (_unused, index) =>
        createMockObject3D(
          sharedMaterial,
          [],
          createMockGroupedGeometry(24, 4),
          {
            tileDrawCallIndex: index,
          }
        )
      ),
    ]);

    expect(getTileDrawCallLimit('low')).toBe(17);
    expect(validateTileDrawCallBudget(root as never, 'low')).toEqual({
      accepted: false,
      drawCallCount: 21,
      limit: 17,
    });
  });

  it('aggregates visible tile budget pressure by chunk', () => {
    const entries = [
      { tileX: 0, tileY: 0, drawCallCount: 6, visibleMeshCount: 4, materialCount: 2 },
      { tileX: 1, tileY: 2, drawCallCount: 5, visibleMeshCount: 3, materialCount: 3 },
      { tileX: 4, tileY: 0, drawCallCount: 8, visibleMeshCount: 6, materialCount: 4 },
      { tileX: -1, tileY: -1, drawCallCount: 7, visibleMeshCount: 5, materialCount: 2 },
    ];

    expect(collectChunkDrawCallStats(entries, 4)).toEqual({
      chunkCount: 3,
      maxChunkDrawCallCount: 11,
    });
    expect(collectVisibleTileResourceStats(entries, 4)).toEqual({
      chunkCount: 3,
      maxChunkDrawCallCount: 11,
      maxChunkMeshCount: 7,
      totalVisibleObjectCount: 0,
      totalVisibleMeshCount: 18,
      totalMaterialCount: 11,
    });
  });

  it('warns when a plugin model uses many draw calls for very little triangle work', () => {
    expect(
      getTileModelDrawCallRatioWarning(
        {
          drawCallCount: 24,
          triangleCount: 96,
        },
        'full'
      )
    ).toBe('drawCallCount 24 for triangleCount 96 (4.0 triangles/draw call)');

    expect(
      getTileModelDrawCallRatioWarning(
        {
          drawCallCount: 12,
          triangleCount: 36,
        },
        'low'
      )
    ).toBe('drawCallCount 12 for triangleCount 36 (3.0 triangles/draw call)');

    expect(
      getTileModelDrawCallRatioWarning(
        {
          drawCallCount: 24,
          triangleCount: 384,
        },
        'full'
      )
    ).toBeNull();
    expect(
      getTileModelDrawCallRatioWarning(
        {
          drawCallCount: 10,
          triangleCount: 20,
        },
        'low'
      )
    ).toBeNull();
  });

  it('rejects models whose geometry uses too many separate draw ranges', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockDrawRangeGeometry(48, 0, 12)
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        maxGeometryDrawRangeCount: 1,
        invalidGeometryIndexTypeCount: 0,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'maxGeometryDrawRangeCount',
          actual: 1,
          limit: 0,
        },
      ],
    });
  });

  it('rejects models whose index array type cannot address the vertex count', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockIndexedGeometry(300, 900, Uint8Array)
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        invalidGeometryIndexTypeCount: 1,
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 0,
      }),
      violations: [
        {
          metric: 'invalidGeometryIndexTypeCount',
          actual: 1,
          limit: 0,
        },
      ],
    });
  });

  it('rejects ultra-dense geometry packed into a tiny visual area', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockPositionGeometry(
        createPackedTriangleStripPositions(270, 0.08),
        3
      )
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        invalidRenderBudgetPartMetadataCount: 0,
        ultraDenseTinyGeometryCount: 1,
      }),
      violations: [
        {
          metric: 'ultraDenseTinyGeometryCount',
          actual: 1,
          limit: 0,
        },
      ],
    });
  });

  it('disposes and rejects over-budget plugin models before they reach the scene', () => {
    const rootMaterial = createMockMaterial();
    const child = createMockObject3D(
      createMockMaterial(),
      [],
      createMockGeometry(9000)
    );
    const root = createMockObject3D(rootMaterial, [child], createMockGeometry(0));

    expect(acceptTilePluginModelForRenderBudget(root as never, 'low')).toBeNull();
  });

  it('rejects malformed render-budget part metadata so priorities stay explicit', () => {
    const root = createMockObject3D(
      createMockMaterial(),
      [],
      createMockStatGeometry('invalid-budget-part', 24),
      {
        renderBudgetPart: {
          optional: true,
        },
      }
    );

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual({
      accepted: false,
      limits: getTileModelHardLimits('low'),
      stats: expect.objectContaining({
        invalidRenderBudgetPartMetadataCount: 1,
      }),
      violations: [
        {
          metric: 'invalidRenderBudgetPartMetadataCount',
          actual: 1,
          limit: 0,
        },
      ],
    });
  });

  it('drops the lowest-priority optional model parts before rejecting a model', () => {
    const sharedMaterial = createMockMaterial();
    const sharedGeometry = createMockStatGeometry('shared-budget-prune', 24);
    const lowPriorityOptional = setRenderBudgetPartMetadata(
      createMockObject3D(
        sharedMaterial,
        [],
        sharedGeometry
      ),
      {
        optional: true,
        priority: 1,
        label: 'optional-low',
      }
    );
    const highPriorityOptional = setRenderBudgetPartMetadata(
      createMockObject3D(
        sharedMaterial,
        [],
        sharedGeometry
      ),
      {
        optional: true,
        priority: 10,
        label: 'optional-high',
      }
    );
    const root = createMockObject3D(undefined, [
      ...Array.from({ length: 15 }, (_unused, index) =>
        createMockObject3D(
          sharedMaterial,
          [],
          sharedGeometry,
          {
            requiredMeshIndex: index,
          }
        )
      ),
      lowPriorityOptional,
      highPriorityOptional,
    ]);

    expect(validateTileModelAgainstRenderBudget(root as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: false,
        violations: [
          {
            metric: 'meshCount',
            actual: 17,
            limit: 16,
          },
        ],
      })
    );

    const accepted = acceptTilePluginModelForRenderBudget(root as never, 'low');

    expect(accepted).toBe(root);
    expect(root.children).toHaveLength(16);
    expect(root.children.includes(lowPriorityOptional)).toBe(false);
    expect(root.children.includes(highPriorityOptional)).toBe(true);
  });

  it('reports which optional model parts were removed to satisfy the budget', () => {
    const sharedMaterial = createMockMaterial();
    const sharedGeometry = createMockStatGeometry('shared-budget-prune-report', 24);
    const lowPriorityOptional = setRenderBudgetPartMetadata(
      createMockObject3D(sharedMaterial, [], sharedGeometry),
      {
        optional: true,
        priority: 1,
        label: 'optional-low',
      }
    );
    const highPriorityOptional = setRenderBudgetPartMetadata(
      createMockObject3D(sharedMaterial, [], sharedGeometry),
      {
        optional: true,
        priority: 10,
        label: 'optional-high',
      }
    );
    const root = createMockObject3D(undefined, [
      ...Array.from({ length: 15 }, () =>
        createMockObject3D(sharedMaterial, [], sharedGeometry)
      ),
      lowPriorityOptional,
      highPriorityOptional,
    ]);

    expect(acceptTilePluginModelForRenderBudgetWithResult(root as never, 'low')).toEqual({
      model: root,
      removedParts: [
        {
          label: 'optional-low',
          priority: 1,
        },
      ],
    });
    expect(
      summarizeRemovedTileModelBudgetParts([
        { label: 'optional-low', priority: 1 },
        { priority: 4 },
      ])
    ).toBe('optional-low@1, unnamed@4');
  });

  it('accepts representative nearby world tile models at full detail', () => {
    const forestPlugin = createForestTilePlugin();
    const forestTile = forestPlugin.tiles?.find((entry) => entry.kind === 'forest');
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

    expect(validateTileModelAgainstRenderBudget(forestModel as never, 'full')).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
    expect(validateTileModelAgainstRenderBudget(townModel as never, 'full')).toEqual(
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

    expect(validateTileModelAgainstRenderBudget(lighthouseModel as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
  });

  it('accepts representative distant dungeon models at low detail', () => {
    const dungeonPlugin = createDungeonTilePlugin();
    const dungeonTile = dungeonPlugin.tiles?.find((entry) => entry.kind === 'dungeon');
    const state = createPluginRenderState();
    const dungeonModel = dungeonTile?.create3DModel?.({
      three: fakePluginThree as never,
      state,
      tile: { kind: 'dungeon' },
      tileX: 5,
      tileY: 4,
      detailLevel: 'low',
    });

    expect(validateTileModelAgainstRenderBudget(dungeonModel as never, 'low')).toEqual(
      expect.objectContaining({
        accepted: true,
        violations: [],
      })
    );
  });

  it('summarizes recent tile-model budget violations by plugin label', () => {
    const samples: Array<{
      nowMs: number;
      count: number;
      label: string;
    }> = [];

    recordRecentLabeledCountMetric(samples, {
      nowMs: 100,
      count: 1,
      label: 'tile-town',
    });
    recordRecentLabeledCountMetric(samples, {
      nowMs: 250,
      count: 2,
      label: 'tile-forest',
    });
    recordRecentLabeledCountMetric(samples, {
      nowMs: 400,
      count: 1,
      label: 'tile-town',
    });

    expect(getRecentLabeledCountStats(samples, 900)).toEqual({
      totalCount: 4,
      topCount: 2,
      topLabel: 'tile-forest',
      summary: 'tile-forest:2, tile-town:2',
    });
    expect(getRecentLabeledCountStats(samples, 1501)).toEqual({
      totalCount: 0,
      topCount: 0,
      topLabel: '',
      summary: '',
    });
  });

  it('records bounded recent debug events and filters them to the active window', () => {
    const events = [
      {
        nowMs: 100,
        type: 'lod-changed' as const,
        tileKey: '1:1',
        fromDetailLevel: 'full' as const,
        toDetailLevel: 'low' as const,
      },
    ];

    recordRenderDebugEvent(events, {
      nowMs: 200,
      type: 'plugin-exceeded-budget',
      tileKey: '2:1',
      plugin: 'tile-forest',
      summary: 'vertexCount 10000>8000',
    });
    recordRenderDebugEvent(events, {
      nowMs: 300,
      type: 'model-rejected',
      tileKey: '2:1',
      plugin: 'tile-forest',
      summary: 'vertexCount 10000>8000',
    });
    recordRenderDebugEvent(events, {
      nowMs: 320,
      type: 'plugin-performance-warning',
      tileKey: '2:1',
      plugin: 'tile-forest',
      summary: 'drawCallCount 24 for triangleCount 96 (4.0 triangles/draw call)',
    });

    expect(getRecentRenderDebugEvents(events, 350, { windowMs: 30000 })).toEqual(events);
    expect(getRecentRenderDebugEvents(events, 30150, { windowMs: 30000 })).toEqual([
      {
        nowMs: 200,
        type: 'plugin-exceeded-budget',
        tileKey: '2:1',
        plugin: 'tile-forest',
        summary: 'vertexCount 10000>8000',
      },
      {
        nowMs: 300,
        type: 'model-rejected',
        tileKey: '2:1',
        plugin: 'tile-forest',
        summary: 'vertexCount 10000>8000',
      },
      {
        nowMs: 320,
        type: 'plugin-performance-warning',
        tileKey: '2:1',
        plugin: 'tile-forest',
        summary: 'drawCallCount 24 for triangleCount 96 (4.0 triangles/draw call)',
      },
    ]);

    const bounded: Array<{
      nowMs: number;
      type: 'lod-changed';
    }> = [];
    recordRenderDebugEvent(bounded, { nowMs: 1, type: 'lod-changed' }, 2);
    recordRenderDebugEvent(bounded, { nowMs: 2, type: 'lod-changed' }, 2);
    recordRenderDebugEvent(bounded, { nowMs: 3, type: 'lod-changed' }, 2);
    expect(bounded).toEqual([
      { nowMs: 2, type: 'lod-changed' },
      { nowMs: 3, type: 'lod-changed' },
    ]);
  });

  it('rebuilds the pending world-build queue without visible or duplicate tile requests', () => {
    expect(
      buildPendingWorldBuildQueue(
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '2:0', x: 2, y: 0 },
          { key: '0:0', x: 0, y: 0 },
        ],
        new Set(['0:0'])
      )
    ).toEqual([
      { key: '1:0', x: 1, y: 0 },
      { key: '2:0', x: 2, y: 0 },
    ]);
  });

  it('cancels stale pending world-build entries when visibility priorities change', () => {
    expect(
      reconcilePendingWorldBuildQueue(
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '1:0', x: 1, y: 0 },
          { key: '2:0', x: 2, y: 0 },
        ],
        new Set(['0:0']),
        [
          { key: '0:0', x: 0, y: 0 },
          { key: '-4:0', x: -4, y: 0 },
          { key: '-3:1', x: -3, y: 1 },
          { key: '2:0', x: 2, y: 0 },
        ]
      )
    ).toEqual({
      queue: [
        { key: '1:0', x: 1, y: 0 },
        { key: '2:0', x: 2, y: 0 },
      ],
      cancelledEntryCount: 2,
    });
  });

  it('tracks recent tile build durations with rolling average and max stats', () => {
    const samples = [
      { nowMs: 100, durationMs: 2 },
      { nowMs: 450, durationMs: 4 },
    ];

    recordRecentDurationMetric(samples, { nowMs: 900, durationMs: 6 });
    expect(getRecentDurationStats(samples, 950)).toEqual({
      averageMs: 4,
      maxMs: 6,
    });

    expect(getRecentDurationStats(samples, 1405)).toEqual({
      averageMs: 5,
      maxMs: 6,
    });

    recordRecentDurationMetric(samples, { nowMs: 2405, durationMs: 3 });
    expect(samples).toEqual([{ nowMs: 2405, durationMs: 3 }]);
    expect(getRecentDurationStats(samples, 2600)).toEqual({
      averageMs: 3,
      maxMs: 3,
    });
  });

  it('tracks recent plugin tile build durations with the slowest plugin label', () => {
    const samples = [
      { nowMs: 100, durationMs: 2, label: 'tile-town' },
      { nowMs: 450, durationMs: 5, label: 'tile-forest' },
    ];

    recordRecentLabeledDurationMetric(samples, {
      nowMs: 900,
      durationMs: 4,
      label: 'tile-water',
    });
    expect(getRecentLabeledDurationStats(samples, 950)).toEqual({
      averageMs: 11 / 3,
      maxMs: 5,
      maxLabel: 'tile-forest',
    });

    expect(getRecentLabeledDurationStats(samples, 1405)).toEqual({
      averageMs: 4.5,
      maxMs: 5,
      maxLabel: 'tile-forest',
    });

    recordRecentLabeledDurationMetric(samples, {
      nowMs: 2405,
      durationMs: 3,
      label: 'tile-cave',
    });
    expect(samples).toEqual([{ nowMs: 2405, durationMs: 3, label: 'tile-cave' }]);
    expect(getRecentLabeledDurationStats(samples, 2600)).toEqual({
      averageMs: 3,
      maxMs: 3,
      maxLabel: 'tile-cave',
    });
  });

  it('summarizes the most common visible tile kinds for the debug overlay', () => {
    expect(
      summarizeVisibleTileKinds([
        { tile: { kind: 'forest' } },
        { tile: { kind: 'plains' } },
        { tile: { kind: 'forest' } },
        { tile: { kind: 'river' } },
        { tile: { kind: 'plains' } },
        { tile: { kind: 'forest' } },
      ])
    ).toBe('forest:3, plains:2, river:1');

    expect(summarizeVisibleTileKinds([], 4)).toBe('');
  });

  it('keeps shared source materials and uses render hooks for per-object distance fading', () => {
    const sourceMaterial = createMockMaterial();
    const childA = createMockObject3D(sourceMaterial);
    const childB = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [childA, childB]);

    prepareObjectForDistanceFade(root as never);
    applyObjectDistanceFade(root as never, 0.4);

    expect(sourceMaterial.clone).toHaveBeenCalledTimes(0);
    expect(childA.material).toBe(childB.material);
    expect(childA.material).toBe(sourceMaterial);
    childA.onBeforeRender?.();
    expect(sourceMaterial.opacity).toBeCloseTo(0.4, 6);
    expect(sourceMaterial.transparent).toBe(true);
    expect(sourceMaterial.depthWrite).toBe(false);
    childA.onAfterRender?.();
    expect(sourceMaterial.opacity).toBe(1);
    expect(sourceMaterial.transparent).toBe(false);
    expect(sourceMaterial.depthWrite).toBe(true);
    expect(collectSceneResourceStats(root as never).clonedMaterialCount).toBe(0);
  });

  it('freezes static transform subtrees while leaving dynamic responders and lights alone', () => {
    const staticLeaf = createMockObject3D(
      createMockMaterial(),
      [],
      createMockGeometry(4),
      {},
      'Mesh',
      false,
      false,
      true,
      true
    );
    const dynamicLeaf = createMockObject3D(
      createMockMaterial(),
      [],
      createMockGeometry(6),
      {
        poiWindResponder: {
          axis: 'z',
        },
      },
      'Mesh',
      false,
      false,
      true,
      true
    );
    const lightNode = createMockObject3D(
      undefined,
      [],
      undefined,
      {},
      'PointLight',
      true,
      false,
      true,
      true
    );
    const root = createMockObject3D(
      undefined,
      [staticLeaf, dynamicLeaf, lightNode],
      undefined,
      {},
      'Group',
      false,
      false,
      true,
      true
    );

    freezeStaticObjectTransforms(root as never);

    expect(root.matrixAutoUpdate).toBe(false);
    expect(staticLeaf.matrixAutoUpdate).toBe(false);
    expect(dynamicLeaf.matrixAutoUpdate).toBe(true);
    expect(lightNode.matrixAutoUpdate).toBe(true);
    expect(root.updateMatrix).toHaveBeenCalledTimes(1);
    expect(staticLeaf.updateMatrix).toHaveBeenCalledTimes(1);
    expect(dynamicLeaf.updateMatrix).not.toHaveBeenCalled();
    expect(lightNode.updateMatrix).not.toHaveBeenCalled();
  });

  it('freezes lighthouse beam meshes while keeping the animated sweep pivot dynamic', () => {
    const beamMesh = createMockObject3D(
      createMockMaterial(),
      [],
      createMockGeometry(6),
      {
        lighthouseBeam: true,
      },
      'Mesh',
      false,
      false,
      true,
      true
    );
    const beamPivot = createMockObject3D(
      undefined,
      [beamMesh],
      undefined,
      {
        lighthouseBeamPivot: true,
      },
      'Group',
      false,
      false,
      true,
      true
    );
    const root = createMockObject3D(
      undefined,
      [beamPivot],
      undefined,
      {},
      'Group',
      false,
      false,
      true,
      true
    );

    freezeStaticObjectTransforms(root as never);

    expect(root.matrixAutoUpdate).toBe(false);
    expect(beamPivot.matrixAutoUpdate).toBe(true);
    expect(beamMesh.matrixAutoUpdate).toBe(false);
    expect(root.updateMatrix).toHaveBeenCalledTimes(1);
    expect(beamPivot.updateMatrix).not.toHaveBeenCalled();
    expect(beamMesh.updateMatrix).toHaveBeenCalledTimes(1);
  });

  it('applies distance fade opacity to prepared materials without dropping baseline flags', () => {
    const sourceMaterial = createMockMaterial({
      opacity: 0.6,
      transparent: false,
      depthWrite: true,
    });
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);

    prepareObjectForDistanceFade(root as never);
    applyObjectDistanceFade(root as never, 0.5);

    expect(child.visible).toBe(true);
    expect(child.material.opacity).toBeCloseTo(0.3, 6);
    expect(child.material.transparent).toBe(true);
    expect(child.material.depthWrite).toBe(false);
  });

  it('reuses cached fade target traversal when applying opacity updates', () => {
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);
    const originalTraverse = root.traverse;
    root.traverse = vi.fn((callback) => originalTraverse(callback));

    prepareObjectForDistanceFade(root as never);
    applyObjectDistanceFade(root as never, 0.5);
    applyObjectDistanceFade(root as never, 0.25);

    expect(root.traverse).toHaveBeenCalledTimes(1);
  });

  it('skips far-land fade traversal when a tile opacity is unchanged', () => {
    const sourceMaterial = createMockMaterial();
    const child = createMockObject3D(sourceMaterial);
    const root = createMockObject3D(undefined, [child]);
    const originalTraverse = root.traverse;
    root.traverse = vi.fn((callback) => originalTraverse(callback));

    prepareObjectForDistanceFade(root as never);
    root.traverse.mockClear();

    updateFarLandModelVisibility(
      [
        {
          key: '0:0',
          tile: { kind: 'plains' },
          tileX: 0,
          tileY: 0,
          drawCallCount: 1,
          visibleObjectCount: 1,
          visibleMeshCount: 1,
          materialCount: 1,
          node: {} as never,
          model: root as never,
          modelRoot: root as never,
          modelVisibilityOpacity: 1,
          distanceFadeEligible: true,
        },
      ],
      {
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
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      } as never
    );

    expect(root.traverse).not.toHaveBeenCalled();
  });

  it('clamps camera pitch to a playable range', () => {
    expect(clampCameraPitch(DEFAULT_CAMERA_PITCH)).toBe(DEFAULT_CAMERA_PITCH);
    expect(clampCameraPitch(-5)).toBe(-1.1);
    expect(clampCameraPitch(5)).toBe(0.85);
  });

  it('keeps nearby tiles visible regardless of facing', () => {
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: -3,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(true);
  });

  it('culls far tiles that are strongly behind the player', () => {
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: -12,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(false);
    expect(
      shouldRenderWorldTile({
        playerTileX: 0,
        playerTileY: 0,
        tileX: 12,
        tileY: 0,
        facingAngle: 0,
      })
    ).toBe(true);
  });

  it('uses facing buckets so tiny turns do not thrash world sync', () => {
    expect(getFacingVisibilityBucket(0)).toBe(getFacingVisibilityBucket(0.1));
    expect(getFacingVisibilityBucket(0)).not.toBe(
      getFacingVisibilityBucket(Math.PI / 2)
    );
  });

  it('prioritizes nearby and forward-facing tiles in the incremental build order', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 4,
    });
    const firstKeys = buildOrder.slice(0, 6).map((entry) => entry.key);
    const frontIndex = buildOrder.findIndex((entry) => entry.key === '4:0');
    const rearIndex = buildOrder.findIndex((entry) => entry.key === '-4:0');

    expect(firstKeys).toContain('0:0');
    expect(firstKeys).toContain('1:0');
    expect(frontIndex).toBeGreaterThanOrEqual(0);
    expect(rearIndex).toBeGreaterThan(frontIndex);
  });

  it('builds visible near tiles before farther ones and prefers forward tiles over side tiles at equal distance', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 8,
    });

    const nearFrontIndex = buildOrder.findIndex((entry) => entry.key === '2:0');
    const farFrontIndex = buildOrder.findIndex((entry) => entry.key === '6:0');
    const sideIndex = buildOrder.findIndex((entry) => entry.key === '0:2');

    expect(nearFrontIndex).toBeGreaterThanOrEqual(0);
    expect(farFrontIndex).toBeGreaterThan(nearFrontIndex);
    expect(sideIndex).toBeGreaterThan(nearFrontIndex);
  });

  it('omits far rear tiles from the build order when they fall outside the forward visibility cone', () => {
    const buildOrder = getVisibleWorldTileBuildOrder({
      playerTileX: 0,
      playerTileY: 0,
      facingAngle: 0,
      chunkRadius: 12,
    });

    expect(buildOrder.some((entry) => entry.key === '-12:0')).toBe(false);
    expect(buildOrder.some((entry) => entry.key === '12:0')).toBe(true);
  });

  it('keeps nearby land models fully visible and thins far ones deterministically', () => {
    expect(getFarLandModelOpacity(6, 12, 4)).toBe(1);
    expect(
      getFarLandModelOpacity(12.5, 12, 4, {
        fullVisibilityDistance: 8,
        revealDistanceVariance: 8,
        fadeDistance: 2,
        sample: () => 0,
      })
    ).toBe(0);
    expect(
      getFarLandModelOpacity(9, 12, 4, {
        fullVisibilityDistance: 8,
        revealDistanceVariance: 8,
        fadeDistance: 2,
        sample: () => 0,
      })
    ).toBe(0.5);
  });

  it('switches to low-detail models beyond the lod distance', () => {
    expect(getTileModelDetailLevel(3)).toBe('full');
    expect(getTileModelDetailLevel(6.49)).toBe('full');
    expect(getTileModelDetailLevel(6.5)).toBe('low');
    expect(getTileModelDetailLevel(10)).toBe('low');
  });

  it('keeps landmark and route-terminal tiles in full detail farther out', () => {
    expect(shouldKeepTileModelFullDetailLonger({ kind: 'sign' })).toBe(true);
    expect(shouldKeepTileModelFullDetailLonger({ kind: 'lighthouse' })).toBe(true);
    expect(shouldKeepTileModelFullDetailLonger({ kind: 'plains' })).toBe(false);
    expect(getTileModelLowDetailDistance({ kind: 'sign' })).toBe(13.5);
    expect(getTileModelDetailLevel(13, { kind: 'sign' })).toBe('full');
    expect(getTileModelDetailLevel(13.5, { kind: 'sign' })).toBe('low');
    expect(getTileModelDetailLevel(10, { kind: 'plains' })).toBe('low');
  });

  it('describes the current lod threshold policy in one place', () => {
    expect(getLodThresholdSummary()).toEqual({
      lowDetailDistance: 6.5,
      lowDetailEnterDistance: 6.5,
      lowDetailExitDistance: 6,
      hysteresisDistance: 0.5,
      pendingBuildFullDetailDistance: 3,
      syncMovementDistance: 0.18,
    });
  });

  it('switches to low-detail models beyond the lod distance using squared distance thresholds', () => {
    expect(getTileModelDetailLevelFromSquaredDistance(9)).toBe('full');
    expect(getTileModelDetailLevelFromSquaredDistance(42.24)).toBe('full');
    expect(getTileModelDetailLevelFromSquaredDistance(42.25)).toBe('low');
    expect(getTileModelDetailLevelFromSquaredDistance(100)).toBe('low');
    expect(getTileModelDetailLevelFromSquaredDistance(100, { kind: 'tower' })).toBe('full');
    expect(getTileModelDetailLevelFromSquaredDistance(182.24, { kind: 'tower' })).toBe('full');
    expect(getTileModelDetailLevelFromSquaredDistance(182.25, { kind: 'tower' })).toBe('low');
  });

  it('uses hysteresis to avoid lod thrash near the boundary', () => {
    expect(getTileModelDetailLevelWithHysteresis('full', 42.25)).toBe('low');
    expect(getTileModelDetailLevelWithHysteresis('full', 40)).toBe('full');
    expect(getTileModelDetailLevelWithHysteresis('low', 40)).toBe('low');
    expect(getTileModelDetailLevelWithHysteresis('low', 35.99)).toBe('full');
    expect(getTileModelDetailLevelWithHysteresis(undefined, 42.25)).toBe('low');
    expect(getTileModelDetailLevelWithHysteresis('full', 100, { kind: 'cave' })).toBe(
      'full'
    );
    expect(getTileModelDetailLevelWithHysteresis('low', 169.01, { kind: 'cave' })).toBe(
      'low'
    );
  });

  it('skips obviously distant low-detail chunks during lod reevaluation', () => {
    expect(shouldEvaluateTileModelDetailLevel('full', 100)).toBe(true);
    expect(shouldEvaluateTileModelDetailLevel(undefined, 100)).toBe(true);
    expect(shouldEvaluateTileModelDetailLevel('low', 100)).toBe(false);
    expect(shouldEvaluateTileModelDetailLevel('low', 36)).toBe(true);
  });

  it('uses low detail for non-near pending builds while the queue is still draining', () => {
    expect(getPendingWorldBuildDetailLevel('low', 4, 10)).toBe('low');
    expect(getPendingWorldBuildDetailLevel('full', 2, 10)).toBe('full');
    expect(getPendingWorldBuildDetailLevel('full', 4, 10)).toBe('full');
    expect(getPendingWorldBuildDetailLevel('full', 16, 10)).toBe('full');
    expect(getPendingWorldBuildDetailLevel('full', 16, 40)).toBe('low');
    expect(getPendingWorldBuildDetailLevel('full', 16, 0)).toBe('full');
    expect(getPendingWorldBuildDetailLevel('full', 64, 40, { kind: 'dungeon' })).toBe(
      'full'
    );
  });

  it('lets pending world builds stop immediately when the shared frame budget is already exhausted', () => {
    expect(
      shouldProcessPendingWorldBuildEntry(100, 100, 0, {
        pendingBuildBudgetMs: 0,
        maxPendingBuildTiles: 4,
        minimumEntriesPerFlush: 0,
      })
    ).toBe(false);
  });

  it('only rechecks tile lod after meaningful movement', () => {
    expect(shouldSyncTileModelDetailLevels(null, 0, 0)).toBe(true);
    expect(shouldSyncTileModelDetailLevels({ x: 0, y: 0 }, 0.05, 0.05)).toBe(false);
    expect(shouldSyncTileModelDetailLevels({ x: 0, y: 0 }, 0.18, 0)).toBe(true);
  });

  it('only resyncs world curvature when the player moves or visible tiles change', () => {
    expect(shouldSyncWorldCurvature(null, 0, 0, -1, 0)).toBe(true);
    expect(shouldSyncWorldCurvature({ x: 2, y: 3 }, 2, 3, 4, 4)).toBe(false);
    expect(shouldSyncWorldCurvature({ x: 2, y: 3 }, 2.01, 3, 4, 4)).toBe(true);
    expect(shouldSyncWorldCurvature({ x: 2, y: 3 }, 2, 3, 4, 5)).toBe(true);
  });

  it('buckets wrapped LOD batches across frames without starving later entries', () => {
    expect(getWrappedBatchWindow(['a', 'b', 'c', 'd'], 0, 2)).toEqual({
      items: ['a', 'b'],
      nextIndex: 2,
    });
    expect(getWrappedBatchWindow(['a', 'b', 'c', 'd'], 3, 3)).toEqual({
      items: ['d', 'a', 'b'],
      nextIndex: 2,
    });
    expect(getWrappedBatchWindow(['a', 'b'], 0, 0)).toEqual({
      items: [],
      nextIndex: 0,
    });
  });

  it('keeps nearby terrain flat while bending the far horizon downward', () => {
    expect(getWorldCurvatureOffset(0)).toBe(0);
    expect(getWorldCurvatureOffset(4)).toBe(0);
    expect(getWorldCurvatureOffset(11)).toBeLessThan(0);
    expect(getWorldCurvatureOffset(18)).toBeCloseTo(-1.2, 6);
    expect(getWorldCurvatureOffset(24)).toBeCloseTo(-1.2, 6);
  });

  it('uses coarse sky signatures so tiny celestial drift does not rebuild sky layers', () => {
    const baseCycle: SkySignatureCycle = {
      activeConstellationIndex: 1,
      daylight: 0.5,
      moonAltitude: 0.22,
      moonAzimuth: 0.48,
      moonIllumination: 0.64,
      night: 0.3,
      observerLatitudeDegrees: 32,
      solarEclipse: null,
      sunAltitude: 0.54,
      sunAzimuth: 1.12,
      twilight: 0.16,
      yearProgress: 0.25,
      starsOpacity: 0.5,
      milkyWay: {
        azimuthOffset: 0.8,
        inclination: 1.1,
        width: 0.25,
        opacity: 0.12,
      },
      auroraBands: [
        {
          id: 'aurora-a',
          azimuthCenter: -1.2,
          altitude: 0.3,
          height: 0.4,
          intensity: 0.7,
          wavePhase: 0.2,
          span: 0.6,
          colorA: '#9df2ff',
          colorB: '#7cf7c5',
        },
      ],
      visibleEvents: [
        {
          type: 'meteor-shower',
          name: 'Burst',
          progress: 0.4,
          azimuth: 0.4,
          altitude: 0.5,
          visibility: 0.9,
          intensity: 0.8,
          trailLength: 3.6,
          color: '#ffffff',
          size: 0.2,
        },
      ],
    };
    const nearCycle: SkySignatureCycle = {
      ...baseCycle,
      yearProgress: 0.2501,
      milkyWay: {
        ...baseCycle.milkyWay,
        azimuthOffset: 0.801,
      },
      auroraBands: [
        {
          ...baseCycle.auroraBands[0],
          wavePhase: 0.21,
        },
      ],
      visibleEvents: [
        {
          ...baseCycle.visibleEvents[0],
          azimuth: 0.401,
        },
      ],
    };
    const farCycle: SkySignatureCycle = {
      ...baseCycle,
      yearProgress: 0.31,
      visibleEvents: [
        {
          ...baseCycle.visibleEvents[0],
          azimuth: 0.7,
        },
      ],
    };

    expect(getSkyConstellationSignature(nearCycle)).toBe(
      getSkyConstellationSignature(baseCycle)
    );
    expect(getSkyEventSignature(nearCycle)).toBe(getSkyEventSignature(baseCycle));
    expect(getSkyMilkyWaySignature(nearCycle)).toBe(
      getSkyMilkyWaySignature(baseCycle)
    );
    expect(getSkyAuroraSignature(nearCycle)).toBe(
      getSkyAuroraSignature(baseCycle)
    );
    expect(getSkyConstellationSignature(farCycle)).not.toBe(
      getSkyConstellationSignature(baseCycle)
    );
    expect(getSkyEventSignature(farCycle)).not.toBe(getSkyEventSignature(baseCycle));
  });

  it('uses a coarse sky-position signature so tiny celestial drift does not recompute sky poses', () => {
    const baseCycle: SkySignatureCycle = {
      activeConstellationIndex: 1,
      daylight: 0.62,
      moonAltitude: 0.18,
      moonAzimuth: 0.42,
      moonIllumination: 0.7,
      night: 0.24,
      observerLatitudeDegrees: 34,
      solarEclipse: {
        active: false,
        coverage: 0,
        daylightReduction: 0,
        moonAltitude: 0.18,
        moonAzimuth: 0.42,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        totality: 0,
      },
      starsOpacity: 0.5,
      sunAltitude: 0.58,
      sunAzimuth: 1.2,
      twilight: 0.18,
      yearProgress: 0.25,
      milkyWay: null,
      auroraBands: [],
      visibleEvents: [],
    };
    const nearCycle: SkySignatureCycle = {
      ...baseCycle,
      sunAzimuth: 1.201,
      moonAltitude: 0.181,
      yearProgress: 0.2502,
    };
    const farCycle: SkySignatureCycle = {
      ...baseCycle,
      sunAzimuth: 1.4,
      moonAltitude: 0.36,
      solarEclipse: {
        ...baseCycle.solarEclipse!,
        active: true,
        coverage: 0.5,
        moonAzimuth: 0.7,
      },
    };

    expect(getSkyPositionSignature(nearCycle, 0.84)).toBe(
      getSkyPositionSignature(baseCycle, 0.84)
    );
    expect(getSkyPositionSignature(baseCycle, 0.9)).not.toBe(
      getSkyPositionSignature(baseCycle, 0.84)
    );
    expect(getSkyPositionSignature(farCycle, 0.84)).not.toBe(
      getSkyPositionSignature(baseCycle, 0.84)
    );
  });

  it('selects distinct dawn and dusk twilight palettes by time of day', () => {
    expect(
      getTwilightSkyPalette(
        {
          dawnColor: '#dawn',
          duskColor: '#dusk',
          sunsetColor: '#fallback',
          fogDawnColor: '#fog-dawn',
          fogDuskColor: '#fog-dusk',
          fogDayColor: '#fog-day',
        },
        { dayProgress: 0.2 }
      )
    ).toEqual({
      skyColor: '#dawn',
      fogColor: '#fog-dawn',
    });

    expect(
      getTwilightSkyPalette(
        {
          dawnColor: '#dawn',
          duskColor: '#dusk',
          sunsetColor: '#fallback',
          fogDawnColor: '#fog-dawn',
          fogDuskColor: '#fog-dusk',
          fogDayColor: '#fog-day',
        },
        { dayProgress: 0.8 }
      )
    ).toEqual({
      skyColor: '#dusk',
      fogColor: '#fog-dusk',
    });
  });

  it('tightens fog range when weather visibility drops', () => {
    expect(getWeatherFogRange(0.9).far).toBeGreaterThan(getWeatherFogRange(0.3).far);
    expect(getWeatherFogRange(0.9).near).toBeGreaterThan(getWeatherFogRange(0.3).near);
  });

  it('falls back to decorated tile surface height when no explicit profile is provided', () => {
    expect(getDecoratedTileSurfaceHeight({ surfaceHeight: 0.24 })).toBeCloseTo(0.24, 6);
    expect(getDecoratedTileSurfaceHeight({})).toBe(0);
  });

  it('prefers sea and channel boundaries without sorting transient arrays', () => {
    const bank = { boundaryRole: null, surfaceHeight: 0.2 };
    const sea = { boundaryRole: 'sea' as const, surfaceHeight: 0 };
    const crossing = { boundaryRole: 'crossing' as const, surfaceHeight: 0.1 };

    expect(getBoundaryPriority(sea.boundaryRole)).toBeLessThan(
      getBoundaryPriority(crossing.boundaryRole)
    );
    expect(getBoundaryPriority(crossing.boundaryRole)).toBeLessThan(
      getBoundaryPriority(bank.boundaryRole)
    );
    expect(
      pickCornerBoundaryProfile([bank, null, crossing, sea])
    ).toEqual(sea);
  });

  it('syncs dynamic visible tile nodes through tile plugin hooks from any iterable', () => {
    const calls: Array<{
      tileX: number;
      tileY: number;
      night: number;
      environmentId: string | undefined;
    }> = [];
    const entries = new Map([
      [
        '4:5',
        {
          key: '4:5',
          tile: { kind: 'town' },
          tileX: 4,
          tileY: 5,
          drawCallCount: 3,
          visibleObjectCount: 2,
          visibleMeshCount: 2,
          materialCount: 2,
          node: {} as never,
          model: { id: 'model-town' },
          sync3DModel({ tileX, tileY, cycle, environment }) {
            calls.push({
              tileX,
              tileY,
              night: cycle.night,
              environmentId: environment.sky?.nightColor,
            });
          },
        },
      ],
    ]).values();
    syncDynamicTileNodes(
      entries,
      {
        three: {} as never,
        state: {
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
              color: '#000000',
              miniColor: '#111111',
              walkable: true,
              wallHeight: 0,
            };
          },
        },
        cycle: {
          daylight: 0,
          twilight: 0.2,
          night: 0.8,
        },
        environment: {
          sky: {
            nightColor: '#06111f',
          },
        },
      }
    );

    expect(calls).toEqual([
      {
        tileX: 4,
        tileY: 5,
        night: 0.8,
        environmentId: '#06111f',
      },
    ]);
  });

  it('skips dynamic sync work for land models that are fully hidden by distance thinning', () => {
    let calls = 0;
    syncDynamicTileNodes(
      [
        {
          key: '20:2',
          tile: { kind: 'forest' },
          tileX: 20,
          tileY: 2,
          drawCallCount: 2,
          visibleObjectCount: 1,
          visibleMeshCount: 1,
          materialCount: 1,
          node: {} as never,
          model: { id: 'model-forest' },
          modelRoot: null,
          modelVisibilityOpacity: 0,
          distanceFadeEligible: true,
          sync3DModel() {
            calls += 1;
          },
        },
      ],
      {
        three: {} as never,
        state: {
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
              color: '#000000',
              miniColor: '#111111',
              walkable: true,
              wallHeight: 0,
            };
          },
        },
        cycle: {
          daylight: 0,
          twilight: 0.2,
          night: 0.8,
        },
        environment: {},
      }
    );

    expect(calls).toBe(0);
  });
});

function createMockMaterial(
  overrides: Partial<{
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
    alphaTest: number;
    side: number;
  }> &
    Record<string, unknown> = {}
) {
  const clone = {
    opacity: overrides.opacity ?? 1,
    transparent: overrides.transparent ?? false,
    depthWrite: overrides.depthWrite ?? true,
    alphaTest: overrides.alphaTest ?? 0,
    side: overrides.side ?? 0,
    userData: {},
    dispose: vi.fn(),
  };
  return {
    opacity: overrides.opacity ?? 1,
    transparent: overrides.transparent ?? false,
    depthWrite: overrides.depthWrite ?? true,
    alphaTest: overrides.alphaTest ?? 0,
    side: overrides.side ?? 0,
    userData: {},
    ...overrides,
    clone: vi.fn(() => ({ ...clone, userData: {} })),
    dispose: vi.fn(),
  };
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

function createMockTexture(width: number, height: number, generateMipmaps = true) {
  return {
    image: { width, height },
    generateMipmaps,
  };
}

function createMockGeometry(vertexCount = 0) {
  return {
    attributes:
      vertexCount > 0
        ? {
            position: {
              count: vertexCount,
              array: new Float32Array(vertexCount * 3),
            },
          }
        : undefined,
    userData: {},
    dispose: vi.fn(),
  };
}

function createMockStatGeometry(id: string, vertexCount: number) {
  return {
    id,
    attributes: {
      position: {
        count: vertexCount,
        array: new Float32Array(vertexCount * 3),
      },
    },
  };
}

function createMockPositionGeometry(values: number[], itemSize = 3) {
  return {
    attributes: {
      position: {
        count: values.length / itemSize,
        itemSize,
        array: new Float32Array(values),
      },
    },
  };
}

function createPackedTriangleStripPositions(
  triangleCount: number,
  maximumAxisSpan: number
) {
  const values: number[] = [];
  const step = maximumAxisSpan / Math.max(1, triangleCount);
  for (let index = 0; index < triangleCount; index += 1) {
    const x = index * step;
    values.push(
      x,
      0,
      0,
      x + step * 0.4,
      maximumAxisSpan * 0.3,
      0,
      x + step * 0.8,
      maximumAxisSpan * 0.6,
      maximumAxisSpan * 0.1
    );
  }
  return values;
}

function createMockIndexedGeometry(
  vertexCount: number,
  indexCount: number,
  IndexArray: typeof Uint32Array | typeof Uint16Array | typeof Uint8Array = Uint32Array
) {
  return {
    attributes: {
      position: {
        count: vertexCount,
        itemSize: 3,
        array: new Float32Array(vertexCount * 3),
      },
    },
    index: {
      count: indexCount,
      array: new IndexArray(indexCount),
    },
  };
}

function createMockRichAttributeGeometry(
  vertexCount: number,
  extraAttributes: Record<string, number>
) {
  const attributes: Record<string, { count: number; itemSize: number; array: Float32Array }> =
    {
      position: {
        count: vertexCount,
        itemSize: 3,
        array: new Float32Array(vertexCount * 3),
      },
    };
  for (const [name, itemSize] of Object.entries(extraAttributes)) {
    attributes[name] = {
      count: vertexCount,
      itemSize,
      array: new Float32Array(vertexCount * itemSize),
    };
  }
  return { attributes };
}

function createMockGroupedGeometry(vertexCount: number, groupCount: number) {
  return {
    attributes: {
      position: {
        count: vertexCount,
        itemSize: 3,
        array: new Float32Array(vertexCount * 3),
      },
    },
    groups: Array.from({ length: groupCount }, (_unused, index) => ({
      start: index * 3,
      count: 3,
      materialIndex: index,
    })),
  };
}

function createMockDrawRangeGeometry(vertexCount: number, start: number, count: number) {
  return {
    attributes: {
      position: {
        count: vertexCount,
        itemSize: 3,
        array: new Float32Array(vertexCount * 3),
      },
    },
    drawRange: {
      start,
      count,
    },
  };
}

function createMockObject3D(
  material?: unknown,
  children: Array<{
    traverse: (callback: (child: unknown) => void) => void;
  }> = [],
  geometry?: unknown,
  userData: Record<string, unknown> = {},
  type = geometry ? 'Mesh' : 'Group',
  isLight = false,
  castShadow = false,
  visible = true,
  matrixAutoUpdate = false
) {
  const node = {
    visible,
    type,
    isLight,
    castShadow,
    matrixAutoUpdate,
    updateMatrix: vi.fn(),
    userData,
    material,
    geometry,
    children,
    traverse(callback: (child: typeof node) => void) {
      callback(node);
      for (const child of children) {
        child.traverse(callback as never);
      }
    },
  };
  return node;
}
