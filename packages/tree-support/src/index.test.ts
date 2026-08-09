import { describe, expect, it } from 'vitest';
import {
  createTreeBiologicalState,
  getTreeCollisionState,
  createTreeSceneState,
  createTreeLogicalState,
  createTreeFamily,
  createTreeGenerator,
  createTreeGeneratorBase,
  createTreeSpecies,
  getTreeBiologicalState,
  getTreeCanopyState,
  getTreeDamageState,
  getTreeStructuralState,
  resolveTreeSeason,
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

  it('creates deterministic per-instance random streams from a shared base generator', () => {
    const base = createTreeGeneratorBase({ seed: 12345 });
    const first = base.createInstanceRandom({ tileX: 4, tileY: -2, index: 1 }, 9);
    const second = base.createInstanceRandom({ tileX: 4, tileY: -2, index: 1 }, 9);
    const other = base.createInstanceRandom({ tileX: 4, tileY: -2, index: 1 }, 10);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
    expect([first(), first(), first()]).not.toEqual([
      other(),
      other(),
      other(),
    ]);
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

  it('supports consumer-specific capabilities and sensible fallback values', () => {
    const base = createTreeGeneratorBase({
      seed: 55,
      capabilities: (query) => ({
        branches: query?.consumer === 'gameplay' ? false : true,
        damage: query?.consumer === 'gameplay',
      }),
    });

    expect(base.supports('branches', { consumer: 'render-3d' })).toBe(true);
    expect(base.supports('branches', { consumer: 'gameplay' })).toBe(false);
    expect(base.supports('damage', { consumer: 'gameplay' })).toBe(true);
    expect(base.getCapabilityOrFallback('wind')).toEqual({
      trunk: false,
      branches: false,
      leaves: false,
    });
    expect(base.getCapabilityOrFallback('lod')).toEqual({ levels: 1 });
    expect(base.getCapabilityOrFallback('flowers')).toBe(false);
  });

  it('resolves seasonal tree state from direct season or year progress', () => {
    expect(resolveTreeSeason({ season: 'winter' })).toBe('winter');
    expect(resolveTreeSeason({ yearProgress: 0.02 })).toBe('spring');
    expect(resolveTreeSeason({ yearProgress: 0.3 })).toBe('summer');
    expect(resolveTreeSeason({ yearProgress: 0.6 })).toBe('autumn');
    expect(resolveTreeSeason({ yearProgress: 0.9 })).toBe('winter');
    expect(resolveTreeSeason()).toBeUndefined();
  });

  it('separates explicit structural state from canopy state while preserving legacy fields', () => {
    const tree = createTreeLogicalState({
      x: 1,
      y: 2,
      form: 'oak' as const,
      structure: {
        radius: 0.2,
        scale: 1.1,
        trunkHeight: 1.6,
        branches: [{ x: 0, y: 1, z: 0, length: 0.5, pitch: 0.4, roll: 0.2 }],
      },
      canopy: {
        foliage: [{ x: 0, y: 1.4, z: 0, scaleX: 0.8, scaleY: 0.7, scaleZ: 0.8 }],
      },
      collision: {
        radius: 0.16,
        height: 1.4,
      },
      biological: {
        ageYears: 48,
        maximumAgeYears: 120,
        maturity: 0.4,
        lifeStage: 'adolescent',
      },
      damage: {
        barkMarks: [{ x: 0.1, y: 0.7, scale: 0.08, severity: 0.6, kind: 'scar' }],
      },
    });

    expect(tree.radius).toBe(0.2);
    expect(tree.branches).toHaveLength(1);
    expect(tree.foliage).toHaveLength(1);
    expect(getTreeStructuralState(tree)).toEqual(tree.structure);
    expect(getTreeCanopyState(tree)).toEqual(tree.canopy);
    expect(getTreeCollisionState(tree)).toEqual(tree.collision);
    expect(getTreeBiologicalState(tree)).toEqual(tree.biological);
    expect(getTreeDamageState(tree)).toEqual(tree.damage);
  });

  it('derives structural and canopy state for older tree shapes', () => {
    const legacy: TreeLogicalState<'pine'> = {
      x: 0,
      y: 0,
      radius: 0.18,
      scale: 0.9,
      trunkHeight: 1.3,
      form: 'pine',
      branches: [],
      foliage: [],
    };

    expect(getTreeStructuralState(legacy)).toEqual({
      radius: 0.18,
      scale: 0.9,
      trunkHeight: 1.3,
      branches: [],
    });
    expect(getTreeCanopyState(legacy)).toEqual({ foliage: [] });
    expect(getTreeCollisionState(legacy)).toEqual({
      radius: 0.18,
      height: 1.3,
    });
    expect(getTreeBiologicalState(legacy)).toEqual({
      ageYears: 0,
      maximumAgeYears: 1,
      maturity: 0,
      lifeStage: 'sapling',
    });
    expect(getTreeDamageState(legacy)).toEqual({ barkMarks: [] });
  });

  it('creates biological state with deterministic maturity stages', () => {
    expect(createTreeBiologicalState({ ageYears: 4, maximumAgeYears: 80 })).toEqual({
      ageYears: 4,
      maximumAgeYears: 80,
      maturity: 0.05,
      lifeStage: 'sapling',
    });
    expect(createTreeBiologicalState({ ageYears: 20, maximumAgeYears: 80 }).lifeStage).toBe(
      'adolescent'
    );
    expect(createTreeBiologicalState({ ageYears: 48, maximumAgeYears: 80 }).lifeStage).toBe(
      'mature'
    );
    expect(createTreeBiologicalState({ ageYears: 79, maximumAgeYears: 80 }).lifeStage).toBe(
      'ancient'
    );
  });

  it('groups trees, decorations, and inhabitants into a separate scene state', () => {
    const tree = createTreeLogicalState({
      x: 0,
      y: 0,
      form: 'oak' as const,
      structure: {
        radius: 0.2,
        scale: 1,
        trunkHeight: 1.2,
        branches: [],
      },
      canopy: {
        foliage: [],
      },
    });
    const scene = createTreeSceneState({
      trees: [tree],
      decorations: [{ kind: 'hollow', treeIndex: 0 }],
      inhabitants: [{ kind: 'owl', treeIndex: 0 }],
    });

    expect(scene.trees).toHaveLength(1);
    expect(scene.decorations).toEqual([{ kind: 'hollow', treeIndex: 0 }]);
    expect(scene.inhabitants).toEqual([{ kind: 'owl', treeIndex: 0 }]);
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

  it('lets one family generator host species that inherit and override family behavior', () => {
    const familyBase = createTreeGeneratorBase({
      seed: 202,
      capabilities: {
        branches: true,
        foliage: true,
        flowers: false,
      },
    });
    type BroadleafTree = TreeLogicalState<'oak' | 'birch'> & { bark: string };
    type BroadleafContext = {
      speciesId?: string;
      tileX: number;
      tileY: number;
    };

    const oak = createTreeSpecies<BroadleafTree, BroadleafContext>({
      familyId: 'broadleaf',
      id: 'oak',
      parentBase: familyBase,
      capabilities: {
        hollows: true,
      },
      generate(context) {
        return {
          x: context.tileX,
          y: context.tileY,
          radius: 0.24,
          scale: 1,
          trunkHeight: 1.4,
          form: 'oak',
          branches: [],
          foliage: [],
          bark: 'rugged',
        };
      },
    });
    const birch = createTreeSpecies<BroadleafTree, BroadleafContext>({
      familyId: 'broadleaf',
      id: 'birch',
      parentBase: familyBase,
      capabilities: {
        flowers: true,
      },
      generate(context) {
        return {
          x: context.tileX,
          y: context.tileY,
          radius: 0.16,
          scale: 1,
          trunkHeight: 1.7,
          form: 'birch',
          branches: [],
          foliage: [],
          bark: 'paper',
        };
      },
    });
    const family = createTreeFamily<BroadleafTree, BroadleafContext>({
      id: 'broadleaf',
      base: familyBase,
      resolveSpeciesId(context) {
        return context.speciesId ?? 'oak';
      },
      species: [oak, birch],
    });

    expect(family.listSpecies().map((species) => species.speciesId)).toEqual([
      'oak',
      'birch',
    ]);
    expect(family.getSpecies('oak')?.supports('branches')).toBe(true);
    expect(family.getSpecies('oak')?.supports('flowers')).toBe(false);
    expect(family.getSpecies('oak')?.supports('hollows')).toBe(true);
    expect(family.getSpecies('birch')?.supports('flowers')).toBe(true);
    expect(family.getSpecies('missing')).toBeNull();
    expect(family.generateSpecies('birch', { tileX: 1, tileY: 2 }).form).toBe('birch');
    expect(family.generate({ speciesId: 'oak', tileX: 3, tileY: 4 }).form).toBe('oak');
  });
});
