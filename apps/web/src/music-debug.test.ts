import { describe, expect, it, vi } from 'vitest';
import {
  buildMusicDebugMarkup,
  buildMusicDebugPendingSummaryMarkup,
  buildMusicDebugShellMarkup,
  createCachedMusicDebugSnapshot,
  buildMusicDebugSummaryMarkup,
  createMusicDebugSongPlayback,
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
    expect(markup).toContain('/debug/');
    expect(markup).toContain('music-debug-form');
    expect(markup).toContain('music-debug-timeline');
    expect(markup).toContain('music-debug-randomize');
    expect(markup).toContain('Play Song');
    expect(markup).toContain('Download MIDI');
    expect(markup).toContain('Loop Song');
    expect(markup).toContain('music-debug-current-time');
    expect(markup).toContain('music-debug-current-section');
    expect(markup).toContain('music-debug-section-buttons');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('music-debug-instrument-play');
    expect(summary).toContain('Scheduled Notes');
    expect(summary).toContain('Song Length');
    expect(summary).toContain('Blueprint');
    expect(summary).toContain('Loop Range');
    expect(summary).toContain('Encounter');
    expect(summary).toContain('Combat');
    expect(summary).toContain('Mode');
    expect(summary).toContain('Region');
    expect(summary).toContain('Location');
    expect(summary).toContain('Preferred Intervals');
    expect(summary).toContain('Vocabulary');
    expect(summary).toContain('SongDNA');
    expect(summary).toContain('Layer Mix');
    expect(summary).toContain('Chords');
    expect(summary).toContain('Shared Motif');
    expect(summary).toContain('Lead Motif');
    expect(summary).toContain('Location Motif');
    expect(summary).toContain('Faction Motifs');
    expect(summary).toContain('Faction Interaction');
    expect(summary).toContain('NPC Motifs');
    expect(summary).toContain('Lead Contour');
    expect(summary).toContain('Lead Cadence');
    expect(summary).toContain('Lead Max Leap');
    expect(summary).toContain('Accidentals');
    expect(summary).toContain(snapshot.theme.id);
    expect(summary).toContain(snapshot.theme.vocabulary.modeLabel);
    expect(summary).toContain(snapshot.theme.motif.adaptationLabel);
    expect(summary).toContain(snapshot.songDna.identityId);
    expect(summary).toContain(snapshot.songDna.locationIdentityId);
    expect(summary).toContain(snapshot.songDna.recognitionLabel);
    expect(summary).toContain(
      snapshot.songDna.factionMotifs[0]?.factionName ?? ''
    );
    expect(summary).toContain(
      snapshot.songDna.importantNpcMotifs[0]?.npcName ?? ''
    );
    expect(summary).toContain('music-debug-instrument-waveform');
    expect(summary).toContain('music-debug-instrument-stats');
    expect(summary).toContain('Hz</dd>');
  });

  it('renders a lightweight shell before the generated preview is ready', () => {
    const markup = buildMusicDebugShellMarkup();
    const pendingSummary = buildMusicDebugPendingSummaryMarkup();

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('Generating preview...');
    expect(markup).toContain('music-debug-summary');
    expect(markup).toContain(pendingSummary.trim());
  });

  it('reuses cached snapshots for identical debug options', () => {
    const first = createCachedMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -2,
    });
    const second = createCachedMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -2,
    });

    expect(first).toBe(second);
  });

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

  it('starts debug song playback with a short lead and preserved note spacing', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: 10_000,
      }
    );

    playback.play(snapshot);

    const firstScheduled = play.mock.calls[0]?.[0];
    const secondScheduled = play.mock.calls[1]?.[0];
    const originalFirst = snapshot.notes[0];
    const originalSecond = snapshot.notes[1];

    expect(firstScheduled?.startMs).toBe(1_012);
    expect(secondScheduled?.startMs - firstScheduled?.startMs).toBe(
      (originalSecond?.startMs ?? 0) - (originalFirst?.startMs ?? 0)
    );
  });

  it('caps debug playback note envelopes to keep note attacks responsive', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => 1_000,
        scheduleAheadMs: 12,
        scheduleWindowMs: 10_000,
      }
    );

    playback.play(snapshot);

    const scheduledLead = play.mock.calls.find(
      ([note]) => note.role === 'lead'
    )?.[0];
    const scheduledHarmony = play.mock.calls.find(
      ([note]) => note.role === 'harmony'
    )?.[0];

    expect(scheduledLead?.attackMs).toBeLessThanOrEqual(24);
    expect(scheduledLead?.releaseMs).toBeLessThanOrEqual(180);
    expect(scheduledHarmony?.attackMs).toBeLessThanOrEqual(24);
    expect(scheduledHarmony?.releaseMs).toBeLessThanOrEqual(180);
  });

  it('schedules debug song playback in rolling batches instead of all at once', () => {
    vi.useFakeTimers();
    let currentNowMs = 1_000;
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll: vi.fn(),
      },
      {
        now: () => currentNowMs,
        scheduleAheadMs: 12,
        scheduleWindowMs: 48,
        scheduleTickMs: 16,
      }
    );

    playback.play(snapshot);

    const immediateScheduledCount = play.mock.calls.length;
    expect(immediateScheduledCount).toBeGreaterThan(0);
    expect(immediateScheduledCount).toBeLessThan(snapshot.notes.length);
    const nextDeferredNote = snapshot.notes[immediateScheduledCount];
    expect(nextDeferredNote).toBeDefined();
    const nextDeferredStartMs =
      1_012 +
      ((nextDeferredNote?.startMs ?? snapshot.song.startMs) -
        snapshot.song.startMs);
    const advanceMs = Math.max(
      32,
      Math.ceil(nextDeferredStartMs - (1_000 + 48))
    );

    currentNowMs += advanceMs;
    vi.advanceTimersByTime(advanceMs);

    expect(play.mock.calls.length).toBeGreaterThan(immediateScheduledCount);
  });

  it('cancels future debug note batches when playback stops', () => {
    vi.useFakeTimers();
    let currentNowMs = 1_000;
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const stopAll = vi.fn();
    const play = vi.fn();
    const playback = createMusicDebugSongPlayback(
      {
        resume: vi.fn(),
        play,
        stopAll,
      },
      {
        now: () => currentNowMs,
        scheduleAheadMs: 12,
        scheduleWindowMs: 48,
        scheduleTickMs: 16,
      }
    );

    playback.play(snapshot);
    const scheduledBeforeStop = play.mock.calls.length;

    playback.stop();
    currentNowMs += 128;
    vi.advanceTimersByTime(128);

    expect(stopAll).toHaveBeenCalledTimes(1);
    expect(play.mock.calls.length).toBe(scheduledBeforeStop);
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
