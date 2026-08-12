import { markPoiLightEmitter } from '@bworlds/poi-support';
import type {
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeMatrix4Like,
  ThreeObject3DLike,
} from '@bworlds/plugin-api';

export type DungeonLowDetailStyle = {
  wallMaterial: ThreeMaterialLike;
  roofMaterial: ThreeMaterialLike;
  getGlowMaterial(
    dayIntensity: number,
    nightIntensity: number
  ): ThreeMaterialLike;
};

export type DungeonLowDetailEntrance = {
  dx: number;
  dy: number;
  rotationY: number;
};

export function createLowDetailDungeonModel(
  three: ThreeHostLike,
  {
    tileX,
    tileY,
    baseWidth,
    baseDepth,
    baseHeight,
    entrance,
    style,
  }: {
    tileX: number;
    tileY: number;
    baseWidth: number;
    baseDepth: number;
    baseHeight: number;
    entrance: DungeonLowDetailEntrance;
    style: DungeonLowDetailStyle;
  }
) {
  const base = new three.Mesh(
    new three.BoxGeometry(baseWidth, baseHeight, baseDepth),
    style.wallMaterial
  );
  base.position.set(tileX, baseHeight * 0.5, tileY);

  const keep = new three.Mesh(
    new three.BoxGeometry(
      baseWidth * 0.56,
      baseHeight * 0.54,
      baseDepth * 0.56
    ),
    style.wallMaterial
  );
  keep.position.set(0, baseHeight * 0.28, 0);
  base.add(keep);

  addCornerTowers(three, base, {
    style,
    towers: [
      {
        x: -baseWidth * 0.42,
        y: -baseHeight * 0.5,
        z: -baseDepth * 0.42,
        radius: 0.12,
        height: 0.78,
        capHeight: 0.18,
      },
      {
        x: baseWidth * 0.42,
        y: -baseHeight * 0.5,
        z: -baseDepth * 0.42,
        radius: 0.12,
        height: 0.78,
        capHeight: 0.18,
      },
    ],
  });

  const gateOriginX = tileX + entrance.dx * (baseDepth * 0.42);
  const gateOriginZ = tileY + entrance.dy * (baseDepth * 0.42);

  const gateFrame = new three.Mesh(
    new three.BoxGeometry(0.34, 0.28, 0.08),
    style.wallMaterial
  );
  const gateFrameOffset = rotateDungeonLowDetailLocalOffset(
    0,
    0.03,
    entrance.rotationY
  );
  gateFrame.position.set(
    gateOriginX + gateFrameOffset.x - tileX,
    0.14 - baseHeight * 0.5,
    gateOriginZ + gateFrameOffset.z - tileY
  );
  gateFrame.rotation.y = entrance.rotationY;
  base.add(gateFrame);

  const gateOpening = new three.Mesh(
    new three.BoxGeometry(0.18, 0.22, 0.09),
    style.roofMaterial
  );
  const gateOpeningOffset = rotateDungeonLowDetailLocalOffset(
    0,
    0.04,
    entrance.rotationY
  );
  gateOpening.position.set(
    gateOriginX + gateOpeningOffset.x - tileX,
    0.12 - baseHeight * 0.5,
    gateOriginZ + gateOpeningOffset.z - tileY
  );
  gateOpening.rotation.y = entrance.rotationY;
  base.add(gateOpening);

  const glow = markPoiLightEmitter(
    new three.Mesh(
      new three.SphereGeometry(0.04, 6, 6),
      style.getGlowMaterial(0.02, 1.45)
    ),
    {
      kind: 'emissive-mesh',
      dayIntensity: 0.02,
      nightIntensity: 1.45,
    }
  );
  const glowOffset = rotateDungeonLowDetailLocalOffset(
    0,
    0.06,
    entrance.rotationY
  );
  glow.position.set(
    gateOriginX + glowOffset.x - tileX,
    0.42 - baseHeight * 0.5,
    gateOriginZ + glowOffset.z - tileY
  );
  glow.userData = {
    ...(glow.userData ?? {}),
    dungeonBeacon: 'gate',
  };
  base.add(glow);

  return base;
}

function addCornerTowers(
  three: ThreeHostLike,
  parent: ThreeObject3DLike,
  {
    style,
    towers,
  }: {
    style: DungeonLowDetailStyle;
    towers: Array<{
      x: number;
      y: number;
      z: number;
      radius: number;
      height: number;
      capHeight: number;
    }>;
  }
) {
  const towerBodies = new three.InstancedMesh(
    new three.CylinderGeometry(1, 1.04, 1, 6),
    style.wallMaterial,
    towers.length
  );
  towerBodies.userData = {
    ...(towerBodies.userData ?? {}),
    dungeonInstancedPart: 'low-detail-tower-body',
  };
  const towerCaps = new three.InstancedMesh(
    new three.ConeGeometry(1.08, 1, 6),
    style.roofMaterial,
    towers.length
  );
  towerCaps.userData = {
    ...(towerCaps.userData ?? {}),
    dungeonInstancedPart: 'low-detail-tower-cap',
  };
  const bodyMatrix = new three.Matrix4();
  const capMatrix = new three.Matrix4();

  for (let index = 0; index < towers.length; index += 1) {
    const tower = towers[index]!;
    towerBodies.setMatrixAt(
      index,
      writeLowDetailDungeonMatrix(
        bodyMatrix,
        tower.x,
        tower.y + tower.height * 0.5,
        tower.z,
        tower.radius,
        tower.height,
        tower.radius
      )
    );
    towerCaps.setMatrixAt(
      index,
      writeLowDetailDungeonMatrix(
        capMatrix,
        tower.x,
        tower.y + tower.height + tower.capHeight * 0.5 - 0.02,
        tower.z,
        tower.radius,
        tower.capHeight,
        tower.radius
      )
    );
  }

  parent.add(towerBodies);
  parent.add(towerCaps);
}

function writeLowDetailDungeonMatrix(
  matrix: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
) {
  matrix.set(scaleX, 0, 0, x, 0, scaleY, 0, y, 0, 0, scaleZ, z, 0, 0, 0, 1);
  return matrix;
}

function rotateDungeonLowDetailLocalOffset(
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
