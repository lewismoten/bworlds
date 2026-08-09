import { describe, expect, it } from 'vitest';
import { resolveProceduralThemeMotif } from './procedural-music-theme-motif.ts';

describe('procedural music theme motif', () => {
  it('shares a deterministic four-note motif across the same larger region', () => {
    const first = resolveProceduralThemeMotif({
      themeId: 'deep-forest',
      clusterX: 12,
      clusterY: 16,
    });
    const second = resolveProceduralThemeMotif({
      themeId: 'deep-forest',
      clusterX: 40,
      clusterY: 44,
    });

    expect(first.sharedDegreeOffsets).toEqual(second.sharedDegreeOffsets);
    expect(first.adaptedDegreeOffsets).toEqual(second.adaptedDegreeOffsets);
  });

  it('adapts the shared motif differently for towns, interiors, ruins, and caves', () => {
    const overworld = resolveProceduralThemeMotif({
      themeId: 'frontier-plains',
      tileKind: 'plains',
      clusterX: 96,
      clusterY: 0,
    });
    const town = resolveProceduralThemeMotif({
      themeId: 'frontier-plains',
      contextType: 'town',
      tileKind: 'town',
      clusterX: 96,
      clusterY: 0,
    });
    const ruins = resolveProceduralThemeMotif({
      themeId: 'frontier-plains',
      tileKind: 'ruins',
      clusterX: 96,
      clusterY: 0,
    });
    const cave = resolveProceduralThemeMotif({
      themeId: 'frontier-plains',
      contextType: 'cave',
      tileKind: 'cave',
      clusterX: 96,
      clusterY: 0,
    });

    expect(town.sharedDegreeOffsets).toEqual(overworld.sharedDegreeOffsets);
    expect(town.adaptationLabel).toBe('town');
    expect(town.adaptedDegreeOffsets.length).toBeGreaterThan(
      overworld.adaptedDegreeOffsets.length
    );
    expect(ruins.adaptedDegreeOffsets).not.toEqual(
      overworld.adaptedDegreeOffsets
    );
    expect(cave.adaptedDegreeOffsets.at(-1)).toBe(cave.sharedDegreeOffsets[0]);
  });
});
