import { hash2D } from '@bworlds/core';
import { paintPlainsBackdrop } from '@bworlds/paint-support';
import { canPlaceLandPoi } from '@bworlds/poi-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  getOrCreateRegionalValue,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import { createRouteTraversalProfile } from '@bworlds/tile-support';
import { createCanvasTexture } from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Paint2DContext,
  TileLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeTextureLike,
  TraversalProfile3D,
  WorldStateLike,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const SIGN_REGION_SIZE = 10;
const TREE_BARK_COLOR = '#4a2f1b';
const SIGN_TOWN_BUFFER = 8;
const JUNCTION_SIGN_THRESHOLD = 0.993;
const ROADSIDE_SIGN_THRESHOLD = 0.9992;
const signStyleCache = new Map<string, SignStyle>();

export function createSignTilePlugin() {
  return createTilePlugin('tile-sign', [
      {
        kind: 'sign',
        definition: {
          name: 'Sign Post',
          color: '#d97706',
          miniColor: '#f59e0b',
          walkable: true,
          wallHeight: 0.3,
        },
        getTraversalProfile3D(): TraversalProfile3D {
          return createRouteTraversalProfile();
        },
        classifyOverworldTile({
          x,
          y,
          tile,
          nearLand,
          signChance,
          townAnchors,
          bridgeAnchors,
          sampleTerrainSignals,
        }: ClassifyOverworldTileContext) {
          if (!canPlaceLandPoi(nearLand, tile.kind)) {
            return null;
          }

          const nearestTown = [...townAnchors].sort(
            (left, right) =>
              Math.hypot(x - left.x, y - left.y) -
              Math.hypot(x - right.x, y - right.y)
          )[0];
          const closeToTown =
            nearestTown &&
            Math.hypot(x - nearestTown.x, y - nearestTown.y) < SIGN_TOWN_BUFFER;
          const roadProfile = getRoadsideSignProfile({
            x,
            y,
            townAnchors,
            bridgeAnchors,
            sampleTerrainSignals,
          });

          if (roadProfile.onRoute) {
            return null;
          }

          const threshold = roadProfile.atJunction
            ? JUNCTION_SIGN_THRESHOLD
            : ROADSIDE_SIGN_THRESHOLD;
          const chance = signChance ?? 0;

          if (roadProfile.adjacentRoadCount === 0 || chance <= threshold) {
            return null;
          }

          if (!roadProfile.atJunction && !closeToTown) {
            return null;
          }

          return {
            kind: 'sign',
            note: nearestTown
              ? `A sign points travelers toward ${nearestTown.name ?? 'a nearby town'}.`
              : 'A weathered sign points farther down the road.',
          };
        },
        paint2D({ context, x, y, motif, fillRect }: Paint2DContext) {
          paintPlainsBackdrop({ context, x, y, motif, fillRect });
          const postX = 6 + motif.int(0, 2);
          fillRect(context, x + postX, y + 5, 2, 7, '#5b3716');
          fillRect(context, x + postX - 3, y + 3, 8, 4, '#f3c266');
          fillRect(context, x + postX - 2, y + 4, 6, 1, '#8a5a19');
          return true;
        },
        create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
          const style = getRegionalSignStyle(three, tileX, tileY);
          const group = new three.Group();
          const nearbyPois = getNearbyPois(state, tileX, tileY);
          const placardCount = Math.max(1, Math.min(3, nearbyPois.length || 1));
          const useSecondPost =
            placardCount > 2 && hash2D('sign-second-post', tileX, tileY) > 0.48;

          const primaryPost = createSignPost(three, style, placardCount);
          group.add(primaryPost);

          const placards =
            nearbyPois.length > 0
              ? nearbyPois.slice(0, 3)
              : [fallbackPlacard(tileX, tileY)];

          placards.forEach((poi, index) => {
            const mount =
              useSecondPost && index === 2
                ? createSecondaryPost(three, style)
                : primaryPost;

            if (useSecondPost && index === 2) {
              mount.position.x = 0.18 + style.postThickness * 0.7;
              group.add(mount);
            }

            const signArm = createDirectionalPlacard(three, style, poi, index);
            mount.add(signArm);
          });

          group.position.set(tileX, 0, tileY);
          return group;
        },
      },
    ]);
}

function getRoadsideSignProfile({
  x,
  y,
  townAnchors,
  bridgeAnchors,
  sampleTerrainSignals,
}: Pick<
  ClassifyOverworldTileContext,
  'x' | 'y' | 'townAnchors' | 'bridgeAnchors' | 'sampleTerrainSignals'
>) {
  const cardinalRoads = [
    predictRoadPresence(
      x,
      y - 1,
      townAnchors,
      bridgeAnchors,
      sampleTerrainSignals
    ),
    predictRoadPresence(
      x + 1,
      y,
      townAnchors,
      bridgeAnchors,
      sampleTerrainSignals
    ),
    predictRoadPresence(
      x,
      y + 1,
      townAnchors,
      bridgeAnchors,
      sampleTerrainSignals
    ),
    predictRoadPresence(
      x - 1,
      y,
      townAnchors,
      bridgeAnchors,
      sampleTerrainSignals
    ),
  ];
  const north = cardinalRoads[0];
  const east = cardinalRoads[1];
  const south = cardinalRoads[2];
  const west = cardinalRoads[3];
  const adjacentRoadCount = cardinalRoads.filter(Boolean).length;
  const touchesHorizontal = east || west;
  const touchesVertical = north || south;
  return {
    onRoute: predictRoadPresence(
      x,
      y,
      townAnchors,
      bridgeAnchors,
      sampleTerrainSignals
    ),
    adjacentRoadCount,
    atJunction:
      adjacentRoadCount >= 2 &&
      touchesHorizontal &&
      touchesVertical,
  };
}

function predictRoadPresence(
  x: number,
  y: number,
  townAnchors: ClassifyOverworldTileContext['townAnchors'],
  bridgeAnchors: ClassifyOverworldTileContext['bridgeAnchors'],
  sampleTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals']
) {
  if (isConnectedRoad(x, y, townAnchors, bridgeAnchors)) {
    return true;
  }

  if (!sampleTerrainSignals) {
    return false;
  }

  const roadSignal = sampleTerrainSignals(x, y).roadSignal;
  if (roadSignal <= 0.9) {
    return false;
  }

  const north = sampleTerrainSignals(x, y - 1).roadSignal;
  const east = sampleTerrainSignals(x + 1, y).roadSignal;
  const south = sampleTerrainSignals(x, y + 1).roadSignal;
  const west = sampleTerrainSignals(x - 1, y).roadSignal;
  const horizontalRidge =
    roadSignal >= north && roadSignal >= south && roadSignal > 0.91;
  const verticalRidge =
    roadSignal >= east && roadSignal >= west && roadSignal > 0.91;
  return horizontalRidge || verticalRidge;
}

function isConnectedRoad(
  x: number,
  y: number,
  townAnchors: ClassifyOverworldTileContext['townAnchors'],
  bridgeAnchors: ClassifyOverworldTileContext['bridgeAnchors']
) {
  const nearestTown = townAnchors
    .map((anchor) => ({
      anchor,
      distance: Math.hypot(x - anchor.x, y - anchor.y),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (
    nearestTown &&
    nearestTown.distance < 1.1 &&
    (Math.abs(x - nearestTown.anchor.x) < 0.35 ||
      Math.abs(y - nearestTown.anchor.y) < 0.35)
  ) {
    return true;
  }

  for (let index = 0; index < townAnchors.length; index += 1) {
    for (let next = index + 1; next < townAnchors.length; next += 1) {
      const a = townAnchors[index];
      const b = townAnchors[next];
      if (Math.hypot(a.x - b.x, a.y - b.y) > 28) {
        continue;
      }
      if (distanceToLineSegment(x, y, a.x, a.y, b.x, b.y) < 0.42) {
        return true;
      }
    }
  }

  if (nearestTown) {
    const nearestBridge = bridgeAnchors
      .map((anchor) => ({
        anchor,
        distance: Math.hypot(
          nearestTown.anchor.x - anchor.x,
          nearestTown.anchor.y - anchor.y
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];

    if (
      nearestBridge &&
      nearestBridge.distance <= 16 &&
      distanceToLineSegment(
        x,
        y,
        nearestTown.anchor.x,
        nearestTown.anchor.y,
        nearestBridge.anchor.x,
        nearestBridge.anchor.y
      ) < 0.38
    ) {
      return true;
    }
  }

  return bridgeAnchors.some((bridge) => Math.hypot(x - bridge.x, y - bridge.y) < 0.8);
}

function distanceToLineSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSquared = abx * abx + aby * aby;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.min(
    1,
    Math.max(0, (apx * abx + apy * aby) / lengthSquared)
  );
  const nearestX = ax + abx * t;
  const nearestY = ay + aby * t;
  return Math.hypot(px - nearestX, py - nearestY);
}

function createSignPost(
  three: ThreeHostLike,
  style: SignStyle,
  placardCount: number
) {
  const post = new three.Group();
  const postMesh = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness,
      style.postHeight,
      style.postThickness
    ),
    style.postMaterial
  );
  postMesh.position.y = style.postHeight * 0.5;
  post.add(postMesh);

  if (placardCount > 1) {
    const brace = new three.Mesh(
      new three.BoxGeometry(
        style.postThickness * 2.1,
        style.postThickness * 0.8,
        style.postThickness * 2.1
      ),
      style.trimMaterial
    );
    brace.position.y = style.postHeight * 0.78;
    post.add(brace);
  }

  return post;
}

function createSecondaryPost(three: ThreeHostLike, style: SignStyle) {
  const post = new three.Group();
  const mesh = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness * 0.92,
      style.postHeight * 0.84,
      style.postThickness * 0.92
    ),
    style.postMaterial
  );
  mesh.position.y = style.postHeight * 0.42;
  post.add(mesh);
  return post;
}

function createDirectionalPlacard(
  three: ThreeHostLike,
  style: SignStyle,
  poi: NearbyPoi,
  index: number
) {
  const group = new three.Group();
  const width = style.placardWidth * (poi.name.length > 12 ? 1.15 : 1);
  const height = style.placardHeight;
  const depth = style.placardDepth;
  const heading = Math.atan2(poi.dy, poi.dx);
  const rowOffset = style.postHeight * (0.68 - index * 0.14);
  const armLength = 0.14 + index * 0.035;

  group.position.y = rowOffset;
  group.rotation.y = -heading;

  const placard = new three.Mesh(
    new three.BoxGeometry(width, height, depth),
    style.placardMaterial
  );
  placard.position.x = width * 0.5 + armLength;
  group.add(placard);

  const arrowHead = new three.Mesh(
    new three.ConeGeometry(height * 0.46, height * 0.68, 3),
    style.placardMaterial
  );
  arrowHead.rotation.z = -Math.PI * 0.5;
  arrowHead.position.set(width + armLength + height * 0.24, 0, 0);
  arrowHead.scale.set(1.05, 1, 1.35);
  group.add(arrowHead);

  const edgeCap = new three.Mesh(
    new three.BoxGeometry(depth * 1.4, height * 0.9, depth * 1.4),
    style.trimMaterial
  );
  edgeCap.position.x = width + armLength - depth * 0.2;
  group.add(edgeCap);

  const support = new three.Mesh(
    new three.BoxGeometry(armLength + 0.06, depth * 0.9, depth * 0.9),
    style.postMaterial
  );
  support.position.x = armLength * 0.5 + 0.03;
  group.add(support);

  const textPlane = createSignLabelSprite(three, style, poi, width, height);
  textPlane.position.set(width * 0.5 + armLength, 0, depth * 0.65);
  group.add(textPlane);

  const backPlane = createSignLabelSprite(three, style, poi, width, height);
  backPlane.position.set(width * 0.5 + armLength, 0, -depth * 0.65);
  backPlane.rotation.y = Math.PI;
  group.add(backPlane);

  return group;
}

function createSignLabelSprite(
  three: ThreeHostLike,
  style: SignStyle,
  poi: NearbyPoi,
  width: number,
  height: number
) {
  const texture = getSignLabelTexture(three, style, poi);
  return new three.Mesh(
    new three.PlaneGeometry(width * 0.92, height * 0.78),
    new three.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    })
  );
}

function getSignLabelTexture(
  three: ThreeHostLike,
  style: SignStyle,
  poi: NearbyPoi
) {
  const key = `${style.key}:${poi.name}:${poi.arrow}`;
  if (!style.labelCache.has(key)) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = style.placardColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = style.trimColor;
    context.lineWidth = 6;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    context.fillStyle = style.textColor;
    context.font = 'bold 28px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const mainY = poi.distance > 20 ? 34 : 46;
    context.fillText(`${poi.arrow} ${poi.name}`, canvas.width * 0.5, mainY);
    if (poi.distance > 20) {
      context.font = '16px sans-serif';
      context.fillText(`${Math.round(poi.distance)}`, canvas.width * 0.5, 70);
    }

    style.labelCache.set(
      key,
      createCanvasTexture(three, canvas, { wrap: false })
    );
  }

  return style.labelCache.get(key);
}

function getNearbyPois(
  state: WorldStateLike,
  signX: number,
  signY: number
): NearbyPoi[] {
  const context = state.getCurrentContext();
  if (context.type !== 'overworld') {
    return [];
  }

  const candidates: NearbyPoi[] = [];
  for (let y = signY - 40; y <= signY + 40; y += 1) {
    for (let x = signX - 40; x <= signX + 40; x += 1) {
      if (x === signX && y === signY) continue;
      const tile = state.getCurrentTile(x, y) as TileLike;
      if (!tile.poi?.name) continue;
      const dx = x - signX;
      const dy = y - signY;
      const distance = Math.hypot(dx, dy);
      if (distance > 40) continue;
      candidates.push({
        x,
        y,
        dx,
        dy,
        distance,
        name: tile.poi.name,
        arrow: arrowFromVector(dx, dy),
      });
    }
  }

  return candidates
    .sort((left, right) => left.distance - right.distance)
    .filter(
      (candidate, index, all) =>
        all.findIndex((entry) => entry.name === candidate.name) === index
    )
    .slice(0, 3);
}

function fallbackPlacard(tileX: number, tileY: number): NearbyPoi {
  return {
    x: tileX,
    y: tileY,
    dx: 1,
    dy: 0,
    distance: 0.8,
    name: 'Frontier',
    arrow: 'E',
  };
}

function getRegionalSignStyle(
  three: ThreeHostLike,
  tileX: number,
  tileY: number
): SignStyle {
  return getOrCreateRegionalValue(
    signStyleCache,
    tileX,
    tileY,
    SIGN_REGION_SIZE,
    ({ regionX, regionY, key }) => {
      const postHeight =
        1.12 + hash2D('sign-post-height', regionX, regionY) * 0.42;
      const postThickness =
        0.07 + hash2D('sign-post-thickness', regionX, regionY) * 0.04;
      const placardWidth =
        0.54 + hash2D('sign-placard-width', regionX, regionY) * 0.16;
      const placardHeight =
        0.16 + hash2D('sign-placard-height', regionX, regionY) * 0.05;
      const placardDepth =
        0.035 + hash2D('sign-placard-depth', regionX, regionY) * 0.02;
      const barkTint = hash2D('sign-bark', regionX, regionY);
      const placardTint = hash2D('sign-placard', regionX, regionY);
      const trimTint = hash2D('sign-trim', regionX, regionY);
      const postColor = pickThresholdColor(
        barkTint,
        0.5,
        '#5a3418',
        TREE_BARK_COLOR
      );
      const placardColor = pickThresholdColor(
        placardTint,
        0.45,
        '#f0c979',
        '#e2b762'
      );
      const trimColor = pickThresholdColor(trimTint, 0.5, '#7c4a1a', '#8c5b24');
      const textColor = '#24150c';

      return {
        key,
        postHeight,
        postThickness,
        placardWidth,
        placardHeight,
        placardDepth,
        placardColor,
        trimColor,
        textColor,
        labelCache: new Map(),
        postMaterial: new three.MeshStandardMaterial({
          color: postColor,
          roughness: 0.94,
          metalness: 0.02,
        }),
        placardMaterial: new three.MeshStandardMaterial({
          color: placardColor,
          roughness: 0.88,
          metalness: 0.02,
        }),
        trimMaterial: new three.MeshStandardMaterial({
          color: trimColor,
          roughness: 0.86,
          metalness: 0.03,
        }),
      };
    }
  );
}

function arrowFromVector(dx: number, dy: number) {
  const angle = Math.atan2(dy, dx);
  const octant = Math.round(angle / (Math.PI / 4) + 8) % 8;
  return ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'][octant];
}

interface NearbyPoi {
  x: number;
  y: number;
  dx: number;
  dy: number;
  distance: number;
  name: string;
  arrow: string;
}

interface SignStyle {
  key: string;
  postHeight: number;
  postThickness: number;
  placardWidth: number;
  placardHeight: number;
  placardDepth: number;
  placardColor: string;
  trimColor: string;
  textColor: string;
  labelCache: Map<string, ThreeTextureLike>;
  postMaterial: ThreeMaterialLike;
  placardMaterial: ThreeMaterialLike;
  trimMaterial: ThreeMaterialLike;
}
