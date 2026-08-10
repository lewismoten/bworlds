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

  const gate = new three.Group();
  gate.position.set(
    tileX + entrance.dx * (baseDepth * 0.42),
    0,
    tileY + entrance.dy * (baseDepth * 0.42)
  );
  gate.rotation.y = entrance.rotationY;

  const gateFrame = new three.Mesh(
    new three.BoxGeometry(0.34, 0.28, 0.08),
    style.wallMaterial
  );
  gateFrame.position.set(0, 0.14, 0.03);
  gate.add(gateFrame);

  const gateOpening = new three.Mesh(
    new three.BoxGeometry(0.18, 0.22, 0.09),
    style.roofMaterial
  );
  gateOpening.position.set(0, 0.12, 0.04);
  gate.add(gateOpening);

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
  glow.position.set(0, 0.42, 0.06);
  glow.userData = {
    ...(glow.userData ?? {}),
    dungeonBeacon: 'gate',
  };
  gate.add(glow);

  const pointLight = markPoiLightEmitter(
    new three.PointLight('#f87171', 0, 3.6, 1.85),
    {
      kind: 'point-light',
      nightIntensity: 0.95,
      visibleThreshold: 0.04,
    }
  );
  pointLight.position.set(0, 0.4, 0.03);
  pointLight.visible = false;
  pointLight.userData = {
    ...(pointLight.userData ?? {}),
    dungeonBeacon: 'gate',
  };
  gate.add(pointLight);

  group.add(gate);
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
