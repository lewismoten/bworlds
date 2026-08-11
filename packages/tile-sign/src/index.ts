import { createBoundedCache, type CacheLike } from '@bworlds/cache-support';
import { hash2D, registerHashLabel } from '@bworlds/core/hash';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  canPlaceLandPoi,
  markPoiLightEmitter,
  resolvePlacementChance,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import {
  createHostMaterialResolver,
  createRegionalMaterialResolver,
  pickThresholdColor,
} from '@bworlds/procedural-style';
import {
  createRoadsideRouteProfile,
  createRouteTraversalProfile,
} from '@bworlds/tile-support';
import {
  createTexturedPlaneMesh,
  getOrCreatePaintedCanvasTexture,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  Create3DModelProgress,
  RuntimePlugin,
  TileLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeObject3DLike,
  ThreeTextureLike,
  TraversalProfile3D,
  WorldStateLike,
} from '@bworlds/plugin-api';

const SIGN_REGION_SIZE = 10;
const TREE_BARK_COLOR = '#4a2f1b';
const SIGN_TOWN_BUFFER = 8;
const JUNCTION_SIGN_THRESHOLD = 0.985;
const LONG_ROAD_SIGN_THRESHOLD = 0.9975;
const ROADSIDE_SIGN_THRESHOLD = 0.9992;
const LONG_ROAD_MIN_SPAN = 8;
const LONG_ROAD_POI_DISTANCE = 28;
const SIGN_STYLE_CACHE_LIMIT = 96;
const SIGN_LABEL_CACHE_LIMIT = 192;
const DIRECTION_ARROWS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'] as const;
const SIGN_POST_HEIGHT_SEED = registerHashLabel('sign-post-height');
const SIGN_POST_THICKNESS_SEED = registerHashLabel('sign-post-thickness');
const SIGN_PLACARD_WIDTH_SEED = registerHashLabel('sign-placard-width');
const SIGN_PLACARD_HEIGHT_SEED = registerHashLabel('sign-placard-height');
const SIGN_PLACARD_DEPTH_SEED = registerHashLabel('sign-placard-depth');
const SIGN_BARK_SEED = registerHashLabel('sign-bark');
const SIGN_PLACARD_SEED = registerHashLabel('sign-placard');
const SIGN_TRIM_SEED = registerHashLabel('sign-trim');
const SIGN_SECOND_POST_SEED = registerHashLabel('sign-second-post');
const signStyleCache = createBoundedCache<string, SignStyleBlueprint>(
  SIGN_STYLE_CACHE_LIMIT
);
const resolveRegionalSignStyle = createRegionalMaterialResolver(
  signStyleCache,
  SIGN_REGION_SIZE,
  ({ regionX, regionY, key }) => {
    const postHeight =
      1.12 + hash2D(SIGN_POST_HEIGHT_SEED, regionX, regionY) * 0.42;
    const postThickness =
      0.07 + hash2D(SIGN_POST_THICKNESS_SEED, regionX, regionY) * 0.04;
    const placardWidth =
      0.54 + hash2D(SIGN_PLACARD_WIDTH_SEED, regionX, regionY) * 0.16;
    const placardHeight =
      0.16 + hash2D(SIGN_PLACARD_HEIGHT_SEED, regionX, regionY) * 0.05;
    const placardDepth =
      0.035 + hash2D(SIGN_PLACARD_DEPTH_SEED, regionX, regionY) * 0.02;
    const barkTint = hash2D(SIGN_BARK_SEED, regionX, regionY);
    const placardTint = hash2D(SIGN_PLACARD_SEED, regionX, regionY);
    const trimTint = hash2D(SIGN_TRIM_SEED, regionX, regionY);
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

    return createHostMaterialResolver((three: ThreeHostLike): SignStyle => {
      const style = {
        key,
        postHeight,
        postThickness,
        placardWidth,
        placardHeight,
        placardDepth,
        placardColor,
        trimColor,
        textColor,
        labelCache: createBoundedCache<string, ThreeTextureLike>(
          SIGN_LABEL_CACHE_LIMIT
        ),
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
        lanternMaterial: new three.MeshStandardMaterial({
          color: '#f7d38a',
          emissive: '#f7d38a',
          emissiveIntensity: 0.04,
          roughness: 0.52,
          metalness: 0.02,
        }),
      };
      return style;
    });
  }
);

export function createSignTilePlugin(): RuntimePlugin {
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
        townAnchors,
        bridgeAnchors,
        sampleTerrainSignals,
        ...placementContext
      }: ClassifyOverworldTileContext) {
        if (!canPlaceLandPoi(nearLand, tile.kind)) {
          return null;
        }

        const nearestTown = findNearestAnchor(townAnchors, x, y);
        const nearestPoi = findNearestAnchor(
          placementContext.poiAnchors ?? [],
          x,
          y
        );
        const closeToTown =
          nearestTown &&
          Math.hypot(x - nearestTown.x, y - nearestTown.y) < SIGN_TOWN_BUFFER;
        const closeToPoi =
          nearestPoi &&
          Math.hypot(x - nearestPoi.x, y - nearestPoi.y) <=
            LONG_ROAD_POI_DISTANCE;
        const roadProfile = createRoadsideRouteProfile({
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
          : roadProfile.routeSpan >= LONG_ROAD_MIN_SPAN && closeToPoi
            ? LONG_ROAD_SIGN_THRESHOLD
            : ROADSIDE_SIGN_THRESHOLD;
        const chance = resolvePlacementChance(
          {
            x,
            y,
            tile,
            nearLand,
            townAnchors,
            bridgeAnchors,
            sampleTerrainSignals,
            ...placementContext,
          } as ClassifyOverworldTileContext,
          'sign'
        );

        if (roadProfile.adjacentRoadCount === 0 || chance <= threshold) {
          return null;
        }

        if (!roadProfile.atJunction && !closeToTown && !closeToPoi) {
          return null;
        }

        return {
          kind: 'sign',
          note: nearestPoi?.name
            ? `A sign points travelers toward ${nearestPoi.name}.`
            : nearestTown
              ? `A sign points travelers toward ${nearestTown.name ?? 'a nearby town'}.`
              : 'A weathered sign points farther down the road.',
        };
      },
      paint2D: createPlainsBackedTilePainter(
        ({ context, x, y, motif, fillRect }) => {
          const postX = 6 + motif.int(0, 2);
          fillRect(context, x + postX, y + 5, 2, 7, '#5b3716');
          fillRect(context, x + postX - 3, y + 3, 8, 4, '#f3c266');
          fillRect(context, x + postX - 2, y + 4, 6, 1, '#8a5a19');
          return true;
        }
      ),
      create3DModel(context: Create3DModelContext) {
        return runSignModelBuildToCompletion(
          createSignModelProgressive(context)
        );
      },
      create3DModelProgressive(context: Create3DModelContext) {
        return createSignModelProgressive(context);
      },
      sync3DModel({ model, cycle }) {
        if (!model || typeof model !== 'object') {
          return;
        }
        syncPoiLightEmitters(
          model as Parameters<typeof syncPoiLightEmitters>[0],
          cycle
        );
      },
    },
  ]);
}

function* createSignModelProgressive({
  three,
  state,
  tileX,
  tileY,
  detailLevel = 'full',
}: Create3DModelContext): Generator<Create3DModelProgress, unknown, void> {
  const style = getRegionalSignStyle(three, tileX, tileY);
  const group = new three.Group();
  const nearbyPois = getNearbyPois(state, tileX, tileY);
  const placardCount = Math.max(1, Math.min(3, nearbyPois.length || 1));
  const useSecondPost =
    placardCount > 2 && hash2D(SIGN_SECOND_POST_SEED, tileX, tileY) > 0.48;

  if (detailLevel === 'low') {
    addLowDetailSign(
      group,
      three,
      style,
      placardCount,
      getLowDetailSignHeading(nearbyPois)
    );
    group.position.set(tileX, 0, tileY);
    return group;
  }

  const totalSteps = 3;
  addSignPost(group, three, style, placardCount, 0);
  group.position.set(tileX, 0, tileY);
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'posts',
  };

  const placards =
    nearbyPois.length > 0
      ? nearbyPois.slice(0, 3)
      : [fallbackPlacard(tileX, tileY)];
  const placardSupportInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.postMaterial,
    placards.length
  );
  placardSupportInstances.userData = {
    ...(placardSupportInstances.userData ?? {}),
    signInstancedPart: 'placard-support',
  };
  const placardEdgeCapInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    style.trimMaterial,
    placards.length
  );
  placardEdgeCapInstances.userData = {
    ...(placardEdgeCapInstances.userData ?? {}),
    signInstancedPart: 'placard-edge-cap',
  };
  const placardArrowHeadInstances = new three.InstancedMesh(
    new three.ConeGeometry(1, 1, 3),
    style.placardMaterial,
    placards.length
  );
  placardArrowHeadInstances.userData = {
    ...(placardArrowHeadInstances.userData ?? {}),
    signInstancedPart: 'placard-arrow-head',
  };
  const placardSupportMatrixScratch = new three.Matrix4();
  const placardEdgeCapMatrixScratch = new three.Matrix4();
  const placardArrowHeadMatrixScratch = new three.Matrix4();

  placards.forEach((poi, index) => {
    const mountOffsetX =
      useSecondPost && index === 2 ? 0.18 + style.postThickness * 0.7 : 0;

    if (useSecondPost && index === 2) {
      addSecondaryPost(group, three, style, mountOffsetX);
    }

    addDirectionalPlacard(
      group,
      three,
      style,
      poi,
      index,
      mountOffsetX,
      placardSupportInstances,
      placardSupportMatrixScratch,
      placardEdgeCapInstances,
      placardEdgeCapMatrixScratch,
      placardArrowHeadInstances,
      placardArrowHeadMatrixScratch
    );
  });
  group.add(placardSupportInstances);
  group.add(placardEdgeCapInstances);
  group.add(placardArrowHeadInstances);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'placards',
  };

  addSignLantern(
    group,
    three,
    style,
    style.postThickness * (useSecondPost ? -0.8 : 0),
    style.postHeight * 0.88,
    style.postThickness * 1.2
  );
  yield {
    completedSteps: 3,
    totalSteps,
    label: 'lantern',
  };

  return group;
}

function runSignModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function findNearestAnchor<
  TAnchor extends { x: number; y: number; name?: string },
>(anchors: readonly TAnchor[], x: number, y: number): TAnchor | undefined {
  let nearestAnchor: TAnchor | undefined;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    if (!anchor) {
      continue;
    }

    const dx = x - anchor.x;
    const dy = y - anchor.y;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= nearestDistanceSquared) {
      continue;
    }

    nearestAnchor = anchor;
    nearestDistanceSquared = distanceSquared;
  }

  return nearestAnchor;
}

function addSignPost(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  style: SignStyle,
  placardCount: number,
  x: number
) {
  const postMesh = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness,
      style.postHeight,
      style.postThickness
    ),
    style.postMaterial
  );
  postMesh.position.x = x;
  postMesh.position.y = style.postHeight * 0.5;
  postMesh.userData = {
    ...(postMesh.userData ?? {}),
    signFullDetailPart: 'post',
  };
  group.add(postMesh);

  if (placardCount > 1) {
    const brace = new three.Mesh(
      new three.BoxGeometry(
        style.postThickness * 2.1,
        style.postThickness * 0.8,
        style.postThickness * 2.1
      ),
      style.trimMaterial
    );
    brace.position.x = x;
    brace.position.y = style.postHeight * 0.78;
    brace.userData = {
      ...(brace.userData ?? {}),
      signFullDetailPart: 'brace',
    };
    group.add(brace);
  }
}

function addSecondaryPost(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  style: SignStyle,
  x: number
) {
  const mesh = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness * 0.92,
      style.postHeight * 0.84,
      style.postThickness * 0.92
    ),
    style.postMaterial
  );
  mesh.position.x = x;
  mesh.position.y = style.postHeight * 0.42;
  mesh.userData = {
    ...(mesh.userData ?? {}),
    signFullDetailPart: 'secondary-post',
  };
  group.add(mesh);
}

function addLowDetailSign(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  style: SignStyle,
  placardCount: number,
  heading: number
) {
  const post = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness * 1.08,
      style.postHeight * 0.82,
      style.postThickness * 1.08
    ),
    style.postMaterial
  );
  post.position.y = style.postHeight * 0.41;
  post.userData = {
    ...(post.userData ?? {}),
    signLowDetailPart: 'post',
  };
  group.add(post);

  if (placardCount > 1) {
    const brace = new three.Mesh(
      new three.BoxGeometry(
        style.postThickness * 1.9,
        style.postThickness * 0.7,
        style.postThickness * 1.9
      ),
      style.trimMaterial
    );
    brace.position.y = style.postHeight * 0.6;
    brace.userData = {
      ...(brace.userData ?? {}),
      signLowDetailPart: 'brace',
    };
    group.add(brace);
  }

  const placard = new three.Mesh(
    new three.BoxGeometry(
      style.placardWidth * 1.2,
      style.placardHeight * 1.08,
      style.placardDepth * 1.35
    ),
    style.placardMaterial
  );
  placard.position.set(0, style.postHeight * 0.72, 0);
  placard.rotation.y = -heading;
  placard.userData = {
    ...(placard.userData ?? {}),
    signLowDetailPart: 'placard',
  };
  group.add(placard);
}

function getLowDetailSignHeading(nearbyPois: NearbyPoi[]): number {
  const [poi] = nearbyPois;
  if (!poi) {
    return 0;
  }
  return Math.atan2(poi.dy, poi.dx);
}

function addDirectionalPlacard(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  style: SignStyle,
  poi: NearbyPoi,
  index: number,
  mountOffsetX: number,
  supportInstances: InstanceType<ThreeHostLike['InstancedMesh']>,
  supportMatrixScratch: InstanceType<ThreeHostLike['Matrix4']>,
  edgeCapInstances: InstanceType<ThreeHostLike['InstancedMesh']>,
  edgeCapMatrixScratch: InstanceType<ThreeHostLike['Matrix4']>,
  arrowHeadInstances: InstanceType<ThreeHostLike['InstancedMesh']>,
  arrowHeadMatrixScratch: InstanceType<ThreeHostLike['Matrix4']>
) {
  const width = style.placardWidth * (poi.name.length > 12 ? 1.15 : 1);
  const height = style.placardHeight;
  const depth = style.placardDepth;
  const heading = Math.atan2(poi.dy, poi.dx);
  const rowOffset = style.postHeight * (0.68 - index * 0.14);
  const armLength = 0.14 + index * 0.035;

  const placard = new three.Mesh(
    new three.BoxGeometry(width, height, depth),
    style.placardMaterial
  );
  const placardOffset = rotateSignLocalOffset(
    width * 0.5 + armLength,
    0,
    -heading
  );
  placard.position.set(
    mountOffsetX + placardOffset.x,
    rowOffset,
    placardOffset.z
  );
  placard.rotation.y = -heading;
  placard.userData = {
    ...(placard.userData ?? {}),
    signFullDetailPart: 'placard',
  };
  group.add(placard);

  edgeCapInstances.setMatrixAt(
    index,
    writeSignRotatedScalePositionMatrix(
      edgeCapMatrixScratch,
      mountOffsetX + width + armLength - depth * 0.2,
      rowOffset,
      0,
      depth * 1.4,
      height * 0.9,
      depth * 1.4,
      -heading
    )
  );

  supportInstances.setMatrixAt(
    index,
    writeSignRotatedScalePositionMatrix(
      supportMatrixScratch,
      mountOffsetX + armLength * 0.5 + 0.03,
      rowOffset,
      0,
      armLength + 0.06,
      depth * 0.9,
      depth * 0.9,
      -heading
    )
  );
  arrowHeadInstances.setMatrixAt(
    index,
    writeSignYawedArrowHeadMatrix(
      arrowHeadMatrixScratch,
      mountOffsetX + width + armLength + height * 0.24,
      rowOffset,
      0,
      height * 0.46 * 1.05,
      height * 0.68,
      height * 0.46 * 1.35,
      -heading
    )
  );

  const textPlane = createSignLabelSprite(three, style, poi, width, height);
  const textPlaneOffset = rotateSignLocalOffset(
    width * 0.5 + armLength,
    depth * 0.65,
    -heading
  );
  textPlane.position.set(
    mountOffsetX + textPlaneOffset.x,
    rowOffset,
    textPlaneOffset.z
  );
  textPlane.rotation.y = -heading;
  textPlane.userData = {
    ...(textPlane.userData ?? {}),
    signFullDetailPart: 'text-plane',
  };
  group.add(textPlane);

  const backPlane = createSignLabelSprite(three, style, poi, width, height);
  const backPlaneOffset = rotateSignLocalOffset(
    width * 0.5 + armLength,
    -depth * 0.65,
    -heading
  );
  backPlane.position.set(
    mountOffsetX + backPlaneOffset.x,
    rowOffset,
    backPlaneOffset.z
  );
  backPlane.rotation.y = Math.PI - heading;
  backPlane.userData = {
    ...(backPlane.userData ?? {}),
    signFullDetailPart: 'back-plane',
  };
  group.add(backPlane);
}

function addSignLantern(
  group: ThreeObject3DLike,
  three: ThreeHostLike,
  style: SignStyle,
  x: number,
  y: number,
  z: number
) {
  const frame = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness * 1.55,
      style.postThickness * 1.9,
      style.postThickness * 1.55
    ),
    style.trimMaterial
  );
  frame.position.set(x, y, z);
  frame.userData = {
    ...(frame.userData ?? {}),
    signLanternPart: 'frame',
  };
  group.add(frame);

  const glow = markPoiLightEmitter(
    new three.Mesh(
      new three.BoxGeometry(
        style.postThickness * 1.05,
        style.postThickness * 1.35,
        style.postThickness * 1.05
      ),
      style.lanternMaterial
    ),
    {
      kind: 'emissive-mesh',
      dayIntensity: 0.04,
      nightIntensity: 1.15,
    }
  );
  glow.position.set(x, y, z);
  glow.userData = {
    ...(glow.userData ?? {}),
    signLanternPart: 'glow',
  };
  group.add(glow);

  const pointLight = markPoiLightEmitter(
    new three.PointLight('#f7c97a', 0, 2.8, 1.8),
    {
      kind: 'point-light',
      nightIntensity: 0.75,
      visibleThreshold: 0.035,
    }
  );
  pointLight.position.set(x, y + style.postThickness * 0.2, z);
  pointLight.visible = false;
  pointLight.userData = {
    ...(pointLight.userData ?? {}),
    signLanternPart: 'point-light',
  };
  group.add(pointLight);

  const cap = new three.Mesh(
    new three.BoxGeometry(
      style.postThickness * 1.85,
      style.postThickness * 0.35,
      style.postThickness * 1.85
    ),
    style.trimMaterial
  );
  cap.position.set(x, y + style.postThickness * 1.18, z);
  cap.userData = {
    ...(cap.userData ?? {}),
    signLanternPart: 'cap',
  };
  group.add(cap);
}

function createSignLabelSprite(
  three: ThreeHostLike,
  style: SignStyle,
  poi: NearbyPoi,
  width: number,
  height: number
) {
  const texture = getSignLabelTexture(three, style, poi);
  return createTexturedPlaneMesh(three, {
    width: width * 0.92,
    height: height * 0.78,
    texture,
  });
}

function getSignLabelTexture(
  three: ThreeHostLike,
  style: SignStyle,
  poi: NearbyPoi
) {
  const key = `${style.key}:${poi.name}:${poi.arrow}`;
  return getOrCreatePaintedCanvasTexture(style.labelCache, key, three, {
    width: 256,
    height: 96,
    wrap: false,
    paint(context, canvas) {
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
    },
  });
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
  return resolveRegionalSignStyle(three, tileX, tileY);
}

function arrowFromVector(dx: number, dy: number): SignArrow {
  const angle = Math.atan2(dy, dx);
  const octant = Math.round(angle / (Math.PI / 4) + 8) % 8;
  return DIRECTION_ARROWS[octant];
}

function rotateSignLocalOffset(
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

function writeSignRotatedScalePositionMatrix(
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

function writeSignYawedArrowHeadMatrix(
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
    0,
    cosRotation * scaleY,
    sinRotation * scaleZ,
    x,
    -scaleX,
    0,
    0,
    y,
    0,
    -sinRotation * scaleY,
    cosRotation * scaleZ,
    z,
    0,
    0,
    0,
    1
  );
}

interface NearbyPoi {
  x: number;
  y: number;
  dx: number;
  dy: number;
  distance: number;
  name: string;
  arrow: SignArrow;
}

type SignArrow = (typeof DIRECTION_ARROWS)[number];

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
  labelCache: CacheLike<string, ThreeTextureLike>;
  postMaterial: ThreeMaterialLike;
  placardMaterial: ThreeMaterialLike;
  trimMaterial: ThreeMaterialLike;
  lanternMaterial: ThreeMaterialLike;
}

interface SignStyleBlueprint {
  createMaterials(three: ThreeHostLike): SignStyle;
}
