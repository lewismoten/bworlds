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
  RuntimePlugin,
  ThreeMaterialLike,
  ThreeObject3DLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const SHIP_VARIANT_KEY = 'shipPoiVariant';
const SHIP_POI_VARIANT_SEED = registerHashLabel('ship-poi-variant');
const SHIP_FACING_LABELS = CARDINAL_DIRECTIONS.map((direction) =>
  registerHashLabel(`ship-facing:${direction.label}`)
);
const shipMaterialCache = new WeakMap<
  object,
  Map<
    ShipVariant,
    {
      hullMaterial: ShipMaterialLike;
      trimMaterial: ShipMaterialLike;
      mastMaterial: ShipMaterialLike;
      sailMaterial: ShipMaterialLike;
      lanternMaterial: ShipMaterialLike;
    }
  >
>();

type CardinalFacing = (typeof CARDINAL_DIRECTIONS)[number];
type ShipVariant = 'tall-ship' | 'broken-ship';
type ShipMaterialLike = ThreeMaterialLike & {
  emissiveIntensity?: number;
  opacity?: number;
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
    create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
      const group = new three.Group();
      const facing = getShipFacing(state, tileX, tileY);
      const variant = getShipVariant(tileX, tileY);
      const {
        hullMaterial,
        trimMaterial,
        mastMaterial,
        sailMaterial,
        lanternMaterial,
      } = getShipSharedMaterials(three, variant);

      group.position.set(tileX, 0, tileY);
      group.rotation.y = facing.rotationY;
      group.userData = {
        ...(group.userData ?? {}),
        [SHIP_VARIANT_KEY]: variant,
      };

      const hull = new three.Mesh(
        new three.BoxGeometry(0.62, 0.22, 1.18),
        hullMaterial
      );
      hull.position.set(0, 0.11, 0.05);
      group.add(hull);

      const deck = new three.Mesh(
        new three.BoxGeometry(0.5, 0.04, 0.92),
        trimMaterial
      );
      deck.position.set(0, 0.24, 0.04);
      group.add(deck);

      const prow = new three.Mesh(
        new three.BoxGeometry(0.42, 0.18, 0.2),
        hullMaterial
      );
      prow.position.set(0, 0.14, -0.58);
      prow.rotation.x = -0.24;
      group.add(prow);

      const stern = new three.Mesh(
        new three.BoxGeometry(0.44, 0.24, 0.22),
        hullMaterial
      );
      stern.position.set(0, 0.18, 0.58);
      group.add(stern);

      const cabin = new three.Mesh(
        new three.BoxGeometry(0.34, 0.2, 0.26),
        trimMaterial
      );
      cabin.position.set(0, 0.34, 0.42);
      group.add(cabin);

      const lantern = markPoiLightEmitter(
        new three.Mesh(
          new three.SphereGeometry(0.04, 6, 6),
          lanternMaterial
        ),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.1,
        }
      );
      lantern.position.set(0.18, 0.42, 0.46);
      group.add(lantern);

      const lanternLight = markPoiLightEmitter(
        new three.PointLight('#f6c56b', 0, 3.8, 1.85),
        {
          kind: 'point-light',
          nightIntensity: 0.72,
          visibleThreshold: 0.03,
        }
      );
      lanternLight.position.set(0.18, 0.42, 0.42);
      lanternLight.visible = false;
      group.add(lanternLight);

      if (variant === 'tall-ship') {
        addTallShipRigging(three, group, mastMaterial, sailMaterial, trimMaterial);
      } else {
        addBrokenShipDetails(three, group, hullMaterial, mastMaterial, trimMaterial);
      }

      return group;
    },
    sync3DModel({ model, cycle }) {
      if (!model || typeof model !== 'object') {
        return;
      }
      syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
      syncShipSails(model as ThreeObject3DLike, cycle);
    },
  });
}

function getShipVariant(tileX: number, tileY: number): ShipVariant {
  return hash2D(SHIP_POI_VARIANT_SEED, tileX, tileY) > 0.48
    ? 'tall-ship'
    : 'broken-ship';
}

function getShipSharedMaterials(
  three: Create3DModelContext['three'],
  variant: ShipVariant
) {
  let byVariant = shipMaterialCache.get(three as object);
  if (!byVariant) {
    byVariant = new Map();
    shipMaterialCache.set(three as object, byVariant);
  }

  let cached = byVariant.get(variant);
  if (!cached) {
    cached = {
      hullMaterial: new three.MeshStandardMaterial({
        color: variant === 'tall-ship' ? '#7a4a2f' : '#6b4634',
        roughness: 0.9,
        metalness: 0.02,
      }),
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
    byVariant.set(variant, cached);
  }

  return cached;
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
    const shoreTile = state.getCurrentTile(tileX + direction.dx, tileY + direction.dy);
    const openWaterTile = state.getCurrentTile(
      tileX + direction.dx * 2,
      tileY + direction.dy * 2
    );
    const landBehindTile = state.getCurrentTile(
      tileX - direction.dx,
      tileY - direction.dy
    );
    const shoreWalkable = state.getTileDefinition(shoreTile.kind).walkable;
    const openWaterWalkable = state.getTileDefinition(openWaterTile.kind).walkable;
    const landBehindWalkable = state.getTileDefinition(landBehindTile.kind).walkable;
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
  for (const mastZ of [-0.12, 0.24]) {
    const mast = new three.Mesh(
      new three.BoxGeometry(0.05, mastZ < 0 ? 0.95 : 0.72, 0.05),
      mastMaterial
    );
    mast.position.set(0, mastZ < 0 ? 0.72 : 0.58, mastZ);
    group.add(mast);

    const yard = new three.Mesh(
      new three.BoxGeometry(mastZ < 0 ? 0.58 : 0.42, 0.03, 0.03),
      trimMaterial
    );
    yard.position.set(0, mastZ < 0 ? 0.86 : 0.68, mastZ);
    group.add(yard);

    const sail = new three.Mesh(
      new three.PlaneGeometry(mastZ < 0 ? 0.46 : 0.3, mastZ < 0 ? 0.34 : 0.26),
      sailMaterial
    );
    sail.position.set(0.02, mastZ < 0 ? 0.74 : 0.58, mastZ);
    sail.userData = {
      ...(sail.userData ?? {}),
      shipSail: true,
    };
    sail.rotation.y = Math.PI / 2;
    group.add(sail);
  }
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
