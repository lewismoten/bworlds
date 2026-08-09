import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { ProceduralMusicNote } from './procedural-music.ts';

export type MusicEqStage = {
  type: BiquadFilterType;
  frequencyHz: number;
  q: number;
};

const MUSIC_STEREO_BIAS_SEED = registerHashLabel('music-stereo-bias');

export function resolveMusicStereoPan(
  note: Pick<ProceduralMusicNote, 'role' | 'instrumentId'>,
  spatialPan = 0
): number {
  const bias = resolveRolePanBias(note);

  if (note.role === 'bass') {
    return clampPan(spatialPan * 0.3 + bias * 0.1, 0.16);
  }

  const roleWidth =
    note.role === 'lead' ? 0.65 : note.role === 'harmony' ? 0.8 : 0.72;
  return clampPan(spatialPan * 0.75 + bias, roleWidth);
}

export function resolveMusicEqStages(
  note: Pick<ProceduralMusicNote, 'role' | 'frequency' | 'instrumentId'>
): MusicEqStage[] {
  if (note.role === 'bass') {
    return [
      {
        type: 'lowpass',
        frequencyHz: Math.max(240, note.frequency * 1.6),
        q: 0.82,
      },
    ];
  }

  if (note.role === 'lead') {
    return [
      {
        type: 'highpass',
        frequencyHz: Math.max(180, note.frequency * 0.58),
        q: 0.74,
      },
      {
        type: 'lowpass',
        frequencyHz: Math.max(1_800, note.frequency * 5.2),
        q: 0.7,
      },
    ];
  }

  if (note.role === 'harmony') {
    const harmonyBandOffset = resolveHarmonyBandOffset(note.instrumentId);
    const highpassMultiplier = harmonyBandOffset < 0 ? 0.36 : 0.48;
    const lowpassMultiplier = harmonyBandOffset < 0 ? 4.4 : 3.2;
    return [
      {
        type: 'highpass',
        frequencyHz: Math.max(160, note.frequency * highpassMultiplier),
        q: 0.72,
      },
      {
        type: 'lowpass',
        frequencyHz: Math.max(1_200, note.frequency * lowpassMultiplier),
        q: 0.76,
      },
    ];
  }

  return [
    {
      type: 'highpass',
      frequencyHz: Math.max(260, note.frequency * 0.9),
      q: 0.64,
    },
  ];
}

function resolveRolePanBias(
  note: Pick<ProceduralMusicNote, 'role' | 'instrumentId'>
): number {
  const numericBiasSeed = resolveInstrumentNumericBiasSeed(note.instrumentId);
  const signal = hash2DWithSeed(
    MUSIC_STEREO_BIAS_SEED,
    numericBiasSeed,
    note.role.length * 31
  );
  const sign = signal >= 0.5 ? 1 : -1;

  switch (note.role) {
    case 'lead':
      return sign * 0.24;
    case 'harmony':
      return sign * 0.34;
    case 'percussion':
      return sign * 0.18;
    case 'bass':
    default:
      return sign * 0.04;
  }
}

function resolveHarmonyBandOffset(instrumentId: string): number {
  const parsed = parseInstrumentId(instrumentId);
  if (!parsed) {
    return 0;
  }

  const signal = hash2DWithSeed(
    MUSIC_STEREO_BIAS_SEED,
    parsed.clusterX * 19 + parsed.themeWeight,
    parsed.clusterY * 23 + parsed.roleWeight
  );
  return signal >= 0.5 ? 1 : -1;
}

function resolveInstrumentNumericBiasSeed(instrumentId: string): number {
  const parsed = parseInstrumentId(instrumentId);
  if (!parsed) {
    return instrumentId.length * 17;
  }

  return (
    parsed.themeWeight * 7 +
    parsed.roleWeight * 13 +
    parsed.clusterX * 17 +
    parsed.clusterY * 19
  );
}

function parseInstrumentId(instrumentId: string): {
  themeWeight: number;
  roleWeight: number;
  clusterX: number;
  clusterY: number;
} | null {
  const [themeId = '', role = '', clusterXLabel = '', clusterYLabel = ''] =
    instrumentId.split(':');
  const clusterX = Number.parseInt(clusterXLabel, 10);
  const clusterY = Number.parseInt(clusterYLabel, 10);

  if (!Number.isFinite(clusterX) || !Number.isFinite(clusterY)) {
    return null;
  }

  return {
    themeWeight: themeId.length,
    roleWeight: role.length,
    clusterX,
    clusterY,
  };
}

function clampPan(value: number, maxAbsPan: number): number {
  return Math.max(-maxAbsPan, Math.min(maxAbsPan, value));
}
