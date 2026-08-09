import { describe, expect, it } from 'vitest';

import { writeLowDetailInstancedMatrix } from './low-detail-instanced-matrix.ts';

class FakeMatrix4 {
  scale = { x: 1, y: 1, z: 1 };
  position = { x: 0, y: 0, z: 0 };

  makeScale(x: number, y: number, z: number) {
    this.scale = { x, y, z };
    return this;
  }

  setPosition(x: number, y: number, z: number) {
    this.position = { x, y, z };
    return this;
  }
}

describe('low detail instanced matrix helpers', () => {
  it('writes scale and position into a reusable matrix target', () => {
    const matrix = new FakeMatrix4();

    const result = writeLowDetailInstancedMatrix(
      matrix as never,
      4,
      2,
      -3,
      0.5,
      1.25,
      0.75
    ) as never as FakeMatrix4;

    expect(result).toBe(matrix);
    expect(matrix.scale).toEqual({ x: 0.5, y: 1.25, z: 0.75 });
    expect(matrix.position).toEqual({ x: 4, y: 2, z: -3 });
  });
});
