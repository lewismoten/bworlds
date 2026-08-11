import type { MusicDebugPhraseIntentScore } from './music-debug-phrase-intent-score.ts';

const MIN_PHRASE_INTENT_OVERALL_SCORE = 0.6;
const MIN_PHRASE_INTENT_MOTIF_SCORE = 0.55;
const MIN_PHRASE_INTENT_CONTOUR_SCORE = 0.6;
const MIN_PHRASE_INTENT_CADENCE_SCORE = 0.5;

export type MusicDebugPhraseIntentValidation = {
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugPhraseIntent(
  score: MusicDebugPhraseIntentScore
): MusicDebugPhraseIntentValidation {
  const messages: string[] = [];

  if (score.overallScore < MIN_PHRASE_INTENT_OVERALL_SCORE) {
    messages.push(
      `Phrase-intent score ${formatIntentPercent(score.overallScore)} stayed below the export minimum ${formatIntentPercent(MIN_PHRASE_INTENT_OVERALL_SCORE)}.`
    );
  }
  if (score.motif.score < MIN_PHRASE_INTENT_MOTIF_SCORE) {
    messages.push(
      `Phrase-intent motif score ${formatIntentPercent(score.motif.score)} stayed below the export minimum ${formatIntentPercent(MIN_PHRASE_INTENT_MOTIF_SCORE)} (${score.motif.summary}).`
    );
  }
  if (score.contour.score < MIN_PHRASE_INTENT_CONTOUR_SCORE) {
    messages.push(
      `Phrase-intent contour score ${formatIntentPercent(score.contour.score)} stayed below the export minimum ${formatIntentPercent(MIN_PHRASE_INTENT_CONTOUR_SCORE)} (${score.contour.summary}).`
    );
  }
  if (score.cadence.score < MIN_PHRASE_INTENT_CADENCE_SCORE) {
    messages.push(
      `Phrase-intent cadence score ${formatIntentPercent(score.cadence.score)} stayed below the export minimum ${formatIntentPercent(MIN_PHRASE_INTENT_CADENCE_SCORE)} (${score.cadence.summary}).`
    );
  }

  return {
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

function formatIntentPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
