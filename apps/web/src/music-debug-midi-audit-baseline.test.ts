import { describe, expect, it } from 'vitest';

import { resolveMusicDebugKnownGoodSeed } from './music-debug-known-good-seeds.ts';
import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugMidiExportAudit,
  inspectMusicDebugMidiBytes,
} from './music-debug-midi-audit.ts';
import { createMusicDebugMidiFileUnchecked } from './music-debug-midi.ts';
import {
  withValidLeadContourAnalysis,
  withValidProgressionDetections,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi audit baseline', () => {
  it('exports all 88 planned measures for the easy plains audit snapshot', () => {
    const snapshot = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('plains-midi-audit-baseline').options
    );

    expect(snapshot.measureCount).toBe(88);
    expect(snapshot.midiAudit.exportedMeasureCount).toBe(88);
    expect(snapshot.midiAudit.exportedMeasureCount).toBe(snapshot.measureCount);
  }, 20_000);

  it('keeps the harmony track polyphonic with simultaneous chord notes', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });

    expect(snapshot.trackStats.harmony.maxPolyphony).toBeGreaterThan(1);
    expect(
      snapshot.harmonyChordDetections.some(
        (section) => section.chordLabels.length > 0
      )
    ).toBe(true);
    expect(
      snapshot.bassProgressionDetections.some(
        (section) => section.detectedRootLabels.length > 0
      )
    ).toBe(true);
  });

  it('keeps the easy plains export aligned with the reported 2:18 duration and bpm', () => {
    const snapshot = createMusicDebugSnapshot(
      resolveMusicDebugKnownGoodSeed('plains-midi-audit-baseline').options
    );

    const audit = createMusicDebugMidiExportAudit(
      withValidProgressionDetections(withValidLeadContourAnalysis(snapshot)),
      {
        createdAt: new Date('2026-08-09T00:00:00.000Z'),
      }
    );

    expect(snapshot.durationMs).toBe(138_000);
    expect(snapshot.measureCount).toBe(88);
    expect(snapshot.resolvedBpm).toBeCloseTo(153.043478, 3);
    expect(audit.exportedDurationMs).toBeCloseTo(138_000, -1);
    expect(audit.exportedBpm).toBeCloseTo(153.043478, 1);
    expect(audit.isConsistent).toBe(
      snapshot.cadenceValidation.isValidForMidiExport &&
        snapshot.leadContourAnalysis.finalResolvesToTonic &&
        snapshot.leadContourAnalysis.climaxNearPlannedPeak
    );
  }, 20_000);

  it('parses exported bpm, duration, and measures back from the midi bytes', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...withValidProgressionDetections(withValidLeadContourAnalysis(snapshot)),
      cadenceValidation: {
        ...snapshot.cadenceValidation,
        isValidForMidiExport: true,
        messages: [],
      },
    });

    expect(audit.exportedBpm).toBeCloseTo(snapshot.resolvedBpm, 1);
    expect(audit.exportedDurationMs).toBeCloseTo(snapshot.durationMs, -1);
    expect(audit.exportedMeasureCount).toBe(snapshot.measureCount);
    expect(audit.markerLabels).toEqual(
      snapshot.song.sections.map((section) => section.label)
    );
    expect(audit.sectionsMatchPlannedMarkers).toBe(true);
    expect(audit.isConsistent).toBe(true);
    expect(audit.mismatchMessages).toEqual([]);
    expect(audit.criticalWarningMessages).toEqual([]);
    expect(audit.exportedNoteCountsByRole).toEqual(snapshot.roleCounts);
    expect(audit.exportedPitchClassCountsByRole.bass).toEqual(
      snapshot.midiExportValidation.pitchClassCountsByRole.bass
    );
    expect(audit.exportedPitchClassCountsByRole.harmony).toEqual(
      snapshot.midiExportValidation.pitchClassCountsByRole.harmony
    );
    expect(audit.exportedPitchClassCountsByRole.lead).toEqual(
      snapshot.midiExportValidation.pitchClassCountsByRole.lead
    );
    expect(audit.exportedMotifExactMatchCount).toBe(
      snapshot.motifValidation.exactMatchCount
    );
    expect(audit.exportedMotifVariedMatchCount).toBe(
      snapshot.motifValidation.variedMatchCount
    );
    expect(
      Object.keys(audit.exportedPitchClassCountsByRole.percussion)
    ).not.toHaveLength(0);
  });
});
