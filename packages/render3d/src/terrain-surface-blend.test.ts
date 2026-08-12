import { describe, expect, it } from 'vitest';
import {
  createTerrainSurfaceBlendSignature,
  resolveTerrainSurfaceBlendCategory,
  shouldUseTerrainSurfaceBlend,
} from './terrain-surface-blend.ts';

describe('terrain surface blending', () => {
  it('recognizes field-like terrain as blendable plains surfaces', () => {
    expect(resolveTerrainSurfaceBlendCategory('field')).toBe('plains');
    expect(shouldUseTerrainSurfaceBlend('field')).toBe(true);
  });

  it('builds a compact cardinal blend signature for blendable ground', () => {
    expect(
      createTerrainSurfaceBlendSignature({
        centerKind: 'road',
        northKind: 'plains',
        eastKind: 'forest',
        southKind: 'shore',
        westKind: 'mountain',
      })
    ).toBe('road:plains:forest:shore:mountain');
  });

  it('skips non-ground kinds that should stay on atlas-backed materials', () => {
    expect(
      createTerrainSurfaceBlendSignature({
        centerKind: 'sign',
        northKind: 'plains',
        eastKind: 'plains',
        southKind: 'plains',
        westKind: 'plains',
      })
    ).toBeNull();
  });
});
