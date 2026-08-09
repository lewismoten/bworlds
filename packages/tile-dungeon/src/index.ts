import { createBoundedCache } from '@bworlds/cache-support';
import { hash2D, registerHashLabel } from '@bworlds/core/hash';
import {
  createAnchoredEnterablePoiTilePlugin,
  markPoiLightEmitter,
  markPoiWindResponder,
  pickPreferredLandmarkFacing,
  syncPoiLightEmitters,
  syncPoiWindResponders,
} from '@bworlds/poi-support';
import {
  createRegionalMaterialResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import {
  createBasicMaterial,
  createPaintedCanvasTexture,
  createPaintedStandardMaterial,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  Paint2DContext,
  RuntimePlugin,
  ThreeObject3DLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeTextureLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const DUNGEON_BEACON_KEY = 'dungeonBeacon';
const DUNGEON_BANNER_KEY = 'dungeonBanner';
const DUNGEON_STYLE_CACHE_LIMIT = 96;
const DUNGEON_WIDTH_SEED = registerHashLabel('dungeon-width');
const DUNGEON_DEPTH_SEED = registerHashLabel('dungeon-depth');
const DUNGEON_HEIGHT_SEED = registerHashLabel('dungeon-height');
const DUNGEON_TOWER_COUNT_SEED = registerHashLabel('dungeon-tower-count');
const DUNGEON_TOWER_RADIUS_SEED = registerHashLabel('dungeon-tower-radius');
const DUNGEON_TOWER_HEIGHT_SEED = registerHashLabel('dungeon-tower-height');
const DUNGEON_TOWER_CAP_SEED = registerHashLabel('dungeon-tower-cap');
const DUNGEON_BEACON_SCALE_SEED = registerHashLabel('dungeon-beacon-scale');
const DUNGEON_BEACON_INTENSITY_SEED = registerHashLabel('dungeon-beacon-intensity');
const DUNGEON_BEACON_DISTANCE_SEED = registerHashLabel('dungeon-beacon-distance');
const DUNGEON_BEACON_GLOW_SEED = registerHashLabel('dungeon-beacon-glow');
const DUNGEON_FACING_SEED = registerHashLabel('dungeon-facing');
const DUNGEON_WALL_TONE_SEED = registerHashLabel('dungeon-wall-tone');
const DUNGEON_ROOF_TONE_SEED = registerHashLabel('dungeon-roof-tone');
const DUNGEON_TRIM_TONE_SEED = registerHashLabel('dungeon-trim-tone');
const DUNGEON_BANNER_SPEED_SEED = registerHashLabel('dungeon-banner-speed');
const DUNGEON_BANNER_GUST_SPEED_SEED = registerHashLabel('dungeon-banner-gust-speed');
const DUNGEON_BANNER_PHASE_SEED = registerHashLabel('dungeon-banner-phase');
const DUNGEON_BANNER_GUST_PHASE_SEED = registerHashLabel('dungeon-banner-gust-phase');
const DUNGEON_BANNER_COLOR_SEED = registerHashLabel('dungeon-banner-color');
const DUNGEON_STONE_CHIP_X_SEED = registerHashLabel('dungeon-stone-chip-x');
const DUNGEON_STONE_CHIP_Y_SEED = registerHashLabel('dungeon-stone-chip-y');
const DUNGEON_ROOF_X_SEED = registerHashLabel('dungeon-roof-x');
const DUNGEON_ROOF_Y_SEED = registerHashLabel('dungeon-roof-y');

export function createDungeonTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-dungeon',
    kind: 'dungeon',
    definition: {
      name: 'Dungeon',
      color: '#991b1b',
      miniColor: '#ef4444',
      walkable: true,
      wallHeight: 0.65,
    },
    note: 'A dungeon descent awaits.',
    paint2D({ context, x, y, motif, fillRect, speckle }: Paint2DContext) {
      fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#4b1d1d');
      speckle(context, x, y, '#7f1d1d', 20, 0.3, motif);
      const mouth = 4 + motif.int(-1, 1);
      fillRect(context, x + mouth, y + 4, 8, 8, '#111827');
      fillRect(context, x + mouth + 2, y + 6, 4, 6, '#dc2626');
      return true;
    },
    create3DModel({
      three,
      state,
      tileX,
      tileY,
      detailLevel = 'full',
    }: Create3DModelContext) {
      const group = new three.Group();
      const style = getDungeonStyle(three, tileX, tileY);
      const entrance = getDungeonEntranceDirection(state, tileX, tileY);
      const baseWidth = 0.9 + hash2D(DUNGEON_WIDTH_SEED, tileX, tileY) * 0.16;
      const baseDepth = 0.9 + hash2D(DUNGEON_DEPTH_SEED, tileX, tileY) * 0.18;
      const baseHeight = 0.7 + hash2D(DUNGEON_HEIGHT_SEED, tileX, tileY) * 0.16;

      const base = new three.Mesh(
        new three.BoxGeometry(baseWidth, baseHeight, baseDepth),
        style.wallMaterial
      );
      base.position.set(tileX, baseHeight * 0.5, tileY);
      group.add(base);

      const keep = new three.Mesh(
        new three.BoxGeometry(
          baseWidth * 0.62,
          baseHeight * 0.8,
          baseDepth * 0.62
        ),
        style.wallMaterial
      );
      keep.position.set(tileX, baseHeight * 0.9, tileY);
      group.add(keep);

      for (const tower of getDungeonTowerOffsets(
        tileX,
        tileY,
        baseWidth,
        baseDepth
      )) {
        const towerMesh = new three.Mesh(
          new three.CylinderGeometry(
            tower.radius,
            tower.radius * 1.08,
            tower.height,
            6
          ),
          style.wallMaterial
        );
        towerMesh.position.set(
          tileX + tower.x,
          tower.height * 0.5,
          tileY + tower.z
        );
        group.add(towerMesh);

        const cap = new three.Mesh(
          new three.ConeGeometry(tower.radius * 1.08, tower.capHeight, 6),
          style.roofMaterial
        );
        cap.position.set(
          tileX + tower.x,
          tower.height + tower.capHeight * 0.5 - 0.02,
          tileY + tower.z
        );
        group.add(cap);
      }

      const gate = new three.Group();
      gate.position.set(
        tileX + entrance.dx * (baseDepth * 0.42),
        0,
        tileY + entrance.dy * (baseDepth * 0.42)
      );
      gate.rotation.y = entrance.rotationY;

      const arch = new three.Mesh(
        new three.TorusGeometry(0.18, 0.04, 6, 12, Math.PI),
        style.trimMaterial
      );
      arch.position.set(0, 0.33, 0.03);
      arch.rotation.z = Math.PI;
      gate.add(arch);

      const leftPost = new three.Mesh(
        new three.BoxGeometry(0.08, 0.34, 0.08),
        style.trimMaterial
      );
      leftPost.position.set(-0.16, 0.17, 0.03);
      gate.add(leftPost);

      const rightPost = new three.Mesh(
        new three.BoxGeometry(0.08, 0.34, 0.08),
        style.trimMaterial
      );
      rightPost.position.set(0.16, 0.17, 0.03);
      gate.add(rightPost);

      const portcullis = new three.Mesh(
        new three.PlaneGeometry(0.24, 0.28),
        createBasicMaterial(three, {
          color: '#111827',
          side: three.DoubleSide,
        })
      );
      portcullis.position.set(0, 0.17, 0.08);
      gate.add(portcullis);

      const bars = new three.Mesh(
        new three.BoxGeometry(0.22, 0.26, 0.02),
        style.barMaterial
      );
      bars.position.set(0, 0.17, 0.02);
      gate.add(bars);

      const darkness = new three.Mesh(
        new three.CircleGeometry(0.12, 18),
        createBasicMaterial(three, {
          color: '#000000',
          side: three.DoubleSide,
        })
      );
      darkness.position.set(0, 0.15, -0.1);
      gate.add(darkness);

      createDungeonBeacon(
        three,
        gate,
        {
          x: 0,
          y: 0.42,
          z: 0.06,
          glowScale: 0.04,
          pointLightY: 0.4,
          pointLightZ: 0.03,
          glowDayIntensity: 0.02,
          glowNightIntensity: 1.45,
          pointLightIntensity: 0.95,
          pointLightDistance: 3.6,
          pointLightDecay: 1.85,
          label: 'gate',
        },
        style
      );

      group.add(gate);

      if (detailLevel === 'full') {
        getDungeonTowerBeaconDescriptors(tileX, tileY, baseWidth, baseDepth).forEach(
          (beacon) => {
            createDungeonBeacon(three, group, beacon, style);
          }
        );
        getDungeonBannerDescriptors(tileX, tileY, baseWidth, baseDepth).forEach(
          (banner, index) => {
            group.add(createDungeonBanner(three, banner, style, tileX, tileY, index));
          }
        );
      }

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

function getDungeonTowerOffsets(
  tileX: number,
  tileY: number,
  baseWidth: number,
  baseDepth: number
) {
  const towerCount =
    2 + Math.floor(hash2D(DUNGEON_TOWER_COUNT_SEED, tileX, tileY) * 3);
  const corners = [
    { x: -baseWidth * 0.42, z: -baseDepth * 0.42 },
    { x: baseWidth * 0.42, z: -baseDepth * 0.42 },
    { x: baseWidth * 0.42, z: baseDepth * 0.42 },
    { x: -baseWidth * 0.42, z: baseDepth * 0.42 },
  ];
  const towers: Array<{
    x: number;
    z: number;
    radius: number;
    height: number;
    capHeight: number;
  }> = [];
  for (let index = 0; index < towerCount; index += 1) {
    const corner = corners[index]!;
    towers.push({
      x: corner.x,
      z: corner.z,
      radius: 0.1 + hash2D(DUNGEON_TOWER_RADIUS_SEED, tileX + index, tileY) * 0.03,
      height: 0.72 + hash2D(DUNGEON_TOWER_HEIGHT_SEED, tileX, tileY + index) * 0.22,
      capHeight: 0.14 + hash2D(DUNGEON_TOWER_CAP_SEED, tileX - index, tileY) * 0.08,
    });
  }
  return towers;
}

function getDungeonTowerBeaconDescriptors(
  tileX: number,
  tileY: number,
  baseWidth: number,
  baseDepth: number
): DungeonBeaconDescriptor[] {
  return getDungeonTowerOffsets(tileX, tileY, baseWidth, baseDepth).map(
    (tower, index) => ({
      x: tileX + tower.x,
      y: tower.height + tower.capHeight * 0.42,
      z: tileY + tower.z,
      glowScale: 0.034 + hash2D(DUNGEON_BEACON_SCALE_SEED, tileX + index, tileY) * 0.01,
      pointLightY: tower.height + tower.capHeight * 0.34,
      pointLightZ: tileY + tower.z,
      pointLightIntensity:
        0.46 + hash2D(DUNGEON_BEACON_INTENSITY_SEED, tileX, tileY + index) * 0.18,
      pointLightDistance:
        2.2 + hash2D(DUNGEON_BEACON_DISTANCE_SEED, tileX - index, tileY) * 0.4,
      pointLightDecay: 1.9,
      glowDayIntensity: 0.01,
      glowNightIntensity:
        0.82 + hash2D(DUNGEON_BEACON_GLOW_SEED, tileX + index, tileY - index) * 0.18,
      label: `tower-${index}`,
    })
  );
}

function getDungeonEntranceDirection(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
): ReturnType<typeof pickPreferredLandmarkFacing> {
  return pickPreferredLandmarkFacing({
    state,
    tileX,
    tileY,
    seedKey: DUNGEON_FACING_SEED,
  });
}

const dungeonStyleCache = createBoundedCache<string, DungeonStyleBlueprint>(
  DUNGEON_STYLE_CACHE_LIMIT
);
const resolveDungeonStyle = createRegionalMaterialResolver(
  dungeonStyleCache,
  18,
  ({ regionX, regionY }) => {
    const wallBase = pickThresholdColor(
      hash2D(DUNGEON_WALL_TONE_SEED, regionX, regionY),
      0.5,
      '#7b7064',
      '#645b53'
    );
    const roofBase = pickThresholdColor(
      hash2D(DUNGEON_ROOF_TONE_SEED, regionX, regionY),
      0.5,
      '#4b1f1f',
      '#374151'
    );
    const trimBase = pickThresholdColor(
      hash2D(DUNGEON_TRIM_TONE_SEED, regionX, regionY),
      0.5,
      '#2f241c',
      '#1f2937'
    );
    return {
      createMaterials(three: ThreeHostLike) {
        const barTexture = createDungeonBarTexture(three);
        return {
          wallMaterial: createPaintedStandardMaterial(three, {
            color: '#ffffff',
            roughness: 0.95,
            metalness: 0.03,
            width: 64,
            height: 64,
            repeatX: 1.2,
            repeatY: 1.2,
            paint(context, canvas) {
              paintDungeonStoneTexture(
                context,
                canvas,
                wallBase,
                trimBase,
                regionX,
                regionY
              );
            },
          }),
          roofMaterial: createPaintedStandardMaterial(three, {
            color: '#ffffff',
            roughness: 0.9,
            metalness: 0.04,
            width: 64,
            height: 64,
            repeatX: 1.2,
            repeatY: 1.2,
            paint(context, canvas) {
              paintDungeonRoofTexture(
                context,
                canvas,
                roofBase,
                trimBase,
                regionX,
                regionY
              );
            },
          }),
          trimMaterial: new three.MeshStandardMaterial({
            color: trimBase,
            roughness: 0.88,
            metalness: 0.05,
          }),
          barMaterial: new three.MeshStandardMaterial({
            color: '#ffffff',
            map: barTexture,
            roughness: 0.7,
            metalness: 0.18,
          }),
        };
      },
    };
  }
);

function getDungeonStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number
): DungeonStyle {
  return resolveDungeonStyle(three, tileX, tileY);
}

function createDungeonBeacon(
  three: ThreeHostLike,
  parent: ThreeObject3DLike,
  descriptor: DungeonBeaconDescriptor,
  style: DungeonStyle
) {
  const brazier = new three.Mesh(
    new three.CylinderGeometry(0.05, 0.06, 0.06, 6),
    style.trimMaterial
  );
  brazier.position.set(descriptor.x, descriptor.y - 0.02, descriptor.z);
  brazier.userData = {
    ...(brazier.userData ?? {}),
    [DUNGEON_BEACON_KEY]: descriptor.label,
  };
  parent.add(brazier);

  const glow = markPoiLightEmitter(
    new three.Mesh(
      new three.SphereGeometry(descriptor.glowScale, 6, 6),
      new three.MeshStandardMaterial({
        color: '#ef4444',
        emissive: '#ef4444',
        emissiveIntensity: descriptor.glowDayIntensity,
        roughness: 0.3,
        metalness: 0.04,
      })
    ),
    {
      kind: 'emissive-mesh',
      dayIntensity: descriptor.glowDayIntensity,
      nightIntensity: descriptor.glowNightIntensity,
    }
  );
  glow.position.set(descriptor.x, descriptor.y, descriptor.z);
  glow.userData = {
    ...(glow.userData ?? {}),
    [DUNGEON_BEACON_KEY]: descriptor.label,
  };
  parent.add(glow);

  const pointLight = markPoiLightEmitter(
    new three.PointLight('#f87171', 0, descriptor.pointLightDistance, descriptor.pointLightDecay),
    {
      kind: 'point-light',
      nightIntensity: descriptor.pointLightIntensity,
      visibleThreshold: 0.04,
    }
  );
  pointLight.position.set(descriptor.x, descriptor.pointLightY, descriptor.pointLightZ);
  pointLight.visible = false;
  pointLight.userData = {
    ...(pointLight.userData ?? {}),
    [DUNGEON_BEACON_KEY]: descriptor.label,
  };
  parent.add(pointLight);
}

function createDungeonBanner(
  three: ThreeHostLike,
  descriptor: DungeonBannerDescriptor,
  style: DungeonStyle,
  tileX: number,
  tileY: number,
  index: number
) {
  const banner = new three.Group();
  banner.position.set(descriptor.x, descriptor.y, descriptor.z);
  banner.rotation.y = descriptor.rotationY;

  const pole = new three.Mesh(
    new three.CylinderGeometry(0.018, 0.022, descriptor.height, 5),
    style.trimMaterial
  );
  pole.position.y = descriptor.height * 0.5;
  banner.add(pole);

  const crossbar = new three.Mesh(
    new three.BoxGeometry(descriptor.width * 0.88, 0.028, 0.028),
    style.trimMaterial
  );
  crossbar.position.set(descriptor.width * 0.46, descriptor.height - 0.03, 0);
  banner.add(crossbar);

  const cloth = markPoiWindResponder(
    new three.Mesh(
      new three.PlaneGeometry(descriptor.width, descriptor.length),
      new three.MeshStandardMaterial({
        color: descriptor.color,
        emissive: descriptor.color,
        emissiveIntensity: 0.03,
        roughness: 0.86,
        metalness: 0.02,
        side: three.DoubleSide,
      })
    ),
    {
      axis: 'z',
      baseRotation: descriptor.baseRotation,
      idleAmplitude: 0.016,
      windAmplitude: 0.12,
      gustAmplitude: 0.045,
      speed: 1.2 + hash2D(DUNGEON_BANNER_SPEED_SEED, tileX + index, tileY) * 0.8,
      gustSpeed:
        1.9 + hash2D(DUNGEON_BANNER_GUST_SPEED_SEED, tileX, tileY + index) * 0.9,
      phase:
        hash2D(DUNGEON_BANNER_PHASE_SEED, tileX + index, tileY - index) * Math.PI * 2,
      gustPhase:
        hash2D(DUNGEON_BANNER_GUST_PHASE_SEED, tileX - index, tileY + index) *
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
    [DUNGEON_BANNER_KEY]: descriptor.label,
  };
  banner.add(cloth);
  return banner;
}

function getDungeonBannerDescriptors(
  tileX: number,
  tileY: number,
  baseWidth: number,
  baseDepth: number
): DungeonBannerDescriptor[] {
  const color = pickThresholdColor(
    hash2D(DUNGEON_BANNER_COLOR_SEED, tileX, tileY),
    0.5,
    '#7c3aed',
    '#b91c1c'
  );
  return [
    {
      label: 'gate-left',
      x: tileX - baseWidth * 0.16,
      y: 0,
      z: tileY + baseDepth * 0.46,
      width: 0.16,
      length: 0.24,
      height: 0.96,
      rotationY: 0,
      baseRotation: -0.02,
      color,
    },
    {
      label: 'gate-right',
      x: tileX + baseWidth * 0.16,
      y: 0,
      z: tileY + baseDepth * 0.46,
      width: 0.16,
      length: 0.26,
      height: 1,
      rotationY: 0,
      baseRotation: 0.02,
      color,
    },
  ];
}

function paintDungeonStoneTexture(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  baseColor: string,
  accentColor: string,
  regionX: number,
  regionY: number
) {
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 12) {
    context.fillStyle = 'rgba(255,255,255,0.12)';
    context.fillRect(0, row, canvas.width, 1);
    context.fillStyle = accentColor;
    const shift = ((row / 12) % 2) * 10;
    for (let col = -10 + shift; col < canvas.width + 10; col += 20) {
      context.fillRect(col, row, 2, 12);
    }
  }

  for (let index = 0; index < 60; index += 1) {
    const x = Math.floor(
      hash2D(DUNGEON_STONE_CHIP_X_SEED, regionX + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D(DUNGEON_STONE_CHIP_Y_SEED, regionY + index, regionX) * canvas.height
    );
    context.fillStyle = 'rgba(255,255,255,0.08)';
    context.fillRect(x, y, 2, 1);
  }
}

function paintDungeonRoofTexture(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  baseColor: string,
  accentColor: string,
  regionX: number,
  regionY: number
) {
  context.fillStyle = baseColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < canvas.height; row += 6) {
    context.fillStyle = row % 12 === 0 ? accentColor : 'rgba(255,255,255,0.06)';
    context.fillRect(0, row, canvas.width, 2);
  }

  for (let index = 0; index < 40; index += 1) {
    const x = Math.floor(
      hash2D(DUNGEON_ROOF_X_SEED, regionX + index, regionY) * canvas.width
    );
    const y = Math.floor(
      hash2D(DUNGEON_ROOF_Y_SEED, regionY + index, regionX) * canvas.height
    );
    context.fillStyle = 'rgba(17,24,39,0.2)';
    context.fillRect(x, y, 2, 1);
  }
}

function createDungeonBarTexture(three: ThreeHostLike): ThreeTextureLike {
  return createPaintedCanvasTexture(three, {
    width: 32,
    height: 64,
    repeatX: 1,
    repeatY: 1,
    paint(context, canvas) {
      context.fillStyle = '#2b3139';
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (let x = 2; x < canvas.width; x += 6) {
        context.fillStyle = '#717b88';
        context.fillRect(x, 0, 2, canvas.height);
      }
      for (let y = 8; y < canvas.height; y += 12) {
        context.fillStyle = 'rgba(255,255,255,0.16)';
        context.fillRect(0, y, canvas.width, 2);
      }
    },
  });
}

interface DungeonStyle {
  wallMaterial: ThreeMaterialLike;
  roofMaterial: ThreeMaterialLike;
  trimMaterial: ThreeMaterialLike;
  barMaterial: ThreeMaterialLike;
}

interface DungeonStyleBlueprint {
  createMaterials(three: ThreeHostLike): DungeonStyle;
}

interface DungeonBeaconDescriptor {
  x: number;
  y: number;
  z: number;
  glowScale: number;
  pointLightY: number;
  pointLightZ: number;
  glowDayIntensity: number;
  glowNightIntensity: number;
  pointLightIntensity: number;
  pointLightDistance: number;
  pointLightDecay: number;
  label: string;
}

interface DungeonBannerDescriptor {
  label: string;
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
