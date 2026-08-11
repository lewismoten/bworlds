import { describe, expect, it } from 'vitest';
import {
  createCachedMusicDebugSnapshot,
  createMusicDebugSnapshot,
  formatMusicDebugDuration,
  formatMusicDebugLoopRange,
  normalizeMusicDebugOptions,
  randomizeMusicDebugSeed,
} from './music-debug.ts';
import { resolveMusicDebugKnownGoodSeed } from './music-debug-known-good-seeds.ts';
import {
  FOREST_KNOWN_GOOD_SNAPSHOT,
  TOWN_KNOWN_GOOD_SNAPSHOT,
} from './testing/music-debug-test-support.ts';

describe('music debug snapshots', () => {
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
  }, 5_000);

  it("keeps Section A' lead prominence above Section A in representative snapshots", () => {
    for (const snapshot of [FOREST_KNOWN_GOOD_SNAPSHOT, TOWN_KNOWN_GOOD_SNAPSHOT]) {
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
    for (const snapshot of [FOREST_KNOWN_GOOD_SNAPSHOT, TOWN_KNOWN_GOOD_SNAPSHOT]) {
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
    const snapshot = FOREST_KNOWN_GOOD_SNAPSHOT;
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
    const snapshot = TOWN_KNOWN_GOOD_SNAPSHOT;

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
