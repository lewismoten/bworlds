import { createBoundedCache } from '@bworlds/cache-support';
import { createRandom } from '@bworlds/core';
import {
  appendHashSeedPart,
  hash2D,
  registerHashLabel,
} from '@bworlds/core/hash';
import {
  createAnchoredEnterablePoiTilePlugin,
  markPoiLightEmitter,
  markPoiWindResponder,
  syncPoiLightEmitters,
  syncPoiWindResponders,
} from '@bworlds/poi-support';
import {
  createCoordinateValueResolver,
  createHostVariantMaterialResolver,
  createHostVariantValueResolver,
} from '@bworlds/procedural-style';
import { getTownProfile } from '@bworlds/town-support';
import {
  createTexturedPlaneMesh,
  getOrCreatePaintedCanvasTexture,
  createPaintedStandardMaterial,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  Create3DModelProgress,
  Paint2DContext,
  RenderBudgetQualityLevel,
  RuntimePlugin,
  TileLike,
  ThreeHostLike,
  ThreeInstancedMeshLike,
  ThreeMaterialLike,
  ThreeMatrix4Like,
  ThreeObject3DLike,
  ThreeTextureLike,
} from '@bworlds/plugin-api';

const TOWN_REGION_SIZE = 18;
const LARGE_TOWN_BUILDING_COUNT = 6;
const TOWN_BANNER_KEY = 'townBanner';
const TOWN_DESCRIPTOR_CACHE_LIMIT = 256;
const TOWN_STYLE_CACHE_LIMIT = 96;
const TOWN_SIGN_LABEL_CACHE_LIMIT = 192;
const TOWN_STYLE_PALETTE_VARIANTS = [
  {
    wallColor: '#ece6dc',
    roofColor: '#b64b3b',
    trimColor: '#73563f',
    windowColor: '#d9f4ff',
    signBaseColor: '#f0d9a6',
  },
  {
    wallColor: '#ece6dc',
    roofColor: '#7b4032',
    trimColor: '#54402f',
    windowColor: '#fef3c7',
    signBaseColor: '#e8c889',
  },
  {
    wallColor: '#d8cfbf',
    roofColor: '#b64b3b',
    trimColor: '#54402f',
    windowColor: '#d9f4ff',
    signBaseColor: '#f0d9a6',
  },
  {
    wallColor: '#d8cfbf',
    roofColor: '#7b4032',
    trimColor: '#73563f',
    windowColor: '#fef3c7',
    signBaseColor: '#e8c889',
  },
  {
    wallColor: '#ece6dc',
    roofColor: '#a35643',
    trimColor: '#6a4d37',
    windowColor: '#d9f4ff',
    signBaseColor: '#e8c889',
  },
  {
    wallColor: '#ddd4c7',
    roofColor: '#8c4c3b',
    trimColor: '#5b4634',
    windowColor: '#fef3c7',
    signBaseColor: '#efd49d',
  },
  {
    wallColor: '#e7dfd2',
    roofColor: '#914536',
    trimColor: '#6f543d',
    windowColor: '#e6f7ff',
    signBaseColor: '#efcf95',
  },
  {
    wallColor: '#d4cab9',
    roofColor: '#744236',
    trimColor: '#4f3d30',
    windowColor: '#f5eac2',
    signBaseColor: '#dfbc79',
  },
] as const;
const TOWN_TEXTURE_PATTERN_VARIANT_COUNT = 3;
const TOWN_BUILDING_SEED = registerHashLabel('town-building');
const TOWN_STYLE_VARIANT_SEED = registerHashLabel('town-style-variant');
const TOWN_WALL_PATTERN_SEED = registerHashLabel('town-wall-pattern');
const TOWN_ROOF_PATTERN_SEED = registerHashLabel('town-roof-pattern');
const TOWN_SIGN_ROTATION_SEED = registerHashLabel('town-sign-rotation');
const TOWN_BANNER_SPEED_SEED = registerHashLabel('town-banner-speed');
const TOWN_BANNER_GUST_SPEED_SEED = registerHashLabel('town-banner-gust-speed');
const TOWN_BANNER_PHASE_SEED = registerHashLabel('town-banner-phase');
const TOWN_BANNER_GUST_PHASE_SEED = registerHashLabel('town-banner-gust-phase');
const TOWN_BANNER_COUNT_SEED = registerHashLabel('town-banner-count');
const TOWN_BANNER_WIDTH_SEED = registerHashLabel('town-banner-width');
const TOWN_BANNER_LENGTH_SEED = registerHashLabel('town-banner-length');
const TOWN_BANNER_HEIGHT_SEED = registerHashLabel('town-banner-height');
const TOWN_BANNER_ROTATION_SEED = registerHashLabel('town-banner-rotation');
const TOWN_BANNER_BASE_ROTATION_SEED = registerHashLabel(
  'town-banner-base-rotation'
);
const TOWN_BANNER_COLOR_SEED = registerHashLabel('town-banner-color');
const TOWN_WALL_CRACK_X_SEED = registerHashLabel('town-wall-crack-x');
const TOWN_WALL_CRACK_Y_SEED = registerHashLabel('town-wall-crack-y');
const TOWN_WALL_CRACK_WIDTH_SEED = registerHashLabel('town-wall-crack-w');
const TOWN_WALL_BEAM_X_SEED = registerHashLabel('town-wall-beam-x');
const TOWN_ROOF_CHIP_X_SEED = registerHashLabel('town-roof-chip-x');
const TOWN_ROOF_CHIP_Y_SEED = registerHashLabel('town-roof-chip-y');
const signLabelCache = createBoundedCache<string, ThreeTextureLike>(
  TOWN_SIGN_LABEL_CACHE_LIMIT
);
const townStyleCache = createBoundedCache<string, TownStyleBlueprint>(
  TOWN_STYLE_CACHE_LIMIT
);
const townDescriptorCache = createBoundedCache<string, TownDescriptor[]>(
  TOWN_DESCRIPTOR_CACHE_LIMIT
);
const resolveTownDescriptors = createCoordinateValueResolver(
  townDescriptorCache,
  ({ tileX, tileY }) => {
    const count = getTownBuildingCount(tileX, tileY);
    const descriptors: TownDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const baseSeed = appendHashSeedPart(
        appendHashSeedPart(
          appendHashSeedPart(TOWN_BUILDING_SEED, tileX),
          tileY
        ),
        index
      );
      const random = createRandom(baseSeed);
      const width = 0.28 + random() * 0.22;
      const depth = 0.26 + random() * 0.24;
      const height = 0.55 + random() * 0.55;
      const descriptor: TownDescriptor = {
        x: (random() - 0.5) * 0.54,
        y: (random() - 0.5) * 0.54,
        width,
        depth,
        height,
        rotation: random() > 0.5 ? 0 : Math.PI * 0.5,
        roofRadius: Math.max(width, depth) * (0.96 + random() * 0.26),
        roofHeight: 0.18 + random() * 0.2,
        windows: [],
      };

      const windowCount = 1 + Math.floor(random() * 3);
      for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
        descriptor.windows.push({
          x:
            ((windowIndex + 1) / (windowCount + 1) - 0.5) *
            descriptor.width *
            0.75,
          y: descriptor.height * (0.48 + random() * 0.16),
          width: descriptor.width * 0.12,
          height: descriptor.height * 0.14,
        });
      }

      descriptors.push(descriptor);
    }

    return descriptors;
  }
);

export function getTownBuildingCount(tileX: number, tileY: number): number {
  return getTownProfile(tileX, tileY).buildingCount;
}
function resolveTownStyle(tileX: number, tileY: number): TownStyleBlueprint {
  const regionX = Math.floor(tileX / TOWN_REGION_SIZE);
  const regionY = Math.floor(tileY / TOWN_REGION_SIZE);
  const variant = getTownStyleVariant(regionX, regionY);
  return townStyleCache.getOrCreate(variant.key, () =>
    createHostVariantValueResolver(
      (three: ThreeHostLike, quality: RenderBudgetQualityLevel) => {
        const bannerMaterials = createHostVariantMaterialResolver(
          (host: ThreeHostLike, color: string): ThreeMaterialLike =>
            new host.MeshStandardMaterial({
              color,
              emissive: color,
              emissiveIntensity: 0.04,
              roughness: 0.84,
              metalness: 0.02,
              side: host.DoubleSide,
            })
        );
        const style = {
          key: variant.key,
          trimColor: variant.palette.trimColor,
          signBaseColor: variant.palette.signBaseColor,
          signTextColor: '#2f2218',
          wallMaterial: createPaintedStandardMaterial(three, {
            color: '#ffffff',
            roughness: 0.92,
            metalness: 0.02,
            quality,
            width: 64,
            height: 64,
            repeatX: 1.1,
            repeatY: 1.1,
            paint(context, canvas) {
              paintTownWallTexture(
                context,
                canvas,
                variant.palette.wallColor,
                variant.palette.trimColor,
                variant.paletteIndex,
                variant.wallPatternVariant
              );
            },
          }),
          roofMaterial: createPaintedStandardMaterial(three, {
            color: '#ffffff',
            roughness: 0.88,
            metalness: 0.03,
            quality,
            width: 64,
            height: 64,
            repeatX: 1.35,
            repeatY: 1.35,
            paint(context, canvas) {
              paintTownRoofTexture(
                context,
                canvas,
                variant.palette.roofColor,
                variant.palette.trimColor,
                variant.paletteIndex,
                variant.roofPatternVariant
              );
            },
          }),
          trimMaterial: new three.MeshStandardMaterial({
            color: variant.palette.trimColor,
            roughness: 0.84,
            metalness: 0.04,
          }),
          windowMaterial: new three.MeshStandardMaterial({
            color: variant.palette.windowColor,
            emissive: variant.palette.windowColor,
            emissiveIntensity: 0.08,
            roughness: 0.4,
            metalness: 0.02,
          }),
          getBannerMaterial(color: string) {
            return bannerMaterials.getMaterial(three, color);
          },
        };
        return style;
      }
    )
  );
}

export function createTownTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-town',
    kind: 'town',
    definition: {
      name: 'Town',
      color: '#e879f9',
      miniColor: '#f0abfc',
      walkable: true,
      wallHeight: 0.5,
    },
    note: 'A lively town rises where several roads meet.',
    paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
      fillRect(context, x, y, 16, 16, '#88b871');
      fillRect(context, x + 1, y + 6, 14, 4, '#9f6f32');
      const left = 1 + motif.int(0, 1);
      const right = 9 + motif.int(-1, 0);
      fillRect(context, x + left, y + 2, 5, 4, '#f8fafc');
      fillRect(context, x + right, y + 2, 5, 4, '#f8fafc');
      fillRect(context, x + left, y + 3, 5, 1, '#e879f9');
      fillRect(context, x + right, y + 3, 5, 1, '#fb7185');
      fillRect(context, x + left + 2, y + 10, 2, 3, '#7c3f1d');
      fillRect(context, x + right + 2, y + 10, 2, 3, '#7c3f1d');
      return true;
    },
    create3DModel(context: Create3DModelContext & { tile: TileLike }) {
      return runTownModelBuildToCompletion(createTownModelProgressive(context));
    },
    create3DModelProgressive(
      context: Create3DModelContext & { tile: TileLike }
    ) {
      return createTownModelProgressive(context);
    },
    sync3DModel({ model, cycle, environment, timeMs = 0 }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(
          model as Parameters<typeof syncPoiLightEmitters>[0],
          cycle
        );
        syncPoiWindResponders(
          model as Parameters<typeof syncPoiWindResponders>[0],
          environment,
          timeMs
        );
      }
    },
  });
}

function* createTownModelProgressive({
  three,
  tile,
  tileX,
  tileY,
  detailLevel = 'full',
  renderBudget,
}: Create3DModelContext & { tile: TileLike }): Generator<
  Create3DModelProgress,
  unknown,
  void
> {
  const style = getTownStyle(three, tileX, tileY, renderBudget?.quality);
  const descriptors = getTownDescriptors(tileX, tileY);
  const group = new three.Group();

  if (detailLevel === 'low') {
    const lowBodyInstances = new three.InstancedMesh(
      new three.BoxGeometry(1, 1, 1),
      style.wallMaterial,
      descriptors.length
    );
    lowBodyInstances.userData = {
      ...(lowBodyInstances.userData ?? {}),
      townInstancedPart: 'low-building-body',
    };
    const lowBodyMatrixScratch = new three.Matrix4();

    descriptors.forEach((descriptor, index) => {
      lowBodyInstances.setMatrixAt(
        index,
        writeTownRotatedInstancedScalePositionMatrix(
          lowBodyMatrixScratch,
          tileX + descriptor.x,
          descriptor.height * 0.5,
          tileY + descriptor.y,
          descriptor.width,
          descriptor.height,
          descriptor.depth,
          descriptor.rotation
        )
      );
    });
    group.add(lowBodyInstances);
    return group;
  }

  const firstBuildingBatchCount = Math.ceil(descriptors.length / 2);
  const primaryBuildingDescriptors = descriptors.slice(
    0,
    firstBuildingBatchCount
  );
  const remainingBuildingDescriptors = descriptors.slice(
    firstBuildingBatchCount
  );
  const secondBuildingBatchCount = Math.ceil(
    remainingBuildingDescriptors.length / 2
  );
  const secondaryBuildingDescriptors = remainingBuildingDescriptors.slice(
    0,
    secondBuildingBatchCount
  );
  const tertiaryBuildingDescriptors = remainingBuildingDescriptors.slice(
    secondBuildingBatchCount
  );
  const totalSteps =
    tertiaryBuildingDescriptors.length > 0
      ? 6
      : secondaryBuildingDescriptors.length > 0
        ? 5
        : 4;
  const bodyInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.wallMaterial,
    descriptors.length
  );
  bodyInstances.userData = {
    ...(bodyInstances.userData ?? {}),
    townInstancedPart: 'building-body',
  };
  const roofInstances = new three.InstancedMesh(
    new three.ConeGeometry(1, 1, 4),
    style.roofMaterial,
    descriptors.length
  );
  roofInstances.userData = {
    ...(roofInstances.userData ?? {}),
    townInstancedPart: 'building-roof',
  };
  const doorInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.trimMaterial,
    descriptors.length
  );
  doorInstances.userData = {
    ...(doorInstances.userData ?? {}),
    townInstancedPart: 'building-door',
  };
  const fullDetailWindowCount = descriptors.reduce(
    (count, descriptor) => count + descriptor.windows.length,
    0
  );
  const windowInstances =
    fullDetailWindowCount > 0
      ? markPoiLightEmitter(
          new three.InstancedMesh(
            new three.BoxGeometry(1, 1, 1),
            style.windowMaterial,
            fullDetailWindowCount
          ),
          {
            kind: 'emissive-mesh',
            dayIntensity: 0.08,
            nightIntensity: 1.2,
          }
        )
      : null;
  if (windowInstances) {
    windowInstances.userData = {
      ...(windowInstances.userData ?? {}),
      townInstancedPart: 'window-pane',
    };
  }

  const bodyMatrixScratch = new three.Matrix4();
  const roofMatrixScratch = new three.Matrix4();
  const doorMatrixScratch = new three.Matrix4();
  const windowMatrixScratch = windowInstances ? new three.Matrix4() : null;
  let nextWindowInstanceIndex = 0;

  nextWindowInstanceIndex = populateTownBuildingInstances({
    descriptors: primaryBuildingDescriptors,
    startIndex: 0,
    startWindowIndex: nextWindowInstanceIndex,
    tileX,
    tileY,
    bodyInstances,
    roofInstances,
    doorInstances,
    windowInstances,
    bodyMatrixScratch,
    roofMatrixScratch,
    doorMatrixScratch,
    windowMatrixScratch,
  });

  group.add(bodyInstances);
  group.add(roofInstances);
  group.add(doorInstances);
  if (windowInstances) {
    group.add(windowInstances);
  }
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'buildings-primary',
  };

  if (secondaryBuildingDescriptors.length > 0) {
    nextWindowInstanceIndex = populateTownBuildingInstances({
      descriptors: secondaryBuildingDescriptors,
      startIndex: primaryBuildingDescriptors.length,
      startWindowIndex: nextWindowInstanceIndex,
      tileX,
      tileY,
      bodyInstances,
      roofInstances,
      doorInstances,
      windowInstances,
      bodyMatrixScratch,
      roofMatrixScratch,
      doorMatrixScratch,
      windowMatrixScratch,
    });
    void nextWindowInstanceIndex;
    yield {
      completedSteps: 2,
      totalSteps,
      label: 'buildings-secondary',
    };
  }

  if (tertiaryBuildingDescriptors.length > 0) {
    nextWindowInstanceIndex = populateTownBuildingInstances({
      descriptors: tertiaryBuildingDescriptors,
      startIndex:
        primaryBuildingDescriptors.length + secondaryBuildingDescriptors.length,
      startWindowIndex: nextWindowInstanceIndex,
      tileX,
      tileY,
      bodyInstances,
      roofInstances,
      doorInstances,
      windowInstances,
      bodyMatrixScratch,
      roofMatrixScratch,
      doorMatrixScratch,
      windowMatrixScratch,
    });
    void nextWindowInstanceIndex;
    yield {
      completedSteps: 3,
      totalSteps,
      label: 'buildings-tertiary',
    };
  }

  const postBuildingBaseStep =
    tertiaryBuildingDescriptors.length > 0
      ? 3
      : secondaryBuildingDescriptors.length > 0
        ? 2
        : 1;

  if (tile.poi?.name) {
    addTownNameSign(group, three, tile.poi.name, tileX, tileY, style);
  }
  yield {
    completedSteps: postBuildingBaseStep + 1,
    totalSteps,
    label: 'sign',
  };

  const banners = createTownBannerDescriptors(tileX, tileY);
  if (banners.length > 0) {
    const bannerPoleInstances = new three.InstancedMesh(
      new three.CylinderGeometry(0.018, 0.02, 1, 5),
      style.trimMaterial,
      banners.length
    );
    bannerPoleInstances.userData = {
      ...(bannerPoleInstances.userData ?? {}),
      townInstancedPart: 'banner-pole',
    };
    const bannerCrossbarInstances = new three.InstancedMesh(
      new three.BoxGeometry(1, 1, 1),
      style.trimMaterial,
      banners.length
    );
    bannerCrossbarInstances.userData = {
      ...(bannerCrossbarInstances.userData ?? {}),
      townInstancedPart: 'banner-crossbar',
    };
    const bannerPoleMatrixScratch = new three.Matrix4();
    const bannerCrossbarMatrixScratch = new three.Matrix4();

    banners.forEach((banner, index) => {
      bannerPoleInstances.setMatrixAt(
        index,
        writeTownRotatedInstancedScalePositionMatrix(
          bannerPoleMatrixScratch,
          tileX + banner.x,
          banner.y + banner.height * 0.5,
          tileY + banner.z,
          1,
          banner.height,
          1,
          banner.rotationY
        )
      );
      const crossbarOffset = rotateTownLocalOffset(
        banner.width * 0.45,
        0,
        banner.rotationY
      );
      bannerCrossbarInstances.setMatrixAt(
        index,
        writeTownRotatedInstancedScalePositionMatrix(
          bannerCrossbarMatrixScratch,
          tileX + banner.x + crossbarOffset.x,
          banner.y + banner.height - 0.04,
          tileY + banner.z + crossbarOffset.z,
          banner.width * 0.9,
          0.025,
          0.025,
          banner.rotationY
        )
      );
      group.add(
        createTownBannerCloth(three, banner, style, tileX, tileY, index)
      );
    });
    group.add(bannerPoleInstances);
    group.add(bannerCrossbarInstances);
  }
  yield {
    completedSteps: postBuildingBaseStep + 2,
    totalSteps,
    label: 'banners',
  };

  createTownNightLights(three, descriptors).forEach((light) => {
    group.add(light);
  });
  yield {
    completedSteps: postBuildingBaseStep + 3,
    totalSteps,
    label: 'night-lights',
  };

  return group;
}

function populateTownBuildingInstances(options: {
  descriptors: readonly TownDescriptor[];
  startIndex: number;
  startWindowIndex: number;
  tileX: number;
  tileY: number;
  bodyInstances: ThreeInstancedMeshLike;
  roofInstances: ThreeInstancedMeshLike;
  doorInstances: ThreeInstancedMeshLike;
  windowInstances: ThreeInstancedMeshLike | null;
  bodyMatrixScratch: ThreeMatrix4Like;
  roofMatrixScratch: ThreeMatrix4Like;
  doorMatrixScratch: ThreeMatrix4Like;
  windowMatrixScratch: ThreeMatrix4Like | null;
}): number {
  let nextWindowInstanceIndex = options.startWindowIndex;

  for (let index = 0; index < options.descriptors.length; index += 1) {
    const descriptor = options.descriptors[index]!;
    const targetIndex = options.startIndex + index;
    options.bodyInstances.setMatrixAt(
      targetIndex,
      writeTownRotatedInstancedScalePositionMatrix(
        options.bodyMatrixScratch,
        options.tileX + descriptor.x,
        descriptor.height * 0.5,
        options.tileY + descriptor.y,
        descriptor.width,
        descriptor.height,
        descriptor.depth,
        descriptor.rotation
      )
    );
    options.roofInstances.setMatrixAt(
      targetIndex,
      writeTownRotatedInstancedScalePositionMatrix(
        options.roofMatrixScratch,
        options.tileX + descriptor.x,
        descriptor.height + descriptor.roofHeight * 0.5 - 0.03,
        options.tileY + descriptor.y,
        descriptor.roofRadius,
        descriptor.roofHeight,
        descriptor.roofRadius,
        descriptor.rotation + Math.PI * 0.25
      )
    );
    const doorPosition = rotateTownLocalOffset(
      0,
      descriptor.depth * 0.5 + 0.01,
      descriptor.rotation
    );
    options.doorInstances.setMatrixAt(
      targetIndex,
      writeTownRotatedInstancedScalePositionMatrix(
        options.doorMatrixScratch,
        options.tileX + descriptor.x + doorPosition.x,
        descriptor.height * 0.17,
        options.tileY + descriptor.y + doorPosition.z,
        descriptor.width * 0.18,
        descriptor.height * 0.34,
        0.04,
        descriptor.rotation
      )
    );

    for (const window of descriptor.windows) {
      if (options.windowInstances && options.windowMatrixScratch) {
        const windowPosition = rotateTownLocalOffset(
          window.x,
          descriptor.depth * 0.5 + 0.008,
          descriptor.rotation
        );
        options.windowInstances.setMatrixAt(
          nextWindowInstanceIndex,
          writeTownRotatedInstancedScalePositionMatrix(
            options.windowMatrixScratch,
            options.tileX + descriptor.x + windowPosition.x,
            window.y,
            options.tileY + descriptor.y + windowPosition.z,
            window.width,
            window.height,
            0.03,
            descriptor.rotation
          )
        );
        nextWindowInstanceIndex += 1;
      }
    }
  }

  return nextWindowInstanceIndex;
}

function runTownModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function createTownNightLights(
  three: ThreeHostLike,
  descriptors: TownDescriptor[]
) {
  const buildingCount = descriptors.length;
  const lightCount = getTownNightLightCount(buildingCount);
  const lights = [];

  for (let index = 0; index < lightCount; index += 1) {
    const light = markPoiLightEmitter(
      new three.PointLight(
        '#f7c97a',
        0,
        getTownNightLightDistance(buildingCount),
        1.8
      ),
      {
        kind: 'point-light',
        nightIntensity: getTownNightLightIntensity(buildingCount),
        visibleThreshold: 0.04,
      }
    );

    const placement =
      descriptors[index % descriptors.length] ??
      ({ x: 0, y: 0, width: 0, depth: 0, height: 0 } as TownDescriptor);
    const lateralOffset = index % 2 === 0 ? 0.14 : -0.14;
    const depthOffset = index < 2 ? 0.16 : -0.12;
    light.position.set(
      placement.x + lateralOffset,
      1.18 + index * 0.02,
      placement.y + depthOffset
    );
    light.visible = false;
    lights.push(light);
  }

  return lights;
}

export function getTownNightLightCount(buildingCount: number): number {
  if (buildingCount >= LARGE_TOWN_BUILDING_COUNT) {
    return 2;
  }
  return 1;
}

export function getTownNightLightIntensity(buildingCount: number): number {
  return buildingCount >= LARGE_TOWN_BUILDING_COUNT ? 1.2 : 0.9;
}

export function getTownNightLightDistance(buildingCount: number): number {
  return buildingCount >= LARGE_TOWN_BUILDING_COUNT ? 4.8 : 3.8;
}

function addTownNameSign(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  name: string,
  tileX: number,
  tileY: number,
  style: TownStyle
) {
  const signHeight = 1.08;
  const postThickness = 0.08;
  const placardWidth = Math.min(1.38, Math.max(0.72, 0.5 + name.length * 0.06));
  const placardHeight = 0.2;
  const placardDepth = 0.05;
  const signOriginX = tileX - 0.34;
  const signOriginZ = tileY + 0.34;
  const signRotationY =
    hash2D(TOWN_SIGN_ROTATION_SEED, tileX, tileY) * 0.35 - 0.18;
  const label = createTownLabelSprite(
    three,
    name,
    placardWidth,
    placardHeight,
    style
  );

  const post = new three.Mesh(
    new three.BoxGeometry(postThickness, signHeight, postThickness),
    style.trimMaterial
  );
  post.position.set(signOriginX, signHeight * 0.5, signOriginZ);
  post.rotation.y = signRotationY;
  post.userData = {
    ...(post.userData ?? {}),
    townSignPart: 'post',
  };
  group.add(post);

  const placard = new three.Mesh(
    new three.BoxGeometry(placardWidth, placardHeight, placardDepth),
    style.wallMaterial
  );
  placard.position.set(signOriginX, signHeight * 0.7, signOriginZ);
  placard.rotation.y = signRotationY;
  placard.userData = {
    ...(placard.userData ?? {}),
    townSignPart: 'placard',
  };
  group.add(placard);

  const cap = new three.Mesh(
    new three.BoxGeometry(
      placardWidth * 1.04,
      placardHeight * 0.14,
      placardDepth * 1.15
    ),
    style.trimMaterial
  );
  cap.position.set(
    signOriginX,
    placard.position.y + placardHeight * 0.5 + 0.03,
    signOriginZ
  );
  cap.rotation.y = signRotationY;
  cap.userData = {
    ...(cap.userData ?? {}),
    townSignPart: 'cap',
  };
  group.add(cap);

  const frontLabelOffset = rotateTownLocalOffset(
    0,
    placardDepth * 0.65,
    signRotationY
  );
  label.position.set(
    signOriginX + frontLabelOffset.x,
    placard.position.y,
    signOriginZ + frontLabelOffset.z
  );
  label.rotation.y = signRotationY;
  label.userData = {
    ...(label.userData ?? {}),
    townSignPart: 'front-label',
  };
  group.add(label);

  const backLabel = createTownLabelSprite(
    three,
    name,
    placardWidth,
    placardHeight,
    style
  );
  const backLabelOffset = rotateTownLocalOffset(
    0,
    -placardDepth * 0.65,
    signRotationY
  );
  backLabel.position.set(
    signOriginX + backLabelOffset.x,
    placard.position.y,
    signOriginZ + backLabelOffset.z
  );
  backLabel.rotation.y = signRotationY + Math.PI;
  backLabel.userData = {
    ...(backLabel.userData ?? {}),
    townSignPart: 'back-label',
  };
  group.add(backLabel);
}

function createTownLabelSprite(
  three: ThreeHostLike,
  name: string,
  width: number,
  height: number,
  style: TownStyle
) {
  const texture = getTownLabelTexture(three, name, style);
  return createTexturedPlaneMesh(three, {
    width: width * 0.9,
    height: height * 0.76,
    texture,
  });
}

function createTownBannerCloth(
  three: ThreeHostLike,
  descriptor: TownBannerDescriptor,
  style: TownStyle,
  tileX: number,
  tileY: number,
  index: number
) {
  const cloth = markPoiWindResponder(
    new three.Mesh(
      new three.PlaneGeometry(descriptor.width, descriptor.length),
      style.getBannerMaterial(descriptor.color)
    ),
    {
      axis: 'z',
      baseRotation: descriptor.baseRotation,
      idleAmplitude: 0.018,
      windAmplitude: 0.13,
      gustAmplitude: 0.05,
      speed: 1.3 + hash2D(TOWN_BANNER_SPEED_SEED, tileX + index, tileY) * 0.7,
      gustSpeed:
        2 + hash2D(TOWN_BANNER_GUST_SPEED_SEED, tileX, tileY + index) * 0.8,
      phase:
        hash2D(TOWN_BANNER_PHASE_SEED, tileX + index, tileY - index) *
        Math.PI *
        2,
      gustPhase:
        hash2D(TOWN_BANNER_GUST_PHASE_SEED, tileX - index, tileY + index) *
        Math.PI *
        2,
    }
  );
  const clothOffset = rotateTownLocalOffset(
    descriptor.width * 0.48,
    0,
    descriptor.rotationY
  );
  cloth.position.set(
    tileX + descriptor.x + clothOffset.x,
    descriptor.y + descriptor.height - descriptor.length * 0.5,
    tileY + descriptor.z + clothOffset.z
  );
  cloth.rotation.y = descriptor.rotationY;
  cloth.userData = {
    ...(cloth.userData ?? {}),
    [TOWN_BANNER_KEY]: index,
  };
  return cloth;
}

function createTownBannerDescriptors(
  tileX: number,
  tileY: number
): TownBannerDescriptor[] {
  const palette = ['#fb7185', '#f59e0b', '#38bdf8', '#34d399'];
  const count =
    1 + Math.floor(hash2D(TOWN_BANNER_COUNT_SEED, tileX, tileY) * 2);
  const descriptors: TownBannerDescriptor[] = [];
  for (let index = 0; index < count; index += 1) {
    descriptors.push({
      x: -0.38 + index * 0.28,
      y: 0,
      z: 0.32 - index * 0.16,
      width: 0.14 + hash2D(TOWN_BANNER_WIDTH_SEED, tileX + index, tileY) * 0.05,
      length:
        0.22 + hash2D(TOWN_BANNER_LENGTH_SEED, tileX, tileY + index) * 0.07,
      height:
        0.82 + hash2D(TOWN_BANNER_HEIGHT_SEED, tileX - index, tileY) * 0.18,
      rotationY:
        hash2D(TOWN_BANNER_ROTATION_SEED, tileX + index, tileY - index) * 0.45 -
        0.22,
      baseRotation:
        0.03 +
        hash2D(TOWN_BANNER_BASE_ROTATION_SEED, tileX, tileY + index) * 0.03,
      color:
        palette[
          Math.floor(
            hash2D(TOWN_BANNER_COLOR_SEED, tileX + index, tileY + index) *
              palette.length
          )
        ] ?? palette[0],
    });
  }
  return descriptors;
}

function getTownLabelTexture(
  three: ThreeHostLike,
  name: string,
  style: TownStyle
) {
  const key = `${style.key}:town:${name}`;
  return getOrCreatePaintedCanvasTexture(signLabelCache, key, three, {
    width: 320,
    height: 96,
    wrap: false,
    paint(context, canvas) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = style.signBaseColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = style.trimColor;
      context.lineWidth = 6;
      context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      context.fillStyle = style.signTextColor;
      context.font = 'bold 28px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(name, canvas.width * 0.5, canvas.height * 0.5);
    },
  });
}

function getTownStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  quality: RenderBudgetQualityLevel = 'full'
): TownStyle {
  return resolveTownStyle(tileX, tileY).getValue(three, quality);
}

function paintTownWallTexture(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  baseColor: string,
  trimColor: string,
  paletteIndex: number,
  wallPatternVariant: number
) {
  const patternSeedX = paletteIndex * 17 + wallPatternVariant * 11;
  const patternSeedY = paletteIndex * 13 + wallPatternVariant * 7;
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 8) {
    const shade = 210 + ((row * 9 + patternSeedX * 7) % 24);
    context.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 18}, 0.22)`;
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 24; index += 1) {
    const x = Math.floor(
      hash2D(TOWN_WALL_CRACK_X_SEED, patternSeedX + index, patternSeedY) *
        canvas.width
    );
    const y = Math.floor(
      hash2D(TOWN_WALL_CRACK_Y_SEED, patternSeedY + index, patternSeedX) *
        canvas.height
    );
    const width =
      2 +
      Math.floor(
        hash2D(TOWN_WALL_CRACK_WIDTH_SEED, patternSeedX, patternSeedY + index) *
          4
      );
    context.fillStyle = 'rgba(90, 72, 58, 0.18)';
    context.fillRect(x, y, width, 1);
  }

  for (let index = 0; index < 12; index += 1) {
    const x = Math.floor(
      hash2D(TOWN_WALL_BEAM_X_SEED, patternSeedX + index, patternSeedY) *
        canvas.width
    );
    context.fillStyle = trimColor;
    context.fillRect(x, 0, 2, canvas.height);
  }
}

function paintTownRoofTexture(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  baseColor: string,
  trimColor: string,
  paletteIndex: number,
  roofPatternVariant: number
) {
  const patternSeedX = paletteIndex * 19 + roofPatternVariant * 13;
  const patternSeedY = paletteIndex * 11 + roofPatternVariant * 17;
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 6) {
    context.fillStyle = row % 12 === 0 ? trimColor : 'rgba(255,255,255,0.08)';
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 36; index += 1) {
    const x = Math.floor(
      hash2D(TOWN_ROOF_CHIP_X_SEED, patternSeedX + index, patternSeedY) *
        canvas.width
    );
    const y = Math.floor(
      hash2D(TOWN_ROOF_CHIP_Y_SEED, patternSeedY + index, patternSeedX) *
        canvas.height
    );
    context.fillStyle = 'rgba(30, 20, 18, 0.16)';
    context.fillRect(x, y, 2, 1);
  }
}

function getTownStyleVariant(
  regionX: number,
  regionY: number
): {
  key: string;
  paletteIndex: number;
  palette: (typeof TOWN_STYLE_PALETTE_VARIANTS)[number];
  wallPatternVariant: number;
  roofPatternVariant: number;
} {
  const paletteIndex = Math.floor(
    hash2D(TOWN_STYLE_VARIANT_SEED, regionX, regionY) *
      TOWN_STYLE_PALETTE_VARIANTS.length
  );
  const wallPatternVariant = Math.min(
    TOWN_TEXTURE_PATTERN_VARIANT_COUNT - 1,
    Math.floor(
      hash2D(TOWN_WALL_PATTERN_SEED, regionX, regionY) *
        TOWN_TEXTURE_PATTERN_VARIANT_COUNT
    )
  );
  const roofPatternVariant = Math.min(
    TOWN_TEXTURE_PATTERN_VARIANT_COUNT - 1,
    Math.floor(
      hash2D(TOWN_ROOF_PATTERN_SEED, regionX, regionY) *
        TOWN_TEXTURE_PATTERN_VARIANT_COUNT
    )
  );
  const resolvedPalette =
    TOWN_STYLE_PALETTE_VARIANTS[paletteIndex] ?? TOWN_STYLE_PALETTE_VARIANTS[0];

  return {
    key: `palette:${paletteIndex}:wall:${wallPatternVariant}:roof:${roofPatternVariant}`,
    paletteIndex,
    palette: resolvedPalette,
    wallPatternVariant,
    roofPatternVariant,
  };
}

function getTownDescriptors(tileX: number, tileY: number): TownDescriptor[] {
  return resolveTownDescriptors(tileX, tileY);
}

function writeTownRotatedInstancedScalePositionMatrix(
  target: InstanceType<ThreeHostLike['Matrix4']>,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationY: number
) {
  const cosRotation = Math.cos(rotationY);
  const sinRotation = Math.sin(rotationY);
  return target.set(
    cosRotation * scaleX,
    0,
    sinRotation * scaleZ,
    x,
    0,
    scaleY,
    0,
    y,
    -sinRotation * scaleX,
    0,
    cosRotation * scaleZ,
    z,
    0,
    0,
    0,
    1
  );
}

function rotateTownLocalOffset(
  localX: number,
  localZ: number,
  rotationY: number
) {
  const cosRotation = Math.cos(rotationY);
  const sinRotation = Math.sin(rotationY);
  return {
    x: localX * cosRotation + localZ * sinRotation,
    z: -localX * sinRotation + localZ * cosRotation,
  };
}

interface TownStyle {
  key: string;
  trimColor: string;
  signBaseColor: string;
  signTextColor: string;
  wallMaterial: ThreeMaterialLike;
  roofMaterial: ThreeMaterialLike;
  trimMaterial: ThreeMaterialLike;
  windowMaterial: ThreeMaterialLike;
  getBannerMaterial(color: string): ThreeMaterialLike;
}

interface TownStyleBlueprint {
  getValue(three: ThreeHostLike, quality: RenderBudgetQualityLevel): TownStyle;
}

interface TownWindow {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TownDescriptor {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  roofRadius: number;
  roofHeight: number;
  windows: TownWindow[];
}

interface TownBannerDescriptor {
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
  height: number;
  rotationY: number;
  baseRotation: number;
  color: string;
}
