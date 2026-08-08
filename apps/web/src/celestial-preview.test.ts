import { describe, expect, it } from 'vitest';
import {
  buildPlanetTextureGrid,
  getPlanetSurfaceColor,
} from './celestial-preview.ts';

describe('celestial preview helpers', () => {
  it('maps known overworld kinds to stable planet surface colors', () => {
    expect(getPlanetSurfaceColor('water')).toBe('#1a3d68');
    expect(getPlanetSurfaceColor('plains')).toBe('#6d9954');
    expect(getPlanetSurfaceColor('mountain')).toBe('#8d8579');
  });

  it('builds a deterministic low-resolution texture grid from overworld samples', () => {
    const grid = buildPlanetTextureGrid((x, y) => {
      if (y > 0) {
        return { kind: 'water' };
      }
      if (x > 0) {
        return { kind: 'plains' };
      }
      return { kind: 'mountain' };
    }, 4, 2);

    expect(grid).toEqual([
      ['#1a3d68', '#1a3d68', '#1a3d68', '#1a3d68'],
      ['#8d8579', '#8d8579', '#8d8579', '#6d9954'],
    ]);
  });
});
