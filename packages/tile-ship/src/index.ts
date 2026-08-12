import {
  getOrCreateWeakMapValue,
  getOrCreateMapValue,
} from '@bworlds/cache-support';
import { hash2D, registerHashLabel } from '@bworlds/core/hash';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  CARDINAL_DIRECTIONS,
  createAnchoredEnterablePoiTilePlugin,
  getPoiLightActivation,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import type {
  Create3DModelContext,
  Create3DModelProgress,
  RuntimePlugin,
  ThreeMaterialLike,
  ThreeMatrix4Like,
  ThreeObject3DLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const SHIP_VARIANT_KEY = 'shipPoiVariant';
const SHIP_INSTANCED_PART_KEY = 'shipInstancedPart';
const SHIP_POI_VARIANT_SEED = registerHashLabel('ship-poi-variant');
const SHIP_FACING_LABELS = CARDINAL_DIRECTIONS.map((direction) =>
  registerHashLabel(`ship-facing:${direction.label}`)
);
const shipMaterialCache = new WeakMap<
  object,
  Map<
    ShipVariant,
    Pick<ShipStyleMaterials, 'hullMaterial'>
  >
>();
const shipSharedMaterialCache = new WeakMap<
  object,
  Omit<ShipStyleMaterials, 'hullMaterial'>
>();

type CardinalFacing = (typeof CARDINAL_DIRECTIONS)[number];
type ShipVariant = 'tall-ship' | 'broken-ship';
type ShipMaterialLike = ThreeMaterialLike & {
  emissiveIntensity?: number;
  opacity?: number;
};
type ShipStyleMaterials = {
  hullMaterial: ShipMaterialLike;
  trimMaterial: ShipMaterialLike;
  mastMaterial: ShipMaterialLike;
  sailMaterial: ShipMaterialLike;
  lanternMaterial: ShipMaterialLike;
};
type ShipNodeLike = ThreeObject3DLike & {
  material?: ShipMaterialLike | ShipMaterialLike[];
};

export function createShipTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-ship',
    kind: 'ship',
    definition: {
      name: 'Ship',
      color: '#855431',
      miniColor: '#b97a53',
      walkable: true,
      wallHeight: 0.72,
    },
    note: 'A moored ship creaks beside the dock, ready to be explored.',
    paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
      fillRect(context, x + 2, y + 6, 12, 5, '#7c4a2c');
      fillRect(context, x + 4, y + 4, 8, 2, '#d2b48c');
      fillRect(context, x + 7, y + 2, 2, 10, '#4b2c18');
      fillRect(context, x + 11, y + 7, 2, 2, '#e5d7bb');
      return true;
    }),
    create3DModel(context: Create3DModelContext) {
      return runShipModelBuildToCompletion(createShipModelProgressive(context));
    },
    create3DModelProgressive(context: Create3DModelContext) {
      return createShipModelProgressive(context);
    },
    sync3DModel({ model, cycle }) {
      if (!model || typeof model !== 'object') {
        return;
      }
      syncPoiLightEmitters(
        model as Parameters<typeof syncPoiLightEmitters>[0],
        cycle
      );
      syncShipSails(model as ThreeObject3DLike, cycle);
    },
  });
}

function* createShipModelProgressive({
  three,
  state,
  tileX,
  tileY,
}: Create3DModelContext): Generator<Create3DModelProgress, unknown, void> {
  const facing = getShipFacing(state, tileX, tileY);
  const variant = getShipVariant(tileX, tileY);
  const {
    hullMaterial,
    trimMaterial,
    mastMaterial,
    sailMaterial,
    lanternMaterial,
  } = getShipSharedMaterials(three, variant);
  const totalSteps = 3;

  const hull = new three.Mesh(
    new three.BoxGeometry(0.62, 0.22, 1.18),
    hullMaterial
  );
  hull.position.set(tileX, 0.11, tileY + 0.05);
  hull.rotation.y = facing.rotationY;
  hull.userData = {
    ...(hull.userData ?? {}),
    [SHIP_VARIANT_KEY]: variant,
  };

  const deck = new three.Mesh(
    new three.BoxGeometry(0.5, 0.04, 0.92),
    trimMaterial
  );
  deck.position.set(0, 0.13, -0.01);
  hull.add(deck);

  const prow = new three.Mesh(
    new three.BoxGeometry(0.42, 0.18, 0.2),
    hullMaterial
  );
  prow.position.set(0, 0.03, -0.63);
  prow.rotation.x = -0.24;
  hull.add(prow);

  const stern = new three.Mesh(
    new three.BoxGeometry(0.44, 0.24, 0.22),
    hullMaterial
  );
  stern.position.set(0, 0.07, 0.53);
  hull.add(stern);

  const cabin = new three.Mesh(
    new three.BoxGeometry(0.34, 0.2, 0.26),
    trimMaterial
  );
  cabin.position.set(0, 0.23, 0.37);
  hull.add(cabin);
  yield {
    completedSteps: 1,
    totalSteps,
    label: 'hull',
  };

  const lantern = markPoiLightEmitter(
    new three.Mesh(new three.SphereGeometry(0.04, 6, 6), lanternMaterial),
    {
      kind: 'emissive-mesh',
      dayIntensity: 0.02,
      nightIntensity: 1.1,
    }
  );
  lantern.position.set(0.18, 0.31, 0.41);
  hull.add(lantern);

  const lanternLight = markPoiLightEmitter(
    new three.PointLight('#f6c56b', 0, 3.8, 1.85),
    {
      kind: 'point-light',
      nightIntensity: 0.72,
      visibleThreshold: 0.03,
    }
  );
  lanternLight.position.set(0.18, 0.31, 0.37);
  lanternLight.visible = false;
  hull.add(lanternLight);
  yield {
    completedSteps: 2,
    totalSteps,
    label: 'lantern',
  };

  if (variant === 'tall-ship') {
    addTallShipRigging(three, hull, mastMaterial, sailMaterial, trimMaterial);
    yield {
      completedSteps: 3,
      totalSteps,
      label: 'rigging',
    };
  } else {
    addBrokenShipDetails(three, hull, hullMaterial, mastMaterial, trimMaterial);
    yield {
      completedSteps: 3,
      totalSteps,
      label: 'wreckage',
    };
  }

  return hull;
}

function runShipModelBuildToCompletion(
  build: Generator<Create3DModelProgress, unknown, void>
): unknown {
  while (true) {
    const next = build.next();
    if (next.done) {
      return next.value;
    }
  }
}

function getShipVariant(tileX: number, tileY: number): ShipVariant {
  return hash2D(SHIP_POI_VARIANT_SEED, tileX, tileY) > 0.48
    ? 'tall-ship'
    : 'broken-ship';
}

function getShipSharedMaterials(
  three: Create3DModelContext['three'],
  variant: ShipVariant
): ShipStyleMaterials {
  const sharedMaterials = getOrCreateWeakMapValue(
    shipSharedMaterialCache,
    three as object,
    () => createSharedShipMaterials(three)
  );
  const byVariant = getOrCreateWeakMapValue(
    shipMaterialCache,
    three as object,
    () => new Map<ShipVariant, Pick<ShipStyleMaterials, 'hullMaterial'>>()
  );

  return {
    ...sharedMaterials,
    ...getOrCreateMapValue(byVariant, variant, () =>
      createShipVariantMaterials(three, variant)
    ),
  };
}

function createShipVariantMaterials(
  three: Create3DModelContext['three'],
  variant: ShipVariant
): Pick<ShipStyleMaterials, 'hullMaterial'> {
  return {
    hullMaterial: new three.MeshStandardMaterial({
      color: variant === 'tall-ship' ? '#7a4a2f' : '#6b4634',
      roughness: 0.9,
      metalness: 0.02,
    }),
  };
}

function createSharedShipMaterials(
  three: Create3DModelContext['three']
): Omit<ShipStyleMaterials, 'hullMaterial'> {
  return {
    trimMaterial: new three.MeshStandardMaterial({
      color: '#d9bf8f',
      roughness: 0.82,
      metalness: 0.02,
    }),
    mastMaterial: new three.MeshStandardMaterial({
      color: '#5a3418',
      roughness: 0.88,
      metalness: 0.02,
    }),
    sailMaterial: new three.MeshStandardMaterial({
      color: '#ddd2bb',
      roughness: 0.97,
      metalness: 0.01,
      transparent: true,
    }),
    lanternMaterial: new three.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#f59e0b',
      emissiveIntensity: 0.02,
      roughness: 0.38,
      metalness: 0.03,
    }),
  };
}

function getShipFacing(
  state: WorldStateLike,
  tileX: number,
  tileY: number
): CardinalFacing {
  let bestDirection = CARDINAL_DIRECTIONS[2]!;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < CARDINAL_DIRECTIONS.length; index += 1) {
    const direction = CARDINAL_DIRECTIONS[index]!;
    const shoreTile = state.getCurrentTile(
      tileX + direction.dx,
      tileY + direction.dy
    );
    const openWaterTile = state.getCurrentTile(
      tileX + direction.dx * 2,
      tileY + direction.dy * 2
    );
    const landBehindTile = state.getCurrentTile(
      tileX - direction.dx,
      tileY - direction.dy
    );
    const shoreWalkable = state.getTileDefinition(shoreTile.kind).walkable;
    const openWaterWalkable = state.getTileDefinition(
      openWaterTile.kind
    ).walkable;
    const landBehindWalkable = state.getTileDefinition(
      landBehindTile.kind
    ).walkable;
    const score =
      (shoreTile.kind === 'dock' ? 8 : 0) +
      (shoreTile.kind === 'ocean' || shoreTile.kind === 'river' ? 6 : 0) +
      (!shoreWalkable ? 4 : 0) +
      (!openWaterWalkable ? 3 : 0) +
      (landBehindWalkable ? 2 : 0) +
      hash2D(SHIP_FACING_LABELS[index]!, tileX, tileY);
    if (score <= bestScore) {
      continue;
    }
    bestScore = score;
    bestDirection = direction;
  }

  return bestDirection;
}

function addTallShipRigging(
  three: Create3DModelContext['three'],
  group: ThreeObject3DLike,
  mastMaterial: ShipMaterialLike,
  sailMaterial: ShipMaterialLike,
  trimMaterial: ShipMaterialLike
) {
  const rigDescriptors = [
    {
      z: -0.12,
      mastHeight: 0.95,
      mastY: 0.72,
      yardWidth: 0.58,
      yardY: 0.86,
      sailWidth: 0.46,
      sailHeight: 0.34,
      sailX: 0.02,
      sailY: 0.74,
    },
    {
      z: 0.24,
      mastHeight: 0.72,
      mastY: 0.58,
      yardWidth: 0.42,
      yardY: 0.68,
      sailWidth: 0.3,
      sailHeight: 0.26,
      sailX: 0.02,
      sailY: 0.58,
    },
  ] as const;
  const mastInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    mastMaterial,
    rigDescriptors.length
  );
  mastInstances.userData = {
    ...(mastInstances.userData ?? {}),
    [SHIP_INSTANCED_PART_KEY]: 'mast',
  };
  const yardInstances = new three.InstancedMesh(
    new three.BoxGeometry(1, 1, 1),
    trimMaterial,
    rigDescriptors.length
  );
  yardInstances.userData = {
    ...(yardInstances.userData ?? {}),
    [SHIP_INSTANCED_PART_KEY]: 'yard',
  };
  const sailInstances = new three.InstancedMesh(
    new three.PlaneGeometry(1, 1),
    sailMaterial,
    rigDescriptors.length
  );
  sailInstances.userData = {
    ...(sailInstances.userData ?? {}),
    [SHIP_INSTANCED_PART_KEY]: 'sail',
    shipSail: true,
  };
  sailInstances.rotation.y = Math.PI / 2;
  const mastMatrixScratch = new three.Matrix4();
  const yardMatrixScratch = new three.Matrix4();
  const sailMatrixScratch = new three.Matrix4();

  rigDescriptors.forEach((descriptor, index) => {
    mastInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        mastMatrixScratch,
        0,
        descriptor.mastY,
        descriptor.z,
        0.05,
        descriptor.mastHeight,
        0.05
      )
    );
    yardInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        yardMatrixScratch,
        0,
        descriptor.yardY,
        descriptor.z,
        descriptor.yardWidth,
        0.03,
        0.03
      )
    );
    sailInstances.setMatrixAt(
      index,
      writeInstancedScalePositionMatrix(
        sailMatrixScratch,
        descriptor.sailX,
        descriptor.sailY,
        descriptor.z,
        descriptor.sailWidth,
        descriptor.sailHeight,
        1
      )
    );
  });

  group.add(mastInstances);
  group.add(yardInstances);
  group.add(sailInstances);
}

function addBrokenShipDetails(
  three: Create3DModelContext['three'],
  group: ThreeObject3DLike,
  hullMaterial: ShipMaterialLike,
  mastMaterial: ShipMaterialLike,
  trimMaterial: ShipMaterialLike
) {
  const snappedMast = new three.Mesh(
    new three.BoxGeometry(0.05, 0.46, 0.05),
    mastMaterial
  );
  snappedMast.position.set(0.08, 0.44, -0.08);
  snappedMast.rotation.z = 0.48;
  group.add(snappedMast);

  const breach = new three.Mesh(
    new three.BoxGeometry(0.2, 0.14, 0.18),
    trimMaterial
  );
  breach.position.set(-0.18, 0.18, 0.12);
  breach.rotation.y = 0.38;
  group.add(breach);

  const debris = new three.Mesh(
    new three.BoxGeometry(0.24, 0.05, 0.12),
    hullMaterial
  );
  debris.position.set(0.18, 0.05, -0.32);
  debris.rotation.z = -0.2;
  group.add(debris);
  (debris as ShipNodeLike).userData = {
    ...((debris as ShipNodeLike).userData ?? {}),
    shipBrokenHull: true,
  };
}

function writeInstancedScalePositionMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return target.makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}

function syncShipSails(
  root: ThreeObject3DLike,
  cycle: { daylight: number; twilight: number; night: number }
) {
  const activation = getPoiLightActivation(cycle);
  root.traverse?.((node) => {
    if (!node.userData?.shipSail) {
      return;
    }
    const target = node as ShipNodeLike;
    const materials = Array.isArray(target.material)
      ? target.material
      : target.material
        ? [target.material]
        : [];
    materials.forEach((material) => {
      material.opacity = 0.82 + activation * 0.12;
    });
  });
}
