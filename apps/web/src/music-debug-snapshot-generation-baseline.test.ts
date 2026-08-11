import { describe, expect, it } from 'vitest';
import {
  createCachedMusicDebugSnapshot,
  createMusicDebugSnapshot,
} from './music-debug.ts';

describe('music debug snapshot generation baseline', () => {
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

  it('provides a theme object that can drive pitch-scale overlays', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    expect(snapshot.theme.scale.length).toBeGreaterThan(0);
    expect(snapshot.theme.rootHz).toBeGreaterThan(0);
  });
});
