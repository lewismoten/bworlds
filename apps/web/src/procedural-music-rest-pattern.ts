import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { MusicRegionThemeId } from './procedural-music-vocabulary.ts';

const PHRASE_REST_SEED = registerHashLabel('music-phrase-rest-pattern');

export function shouldUsePhraseBoundaryRest(options: {
  themeId: MusicRegionThemeId;
  role: 'lead' | 'harmony';
  phraseStep: number;
  phraseLength: number;
  clusterX: number;
  clusterY: number;
}): boolean {
  const phraseLength = Math.max(1, options.phraseLength);
  const normalizedPhraseStep =
    ((options.phraseStep % phraseLength) + phraseLength) % phraseLength;

  if (!isPhraseBoundaryWindow(normalizedPhraseStep, phraseLength)) {
    return false;
  }

  const restChance = options.role === 'lead' ? 0.24 : 0.16;
  const signal = hash2DWithSeed(
    PHRASE_REST_SEED,
    options.clusterX + options.themeId.length * 19 + normalizedPhraseStep,
    options.clusterY - options.themeId.length * 23
  );
  return signal > 1 - restChance;
}

export function isPhraseBoundaryWindow(
  phraseStep: number,
  phraseLength: number
): boolean {
  const normalizedPhraseLength = Math.max(1, phraseLength);
  const finalApproachStart = Math.max(1, normalizedPhraseLength - 2);

  return phraseStep === 1 || phraseStep >= finalApproachStart;
}
