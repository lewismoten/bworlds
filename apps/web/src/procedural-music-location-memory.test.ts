import { describe, expect, it } from 'vitest';
import { resolveProceduralMusicLocationMemory } from './procedural-music-location-memory.ts';

describe('procedural music location memory', () => {
  it('creates a deterministic location identity and recognition motif', () => {
    const first = resolveProceduralMusicLocationMemory({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const second = resolveProceduralMusicLocationMemory({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });

    expect(first).toEqual(second);
    expect(first.recognitionDegreeOffsets.length).toBeGreaterThan(0);
  });

  it('shares settlement location identity across town and building variants', () => {
    const town = resolveProceduralMusicLocationMemory({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const building = resolveProceduralMusicLocationMemory({
      tileKind: 'floor',
      contextType: 'building',
      clusterX: 3,
      clusterY: -2,
    });

    expect(town.locationIdentityId).toBe(building.locationIdentityId);
    expect(town.recognitionDegreeOffsets).toEqual(
      building.recognitionDegreeOffsets
    );
  });

  it('changes recognition motifs across different locations', () => {
    const left = resolveProceduralMusicLocationMemory({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const right = resolveProceduralMusicLocationMemory({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 4,
      clusterY: -2,
    });

    expect(right.locationIdentityId).not.toBe(left.locationIdentityId);
    expect(right.recognitionDegreeOffsets).not.toEqual(
      left.recognitionDegreeOffsets
    );
  });
});
