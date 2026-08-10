import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugMidiExportAudit,
  inspectMusicDebugMidiBytes,
} from './music-debug-midi-audit.ts';
import { createMusicDebugMidiFileUnchecked } from './music-debug-midi.ts';

describe('music debug midi audit', () => {
  it('exports all 88 planned measures for the easy plains audit snapshot', () => {
    const snapshot = findSnapshotWithDuration(138_000);

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
    const snapshot = findSnapshotWithDuration(138_000);

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

  it('flags mismatched snapshot metadata against the exported midi facts', () => {
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
      ...snapshot,
      durationMs: snapshot.durationMs + 1_000,
      measureCount: snapshot.measureCount + 1,
      resolvedBpm: snapshot.resolvedBpm + 12,
    });

    expect(audit.isConsistent).toBe(false);
    expect(
      audit.mismatchMessages.some((message) => message.includes('BPM'))
    ).toBe(true);
    expect(
      audit.mismatchMessages.some((message) => message.includes('duration'))
    ).toBe(true);
    expect(
      audit.mismatchMessages.some((message) => message.includes('measures'))
    ).toBe(true);
  });

  it('rejects exports when the harmony track collapses into single notes', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...snapshot,
      trackStats: {
        ...snapshot.trackStats,
        harmony: {
          ...snapshot.trackStats.harmony,
          maxPolyphony: 1,
        },
      },
      harmonyChordDetections: snapshot.harmonyChordDetections.map(
        (section) => ({
          ...section,
          chordLabels: [],
        })
      ),
    });

    expect(audit.isConsistent).toBe(false);
    expect(
      audit.mismatchMessages.some((message) => message.includes('single notes'))
    ).toBe(true);
    expect(
      audit.mismatchMessages.some((message) =>
        message.includes('recognizable chord stacks')
      )
    ).toBe(true);
  });

  it('flags planned sections when exported midi markers drift from the section plan', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...snapshot,
      song: {
        ...snapshot.song,
        sections: snapshot.song.sections.map((section, index) =>
          index === 1 ? { ...section, label: 'Section Z' } : section
        ),
      },
    });

    expect(audit.sectionsMatchPlannedMarkers).toBe(false);
    expect(
      audit.mismatchMessages.some((message) => message.includes('Section Z'))
    ).toBe(true);
  });

  it('flags harmony detections when detected chords drift from the planned progression order', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
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
      harmonyChordDetections: snapshot.harmonyChordDetections.map(
        (section, index) =>
          index === 0
            ? {
                ...section,
                detectedChordLabels: ['A-C-E'],
                plannedChordLabels: ['G-B-D', 'B-D-F', 'C-E-G'],
                followsPlannedProgression: false,
                driftWindows: [
                  {
                    startMeasure: 1,
                    endMeasure: 2,
                    detectedLabel: 'A-C-E',
                    detectedNoteLabels: ['A3', 'C4', 'E4'],
                    plannedLabel: 'G-B-D',
                  },
                ],
              }
            : section
      ),
      bassProgressionDetections: snapshot.bassProgressionDetections,
    });

    expect(audit.isConsistent).toBe(false);
    expect(audit.mismatchMessages).toEqual([]);
    expect(
      audit.criticalWarningMessages.some((message) =>
        message.includes(
          'Intro harmony drifted at measures 1-2 (A-C-E vs G-B-D; notes A3, C4, E4).'
        )
      )
    ).toBe(true);
  });

  it('flags bass detections when bass roots drift from the planned progression order', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
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
      bassProgressionDetections: snapshot.bassProgressionDetections.map(
        (section, index) =>
          index === 0
            ? {
                ...section,
                detectedRootLabels: ['A', 'C', 'E'],
                plannedRootLabels: ['G', 'D', 'E'],
                followsPlannedProgression: false,
                driftWindows: [
                  {
                    startMeasure: 1,
                    endMeasure: 2,
                    detectedLabel: 'A',
                    detectedNoteLabels: ['A3'],
                    plannedLabel: 'G',
                  },
                ],
              }
            : section
      ),
      harmonyChordDetections: snapshot.harmonyChordDetections,
    });

    expect(audit.isConsistent).toBe(false);
    expect(audit.mismatchMessages).toEqual([]);
    expect(
      audit.criticalWarningMessages.some((message) =>
        message.includes(
          'Intro bass roots drifted at measures 1-2 (A vs G; notes A3).'
        )
      )
    ).toBe(true);
  });

  it('flags cadence validation mismatches against the final phrase notes', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...snapshot,
      cadenceValidation: {
        ...snapshot.cadenceValidation,
        isValidForMidiExport: false,
        messages: [
          'Outro answer cadence at measure 80 drifted outside the active harmony (C, E, G; lead D4, bass G3).',
        ],
      },
    });

    expect(audit.isConsistent).toBe(false);
    expect(audit.mismatchMessages).toEqual([]);
    expect(audit.criticalWarningMessages).toContain(
      'Outro answer cadence at measure 80 drifted outside the active harmony (C, E, G; lead D4, bass G3).'
    );
  });

  it('flags lead-contour ending failures as critical audit warnings', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
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
      leadContourAnalysis: {
        ...snapshot.leadContourAnalysis,
        finalResolvesToTonic: false,
        messages: [
          'Lead contour ending at measure 80 on D4 resolved to scale degree 2 instead of tonic.',
        ],
      },
    });

    expect(audit.isConsistent).toBe(false);
    expect(audit.criticalWarningMessages).toContain(
      'Lead contour ending at measure 80 on D4 resolved to scale degree 2 instead of tonic.'
    );
  });

  it('flags lead-contour climax failures as critical audit warnings', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
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
      leadContourAnalysis: {
        ...snapshot.leadContourAnalysis,
        climaxNearPlannedPeak: false,
        messages: [
          'Lead contour climax peaked at measure 72 on C5 instead of the planned peak near measure 64.',
        ],
      },
    });

    expect(audit.isConsistent).toBe(false);
    expect(audit.criticalWarningMessages).toContain(
      'Lead contour climax peaked at measure 72 on C5 instead of the planned peak near measure 64.'
    );
  });

  it('flags percussion validation mismatches when percussion export rules drift', () => {
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
      percussionValidation: {
        isValidForMidiExport: false,
        messages: ['Intro should not contain percussion notes.'],
      },
    });

    expect(audit.isConsistent).toBe(true);
    expect(audit.mismatchMessages).toEqual([]);
    expect(audit.warningMessages).toContain(
      'Intro should not contain percussion notes.'
    );
  });

  it('keeps non-critical warnings from invalidating an otherwise consistent midi audit', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...withValidProgressionDetections(withValidLeadContourAnalysis(snapshot)),
      cadenceValidation: {
        ...snapshot.cadenceValidation,
        isValidForMidiExport: true,
        messages: [],
      },
      percussionValidation: {
        isValidForMidiExport: false,
        messages: ['Intro should not contain percussion notes.'],
      },
    });

    expect(audit.isConsistent).toBe(true);
    expect(audit.criticalWarningMessages).toEqual([]);
    expect(audit.warningMessages).toContain(
      'Intro should not contain percussion notes.'
    );
  });

  it('flags scheduled-note mismatches when exported role note counts drift', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...snapshot,
      roleCounts: {
        ...snapshot.roleCounts,
        lead: snapshot.roleCounts.lead + 1,
      },
    });

    expect(audit.isConsistent).toBe(false);
    expect(
      audit.mismatchMessages.some((message) =>
        message.includes('lead note count')
      )
    ).toBe(true);
  });

  it('flags pitch-class mismatches when exported notes drift from the mode profile', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...snapshot,
      midiExportValidation: {
        ...snapshot.midiExportValidation,
        pitchClassCountsByRole: {
          ...snapshot.midiExportValidation.pitchClassCountsByRole,
          lead: {
            ...snapshot.midiExportValidation.pitchClassCountsByRole.lead,
            G:
              (snapshot.midiExportValidation.pitchClassCountsByRole.lead.G ??
                0) + 1,
          },
        },
      },
    });

    expect(audit.isConsistent).toBe(false);
    expect(
      audit.mismatchMessages.some((message) =>
        message.includes('lead pitch classes')
      )
    ).toBe(true);
  });

  it('flags motif-sequence mismatches when exported lead notes drift from the motif plan', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const file = createMusicDebugMidiFileUnchecked(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    const audit = inspectMusicDebugMidiBytes(file.bytes, {
      ...snapshot,
      motifValidation: {
        ...snapshot.motifValidation,
        exactMatchCount: snapshot.motifValidation.exactMatchCount + 1,
      },
    });

    expect(audit.isConsistent).toBe(false);
    expect(
      audit.mismatchMessages.some((message) =>
        message.includes('motif matches')
      )
    ).toBe(true);
  });
});

function findSnapshotWithDuration(targetDurationMs: number) {
  if (
    cachedSnapshotWithDuration &&
    cachedSnapshotWithDuration.durationMs === targetDurationMs
  ) {
    return cachedSnapshotWithDuration;
  }

  for (let clusterY = -8; clusterY <= 8; clusterY += 1) {
    for (let clusterX = -8; clusterX <= 8; clusterX += 1) {
      const snapshot = createMusicDebugSnapshot({
        tileKind: 'plains',
        contextType: 'overworld',
        clusterX,
        clusterY,
      });
      if (snapshot.durationMs === targetDurationMs) {
        cachedSnapshotWithDuration = snapshot;
        return snapshot;
      }
    }
  }

  throw new Error(
    `Unable to find a plains overworld snapshot with duration ${targetDurationMs}.`
  );
}

let cachedSnapshotWithDuration: ReturnType<
  typeof createMusicDebugSnapshot
> | null = null;

function withValidLeadContourAnalysis(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    leadContourAnalysis: {
      ...snapshot.leadContourAnalysis,
      finalResolvesToTonic: true,
      climaxNearPlannedPeak: true,
      matchesPlannedContour: true,
      messages: snapshot.leadContourAnalysis.messages.filter(
        (message) =>
          !message.includes('climax peaked at') &&
          !message.includes('resolved to scale degree')
      ),
    },
  };
}

function withValidProgressionDetections(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    harmonyChordDetections: snapshot.harmonyChordDetections.map((section) => ({
      ...section,
      followsPlannedProgression: true,
      driftWindows: [],
    })),
    bassProgressionDetections: snapshot.bassProgressionDetections.map(
      (section) => ({
        ...section,
        followsPlannedProgression: true,
        driftWindows: [],
      })
    ),
  };
}
