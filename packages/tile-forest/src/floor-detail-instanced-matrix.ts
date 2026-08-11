import type { ThreeMatrix4Like } from '@bworlds/plugin-api';

export function writeHorizontalCylinderInstancedMatrix(
  target: ThreeMatrix4Like,
  x: number,
  y: number,
  z: number,
  radius: number,
  length: number,
  rotationY: number
): ThreeMatrix4Like {
  const alongX = Math.cos(rotationY);
  const alongZ = Math.sin(rotationY);

  return target.set(
    0,
    alongX * length,
    -alongZ * radius,
    x,
    radius,
    0,
    0,
    y,
    0,
    alongZ * length,
    alongX * radius,
    z,
    0,
    0,
    0,
    1
  );
}
