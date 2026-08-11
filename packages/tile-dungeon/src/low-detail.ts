import { markPoiLightEmitter } from '@bworlds/poi-support';
import type { ThreeHostLike, ThreeMaterialLike } from '@bworlds/plugin-api';

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
  const group = new three.Group();

  const base = new three.Mesh(
    new three.BoxGeometry(baseWidth, baseHeight, baseDepth),
    style.wallMaterial
  );
  base.position.set(tileX, baseHeight * 0.5, tileY);
  group.add(base);

  const keep = new three.Mesh(
    new three.BoxGeometry(
      baseWidth * 0.56,
      baseHeight * 0.54,
      baseDepth * 0.56
    ),
    style.wallMaterial
  );
  keep.position.set(tileX, baseHeight * 0.78, tileY);
  group.add(keep);

  addCornerTower(three, group, {
    x: tileX - baseWidth * 0.42,
    y: 0,
    z: tileY - baseDepth * 0.42,
    radius: 0.12,
    height: 0.78,
    capHeight: 0.18,
    style,
  });
  addCornerTower(three, group, {
    x: tileX + baseWidth * 0.42,
    y: 0,
    z: tileY - baseDepth * 0.42,
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
    gateOriginX + gateFrameOffset.x,
    0.14,
    gateOriginZ + gateFrameOffset.z
  );
  gateFrame.rotation.y = entrance.rotationY;
  group.add(gateFrame);

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
    gateOriginX + gateOpeningOffset.x,
    0.12,
    gateOriginZ + gateOpeningOffset.z
  );
  gateOpening.rotation.y = entrance.rotationY;
  group.add(gateOpening);

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
    gateOriginX + glowOffset.x,
    0.42,
    gateOriginZ + glowOffset.z
  );
  glow.userData = {
    ...(glow.userData ?? {}),
    dungeonBeacon: 'gate',
  };
  group.add(glow);

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
    gateOriginX + pointLightOffset.x,
    0.4,
    gateOriginZ + pointLightOffset.z
  );
  pointLight.visible = false;
  pointLight.userData = {
    ...(pointLight.userData ?? {}),
    dungeonBeacon: 'gate',
  };
  group.add(pointLight);
  return group;
}

function addCornerTower(
  three: ThreeHostLike,
  parent: InstanceType<ThreeHostLike['Group']>,
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
