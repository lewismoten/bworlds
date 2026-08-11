import { describe, expect, it } from 'vitest';

import {
  buildMusicDebugSummaryMarkup,
  createMusicDebugSnapshot,
} from './music-debug.ts';
import { createMusicDebugQualityStatus } from './music-debug-quality-status.ts';
import {
  buildMusicDebugParameterReport,
  collectMusicDebugRejectedReportReasons,
} from './music-debug-report.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

const PASSING_FOREST_SNAPSHOT = createPassingSnapshot(
  createMusicDebugSnapshot({
    tileKind: 'forest',
    contextType: 'overworld',
    clusterX: 4,
    clusterY: -1,
  })
);

const PASSING_TOWN_SNAPSHOT = createPassingSnapshot(
  createMusicDebugSnapshot({
    tileKind: 'town',
    contextType: 'town',
    clusterX: 3,
    clusterY: -2,
  })
);

describe('music debug quality status', () => {
  it('blocks good status when critical musical checks fail', () => {
    const blockedSnapshot = {
      ...PASSING_FOREST_SNAPSHOT,
      midiAudit: {
        ...PASSING_FOREST_SNAPSHOT.midiAudit,
        isConsistent: false,
        criticalWarningMessages: [
          'Intro harmony drifted at measures 1-2 (A-C-E vs G-B-D; notes A3, C4, E4).',
        ],
      },
    };

    const qualityStatus = createMusicDebugQualityStatus(blockedSnapshot);
    const summary = buildMusicDebugSummaryMarkup({
      ...blockedSnapshot,
      qualityStatus,
    });
    const report = buildMusicDebugParameterReport({
      ...blockedSnapshot,
      qualityStatus,
    });

    expect(qualityStatus.isGood).toBe(false);
    expect(qualityStatus.statusLabel).toBe('blocked');
    expect(qualityStatus.blockingReasons).toContain(
      'Intro harmony drifted at measures 1-2 (A-C-E vs G-B-D; notes A3, C4, E4).'
    );
    expect(summary).toContain('Quality');
    expect(summary).toContain(
      'blocked: Intro harmony drifted at measures 1-2 (A-C-E vs G-B-D; notes A3, C4, E4).'
    );
    expect(report.qualityStatus).toEqual(qualityStatus);
    expect(collectMusicDebugRejectedReportReasons(blockedSnapshot)).toEqual(
      qualityStatus.blockingReasons
    );
  });

  it('keeps non-critical warnings out of blocked quality status', () => {
    const warnedSnapshot = {
      ...PASSING_TOWN_SNAPSHOT,
      percussionValidation: {
        isValidForMidiExport: false,
        messages: ['Intro should not contain percussion notes.'],
      },
      midiAudit: {
        ...PASSING_TOWN_SNAPSHOT.midiAudit,
        warningMessages: ['Intro should not contain percussion notes.'],
      },
    };

    const qualityStatus = createMusicDebugQualityStatus(warnedSnapshot);
    const summary = buildMusicDebugSummaryMarkup({
      ...warnedSnapshot,
      qualityStatus,
    });

    expect(qualityStatus.isGood).toBe(true);
    expect(qualityStatus.blockingReasons).toEqual([]);
    expect(qualityStatus.warningReasons).toContain(
      'Intro should not contain percussion notes.'
    );
    expect(summary).toContain(
      'good with warnings: Intro should not contain percussion notes.'
    );
  });
});

function createPassingSnapshot(
  snapshot: MusicDebugSnapshot
): MusicDebugSnapshot {
  const qualityStatus = {
    isGood: true as const,
    statusLabel: 'good' as const,
    blockingReasons: [],
    warningReasons: [],
  };
  return {
    ...snapshot,
    midiExportValidation: {
      ...snapshot.midiExportValidation,
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
    songDnaValidation: {
      ...snapshot.songDnaValidation,
      isValidForMidiExport: true,
      messages: [],
    },
    percussionValidation: {
      ...snapshot.percussionValidation,
      messages: [],
    },
    leadContourAnalysis: {
      ...snapshot.leadContourAnalysis,
      finalResolvesToTonic: true,
      climaxNearPlannedPeak: true,
      messages: snapshot.leadContourAnalysis.messages.filter(
        (message) =>
          !message.includes('resolved to scale degree') &&
          !message.includes('climax peaked at')
      ),
    },
    midiAudit: {
      ...snapshot.midiAudit,
      mismatchMessages: [],
      criticalWarningMessages: [],
      warningMessages: [],
      isConsistent: true,
    },
    qualityStatus,
  };
}
