import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { MusicRegionThemeId } from './procedural-music-vocabulary.ts';

export type ProceduralLeadRhythmAttackTemplate = {
  subdivisionStep: number;
  subdivisionLength: number;
  offsetRatio: number;
  durationRatio: number;
  volumeMultiplier: number;
};

export type ProceduralLeadRhythmMeasureTemplate = {
  attacks: readonly ProceduralLeadRhythmAttackTemplate[];
  tailRestSubdivisionCount: number;
};

export type ProceduralLeadRhythmPhraseTemplate = {
  measures: readonly ProceduralLeadRhythmMeasureTemplate[];
};

const LEAD_RHYTHM_TEMPLATE_SEED = registerHashLabel(
  'music-lead-rhythm-template'
);

export const PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT = 16;

const LEAD_MEASURE_PATTERNS: readonly ProceduralLeadRhythmMeasureTemplate[] = [
  {
    attacks: [
      createAttackTemplate(4, 5, 0.86),
      createAttackTemplate(9, 4, 0.76),
    ],
    tailRestSubdivisionCount: 0,
  },
  {
    attacks: [
      createAttackTemplate(3, 4, 0.9),
      createAttackTemplate(7, 3, 0.78),
      createAttackTemplate(11, 3, 0.7),
    ],
    tailRestSubdivisionCount: 0,
  },
  {
    attacks: [
      createAttackTemplate(4, 5, 0.84),
      createAttackTemplate(11, 3, 0.74),
    ],
    tailRestSubdivisionCount: 0,
  },
  {
    attacks: [
      createAttackTemplate(2, 4, 0.88),
      createAttackTemplate(7, 3, 0.76),
      createAttackTemplate(11, 3, 0.72),
    ],
    tailRestSubdivisionCount: 0,
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
    const pattern =
      LEAD_MEASURE_PATTERNS[patternIndex] ?? LEAD_MEASURE_PATTERNS[0]!;
    measures.push({
      ...pattern,
      tailRestSubdivisionCount: isPhraseEndingMeasure(measureIndex) ? 4 : 0,
    });
  }

  return { measures };
}

function createAttackTemplate(
  subdivisionStep: number,
  subdivisionLength: number,
  volumeMultiplier: number
): ProceduralLeadRhythmAttackTemplate {
  return {
    subdivisionStep,
    subdivisionLength,
    offsetRatio: subdivisionStep / PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT,
    durationRatio: subdivisionLength / PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT,
    volumeMultiplier,
  };
}

function isPhraseEndingMeasure(measureIndex: number): boolean {
  const normalizedMeasureIndex = measureIndex + 1;
  return normalizedMeasureIndex % 4 === 0;
}
