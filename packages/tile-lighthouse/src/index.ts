import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createAnchoredEnterablePoiTilePlugin,
  getPoiLightActivation,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import { createBasicMaterial } from '@bworlds/three-support';
import type {
  Create3DModelContext,
  RuntimePlugin,
  ThreeMaterialLike,
  ThreeObject3DLike,
} from '@bworlds/plugin-api';

const LIGHTHOUSE_BEAM_PIVOT_KEY = 'lighthouseBeamPivot';
const LIGHTHOUSE_BEAM_KEY = 'lighthouseBeam';
const lighthouseMaterialCache = new WeakMap<
  object,
  {
    wallMaterial: ThreeMaterialLike;
    stripeMaterial: ThreeMaterialLike;
    stoneMaterial: ThreeMaterialLike;
    paneMaterial: ThreeMaterialLike;
    beamMaterial: ThreeMaterialLike;
  }
>();

type BeamMaterialLike = ThreeMaterialLike & {
  opacity?: number;
};
type BeamNodeLike = ThreeObject3DLike & {
  material?: BeamMaterialLike | BeamMaterialLike[];
};

export function createLighthouseTilePlugin(): RuntimePlugin {
  return createAnchoredEnterablePoiTilePlugin({
    pluginName: 'tile-lighthouse',
    kind: 'lighthouse',
    definition: {
      name: 'Lighthouse',
      color: '#f3e8d5',
      miniColor: '#fff5e1',
      walkable: true,
      wallHeight: 0.78,
    },
    note: 'A lighthouse stands watch over the nearby coast.',
    paint2D: createPlainsBackedTilePainter(({ context, x, y, fillRect }) => {
      fillRect(context, x + 5, y + 2, 6, 12, '#f8fafc');
      fillRect(context, x + 4, y + 11, 8, 3, '#8b5e34');
      fillRect(context, x + 4, y + 3, 8, 2, '#c2410c');
      fillRect(context, x + 6, y + 5, 4, 2, '#fde68a');
      fillRect(context, x + 7, y + 8, 2, 4, '#7c3f1d');
      return true;
    }),
    create3DModel({ three, tileX, tileY }: Create3DModelContext) {
      const group = new three.Group();
      const { wallMaterial, stripeMaterial, stoneMaterial, paneMaterial, beamMaterial } =
        getLighthouseSharedMaterials(three);

      const base = new three.Mesh(
        new three.CylinderGeometry(0.46, 0.6, 0.32, 10),
        stoneMaterial
      );
      base.position.set(tileX, 0.16, tileY);
      group.add(base);

      const tower = new three.Mesh(
        new three.CylinderGeometry(0.34, 0.42, 1.8, 10),
        wallMaterial
      );
      tower.position.set(tileX, 1.06, tileY);
      group.add(tower);

      const stripe = new three.Mesh(
        new three.CylinderGeometry(0.35, 0.41, 0.22, 10),
        stripeMaterial
      );
      stripe.position.set(tileX, 0.92, tileY);
      group.add(stripe);

      const cap = new three.Mesh(
        new three.ConeGeometry(0.42, 0.34, 10),
        stripeMaterial
      );
      cap.position.set(tileX, 2.1, tileY);
      group.add(cap);

      const lanternRoom = new three.Mesh(
        new three.CylinderGeometry(0.24, 0.24, 0.28, 8),
        wallMaterial
      );
      lanternRoom.position.set(tileX, 1.86, tileY);
      group.add(lanternRoom);

      for (const offset of [
        { x: 0.22, z: 0 },
        { x: -0.22, z: 0 },
        { x: 0, z: 0.22 },
        { x: 0, z: -0.22 },
      ]) {
        const pane = markPoiLightEmitter(
          new three.Mesh(new three.PlaneGeometry(0.16, 0.12), paneMaterial),
          {
            kind: 'emissive-mesh',
            dayIntensity: 0.08,
            nightIntensity: 1.3,
          }
        );
        pane.position.set(tileX + offset.x, 1.86, tileY + offset.z);
        if (offset.x !== 0) {
          pane.rotation.y = Math.PI / 2;
        }
        group.add(pane);
      }

      const beamPivot = new three.Group();
      beamPivot.userData = {
        ...(beamPivot.userData ?? {}),
        [LIGHTHOUSE_BEAM_PIVOT_KEY]: true,
      };
      beamPivot.position.set(tileX, 1.88, tileY);

      const beam = new three.Mesh(
        new three.ConeGeometry(0.32, 3.8, 12),
        beamMaterial
      ) as BeamNodeLike;
      beam.userData = {
        ...(beam.userData ?? {}),
        [LIGHTHOUSE_BEAM_KEY]: true,
      };
      beam.rotation.z = -Math.PI / 2;
      beam.position.set(1.9, 0, 0);
      beam.visible = false;
      beamPivot.add(beam);
      group.add(beamPivot);

      const beacon = markPoiLightEmitter(
        new three.PointLight('#fff1b2', 0, 6.2, 1.6),
        {
          kind: 'point-light',
          nightIntensity: 1.15,
          visibleThreshold: 0.05,
        }
      );
      beacon.position.set(tileX, 1.88, tileY);
      beacon.visible = false;
      group.add(beacon);

      return group;
    },
    sync3DModel({ model, cycle, timeMs }) {
      if (!model || typeof model !== 'object') {
        return;
      }
      syncPoiLightEmitters(model as Parameters<typeof syncPoiLightEmitters>[0], cycle);
      syncLighthouseBeam(model as ThreeObject3DLike, cycle, timeMs ?? 0);
    },
  });
}

function getLighthouseSharedMaterials(three: Create3DModelContext['three']) {
  let cached = lighthouseMaterialCache.get(three as object);
  if (!cached) {
    cached = {
      wallMaterial: new three.MeshStandardMaterial({
        color: '#f7f0e1',
        roughness: 0.88,
        metalness: 0.02,
      }),
      stripeMaterial: new three.MeshStandardMaterial({
        color: '#c2410c',
        roughness: 0.82,
        metalness: 0.02,
      }),
      stoneMaterial: new three.MeshStandardMaterial({
        color: '#9aa4b2',
        roughness: 0.96,
        metalness: 0.02,
      }),
      paneMaterial: new three.MeshStandardMaterial({
        color: '#fff1b2',
        emissive: '#fff1b2',
        emissiveIntensity: 0.08,
        roughness: 0.3,
        metalness: 0.02,
        side: three.DoubleSide,
      }),
      beamMaterial: createBasicMaterial(three, {
        color: '#ffe9a8',
        transparent: true,
        depthWrite: false,
        side: three.DoubleSide,
      }),
    };
    (cached.beamMaterial as BeamMaterialLike).opacity = 0;
    lighthouseMaterialCache.set(three as object, cached);
  }
  return cached;
}

function syncLighthouseBeam(
  root: ThreeObject3DLike,
  cycle: { daylight: number; twilight: number; night: number },
  timeMs: number
): void {
  const activation = getPoiLightActivation(cycle);
  const sweepRotation = ((timeMs / 2100) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

  root.traverse?.((node) => {
    if (node.userData?.[LIGHTHOUSE_BEAM_PIVOT_KEY]) {
      node.rotation.y = sweepRotation;
    }
    if (!node.userData?.[LIGHTHOUSE_BEAM_KEY]) {
      return;
    }

    node.visible = activation > 0.08;
    const beamNode = node as BeamNodeLike;
    const materials = Array.isArray(beamNode.material)
      ? beamNode.material
      : beamNode.material
        ? [beamNode.material]
        : [];
    materials.forEach((material) => {
      material.opacity = 0.02 + activation * 0.24;
    });
  });
}
