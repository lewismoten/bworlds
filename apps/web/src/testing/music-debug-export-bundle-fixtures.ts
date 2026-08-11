import { createMusicDebugExportBundle } from '../music-debug-export-bundle.ts';
import { createMusicDebugSnapshot } from '../music-debug.ts';
import { createMusicDebugPercussionVoiceCounts } from '../music-debug-percussion-report.ts';

export const FOREST_EXPORTABLE_SNAPSHOT = toExportableSnapshot(
  createMusicDebugSnapshot({
    tileKind: 'forest',
    contextType: 'overworld',
    clusterX: 4,
    clusterY: -1,
  })
);

export const FOREST_EXPORT_BUNDLE = createMusicDebugExportBundle(
  FOREST_EXPORTABLE_SNAPSHOT,
  {
    createdAt: new Date('2026-08-10T00:00:00.000Z'),
  }
);

export const FOREST_PERCUSSION_VOICES = createMusicDebugPercussionVoiceCounts(
  FOREST_EXPORTABLE_SNAPSHOT.notes
);

export const TOWN_EXPORTABLE_SNAPSHOT = toExportableSnapshot(
  createMusicDebugSnapshot({
    tileKind: 'town',
    contextType: 'town',
    clusterX: 3,
    clusterY: -2,
  })
);

export function toExportableSnapshot(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return withValidHarmonicAlignmentValidation(
    withValidPhraseIntentValidation(
      withValidPercussionValidation(
        withValidLeadContourAnalysis(
          withValidProgressionDetections(withValidCadenceValidation(snapshot))
        )
      )
    )
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

function withValidPercussionValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    percussionValidation: {
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

function withValidPhraseIntentValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    phraseIntentValidation: {
      isValidForMidiExport: true,
      messages: [],
    },
  };
}

function withValidHarmonicAlignmentValidation(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    harmonicAlignmentValidation: {
      isValidForMidiExport: true,
      messages: [],
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
