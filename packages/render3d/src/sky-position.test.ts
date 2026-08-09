import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  createConstellationPoint,
  createSkyPosition,
  writeConstellationPoint,
  writeSkyPosition,
} from './sky-position.ts';

describe('sky position helpers', () => {
  it('writes sky coordinates into a reusable vector target', () => {
    const target = new THREE.Vector3(1, 2, 3);

    const result = writeSkyPosition(target, Math.PI / 2, Math.PI / 2, 5);

    expect(result).toBe(target);
    expect(target.x).toBeCloseTo(0, 6);
    expect(target.y).toBeCloseTo(0, 6);
    expect(target.z).toBeCloseTo(5, 6);
  });

  it('creates constellation points relative to an anchor', () => {
    const anchor = new THREE.Vector3(2, 4, 6);
    const point = createConstellationPoint(anchor, { x: 0.7, y: 0.25 });

    expect(point.x).toBeCloseTo(4, 6);
    expect(point.y).toBeCloseTo(5.5, 6);
    expect(point.z).toBeCloseTo(6, 6);
  });

  it('writes constellation points into a reusable target vector', () => {
    const anchor = new THREE.Vector3(10, -2, 8);
    const target = new THREE.Vector3();

    const result = writeConstellationPoint(target, anchor, { x: 0.2, y: 0.8 });

    expect(result).toBe(target);
    expect(target.x).toBeCloseTo(7, 6);
    expect(target.y).toBeCloseTo(-3.8, 6);
    expect(target.z).toBeCloseTo(8, 6);
  });

  it('still supports creating standalone sky vectors when needed', () => {
    expect(createSkyPosition(0, 0, 7)).toEqual(new THREE.Vector3(0, 7, 0));
  });
});
