import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugKnownGoodSeed } from './music-debug-known-good-seeds.ts';

const ruinedSnapshot = createMusicDebugSnapshot({
  tileKind: 'ruins',
  contextType: 'overworld',
  encounterMode: 'ambient',
});
const historicalSnapshot = createMusicDebugSnapshot({
  tileKind: 'tower',
  contextType: 'overworld',
  encounterMode: 'ambient',
});
const plainsMotifSnapshot = createMusicDebugSnapshot(
  resolveMusicDebugKnownGoodSeed('plains-motif-baseline').options
);
const battleSnapshot = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  encounterMode: 'battle',
  combatIntensity: 0.6,
});
const bossSnapshot = createMusicDebugSnapshot({
  tileKind: 'cave',
  contextType: 'dungeon',
  encounterMode: 'boss',
  combatIntensity: 0.95,
});

describe('music debug snapshot generation variants', () => {
  it('surfaces ruined and historical SongDNA variants on the debug page', () => {
    expect(ruinedSnapshot.songDna.variantLabel).toBe('ruined');
    expect(ruinedSnapshot.songDna.modeLabel).toContain('weathered');
    expect(historicalSnapshot.songDna.variantLabel).toBe('historical');
    expect(historicalSnapshot.songDna.tempoBandLabel).toContain('ceremonial');
  });

  it('keeps the plains motif stable and reports exact and varied motif counters separately', () => {
    const motifBySection = new Map(
      plainsMotifSnapshot.sectionMotifMatches.map((entry) => [
        entry.sectionId,
        entry,
      ])
    );
    const sectionA = motifBySection.get('a');
    const sectionAPrime = motifBySection.get('a-prime');

    expect(plainsMotifSnapshot.sharedMotif).toEqual([0, 2, 4, 2]);
    expect(plainsMotifSnapshot.leadMotif.slice(0, 4)).toEqual([0, 2, 4, 2]);
    expect(sectionA).toEqual(
      expect.objectContaining({
        exactMatchCount: expect.any(Number),
        variedMatchCount: expect.any(Number),
        matchCount: expect.any(Number),
      })
    );
    expect(sectionA?.exactMatchCount ?? 0).toBeGreaterThanOrEqual(2);
    expect(sectionAPrime).toEqual(
      expect.objectContaining({
        exactMatchCount: expect.any(Number),
        variedMatchCount: expect.any(Number),
        matchCount: expect.any(Number),
      })
    );
    expect(sectionAPrime?.variedMatchCount ?? 0).toBeGreaterThan(0);
    expect(sectionAPrime?.matchCount ?? 0).toBeGreaterThan(
      sectionAPrime?.exactMatchCount ?? 0
    );
  });

  it('shows battle and boss encounter modes through song length generation', () => {
    expect(battleSnapshot.durationMs).toBeGreaterThanOrEqual(60_000);
    expect(battleSnapshot.durationMs).toBeLessThanOrEqual(120_000);
    expect(bossSnapshot.durationMs).toBeGreaterThanOrEqual(180_000);
    expect(bossSnapshot.durationMs).toBeLessThanOrEqual(360_000);
  }, 5_000);
});
