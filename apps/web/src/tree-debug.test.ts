import { describe, expect, it } from 'vitest';
import {
  buildTreeDebugMarkup,
  buildTreeDebugSummaryMarkup,
  createTreeDebugSnapshot,
  normalizeTreeDebugOptions,
  randomizeTreeDebugSeed,
} from './tree-debug.ts';

describe('tree debug', () => {
  it('normalizes partial tree debug options into a safe snapshot configuration', () => {
    expect(
      normalizeTreeDebugOptions({
        tileX: 12.8,
        tileY: -5.2,
        yearProgress: 2,
        detailLevel: 'low',
        consumer: 'gameplay',
        speciesMode: 'pine',
      })
    ).toEqual({
      tileX: 13,
      tileY: -5,
      yearProgress: 1,
      detailLevel: 'low',
      consumer: 'gameplay',
      speciesMode: 'pine',
    });
  });

  it('builds deterministic tree snapshots from the shared forest generation helpers', () => {
    const first = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.25,
    });
    const second = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      yearProgress: 0.25,
    });

    expect(first.season).toBe('summer');
    expect(first.trees.length).toBeGreaterThan(0);
    expect(first.trees).toEqual(second.trees);
    expect(
      first.familyEntries.some((entry) => entry.familyId === 'broadleaf')
    ).toBe(true);
    expect(
      first.capabilityEntries.some((entry) => entry.name === 'branches')
    ).toBe(true);
  });

  it('can preview a specific forest species independent of the tile mix', () => {
    const oak = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      speciesMode: 'oak',
    });
    const pine = createTreeDebugSnapshot({
      tileX: 8,
      tileY: 6,
      speciesMode: 'pine',
    });

    expect(oak.trees).toHaveLength(1);
    expect(oak.trees[0]?.speciesId).toBe('oak');
    expect(oak.tileSummary.previewSpeciesCount).toBe(1);
    expect(pine.trees).toHaveLength(1);
    expect(pine.trees[0]?.speciesId).toBe('pine');
    expect(pine.trees[0]?.form).toBe('pine');
  });

  it('renders markup and summary content for the tree conservatory page', () => {
    const snapshot = createTreeDebugSnapshot();
    const markup = buildTreeDebugMarkup(snapshot);
    const summary = buildTreeDebugSummaryMarkup(snapshot);

    expect(markup).toContain('Tree Conservatory');
    expect(markup).toContain('tree-debug-form');
    expect(markup).toContain('tree-debug-randomize');
    expect(markup).toContain('Species');
    expect(markup).toContain('Generated trees');
    expect(summary).toContain('Season');
    expect(summary).toContain('Preview');
    expect(summary).toContain('Slope / Wind');
  });

  it('randomizes tile coordinates within the supported debug range', () => {
    expect(
      randomizeTreeDebugSeed(
        {
          tileX: 0,
          tileY: 0,
          yearProgress: 0.2,
          detailLevel: 'full',
          consumer: 'render-3d',
        },
        () => 1
      )
    ).toEqual(
      expect.objectContaining({
        tileX: 9_999,
        tileY: 9_999,
      })
    );
  });
});
