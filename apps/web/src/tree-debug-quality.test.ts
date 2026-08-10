import { describe, expect, it } from 'vitest';
import {
  getForestTreeAgeProfiles,
  getForestTreeBranchProfiles,
  getForestTreeCanopyProfiles,
  getForestTreeFamilies,
  getForestTreeFruitProfiles,
  getForestTreeGenerator,
  getForestTreeSpeciesPreview,
  getForestTreeTrunkProfiles,
} from '@bworlds/tile-forest';

import { createTreeDebugSnapshot } from './tree-debug.ts';

describe('tree debug quality', () => {
  it('keeps identical tree debug seeds deterministic', () => {
    const first = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.25,
      speciesMode: 'tile',
      treeIndex: 0,
    });
    const second = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.25,
      speciesMode: 'tile',
      treeIndex: 0,
    });

    expect(first).toEqual(second);
  });

  it('produces meaningful variation when the tree debug seed changes', () => {
    const first = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.25,
      speciesMode: 'tile',
      treeIndex: 0,
    });
    const second = createTreeDebugSnapshot({
      tileX: 9,
      tileY: 6,
      yearProgress: 0.25,
      speciesMode: 'tile',
      treeIndex: 0,
    });

    expect(second.trees.length).toBeGreaterThan(0);
    expect(
      JSON.stringify(first.trees) === JSON.stringify(second.trees) &&
        JSON.stringify(first.tileSummary) === JSON.stringify(second.tileSummary)
    ).toBe(false);
  });

  it('reports required forest tree capabilities through the shared generator', () => {
    const generator = getForestTreeGenerator();

    expect(generator.supports('branches')).toBe(true);
    expect(generator.supports('foliage')).toBe(true);
    expect(generator.supports('fruit')).toBe(true);
    expect(generator.getCapability('lod')).toEqual({ levels: 2 });
  });

  it('returns safe fallback values for unsupported capabilities', () => {
    const generator = getForestTreeGenerator();

    expect(generator.supports('attachments', { consumer: 'gameplay' })).toBe(
      false
    );
    expect(() =>
      generator.getCapabilityOrFallback('attachments', {
        consumer: 'gameplay',
      })
    ).not.toThrow();
    expect(
      generator.getCapabilityOrFallback('attachments', {
        consumer: 'gameplay',
      })
    ).toBe(false);
  });

  it('keeps fruit maturity aligned with the generated tree life stage', () => {
    let foundSapling = false;
    let foundMature = false;

    for (
      let tileY = 0;
      tileY < 64 && (!foundSapling || !foundMature);
      tileY += 1
    ) {
      for (
        let tileX = 0;
        tileX < 64 && (!foundSapling || !foundMature);
        tileX += 1
      ) {
        const ages = getForestTreeAgeProfiles(tileX, tileY);
        const fruits = getForestTreeFruitProfiles(tileX, tileY);

        for (let index = 0; index < ages.length; index += 1) {
          const age = ages[index];
          const fruit = fruits[index];
          if (!age || !fruit) {
            continue;
          }
          if (age.lifeStage === 'sapling') {
            expect(fruit.count).toBe(0);
            expect(fruit.mature).toBe(false);
            foundSapling = true;
          }
          if (age.lifeStage === 'mature' && fruit.count > 0) {
            expect(fruit.mature).toBe(true);
            foundMature = true;
          }
        }
      }
    }

    expect(foundSapling).toBe(true);
    expect(foundMature).toBe(true);
  });

  it('keeps seasonal tree states valid across the year', () => {
    const broadleafFamily = getForestTreeFamilies().find(
      (family) => family.familyId === 'broadleaf'
    );
    const coniferFamily = getForestTreeFamilies().find(
      (family) => family.familyId === 'conifer'
    );
    const springSnapshot = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0,
      speciesMode: 'oak',
    });
    const summerSnapshot = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.25,
      speciesMode: 'oak',
    });
    const autumnSnapshot = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.5,
      speciesMode: 'oak',
    });
    const winterSnapshot = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.95,
      speciesMode: 'oak',
    });

    expect(springSnapshot.season).toBe('spring');
    expect(summerSnapshot.season).toBe('summer');
    expect(autumnSnapshot.season).toBe('autumn');
    expect(winterSnapshot.season).toBe('winter');
    expect(broadleafFamily?.supports('foliage', { season: 'winter' })).toBe(
      false
    );
    expect(broadleafFamily?.supports('foliage', { season: 'summer' })).toBe(
      true
    );
    expect(coniferFamily?.supports('foliage', { season: 'winter' })).toBe(true);
  });

  it('keeps generated branch counts within the current forest performance budget', () => {
    let sampledBranches = 0;

    for (let tileY = 0; tileY < 64; tileY += 1) {
      for (let tileX = 0; tileX < 64; tileX += 1) {
        for (const profile of getForestTreeBranchProfiles(tileX, tileY)) {
          expect(profile.branches.length).toBeGreaterThan(0);
          expect(profile.branches.length).toBeLessThanOrEqual(8);
          sampledBranches += profile.branches.length;
        }
      }
    }

    expect(sampledBranches).toBeGreaterThan(0);
  });

  it('never omits required trunk and collision geometry from generated trees', () => {
    const speciesPreviews = [
      getForestTreeSpeciesPreview('oak', 12, 8, 1),
      getForestTreeSpeciesPreview('birch', 12, 8, 1),
      getForestTreeSpeciesPreview('pine', 12, 8, 1),
    ];

    for (const preview of speciesPreviews) {
      expect(preview.trunkHeight).toBeGreaterThan(0);
      expect(preview.radius).toBeGreaterThan(0);
      expect(preview.structure?.trunkTopRadius).toBeGreaterThan(0);
      expect(preview.structure?.trunkTopRadius).toBeLessThan(preview.radius);
      expect(preview.collision?.radius).toBeGreaterThan(0);
      expect(preview.collision?.radius).toBeLessThan(preview.radius);
      expect(preview.collision?.height).toBe(preview.trunkHeight);
    }
  });

  it('keeps branch, canopy, and trunk geometry finite across sampled trees', () => {
    const assertFinite = (value: number) => {
      expect(Number.isFinite(value)).toBe(true);
    };

    for (let tileY = 0; tileY < 12; tileY += 1) {
      for (let tileX = 0; tileX < 12; tileX += 1) {
        const branches = getForestTreeBranchProfiles(tileX, tileY);
        const canopies = getForestTreeCanopyProfiles(tileX, tileY);
        const trunks = getForestTreeTrunkProfiles(tileX, tileY);

        for (const trunk of trunks) {
          assertFinite(trunk.trunkHeight);
          assertFinite(trunk.radius);
          assertFinite(trunk.trunkTopRadius);
          assertFinite(trunk.trunkCurveX);
          assertFinite(trunk.trunkCurveZ);
          assertFinite(trunk.trunkLeanX);
          assertFinite(trunk.trunkLeanZ);
          expect(trunk.trunkHeight).toBeGreaterThan(0);
          expect(trunk.radius).toBeGreaterThan(0);
          expect(trunk.trunkTopRadius).toBeGreaterThan(0);
        }

        for (const profile of branches) {
          for (const branch of profile.branches) {
            assertFinite(branch.x);
            assertFinite(branch.y);
            assertFinite(branch.z);
            assertFinite(branch.length);
            assertFinite(branch.pitch);
            assertFinite(branch.roll);
            expect(branch.length).toBeGreaterThan(0);
          }
        }

        for (const canopy of canopies) {
          for (const foliage of canopy.foliage) {
            assertFinite(foliage.x);
            assertFinite(foliage.y);
            assertFinite(foliage.z);
            assertFinite(foliage.scaleX);
            assertFinite(foliage.scaleY);
            assertFinite(foliage.scaleZ);
            expect(foliage.scaleX).toBeGreaterThan(0);
            expect(foliage.scaleY).toBeGreaterThan(0);
            expect(foliage.scaleZ).toBeGreaterThan(0);
          }
        }
      }
    }
  }, 4_000);
});
