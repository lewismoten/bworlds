import {
  resolveProceduralChordAtStep,
  resolveProceduralCompositionStep,
  type ProceduralChord,
  type ProceduralCompositionStep,
  type ProceduralHarmonyTheme,
} from './procedural-music-harmony.ts';
import {
  resolveProceduralRhythmicGridStep,
  type ProceduralRhythmicGridTheme,
  type ProceduralRhythmicGridStep,
} from './procedural-music-rhythm-grid.ts';

export type ProceduralTrackContextTheme = ProceduralHarmonyTheme &
  ProceduralRhythmicGridTheme;

export type ProceduralTrackContext = {
  composition: ProceduralCompositionStep;
  harmonicState: {
    chord: ProceduralChord;
    previousChord: ProceduralChord | null;
    chordChange: boolean;
  };
  phraseState: {
    phraseStep: number;
    cadence: ProceduralCompositionStep['cadence'];
  };
  motifState: {
    motifDegreeOffset: number;
    contourStep: ProceduralCompositionStep['contourStep'];
  };
  rhythmicGrid: ProceduralRhythmicGridStep;
};

export function resolveProceduralTrackContext(options: {
  theme: ProceduralTrackContextTheme;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  tempoMultiplier: number;
  allowLeadAccidentals?: boolean;
}): ProceduralTrackContext {
  const composition = resolveProceduralCompositionStep(
    options.theme,
    options.stepIndex,
    options.clusterX,
    options.clusterY,
    options.allowLeadAccidentals
  );
  const previousChord =
    options.stepIndex > 0
      ? resolveProceduralChordAtStep(
          options.theme,
          options.stepIndex - 1,
          options.clusterX,
          options.clusterY
        )
      : null;
  const rhythmicGrid = resolveProceduralRhythmicGridStep({
    theme: options.theme,
    stepIndex: options.stepIndex,
    tempoMultiplier: options.tempoMultiplier,
  });

  return {
    composition,
    harmonicState: {
      chord: composition.chord,
      previousChord,
      chordChange:
        previousChord === null ||
        previousChord.progressionIndex !== composition.chord.progressionIndex,
    },
    phraseState: {
      phraseStep: composition.phraseStep,
      cadence: composition.cadence,
    },
    motifState: {
      motifDegreeOffset: composition.motifDegreeOffset,
      contourStep: composition.contourStep,
    },
    rhythmicGrid,
  };
}
