import { describe, expect, it } from 'vitest';
import {
  buildMusicDebugMarkup,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSnapshot,
  formatMusicDebugDuration,
  formatMusicDebugLoopRange,
  normalizeMusicDebugOptions,
  randomizeMusicDebugSeed,
} from './music-debug.ts';

describe('music debug', () => {
  it('normalizes partial options into a safe debug snapshot configuration', () => {
    expect(
      normalizeMusicDebugOptions({
        tileKind: 'forest',
        encounterMode: 'boss',
        dayProgress: 2,
        yearProgress: -1,
        weatherIntensity: 4,
        combatIntensity: -2,
      })
    ).toEqual(
      expect.objectContaining({
        tileKind: 'forest',
        contextType: 'overworld',
        encounterMode: 'boss',
        dayProgress: 1,
        yearProgress: 0,
        weatherIntensity: 1,
        combatIntensity: 0,
      })
    );
  });

  it('builds deterministic snapshots from the current procedural music system', () => {
    const first = createMusicDebugSnapshot(
      {
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
        dayProgress: 0.25,
        yearProgress: 0.75,
      },
      1000
    );
    const second = createMusicDebugSnapshot(
      {
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
        dayProgress: 0.25,
        yearProgress: 0.75,
      },
      1000
    );

    expect(first.theme.id).toBe('town-square');
    expect(first.instrumentBank).toEqual(second.instrumentBank);
    expect(first.chordProgression).toEqual(second.chordProgression);
    expect(first.leadMotif).toEqual(second.leadMotif);
    expect(first.leadContour).toEqual(second.leadContour);
    expect(first.leadPhraseCadence).toEqual(second.leadPhraseCadence);
    expect(first.leadMaxLeapSemitones).toBe(second.leadMaxLeapSemitones);
    expect(first.accidentalNoteCount).toBe(second.accidentalNoteCount);
    expect(first.blueprintLabel).toBe(second.blueprintLabel);
    expect(first.theme.vocabulary).toEqual(second.theme.vocabulary);
    expect(first.theme.motif).toEqual(second.theme.motif);
    expect(first.songDna).toEqual(second.songDna);
    expect(first.vocabularySummary).toEqual(second.vocabularySummary);
    expect(first.sharedMotif).toEqual(second.sharedMotif);
    expect(first.sectionLayerArrangement).toEqual(
      second.sectionLayerArrangement
    );
    expect(first.notes).toEqual(second.notes);
    expect(first.durationMs).toBeGreaterThanOrEqual(120_000);
    expect(first.durationMs).toBeLessThanOrEqual(180_000);
    expect(first.song.sections.map((section) => section.id)).toEqual([
      'intro',
      'a',
      'b',
      'a-prime',
      'return',
      'outro',
    ]);
    expect(first.blueprintLabel).toContain("A'16");
    expect(first.roleCounts.bass).toBeGreaterThan(0);
  });

  it('renders markup and summary content for the laboratory page', () => {
    const snapshot = createMusicDebugSnapshot();
    const markup = buildMusicDebugMarkup(snapshot);
    const summary = buildMusicDebugSummaryMarkup(snapshot);

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('music-debug-form');
    expect(markup).toContain('music-debug-timeline');
    expect(markup).toContain('music-debug-randomize');
    expect(markup).toContain('Play Song');
    expect(markup).toContain('Download MIDI');
    expect(markup).toContain('Loop Song');
    expect(summary).toContain('Scheduled Notes');
    expect(summary).toContain('Song Length');
    expect(summary).toContain('Blueprint');
    expect(summary).toContain('Loop Range');
    expect(summary).toContain('Encounter');
    expect(summary).toContain('Combat');
    expect(summary).toContain('Mode');
    expect(summary).toContain('Region');
    expect(summary).toContain('Preferred Intervals');
    expect(summary).toContain('Vocabulary');
    expect(summary).toContain('SongDNA');
    expect(summary).toContain('Layer Mix');
    expect(summary).toContain('Chords');
    expect(summary).toContain('Shared Motif');
    expect(summary).toContain('Lead Motif');
    expect(summary).toContain('Lead Contour');
    expect(summary).toContain('Lead Cadence');
    expect(summary).toContain('Lead Max Leap');
    expect(summary).toContain('Accidentals');
    expect(summary).toContain(snapshot.theme.id);
    expect(summary).toContain(snapshot.theme.vocabulary.modeLabel);
    expect(summary).toContain(snapshot.theme.motif.adaptationLabel);
    expect(summary).toContain(snapshot.songDna.identityId);
    expect(summary).toContain('Hz</li>');
  });

  it('formats song durations and loop ranges as minute-second labels', () => {
    expect(formatMusicDebugDuration(0)).toBe('0:00');
    expect(formatMusicDebugDuration(62_000)).toBe('1:02');
    expect(formatMusicDebugLoopRange(8_000, 136_000)).toBe('0:08 - 2:16');
  });

  it('resolves playback regions and durations from loop metadata', async () => {
    const module = await import('./music-debug.ts');
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });

    expect(module.resolveMusicDebugPlaybackRegion(snapshot)).toEqual({
      startOffsetMs: 0,
      endOffsetMs: snapshot.durationMs,
    });
    expect(
      module.resolveMusicDebugPlaybackDurationMs(snapshot, {
        startOffsetMs: snapshot.loopStartOffsetMs,
        endOffsetMs: snapshot.loopEndOffsetMs,
      })
    ).toBe(snapshot.loopEndOffsetMs - snapshot.loopStartOffsetMs);
  });

  it('randomizes generator seed coordinates within the supported debug range', () => {
    expect(
      randomizeMusicDebugSeed(
        {
          tileKind: 'forest',
          clusterX: 0,
          clusterY: 0,
        },
        () => 1
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: 9_999,
        clusterY: 9_999,
      })
    );
    expect(
      randomizeMusicDebugSeed(
        {
          tileKind: 'forest',
          clusterX: 0,
          clusterY: 0,
        },
        () => 0
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: -9_999,
        clusterY: -9_999,
      })
    );
  });

  it('provides a theme object that can drive pitch-scale overlays', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    expect(snapshot.theme.scale.length).toBeGreaterThan(0);
    expect(snapshot.theme.rootHz).toBeGreaterThan(0);
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
  });
});
