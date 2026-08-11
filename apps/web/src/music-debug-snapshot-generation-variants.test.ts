import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugKnownGoodSeed } from './music-debug-known-good-seeds.ts';

describe('music debug snapshot generation variants', () => {
  it('surfaces ruined and historical SongDNA variants on the debug page', () => {
    const ruined = createMusicDebugSnapshot({
      tileKind: 'ruins',
      contextType: 'overworld',
      encounterMode: 'ambient',
    });
    const historical = createMusicDebugSnapshot({
      tileKind: 'tower',
      contextType: 'overworld',
      encounterMode: 'ambient',
    });

    expect(ruined.songDna.variantLabel).toBe('ruined');
    expect(ruined.songDna.modeLabel).toContain('weathered');
    expect(historical.songDna.variantLabel).toBe('historical');
    expect(historical.songDna.tempoBandLabel).toContain('ceremonial');
  });

  it('keeps the plains motif stable and reports exact and varied motif counters separately', () => {
    const snapshot = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('plains-motif-baseline').options
    );
    const motifBySection = new Map(
      snapshot.sectionMotifMatches.map((entry) => [entry.sectionId, entry])
    );
    const sectionA = motifBySection.get('a');
    const sectionAPrime = motifBySection.get('a-prime');

    expect(snapshot.sharedMotif).toEqual([0, 2, 4, 2]);
    expect(snapshot.leadMotif.slice(0, 4)).toEqual([0, 2, 4, 2]);
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
    const battle = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'battle',
      combatIntensity: 0.6,
    });
    const boss = createMusicDebugSnapshot({
      tileKind: 'cave',
      contextType: 'dungeon',
      encounterMode: 'boss',
      combatIntensity: 0.95,
    });

    expect(battle.durationMs).toBeGreaterThanOrEqual(60_000);
    expect(battle.durationMs).toBeLessThanOrEqual(120_000);
    expect(boss.durationMs).toBeGreaterThanOrEqual(180_000);
    expect(boss.durationMs).toBeLessThanOrEqual(360_000);
  }, 5_000);
});
