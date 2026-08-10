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
  createRegionalValueResolver,
  createHostVariantMaterialResolver,
  createHostVariantValueResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import { getTownProfile } from '@bworlds/town-support';
import {
  createPaintedCanvasTexture,
  createTexturedPlaneMesh,
  getOrCreatePaintedCanvasTexture,
  createPaintedStandardMaterial,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  CreateWorldActionContext,
  Create3DModelContext,
  Paint2DContext,
  RenderBudgetQualityLevel,
  RuntimePlugin,
  TileLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeTextureLike,
  TraversalProfile3D,
} from '@bworlds/plugin-api';

const TOWN_REGION_SIZE = 18;
const LARGE_TOWN_BUILDING_COUNT = 6;
const TOWN_BANNER_KEY = 'townBanner';
const TOWN_DESCRIPTOR_CACHE_LIMIT = 256;
const TOWN_STYLE_CACHE_LIMIT = 96;
const TOWN_SIGN_LABEL_CACHE_LIMIT = 192;
const TOWN_BUILDING_SEED = registerHashLabel('town-building');
const TOWN_WALL_TONE_SEED = registerHashLabel('town-wall-tone');
const TOWN_ROOF_TONE_SEED = registerHashLabel('town-roof-tone');
const TOWN_TRIM_TONE_SEED = registerHashLabel('town-trim-tone');
const TOWN_WINDOW_TONE_SEED = registerHashLabel('town-window-tone');
const TOWN_SIGN_BASE_SEED = registerHashLabel('town-sign-base');
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
const resolveTownStyle = createRegionalValueResolver(
  townStyleCache,
  TOWN_REGION_SIZE,
  ({ regionX, regionY, key }) => {
    const wallColor = pickThresholdColor(
      hash2D(TOWN_WALL_TONE_SEED, regionX, regionY),
      0.5,
      '#ece6dc',
      '#d8cfbf'
    );
    const roofColor = pickThresholdColor(
      hash2D(TOWN_ROOF_TONE_SEED, regionX, regionY),
      0.5,
      '#b64b3b',
      '#7b4032'
    );
    const trimColor = pickThresholdColor(
      hash2D(TOWN_TRIM_TONE_SEED, regionX, regionY),
      0.45,
      '#73563f',
      '#54402f'
    );
    const windowColor = pickThresholdColor(
      hash2D(TOWN_WINDOW_TONE_SEED, regionX, regionY),
      0.55,
      '#d9f4ff',
      '#fef3c7'
    );
    const signBaseColor = pickThresholdColor(
      hash2D(TOWN_SIGN_BASE_SEED, regionX, regionY),
      0.5,
      '#f0d9a6',
      '#e8c889'
    );

    return createHostVariantValueResolver(
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
          key,
          trimColor,
          signBaseColor,
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
                wallColor,
                trimColor,
                regionX,
                regionY
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
                roofColor,
                trimColor,
                regionX,
                regionY
              );
            },
          }),
          trimMaterial: new three.MeshStandardMaterial({
            color: trimColor,
            roughness: 0.84,
            metalness: 0.04,
          }),
          windowMaterial: new three.MeshStandardMaterial({
            color: windowColor,
            emissive: windowColor,
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
    );
  }
);

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
    create3DModel({
      three,
      tile,
      tileX,
      tileY,
      detailLevel = 'full',
      renderBudget,
    }: Create3DModelContext & { tile: TileLike }) {
      const style = getTownStyle(three, tileX, tileY, renderBudget?.quality);
      const descriptors = getTownDescriptors(tileX, tileY);
      const group = new three.Group();

      for (const descriptor of descriptors) {
        const building = new three.Group();
        building.position.set(tileX + descriptor.x, 0, tileY + descriptor.y);
        building.rotation.y = descriptor.rotation;

        const body = new three.Mesh(
          new three.BoxGeometry(
            descriptor.width,
            descriptor.height,
            descriptor.depth
          ),
          style.wallMaterial
        );
        body.position.y = descriptor.height * 0.5;
        building.add(body);

        if (detailLevel === 'low') {
          group.add(building);
          continue;
        }

        const roof = new three.Mesh(
          new three.ConeGeometry(
            descriptor.roofRadius,
            descriptor.roofHeight,
            4
          ),
          style.roofMaterial
        );
        roof.position.y =
          descriptor.height + descriptor.roofHeight * 0.5 - 0.03;
        roof.rotation.y = Math.PI * 0.25;
        building.add(roof);

        const door = new three.Mesh(
          new three.BoxGeometry(
            descriptor.width * 0.18,
            descriptor.height * 0.34,
            0.04
          ),
          style.trimMaterial
        );
        door.position.set(
          0,
          descriptor.height * 0.17,
          descriptor.depth * 0.5 + 0.01
        );
        building.add(door);

        for (const window of descriptor.windows) {
          const pane = markPoiLightEmitter(
            new three.Mesh(
              new three.BoxGeometry(window.width, window.height, 0.03),
              style.windowMaterial
            ),
            {
              kind: 'emissive-mesh',
              dayIntensity: 0.08,
              nightIntensity: 1.2,
            }
          );
          pane.position.set(window.x, window.y, descriptor.depth * 0.5 + 0.008);
          building.add(pane);
        }

        group.add(building);
      }

      if (detailLevel === 'low') {
        return group;
      }

      if (tile.poi?.name) {
        group.add(
          createTownNameSign(three, tile.poi.name, tileX, tileY, style)
        );
      }
      createTownBannerDescriptors(tileX, tileY).forEach((banner, index) => {
        group.add(createTownBanner(three, banner, style, tileX, tileY, index));
      });
      createTownNightLights(three, descriptors).forEach((light) => {
        group.add(light);
      });
      return group;
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

function createTownNameSign(
  three: ThreeHostLike,
  name: string,
  tileX: number,
  tileY: number,
  style: TownStyle
) {
  const sign = new three.Group();
  const signHeight = 1.08;
  const postThickness = 0.08;
  const placardWidth = Math.min(1.38, Math.max(0.72, 0.5 + name.length * 0.06));
  const placardHeight = 0.2;
  const placardDepth = 0.05;
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
  post.position.y = signHeight * 0.5;
  sign.add(post);

  const placard = new three.Mesh(
    new three.BoxGeometry(placardWidth, placardHeight, placardDepth),
    style.wallMaterial
  );
  placard.position.set(0, signHeight * 0.7, 0);
  sign.add(placard);

  const cap = new three.Mesh(
    new three.BoxGeometry(
      placardWidth * 1.04,
      placardHeight * 0.14,
      placardDepth * 1.15
    ),
    style.trimMaterial
  );
  cap.position.set(0, placard.position.y + placardHeight * 0.5 + 0.03, 0);
  sign.add(cap);

  label.position.set(0, placard.position.y, placardDepth * 0.65);
  sign.add(label);

  const backLabel = createTownLabelSprite(
    three,
    name,
    placardWidth,
    placardHeight,
    style
  );
  backLabel.position.set(0, placard.position.y, -placardDepth * 0.65);
  backLabel.rotation.y = Math.PI;
  sign.add(backLabel);

  sign.position.set(tileX - 0.34, 0, tileY + 0.34);
  sign.rotation.y = hash2D(TOWN_SIGN_ROTATION_SEED, tileX, tileY) * 0.35 - 0.18;
  return sign;
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

function createTownBanner(
  three: ThreeHostLike,
  descriptor: TownBannerDescriptor,
  style: TownStyle,
  tileX: number,
  tileY: number,
  index: number
) {
  const banner = new three.Group();
  banner.position.set(tileX + descriptor.x, descriptor.y, tileY + descriptor.z);
  banner.rotation.y = descriptor.rotationY;

  const pole = new three.Mesh(
    new three.CylinderGeometry(0.018, 0.02, descriptor.height, 5),
    style.trimMaterial
  );
  pole.position.y = descriptor.height * 0.5;
  banner.add(pole);

  const crossbar = new three.Mesh(
    new three.BoxGeometry(descriptor.width * 0.9, 0.025, 0.025),
    style.trimMaterial
  );
  crossbar.position.set(descriptor.width * 0.45, descriptor.height - 0.04, 0);
  banner.add(crossbar);

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
  cloth.position.set(
    descriptor.width * 0.48,
    descriptor.height - descriptor.length * 0.5,
    0
  );
  cloth.userData = {
    ...(cloth.userData ?? {}),
    [TOWN_BANNER_KEY]: index,
  };
  banner.add(cloth);
  return banner;
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
  regionX: number,
  regionY: number
) {
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 8) {
    const shade = 210 + ((row * 9 + regionX * 7) % 24);
    context.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 18}, 0.22)`;
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 24; index += 1) {
    const x = Math.floor(
      hash2D(TOWN_WALL_CRACK_X_SEED, regionX + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D(TOWN_WALL_CRACK_Y_SEED, regionY + index, regionX) * canvas.height
    );
    const width =
      2 +
      Math.floor(
        hash2D(TOWN_WALL_CRACK_WIDTH_SEED, regionX, regionY + index) * 4
      );
    context.fillStyle = 'rgba(90, 72, 58, 0.18)';
    context.fillRect(x, y, width, 1);
  }

  for (let index = 0; index < 12; index += 1) {
    const x = Math.floor(
      hash2D(TOWN_WALL_BEAM_X_SEED, regionX + index, regionY) * canvas.width
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
  regionX: number,
  regionY: number
) {
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 6) {
    context.fillStyle = row % 12 === 0 ? trimColor : 'rgba(255,255,255,0.08)';
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 36; index += 1) {
    const x = Math.floor(
      hash2D(TOWN_ROOF_CHIP_X_SEED, regionX + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D(TOWN_ROOF_CHIP_Y_SEED, regionY + index, regionX) * canvas.height
    );
    context.fillStyle = 'rgba(30, 20, 18, 0.16)';
    context.fillRect(x, y, 2, 1);
  }
}

function getTownDescriptors(tileX: number, tileY: number): TownDescriptor[] {
  return resolveTownDescriptors(tileX, tileY);
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
