import { describe, expect, it } from 'vitest';
import {
  createTreeGenerator,
  createTreeGeneratorBase,
  type TreeLogicalState,
} from './index.ts';

describe('tree support', () => {
  it('creates deterministic per-instance seeds from a shared base generator', () => {
    const base = createTreeGeneratorBase({ seed: 12345 });

    expect(
      base.createInstanceSeed({ tileX: 4, tileY: -2, index: 1 })
    ).toBe(base.createInstanceSeed({ tileX: 4, tileY: -2, index: 1 }));
    expect(
      base.createInstanceSeed({ tileX: 4, tileY: -2, index: 1 })
    ).not.toBe(base.createInstanceSeed({ tileX: 4, tileY: -2, index: 2 }));
  });

  it('supports composed capability bases and per-lod capability metadata', () => {
    const familyBase = createTreeGeneratorBase({
      seed: 99,
      capabilities: {
        branches: true,
        foliage: true,
        lod: { levels: 2 },
      },
    });
    const speciesBase = createTreeGeneratorBase({
      seed: 99,
      parent: familyBase,
      capabilities: (query) => ({
        hollows: query?.detailLevel === 'low' ? false : true,
        wind: { trunk: false, branches: true, leaves: true },
      }),
    });

    expect(speciesBase.supports('branches')).toBe(true);
    expect(speciesBase.supports('hollows', { detailLevel: 'full' })).toBe(true);
    expect(speciesBase.supports('hollows', { detailLevel: 'low' })).toBe(false);
    expect(speciesBase.getCapability('lod')).toEqual({ levels: 2 });
    expect(speciesBase.getCapability('wind')).toEqual({
      trunk: false,
      branches: true,
      leaves: true,
    });
  });

  it('lets generators advertise capabilities without generating a tree', () => {
    let generated = 0;
    const base = createTreeGeneratorBase({
      seed: 7,
      capabilities: {
        branches: true,
        carvings: false,
      },
    });
    const generator = createTreeGenerator<
      TreeLogicalState<'oak'>,
      { tileX: number; tileY: number }
    >({
      id: 'oak-family',
      base,
      generate(context: { tileX: number; tileY: number }) {
        generated += 1;
        return {
          x: context.tileX,
          y: context.tileY,
          radius: 0.2,
          scale: 1,
          trunkHeight: 1.2,
          form: 'oak' as const,
          branches: [],
          foliage: [],
        };
      },
    });

    expect(generator.supports('branches')).toBe(true);
    expect(generator.supports('carvings')).toBe(false);
    expect(generator.getCapability('fruit')).toBeUndefined();
    expect(generated).toBe(0);
    const tree = generator.generate({ tileX: 2, tileY: 3 });
    expect(tree satisfies TreeLogicalState<'oak'>).toBeTruthy();
    expect(tree.form).toBe('oak');
    expect(generated).toBe(1);
  });
});
