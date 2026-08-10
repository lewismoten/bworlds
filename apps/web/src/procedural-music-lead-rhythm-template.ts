import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { MusicRegionThemeId } from './procedural-music-vocabulary.ts';

export type ProceduralLeadRhythmAttackTemplate = {
  offsetRatio: number;
  durationRatio: number;
  volumeMultiplier: number;
};

export type ProceduralLeadRhythmMeasureTemplate = {
  attacks: readonly ProceduralLeadRhythmAttackTemplate[];
};

export type ProceduralLeadRhythmPhraseTemplate = {
  measures: readonly ProceduralLeadRhythmMeasureTemplate[];
};

const LEAD_RHYTHM_TEMPLATE_SEED = registerHashLabel(
  'music-lead-rhythm-template'
);

const LEAD_MEASURE_PATTERNS: readonly ProceduralLeadRhythmMeasureTemplate[] = [
  {
    attacks: [
      { offsetRatio: 0.24, durationRatio: 0.28, volumeMultiplier: 0.86 },
      { offsetRatio: 0.58, durationRatio: 0.24, volumeMultiplier: 0.76 },
    ],
  },
  {
    attacks: [
      { offsetRatio: 0.18, durationRatio: 0.24, volumeMultiplier: 0.9 },
      { offsetRatio: 0.46, durationRatio: 0.2, volumeMultiplier: 0.78 },
      { offsetRatio: 0.74, durationRatio: 0.18, volumeMultiplier: 0.7 },
    ],
  },
  {
    attacks: [
      { offsetRatio: 0.28, durationRatio: 0.26, volumeMultiplier: 0.84 },
      { offsetRatio: 0.7, durationRatio: 0.2, volumeMultiplier: 0.74 },
    ],
  },
  {
    attacks: [
      { offsetRatio: 0.16, durationRatio: 0.22, volumeMultiplier: 0.88 },
      { offsetRatio: 0.42, durationRatio: 0.18, volumeMultiplier: 0.76 },
      { offsetRatio: 0.68, durationRatio: 0.18, volumeMultiplier: 0.72 },
    ],
  },
] as const;

const LEAD_PHRASE_PATTERNS: readonly ReadonlyArray<readonly number[]> = [
  [0, 1, 0, 2, 1, 0, 1, 2],
  [1, 0, 2, 0, 1, 2, 0, 3],
  [0, 2, 1, 0, 2, 1, 3, 0],
  [1, 3, 0, 2, 1, 0, 2, 1],
  [2, 0, 1, 3, 0, 1, 2, 0],
  [3, 1, 0, 2, 0, 1, 3, 0],
] as const;

export function resolveProceduralLeadRhythmPhraseTemplate(options: {
  themeId: MusicRegionThemeId;
  clusterX: number;
  clusterY: number;
  measureCount?: number;
}): ProceduralLeadRhythmPhraseTemplate {
  const measureCount = Math.max(1, options.measureCount ?? 8);
  const phrasePattern =
    LEAD_PHRASE_PATTERNS[
      Math.floor(
        hash2DWithSeed(
          LEAD_RHYTHM_TEMPLATE_SEED,
          options.clusterX + options.themeId.length * 13,
          options.clusterY - options.themeId.length * 17
        ) * LEAD_PHRASE_PATTERNS.length
      )
    ] ?? LEAD_PHRASE_PATTERNS[0]!;
  const measures: ProceduralLeadRhythmMeasureTemplate[] = [];

  for (let measureIndex = 0; measureIndex < measureCount; measureIndex += 1) {
    const patternIndex =
      phrasePattern[measureIndex % phrasePattern.length] ?? phrasePattern[0]!;
    measures.push(
      LEAD_MEASURE_PATTERNS[patternIndex] ?? LEAD_MEASURE_PATTERNS[0]!
    );
  }

  return { measures };
}
