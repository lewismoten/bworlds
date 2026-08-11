import type { ThreeMatrix4Like } from '@bworlds/plugin-api';

export function writeLowDetailInstancedMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number
): ThreeMatrix4Like {
  return target.makeScale(scaleX, scaleY, scaleZ).setPosition(x, y, z);
}

export function writeRotatedInstancedMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationY: number,
  rotationZ: number
): ThreeMatrix4Like {
  const cosY = Math.cos(rotationY);
  const sinY = Math.sin(rotationY);
  const cosZ = Math.cos(rotationZ);
  const sinZ = Math.sin(rotationZ);

  return target.set(
    cosY * cosZ * scaleX,
    -cosY * sinZ * scaleY,
    sinY * scaleZ,
    x,
    sinZ * scaleX,
    cosZ * scaleY,
    0,
    y,
    -sinY * cosZ * scaleX,
    sinY * sinZ * scaleY,
    cosY * scaleZ,
    z,
    0,
    0,
    0,
    1
  );
}
