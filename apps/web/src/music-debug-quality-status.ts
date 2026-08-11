import type { MusicDebugSnapshot } from './music-debug.ts';
import { collectMusicDebugPatchQualityWarnings } from './music-debug-patch-quality.ts';

export type MusicDebugQualityStatus = {
  isGood: boolean;
  statusLabel: 'good' | 'blocked';
  blockingReasons: string[];
  warningReasons: string[];
};

export function createMusicDebugQualityStatus(
  snapshot: Pick<
    MusicDebugSnapshot,
    | 'midiExportValidation'
    | 'motifValidation'
    | 'timingValidation'
    | 'cadenceValidation'
    | 'percussionValidation'
    | 'songDnaValidation'
    | 'phraseIntentValidation'
    | 'harmonicAlignmentValidation'
    | 'leadContourAnalysis'
    | 'midiAudit'
    | 'instrumentBank'
  >
): MusicDebugQualityStatus {
  const blockingReasons = [
    ...snapshot.midiExportValidation.messages,
    ...snapshot.motifValidation.messages,
    ...snapshot.timingValidation.messages,
    ...snapshot.cadenceValidation.messages,
    ...snapshot.songDnaValidation.messages,
    ...snapshot.phraseIntentValidation.messages,
    ...snapshot.harmonicAlignmentValidation.messages,
    ...snapshot.midiAudit.mismatchMessages,
    ...snapshot.midiAudit.criticalWarningMessages,
  ];

  if (!snapshot.leadContourAnalysis.finalResolvesToTonic) {
    blockingReasons.push(
      ...snapshot.leadContourAnalysis.messages.filter((message) =>
        message.includes('resolved to scale degree')
      )
    );
  }
  if (!snapshot.leadContourAnalysis.climaxNearPlannedPeak) {
    blockingReasons.push(
      ...snapshot.leadContourAnalysis.messages.filter((message) =>
        message.includes('climax peaked at')
      )
    );
  }

  return {
    isGood: blockingReasons.length === 0,
    statusLabel: blockingReasons.length === 0 ? 'good' : 'blocked',
    blockingReasons: [...new Set(blockingReasons)],
    warningReasons: [
      ...new Set([
        ...collectMusicDebugPatchQualityWarnings(snapshot.instrumentBank).map(
          (warning) => warning.message
        ),
        ...snapshot.percussionValidation.messages,
        ...snapshot.midiAudit.warningMessages,
      ]),
    ],
  };
}
