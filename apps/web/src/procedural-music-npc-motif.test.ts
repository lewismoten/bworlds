import { describe, expect, it } from 'vitest';
import {
  blendThemeMotifWithImportantNpcMotif,
  resolveImportantMusicNpcMotifs,
} from './procedural-music-npc-motif.ts';

describe('procedural music npc motif', () => {
  it('derives deterministic important npc motifs for towns and buildings', () => {
    const first = resolveImportantMusicNpcMotifs({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const second = resolveImportantMusicNpcMotifs({
      tileKind: 'floor',
      contextType: 'building',
      clusterX: 3,
      clusterY: -2,
    });

    expect(first.length).toBeGreaterThan(0);
    expect(first).toEqual(second);
    expect(first[0]?.npcName.length).toBeGreaterThan(0);
    expect(first[0]?.motifDegreeOffsets.length).toBeGreaterThan(3);
  });

  it('skips npc motifs for wilderness themes', () => {
    expect(
      resolveImportantMusicNpcMotifs({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      })
    ).toEqual([]);
  });

  it('weaves the top important npc motif into the town adaptation', () => {
    const blended = blendThemeMotifWithImportantNpcMotif(
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
    expect(blended.adaptedDegreeOffsets[2]).toBe(2);
  });
});
