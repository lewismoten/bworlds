import { hash2D } from '@bworlds/core';
import {
  createAnchoredEnterablePoiTilePlugin,
  pickPreferredLandmarkFacing,
} from '@bworlds/poi-support';
import {
  createRegionalValueResolver,
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
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeTextureLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;

export function createDungeonTilePlugin() {
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
    create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
      const group = new three.Group();
      const style = getDungeonStyle(three, tileX, tileY);
      const entrance = getDungeonEntranceDirection(state, tileX, tileY);
      const baseWidth = 0.9 + hash2D('dungeon-width', tileX, tileY) * 0.16;
      const baseDepth = 0.9 + hash2D('dungeon-depth', tileX, tileY) * 0.18;
      const baseHeight = 0.7 + hash2D('dungeon-height', tileX, tileY) * 0.16;

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

      group.add(gate);
      return group;
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
    2 + Math.floor(hash2D('dungeon-tower-count', tileX, tileY) * 3);
  const corners = [
    { x: -baseWidth * 0.42, z: -baseDepth * 0.42 },
    { x: baseWidth * 0.42, z: -baseDepth * 0.42 },
    { x: baseWidth * 0.42, z: baseDepth * 0.42 },
    { x: -baseWidth * 0.42, z: baseDepth * 0.42 },
  ];

  return corners.slice(0, towerCount).map((corner, index) => ({
    ...corner,
    radius: 0.1 + hash2D('dungeon-tower-radius', tileX + index, tileY) * 0.03,
    height: 0.72 + hash2D('dungeon-tower-height', tileX, tileY + index) * 0.22,
    capHeight: 0.14 + hash2D('dungeon-tower-cap', tileX - index, tileY) * 0.08,
  }));
}

function getDungeonEntranceDirection(state, tileX: number, tileY: number) {
  return pickPreferredLandmarkFacing({
    state,
    tileX,
    tileY,
    seedKey: 'dungeon-facing',
  });
}

const dungeonStyleCache = new Map<string, DungeonStyleBlueprint>();
const resolveDungeonStyle = createRegionalValueResolver(
  dungeonStyleCache,
  18,
  ({ regionX, regionY }) => {
    const wallBase = pickThresholdColor(
      hash2D('dungeon-wall-tone', regionX, regionY),
      0.5,
      '#7b7064',
      '#645b53'
    );
    const roofBase = pickThresholdColor(
      hash2D('dungeon-roof-tone', regionX, regionY),
      0.5,
      '#4b1f1f',
      '#374151'
    );
    const trimBase = pickThresholdColor(
      hash2D('dungeon-trim-tone', regionX, regionY),
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

function getDungeonStyle(three: ThreeHostLike, tileX: number, tileY: number) {
  const style = resolveDungeonStyle(tileX, tileY);
  return style.createMaterials(three);
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
    const x = Math.floor(hash2D('dungeon-stone-chip-x', regionX + index, regionY) * canvas.width);
    const y = Math.floor(hash2D('dungeon-stone-chip-y', regionY + index, regionX) * canvas.height);
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
    const x = Math.floor(hash2D('dungeon-roof-x', regionX + index, regionY) * canvas.width);
    const y = Math.floor(hash2D('dungeon-roof-y', regionY + index, regionX) * canvas.height);
    context.fillStyle = 'rgba(17,24,39,0.2)';
    context.fillRect(x, y, 2, 1);
  }
}

function createDungeonBarTexture(three: ThreeHostLike) {
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
