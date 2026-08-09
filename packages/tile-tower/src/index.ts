import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createAnchoredEnterablePoiTilePlugin,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import { createBasicMaterial } from '@bworlds/three-support';
import type {
  Create3DModelContext,
  RuntimePlugin,
  ThreeMaterialLike,
} from '@bworlds/plugin-api';

const towerMaterialCache = new WeakMap<
  object,
  {
    stoneMaterial: ThreeMaterialLike;
    trimMaterial: ThreeMaterialLike;
    roofMaterial: ThreeMaterialLike;
    lampMaterial: ThreeMaterialLike;
  }
>();

export function createTowerTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-tower',
    kind: 'tower',
    definition: {
      name: 'Puzzle Tower',
      color: '#8a8178',
      miniColor: '#d3c7b8',
      walkable: true,
      wallHeight: 0.88,
    },
    note: 'An old puzzle tower rises from the nearby high ground.',
    blockedKinds: new Set(['river', 'ocean']),
    paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
      fillRect(context, x + 5, y + 2, 6, 11, '#b8ada1');
      fillRect(context, x + 4, y + 3, 8, 2, '#7b6f66');
      fillRect(context, x + 6, y + 6, 4, 2, '#ddd6cf');
      fillRect(context, x + 7, y + 9, 2, 4, '#2f241c');
      fillRect(context, x + 6, y + 1, 4, 1, '#5b524b');
      return true;
    }),
    create3DModel({ three, tileX, tileY }: Create3DModelContext) {
      const { stoneMaterial, trimMaterial, roofMaterial, lampMaterial } =
        getTowerSharedMaterials(three);
      const group = new three.Group();

      const base = new three.Mesh(
        new three.CylinderGeometry(0.56, 0.7, 0.22, 8),
        stoneMaterial
      );
      base.position.set(tileX, 0.11, tileY);
      group.add(base);

      const shaft = new three.Mesh(
        new three.CylinderGeometry(0.42, 0.5, 1.48, 8),
        stoneMaterial
      );
      shaft.position.set(tileX, 0.96, tileY);
      group.add(shaft);

      const ring = new three.Mesh(
        new three.CylinderGeometry(0.5, 0.56, 0.08, 8),
        trimMaterial
      );
      ring.position.set(tileX, 1.64, tileY);
      group.add(ring);

      const cap = new three.Mesh(
        new three.ConeGeometry(0.56, 0.34, 8),
        roofMaterial
      );
      cap.position.set(tileX, 1.86, tileY);
      group.add(cap);

      const doorway = new three.Mesh(
        new three.BoxGeometry(0.22, 0.34, 0.08),
        trimMaterial
      );
      doorway.position.set(tileX, 0.17, tileY + 0.44);
      group.add(doorway);

      const lantern = markPoiLightEmitter(
        new three.Mesh(new three.SphereGeometry(0.04, 6, 6), lampMaterial),
        {
          kind: 'emissive-mesh',
          dayIntensity: 0.02,
          nightIntensity: 1.26,
        }
      );
      lantern.position.set(tileX + 0.2, 0.42, tileY + 0.32);
      group.add(lantern);

      const light = markPoiLightEmitter(
        new three.PointLight('#f8cd74', 0, 3.4, 1.85),
        {
          kind: 'point-light',
          nightIntensity: 0.72,
          visibleThreshold: 0.04,
        }
      );
      light.position.set(tileX + 0.2, 0.42, tileY + 0.32);
      light.visible = false;
      group.add(light);

      return group;
    },
    sync3DModel({ model, cycle }) {
      if (model && typeof model === 'object') {
        syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
      }
    },
  });
}

function getTowerSharedMaterials(three: Create3DModelContext['three']) {
  let cached = towerMaterialCache.get(three as object);
  if (!cached) {
    cached = {
      stoneMaterial: createBasicMaterial(three, { color: '#9b9085' }),
      trimMaterial: createBasicMaterial(three, { color: '#645b54' }),
      roofMaterial: createBasicMaterial(three, { color: '#4d423b' }),
      lampMaterial: new three.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#fbbf24',
        emissiveIntensity: 0.02,
        roughness: 0.34,
        metalness: 0.04,
      }),
    };
    towerMaterialCache.set(three as object, cached);
  }
  return cached;
}
