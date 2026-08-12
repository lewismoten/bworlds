import { markPoiLightEmitter } from '@bworlds/poi-support';
import type {
  ThreeHostLike,
  ThreeMaterialLike,
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

  addCornerTower(three, base, {
    x: -baseWidth * 0.42,
    y: -baseHeight * 0.5,
    z: -baseDepth * 0.42,
    radius: 0.12,
    height: 0.78,
    capHeight: 0.18,
    style,
  });
  addCornerTower(three, base, {
    x: baseWidth * 0.42,
    y: -baseHeight * 0.5,
    z: -baseDepth * 0.42,
    radius: 0.12,
    height: 0.78,
    capHeight: 0.18,
    style,
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

  const pointLight = markPoiLightEmitter(
    new three.PointLight('#f87171', 0, 3.6, 1.85),
    {
      kind: 'point-light',
      nightIntensity: 0.95,
      visibleThreshold: 0.04,
    }
  );
  const pointLightOffset = rotateDungeonLowDetailLocalOffset(
    0,
    0.03,
    entrance.rotationY
  );
  pointLight.position.set(
    gateOriginX + pointLightOffset.x - tileX,
    0.4 - baseHeight * 0.5,
    gateOriginZ + pointLightOffset.z - tileY
  );
  pointLight.visible = false;
  pointLight.userData = {
    ...(pointLight.userData ?? {}),
    dungeonBeacon: 'gate',
  };
  base.add(pointLight);
  return base;
}

function addCornerTower(
  three: ThreeHostLike,
  parent: ThreeObject3DLike,
  {
    x,
    y,
    z,
    radius,
    height,
    capHeight,
    style,
  }: {
    x: number;
    y: number;
    z: number;
    radius: number;
    height: number;
    capHeight: number;
    style: DungeonLowDetailStyle;
  }
) {
  const tower = new three.Mesh(
    new three.CylinderGeometry(radius, radius * 1.04, height, 6),
    style.wallMaterial
  );
  tower.position.set(x, y + height * 0.5, z);
  parent.add(tower);

  const cap = new three.Mesh(
    new three.ConeGeometry(radius * 1.08, capHeight, 6),
    style.roofMaterial
  );
  cap.position.set(x, y + height + capHeight * 0.5 - 0.02, z);
  parent.add(cap);
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
