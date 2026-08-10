import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createAnchoredEnterablePoiTilePlugin,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import { createHostMaterialResolver } from '@bworlds/procedural-style';
import {
  createBasicMaterial,
  getSharedBoxGeometry,
  getSharedConeGeometry,
  getSharedSphereGeometry,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  RuntimePlugin,
  ThreeMaterialLike,
} from '@bworlds/plugin-api';

export function createStationTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-station',
    kind: 'station',
    definition: {
      name: 'Train Station',
      color: '#8a5b3f',
      miniColor: '#d2b08a',
      walkable: true,
      wallHeight: 0.78,
    },
    note: 'A train station waits with silent tracks and an echoing platform hall.',
    paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
      fillRect(context, x + 1, y + 5, 14, 7, '#7c4f32');
      fillRect(context, x + 3, y + 3, 10, 3, '#cba47c');
      fillRect(context, x + 6, y + 1, 4, 2, '#5c3b28');
      fillRect(context, x + 4, y + 8, 2, 3, '#2f241c');
      fillRect(context, x + 10, y + 8, 2, 3, '#2f241c');
      return true;
    }),
    create3DModel({ three, tileX, tileY }: Create3DModelContext) {
      const { wallMaterial, roofMaterial, trimMaterial, lampMaterial } =
        getStationSharedMaterials(three);
      const group = new three.Group();

      const base = new three.Mesh(
        getSharedBoxGeometry(three, 1.08, 0.18, 1.08),
        wallMaterial
      );
      base.position.set(tileX, 0.09, tileY);
      group.add(base);

      const hall = new three.Mesh(
        getSharedBoxGeometry(three, 0.88, 0.6, 0.76),
        wallMaterial
      );
      hall.position.set(tileX, 0.48, tileY + 0.06);
      group.add(hall);

      const roof = new three.Mesh(
        getSharedConeGeometry(three, 0.74, 0.42, 4),
        roofMaterial
      );
      roof.position.set(tileX, 0.96, tileY + 0.06);
      roof.rotation.y = Math.PI * 0.25;
      group.add(roof);

      const canopy = new three.Mesh(
        getSharedBoxGeometry(three, 0.96, 0.06, 0.28),
        trimMaterial
      );
      canopy.position.set(tileX, 0.5, tileY - 0.44);
      group.add(canopy);

      const lamp = markPoiLightEmitter(
        new three.Mesh(
          getSharedSphereGeometry(three, 0.04, 6, 6),
          lampMaterial
        ),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.22,
        }
      );
      lamp.position.set(tileX, 0.58, tileY - 0.36);
      group.add(lamp);

      const light = markPoiLightEmitter(
        new three.PointLight('#f8c878', 0, 3.6, 1.8),
        {
          kind: 'point-light',
          nightIntensity: 0.7,
          visibleThreshold: 0.03,
        }
      );
      light.position.set(tileX, 0.58, tileY - 0.36);
      light.visible = false;
      group.add(light);

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

function getStationSharedMaterials(three: Create3DModelContext['three']) {
  return stationSharedMaterials.createMaterials(three);
}

const stationSharedMaterials = createHostMaterialResolver(
  (
    three: Create3DModelContext['three']
  ): {
    wallMaterial: ThreeMaterialLike;
    roofMaterial: ThreeMaterialLike;
    trimMaterial: ThreeMaterialLike;
    lampMaterial: ThreeMaterialLike;
  } => ({
    wallMaterial: createBasicMaterial(three, { color: '#8d6044' }),
    roofMaterial: createBasicMaterial(three, { color: '#5e4537' }),
    trimMaterial: createBasicMaterial(three, { color: '#d1b28a' }),
    lampMaterial: new three.MeshStandardMaterial({
      color: '#f59e0b',
      emissive: '#f59e0b',
      emissiveIntensity: 0.02,
      roughness: 0.36,
      metalness: 0.04,
    }),
  })
);
