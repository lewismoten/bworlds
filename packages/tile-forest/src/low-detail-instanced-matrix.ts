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
