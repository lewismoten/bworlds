import { describe, expect, it } from 'vitest';
import {
  getForestTreeAgeProfiles,
  getForestTreeFamilies,
  getForestTreeFruitProfiles,
  getForestTreeGenerator,
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
});
