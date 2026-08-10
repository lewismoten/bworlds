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
  }, 15_000);

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
  });

  it('keeps the easy plains export aligned with the reported 2:18 duration and bpm', () => {
    const snapshot = findSnapshotWithDuration(138_000);

    const audit = createMusicDebugMidiExportAudit(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    expect(snapshot.durationMs).toBe(138_000);
    expect(snapshot.measureCount).toBe(88);
    expect(snapshot.resolvedBpm).toBeCloseTo(153.043478, 3);
    expect(audit.exportedDurationMs).toBeCloseTo(138_000, -1);
    expect(audit.exportedBpm).toBeCloseTo(153.043478, 1);
    expect(audit.isConsistent).toBe(true);
  }, 15_000);

  it('parses exported bpm, duration, and measures back from the midi bytes', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });

    const audit = createMusicDebugMidiExportAudit(snapshot, {
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
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
