import { hash2D } from '@bworlds/core';
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
  Paint2DContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;

export function createCaveTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-cave',
    kind: 'cave',
    definition: {
      name: 'Cave',
      color: '#52525b',
      miniColor: '#71717a',
      walkable: true,
      wallHeight: 0.55,
    },
    note: 'A cave mouth opens in the terrain.',
    paint2D: createPlainsBackedTilePainter(({ context, x, y, motif, fillRect, speckle }) => {
      speckle(context, x, y, '#9ecf82', 14, 0.22, motif);
      context.fillStyle = '#27272a';
      context.beginPath();
      context.arc(x + 8 + motif.int(-1, 1), y + 8, 5.5, 0, Math.PI * 2);
      context.fill();
      fillRect(context, x + 5, y + 8, 6, 4, '#09090b');
      return true;
    }),
    create3DModel({
      three,
      state,
      tileX,
      tileY,
    }: Create3DModelContext) {
      const { mountainMaterial } = createMountainTerrainMaterials(three);

      const group = new three.Group();
      const entrance = getCaveEntranceDirection(state, tileX, tileY);
      const width = 0.9 + hash2D('cave-width', tileX, tileY) * 0.22;
      const depth = 0.92 + hash2D('cave-depth', tileX, tileY) * 0.24;
      const height = 0.96 + hash2D('cave-height', tileX, tileY) * 0.26;
      const boulderCount =
        3 + Math.floor(hash2D('cave-boulders', tileX, tileY) * 3);

      for (let index = 0; index < boulderCount; index += 1) {
        const boulder = new three.Mesh(
          new three.SphereGeometry(0.36, 8, 7),
          mountainMaterial
        );
        const radiusScale =
          0.9 +
          hash2D('cave-boulder-scale', tileX * 13 + index, tileY * 17) * 0.45;
        const xOffset =
          (hash2D('cave-boulder-x', tileX * 19 + index, tileY) - 0.5) * 0.34;
        const zOffset =
          (hash2D('cave-boulder-z', tileX, tileY * 23 + index) - 0.5) * 0.32;
        const yOffset =
          0.2 + hash2D('cave-boulder-y', tileX + index, tileY - index) * 0.32;
        boulder.position.set(tileX + xOffset, yOffset, tileY + zOffset);
        boulder.scale.set(
          width * radiusScale,
          height * (0.72 + radiusScale * 0.12),
          depth * radiusScale
        );
        group.add(boulder);
      }

      const cap = new three.Mesh(
        new three.SphereGeometry(0.3, 7, 6),
        mountainMaterial
      );
      cap.position.set(
        tileX + (hash2D('cave-cap-x', tileX, tileY) - 0.5) * 0.08,
        height * 0.82,
        tileY + (hash2D('cave-cap-z', tileX, tileY) - 0.5) * 0.08
      );
      cap.scale.set(width * 0.88, height * 0.6, depth * 0.82);
      group.add(cap);

      const portal = new three.Group();
      portal.position.set(
        tileX + entrance.dx * 0.5,
        0,
        tileY + entrance.dy * 0.5
      );
      portal.rotation.y = entrance.rotationY;

      const crown = new three.Mesh(
        new three.SphereGeometry(0.17, 7, 6),
        mountainMaterial
      );
      crown.position.set(0, 0.42, 0.08);
      crown.scale.set(2.2, 1.5, 1.05);
      portal.add(crown);

      const leftCheek = new three.Mesh(
        new three.SphereGeometry(0.14, 7, 6),
        mountainMaterial
      );
      leftCheek.position.set(-0.24, 0.2, 0.08);
      leftCheek.scale.set(1.4, 1.9, 1.1);
      portal.add(leftCheek);

      const rightCheek = new three.Mesh(
        new three.SphereGeometry(0.14, 7, 6),
        mountainMaterial
      );
      rightCheek.position.set(0.24, 0.2, 0.08);
      rightCheek.scale.set(1.4, 1.9, 1.1);
      portal.add(rightCheek);

      const mouthVoid = new three.Mesh(
        new three.CircleGeometry(0.18, 20),
        createBasicMaterial(three, {
          color: '#010308',
          side: three.DoubleSide,
        })
      );
      mouthVoid.position.set(0, 0.2, 0.22);
      portal.add(mouthVoid);

      const tunnelBack = new three.Mesh(
        new three.CircleGeometry(0.12, 18),
        createBasicMaterial(three, {
          color: '#000000',
          side: three.DoubleSide,
        })
      );
      tunnelBack.position.set(0, 0.19, -0.16);
      portal.add(tunnelBack);

      const tunnelCeiling = new three.Mesh(
        new three.PlaneGeometry(0.24, 0.46),
        createBasicMaterial(three, {
          color: '#03060a',
          side: three.DoubleSide,
        })
      );
      tunnelCeiling.position.set(0, 0.26, 0.01);
      tunnelCeiling.rotation.x = Math.PI * 0.5;
      portal.add(tunnelCeiling);

      const tunnelFloor = new three.Mesh(
        new three.PlaneGeometry(0.22, 0.34),
        createBasicMaterial(three, {
          color: '#080b10',
          side: three.DoubleSide,
        })
      );
      tunnelFloor.position.set(0, 0.04, 0.02);
      tunnelFloor.rotation.x = -Math.PI * 0.5;
      portal.add(tunnelFloor);

      const arch = new three.Mesh(
        new three.TorusGeometry(0.24, 0.06, 6, 12, Math.PI),
        mountainMaterial
      );
      arch.position.set(0, 0.31, 0.22);
      arch.rotation.z = Math.PI;
      portal.add(arch);

      const leftPillar = new three.Mesh(
        new three.SphereGeometry(0.08, 6, 6),
        mountainMaterial
      );
      leftPillar.position.set(-0.2, 0.16, 0.16);
      leftPillar.scale.set(1, 1.9, 1.2);
      portal.add(leftPillar);

      const rightPillar = new three.Mesh(
        new three.SphereGeometry(0.08, 6, 6),
        mountainMaterial
      );
      rightPillar.position.set(0.2, 0.16, 0.16);
      rightPillar.scale.set(1, 1.9, 1.2);
      portal.add(rightPillar);

      const sill = new three.Mesh(
        new three.SphereGeometry(0.1, 6, 6),
        mountainMaterial
      );
      sill.position.set(0, 0.03, 0.22);
      sill.scale.set(2.8, 0.55, 1.2);
      portal.add(sill);

      const lanternCore = markPoiLightEmitter(
        new three.Mesh(
          new three.SphereGeometry(0.035, 6, 6),
          new three.MeshStandardMaterial({
            color: '#f59e0b',
            emissive: '#f59e0b',
            emissiveIntensity: 0.02,
            roughness: 0.28,
            metalness: 0.04,
          })
        ),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.35,
        }
      );
      lanternCore.position.set(0.24, 0.34, 0.18);
      portal.add(lanternCore);

      const lanternLight = markPoiLightEmitter(
        new three.PointLight('#f6b85d', 0, 2.9, 1.9),
        {
          kind: 'point-light',
          nightIntensity: 0.82,
          visibleThreshold: 0.04,
        }
      );
      lanternLight.position.set(0.24, 0.34, 0.12);
      lanternLight.visible = false;
      portal.add(lanternLight);

      group.add(portal);
      return group;
    },
    sync3DModel({ model, cycle }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
      }
    },
  });
}

function getCaveEntranceDirection(
  state: Create3DModelContext['state'],
  tileX: number,
  tileY: number
): ReturnType<typeof pickPreferredLandmarkFacing> {
  return pickPreferredLandmarkFacing({
    state,
    tileX,
    tileY,
    seedKey: 'cave-facing',
    preferLandFacing: true,
  });
}
