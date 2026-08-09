import { describe, expect, it } from 'vitest';
import { createProceduralSongDna } from './procedural-music-song-dna.ts';

describe('procedural music song dna', () => {
  it('captures a persistent song identity from the core seed inputs', () => {
    const first = createProceduralSongDna({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
      encounterMode: 'ambient',
    });
    const second = createProceduralSongDna({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
      encounterMode: 'ambient',
    });

    expect(first).toEqual(second);
    expect(first.modeLabel.length).toBeGreaterThan(0);
    expect(first.progression.length).toBeGreaterThan(0);
    expect(first.leadMotif.length).toBeGreaterThan(0);
    expect(first.instrumentation.lead.length).toBeGreaterThan(0);
  });

  it('lets arrangement variants share the same underlying composition identity', () => {
    const ambient = createProceduralSongDna({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
      encounterMode: 'ambient',
    });
    const battle = createProceduralSongDna({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
      encounterMode: 'battle',
    });
    const boss = createProceduralSongDna({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
      encounterMode: 'boss',
    });

    expect(battle.identityId).toBe(ambient.identityId);
    expect(battle.sourceIdentityId).toBe(ambient.sourceIdentityId);
    expect(battle.progression).toEqual(ambient.progression);
    expect(battle.leadMotif).toEqual(ambient.leadMotif);
    expect(boss.sharedMotif).toEqual(ambient.sharedMotif);
    expect(battle.encounterMode).toBe('battle');
    expect(boss.encounterMode).toBe('boss');
  });

  it('derives ruined and historical variants from familiar source identities', () => {
    const base = createProceduralSongDna({
      tileKind: 'plains',
      contextType: 'overworld',
      clusterX: 12,
      clusterY: -8,
      encounterMode: 'ambient',
    });
    const ruined = createProceduralSongDna({
      tileKind: 'ruins',
      contextType: 'overworld',
      clusterX: 12,
      clusterY: -8,
      encounterMode: 'ambient',
    });
    const historical = createProceduralSongDna({
      tileKind: 'tower',
      contextType: 'overworld',
      clusterX: 12,
      clusterY: -8,
      encounterMode: 'ambient',
    });

    expect(ruined.sourceIdentityId).toBe(base.sourceIdentityId);
    expect(ruined.variantLabel).toBe('ruined');
    expect(ruined.modeLabel).toContain('weathered');
    expect(historical.sourceIdentityId).toBe(base.sourceIdentityId);
    expect(historical.variantLabel).toBe('historical');
    expect(historical.tempoBandLabel).toContain('ceremonial');
  });
});
