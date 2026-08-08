import { describe, expect, it } from 'vitest';
import {
  createProceduralInstrumentBank,
  createMusicController,
  getMusicUpdateSignature,
  getMusicRegionSignature,
  getMusicSpatialMix,
  resolvePoiMusicBlendGains,
  resolvePoiMusicMix,
  resolveMusicArrangement,
  resolveMusicMood,
  resolveMusicTheme,
  scheduleProceduralMusicNotes,
  type ProceduralMusicNote,
} from './procedural-music.ts';

describe('procedural music', () => {
  it('selects stable regional themes from the current tile and context', () => {
    expect(resolveMusicTheme('forest', 'overworld').id).toBe('deep-forest');
    expect(resolveMusicTheme('shore', 'overworld').id).toBe('coastal-shore');
    expect(resolveMusicTheme('town', 'town').id).toBe('town-square');
    expect(resolveMusicTheme('floor', 'building').id).toBe('interior-hall');
    expect(resolveMusicTheme('plains', 'cave').id).toBe('cavern-echo');
    expect(resolveMusicTheme('plains', 'overworld').id).toBe('frontier-plains');
  });

  it('changes tempo and brightness with time of day and weather', () => {
    expect(resolveMusicMood({ dayProgress: 0.5 })).toEqual(
      expect.objectContaining({
        tempoMultiplier: 1.04,
        brightness: 1.08,
      })
    );
    expect(resolveMusicMood({ dayProgress: 0.9 })).toEqual(
      expect.objectContaining({
        tempoMultiplier: 0.82,
        brightness: 0.78,
        volumeMultiplier: 0.88,
      })
    );
    expect(
      resolveMusicMood({
        dayProgress: 0.52,
        weatherKind: 'heavy-rain',
        weatherIntensity: 0.9,
      })
    ).toEqual(
      expect.objectContaining({
        volumeMultiplier: 0.82,
      })
    );
  });

  it('softens nighttime arrangements by lowering percussion density and extending softer layers', () => {
    const arrangement = resolveMusicArrangement({ dayProgress: 0.9 });

    expect(arrangement.roleProfiles.percussion).toEqual(
      expect.objectContaining({
        volumeMultiplier: 0.22,
        skipEvery: 2,
      })
    );
    expect(arrangement.roleProfiles.harmony.releaseMultiplier).toBeGreaterThan(1);
    expect(arrangement.roleProfiles.harmony.volumeMultiplier).toBeLessThan(1);
    expect(arrangement.roleProfiles.lead.durationMultiplier).toBeGreaterThan(1);
  });

  it('builds stable region signatures for cluster-level theme variation', () => {
    expect(
      getMusicRegionSignature({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      })
    ).toBe('deep-forest:overworld:3:-2');
  });

  it('schedules a short deterministic lookahead of notes for a region', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 1000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 1,
      clusterY: 2,
    });

    expect(scheduled.notes.length).toBeGreaterThan(1);
    expect(scheduled.notes[0]).toEqual(
      expect.objectContaining({
        themeId: 'deep-forest',
        instrumentId: expect.stringContaining('deep-forest'),
        role: 'bass',
      })
    );
    expect(scheduled.state.regionSignature).toBe(
      'ambient:deep-forest:overworld:1:2'
    );
    expect(scheduled.state.nextNoteAtMs).toBeGreaterThan(1000);
  });

  it('resets scheduling cleanly when the player moves into a new region cluster', () => {
    const first = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const second = scheduleProceduralMusicNotes(
      {
        nowMs: 400,
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.5,
        clusterX: 2,
        clusterY: 1,
      },
      first.state
    );

    expect(second.notes[0]?.themeId).toBe('deep-forest');
    expect(second.state.regionSignature).toBe(
      'ambient:deep-forest:overworld:2:1'
    );
    expect(second.state.stepIndex).toBeGreaterThan(0);
  });

  it('thins percussion and softens harmony in nighttime note scheduling', () => {
    const dayScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const nightScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.9,
      clusterX: 0,
      clusterY: 0,
    });

    const dayPercussion = dayScheduled.notes.filter((note) => note.role === 'percussion');
    const nightPercussion = nightScheduled.notes.filter((note) => note.role === 'percussion');
    const dayHarmony = dayScheduled.notes.find((note) => note.role === 'harmony');
    const nightHarmony = nightScheduled.notes.find((note) => note.role === 'harmony');

    expect(dayPercussion.length).toBeGreaterThan(nightPercussion.length);
    expect(nightHarmony).toEqual(expect.objectContaining({ role: 'harmony' }));
    expect(dayHarmony).toEqual(expect.objectContaining({ role: 'harmony' }));
    expect((nightHarmony?.volume ?? 0) / (dayHarmony?.volume ?? 1)).toBeLessThan(0.75);
    expect((nightHarmony?.releaseMs ?? 0) / (dayHarmony?.releaseMs ?? 1)).toBeGreaterThan(
      1.5
    );
  });

  it('applies softer panning and falloff for nearby ambient music emitters', () => {
    expect(
      getMusicSpatialMix({ x: 6, y: 0 }, { x: 0, y: 0 })
    ).toEqual({
      gainMultiplier: expect.closeTo(1 / (1 + 6 * 0.45), 6),
      pan: expect.closeTo(6 / 7, 6),
    });
  });

  it('computes poi music mix and equal-power crossfade gains from distance', () => {
    expect(resolvePoiMusicMix(0.5)).toBe(1);
    expect(resolvePoiMusicMix(8)).toBe(0);
    expect(resolvePoiMusicMix(4.25)).toBeCloseTo(0.5, 6);
    expect(resolvePoiMusicBlendGains(0.5)).toEqual({
      ambientGain: expect.closeTo(Math.cos(Math.PI / 4), 6),
      poiGain: expect.closeTo(Math.sin(Math.PI / 4), 6),
    });
  });

  it('builds deterministic instrument banks with melody, harmony, bass, and percussion voices per cluster', () => {
    const theme = resolveMusicTheme('forest', 'overworld');
    const bank = createProceduralInstrumentBank(theme, 2, -1);

    expect(bank.themeId).toBe('deep-forest');
    expect(bank.instruments.lead).toEqual(
      expect.objectContaining({
        id: 'deep-forest:lead:2:-1',
        role: 'lead',
      })
    );
    expect(bank.instruments.harmony).toEqual(
      expect.objectContaining({
        id: 'deep-forest:harmony:2:-1',
        role: 'harmony',
      })
    );
    expect(bank.instruments.bass).toEqual(
      expect.objectContaining({
        id: 'deep-forest:bass:2:-1',
        role: 'bass',
      })
    );
    expect(bank.instruments.percussion).toEqual(
      expect.objectContaining({
        id: 'deep-forest:percussion:2:-1',
        role: 'percussion',
      })
    );
  });

  it('emits scheduled notes through the controller sink', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    expect(played.length).toBeGreaterThan(1);
    expect(played[0]?.themeId).toBe('town-square');
    expect(played.some((note) => note.role === 'lead')).toBe(true);
    expect(played.some((note) => note.role === 'harmony')).toBe(true);
    expect(played.some((note) => note.role === 'percussion')).toBe(true);
  });

  it('layers poi notes over ambient music when a nearby poi mix is present', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
      nearbyPoi: {
        tileKind: 'town',
        poiType: 'town',
        contextType: 'town',
        mix: 0.75,
        clusterX: 0,
        clusterY: 0,
      },
    });

    expect(played.some((note) => note.themeId === 'frontier-plains')).toBe(true);
    expect(played.some((note) => note.themeId === 'town-square')).toBe(true);
  });

  it('builds stable update signatures for throttled music scheduling', () => {
    const base = {
      nowMs: 0,
      tileKind: 'plains' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.5,
      weatherKind: 'fog' as const,
      weatherIntensity: 0.35,
      clusterX: 1,
      clusterY: -2,
      nearbyPoi: {
        tileKind: 'town' as const,
        poiType: 'town',
        contextType: 'town' as const,
        mix: 0.75,
        clusterX: 0,
        clusterY: 0,
      },
    };

    expect(getMusicUpdateSignature(base)).toEqual(
      getMusicUpdateSignature({ ...base })
    );
    expect(
      getMusicUpdateSignature({
        ...base,
        clusterX: base.clusterX + 1,
      })
    ).not.toEqual(getMusicUpdateSignature(base));
  });

  it('skips redundant per-frame scheduling updates until the next note horizon approaches', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });
    const initialCount = played.length;

    controller.update({
      nowMs: 16,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    expect(played.length).toBe(initialCount);

    controller.update({
      nowMs: 980,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    expect(played.length).toBeGreaterThan(initialCount);
  });

  it('reschedules immediately when the music state changes before the next horizon', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const initialCount = played.length;

    controller.update({
      nowMs: 16,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 2,
      clusterY: 1,
    });

    expect(played.length).toBeGreaterThan(initialCount);
    expect(played.some((note) => note.themeId === 'deep-forest')).toBe(true);
  });
});
