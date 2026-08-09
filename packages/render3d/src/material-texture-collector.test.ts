import { describe, expect, it } from 'vitest';

import { collectMaterialTexturesInto } from './material-texture-collector.ts';

describe('material texture collector', () => {
  it('collects texture-like material properties into a reusable target array', () => {
    const diffuse = { image: { width: 8, height: 8 } };
    const normal = { repeat: { x: 1, y: 1 } };
    const material = {
      map: diffuse,
      normalMap: normal,
      alphaTest: 0.5,
      transparent: true,
    };
    const target = ['stale'];

    expect(collectMaterialTexturesInto(material as never, target)).toBe(target);
    expect(target).toEqual([diffuse, normal]);

    const emissive = { colorSpace: 'srgb' };
    const secondMaterial = {
      emissiveMap: emissive,
      visible: true,
    };

    expect(collectMaterialTexturesInto(secondMaterial as never, target)).toBe(target);
    expect(target).toEqual([emissive]);
  });
});
