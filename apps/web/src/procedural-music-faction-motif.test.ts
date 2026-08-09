import { describe, expect, it } from 'vitest';
import {
  blendThemeMotifWithFactionInteraction,
  resolveFactionInteractionMotif,
  resolveMusicFactionMotifs,
} from './procedural-music-faction-motif.ts';

describe('procedural music faction motif', () => {
  it('derives deterministic local faction motifs for towns and buildings', () => {
    const town = resolveMusicFactionMotifs({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const building = resolveMusicFactionMotifs({
      tileKind: 'floor',
      contextType: 'building',
      clusterX: 3,
      clusterY: -2,
    });

    expect(town.length).toBeGreaterThan(0);
    expect(town).toEqual(building);
    expect(town[0]?.factionName.length).toBeGreaterThan(0);
  });

  it('combines the top local faction motifs when multiple factions overlap', () => {
    const seed = findMultiFactionSeed();
    expect(seed).not.toBeNull();

    const factions = resolveMusicFactionMotifs(seed!);
    const combined = resolveFactionInteractionMotif(seed!);

    expect(factions.length).toBeGreaterThanOrEqual(2);
    expect(combined.length).toBeGreaterThan(0);
    expect(combined).not.toEqual(factions[0]?.motifDegreeOffsets ?? []);
  });

  it('weaves the faction interaction motif into the town adaptation', () => {
    const blended = blendThemeMotifWithFactionInteraction(
      {
        sharedDegreeOffsets: [0, 2, 1, 3],
        adaptedDegreeOffsets: [0, 0, 2, 1, 1, 3],
        adaptationLabel: 'town',
      },
      {
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      }
    );

    expect(blended.adaptedDegreeOffsets).not.toEqual([0, 0, 2, 1, 1, 3]);
    expect(blended.adaptedDegreeOffsets[0]).toBe(0);
  });

  it('skips faction motifs away from settlements', () => {
    expect(
      resolveMusicFactionMotifs({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      })
    ).toEqual([]);
  });
});

function findMultiFactionSeed(): {
  tileKind: 'town';
  contextType: 'town';
  clusterX: number;
  clusterY: number;
} | null {
  for (let clusterY = -8; clusterY <= 8; clusterY += 1) {
    for (let clusterX = -8; clusterX <= 8; clusterX += 1) {
      const seed = {
        tileKind: 'town' as const,
        contextType: 'town' as const,
        clusterX,
        clusterY,
      };
      if (resolveMusicFactionMotifs(seed).length >= 2) {
        return seed;
      }
    }
  }

  return null;
}
