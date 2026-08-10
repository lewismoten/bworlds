import { getOrCreateWeakMapValue } from '@bworlds/cache-support';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createEnterablePoiTilePlugin,
  findPoiAnchor,
} from '@bworlds/poi-support';
import {
  createMountainTerrainMaterials,
  getSharedBoxGeometry,
  getSharedCylinderGeometry,
  getSharedSphereGeometry,
} from '@bworlds/three-support';
import type {
  ClassifyOverworldTileContext,
  Create3DModelContext,
  RuntimePlugin,
  ThreeMaterialLike,
} from '@bworlds/plugin-api';

const OBSERVATORY_DOME_KEY = 'observatoryDome';
const OBSERVATORY_TELESCOPE_KEY = 'observatoryTelescope';
const observatoryMaterialCache = new WeakMap<
  object,
  {
    wallMaterial: ThreeMaterialLike;
    trimMaterial: ThreeMaterialLike;
    domeMaterial: ThreeMaterialLike;
    telescopeMaterial: ThreeMaterialLike;
  }
>();

export function createObservatoryTilePlugin(): RuntimePlugin {
  return createEnterablePoiTilePlugin({
    pluginName: 'tile-observatory',
    kind: 'observatory',
    definition: {
      name: 'Observatory',
      color: '#9fb4c4',
      miniColor: '#d6e0ea',
      walkable: true,
      wallHeight: 0.86,
    },
    classifyPoi(context: ClassifyOverworldTileContext) {
      if (context.tile.kind !== 'mountain') {
        return null;
      }
      const anchor = findPoiAnchor(context, 'observatory', 0.55);
      if (!anchor) {
        return null;
      }
      return {
        kind: 'observatory',
        poi: {
          type: 'observatory',
          name: anchor.name,
        },
        note: 'An observatory crowns the mountain summit.',
      };
    },
    paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
      fillRect(context, x + 2, y + 8, 12, 5, '#6b7280');
      fillRect(context, x + 4, y + 4, 8, 4, '#dce6ef');
      fillRect(context, x + 6, y + 2, 4, 2, '#9fb4c4');
      fillRect(context, x + 7, y + 7, 2, 4, '#1f2937');
      return true;
    }),
    create3DModel({ three, tileX, tileY }: Create3DModelContext) {
      const { mountainMaterial, snowMaterial } =
        createMountainTerrainMaterials(three);
      const { wallMaterial, trimMaterial, domeMaterial, telescopeMaterial } =
        getObservatorySharedMaterials(three);

      const group = new three.Group();

      const base = new three.Mesh(
        getSharedCylinderGeometry(three, 0.72, 0.92, 0.38, 10),
        mountainMaterial
      );
      base.position.set(tileX, 0.19, tileY);
      group.add(base);

      const tower = new three.Mesh(
        getSharedCylinderGeometry(three, 0.46, 0.52, 0.82, 10),
        wallMaterial
      );
      tower.position.set(tileX, 0.7, tileY);
      group.add(tower);

      const ring = new three.Mesh(
        getSharedCylinderGeometry(three, 0.5, 0.54, 0.08, 10),
        trimMaterial
      );
      ring.position.set(tileX, 1.08, tileY);
      group.add(ring);

      const domePivot = new three.Group();
      domePivot.userData = {
        ...(domePivot.userData ?? {}),
        [OBSERVATORY_DOME_KEY]: true,
      };
      domePivot.position.set(tileX, 1.08, tileY);

      const dome = new three.Mesh(
        getSharedSphereGeometry(three, 0.42, 12, 8),
        domeMaterial
      );
      dome.scale.set(1, 0.82, 1);
      domePivot.add(dome);

      const slit = new three.Mesh(
        getSharedBoxGeometry(three, 0.12, 0.44, 0.58),
        trimMaterial
      );
      slit.position.set(0, 0.06, 0.2);
      domePivot.add(slit);
      group.add(domePivot);

      const telescope = new three.Group();
      telescope.userData = {
        ...(telescope.userData ?? {}),
        [OBSERVATORY_TELESCOPE_KEY]: true,
      };
      telescope.position.set(tileX, 0.92, tileY - 0.02);
      telescope.visible = false;

      const telescopeBase = new three.Mesh(
        getSharedCylinderGeometry(three, 0.08, 0.1, 0.22, 8),
        trimMaterial
      );
      telescopeBase.position.y = 0.11;
      telescope.add(telescopeBase);

      const telescopeTube = new three.Mesh(
        getSharedCylinderGeometry(three, 0.06, 0.07, 0.72, 10),
        telescopeMaterial
      );
      telescopeTube.rotation.z = Math.PI / 2.5;
      telescopeTube.rotation.y = -Math.PI / 4;
      telescopeTube.position.set(0.12, 0.34, -0.06);
      telescope.add(telescopeTube);

      const eyepiece = new three.Mesh(
        getSharedCylinderGeometry(three, 0.03, 0.03, 0.14, 8),
        snowMaterial
      );
      eyepiece.rotation.z = telescopeTube.rotation.z;
      eyepiece.rotation.y = telescopeTube.rotation.y;
      eyepiece.position.set(-0.08, 0.27, 0.05);
      telescope.add(eyepiece);
      group.add(telescope);

      return group;
    },
    sync3DModel({ model, cycle }) {
      if (!model || typeof model !== 'object') {
        return;
      }
      syncObservatoryModel(model as ThreeObject3DLike, cycle);
    },
  });
}

function getObservatorySharedMaterials(three: Create3DModelContext['three']) {
  return getOrCreateWeakMapValue(
    observatoryMaterialCache,
    three as object,
    () => {
      return {
        wallMaterial: new three.MeshStandardMaterial({
          color: '#dbe5ed',
          roughness: 0.9,
          metalness: 0.02,
        }),
        trimMaterial: new three.MeshStandardMaterial({
          color: '#566170',
          roughness: 0.84,
          metalness: 0.04,
        }),
        domeMaterial: new three.MeshStandardMaterial({
          color: '#c8d5df',
          roughness: 0.82,
          metalness: 0.06,
        }),
        telescopeMaterial: new three.MeshStandardMaterial({
          color: '#2f3945',
          roughness: 0.58,
          metalness: 0.32,
        }),
      };
    }
  );
}

function syncObservatoryModel(
  root: ThreeObject3DLike,
  cycle: { daylight: number; twilight: number; night: number }
) {
  const openAmount = Math.min(
    1,
    Math.max(0, cycle.night + cycle.twilight * 0.92 - cycle.daylight * 0.16)
  );

  root.traverse?.((node) => {
    if (node.userData?.[OBSERVATORY_DOME_KEY]) {
      node.rotation.y = openAmount * 1.08;
    }
    if (node.userData?.[OBSERVATORY_TELESCOPE_KEY]) {
      node.visible = openAmount > 0.08;
      node.rotation.x = -openAmount * 0.24;
    }
  });
}
