import { hash2D, registerHashLabel } from '@bworlds/core';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createAnchoredEnterablePoiTilePlugin,
  markPoiLightEmitter,
  pickPreferredLandmarkFacing,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import {
  createBasicMaterial,
  createMountainTerrainMaterials,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const QUARRY_STONE_WIDTH_SEED = registerHashLabel('quarry-stone-w');
const QUARRY_STONE_HEIGHT_SEED = registerHashLabel('quarry-stone-h');
const QUARRY_STONE_DEPTH_SEED = registerHashLabel('quarry-stone-d');
const QUARRY_STONE_ROTATION_SEED = registerHashLabel('quarry-stone-rot');
const QUARRY_FACING_SEED = registerHashLabel('quarry-facing');

export function createQuarryTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-quarry',
    kind: 'quarry',
    definition: {
      name: 'Quarry',
      color: '#7c6f65',
      miniColor: '#b8aa9a',
      walkable: true,
      wallHeight: 0.2,
    },
    note: 'An open quarry cuts into the nearby stone.',
    paint2D: createPlainsBackedTilePainter(({ context, x, y, motif, fillRect, speckle }) => {
      fillRect(context, x + 2, y + 2, 12, 12, '#8f857b');
      fillRect(context, x + 4, y + 4, 8, 8, '#5b524b');
      fillRect(context, x + 6, y + 6, 4, 4, '#2f2a27');
      fillRect(context, x + 10, y + 2, 2, 10, '#6b4f35');
      fillRect(context, x + 9, y + 3, 4, 1, '#8d6a46');
      speckle(context, x, y, '#c7beb4', 10, 0.18, motif);
      return true;
    }),
    create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
      const { mountainMaterial } = createMountainTerrainMaterials(three);
      const timberMaterial = createBasicMaterial(three, { color: '#7c5a3b' });
      const ropeMaterial = createBasicMaterial(three, { color: '#d2b48c' });
      const rubbleMaterial = createBasicMaterial(three, { color: '#9c9186' });
      const darkMetalMaterial = createBasicMaterial(three, { color: '#2f261f' });

      const group = new three.Group();
      const facing = getQuarryFacing(state, tileX, tileY);

      const rim = new three.Mesh(
        new three.CylinderGeometry(0.62, 0.92, 0.18, 8),
        mountainMaterial
      );
      rim.position.set(tileX, 0.09, tileY);
      group.add(rim);

      const pit = new three.Mesh(
        new three.CylinderGeometry(0.36, 0.52, 0.12, 8),
        darkMetalMaterial
      );
      pit.position.set(tileX, 0.03, tileY);
      group.add(pit);

      for (let index = 0; index < 6; index += 1) {
        const angle = (index / 6) * Math.PI * 2;
        const stone = new three.Mesh(
          new three.BoxGeometry(
            0.14 + hash2D(QUARRY_STONE_WIDTH_SEED, tileX + index, tileY) * 0.08,
            0.08 + hash2D(QUARRY_STONE_HEIGHT_SEED, tileX, tileY + index) * 0.05,
            0.14 + hash2D(QUARRY_STONE_DEPTH_SEED, tileX - index, tileY) * 0.08
          ),
          rubbleMaterial
        );
        stone.position.set(
          tileX + Math.cos(angle) * 0.58,
          0.08,
          tileY + Math.sin(angle) * 0.58
        );
        stone.rotation.y =
          hash2D(QUARRY_STONE_ROTATION_SEED, tileX + index, tileY - index) * Math.PI;
        group.add(stone);
      }

      const derrick = new three.Group();
      derrick.position.set(
        tileX + facing.dx * 0.18,
        0,
        tileY + facing.dy * 0.18
      );
      derrick.rotation.y = facing.rotationY;

      const leftPost = new three.Mesh(
        new three.BoxGeometry(0.06, 0.56, 0.06),
        timberMaterial
      );
      leftPost.position.set(-0.18, 0.28, 0.18);
      derrick.add(leftPost);

      const rightPost = new three.Mesh(
        new three.BoxGeometry(0.06, 0.56, 0.06),
        timberMaterial
      );
      rightPost.position.set(0.18, 0.28, 0.18);
      derrick.add(rightPost);

      const beam = new three.Mesh(
        new three.BoxGeometry(0.46, 0.05, 0.05),
        timberMaterial
      );
      beam.position.set(0, 0.54, 0.18);
      derrick.add(beam);

      const pulley = new three.Mesh(
        new three.TorusGeometry(0.06, 0.015, 6, 10),
        ropeMaterial
      );
      pulley.position.set(0, 0.5, 0.18);
      pulley.rotation.x = Math.PI / 2;
      derrick.add(pulley);

      const cable = new three.Mesh(
        new three.CylinderGeometry(0.008, 0.008, 0.32, 6),
        ropeMaterial
      );
      cable.position.set(0, 0.33, 0.18);
      derrick.add(cable);

      const bucket = new three.Mesh(
        new three.BoxGeometry(0.12, 0.1, 0.12),
        rubbleMaterial
      );
      bucket.position.set(0, 0.12, 0.18);
      derrick.add(bucket);

      const lanternCore = markPoiLightEmitter(
        new three.Mesh(
          new three.SphereGeometry(0.03, 6, 6),
          new three.MeshStandardMaterial({
            color: '#f59e0b',
            emissive: '#f59e0b',
            emissiveIntensity: 0.02,
            roughness: 0.34,
            metalness: 0.04,
          })
        ),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.28,
        }
      );
      lanternCore.position.set(0.18, 0.38, 0.18);
      derrick.add(lanternCore);

      const lanternLight = markPoiLightEmitter(
        new three.PointLight('#f8c36a', 0, 3.1, 1.9),
        {
          kind: 'point-light',
          nightIntensity: 0.76,
          visibleThreshold: 0.04,
        }
      );
      lanternLight.position.set(0.18, 0.38, 0.14);
      lanternLight.visible = false;
      derrick.add(lanternLight);

      group.add(derrick);

      const cart = new three.Mesh(
        new three.BoxGeometry(0.22, 0.08, 0.14),
        timberMaterial
      );
      cart.position.set(
        tileX - facing.dx * 0.34,
        0.06,
        tileY - facing.dy * 0.34
      );
      cart.rotation.y = facing.rotationY;
      group.add(cart);

      for (const wheelOffset of [-0.08, 0.08]) {
        const wheel = new three.Mesh(
          new three.CylinderGeometry(0.04, 0.04, 0.02, 8),
          darkMetalMaterial
        );
        wheel.position.set(
          cart.position.x + wheelOffset,
          0.04,
          cart.position.z + 0.08
        );
        wheel.rotation.z = Math.PI / 2;
        group.add(wheel);
      }

      return group;
    },
    sync3DModel({ model, cycle }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
      }
    },
  });
}

function getQuarryFacing(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
): ReturnType<typeof pickPreferredLandmarkFacing> {
  return pickPreferredLandmarkFacing({
    state,
    tileX,
    tileY,
    seedKey: QUARRY_FACING_SEED,
    preferLandFacing: true,
  });
}
