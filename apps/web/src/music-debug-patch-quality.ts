import type { KnownGoodInstrumentPatchComparison } from './music-instrument-timbres.ts';
import type {
  ProceduralInstrument,
  ProceduralInstrumentBank,
} from './procedural-music-sound-bank.ts';

export const MUSIC_DEBUG_PATCH_QUALITY_WARNING_MIN_SIMILARITY = 0.75;
export const MUSIC_DEBUG_PATCH_QUALITY_FAILURE_MIN_SIMILARITY = 0.6;

export type MusicDebugPatchQualityTone = 'pass' | 'warning' | 'failure';

export type MusicDebugPatchQualityWarning = {
  role: keyof ProceduralInstrumentBank['instruments'];
  severity: Exclude<MusicDebugPatchQualityTone, 'pass'>;
  message: string;
};

export function resolveMusicDebugPatchQualityTone(
  comparison: KnownGoodInstrumentPatchComparison
): MusicDebugPatchQualityTone {
  if (
    !comparison.familyMatches ||
    comparison.similarityScore <
      MUSIC_DEBUG_PATCH_QUALITY_FAILURE_MIN_SIMILARITY
  ) {
    return 'failure';
  }
  if (
    !comparison.waveformMatches ||
    comparison.similarityScore <
      MUSIC_DEBUG_PATCH_QUALITY_WARNING_MIN_SIMILARITY
  ) {
    return 'warning';
  }
  return 'pass';
}

export function collectMusicDebugPatchQualityWarnings(
  instrumentBank: Pick<ProceduralInstrumentBank, 'instruments'>
): MusicDebugPatchQualityWarning[] {
  return Object.entries(instrumentBank.instruments).flatMap(
    ([role, instrument]) =>
      buildMusicDebugPatchQualityWarning(
        role as keyof ProceduralInstrumentBank['instruments'],
        instrument
      )
  );
}

function buildMusicDebugPatchQualityWarning(
  role: keyof ProceduralInstrumentBank['instruments'],
  instrument: ProceduralInstrument
): MusicDebugPatchQualityWarning[] {
  const comparison = instrument.knownGoodPatchComparison;
  const tone = resolveMusicDebugPatchQualityTone(comparison);
  if (tone === 'pass') {
    return [];
  }

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const similarityPercent = Math.round(comparison.similarityScore * 100);
  const mismatchSummary = [
    !comparison.familyMatches ? 'family differs from the reference patch' : '',
    !comparison.waveformMatches
      ? 'waveform differs from the reference patch'
      : '',
  ].filter((value) => value.length > 0);
  const differenceSummary = comparison.prominentDifferences
    .slice(0, 3)
    .map((difference) => formatPatchQualityDimensionLabel(difference.key))
    .join(', ');
  const message =
    tone === 'failure'
      ? `${roleLabel} patch sounds unlike its target reference (${similarityPercent}% match to ${comparison.referenceLabel}).`
      : `${roleLabel} patch is drifting from its target reference (${similarityPercent}% match to ${comparison.referenceLabel}).`;

  return [
    {
      role,
      severity: tone,
      message: [
        message,
        mismatchSummary.length > 0 ? `${mismatchSummary.join('; ')}.` : '',
        differenceSummary.length > 0
          ? `Largest differences: ${differenceSummary}.`
          : '',
      ]
        .filter((value) => value.length > 0)
        .join(' '),
    },
  ];
}

function formatPatchQualityDimensionLabel(key: string): string {
  switch (key) {
    case 'attackMs':
      return 'attack';
    case 'releaseMs':
      return 'release';
    case 'detuneCents':
      return 'detune';
    case 'harmonicGain':
      return 'harmonics';
    case 'pulseRate':
      return 'pulse';
    case 'brightness':
      return 'brightness';
    case 'timbre.filterCutoffHz':
      return 'filter cutoff';
    case 'timbre.filterQ':
      return 'filter Q';
    case 'timbre.noiseMix':
      return 'noise mix';
    case 'timbre.transientMix':
      return 'transient mix';
    case 'timbre.harmonicRatio':
      return 'harmonic ratio';
    default:
      return key
        .replace(/^timbre\./, '')
        .replace(/[A-Z]/g, (char) => ` ${char.toLowerCase()}`);
  }
}
