import { hash2D, registerHashLabel } from '@bworlds/core';
import { createPlainsBackedTilePainter } from '@bworlds/paint-support';
import {
  createAnchoredEnterablePoiTilePlugin,
  getPoiLightActivation,
  markPoiLightEmitter,
  syncPoiLightEmitters,
} from '@bworlds/poi-support';
import {
  createHostMaterialResolver,
  createRegionalMaterialResolver,
} from '@bworlds/procedural-style';
import {
  getSharedConeGeometry,
  getSharedCylinderGeometry,
} from '@bworlds/three-support';
import type {
  Create3DModelContext,
  RuntimePlugin,
  ThreeMaterialLike,
  ThreeObject3DLike,
} from '@bworlds/plugin-api';

const LIGHTHOUSE_BEAM_PIVOT_KEY = 'lighthouseBeamPivot';
const LIGHTHOUSE_BEAM_KEY = 'lighthouseBeam';
const LIGHTHOUSE_REGION_SIZE = 18;
const LIGHTHOUSE_BEAM_COLOR_SEED = registerHashLabel('lighthouse-beam-color');
const LIGHTHOUSE_PANE_COLOR_SEED = registerHashLabel('lighthouse-pane-color');
const LIGHTHOUSE_BEAM_START_OFFSET = 0.14;
const LIGHTHOUSE_BEAM_SEGMENTS = [
  { key: 'near', radius: 0.1, length: 1.1, opacity: 0.24, emissiveIntensity: 1.2 },
  { key: 'mid', radius: 0.19, length: 1.22, opacity: 0.16, emissiveIntensity: 0.9 },
  { key: 'far', radius: 0.32, length: 1.48, opacity: 0.08, emissiveIntensity: 0.58 },
] as const;
const lighthouseStyleCache = new Map<
  string,
  {
    createMaterials(
      three: Create3DModelContext['three']
    ): LighthouseStyleMaterials;
  }
>();

type BeamMaterialLike = ThreeMaterialLike & {
  opacity?: number;
  emissiveIntensity?: number;
};
type BeamNodeLike = ThreeObject3DLike & {
  material?: BeamMaterialLike | BeamMaterialLike[];
  castShadow?: boolean;
  receiveShadow?: boolean;
};
type LighthouseStyleMaterials = {
  wallMaterial: ThreeMaterialLike;
  stripeMaterial: ThreeMaterialLike;
  stoneMaterial: ThreeMaterialLike;
  paneMaterial: ThreeMaterialLike;
  beamColor: string;
  beamMaterials: Record<
    (typeof LIGHTHOUSE_BEAM_SEGMENTS)[number]['key'],
    ThreeMaterialLike
  >;
};

const resolveRegionalLighthouseStyle = createRegionalMaterialResolver(
  lighthouseStyleCache,
  LIGHTHOUSE_REGION_SIZE,
  ({ regionX, regionY }) => {
    const beamColor = pickLighthouseBeamColor(
      hash2D(LIGHTHOUSE_BEAM_COLOR_SEED, regionX, regionY)
    );
    const paneColor = pickLighthousePaneColor(
      hash2D(LIGHTHOUSE_PANE_COLOR_SEED, regionX, regionY),
      beamColor
    );

    return createHostMaterialResolver(
      (three: Create3DModelContext['three']): LighthouseStyleMaterials => ({
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
          color: paneColor,
          emissive: paneColor,
          emissiveIntensity: 0.08,
          roughness: 0.3,
          metalness: 0.02,
          side: three.DoubleSide,
        }),
        beamColor,
        beamMaterials: Object.fromEntries(
          LIGHTHOUSE_BEAM_SEGMENTS.map((segment) => [
            segment.key,
            new three.MeshStandardMaterial({
              color: beamColor,
              emissive: beamColor,
              emissiveIntensity: 0,
              transparent: true,
              opacity: 0,
              depthWrite: false,
              roughness: 0.18,
              metalness: 0,
              side: three.DoubleSide,
            }),
          ])
        ) as Record<(typeof LIGHTHOUSE_BEAM_SEGMENTS)[number]['key'], ThreeMaterialLike>,
      })
    );
  }
);

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
      const { wallMaterial, stripeMaterial, stoneMaterial, paneMaterial, beamColor, beamMaterials } =
        resolveRegionalLighthouseStyle(three, tileX, tileY);

      const base = new three.Mesh(
        getSharedCylinderGeometry(three, 0.46, 0.6, 0.32, 10),
        stoneMaterial
      );
      base.position.set(tileX, 0.16, tileY);
      group.add(base);

      const tower = new three.Mesh(
        getSharedCylinderGeometry(three, 0.34, 0.42, 1.8, 10),
        wallMaterial
      );
      tower.position.set(tileX, 1.06, tileY);
      group.add(tower);

      const stripe = new three.Mesh(
        getSharedCylinderGeometry(three, 0.35, 0.41, 0.22, 10),
        stripeMaterial
      );
      stripe.position.set(tileX, 0.92, tileY);
      group.add(stripe);

      const cap = new three.Mesh(
        getSharedConeGeometry(three, 0.42, 0.34, 10),
        stripeMaterial
      );
      cap.position.set(tileX, 2.1, tileY);
      group.add(cap);

      const lanternRoom = new three.Mesh(
        getSharedCylinderGeometry(three, 0.24, 0.24, 0.28, 8),
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

      let beamOffset = LIGHTHOUSE_BEAM_START_OFFSET;
      for (const segment of LIGHTHOUSE_BEAM_SEGMENTS) {
        const beam = new three.Mesh(
          getSharedConeGeometry(three, segment.radius, segment.length, 12),
          beamMaterials[segment.key]
        ) as BeamNodeLike;
        beam.userData = {
          ...(beam.userData ?? {}),
          [LIGHTHOUSE_BEAM_KEY]: true,
          lighthouseBeamColor: beamColor,
          lighthouseBeamOpacity: segment.opacity,
          lighthouseBeamEmissiveIntensity: segment.emissiveIntensity,
        };
        beam.rotation.z = Math.PI / 2;
        beam.position.set(beamOffset + segment.length * 0.5, 0, 0);
        beam.castShadow = false;
        beam.receiveShadow = false;
        beam.visible = false;
        beamPivot.add(beam);
        beamOffset += segment.length - 0.04;
      }
      group.add(beamPivot);

      const beacon = markPoiLightEmitter(
        new three.PointLight(beamColor, 0, 6.2, 1.6),
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

function pickLighthouseBeamColor(signal: number): string {
  if (signal > 0.8) {
    return '#cfe8ff';
  }
  if (signal > 0.55) {
    return '#ffe9a8';
  }
  if (signal > 0.3) {
    return '#ffd7b0';
  }
  return '#e6ffd0';
}

function pickLighthousePaneColor(signal: number, beamColor: string): string {
  if (signal > 0.66) {
    return beamColor;
  }
  if (signal > 0.33) {
    return '#fff1b2';
  }
  return '#f8d7a1';
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
      const opacityScale =
        typeof node.userData?.lighthouseBeamOpacity === 'number'
          ? node.userData.lighthouseBeamOpacity
          : 0.1;
      material.opacity = activation * opacityScale;
      if (typeof material.emissiveIntensity === 'number') {
        const emissiveScale =
          typeof node.userData?.lighthouseBeamEmissiveIntensity === 'number'
            ? node.userData.lighthouseBeamEmissiveIntensity
            : 0.6;
        material.emissiveIntensity = activation * emissiveScale;
      }
    });
  });
}
