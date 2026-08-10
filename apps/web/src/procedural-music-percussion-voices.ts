import type { MusicWaveform, ProceduralInstrumentTimbre } from './music-instrument-timbres.ts';

export type PercussionFamily =
  | 'kick'
  | 'snare'
  | 'cymbals'
  | 'shaker'
  | 'hand-percussion';

export type PercussionVoiceId =
  | 'kick-36'
  | 'kick-35'
  | 'kick-41'
  | 'snare-38'
  | 'snare-37'
  | 'snare-40'
  | 'snare-39'
  | 'cymbals-49'
  | 'cymbals-51'
  | 'cymbals-46'
  | 'cymbals-42'
  | 'shaker-69'
  | 'shaker-54'
  | 'shaker-42'
  | 'shaker-70'
  | 'hand-percussion-60'
  | 'hand-percussion-61'
  | 'hand-percussion-54'
  | 'hand-percussion-69';

export type PercussionVoiceDefinition = Readonly<{
  id: PercussionVoiceId;
  family: PercussionFamily;
  midiNote: number;
  name: string;
  waveform: MusicWaveform;
  brightnessMultiplier: number;
  attackMultiplier: number;
  releaseMultiplier: number;
  detuneMultiplier: number;
  harmonicGainMultiplier: number;
  pulseRateMultiplier: number;
  timbre: Readonly<{
    harmonicRatioMultiplier?: number;
    filterCutoffMultiplier?: number;
    filterQMultiplier?: number;
    noiseMixMultiplier?: number;
    transientMixMultiplier?: number;
  }>;
}>;

const PERCUSSION_VOICE_PATTERNS: Record<PercussionFamily, readonly PercussionVoiceId[]> = {
  kick: ['kick-36', 'kick-35', 'kick-36', 'kick-41'],
  snare: ['snare-38', 'snare-37', 'snare-40', 'snare-39'],
  cymbals: ['cymbals-49', 'cymbals-51', 'cymbals-46', 'cymbals-42'],
  shaker: ['shaker-69', 'shaker-54', 'shaker-42', 'shaker-70'],
  'hand-percussion': [
    'hand-percussion-60',
    'hand-percussion-61',
    'hand-percussion-54',
    'hand-percussion-69',
  ],
};

const PERCUSSION_VOICES: Record<PercussionVoiceId, PercussionVoiceDefinition> = {
  'kick-36': createPercussionVoice({
    id: 'kick-36',
    family: 'kick',
    midiNote: 36,
    name: 'kick-center',
    waveform: 'sine',
    brightnessMultiplier: 0.96,
    attackMultiplier: 0.92,
    releaseMultiplier: 1.02,
    detuneMultiplier: 0.46,
    harmonicGainMultiplier: 0.88,
    pulseRateMultiplier: 0.94,
    timbre: {
      harmonicRatioMultiplier: 0.92,
      filterCutoffMultiplier: 0.86,
      filterQMultiplier: 1.1,
    },
  }),
  'kick-35': createPercussionVoice({
    id: 'kick-35',
    family: 'kick',
    midiNote: 35,
    name: 'kick-deep',
    waveform: 'triangle',
    brightnessMultiplier: 0.82,
    attackMultiplier: 1.04,
    releaseMultiplier: 1.16,
    detuneMultiplier: 0.38,
    harmonicGainMultiplier: 0.8,
    pulseRateMultiplier: 0.9,
    timbre: {
      harmonicRatioMultiplier: 0.84,
      filterCutoffMultiplier: 0.72,
      filterQMultiplier: 1.2,
    },
  }),
  'kick-41': createPercussionVoice({
    id: 'kick-41',
    family: 'kick',
    midiNote: 41,
    name: 'kick-tight',
    waveform: 'triangle',
    brightnessMultiplier: 1.06,
    attackMultiplier: 0.88,
    releaseMultiplier: 0.94,
    detuneMultiplier: 0.64,
    harmonicGainMultiplier: 1.12,
    pulseRateMultiplier: 1.04,
    timbre: {
      harmonicRatioMultiplier: 1.08,
      filterCutoffMultiplier: 1.14,
      filterQMultiplier: 0.96,
    },
  }),
  'snare-38': createPercussionVoice({
    id: 'snare-38',
    family: 'snare',
    midiNote: 38,
    name: 'snare-main',
    waveform: 'square',
    brightnessMultiplier: 1,
    attackMultiplier: 0.96,
    releaseMultiplier: 1,
    detuneMultiplier: 1,
    harmonicGainMultiplier: 1,
    pulseRateMultiplier: 1,
    timbre: {
      harmonicRatioMultiplier: 1,
      filterCutoffMultiplier: 1,
      filterQMultiplier: 1,
    },
  }),
  'snare-37': createPercussionVoice({
    id: 'snare-37',
    family: 'snare',
    midiNote: 37,
    name: 'snare-rim',
    waveform: 'triangle',
    brightnessMultiplier: 1.08,
    attackMultiplier: 0.82,
    releaseMultiplier: 0.76,
    detuneMultiplier: 1.06,
    harmonicGainMultiplier: 1.08,
    pulseRateMultiplier: 1.12,
    timbre: {
      harmonicRatioMultiplier: 1.18,
      filterCutoffMultiplier: 1.22,
      filterQMultiplier: 0.82,
    },
  }),
  'snare-40': createPercussionVoice({
    id: 'snare-40',
    family: 'snare',
    midiNote: 40,
    name: 'snare-electric',
    waveform: 'triangle',
    brightnessMultiplier: 0.88,
    attackMultiplier: 1.12,
    releaseMultiplier: 1.24,
    detuneMultiplier: 0.94,
    harmonicGainMultiplier: 0.86,
    pulseRateMultiplier: 0.9,
    timbre: {
      harmonicRatioMultiplier: 0.92,
      filterCutoffMultiplier: 0.84,
      filterQMultiplier: 1.18,
    },
  }),
  'snare-39': createPercussionVoice({
    id: 'snare-39',
    family: 'snare',
    midiNote: 39,
    name: 'snare-clap',
    waveform: 'sawtooth',
    brightnessMultiplier: 1.14,
    attackMultiplier: 0.86,
    releaseMultiplier: 0.82,
    detuneMultiplier: 1.12,
    harmonicGainMultiplier: 1.14,
    pulseRateMultiplier: 1.08,
    timbre: {
      harmonicRatioMultiplier: 1.22,
      filterCutoffMultiplier: 1.28,
      filterQMultiplier: 0.8,
    },
  }),
  'cymbals-49': createPercussionVoice({
    id: 'cymbals-49',
    family: 'cymbals',
    midiNote: 49,
    name: 'crash',
    waveform: 'sawtooth',
    brightnessMultiplier: 1.14,
    attackMultiplier: 0.84,
    releaseMultiplier: 1.28,
    detuneMultiplier: 1.34,
    harmonicGainMultiplier: 1.08,
    pulseRateMultiplier: 0.92,
    timbre: {
      harmonicRatioMultiplier: 1.14,
      filterCutoffMultiplier: 1.06,
      filterQMultiplier: 0.84,
      noiseMixMultiplier: 1.44,
      transientMixMultiplier: 0.84,
    },
  }),
  'cymbals-51': createPercussionVoice({
    id: 'cymbals-51',
    family: 'cymbals',
    midiNote: 51,
    name: 'ride',
    waveform: 'square',
    brightnessMultiplier: 1.2,
    attackMultiplier: 0.78,
    releaseMultiplier: 1.42,
    detuneMultiplier: 1.42,
    harmonicGainMultiplier: 1.16,
    pulseRateMultiplier: 0.88,
    timbre: {
      harmonicRatioMultiplier: 1.2,
      filterCutoffMultiplier: 1.1,
      filterQMultiplier: 0.78,
      noiseMixMultiplier: 1.56,
      transientMixMultiplier: 0.76,
    },
  }),
  'cymbals-46': createPercussionVoice({
    id: 'cymbals-46',
    family: 'cymbals',
    midiNote: 46,
    name: 'open-hat',
    waveform: 'triangle',
    brightnessMultiplier: 1.08,
    attackMultiplier: 0.9,
    releaseMultiplier: 0.9,
    detuneMultiplier: 1.18,
    harmonicGainMultiplier: 0.94,
    pulseRateMultiplier: 1.1,
    timbre: {
      harmonicRatioMultiplier: 0.96,
      filterCutoffMultiplier: 0.92,
      filterQMultiplier: 1.08,
      noiseMixMultiplier: 1.14,
      transientMixMultiplier: 1.08,
    },
  }),
  'cymbals-42': createPercussionVoice({
    id: 'cymbals-42',
    family: 'cymbals',
    midiNote: 42,
    name: 'closed-hat',
    waveform: 'triangle',
    brightnessMultiplier: 0.98,
    attackMultiplier: 0.74,
    releaseMultiplier: 0.64,
    detuneMultiplier: 1.08,
    harmonicGainMultiplier: 0.82,
    pulseRateMultiplier: 1.26,
    timbre: {
      harmonicRatioMultiplier: 0.86,
      filterCutoffMultiplier: 0.8,
      filterQMultiplier: 1.22,
      noiseMixMultiplier: 1.28,
      transientMixMultiplier: 1.26,
    },
  }),
  'shaker-69': createPercussionVoice({
    id: 'shaker-69',
    family: 'shaker',
    midiNote: 69,
    name: 'cabasa',
    waveform: 'triangle',
    brightnessMultiplier: 1.06,
    attackMultiplier: 0.82,
    releaseMultiplier: 0.78,
    detuneMultiplier: 1,
    harmonicGainMultiplier: 0.94,
    pulseRateMultiplier: 1.18,
    timbre: {
      harmonicRatioMultiplier: 1.04,
      filterCutoffMultiplier: 1.1,
      filterQMultiplier: 0.92,
    },
  }),
  'shaker-54': createPercussionVoice({
    id: 'shaker-54',
    family: 'shaker',
    midiNote: 54,
    name: 'tambourine-jingle',
    waveform: 'square',
    brightnessMultiplier: 0.94,
    attackMultiplier: 0.94,
    releaseMultiplier: 0.92,
    detuneMultiplier: 1.04,
    harmonicGainMultiplier: 1.02,
    pulseRateMultiplier: 1.08,
    timbre: {
      harmonicRatioMultiplier: 0.96,
      filterCutoffMultiplier: 0.94,
      filterQMultiplier: 1.08,
    },
  }),
  'shaker-42': createPercussionVoice({
    id: 'shaker-42',
    family: 'shaker',
    midiNote: 42,
    name: 'hat-shake',
    waveform: 'triangle',
    brightnessMultiplier: 0.9,
    attackMultiplier: 0.76,
    releaseMultiplier: 0.66,
    detuneMultiplier: 1.02,
    harmonicGainMultiplier: 0.82,
    pulseRateMultiplier: 1.3,
    timbre: {
      harmonicRatioMultiplier: 0.88,
      filterCutoffMultiplier: 0.84,
      filterQMultiplier: 1.16,
    },
  }),
  'shaker-70': createPercussionVoice({
    id: 'shaker-70',
    family: 'shaker',
    midiNote: 70,
    name: 'maraca',
    waveform: 'square',
    brightnessMultiplier: 1.16,
    attackMultiplier: 0.72,
    releaseMultiplier: 0.6,
    detuneMultiplier: 1.08,
    harmonicGainMultiplier: 1.08,
    pulseRateMultiplier: 1.34,
    timbre: {
      harmonicRatioMultiplier: 1.12,
      filterCutoffMultiplier: 1.18,
      filterQMultiplier: 0.82,
    },
  }),
  'hand-percussion-60': createPercussionVoice({
    id: 'hand-percussion-60',
    family: 'hand-percussion',
    midiNote: 60,
    name: 'high-bongo',
    waveform: 'square',
    brightnessMultiplier: 0.96,
    attackMultiplier: 0.92,
    releaseMultiplier: 1,
    detuneMultiplier: 1,
    harmonicGainMultiplier: 1,
    pulseRateMultiplier: 1,
    timbre: {
      harmonicRatioMultiplier: 1,
      filterCutoffMultiplier: 1,
      filterQMultiplier: 1,
    },
  }),
  'hand-percussion-61': createPercussionVoice({
    id: 'hand-percussion-61',
    family: 'hand-percussion',
    midiNote: 61,
    name: 'low-bongo',
    waveform: 'sawtooth',
    brightnessMultiplier: 1.08,
    attackMultiplier: 0.8,
    releaseMultiplier: 0.82,
    detuneMultiplier: 1.06,
    harmonicGainMultiplier: 1.08,
    pulseRateMultiplier: 1.12,
    timbre: {
      harmonicRatioMultiplier: 1.16,
      filterCutoffMultiplier: 1.18,
      filterQMultiplier: 0.86,
    },
  }),
  'hand-percussion-54': createPercussionVoice({
    id: 'hand-percussion-54',
    family: 'hand-percussion',
    midiNote: 54,
    name: 'tambourine-hit',
    waveform: 'triangle',
    brightnessMultiplier: 0.88,
    attackMultiplier: 1.04,
    releaseMultiplier: 1.18,
    detuneMultiplier: 0.96,
    harmonicGainMultiplier: 0.88,
    pulseRateMultiplier: 0.92,
    timbre: {
      harmonicRatioMultiplier: 0.92,
      filterCutoffMultiplier: 0.88,
      filterQMultiplier: 1.16,
    },
  }),
  'hand-percussion-69': createPercussionVoice({
    id: 'hand-percussion-69',
    family: 'hand-percussion',
    midiNote: 69,
    name: 'cabasa-tap',
    waveform: 'triangle',
    brightnessMultiplier: 1.14,
    attackMultiplier: 0.74,
    releaseMultiplier: 0.7,
    detuneMultiplier: 1.08,
    harmonicGainMultiplier: 1.12,
    pulseRateMultiplier: 1.2,
    timbre: {
      harmonicRatioMultiplier: 1.2,
      filterCutoffMultiplier: 1.22,
      filterQMultiplier: 0.82,
    },
  }),
};

export function isPercussionFamily(family: string): family is PercussionFamily {
  return (
    family === 'kick' ||
    family === 'snare' ||
    family === 'cymbals' ||
    family === 'shaker' ||
    family === 'hand-percussion'
  );
}

export function resolvePercussionVoice(options: {
  family: PercussionFamily;
  noteIndex: number;
}): PercussionVoiceDefinition {
  const pattern = PERCUSSION_VOICE_PATTERNS[options.family];
  const patternIndex = options.noteIndex % pattern.length;
  const voiceId = pattern[patternIndex] ?? pattern[0] ?? 'kick-36';
  return PERCUSSION_VOICES[voiceId];
}

export function resolvePercussionVoiceById(
  id: PercussionVoiceId
): PercussionVoiceDefinition {
  return PERCUSSION_VOICES[id];
}

export function resolvePercussionVoiceName(options: {
  family: PercussionFamily;
  noteIndex: number;
  voiceId?: PercussionVoiceId;
}): string {
  return options.voiceId
    ? resolvePercussionVoiceById(options.voiceId).name
    : resolvePercussionVoice({
        family: options.family,
        noteIndex: options.noteIndex,
      }).name;
}

export function resolvePercussionVoiceNameByMidiNote(options: {
  family: PercussionFamily;
  midiNote: number;
}): string | null {
  const match = listPercussionVoicesForFamily(options.family).find(
    (voice) => voice.midiNote === options.midiNote
  );
  return match?.name ?? null;
}

export function listPercussionVoicesForFamily(
  family: PercussionFamily
): readonly PercussionVoiceDefinition[] {
  const seen = new Set<PercussionVoiceId>();
  return PERCUSSION_VOICE_PATTERNS[family]
    .filter((voiceId) => {
      if (seen.has(voiceId)) {
        return false;
      }
      seen.add(voiceId);
      return true;
    })
    .map((voiceId) => resolvePercussionVoiceById(voiceId));
}

export function applyPercussionVoiceToTimbre(options: {
  voice: PercussionVoiceDefinition;
  timbre: ProceduralInstrumentTimbre;
}): ProceduralInstrumentTimbre {
  return {
    ...options.timbre,
    harmonicRatio: Math.max(
      0.5,
      options.timbre.harmonicRatio *
        (options.voice.timbre.harmonicRatioMultiplier ?? 1)
    ),
    filterCutoffHz: Math.max(
      60,
      options.timbre.filterCutoffHz *
        (options.voice.timbre.filterCutoffMultiplier ?? 1)
    ),
    filterQ: Math.max(
      0.1,
      options.timbre.filterQ * (options.voice.timbre.filterQMultiplier ?? 1)
    ),
    noiseMix:
      options.timbre.noiseMix === undefined
        ? undefined
        : Math.max(
            0,
            Math.min(
              0.4,
              options.timbre.noiseMix *
                (options.voice.timbre.noiseMixMultiplier ?? 1)
            )
          ),
    transientMix:
      options.timbre.transientMix === undefined
        ? undefined
        : Math.max(
            0,
            Math.min(
              0.5,
              options.timbre.transientMix *
                (options.voice.timbre.transientMixMultiplier ?? 1)
            )
          ),
  };
}

function createPercussionVoice(
  voice: PercussionVoiceDefinition
): PercussionVoiceDefinition {
  return Object.freeze({
    ...voice,
    timbre: Object.freeze({
      ...voice.timbre,
    }),
  });
}
