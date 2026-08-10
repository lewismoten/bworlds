import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import {
  resolveProceduralInstrumentTimbre,
  resolveVelocityShapedInstrumentTimbre,
} from './music-instrument-timbres.ts';
import type { ProceduralLeadPhraseCadence } from './procedural-music-harmony.ts';
import {
  resolveProceduralNoteFrequency,
  resolveProceduralNoteVelocity,
} from './procedural-music-note-shaping.ts';
import {
  applyPercussionVoiceToTimbre,
  isPercussionFamily,
  resolvePercussionVoice,
  resolvePercussionVoiceById,
  type PercussionFamily,
  type PercussionVoiceId,
} from './procedural-music-percussion-voices.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { MusicSpaceProfile } from './procedural-music-space.ts';
import type { MusicRegionThemeId } from './procedural-music-vocabulary.ts';

type ProceduralPercussionHit = {
  grooveRole: ProceduralPercussionGrooveRole;
  semitones: number;
  offsetRatio: number;
  durationRatio: number;
  volumeMultiplier: number;
  pulseRateMultiplier: number;
  attackMultiplier: number;
  releaseMultiplier: number;
  harmonicGainMultiplier: number;
  brightnessMultiplier: number;
};

type ProceduralPercussionPattern = readonly ProceduralPercussionHit[];
export type ProceduralPercussionGrooveRole =
  'kick' | 'accent' | 'pulse' | 'texture';

const PERCUSSION_PATTERN_SEED = registerHashLabel('music-percussion-pattern');
const PERCUSSION_TIMBRE_SEED = registerHashLabel('music-percussion-timbre');
const PROCEDURAL_PERCUSSION_MEASURE_CYCLE_LENGTH = 2;

const FOREST_PULSE_PATTERNS: readonly ProceduralPercussionPattern[] = [
  [
    createHit('kick', -12, 0, 0.18, 0.54, 0.84, {
      attackMultiplier: 0.76,
      releaseMultiplier: 1.28,
      harmonicGainMultiplier: 0.84,
    }),
    createHit('pulse', 0, 0.18, 0.14, 0.4, 1.16),
    createHit('texture', -3, 0.42, 0.18, 0.5, 0.96),
    createHit('pulse', 0, 0.7, 0.14, 0.42, 1.2),
  ],
  [
    createHit('kick', -12, 0, 0.16, 0.52, 0.82, {
      attackMultiplier: 0.78,
      releaseMultiplier: 1.24,
      harmonicGainMultiplier: 0.86,
    }),
    createHit('pulse', 0, 0.24, 0.12, 0.34, 1.2),
    createHit('pulse', 0, 0.52, 0.12, 0.3, 1.26),
    createHit('texture', -3, 0.74, 0.16, 0.46, 0.94),
  ],
  [
    createHit('kick', -12, 0, 0.16, 0.5, 0.84, {
      attackMultiplier: 0.8,
      releaseMultiplier: 1.22,
      harmonicGainMultiplier: 0.88,
    }),
    createHit('texture', -5, 0.3, 0.18, 0.46, 0.92),
    createHit('pulse', 0, 0.56, 0.12, 0.34, 1.24),
    createHit('pulse', 0, 0.8, 0.12, 0.3, 1.18),
  ],
] as const;

const FOREST_CADENCE_PATTERNS: Record<
  ProceduralLeadPhraseCadence,
  ProceduralPercussionPattern
> = {
  neutral: [
    createHit('pulse', 0, 0, 0.18, 0.46, 1.18),
    createHit('texture', -3, 0.38, 0.18, 0.54, 0.96),
    createHit('pulse', 0, 0.72, 0.14, 0.4, 1.24),
  ],
  question: [
    createHit('kick', -12, 0, 0.18, 0.5, 0.84, {
      attackMultiplier: 0.76,
      releaseMultiplier: 1.28,
      harmonicGainMultiplier: 0.84,
    }),
    createHit('pulse', 0, 0.22, 0.14, 0.34, 1.18),
    createHit('texture', -3, 0.46, 0.18, 0.48, 0.94),
    createHit('accent', 7, 0.74, 0.18, 0.24, 1.05, {
      releaseMultiplier: 1.5,
      brightnessMultiplier: 1.18,
    }),
  ],
  answer: [
    createHit('kick', -12, 0, 0.2, 0.58, 0.86, {
      attackMultiplier: 0.72,
      releaseMultiplier: 1.35,
      harmonicGainMultiplier: 0.82,
    }),
    createHit('texture', -5, 0.32, 0.18, 0.5, 0.94),
    createHit('pulse', 0, 0.64, 0.14, 0.4, 1.18),
    createHit('accent', 7, 0.82, 0.16, 0.2, 1.02, {
      releaseMultiplier: 1.6,
      brightnessMultiplier: 1.24,
    }),
  ],
};

const TOWN_PULSE_PATTERNS: readonly ProceduralPercussionPattern[] = [
  [
    createHit('kick', -12, 0, 0.34, 0.58, 0.82),
    createHit('accent', -1, 0.5, 0.18, 0.5, 1.02),
  ],
  [
    createHit('kick', -12, 0, 0.34, 0.56, 0.84),
    createHit('pulse', 0, 0.26, 0.12, 0.42, 1.1),
    createHit('accent', -1, 0.5, 0.18, 0.48, 1.04),
  ],
] as const;

const TOWN_FILL_PATTERNS: Record<
  ProceduralLeadPhraseCadence,
  ProceduralPercussionPattern
> = {
  neutral: TOWN_PULSE_PATTERNS[0]!,
  question: [
    createHit('kick', -12, 0, 0.28, 0.56, 0.84),
    createHit('pulse', 0, 0.22, 0.12, 0.36, 1.14),
    createHit('accent', -1, 0.5, 0.18, 0.54, 1.08),
    createHit('texture', -3, 0.76, 0.14, 0.34, 1.02, {
      releaseMultiplier: 1.12,
    }),
  ],
  answer: [
    createHit('kick', -12, 0, 0.3, 0.6, 0.86, {
      attackMultiplier: 0.88,
      releaseMultiplier: 1.16,
    }),
    createHit('pulse', 0, 0.24, 0.12, 0.34, 1.12),
    createHit('accent', -1, 0.5, 0.18, 0.58, 1.1),
    createHit('texture', -5, 0.72, 0.16, 0.38, 1.04),
    createHit('accent', 7, 0.86, 0.16, 0.2, 1.06, {
      releaseMultiplier: 1.4,
      brightnessMultiplier: 1.16,
    }),
  ],
};

const GENERIC_PULSE_PATTERNS: readonly ProceduralPercussionPattern[] = [
  [
    createHit('kick', -12, 0, 0.2, 0.58, 0.86),
    createHit('texture', -2, 0.34, 0.16, 0.42, 1),
    createHit('pulse', 0, 0.68, 0.12, 0.3, 1.14),
  ],
  [
    createHit('texture', -3, 0.22, 0.18, 0.48, 0.96),
    createHit('pulse', 0, 0.3, 0.12, 0.3, 1.16),
    createHit('accent', -1, 0.62, 0.16, 0.46, 1.04),
  ],
] as const;

const GENERIC_FILL_PATTERNS: Record<
  ProceduralLeadPhraseCadence,
  ProceduralPercussionPattern
> = {
  neutral: GENERIC_PULSE_PATTERNS[0]!,
  question: [
    createHit('kick', -12, 0, 0.22, 0.58, 0.88),
    createHit('texture', -2, 0.28, 0.14, 0.4, 1.02),
    createHit('accent', -1, 0.54, 0.16, 0.48, 1.06),
    createHit('pulse', 0, 0.8, 0.12, 0.3, 1.18),
  ],
  answer: [
    createHit('kick', -12, 0, 0.24, 0.62, 0.9),
    createHit('texture', -3, 0.3, 0.16, 0.42, 1.04),
    createHit('accent', -1, 0.56, 0.16, 0.5, 1.08),
    createHit('pulse', 0, 0.76, 0.12, 0.32, 1.18),
    createHit('accent', 7, 0.88, 0.14, 0.18, 1.08, {
      releaseMultiplier: 1.42,
      brightnessMultiplier: 1.18,
    }),
  ],
};

export function createProceduralPercussionNotes(options: {
  themeId: MusicRegionThemeId;
  stepIndex: number;
  phraseStep: number;
  cadence: ProceduralLeadPhraseCadence;
  chordChange?: boolean;
  startMs: number;
  stepDurationMs: number;
  rootMidiNote: number;
  baseInstrumentId: string;
  baseVolume: number;
  baseAttackMs: number;
  baseReleaseMs: number;
  baseDetuneCents: number;
  baseHarmonicGain: number;
  basePulseRate: number;
  brightness: number;
  clusterX: number;
  clusterY: number;
  space?: MusicSpaceProfile;
  emitter?: { x: number; y: number };
  listener?: { x: number; y: number };
}): ProceduralMusicNote[] {
  const pattern = alignPercussionHitsToChordChange(
    resolveProceduralPercussionPattern(options),
    options.chordChange === true
  );
  const durationScale = resolvePercussionDurationScale(options.themeId);
  const notes: ProceduralMusicNote[] = [];

  for (let index = 0; index < pattern.length; index += 1) {
    const hit = pattern[index]!;
    const family = resolvePercussionFamilyForGrooveRole({
      themeId: options.themeId,
      cadence: options.cadence,
      grooveRole: hit.grooveRole,
      offsetRatio: hit.offsetRatio,
    });
    const voice = resolvePercussionVoice({
      family,
      noteIndex: index,
    });
    const harmonicSignal = hash2DWithSeed(
      PERCUSSION_TIMBRE_SEED,
      options.clusterX + options.stepIndex * 17 + index * 31,
      options.clusterY + family.length * 19
    );
    const filterSignal = hash2DWithSeed(
      PERCUSSION_TIMBRE_SEED,
      options.clusterX + hit.semitones * 7 + index * 13,
      options.clusterY + options.phraseStep * 23
    );
    const timbre = resolveProceduralInstrumentTimbre({
      family,
      brightness:
        options.brightness *
        hit.brightnessMultiplier *
        voice.brightnessMultiplier,
      harmonicSignal,
      filterSignal,
    });
    const voiceTimbre = applyPercussionVoiceToTimbre({
      voice,
      timbre,
    });
    const volume = options.baseVolume * hit.volumeMultiplier;
    const velocity = resolveProceduralNoteVelocity({
      volume,
      role: 'percussion',
    });
    notes.push({
      themeId: options.themeId,
      instrumentId: `${options.baseInstrumentId}:perc-${voice.id}:${index}`,
      role: 'percussion',
      startMs: Math.round(
        options.startMs + options.stepDurationMs * hit.offsetRatio
      ),
      durationMs: Math.max(
        42,
        Math.round(options.stepDurationMs * hit.durationRatio * durationScale)
      ),
      frequency: resolveProceduralNoteFrequency({
        rootMidiNote: options.rootMidiNote,
        semitones: hit.semitones + voice.pitchSemitoneOffset,
        role: 'percussion',
      }),
      volume,
      velocity,
      waveform: voice.waveform,
      timbre: resolveVelocityShapedInstrumentTimbre({
        timbre: voiceTimbre,
        velocity,
      }),
      attackMs: Math.max(
        4,
        options.baseAttackMs * hit.attackMultiplier * voice.attackMultiplier
      ),
      releaseMs: Math.max(
        18,
        options.baseReleaseMs * hit.releaseMultiplier * voice.releaseMultiplier
      ),
      detuneCents:
        options.baseDetuneCents *
        (family === 'kick' ? 0.5 : family === 'cymbals' ? 1.3 : 1) *
        voice.detuneMultiplier,
      harmonicGain:
        options.baseHarmonicGain *
        hit.harmonicGainMultiplier *
        voice.harmonicGainMultiplier,
      pulseRate:
        options.basePulseRate *
        hit.pulseRateMultiplier *
        voice.pulseRateMultiplier,
      space: options.space,
      emitter: options.emitter,
      listener: options.listener,
    });
    notes[notes.length - 1]!.instrumentId =
      `${notes[notes.length - 1]!.instrumentId}:groove-${hit.grooveRole}`;
  }

  return notes;
}

function alignPercussionHitsToChordChange(
  pattern: ProceduralPercussionPattern,
  chordChange: boolean
): ProceduralPercussionPattern {
  if (!chordChange) {
    return pattern;
  }

  const alignedHits = pattern.map((hit) => ({ ...hit }));
  const downbeatKickIndex = alignedHits.findIndex(
    (hit) => hit.family === 'kick' && hit.offsetRatio <= 0.08
  );

  if (downbeatKickIndex >= 0) {
    const kick = alignedHits[downbeatKickIndex]!;
    alignedHits[downbeatKickIndex] = {
      ...kick,
      volumeMultiplier: kick.volumeMultiplier * 1.18,
      attackMultiplier: Math.max(0.72, kick.attackMultiplier * 0.92),
      releaseMultiplier: kick.releaseMultiplier * 1.08,
      harmonicGainMultiplier: kick.harmonicGainMultiplier * 1.06,
    };
    return alignedHits;
  }

  return [
    createHit('kick', -12, 0, 0.18, 0.68, 0.92, {
      attackMultiplier: 0.8,
      releaseMultiplier: 1.16,
      harmonicGainMultiplier: 0.9,
    }),
    ...alignedHits,
  ];
}

export function resolvePercussionFamilyFromInstrumentId(
  instrumentId: string
): PercussionFamily | null {
  const voiceId = resolvePercussionVoiceIdFromInstrumentId(instrumentId);
  if (!voiceId) {
    if (instrumentId.includes(':perc-kick:')) {
      return 'kick';
    }
    if (instrumentId.includes(':perc-snare:')) {
      return 'snare';
    }
    if (instrumentId.includes(':perc-cymbals:')) {
      return 'cymbals';
    }
    if (instrumentId.includes(':perc-shaker:')) {
      return 'shaker';
    }
    if (instrumentId.includes(':perc-hand-percussion:')) {
      return 'hand-percussion';
    }
    return null;
  }
  if (voiceId.startsWith('kick-')) {
    return 'kick';
  }
  if (voiceId.startsWith('snare-')) {
    return 'snare';
  }
  if (voiceId.startsWith('cymbals-')) {
    return 'cymbals';
  }
  if (voiceId.startsWith('shaker-')) {
    return 'shaker';
  }
  if (voiceId.startsWith('hand-percussion-')) {
    return 'hand-percussion';
  }
  return null;
}

export function resolvePercussionVoiceIdFromInstrumentId(
  instrumentId: string
): PercussionVoiceId | null {
  const match = instrumentId.match(/:perc-([a-z-]+-\d+):/);
  if (!match) {
    return null;
  }
  const voiceId = match[1] as PercussionVoiceId;
  const family = voiceId.replace(/-\d+$/, '');
  return isPercussionFamily(family) ? voiceId : null;
}

export function resolvePercussionVoiceNameFromInstrumentId(
  instrumentId: string
): string | null {
  const voiceId = resolvePercussionVoiceIdFromInstrumentId(instrumentId);
  return voiceId ? resolvePercussionVoiceById(voiceId).name : null;
}

export function resolvePercussionGrooveRoleFromInstrumentId(
  instrumentId: string
): ProceduralPercussionGrooveRole | null {
  const match = instrumentId.match(/:groove-(kick|accent|pulse|texture)$/);
  return (match?.[1] as ProceduralPercussionGrooveRole | undefined) ?? null;
}

function resolvePercussionDurationScale(themeId: MusicRegionThemeId): number {
  switch (themeId) {
    case 'deep-forest':
      return 0.76;
    case 'town-square':
      return 0.4;
    default:
      return 0.72;
  }
}

function resolveProceduralPercussionPattern(options: {
  themeId: MusicRegionThemeId;
  cadence: ProceduralLeadPhraseCadence;
  clusterX: number;
  clusterY: number;
  stepIndex: number;
}): ProceduralPercussionPattern {
  if (options.themeId === 'deep-forest') {
    if (isMeaningfulPercussionTransition(options.cadence)) {
      return FOREST_CADENCE_PATTERNS.answer;
    }
    const index = Math.floor(
      hash2DWithSeed(
        PERCUSSION_PATTERN_SEED,
        options.clusterX + options.stepIndex * 11,
        options.clusterY - options.stepIndex * 7
      ) * FOREST_PULSE_PATTERNS.length
    );
    return FOREST_PULSE_PATTERNS[index] ?? FOREST_PULSE_PATTERNS[0]!;
  }

  if (options.themeId === 'town-square') {
    if (isMeaningfulPercussionTransition(options.cadence)) {
      return TOWN_FILL_PATTERNS.answer;
    }
    const relatedMeasureIndex = resolvePercussionRelatedMeasureIndex(
      options.stepIndex
    );
    const index = Math.floor(
      hash2DWithSeed(
        PERCUSSION_PATTERN_SEED,
        options.clusterX + relatedMeasureIndex * 13,
        options.clusterY - relatedMeasureIndex * 5
      ) * TOWN_PULSE_PATTERNS.length
    );
    return TOWN_PULSE_PATTERNS[index] ?? TOWN_PULSE_PATTERNS[0]!;
  }

  if (isMeaningfulPercussionTransition(options.cadence)) {
    return GENERIC_FILL_PATTERNS.answer;
  }

  const index = Math.floor(
    hash2DWithSeed(
      PERCUSSION_PATTERN_SEED,
      options.clusterX +
        resolvePercussionRelatedMeasureIndex(options.stepIndex) * 17,
      options.clusterY -
        resolvePercussionRelatedMeasureIndex(options.stepIndex) * 3
    ) * GENERIC_PULSE_PATTERNS.length
  );
  return GENERIC_PULSE_PATTERNS[index] ?? GENERIC_PULSE_PATTERNS[0]!;
}

function resolvePercussionFamilyForGrooveRole(options: {
  themeId: MusicRegionThemeId;
  cadence: ProceduralLeadPhraseCadence;
  grooveRole: ProceduralPercussionGrooveRole;
  offsetRatio: number;
}): PercussionFamily {
  switch (options.grooveRole) {
    case 'kick':
      return 'kick';
    case 'pulse':
      return 'shaker';
    case 'texture':
      return 'hand-percussion';
    case 'accent':
      if (options.offsetRatio >= 0.74 && options.cadence === 'answer') {
        return 'cymbals';
      }
      return options.themeId === 'deep-forest' ? 'hand-percussion' : 'snare';
    default:
      return 'shaker';
  }
}

function resolvePercussionMeasureIndex(stepIndex: number): number {
  return Math.floor(stepIndex / 4);
}

function isMeaningfulPercussionTransition(
  cadence: ProceduralLeadPhraseCadence
): boolean {
  return cadence === 'answer';
}

function resolvePercussionRelatedMeasureIndex(stepIndex: number): number {
  return (
    resolvePercussionMeasureIndex(stepIndex) %
    PROCEDURAL_PERCUSSION_MEASURE_CYCLE_LENGTH
  );
}

function createHit(
  grooveRole: ProceduralPercussionGrooveRole,
  semitones: number,
  offsetRatio: number,
  durationRatio: number,
  volumeMultiplier: number,
  pulseRateMultiplier: number,
  overrides: Partial<
    Omit<
      ProceduralPercussionHit,
      | 'family'
      | 'semitones'
      | 'offsetRatio'
      | 'durationRatio'
      | 'volumeMultiplier'
      | 'pulseRateMultiplier'
    >
  > = {}
): ProceduralPercussionHit {
  return {
    grooveRole,
    semitones,
    offsetRatio,
    durationRatio,
    volumeMultiplier,
    pulseRateMultiplier,
    attackMultiplier: overrides.attackMultiplier ?? 1,
    releaseMultiplier: overrides.releaseMultiplier ?? 1,
    harmonicGainMultiplier: overrides.harmonicGainMultiplier ?? 1,
    brightnessMultiplier: overrides.brightnessMultiplier ?? 1,
  };
}
