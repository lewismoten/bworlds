import { getSharedConeGeometry, getSharedCylinderGeometry } from '@bworlds/three-support';
import type { ThreeHostLike, ThreeMaterialLike, ThreeObject3DLike } from '@bworlds/plugin-api';

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
  const group = new three.Group();

  const base = new three.Mesh(
    getSharedCylinderGeometry(three, 0.46, 0.58, 0.28, 10),
    wallMaterial
  );
  base.position.set(tileX, 0.14, tileY);
  group.add(base);

  const tower = new three.Mesh(
    getSharedCylinderGeometry(three, 0.34, 0.42, 1.66, 10),
    wallMaterial
  );
  tower.position.set(tileX, 0.97, tileY);
  group.add(tower);

  const stripe = new three.Mesh(
    getSharedCylinderGeometry(three, 0.35, 0.41, 0.2, 10),
    stripeMaterial
  );
  stripe.position.set(tileX, 0.9, tileY);
  group.add(stripe);

  const cap = new three.Mesh(
    getSharedConeGeometry(three, 0.41, 0.3, 10),
    stripeMaterial
  );
  cap.position.set(tileX, 1.96, tileY);
  group.add(cap);

  const beamPivot = new three.Group() as ThreeObject3DLike;
  beamPivot.userData = {
    ...(beamPivot.userData ?? {}),
    [beamPivotKey]: true,
    lighthouseBeamRotationDurationMs: rotationDurationMs,
    lighthouseBeamRotationDirection: rotationDirection,
  };
  beamPivot.position.set(tileX, 1.72, tileY);

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

  group.add(beamPivot);
  return group;
}
