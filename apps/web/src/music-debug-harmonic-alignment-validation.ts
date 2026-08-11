import type { MusicDebugBassProgressionDetection } from './music-debug-section-analysis.ts';
import type { MusicDebugChordToneScores } from './music-debug-chord-tone-score.ts';

const MIN_HARMONY_MEASURE_CHORD_TONE_SCORE = 0.5;

export type MusicDebugHarmonicAlignmentValidation = {
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugHarmonicAlignment(options: {
  chordToneScores: MusicDebugChordToneScores;
  bassProgressionDetections: readonly MusicDebugBassProgressionDetection[];
}): MusicDebugHarmonicAlignmentValidation {
  const messages: string[] = [];

  for (const measure of options.chordToneScores.measures) {
    const harmony = measure.roles.harmony;
    if (
      harmony.score !== null &&
      harmony.noteCount > 0 &&
      harmony.score < MIN_HARMONY_MEASURE_CHORD_TONE_SCORE
    ) {
      messages.push(
        `Harmony chord-tone score fell to ${formatPercent(harmony.score)} at measure ${measure.measureNumber} against planned chord ${measure.plannedLabel}.`
      );
    }
  }

  for (const detection of options.bassProgressionDetections) {
    for (const window of detection.driftWindows) {
      messages.push(
        `Bass root drifted at ${formatMeasureLabel(window.startMeasure, window.endMeasure)} (${window.detectedLabel ?? 'missing'} vs ${window.plannedLabel}).`
      );
    }
  }

  return {
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMeasureLabel(startMeasure: number, endMeasure: number): string {
  return startMeasure === endMeasure
    ? `measure ${startMeasure}`
    : `measures ${startMeasure}-${endMeasure}`;
}
