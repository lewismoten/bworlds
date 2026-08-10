import { describe, expect, it } from 'vitest';

import { createMusicDebugExportBundle } from './music-debug-export-bundle.ts';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugPercussionVoiceCounts } from './music-debug-percussion-report.ts';

describe('music debug export bundle percussion solo wavs', () => {
  it('exports one solo wav for each resolved percussion voice in the song', () => {
    const snapshot = toExportableSnapshot(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 4,
        clusterY: -1,
      })
    );
    const bundle = createMusicDebugExportBundle(snapshot, {
      createdAt: new Date('2026-08-10T00:00:00.000Z'),
    });
    const fileNames = bundle.entries.map((entry) => entry.fileName);
    const percussionVoices = createMusicDebugPercussionVoiceCounts(
      snapshot.notes
    );

    expect(percussionVoices.length).toBeGreaterThan(0);
    for (const voice of percussionVoices) {
      expect(voice.voiceId).toBeTruthy();
      expect(fileNames).toContain(
        `bworlds-deep-forest-4--1-percussion-${voice.voiceId}-solo.wav`
      );
    }
    expect(bundle.entries).toHaveLength(6 + percussionVoices.length);
  }, 10_000);
});

function toExportableSnapshot(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return withValidLeadContourAnalysis(
    withValidProgressionDetections(withValidCadenceValidation(snapshot))
  );
}

function withValidCadenceValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    cadenceValidation: {
      ...snapshot.cadenceValidation,
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

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
