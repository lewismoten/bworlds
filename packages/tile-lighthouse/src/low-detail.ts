import {
  getSharedConeGeometry,
  getSharedCylinderGeometry,
} from '@bworlds/three-support';
import type {
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeObject3DLike,
} from '@bworlds/plugin-api';

type LighthouseLowDetailBeamSegment = {
  radius: number;
  length: number;
  opacity: number;
  emissiveIntensity: number;
};

export function createLowDetailLighthouseModel(
  three: ThreeHostLike,
  tileX: number,
  tileY: number,
  {
    wallMaterial,
    stripeMaterial,
    beamMaterial,
    beamColor,
    rotationDurationMs,
    rotationDirection,
    beamPivotKey,
    beamKey,
    beamStartOffset,
    beamSegments,
  }: {
    wallMaterial: ThreeMaterialLike;
    stripeMaterial: ThreeMaterialLike;
    beamMaterial: ThreeMaterialLike;
    beamColor: string;
    rotationDurationMs: number;
    rotationDirection: 1 | -1;
    beamPivotKey: string;
    beamKey: string;
    beamStartOffset: number;
    beamSegments: readonly LighthouseLowDetailBeamSegment[];
  }
) {
  const base = new three.Mesh(
    getSharedCylinderGeometry(three, 0.46, 0.58, 0.28, 10),
    wallMaterial
  );
  base.position.set(tileX, 0.14, tileY);

  const tower = new three.Mesh(
    getSharedCylinderGeometry(three, 0.34, 0.42, 1.66, 10),
    wallMaterial
  );
  tower.position.set(0, 0.83, 0);
  base.add(tower);

  const stripe = new three.Mesh(
    getSharedCylinderGeometry(three, 0.35, 0.41, 0.2, 10),
    stripeMaterial
  );
  stripe.position.set(0, 0.76, 0);
  base.add(stripe);

  const cap = new three.Mesh(
    getSharedConeGeometry(three, 0.41, 0.3, 10),
    stripeMaterial
  );
  cap.position.set(0, 1.82, 0);
  base.add(cap);

  const beamPivot = new three.Group() as ThreeObject3DLike;
  beamPivot.userData = {
    ...(beamPivot.userData ?? {}),
    [beamPivotKey]: true,
    lighthouseBeamRotationDurationMs: rotationDurationMs,
    lighthouseBeamRotationDirection: rotationDirection,
  };
  beamPivot.position.set(0, 1.58, 0);

  let beamOffset = beamStartOffset;
  beamSegments.forEach((segment) => {
    const beam = new three.Mesh(
      getSharedConeGeometry(three, segment.radius, segment.length, 10),
      beamMaterial
    ) as ThreeObject3DLike & {
      castShadow?: boolean;
      receiveShadow?: boolean;
    };
    beam.userData = {
      ...(beam.userData ?? {}),
      [beamKey]: true,
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
    beamOffset += segment.length - 0.08;
  });

  base.add(beamPivot);
  return base;
}
