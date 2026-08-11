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
import { resolveMusicDebugKnownGoodSeed } from './music-debug-known-good-seeds.ts';

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
    expect(first.leadContourAnalysis).toEqual(second.leadContourAnalysis);
    expect(first.leadPhraseCadence).toEqual(second.leadPhraseCadence);
    expect(first.cadenceDetections).toEqual(second.cadenceDetections);
    expect(first.cadenceValidation).toEqual(second.cadenceValidation);
    expect(first.densitySections).toEqual(second.densitySections);
    expect(first.densityValidation).toEqual(second.densityValidation);
    expect(first.percussionValidation).toEqual(second.percussionValidation);
    expect(first.songDnaValidation).toEqual(second.songDnaValidation);
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
    expect(first.sectionLayerActivity).toEqual(second.sectionLayerActivity);
    expect(first.sectionLayerComparisons).toEqual(
      second.sectionLayerComparisons
    );
    expect(first.lyrics).toEqual(second.lyrics);
    expect(first.notes).toEqual(second.notes);
    expect(first.durationMs).toBeGreaterThanOrEqual(120_000);
    expect(first.durationMs).toBeLessThanOrEqual(180_000);
    expect(first.measureCount).toBe(80);
    expect(first.resolvedBpm).toBeGreaterThan(100);
    expect(first.theme.rootMidiNote).toBe(first.scaleMap.rootMidiNote);
    expect(first.scaleMap.rootMidiNote).toBeGreaterThan(0);
    expect(first.scaleMap.modePitchOffsets.length).toBeGreaterThan(0);
    expect(first.songDna.rootMidiNote).toBe(first.scaleMap.rootMidiNote);
    expect(first.timingValidation.isValidForMidiExport).toBe(true);
    expect(first.densityValidation.isValidForMidiExport).toBe(true);
    expect(first.songDnaValidation.isValidForMidiExport).toBe(true);
    expect(first.song.sections[0]?.startTick).toBe(0);
    expect(first.song.sections[0]?.endTick).toBe(8 * 1920);
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
    expect(first.notePitchDiagnostics.length).toBe(first.notes.length);
    expect(first.outOfModeNotesByRole.bass).toBeGreaterThanOrEqual(0);
    expect(first.blackKeyNotesByRole.lead).toBeGreaterThanOrEqual(0);
    expect(first.dominantPitchClassesByRole.bass.length).toBeGreaterThan(0);
    expect(first.dominantPitchClassesByRole.lead.length).toBeGreaterThan(0);
    expect(first.trackStats.bass.noteCount).toBe(first.roleCounts.bass);
    expect(first.trackStats.harmony.rangeLabel).toMatch(
      /^[A-G]#?-?\d-[A-G]#?-?\d$/
    );
    expect(first.trackStats.lead.maxLeapSemitones).toBeGreaterThanOrEqual(
      first.trackStats.lead.averageLeapSemitones
    );
    expect(first.trackStats.harmony.maxPolyphony).toBeGreaterThanOrEqual(1);
    expect(first.trackStats.harmony.occupancyPercentage).toBeGreaterThan(0);
    expect(first.trackStats.harmony.occupancyPercentage).toBeLessThanOrEqual(
      100
    );
    expect(first.trackStats.bass.averageDurationMs).toBeGreaterThan(0);
    expect(first.trackStats.lead.averageSilenceMs).toBeGreaterThanOrEqual(0);
    expect(first.instrumentBank.instruments.lead.supportedRoles).toEqual([
      'lead',
    ]);
    expect(first.instrumentBank.instruments.lead.recommendedMidiRange).toEqual({
      minMidiNote: 60,
      maxMidiNote: 84,
    });
    expect(first.instrumentBank.instruments.lead.preferredMidiRange).toEqual({
      minMidiNote: 64,
      maxMidiNote: 79,
    });
    expect(first.instrumentBank.instruments.lead.defaultVelocity).toBe(108);
    expect(
      first.instrumentBank.instruments.percussion.defaultNoteDurationMs
    ).toBeGreaterThan(0);
    expect(first.intervalComparison.totalIntervalCount).toBeGreaterThan(0);
    expect(
      first.intervalComparison.actualIntervalCounts.length
    ).toBeGreaterThan(0);
    expect(first.phraseRepetition.phraseCount).toBeGreaterThan(0);
    expect(first.phraseRepetition.averageSimilarityPercentage).toBeGreaterThan(
      0
    );
    expect(first.leadContourAnalysis.points.length).toBeGreaterThan(0);
    expect(
      first.leadContourAnalysis.inRangePointCount +
        first.leadContourAnalysis.outOfRangePointCount +
        first.leadContourAnalysis.missingPointCount
    ).toBe(first.leadContourAnalysis.points.length);
    expect(first.sectionMotifMatches).toHaveLength(first.song.sections.length);
    expect(first.motifValidation.totalMatchCount).toBeGreaterThan(0);
    expect(first.motifValidation.isValidForMidiExport).toBe(true);
    expect(first.harmonyChordDetections).toHaveLength(
      first.song.sections.length
    );
    expect(first.bassProgressionDetections).toHaveLength(
      first.song.sections.length
    );
    expect(first.sectionValidationSummary).toHaveLength(
      first.song.sections.length
    );
    expect(first.sectionLayerActivity).toHaveLength(first.song.sections.length);
    expect(first.sectionLayerComparisons).toHaveLength(
      first.song.sections.length
    );
    expect(first.sectionLayerActivity[0]?.sectionLabel).toBe(
      first.song.sections[0]?.label
    );
    expect(first.sectionLayerComparisons[0]?.sectionLabel).toBe(
      first.song.sections[0]?.label
    );
    expect(
      first.sectionLayerActivity.some((entry) => entry.roleCounts.lead > 0)
    ).toBe(true);
    expect(
      first.sectionLayerActivity.every((entry) =>
        Object.values(entry.soundingTimePercentageByRole).every(
          (value) => value >= 0 && value <= 100
        )
      )
    ).toBe(true);
    expect(
      first.harmonyChordDetections.some((entry) => entry.chordLabels.length > 0)
    ).toBe(true);
    expect(
      first.bassProgressionDetections.some(
        (entry) =>
          entry.plannedRootLabels.length > 0 &&
          entry.detectedRootLabels.length > 0 &&
          entry.followsPlannedProgression
      )
    ).toBe(true);
    expect(
      first.sectionLayerComparisons.some(
        (entry) =>
          entry.matchedRules.length > 0 || entry.mismatchRules.length > 0
      )
    ).toBe(true);
    expect(first.midiExportValidation.accidentalNoteCount).toBe(
      first.accidentalNoteCount
    );
    expect(first.midiExportValidation.blackKeyNoteCount).toBeGreaterThanOrEqual(
      first.accidentalNoteCount
    );
  }, 4_000);

  it('renders markup and summary content for the laboratory page', () => {
    const snapshot = createMusicDebugSnapshot();
    const markup = buildMusicDebugMarkup(snapshot);
    const summary = buildMusicDebugSummaryMarkup(snapshot);

    expect(markup).toContain('Music Laboratory');
    expect(markup).toContain('/debug/');
    expect(markup).toContain('music-debug-form');
    expect(markup).toContain('music-debug-timeline');
    expect(markup).toContain('music-debug-randomize');
    expect(markup).toContain('Play Full Song');
    expect(markup).toContain('music-debug-playback-variant');
    expect(markup).toContain('music-debug-playback-dry');
    expect(markup).toContain('Full Song</option>');
    expect(markup).toContain('Melody Only</option>');
    expect(markup).toContain('Harmony + Bass</option>');
    expect(markup).toContain('Dry playback');
    expect(markup).toContain('Download MIDI');
    expect(markup).toContain('Download Export ZIP');
    expect(markup).toContain('music-debug-export-variant');
    expect(markup).toContain('Melody Only MIDI');
    expect(markup).toContain('Harmony + Bass MIDI');
    expect(markup).toContain('Loop middle section after full-song preview');
    expect(markup).toContain('music-debug-current-time');
    expect(markup).toContain('music-debug-current-section');
    expect(markup).toContain('music-debug-section-buttons');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(markup).toContain('music-debug-instrument-play');
    expect(markup).toContain('music-debug-contour-graph');
    expect(markup).toContain('music-debug-cadence-conflicts');
    expect(markup).toContain('music-debug-percussion-substitutions');
    expect(markup.indexOf('>Melody<')).toBeLessThan(
      markup.indexOf('>Harmony<')
    );
    expect(markup.indexOf('>Harmony<')).toBeLessThan(markup.indexOf('>Bass<'));
    expect(markup.indexOf('id="music-debug-timeline"')).toBeLessThan(
      markup.indexOf('id="music-debug-instrument-panel-root"')
    );
    expect(
      markup.indexOf('id="music-debug-instrument-panel-root"')
    ).toBeLessThan(markup.indexOf('id="music-debug-summary"'));
    expect(markup).toContain('id="music-debug-instrument-panel-root"');
    expect(markup).toContain('music-debug-instrument-panel');
    expect(summary).toContain('Scheduled Notes');
    expect(summary).toContain('Percussion Voice Playback');
    expect(summary).toContain('Audition Drum Kit');
    expect(summary).toContain(
      'data-percussion-playback-action="audition-pattern"'
    );
    expect(summary).toContain('data-percussion-playback-action="solo"');
    expect(summary).toContain('data-percussion-playback-action="mute"');
    expect(summary).toContain('Song Length');
    expect(summary).toContain('Root MIDI');
    expect(summary).toContain('Measures');
    expect(summary).toContain('MIDI Measures');
    expect(summary).toContain('MIDI Sections');
    expect(summary).toContain('Blueprint');
    expect(summary).toContain('Loop Range');
    expect(summary).toContain('Timing Check');
    expect(summary).toContain('Encounter');
    expect(summary).toContain('Combat');
    expect(summary).toContain('Resolved BPM');
    expect(summary).toContain('MIDI BPM');
    expect(summary).toContain('Mode');
    expect(summary).toContain('Mode Offsets');
    expect(summary).toContain('Region');
    expect(summary).toContain('Location');
    expect(summary).toContain('Preferred Intervals');
    expect(summary).toContain('Interval Match');
    expect(summary).toContain('Phrase Similarity');
    expect(summary).toContain('Motif Check');
    expect(summary).toContain('semitones');
    expect(summary).toContain('Vocabulary');
    expect(summary).toContain('SongDNA');
    expect(summary).toContain('Layer Mix');
    expect(summary).toContain('Actual Layers');
    expect(summary).toContain('Layer Check');
    expect(summary).toContain('Chords');
    expect(summary).toContain('Shared Motif');
    expect(summary).toContain('Lead Motif');
    expect(summary).toContain('Location Motif');
    expect(summary).toContain('Faction Motifs');
    expect(summary).toContain('Faction Interaction');
    expect(summary).toContain('NPC Motifs');
    expect(summary).toContain('Lead Contour');
    expect(summary).toContain('Lead Contour Check');
    expect(summary).toContain('Lead Contour Graph');
    expect(summary).toContain('Lead Cadence');
    expect(summary).toContain('Lead Max Leap');
    expect(summary).toContain('Accidentals');
    expect(summary).toContain('Out-of-Mode');
    expect(summary).toContain('Black Keys');
    expect(summary).toContain('Pitch Centers');
    expect(summary).toContain('Accidental Rules');
    expect(summary).toContain('Accidental Notes');
    expect(summary).toContain('Track Pitch');
    expect(summary).toContain('Track Sounding');
    expect(summary).toContain('Track Timing');
    expect(summary).toContain('Melody ');
    expect(summary).toContain('exact repeats');
    expect(summary).toContain('Motif Matches');
    expect(summary).toContain('Motif Validation');
    expect(summary).toContain('Chord Measures');
    expect(summary).toContain('Harmony Chords');
    expect(summary).toContain('Bass Progression');
    expect(summary).toContain('Section Checks');
    expect(summary).toContain('Cadence Harmony Conflicts');
    expect(summary).toContain('Percussion Substitutions');
    expect(summary).toContain('Drum Counts');
    expect(summary).toContain('Percussion Events');
    expect(summary).toContain('MIDI Audit');
    expect(summary).toContain('avg leap');
    expect(summary).toContain('max leap');
    expect(summary).toContain('out-of-mode');
    expect(summary).toContain('% sounding');
    expect(summary).toContain('avg dur');
    expect(summary).toContain('avg gap');
    expect(summary).toContain('peak poly');
    expect(summary).toContain('Section Measures');
    expect(summary).toContain('Intro ');
    expect(summary).toContain(snapshot.theme.id);
    expect(summary).toContain(snapshot.theme.vocabulary.modeLabel);
    expect(summary).toContain(snapshot.theme.motif.adaptationLabel);
    expect(summary).toContain(snapshot.songDna.identityId);
    expect(summary).toContain(snapshot.songDna.locationIdentityId);
    expect(summary).toContain(snapshot.songDna.recognitionLabel);
    expect(summary).toMatch(/Chord Measures .* m\d/);
    expect(summary).toContain('planned range');
    expect(summary).toContain(
      snapshot.songDna.factionMotifs[0]?.factionName ?? ''
    );
    expect(summary).toContain(
      snapshot.songDna.importantNpcMotifs[0]?.npcName ?? ''
    );
    expect(markup).toContain('Hz</dd>');
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

  it('can limit debug song playback to a selected role subset', () => {
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
        scheduleWindowMs: snapshot.durationMs + 1_000,
      }
    );

    playback.play(snapshot, null, { roles: ['bass', 'harmony'] });

    expect(play.mock.calls.length).toBeGreaterThan(0);
    expect(new Set(play.mock.calls.map(([note]) => note.role))).toEqual(
      new Set(['bass', 'harmony'])
    );
  });

  it('can solo a selected percussion voice without dropping non-percussion roles', () => {
    const snapshot = createMusicDebugSnapshot(
      {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 2,
        clusterY: -1,
      },
      2_000
    );
    const selectedPercussionVoiceId = snapshot.notes
      .find(
        (note) =>
          note.role === 'percussion' &&
          note.instrumentId.includes(':perc-kick-35:')
      )
      ?.instrumentId.match(/:perc-([a-z-]+-\d+):/)?.[1];
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
        scheduleWindowMs: snapshot.durationMs + 1_000,
      }
    );

    expect(selectedPercussionVoiceId).toBeTruthy();

    playback.play(snapshot, null, {
      percussionVoiceIds: [selectedPercussionVoiceId!],
    });

    const scheduledRoles = new Set(play.mock.calls.map(([note]) => note.role));
    const scheduledPercussionVoiceIds = new Set(
      play.mock.calls
        .filter(([note]) => note.role === 'percussion')
        .map(
          ([note]) => note.instrumentId.match(/:perc-([a-z-]+-\d+):/)?.[1] ?? ''
        )
    );

    expect(scheduledRoles.has('lead')).toBe(true);
    expect(scheduledRoles.has('harmony')).toBe(true);
    expect(scheduledRoles.has('bass')).toBe(true);
    expect(scheduledPercussionVoiceIds).toEqual(
      new Set([selectedPercussionVoiceId])
    );
  });

  it('can schedule a dry debug playback pass without reverb send', () => {
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
        scheduleWindowMs: snapshot.durationMs + 1_000,
      }
    );

    playback.play(snapshot, null, { dry: true });

    const scheduledWithSpace = play.mock.calls.find(
      ([note]) => note.space !== undefined
    )?.[0];

    expect(scheduledWithSpace?.space?.wetGain).toBe(0);
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
  }, 5_000);

  it('lowers harmony occupancy in lead-active reprise and contrast sections', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const activityById = new Map(
      snapshot.sectionLayerActivity.map((activity) => [
        activity.sectionId,
        activity,
      ])
    );
    const sectionA = activityById.get('a');
    const sectionAPrime = activityById.get('a-prime');
    const sectionB = activityById.get('b');

    expect(sectionA).toBeDefined();
    expect(sectionAPrime).toBeDefined();
    expect(sectionB).toBeDefined();
    expect(sectionAPrime!.soundingTimePercentageByRole.harmony).toBeLessThan(
      sectionA!.soundingTimePercentageByRole.harmony
    );
    expect(sectionB!.soundingTimePercentageByRole.harmony).toBeLessThan(
      sectionA!.soundingTimePercentageByRole.harmony
    );
  });

  it("keeps Section A' lead prominence above Section A in representative snapshots", () => {
    const forest = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('forest-structure-baseline').options
    );
    const town = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('town-blueprint-baseline').options,
      1000
    );

    for (const snapshot of [forest, town]) {
      const prominenceById = new Map(
        snapshot.sectionProminence.map((section) => [
          section.sectionId,
          section,
        ])
      );
      const sectionA = prominenceById.get('a');
      const sectionAPrime = prominenceById.get('a-prime');

      expect(sectionA).toBeDefined();
      expect(sectionAPrime).toBeDefined();
      expect(sectionAPrime!.roles.lead.prominenceScore).toBeGreaterThan(
        sectionA!.roles.lead.prominenceScore
      );
    }
  }, 10_000);

  it('keeps Section B harmony prominence below Section A in representative snapshots', () => {
    const forest = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('forest-structure-baseline').options
    );
    const town = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('town-blueprint-baseline').options,
      1000
    );

    for (const snapshot of [forest, town]) {
      const prominenceById = new Map(
        snapshot.sectionProminence.map((section) => [
          section.sectionId,
          section,
        ])
      );
      const sectionA = prominenceById.get('a');
      const sectionB = prominenceById.get('b');

      if (!sectionB) {
        continue;
      }

      expect(sectionA).toBeDefined();
      expect(sectionB.roles.harmony.prominenceScore).toBeLessThan(
        sectionA!.roles.harmony.prominenceScore
      );
    }
  }, 10_000);

  it('reports stable section-plan rule matches for representative snapshots', () => {
    const snapshot = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('forest-structure-baseline').options
    );
    const comparisonsById = new Map(
      snapshot.sectionLayerComparisons.map((comparison) => [
        comparison.sectionId,
        comparison,
      ])
    );
    const intro = comparisonsById.get('intro');
    const sectionA = comparisonsById.get('a');
    const variation = comparisonsById.get('variation');
    const sectionReturn = comparisonsById.get('return');
    const outro = comparisonsById.get('outro');

    expect(snapshot.sectionLayerComparisons).toHaveLength(
      snapshot.song.sections.length
    );
    expect(intro?.matchedRules).toContain('percussion stays absent');
    expect(sectionA?.matchedRules).toContain('all four roles stay active');
    expect(variation?.matchedRules).toContain('lead remains present');
    expect(sectionReturn?.matchedRules).toContain('all four roles return');
    expect(outro?.matchedRules).toContain('percussion drops out');
  });

  it('keeps settled blueprint occupancy comparisons stable for the representative town snapshot', () => {
    const snapshot = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('town-blueprint-baseline').options,
      1000
    );

    expect(snapshot.sectionLayerComparisons).toHaveLength(
      snapshot.song.sections.length
    );
    expect(
      snapshot.sectionLayerComparisons.filter(
        (comparison) => comparison.matchesPlan
      )
    ).toHaveLength(0);
    expect(snapshot.sectionLayerComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'intro',
          mismatchRules: ['lead occupancy 42% exceeded blueprint maximum 35%'],
        }),
        expect.objectContaining({
          sectionId: 'b',
          mismatchRules: [
            'harmony occupancy 18% stayed below blueprint minimum 20%',
            'lead occupancy 48% exceeded blueprint maximum 38%',
            'percussion occupancy 3% stayed below blueprint minimum 5%',
          ],
        }),
        expect.objectContaining({
          sectionId: 'a',
          mismatchRules: ['lead occupancy 44% exceeded blueprint maximum 38%'],
        }),
        expect.objectContaining({
          sectionId: 'a-prime',
          mismatchRules: ['lead occupancy 44% exceeded blueprint maximum 40%'],
        }),
        expect.objectContaining({
          sectionId: 'return',
          mismatchRules: ['lead occupancy 45% exceeded blueprint maximum 38%'],
        }),
        expect.objectContaining({
          sectionId: 'outro',
          mismatchRules: [
            'harmony occupancy 41% stayed below blueprint minimum 55%',
          ],
        }),
      ])
    );
  });
});
