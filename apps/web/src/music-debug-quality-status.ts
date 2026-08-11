import type { MusicDebugSnapshot } from './music-debug.ts';

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
    | 'harmonicAlignmentValidation'
    | 'leadContourAnalysis'
    | 'midiAudit'
  >
): MusicDebugQualityStatus {
  const blockingReasons = [
    ...snapshot.midiExportValidation.messages,
    ...snapshot.motifValidation.messages,
    ...snapshot.timingValidation.messages,
    ...snapshot.cadenceValidation.messages,
    ...snapshot.songDnaValidation.messages,
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
        ...snapshot.percussionValidation.messages,
        ...snapshot.midiAudit.warningMessages,
      ]),
    ],
  };
}
