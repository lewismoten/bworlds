import { getOrCreateWeakMapValue } from '@bworlds/cache-support';
import { hash2D, registerHashLabel } from '@bworlds/core/hash';
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
  ThreeMatrix4Like,
  ThreeMaterialLike,
} from '@bworlds/plugin-api';

const QUARRY_STONE_WIDTH_SEED = registerHashLabel('quarry-stone-w');
const QUARRY_STONE_HEIGHT_SEED = registerHashLabel('quarry-stone-h');
const QUARRY_STONE_DEPTH_SEED = registerHashLabel('quarry-stone-d');
const QUARRY_FACING_SEED = registerHashLabel('quarry-facing');
const quarryMaterialCache = new WeakMap<
  object,
  {
    timberMaterial: ThreeMaterialLike;
    ropeMaterial: ThreeMaterialLike;
    rubbleMaterial: ThreeMaterialLike;
    darkMetalMaterial: ThreeMaterialLike;
    lanternMaterial: ThreeMaterialLike;
  }
>();

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
    paint2D: createPlainsBackedTilePainter(
      ({ context, x, y, motif, fillRect, speckle }) => {
        fillRect(context, x + 2, y + 2, 12, 12, '#8f857b');
        fillRect(context, x + 4, y + 4, 8, 8, '#5b524b');
        fillRect(context, x + 6, y + 6, 4, 4, '#2f2a27');
        fillRect(context, x + 10, y + 2, 2, 10, '#6b4f35');
        fillRect(context, x + 9, y + 3, 4, 1, '#8d6a46');
        speckle(context, x, y, '#c7beb4', 10, 0.18, motif);
        return true;
      }
    ),
    create3DModel({ three, state, tileX, tileY }: Create3DModelContext) {
      const { mountainMaterial } = createMountainTerrainMaterials(three);
      const {
        timberMaterial,
        ropeMaterial,
        rubbleMaterial,
        darkMetalMaterial,
        lanternMaterial,
      } = getQuarrySharedMaterials(three);

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

      const stoneInstances = new three.InstancedMesh(
        new three.BoxGeometry(1, 1, 1),
        rubbleMaterial,
        6
      );
      stoneInstances.userData = {
        ...stoneInstances.userData,
        quarryInstancedPart: 'rubble-stone',
      };
      const stoneMatrixScratch = new three.Matrix4();

      for (let index = 0; index < stoneInstances.count; index += 1) {
        const angle = (index / 6) * Math.PI * 2;
        stoneInstances.setMatrixAt(
          index,
          writeInstancedScalePositionMatrix(
            stoneMatrixScratch,
            tileX + Math.cos(angle) * 0.58,
            0.08,
            tileY + Math.sin(angle) * 0.58,
            0.14 + hash2D(QUARRY_STONE_WIDTH_SEED, tileX + index, tileY) * 0.08,
            0.08 +
              hash2D(QUARRY_STONE_HEIGHT_SEED, tileX, tileY + index) * 0.05,
            0.14 + hash2D(QUARRY_STONE_DEPTH_SEED, tileX - index, tileY) * 0.08
          )
        );
      }
      group.add(stoneInstances);

      const derrickOriginX = tileX + facing.dx * 0.18;
      const derrickOriginZ = tileY + facing.dy * 0.18;

      const derrickPostInstances = new three.InstancedMesh(
        new three.BoxGeometry(0.06, 0.56, 0.06),
        timberMaterial
      );
      derrickPostInstances.count = 2;
      derrickPostInstances.userData = {
        ...derrickPostInstances.userData,
        quarryInstancedPart: 'derrick-post',
      };
      const derrickPostMatrixScratch = new three.Matrix4();
      derrickPostInstances.setMatrixAt(
        0,
        writeInstancedScalePositionMatrix(
          derrickPostMatrixScratch,
          derrickOriginX +
            rotateQuarryLocalOffset(-0.18, 0.18, facing.rotationY).x,
          0.28,
          derrickOriginZ +
            rotateQuarryLocalOffset(-0.18, 0.18, facing.rotationY).z,
          1,
          1,
          1
        )
      );
      derrickPostInstances.setMatrixAt(
        1,
        writeInstancedScalePositionMatrix(
          derrickPostMatrixScratch,
          derrickOriginX +
            rotateQuarryLocalOffset(0.18, 0.18, facing.rotationY).x,
          0.28,
          derrickOriginZ +
            rotateQuarryLocalOffset(0.18, 0.18, facing.rotationY).z,
          1,
          1,
          1
        )
      );
      group.add(derrickPostInstances);

      const beam = new three.Mesh(
        new three.BoxGeometry(0.46, 0.05, 0.05),
        timberMaterial
      );
      const beamOffset = rotateQuarryLocalOffset(0, 0.18, facing.rotationY);
      beam.position.set(
        derrickOriginX + beamOffset.x,
        0.54,
        derrickOriginZ + beamOffset.z
      );
      beam.rotation.y = facing.rotationY;
      group.add(beam);

      const pulley = new three.Mesh(
        new three.TorusGeometry(0.06, 0.015, 6, 10),
        ropeMaterial
      );
      const pulleyOffset = rotateQuarryLocalOffset(0, 0.18, facing.rotationY);
      pulley.position.set(
        derrickOriginX + pulleyOffset.x,
        0.5,
        derrickOriginZ + pulleyOffset.z
      );
      pulley.rotation.y = facing.rotationY;
      pulley.rotation.x = Math.PI / 2;
      group.add(pulley);

      const cable = new three.Mesh(
        new three.CylinderGeometry(0.008, 0.008, 0.32, 6),
        ropeMaterial
      );
      const cableOffset = rotateQuarryLocalOffset(0, 0.18, facing.rotationY);
      cable.position.set(
        derrickOriginX + cableOffset.x,
        0.33,
        derrickOriginZ + cableOffset.z
      );
      group.add(cable);

      const bucket = new three.Mesh(
        new three.BoxGeometry(0.12, 0.1, 0.12),
        rubbleMaterial
      );
      const bucketOffset = rotateQuarryLocalOffset(0, 0.18, facing.rotationY);
      bucket.position.set(
        derrickOriginX + bucketOffset.x,
        0.12,
        derrickOriginZ + bucketOffset.z
      );
      group.add(bucket);

      const lanternCore = markPoiLightEmitter(
        new three.Mesh(new three.SphereGeometry(0.03, 6, 6), lanternMaterial),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.28,
        }
      );
      const lanternCoreOffset = rotateQuarryLocalOffset(
        0.18,
        0.18,
        facing.rotationY
      );
      lanternCore.position.set(
        derrickOriginX + lanternCoreOffset.x,
        0.38,
        derrickOriginZ + lanternCoreOffset.z
      );
      group.add(lanternCore);

      const lanternLight = markPoiLightEmitter(
        new three.PointLight('#f8c36a', 0, 3.1, 1.9),
        {
          kind: 'point-light',
          nightIntensity: 0.76,
          visibleThreshold: 0.04,
        }
      );
      const lanternLightOffset = rotateQuarryLocalOffset(
        0.18,
        0.14,
        facing.rotationY
      );
      lanternLight.position.set(
        derrickOriginX + lanternLightOffset.x,
        0.38,
        derrickOriginZ + lanternLightOffset.z
      );
      lanternLight.visible = false;
      group.add(lanternLight);

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

      const wheelInstances = new three.InstancedMesh(
        new three.CylinderGeometry(0.04, 0.04, 0.02, 8),
        darkMetalMaterial,
        2
      );
      wheelInstances.userData = {
        ...wheelInstances.userData,
        quarryInstancedPart: 'cart-wheel',
      };
      const wheelMatrixScratch = new three.Matrix4();

      [-0.08, 0.08].forEach((wheelOffset, index) => {
        wheelInstances.setMatrixAt(
          index,
          writeInstancedScalePositionMatrix(
            wheelMatrixScratch,
            cart.position.x + wheelOffset,
            0.04,
            cart.position.z + 0.08,
            1,
            1,
            1
          )
        );
      });
      group.add(wheelInstances);

      return group;
    },
    sync3DModel({ model, cycle }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(
          model as Parameters<typeof syncPoiLightEmitters>[0],
          cycle
        );
      }
    },
  });
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

function rotateQuarryLocalOffset(
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

function getQuarrySharedMaterials(three: Create3DModelContext['three']) {
  return getOrCreateWeakMapValue(quarryMaterialCache, three as object, () => {
    return {
      timberMaterial: createBasicMaterial(three, { color: '#7c5a3b' }),
      ropeMaterial: createBasicMaterial(three, { color: '#d2b48c' }),
      rubbleMaterial: createBasicMaterial(three, { color: '#9c9186' }),
      darkMetalMaterial: createBasicMaterial(three, { color: '#2f261f' }),
      lanternMaterial: new three.MeshStandardMaterial({
        color: '#f59e0b',
        emissive: '#f59e0b',
        emissiveIntensity: 0.02,
        roughness: 0.34,
        metalness: 0.04,
      }),
    };
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
