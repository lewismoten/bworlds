import { hash2D } from '@bworlds/core';
import {
  createAnchoredEnterablePoiTilePlugin,
  markPoiLightEmitter,
  markPoiWindResponder,
  syncPoiLightEmitters,
  syncPoiWindResponders,
} from '@bworlds/poi-support';
import {
  createCoordinateValueResolver,
  createRegionalMaterialResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
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
const signLabelCache = new Map<string, ThreeTextureLike>();
const townStyleCache = new Map<string, TownStyleBlueprint>();
const townDescriptorCache = new Map<string, TownDescriptor[]>();
const resolveTownDescriptors = createCoordinateValueResolver(
  townDescriptorCache,
  ({ tileX, tileY }) => {
    const complexity = hash2D('town-complexity', tileX, tileY);
    const count = 3 + Math.floor(complexity * 4);
    const descriptors: TownDescriptor[] = [];

    for (let index = 0; index < count; index += 1) {
      const baseSeed = `town-building:${tileX}:${tileY}:${index}`;
      const width = 0.28 + hash2D(baseSeed, 1, 0) * 0.22;
      const depth = 0.26 + hash2D(baseSeed, 2, 0) * 0.24;
      const height = 0.55 + hash2D(baseSeed, 3, 0) * 0.55;
      const descriptor: TownDescriptor = {
        x: (hash2D(baseSeed, 4, 0) - 0.5) * 0.54,
        y: (hash2D(baseSeed, 5, 0) - 0.5) * 0.54,
        width,
        depth,
        height,
        rotation: hash2D(baseSeed, 6, 0) > 0.5 ? 0 : Math.PI * 0.5,
        roofRadius:
          Math.max(width, depth) * (0.96 + hash2D(baseSeed, 7, 0) * 0.26),
        roofHeight: 0.18 + hash2D(baseSeed, 8, 0) * 0.2,
        windows: [],
      };

      const windowCount = 1 + Math.floor(hash2D(baseSeed, 9, 0) * 3);
      for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
        descriptor.windows.push({
          x:
            ((windowIndex + 1) / (windowCount + 1) - 0.5) *
            descriptor.width *
            0.75,
          y:
            descriptor.height *
            (0.48 + hash2D(baseSeed, 10 + windowIndex, 0) * 0.16),
          width: descriptor.width * 0.12,
          height: descriptor.height * 0.14,
        });
      }

      descriptors.push(descriptor);
    }

    return descriptors;
  }
);
const resolveTownStyle = createRegionalMaterialResolver(
  townStyleCache,
  TOWN_REGION_SIZE,
  ({ regionX, regionY, key }) => {
    const wallColor = pickThresholdColor(
      hash2D('town-wall-tone', regionX, regionY),
      0.5,
      '#ece6dc',
      '#d8cfbf'
    );
    const roofColor = pickThresholdColor(
      hash2D('town-roof-tone', regionX, regionY),
      0.5,
      '#b64b3b',
      '#7b4032'
    );
    const trimColor = pickThresholdColor(
      hash2D('town-trim-tone', regionX, regionY),
      0.45,
      '#73563f',
      '#54402f'
    );
    const windowColor = pickThresholdColor(
      hash2D('town-window-tone', regionX, regionY),
      0.55,
      '#d9f4ff',
      '#fef3c7'
    );
    const signBaseColor = pickThresholdColor(
      hash2D('town-sign-base', regionX, regionY),
      0.5,
      '#f0d9a6',
      '#e8c889'
    );

    return {
      createMaterials(three: ThreeHostLike) {
        return {
          key,
          trimColor,
          signBaseColor,
          signTextColor: '#2f2218',
          wallMaterial: createPaintedStandardMaterial(three, {
            color: '#ffffff',
            roughness: 0.92,
            metalness: 0.02,
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
        };
      },
    };
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
    }: Create3DModelContext & { tile: TileLike }) {
      const style = getTownStyle(three, tileX, tileY);
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
        group.add(createTownNameSign(three, tile.poi.name, tileX, tileY, style));
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
        syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
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
  sign.rotation.y = hash2D('town-sign-rotation', tileX, tileY) * 0.35 - 0.18;
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
      new three.MeshStandardMaterial({
        color: descriptor.color,
        emissive: descriptor.color,
        emissiveIntensity: 0.04,
        roughness: 0.84,
        metalness: 0.02,
        side: three.DoubleSide,
      })
    ),
    {
      axis: 'z',
      baseRotation: descriptor.baseRotation,
      idleAmplitude: 0.018,
      windAmplitude: 0.13,
      gustAmplitude: 0.05,
      speed: 1.3 + hash2D('town-banner-speed', tileX + index, tileY) * 0.7,
      gustSpeed: 2 + hash2D('town-banner-gust-speed', tileX, tileY + index) * 0.8,
      phase: hash2D('town-banner-phase', tileX + index, tileY - index) * Math.PI * 2,
      gustPhase:
        hash2D('town-banner-gust-phase', tileX - index, tileY + index) *
        Math.PI *
        2,
    }
  );
  cloth.position.set(descriptor.width * 0.48, descriptor.height - descriptor.length * 0.5, 0);
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
  const count = 1 + Math.floor(hash2D('town-banner-count', tileX, tileY) * 2);
  return Array.from({ length: count }, (_, index) => ({
    x: -0.38 + index * 0.28,
    y: 0,
    z: 0.32 - index * 0.16,
    width: 0.14 + hash2D('town-banner-width', tileX + index, tileY) * 0.05,
    length: 0.22 + hash2D('town-banner-length', tileX, tileY + index) * 0.07,
    height: 0.82 + hash2D('town-banner-height', tileX - index, tileY) * 0.18,
    rotationY:
      hash2D('town-banner-rotation', tileX + index, tileY - index) * 0.45 - 0.22,
    baseRotation: 0.03 + hash2D('town-banner-base-rotation', tileX, tileY + index) * 0.03,
    color:
      palette[
        Math.floor(hash2D('town-banner-color', tileX + index, tileY + index) * palette.length)
      ] ?? palette[0],
  }));
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
  tileY: number
): TownStyle {
  return resolveTownStyle(three, tileX, tileY);
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
    const x = Math.floor(hash2D('town-wall-crack-x', regionX + index, regionY) * canvas.width);
    const y = Math.floor(hash2D('town-wall-crack-y', regionY + index, regionX) * canvas.height);
    const width = 2 + Math.floor(hash2D('town-wall-crack-w', regionX, regionY + index) * 4);
    context.fillStyle = 'rgba(90, 72, 58, 0.18)';
    context.fillRect(x, y, width, 1);
  }

  for (let index = 0; index < 12; index += 1) {
    const x = Math.floor(hash2D('town-wall-beam-x', regionX + index, regionY) * canvas.width);
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
    context.fillStyle =
      row % 12 === 0 ? trimColor : 'rgba(255,255,255,0.08)';
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 36; index += 1) {
    const x = Math.floor(hash2D('town-roof-chip-x', regionX + index, regionY) * canvas.width);
    const y = Math.floor(hash2D('town-roof-chip-y', regionY + index, regionX) * canvas.height);
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
}

interface TownStyleBlueprint {
  createMaterials(three: ThreeHostLike): TownStyle;
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
