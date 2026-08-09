import { describe, expect, it } from 'vitest';

import {
  collectMaterialTexturesInto,
  countMaterialTextureSlots,
} from './material-texture-collector.ts';

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

  it('counts texture slots while reusing the provided scratch array', () => {
    const sharedTexture = { image: { width: 8, height: 8 } };
    const roughness = { repeat: { x: 1, y: 1 } };
    const material = {
      map: sharedTexture,
      normalMap: sharedTexture,
      roughnessMap: roughness,
      opacity: 1,
    };
    const scratch = ['stale'];

    expect(countMaterialTextureSlots(material as never, scratch)).toBe(3);
    expect(scratch).toEqual([sharedTexture, sharedTexture, roughness]);
  });
});
