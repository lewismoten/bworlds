import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import { inspectMusicDebugMidiBytes } from './music-debug-midi-audit.ts';
import { createMusicDebugMidiFileUnchecked } from './music-debug-midi.ts';

describe('music debug midi audit mismatches', () => {
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
