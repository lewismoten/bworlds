import { hash2D, registerHashLabel } from '@bworlds/core';
import { createBoundedCache } from '@bworlds/cache-support';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createAnchoredEnterablePoiTilePlugin,
  getPoiLightActivation,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import {
  createHostMaterialResolver,
  createRegionalMaterialResolver,
} from '@bworlds/procedural-style';
import {
  getSharedBoxGeometry,
  getSharedConeGeometry,
  getSharedCylinderGeometry,
  getSharedSphereGeometry,
} from '@bworlds/three-support';
import { createLowDetailLighthouseModel } from './low-detail.ts';
import { getLighthouseBeamWeatherProfile } from './weather-response.ts';
import type {
  Create3DModelContext,
  Create3DModelProgress,
  Model3DResourceCostEstimate,
  RuntimePlugin,
  ThreeMaterialLike,
  ThreeMatrix4Like,
  ThreeObject3DLike,
  WorldEnvironmentLike,
} from '@bworlds/plugin-api';
import {
  markOptionalDecorativeRenderBudgetPart,
  markStructuralRenderBudgetPart,
  RENDER_BUDGET_PART_PRIORITIES,
} from '@bworlds/plugin-api';

const LIGHTHOUSE_BEAM_PIVOT_KEY = 'lighthouseBeamPivot';
const LIGHTHOUSE_BEAM_KEY = 'lighthouseBeam';
const LIGHTHOUSE_LENS_KEY = 'lighthouseLens';
const LIGHTHOUSE_GLASS_KEY = 'lighthouseGlass';
const LIGHTHOUSE_FRAME_KEY = 'lighthouseFrame';
const LIGHTHOUSE_FRAME_RING_INSTANCED_KEY = 'lighthouseFrameRingInstanced';
const LIGHTHOUSE_BALCONY_KEY = 'lighthouseBalcony';
const LIGHTHOUSE_BALCONY_RAIL_KEY = 'lighthouseBalconyRail';
const LIGHTHOUSE_WALL_GLOW_KEY = 'lighthouseWallGlow';
const LIGHTHOUSE_FRAME_POST_INSTANCED_KEY = 'lighthouseFramePostInstanced';
const LIGHTHOUSE_BALCONY_RAIL_POST_INSTANCED_KEY =
  'lighthouseBalconyRailPostInstanced';
const LIGHTHOUSE_PANE_INSTANCED_KEY = 'lighthousePaneInstanced';
const LIGHTHOUSE_WALL_GLOW_INSTANCED_KEY = 'lighthouseWallGlowInstanced';
const LIGHTHOUSE_REGION_SIZE = 18;
export const LIGHTHOUSE_STYLE_CACHE_MAX_ENTRIES = 96;
const LIGHTHOUSE_BEAM_COLOR_SEED = registerHashLabel('lighthouse-beam-color');
const LIGHTHOUSE_PANE_COLOR_SEED = registerHashLabel('lighthouse-pane-color');
const LIGHTHOUSE_ROTATION_SPEED_SEED = registerHashLabel(
  'lighthouse-rotation-speed'
);
const LIGHTHOUSE_ROTATION_DIRECTION_SEED = registerHashLabel(
  'lighthouse-rotation-direction'
);
const LIGHTHOUSE_BEAM_START_OFFSET = 0.14;
const LIGHTHOUSE_BEAM_SEGMENTS = [
  {
    key: 'near',
    radius: 0.1,
    length: 1.1,
    opacity: 0.24,
    emissiveIntensity: 1.2,
  },
  {
    key: 'mid',
    radius: 0.19,
    length: 1.22,
    opacity: 0.16,
    emissiveIntensity: 0.9,
  },
  {
    key: 'far',
    radius: 0.32,
    length: 1.48,
    opacity: 0.08,
    emissiveIntensity: 0.58,
  },
] as const;
const LIGHTHOUSE_LOW_DETAIL_BEAM_SEGMENTS = [
  { radius: 0.14, length: 1.24, opacity: 0.2, emissiveIntensity: 0.92 },
  { radius: 0.24, length: 1.5, opacity: 0.1, emissiveIntensity: 0.58 },
] as const;
const LIGHTHOUSE_FULL_DETAIL_COST_ESTIMATE: Model3DResourceCostEstimate = {
  object3dCount: 21,
  groupCount: 1,
  meshCount: 19,
  geometryCount: 19,
  materialCount: 9,
  lightCount: 1,
  shadowLightCount: 0,
  vertexCount: 720,
  triangleCount: 240,
};
const LIGHTHOUSE_LOW_DETAIL_COST_ESTIMATE: Model3DResourceCostEstimate = {
  object3dCount: 6,
  groupCount: 1,
  meshCount: 6,
  geometryCount: 6,
  materialCount: 3,
  lightCount: 0,
  shadowLightCount: 0,
  vertexCount: 144,
  triangleCount: 48,
};
const lighthouseStyleCache = createBoundedCache<
  string,
  {
    createMaterials(
      three: Create3DModelContext['three']
    ): LighthouseStyleMaterials;
  }
>(LIGHTHOUSE_STYLE_CACHE_MAX_ENTRIES);
const lighthouseAppearanceCache = createBoundedCache<
  string,
  {
    createMaterials(
      three: Create3DModelContext['three']
    ): LighthouseAppearanceMaterials;
  }
>(LIGHTHOUSE_STYLE_CACHE_MAX_ENTRIES);

type BeamMaterialLike = ThreeMaterialLike & {
  opacity?: number;
  emissiveIntensity?: number;
};
type BeamNodeLike = ThreeObject3DLike & {
  material?: BeamMaterialLike | BeamMaterialLike[];
  castShadow?: boolean;
  receiveShadow?: boolean;
};
type LighthouseStyleMaterials = {
  wallMaterial: ThreeMaterialLike;
  stripeMaterial: ThreeMaterialLike;
  stoneMaterial: ThreeMaterialLike;
  paneMaterial: ThreeMaterialLike;
  glassMaterial: ThreeMaterialLike;
  frameMaterial: ThreeMaterialLike;
  lensMaterial: ThreeMaterialLike;
  balconyMaterial: ThreeMaterialLike;
  wallGlowMaterial: ThreeMaterialLike;
  beamColor: string;
  rotationDurationMs: number;
  rotationDirection: 1 | -1;
  beamMaterials: Record<
    (typeof LIGHTHOUSE_BEAM_SEGMENTS)[number]['key'],
    ThreeMaterialLike
  >;
};

type LighthouseAppearanceMaterials = Omit<
  LighthouseStyleMaterials,
  'rotationDurationMs' | 'rotationDirection'
>;

const resolveRegionalLighthouseStyle = createRegionalMaterialResolver(
  lighthouseStyleCache,
  LIGHTHOUSE_REGION_SIZE,
  ({ regionX, regionY }) => {
    const beamColor = pickLighthouseBeamColor(
      hash2D(LIGHTHOUSE_BEAM_COLOR_SEED, regionX, regionY)
    );
    const paneColor = pickLighthousePaneColor(
      hash2D(LIGHTHOUSE_PANE_COLOR_SEED, regionX, regionY),
      beamColor
    );
    const rotationDurationMs =
      1800 +
      Math.round(
        hash2D(LIGHTHOUSE_ROTATION_SPEED_SEED, regionX, regionY) * 1800
      );
    const rotationDirection =
      hash2D(LIGHTHOUSE_ROTATION_DIRECTION_SEED, regionX, regionY) >= 0.5
        ? 1
        : -1;
    const appearanceKey = `${beamColor}:${paneColor}`;

    return {
      createMaterials(
        three: Create3DModelContext['three']
      ): LighthouseStyleMaterials {
        const appearance = lighthouseAppearanceCache
          .getOrCreate(appearanceKey, () =>
            createHostMaterialResolver(
              (
                host: Create3DModelContext['three']
              ): LighthouseAppearanceMaterials => ({
                wallMaterial: new host.MeshStandardMaterial({
                  color: '#f7f0e1',
                  roughness: 0.88,
                  metalness: 0.02,
                }),
                stripeMaterial: new host.MeshStandardMaterial({
                  color: '#c2410c',
                  roughness: 0.82,
                  metalness: 0.02,
                }),
                stoneMaterial: new host.MeshStandardMaterial({
                  color: '#9aa4b2',
                  roughness: 0.96,
                  metalness: 0.02,
                }),
                paneMaterial: new host.MeshStandardMaterial({
                  color: paneColor,
                  emissive: paneColor,
                  emissiveIntensity: 0.08,
                  roughness: 0.3,
                  metalness: 0.02,
                  side: host.DoubleSide,
                }),
                glassMaterial: new host.MeshStandardMaterial({
                  color: '#d7eefc',
                  emissive: paneColor,
                  emissiveIntensity: 0.02,
                  transparent: true,
                  opacity: 0.42,
                  roughness: 0.08,
                  metalness: 0.06,
                  side: host.DoubleSide,
                }),
                frameMaterial: new host.MeshStandardMaterial({
                  color: '#5d6673',
                  roughness: 0.64,
                  metalness: 0.28,
                }),
                lensMaterial: new host.MeshStandardMaterial({
                  color: beamColor,
                  emissive: beamColor,
                  emissiveIntensity: 0.12,
                  transparent: true,
                  opacity: 0.96,
                  roughness: 0.18,
                  metalness: 0.04,
                }),
                balconyMaterial: new host.MeshStandardMaterial({
                  color: '#8b7358',
                  roughness: 0.84,
                  metalness: 0.08,
                }),
                wallGlowMaterial: new host.MeshStandardMaterial({
                  color: '#f8d7a1',
                  emissive: '#f8d7a1',
                  emissiveIntensity: 0.03,
                  transparent: true,
                  opacity: 0.68,
                  roughness: 0.4,
                  metalness: 0.02,
                  side: host.DoubleSide,
                }),
                beamColor,
                beamMaterials: Object.fromEntries(
                  LIGHTHOUSE_BEAM_SEGMENTS.map((segment) => [
                    segment.key,
                    new host.MeshStandardMaterial({
                      color: beamColor,
                      emissive: beamColor,
                      emissiveIntensity: 0,
                      transparent: true,
                      opacity: 0,
                      depthWrite: false,
                      roughness: 0.18,
                      metalness: 0,
                      side: host.DoubleSide,
                    }),
                  ])
                ) as Record<
                  (typeof LIGHTHOUSE_BEAM_SEGMENTS)[number]['key'],
                  ThreeMaterialLike
                >,
              })
            )
          )
          .createMaterials(three);

        return {
          ...appearance,
          rotationDurationMs,
          rotationDirection,
        };
      },
    };
  }
);

export function createLighthouseTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-lighthouse',
    kind: 'lighthouse',
    definition: {
      name: 'Lighthouse',
      color: '#f3e8d5',
      miniColor: '#fff5e1',
      walkable: true,
      wallHeight: 0.78,
    },
    note: 'A lighthouse stands watch over the nearby coast.',
    paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
      fillRect(context, x + 5, y + 2, 6, 12, '#f8fafc');
      fillRect(context, x + 4, y + 11, 8, 3, '#8b5e34');
      fillRect(context, x + 4, y + 3, 8, 2, '#c2410c');
      fillRect(context, x + 6, y + 5, 4, 2, '#fde68a');
      fillRect(context, x + 7, y + 8, 2, 4, '#7c3f1d');
      return true;
    }),
    estimate3DModelCost({ detailLevel = 'full' }: Create3DModelContext) {
      return detailLevel === 'low'
        ? LIGHTHOUSE_LOW_DETAIL_COST_ESTIMATE
        : LIGHTHOUSE_FULL_DETAIL_COST_ESTIMATE;
    },
    report3DModelCost({ detailLevel = 'full' }: Create3DModelContext) {
      return detailLevel === 'low'
        ? LIGHTHOUSE_LOW_DETAIL_COST_ESTIMATE
        : LIGHTHOUSE_FULL_DETAIL_COST_ESTIMATE;
    },
    create3DModel(context: Create3DModelContext) {
      return runLighthouseModelBuildToCompletion(
        createLighthouseModelProgressive(context)
      );
    },
    create3DModelProgressive(context: Create3DModelContext) {
      return createLighthouseModelProgressive(context);
    },
    sync3DModel({ model, cycle, timeMs, environment }) {
      if (!model || typeof model !== 'object') {
        return;
      }
      syncPoiLightEmitters(
        model as Parameters<typeof syncPoiLightEmitters>[0],
        cycle
      );
      syncLighthouseBeam(
        model as ThreeObject3DLike,
        cycle,
        timeMs ?? 0,
        environment
      );
    },
  });
}

function* createLighthouseModelProgressive({
  three,
  tileX,
  tileY,
  detailLevel = 'full',
}: Create3DModelContext): Generator<Create3DModelProgress, unknown, void> {
  const {
    wallMaterial,
    stripeMaterial,
    stoneMaterial,
    paneMaterial,
    glassMaterial,
    frameMaterial,
    lensMaterial,
    balconyMaterial,
    wallGlowMaterial,
    beamColor,
    rotationDurationMs,
    rotationDirection,
    beamMaterials,
  } = resolveRegionalLighthouseStyle(three, tileX, tileY);

  if (detailLevel === 'low') {
    return createLowDetailLighthouseModel(three, tileX, tileY, {
      wallMaterial,
      stripeMaterial,
      beamMaterial: beamMaterials.near,
      beamColor,
      rotationDurationMs,
      rotationDirection,
      beamPivotKey: LIGHTHOUSE_BEAM_PIVOT_KEY,
      beamKey: LIGHTHOUSE_BEAM_KEY,
      beamStartOffset: LIGHTHOUSE_BEAM_START_OFFSET,
      beamSegments: LIGHTHOUSE_LOW_DETAIL_BEAM_SEGMENTS,
    });
  }
  const totalSteps = 5;

  const base = markStructuralRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.46, 0.6, 0.32, 10),
      stoneMaterial
    ),
    { label: 'base' }
  );
  base.position.set(tileX, 0.16, tileY);

  const tower = markStructuralRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.34, 0.42, 1.8, 10),
      wallMaterial
    ),
    { label: 'tower' }
  );
  tower.position.set(0, 0.9, 0);
  base.add(tower);
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'base-and-tower',
  };

  const stripe = markStructuralRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.35, 0.41, 0.22, 10),
      stripeMaterial
    ),
    {
      label: 'stripe',
      priority: RENDER_BUDGET_PART_PRIORITIES.structuralDetail,
    }
  );
  stripe.position.set(0, 0.76, 0);
  base.add(stripe);

  const cap = markStructuralRenderBudgetPart(
    new three.Mesh(
      getSharedConeGeometry(three, 0.42, 0.34, 10),
      stripeMaterial
    ),
    { label: 'cap' }
  );
  cap.position.set(0, 1.94, 0);
  base.add(cap);

  const lanternRoom = markStructuralRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.24, 0.24, 0.28, 8),
      wallMaterial
    ),
    {
      label: 'lantern-room',
      priority: RENDER_BUDGET_PART_PRIORITIES.structuralDetail,
    }
  );
  lanternRoom.position.set(0, 1.7, 0);
  base.add(lanternRoom);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'crown-and-lantern',
  };

  const lanternGlass = markOptionalDecorativeRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.27, 0.27, 0.3, 8),
      glassMaterial
    ),
    { label: 'lantern-glass' }
  );
  lanternGlass.userData = {
    ...(lanternGlass.userData ?? {}),
    [LIGHTHOUSE_GLASS_KEY]: true,
  };
  lanternGlass.position.set(0, 1.7, 0);
  base.add(lanternGlass);

  const frameRingInstances = markOptionalDecorativeRenderBudgetPart(
    new three.InstancedMesh(
      getSharedCylinderGeometry(three, 0.29, 0.29, 0.03, 8),
      frameMaterial,
      2
    ),
    { label: 'frame-ring' }
  );
  frameRingInstances.userData = {
    ...(frameRingInstances.userData ?? {}),
    [LIGHTHOUSE_FRAME_KEY]: true,
    [LIGHTHOUSE_FRAME_RING_INSTANCED_KEY]: true,
  };
  const frameRingMatrixScratch = new three.Matrix4();
  [-0.13, 0.13].forEach((yOffset, index) => {
    frameRingInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        frameRingMatrixScratch,
        0,
        1.7 + yOffset,
        0,
        1,
        1,
        1
      )
    );
  });
  base.add(frameRingInstances);

  const framePostInstances = markOptionalDecorativeRenderBudgetPart(
    new three.InstancedMesh(
      getSharedBoxGeometry(three, 0.03, 0.28, 0.03),
      frameMaterial,
      4
    ),
    { label: 'frame-post' }
  );
  framePostInstances.userData = {
    ...(framePostInstances.userData ?? {}),
    [LIGHTHOUSE_FRAME_KEY]: true,
    [LIGHTHOUSE_FRAME_POST_INSTANCED_KEY]: true,
  };
  const framePostMatrixScratch = new three.Matrix4();
  [
    { x: 0.18, z: 0 },
    { x: -0.18, z: 0 },
    { x: 0, z: 0.18 },
    { x: 0, z: -0.18 },
  ].forEach((offset, index) => {
    framePostInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        framePostMatrixScratch,
        offset.x,
        1.7,
        offset.z,
        1,
        1,
        1
      )
    );
  });
  base.add(framePostInstances);

  const verticalWallGlowInstances = markOptionalDecorativeRenderBudgetPart(
    markPoiLightEmitter(
      new three.InstancedMesh(
        getSharedBoxGeometry(three, 0.04, 0.34, 0.22),
        wallGlowMaterial,
        2
      ),
      {
        kind: 'emissive-mesh',
        dayIntensity: 0.03,
        nightIntensity: 0.46,
      }
    ),
    {
      label: 'wall-glow',
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalFeature,
    }
  );
  verticalWallGlowInstances.userData = {
    ...(verticalWallGlowInstances.userData ?? {}),
    [LIGHTHOUSE_WALL_GLOW_KEY]: true,
    [LIGHTHOUSE_WALL_GLOW_INSTANCED_KEY]: 'vertical',
  };
  const verticalWallGlowMatrixScratch = new three.Matrix4();
  verticalWallGlowInstances.setMatrixAt(
    0,
    writeInstancedScalePositionMatrix(
      verticalWallGlowMatrixScratch,
      0.255,
      1.54,
      0,
      1,
      1,
      1
    )
  );
  verticalWallGlowInstances.setMatrixAt(
    1,
    writeInstancedScalePositionMatrix(
      verticalWallGlowMatrixScratch,
      -0.255,
      1.54,
      0,
      1,
      1,
      1
    )
  );
  base.add(verticalWallGlowInstances);

  const horizontalWallGlowInstances = markOptionalDecorativeRenderBudgetPart(
    markPoiLightEmitter(
      new three.InstancedMesh(
        getSharedBoxGeometry(three, 0.22, 0.34, 0.04),
        wallGlowMaterial,
        2
      ),
      {
        kind: 'emissive-mesh',
        dayIntensity: 0.03,
        nightIntensity: 0.46,
      }
    ),
    {
      label: 'wall-glow',
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalFeature,
    }
  );
  horizontalWallGlowInstances.userData = {
    ...(horizontalWallGlowInstances.userData ?? {}),
    [LIGHTHOUSE_WALL_GLOW_KEY]: true,
    [LIGHTHOUSE_WALL_GLOW_INSTANCED_KEY]: 'horizontal',
  };
  const horizontalWallGlowMatrixScratch = new three.Matrix4();
  horizontalWallGlowInstances.setMatrixAt(
    0,
    writeInstancedScalePositionMatrix(
      horizontalWallGlowMatrixScratch,
      0,
      1.54,
      0.255,
      1,
      1,
      1
    )
  );
  horizontalWallGlowInstances.setMatrixAt(
    1,
    writeInstancedScalePositionMatrix(
      horizontalWallGlowMatrixScratch,
      0,
      1.54,
      -0.255,
      1,
      1,
      1
    )
  );
  base.add(horizontalWallGlowInstances);
  yield {
    completedSteps: 3,
    totalSteps,
    label: 'lantern-frame',
  };

  const lens = markOptionalDecorativeRenderBudgetPart(
    markPoiLightEmitter(
      new three.Mesh(getSharedSphereGeometry(three, 0.08, 10, 8), lensMaterial),
      {
        kind: 'emissive-mesh',
        dayIntensity: 0.12,
        nightIntensity: 1.9,
      }
    ),
    {
      label: 'lens',
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalFeature,
    }
  );
  lens.userData = {
    ...(lens.userData ?? {}),
    [LIGHTHOUSE_LENS_KEY]: true,
  };
  lens.position.set(0, 1.7, 0);
  base.add(lens);

  const balconyDeck = markOptionalDecorativeRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.38, 0.38, 0.05, 12),
      balconyMaterial
    ),
    { label: 'balcony-deck' }
  );
  balconyDeck.userData = {
    ...(balconyDeck.userData ?? {}),
    [LIGHTHOUSE_BALCONY_KEY]: true,
  };
  balconyDeck.position.set(0, 1.51, 0);
  base.add(balconyDeck);

  const balconyRailRing = markOptionalDecorativeRenderBudgetPart(
    new three.Mesh(
      getSharedCylinderGeometry(three, 0.41, 0.41, 0.03, 12),
      frameMaterial
    ),
    { label: 'balcony-rail-ring' }
  );
  balconyRailRing.userData = {
    ...(balconyRailRing.userData ?? {}),
    [LIGHTHOUSE_BALCONY_RAIL_KEY]: true,
  };
  balconyRailRing.position.set(0, 1.67, 0);
  base.add(balconyRailRing);

  const balconyRailPostInstances = markOptionalDecorativeRenderBudgetPart(
    new three.InstancedMesh(
      getSharedBoxGeometry(three, 0.03, 0.18, 0.03),
      frameMaterial,
      4
    ),
    { label: 'balcony-rail-post' }
  );
  balconyRailPostInstances.userData = {
    ...(balconyRailPostInstances.userData ?? {}),
    [LIGHTHOUSE_BALCONY_RAIL_KEY]: true,
    [LIGHTHOUSE_BALCONY_RAIL_POST_INSTANCED_KEY]: true,
  };
  const balconyRailPostMatrixScratch = new three.Matrix4();
  [
    { x: 0.34, z: 0 },
    { x: -0.34, z: 0 },
    { x: 0, z: 0.34 },
    { x: 0, z: -0.34 },
  ].forEach((offset, index) => {
    balconyRailPostInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        balconyRailPostMatrixScratch,
        offset.x,
        1.59,
        offset.z,
        1,
        1,
        1
      )
    );
  });
  base.add(balconyRailPostInstances);

  const verticalPaneInstances = markOptionalDecorativeRenderBudgetPart(
    markPoiLightEmitter(
      new three.InstancedMesh(
        new three.PlaneGeometry(0.16, 0.12),
        paneMaterial,
        2
      ),
      {
        kind: 'emissive-mesh',
        dayIntensity: 0.08,
        nightIntensity: 1.3,
      }
    ),
    {
      label: 'pane',
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalFeature,
    }
  );
  verticalPaneInstances.userData = {
    ...(verticalPaneInstances.userData ?? {}),
    [LIGHTHOUSE_PANE_INSTANCED_KEY]: 'vertical',
  };
  const verticalPaneMatrixScratch = new three.Matrix4();
  writeInstancedScalePositionMatrix(
    verticalPaneMatrixScratch,
    0.22,
    1.86,
    0,
    1,
    1,
    1
  );
  verticalPaneInstances.setMatrixAt(0, verticalPaneMatrixScratch);
  writeInstancedScalePositionMatrix(
    verticalPaneMatrixScratch,
    -0.22,
    1.86,
    0,
    1,
    1,
    1
  );
  verticalPaneInstances.setMatrixAt(1, verticalPaneMatrixScratch);
  base.add(verticalPaneInstances);

  const horizontalPaneInstances = markOptionalDecorativeRenderBudgetPart(
    markPoiLightEmitter(
      new three.InstancedMesh(
        new three.PlaneGeometry(0.16, 0.12),
        paneMaterial,
        2
      ),
      {
        kind: 'emissive-mesh',
        dayIntensity: 0.08,
        nightIntensity: 1.3,
      }
    ),
    {
      label: 'pane',
      priority: RENDER_BUDGET_PART_PRIORITIES.optionalFeature,
    }
  );
  horizontalPaneInstances.userData = {
    ...(horizontalPaneInstances.userData ?? {}),
    [LIGHTHOUSE_PANE_INSTANCED_KEY]: 'horizontal',
  };
  horizontalPaneInstances.rotation.y = Math.PI / 2;
  const horizontalPaneMatrixScratch = new three.Matrix4();
  writeInstancedScalePositionMatrix(
    horizontalPaneMatrixScratch,
    0,
    1.7,
    0.22,
    1,
    1,
    1
  );
  horizontalPaneInstances.setMatrixAt(0, horizontalPaneMatrixScratch);
  writeInstancedScalePositionMatrix(
    horizontalPaneMatrixScratch,
    0,
    1.7,
    -0.22,
    1,
    1,
    1
  );
  horizontalPaneInstances.setMatrixAt(1, horizontalPaneMatrixScratch);
  base.add(horizontalPaneInstances);
  yield {
    completedSteps: 4,
    totalSteps,
    label: 'balcony-and-panes',
  };

  const beamPivot = new three.Group();
  beamPivot.userData = {
    ...(beamPivot.userData ?? {}),
    [LIGHTHOUSE_BEAM_PIVOT_KEY]: true,
    lighthouseBeamRotationDurationMs: rotationDurationMs,
    lighthouseBeamRotationDirection: rotationDirection,
  };
  beamPivot.position.set(0, 1.72, 0);

  let beamOffset = LIGHTHOUSE_BEAM_START_OFFSET;
  for (const segment of LIGHTHOUSE_BEAM_SEGMENTS) {
    const beam = new three.Mesh(
      getSharedConeGeometry(three, segment.radius, segment.length, 12),
      beamMaterials[segment.key]
    ) as BeamNodeLike;
    beam.userData = {
      ...(beam.userData ?? {}),
      [LIGHTHOUSE_BEAM_KEY]: true,
      lighthouseBeamColor: beamColor,
      lighthouseBeamOpacity: segment.opacity,
      lighthouseBeamEmissiveIntensity: segment.emissiveIntensity,
    };
    beam.rotation.z = Math.PI / 2;
    beam.position.set(beamOffset + segment.length * 0.5, 0, 0);
    beam.castShadow = false;
    beam.receiveShadow = false;
    beam.visible = false;
    beamPivot.add(beam);
    beamOffset += segment.length - 0.04;
  }
  base.add(beamPivot);

  const beacon = markPoiLightEmitter(
    new three.PointLight(beamColor, 0, 6.2, 1.6),
    {
      kind: 'point-light',
      nightIntensity: 1.15,
      visibleThreshold: 0.05,
    }
  );
  beacon.position.set(0, 1.72, 0);
  beacon.visible = false;
  base.add(beacon);
  yield {
    completedSteps: 5,
    totalSteps,
    label: 'beam-and-beacon',
  };

  return base;
}

function runLighthouseModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function pickLighthouseBeamColor(signal: number): string {
  if (signal > 0.8) {
    return '#cfe8ff';
  }
  if (signal > 0.55) {
    return '#ffe9a8';
  }
  if (signal > 0.3) {
    return '#ffd7b0';
  }
  return '#e6ffd0';
}

function pickLighthousePaneColor(signal: number, beamColor: string): string {
  if (signal > 0.66) {
    return beamColor;
  }
  if (signal > 0.33) {
    return '#fff1b2';
  }
  return '#f8d7a1';
}

function syncLighthouseBeam(
  root: ThreeObject3DLike,
  cycle: {
    daylight: number;
    twilight: number;
    night: number;
    sunAltitude?: number;
  },
  timeMs: number,
  environment: WorldEnvironmentLike = {}
): void {
  const weatherProfile = getLighthouseBeamWeatherProfile(
    cycle,
    getPoiLightActivation(cycle),
    environment
  );

  root.traverse?.((node) => {
    if (node.userData?.[LIGHTHOUSE_BEAM_PIVOT_KEY]) {
      const rotationDurationMs =
        typeof node.userData?.lighthouseBeamRotationDurationMs === 'number'
          ? Math.max(1, node.userData.lighthouseBeamRotationDurationMs)
          : 2100;
      const rotationDirection =
        node.userData?.lighthouseBeamRotationDirection === -1 ? -1 : 1;
      const sweepRotation =
        ((((timeMs / rotationDurationMs) * Math.PI * 2 * rotationDirection) %
          (Math.PI * 2)) +
          Math.PI * 2) %
        (Math.PI * 2);
      node.rotation.y = sweepRotation;
    }
    if (!node.userData?.[LIGHTHOUSE_BEAM_KEY]) {
      return;
    }

    node.visible =
      weatherProfile.activation > 0.01 &&
      (typeof cycle.sunAltitude !== 'number' ||
        cycle.sunAltitude < 0.02 ||
        weatherProfile.usesWeatherOverride);
    const beamNode = node as BeamNodeLike;
    const materials = Array.isArray(beamNode.material)
      ? beamNode.material
      : beamNode.material
        ? [beamNode.material]
        : [];
    materials.forEach((material) => {
      const baseOpacityScale =
        typeof node.userData?.lighthouseBeamOpacity === 'number'
          ? node.userData.lighthouseBeamOpacity
          : 0.1;
      const weatherOpacityScale = getLighthouseBeamSegmentScale(node, {
        near: weatherProfile.nearOpacityScale,
        mid: weatherProfile.midOpacityScale,
        far: weatherProfile.farOpacityScale,
      });
      material.opacity =
        weatherProfile.activation * baseOpacityScale * weatherOpacityScale;
      if (typeof material.emissiveIntensity === 'number') {
        const baseEmissiveScale =
          typeof node.userData?.lighthouseBeamEmissiveIntensity === 'number'
            ? node.userData.lighthouseBeamEmissiveIntensity
            : 0.6;
        const weatherEmissiveScale = getLighthouseBeamSegmentScale(node, {
          near: weatherProfile.nearEmissiveScale,
          mid: weatherProfile.midEmissiveScale,
          far: weatherProfile.farEmissiveScale,
        });
        material.emissiveIntensity =
          weatherProfile.activation * baseEmissiveScale * weatherEmissiveScale;
      }
    });
  });
}

function getLighthouseBeamSegmentScale(
  node: ThreeObject3DLike,
  scales: { near: number; mid: number; far: number }
) {
  const emissiveScale = Number(
    node.userData?.lighthouseBeamEmissiveIntensity ?? 0
  );
  if (emissiveScale >= 1) {
    return scales.near;
  }
  if (emissiveScale >= 0.75) {
    return scales.mid;
  }
  return scales.far;
}

function writeInstancedScalePositionMatrix(
  matrix: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return matrix.makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}
