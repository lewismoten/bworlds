import { describe, expect, it } from 'vitest';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';

describe('procedural music blueprint', () => {
  it('picks stable blueprint structures from context and cluster', () => {
    const first = resolveProceduralMusicBlueprint({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const second = resolveProceduralMusicBlueprint({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });

    expect(first).toEqual(second);
    expect(first.sections.length).toBeGreaterThanOrEqual(6);
  });

  it('uses settled and cavern-specific blueprints when the context calls for them', () => {
    const town = resolveProceduralMusicBlueprint({
      tileKind: 'town',
      contextType: 'town',
    });
    const cave = resolveProceduralMusicBlueprint({
      tileKind: 'cave',
      contextType: 'cave',
    });

    expect(town.id).toBe('settled-chorus');
    expect(cave.id).toBe('echoed-descent');
  });

  it('defines occupancy expectations for every section role plan', () => {
    const exploration = resolveProceduralMusicBlueprint({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    expect(
      exploration.sections.every(
        (section) => Object.keys(section.occupancy).length > 0
      )
    ).toBe(true);
    expect(
      exploration.sections.find((section) => section.id === 'b')?.occupancy
        .harmony
    ).toEqual({
      minPercentage: 30,
      maxPercentage: 45,
    });
    expect(
      exploration.sections.find((section) => section.id === 'variation')
        ?.occupancy.lead
    ).toEqual({
      minPercentage: 60,
      maxPercentage: 85,
    });
  });
});
