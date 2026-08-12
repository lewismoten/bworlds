import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import { inspectMusicDebugMidiBytes } from './music-debug-midi-audit.ts';
import { createMusicDebugMidiFileUnchecked } from './music-debug-midi.ts';
import {
  withValidLeadContourAnalysis,
  withValidProgressionDetections,
} from './testing/music-debug-midi-test-support.ts';

describe('music debug midi audit warnings', () => {
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

  it('warns when a non-percussion track uses too few velocity levels', () => {
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
      trackStats: {
        ...snapshot.trackStats,
        lead: {
          ...snapshot.trackStats.lead,
          noteCount: 8,
          uniqueVelocityLevelCount: 2,
          minVelocity: 80,
          maxVelocity: 84,
          averageVelocity: 82,
        },
      },
    });

    expect(audit.isConsistent).toBe(true);
    expect(audit.criticalWarningMessages).toEqual([]);
    expect(audit.warningMessages).toContain(
      'Lead uses only 2 velocity levels across 8 notes; dynamics may sound flat.'
    );
  });

  it('warns when a sustained track has no exported expression changes', () => {
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
      trackStats: {
        ...snapshot.trackStats,
        lead: {
          ...snapshot.trackStats.lead,
          noteCount: 8,
          occupancyPercentage: 62,
          averageDurationMs: 920,
          maxPolyphony: 1,
        },
      },
    });

    expect(audit.isConsistent).toBe(true);
    expect(audit.criticalWarningMessages).toEqual([]);
    expect(audit.warningMessages).toContain(
      'Lead sustains for 62% of the song with 920 ms average notes but exported MIDI has no expression changes.'
    );
  });

  it('does not warn when a sustained harmony track exports expression changes', () => {
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
    });

    expect(audit.warningMessages).not.toContain(
      expect.stringContaining('Harmony sustains for')
    );
  });
});
