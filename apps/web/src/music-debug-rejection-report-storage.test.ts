import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  loadRejectedMusicDebugReports,
  saveRejectedMusicDebugReport,
} from './music-debug-rejection-report-storage.ts';

const EXPORTABLE_SNAPSHOT = createExportableSnapshot();
const REJECTED_SNAPSHOT = createRejectedSnapshot();

describe('music debug rejection report storage', () => {
  it('saves a report when a snapshot fails export-related validation', () => {
    const storage = createMemoryStorage();

    const saved = saveRejectedMusicDebugReport(REJECTED_SNAPSHOT, storage, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });

    expect(saved).toEqual(
      expect.objectContaining({
        themeId: REJECTED_SNAPSHOT.theme.id,
        clusterX: REJECTED_SNAPSHOT.options.clusterX,
        clusterY: REJECTED_SNAPSHOT.options.clusterY,
        rejectionReasons: expect.arrayContaining([
          'Variation answer cadence at measure 72 drifted outside the active harmony (C#, F; lead G#3, bass C2).',
        ]),
        report: expect.objectContaining({
          song: expect.objectContaining({
            leadContourAnalysis: expect.any(Object),
          }),
          cadenceValidation: expect.objectContaining({
            isValidForMidiExport: false,
          }),
        }),
      })
    );
    expect(loadRejectedMusicDebugReports(storage)).toHaveLength(1);
  });

  it('skips saving when the latest rejected report has the same rejection signature', () => {
    const storage = createMemoryStorage();

    saveRejectedMusicDebugReport(REJECTED_SNAPSHOT, storage, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });
    saveRejectedMusicDebugReport(REJECTED_SNAPSHOT, storage, {
      createdAt: new Date('2026-08-10T00:00:01.000Z'),
    });

    expect(loadRejectedMusicDebugReports(storage)).toHaveLength(1);
  });

  it('does not save a report for exportable snapshots', () => {
    const storage = createMemoryStorage();

    expect(
      saveRejectedMusicDebugReport(EXPORTABLE_SNAPSHOT, storage)
    ).toBeNull();
    expect(loadRejectedMusicDebugReports(storage)).toEqual([]);
  });
});

function createRejectedSnapshot() {
  const snapshot = createExportableSnapshot();
  return {
    ...snapshot,
    cadenceValidation: {
      ...snapshot.cadenceValidation,
      isValidForMidiExport: false,
      messages: [
        'Variation answer cadence at measure 72 drifted outside the active harmony (C#, F; lead G#3, bass C2).',
      ],
    },
  };
}

function createExportableSnapshot() {
  const snapshot = createMusicDebugSnapshot({
    tileKind: 'forest',
    contextType: 'overworld',
    clusterX: 4,
    clusterY: -1,
  });
  return {
    ...snapshot,
    midiExportValidation: {
      ...snapshot.midiExportValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    motifValidation: {
      ...snapshot.motifValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    timingValidation: {
      ...snapshot.timingValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    cadenceValidation: {
      ...snapshot.cadenceValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    percussionValidation: {
      ...snapshot.percussionValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    songDnaValidation: {
      ...snapshot.songDnaValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    leadContourAnalysis: {
      ...snapshot.leadContourAnalysis,
      finalResolvesToTonic: true,
      climaxNearPlannedPeak: true,
      messages: snapshot.leadContourAnalysis.messages.filter(
        (message) =>
          !message.includes('climax peaked at') &&
          !message.includes('resolved to scale degree')
      ),
    },
    midiAudit: {
      ...snapshot.midiAudit,
      mismatchMessages: [],
      criticalWarningMessages: [],
      warningMessages: [],
      isConsistent: true,
    },
  };
}

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}
