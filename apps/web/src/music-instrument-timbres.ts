export type MusicWaveform = OscillatorType;

export type InstrumentFamily =
  | 'vocals'
  | 'lead-guitar'
  | 'violin'
  | 'flute'
  | 'trumpet'
  | 'synth-lead'
  | 'piano'
  | 'guitar'
  | 'organ'
  | 'strings'
  | 'synth-pad'
  | 'bass-guitar'
  | 'upright-bass'
  | 'bass-synth'
  | 'tuba'
  | 'kick'
  | 'snare'
  | 'cymbals'
  | 'shaker'
  | 'hand-percussion';

export type ProceduralInstrumentTimbre = {
  harmonicWaveform: MusicWaveform;
  harmonicRatio: number;
  filterType: BiquadFilterType;
  filterCutoffHz: number;
  filterQ: number;
  pitchSweepSemitones?: number;
  pitchSweepDurationMs?: number;
  fundamentalGainMultiplier?: number;
  attackPeakGainMultiplier?: number;
  bodySettleMs?: number;
  bodySustainLevel?: number;
  harmonicBodyLevel?: number;
  harmonicReleaseLeadMs?: number;
  transientMix?: number;
  transientDurationMs?: number;
  transientFilterType?: BiquadFilterType;
  transientFilterCutoffHz?: number;
  transientFilterQ?: number;
  noiseMix?: number;
  noiseBurstRate?: number;
  noiseBurstDepth?: number;
  noiseFilterType?: BiquadFilterType;
  noiseFilterCutoffHz?: number;
  noiseFilterQ?: number;
};

export type InstrumentPatchRange = {
  min: number;
  max: number;
};

export type InstrumentPatchRecipe = {
  waveformOptions: readonly MusicWaveform[];
  attackMsRange: InstrumentPatchRange;
  releaseMsRange: InstrumentPatchRange;
  detuneCentsRange: InstrumentPatchRange;
  harmonicGainRange: InstrumentPatchRange;
  pulseRateRange: InstrumentPatchRange;
  brightnessRange: InstrumentPatchRange;
  timbre: InstrumentTimbreTemplate;
};

export type KnownGoodInstrumentPatchRole =
  'lead' | 'harmony' | 'bass' | 'percussion';

export type KnownGoodInstrumentPatch = Readonly<{
  role: KnownGoodInstrumentPatchRole;
  label: string;
  family: InstrumentFamily;
  waveform: MusicWaveform;
  attackMs: number;
  releaseMs: number;
  detuneCents: number;
  harmonicGain: number;
  pulseRate: number;
  brightness: number;
  timbre: Readonly<ProceduralInstrumentTimbre>;
}>;

export type ComparableInstrumentPatch = Readonly<{
  family: InstrumentFamily;
  waveform: MusicWaveform;
  attackMs: number;
  releaseMs: number;
  detuneCents: number;
  harmonicGain: number;
  pulseRate: number;
  brightness: number;
  timbre: Readonly<ProceduralInstrumentTimbre>;
}>;

export type KnownGoodInstrumentPatchComparison = Readonly<{
  role: KnownGoodInstrumentPatchRole;
  referenceLabel: string;
  similarityScore: number;
  familyMatches: boolean;
  waveformMatches: boolean;
  dimensions: Readonly<Record<string, number>>;
  prominentDifferences: readonly Readonly<{
    key: string;
    similarity: number;
    generatedValue: number;
    referenceValue: number;
  }>[];
}>;

export type InstrumentPatchSimilarity = Readonly<{
  similarityScore: number;
  familyMatches: boolean;
  waveformMatches: boolean;
  dimensions: Readonly<Record<string, number>>;
  prominentDifferences: readonly Readonly<{
    key: string;
    similarity: number;
    leftValue: number;
    rightValue: number;
  }>[];
}>;

type InstrumentTimbreTemplate = {
  harmonicWaveform: MusicWaveform;
  harmonicRatio: number;
  filterType: BiquadFilterType;
  cutoffMinHz: number;
  cutoffMaxHz: number;
  qMin: number;
  qMax: number;
  pitchSweepSemitones?: number;
  pitchSweepDurationMs?: number;
  fundamentalGainMultiplier?: number;
  attackPeakGainMultiplier?: number;
  bodySettleMs?: number;
  bodySustainLevel?: number;
  harmonicBodyLevel?: number;
  harmonicReleaseLeadMs?: number;
  transientMix?: number;
  transientDurationMs?: number;
  transientFilterType?: BiquadFilterType;
  transientCutoffMinHz?: number;
  transientCutoffMaxHz?: number;
  transientQMin?: number;
  transientQMax?: number;
  noiseMix?: number;
  noiseBurstRate?: number;
  noiseBurstDepth?: number;
  noiseFilterType?: BiquadFilterType;
  noiseCutoffMinHz?: number;
  noiseCutoffMaxHz?: number;
  noiseQMin?: number;
  noiseQMax?: number;
};

const INSTRUMENT_PATCH_RECIPES: Record<
  InstrumentFamily,
  InstrumentPatchRecipe
> = {
  vocals: {
    waveformOptions: ['sine', 'triangle'],
    attackMsRange: { min: 22, max: 44 },
    releaseMsRange: { min: 120, max: 190 },
    detuneCentsRange: { min: -6, max: 6 },
    harmonicGainRange: { min: 0.14, max: 0.24 },
    pulseRateRange: { min: 0.7, max: 1.2 },
    brightnessRange: { min: 0.88, max: 1.1 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'bandpass',
      cutoffMinHz: 900,
      cutoffMaxHz: 2100,
      qMin: 0.8,
      qMax: 2.2,
    },
  },
  'lead-guitar': {
    waveformOptions: ['triangle', 'sawtooth', 'square'],
    attackMsRange: { min: 14, max: 28 },
    releaseMsRange: { min: 90, max: 150 },
    detuneCentsRange: { min: -8, max: 8 },
    harmonicGainRange: { min: 0.18, max: 0.32 },
    pulseRateRange: { min: 0.8, max: 1.4 },
    brightnessRange: { min: 0.96, max: 1.18 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 1800,
      cutoffMaxHz: 3800,
      qMin: 0.7,
      qMax: 1.8,
    },
  },
  violin: {
    waveformOptions: ['triangle', 'sawtooth'],
    attackMsRange: { min: 26, max: 56 },
    releaseMsRange: { min: 180, max: 260 },
    detuneCentsRange: { min: -5, max: 5 },
    harmonicGainRange: { min: 0.16, max: 0.28 },
    pulseRateRange: { min: 0.7, max: 1.1 },
    brightnessRange: { min: 0.9, max: 1.1 },
    timbre: {
      harmonicWaveform: 'sawtooth',
      harmonicRatio: 2,
      filterType: 'bandpass',
      cutoffMinHz: 1400,
      cutoffMaxHz: 3200,
      qMin: 0.9,
      qMax: 2.4,
      attackPeakGainMultiplier: 1.08,
      bodySustainLevel: 0.88,
    },
  },
  flute: {
    waveformOptions: ['sine', 'triangle'],
    attackMsRange: { min: 18, max: 40 },
    releaseMsRange: { min: 120, max: 190 },
    detuneCentsRange: { min: -4, max: 4 },
    harmonicGainRange: { min: 0.12, max: 0.2 },
    pulseRateRange: { min: 0.65, max: 1.05 },
    brightnessRange: { min: 0.98, max: 1.18 },
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'highpass',
      cutoffMinHz: 600,
      cutoffMaxHz: 1400,
      qMin: 0.5,
      qMax: 1.4,
      noiseMix: 0.18,
      noiseFilterType: 'highpass',
      noiseCutoffMinHz: 2200,
      noiseCutoffMaxHz: 4200,
      noiseQMin: 0.4,
      noiseQMax: 1.1,
    },
  },
  trumpet: {
    waveformOptions: ['square', 'sawtooth', 'triangle'],
    attackMsRange: { min: 16, max: 32 },
    releaseMsRange: { min: 100, max: 170 },
    detuneCentsRange: { min: -7, max: 7 },
    harmonicGainRange: { min: 0.22, max: 0.34 },
    pulseRateRange: { min: 0.75, max: 1.15 },
    brightnessRange: { min: 1, max: 1.2 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 3,
      filterType: 'bandpass',
      cutoffMinHz: 1200,
      cutoffMaxHz: 2800,
      qMin: 0.7,
      qMax: 1.9,
    },
  },
  'synth-lead': {
    waveformOptions: ['sawtooth', 'square', 'triangle'],
    attackMsRange: { min: 12, max: 24 },
    releaseMsRange: { min: 90, max: 150 },
    detuneCentsRange: { min: -10, max: 10 },
    harmonicGainRange: { min: 0.22, max: 0.38 },
    pulseRateRange: { min: 0.9, max: 1.6 },
    brightnessRange: { min: 1.04, max: 1.28 },
    timbre: {
      harmonicWaveform: 'sawtooth',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 2200,
      cutoffMaxHz: 5600,
      qMin: 0.4,
      qMax: 1.3,
    },
  },
  piano: {
    waveformOptions: ['triangle', 'square'],
    attackMsRange: { min: 8, max: 18 },
    releaseMsRange: { min: 90, max: 150 },
    detuneCentsRange: { min: -5, max: 5 },
    harmonicGainRange: { min: 0.14, max: 0.24 },
    pulseRateRange: { min: 0.6, max: 0.95 },
    brightnessRange: { min: 0.9, max: 1.08 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 1200,
      cutoffMaxHz: 3000,
      qMin: 0.5,
      qMax: 1.2,
      transientMix: 0.2,
      transientDurationMs: 34,
      transientFilterType: 'highpass',
      transientCutoffMinHz: 1800,
      transientCutoffMaxHz: 3600,
      transientQMin: 0.6,
      transientQMax: 1.4,
    },
  },
  guitar: {
    waveformOptions: ['triangle', 'square', 'sawtooth'],
    attackMsRange: { min: 10, max: 24 },
    releaseMsRange: { min: 100, max: 170 },
    detuneCentsRange: { min: -6, max: 6 },
    harmonicGainRange: { min: 0.16, max: 0.28 },
    pulseRateRange: { min: 0.68, max: 1.05 },
    brightnessRange: { min: 0.9, max: 1.12 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 1500,
      cutoffMaxHz: 3200,
      qMin: 0.5,
      qMax: 1.6,
      transientMix: 0.16,
      transientDurationMs: 28,
      transientFilterType: 'bandpass',
      transientCutoffMinHz: 1400,
      transientCutoffMaxHz: 2800,
      transientQMin: 0.8,
      transientQMax: 1.8,
    },
  },
  organ: {
    waveformOptions: ['square', 'triangle', 'sine'],
    attackMsRange: { min: 14, max: 26 },
    releaseMsRange: { min: 160, max: 260 },
    detuneCentsRange: { min: -3, max: 3 },
    harmonicGainRange: { min: 0.12, max: 0.2 },
    pulseRateRange: { min: 0.55, max: 0.85 },
    brightnessRange: { min: 0.82, max: 0.98 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 1,
      filterType: 'lowpass',
      cutoffMinHz: 900,
      cutoffMaxHz: 1800,
      qMin: 0.3,
      qMax: 0.8,
    },
  },
  strings: {
    waveformOptions: ['triangle', 'sawtooth'],
    attackMsRange: { min: 28, max: 60 },
    releaseMsRange: { min: 190, max: 280 },
    detuneCentsRange: { min: -5, max: 5 },
    harmonicGainRange: { min: 0.14, max: 0.24 },
    pulseRateRange: { min: 0.55, max: 0.9 },
    brightnessRange: { min: 0.84, max: 1.02 },
    timbre: {
      harmonicWaveform: 'sawtooth',
      harmonicRatio: 2,
      filterType: 'bandpass',
      cutoffMinHz: 1000,
      cutoffMaxHz: 2400,
      qMin: 0.8,
      qMax: 2,
      attackPeakGainMultiplier: 1.1,
      bodySustainLevel: 0.92,
    },
  },
  'synth-pad': {
    waveformOptions: ['triangle', 'sine', 'sawtooth'],
    attackMsRange: { min: 34, max: 72 },
    releaseMsRange: { min: 220, max: 320 },
    detuneCentsRange: { min: -6, max: 6 },
    harmonicGainRange: { min: 0.12, max: 0.22 },
    pulseRateRange: { min: 0.45, max: 0.8 },
    brightnessRange: { min: 0.78, max: 0.96 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 700,
      cutoffMaxHz: 1600,
      qMin: 0.2,
      qMax: 0.8,
    },
  },
  'bass-guitar': {
    waveformOptions: ['sine', 'triangle', 'square'],
    attackMsRange: { min: 18, max: 34 },
    releaseMsRange: { min: 150, max: 220 },
    detuneCentsRange: { min: -4, max: 4 },
    harmonicGainRange: { min: 0.12, max: 0.18 },
    pulseRateRange: { min: 0.58, max: 0.92 },
    brightnessRange: { min: 0.72, max: 0.9 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 260,
      cutoffMaxHz: 620,
      qMin: 0.4,
      qMax: 1.1,
      fundamentalGainMultiplier: 1.14,
      harmonicBodyLevel: 0.42,
      harmonicReleaseLeadMs: 60,
    },
  },
  'upright-bass': {
    waveformOptions: ['sine', 'triangle'],
    attackMsRange: { min: 20, max: 42 },
    releaseMsRange: { min: 180, max: 260 },
    detuneCentsRange: { min: -3, max: 3 },
    harmonicGainRange: { min: 0.1, max: 0.16 },
    pulseRateRange: { min: 0.52, max: 0.82 },
    brightnessRange: { min: 0.66, max: 0.86 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 180,
      cutoffMaxHz: 460,
      qMin: 0.4,
      qMax: 1,
      fundamentalGainMultiplier: 1.16,
      harmonicBodyLevel: 0.36,
      harmonicReleaseLeadMs: 80,
    },
  },
  'bass-synth': {
    waveformOptions: ['square', 'sawtooth', 'triangle'],
    attackMsRange: { min: 12, max: 24 },
    releaseMsRange: { min: 130, max: 210 },
    detuneCentsRange: { min: -6, max: 6 },
    harmonicGainRange: { min: 0.14, max: 0.22 },
    pulseRateRange: { min: 0.62, max: 1.04 },
    brightnessRange: { min: 0.74, max: 0.96 },
    timbre: {
      harmonicWaveform: 'sawtooth',
      harmonicRatio: 2,
      filterType: 'lowpass',
      cutoffMinHz: 320,
      cutoffMaxHz: 900,
      qMin: 0.6,
      qMax: 1.4,
      fundamentalGainMultiplier: 1.1,
      harmonicBodyLevel: 0.48,
      harmonicReleaseLeadMs: 50,
    },
  },
  tuba: {
    waveformOptions: ['sine', 'triangle', 'square'],
    attackMsRange: { min: 24, max: 42 },
    releaseMsRange: { min: 170, max: 250 },
    detuneCentsRange: { min: -4, max: 4 },
    harmonicGainRange: { min: 0.1, max: 0.18 },
    pulseRateRange: { min: 0.5, max: 0.84 },
    brightnessRange: { min: 0.68, max: 0.84 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 1,
      filterType: 'bandpass',
      cutoffMinHz: 220,
      cutoffMaxHz: 520,
      qMin: 0.7,
      qMax: 1.6,
      fundamentalGainMultiplier: 1.12,
      harmonicBodyLevel: 0.4,
      harmonicReleaseLeadMs: 70,
    },
  },
  kick: {
    waveformOptions: ['sine', 'triangle'],
    attackMsRange: { min: 4, max: 10 },
    releaseMsRange: { min: 30, max: 60 },
    detuneCentsRange: { min: -3, max: 3 },
    harmonicGainRange: { min: 0.08, max: 0.14 },
    pulseRateRange: { min: 2.4, max: 3.9 },
    brightnessRange: { min: 0.62, max: 0.78 },
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 0.5,
      filterType: 'lowpass',
      cutoffMinHz: 90,
      cutoffMaxHz: 180,
      qMin: 0.6,
      qMax: 1.2,
      pitchSweepSemitones: 14,
      pitchSweepDurationMs: 44,
      transientMix: 0.18,
      transientDurationMs: 18,
      transientFilterType: 'highpass',
      transientCutoffMinHz: 1_800,
      transientCutoffMaxHz: 3_200,
      transientQMin: 0.8,
      transientQMax: 1.6,
    },
  },
  snare: {
    waveformOptions: ['square', 'triangle'],
    attackMsRange: { min: 5, max: 11 },
    releaseMsRange: { min: 36, max: 72 },
    detuneCentsRange: { min: -5, max: 5 },
    harmonicGainRange: { min: 0.14, max: 0.2 },
    pulseRateRange: { min: 2.2, max: 3.4 },
    brightnessRange: { min: 0.88, max: 1.08 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 1.4,
      filterType: 'bandpass',
      cutoffMinHz: 420,
      cutoffMaxHz: 1_100,
      qMin: 1.2,
      qMax: 2.4,
      fundamentalGainMultiplier: 1.12,
      attackPeakGainMultiplier: 1.08,
      bodySustainLevel: 0.7,
      harmonicBodyLevel: 0.44,
      harmonicReleaseLeadMs: 24,
      transientMix: 0.24,
      transientDurationMs: 28,
      transientFilterType: 'bandpass',
      transientCutoffMinHz: 1_800,
      transientCutoffMaxHz: 4_000,
      transientQMin: 0.8,
      transientQMax: 1.8,
    },
  },
  cymbals: {
    waveformOptions: ['sawtooth', 'square'],
    attackMsRange: { min: 3, max: 8 },
    releaseMsRange: { min: 60, max: 120 },
    detuneCentsRange: { min: -7, max: 7 },
    harmonicGainRange: { min: 0.16, max: 0.24 },
    pulseRateRange: { min: 2.8, max: 4.4 },
    brightnessRange: { min: 1.06, max: 1.26 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 6,
      filterType: 'highpass',
      cutoffMinHz: 2600,
      cutoffMaxHz: 5600,
      qMin: 0.8,
      qMax: 2.1,
      noiseMix: 0.22,
      noiseFilterType: 'highpass',
      noiseCutoffMinHz: 3_600,
      noiseCutoffMaxHz: 7_000,
      noiseQMin: 0.7,
      noiseQMax: 1.8,
      transientMix: 0.12,
      transientDurationMs: 16,
      transientFilterType: 'highpass',
      transientCutoffMinHz: 4_400,
      transientCutoffMaxHz: 8_200,
      transientQMin: 0.7,
      transientQMax: 1.6,
    },
  },
  shaker: {
    waveformOptions: ['triangle', 'square'],
    attackMsRange: { min: 3, max: 7 },
    releaseMsRange: { min: 28, max: 56 },
    detuneCentsRange: { min: -5, max: 5 },
    harmonicGainRange: { min: 0.12, max: 0.18 },
    pulseRateRange: { min: 2.6, max: 4.2 },
    brightnessRange: { min: 0.98, max: 1.18 },
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 4,
      filterType: 'highpass',
      cutoffMinHz: 1800,
      cutoffMaxHz: 4200,
      qMin: 0.9,
      qMax: 2.4,
      noiseMix: 0.24,
      noiseBurstRate: 22,
      noiseBurstDepth: 0.78,
      noiseFilterType: 'highpass',
      noiseCutoffMinHz: 2_400,
      noiseCutoffMaxHz: 5_600,
      noiseQMin: 0.8,
      noiseQMax: 1.6,
    },
  },
  'hand-percussion': {
    waveformOptions: ['triangle', 'square', 'sawtooth'],
    attackMsRange: { min: 4, max: 10 },
    releaseMsRange: { min: 34, max: 74 },
    detuneCentsRange: { min: -6, max: 6 },
    harmonicGainRange: { min: 0.12, max: 0.2 },
    pulseRateRange: { min: 2.1, max: 3.6 },
    brightnessRange: { min: 0.84, max: 1.06 },
    timbre: {
      harmonicWaveform: 'square',
      harmonicRatio: 3,
      filterType: 'bandpass',
      cutoffMinHz: 700,
      cutoffMaxHz: 1800,
      qMin: 1,
      qMax: 2.3,
    },
  },
};

const KNOWN_GOOD_INSTRUMENT_PATCHES: Record<
  KnownGoodInstrumentPatchRole,
  KnownGoodInstrumentPatch
> = Object.freeze({
  lead: createKnownGoodInstrumentPatch({
    role: 'lead',
    label: 'Breathy flute lead',
    family: 'flute',
    waveform: 'sine',
    attackMs: 26,
    releaseMs: 156,
    detuneCents: 1,
    harmonicGain: 0.16,
    pulseRate: 0.82,
    brightness: 1.08,
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2.02,
      filterType: 'highpass',
      filterCutoffHz: 1_020,
      filterQ: 0.84,
      noiseMix: 0.19,
      noiseFilterType: 'highpass',
      noiseFilterCutoffHz: 3_300,
      noiseFilterQ: 0.72,
    },
  }),
  harmony: createKnownGoodInstrumentPatch({
    role: 'harmony',
    label: 'Bowed string bed',
    family: 'strings',
    waveform: 'triangle',
    attackMs: 42,
    releaseMs: 238,
    detuneCents: 2,
    harmonicGain: 0.18,
    pulseRate: 0.68,
    brightness: 0.92,
    timbre: {
      harmonicWaveform: 'sawtooth',
      harmonicRatio: 2.04,
      filterType: 'bandpass',
      filterCutoffHz: 1_640,
      filterQ: 1.28,
      attackPeakGainMultiplier: 1.1,
      bodySustainLevel: 0.92,
    },
  }),
  bass: createKnownGoodInstrumentPatch({
    role: 'bass',
    label: 'Anchored upright bass',
    family: 'upright-bass',
    waveform: 'sine',
    attackMs: 28,
    releaseMs: 228,
    detuneCents: 0,
    harmonicGain: 0.12,
    pulseRate: 0.66,
    brightness: 0.78,
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 1.94,
      filterType: 'lowpass',
      filterCutoffHz: 290,
      filterQ: 0.72,
      fundamentalGainMultiplier: 1.16,
      harmonicBodyLevel: 0.36,
      harmonicReleaseLeadMs: 80,
    },
  }),
  percussion: createKnownGoodInstrumentPatch({
    role: 'percussion',
    label: 'Punchy kick pulse',
    family: 'kick',
    waveform: 'sine',
    attackMs: 6,
    releaseMs: 48,
    detuneCents: -1,
    harmonicGain: 0.1,
    pulseRate: 3.1,
    brightness: 0.72,
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 0.54,
      filterType: 'lowpass',
      filterCutoffHz: 126,
      filterQ: 0.92,
    },
  }),
});

export function resolveInstrumentPatchRecipe(
  family: InstrumentFamily
): InstrumentPatchRecipe {
  return INSTRUMENT_PATCH_RECIPES[family];
}

export function resolveKnownGoodInstrumentPatch(
  role: KnownGoodInstrumentPatchRole
): KnownGoodInstrumentPatch {
  return KNOWN_GOOD_INSTRUMENT_PATCHES[role];
}

export function listKnownGoodInstrumentPatches(): readonly KnownGoodInstrumentPatch[] {
  return [
    KNOWN_GOOD_INSTRUMENT_PATCHES.lead,
    KNOWN_GOOD_INSTRUMENT_PATCHES.harmony,
    KNOWN_GOOD_INSTRUMENT_PATCHES.bass,
    KNOWN_GOOD_INSTRUMENT_PATCHES.percussion,
  ];
}

export function compareInstrumentPatchToKnownGoodRolePatch(options: {
  role: KnownGoodInstrumentPatchRole;
  patch: ComparableInstrumentPatch;
}): KnownGoodInstrumentPatchComparison {
  const referencePatch = resolveKnownGoodInstrumentPatch(options.role);
  const similarity = compareInstrumentPatches({
    left: options.patch,
    right: referencePatch,
  });

  return {
    role: options.role,
    referenceLabel: referencePatch.label,
    similarityScore: similarity.similarityScore,
    familyMatches: similarity.familyMatches,
    waveformMatches: similarity.waveformMatches,
    dimensions: similarity.dimensions,
    prominentDifferences: similarity.prominentDifferences.map((difference) => ({
      key: difference.key,
      similarity: difference.similarity,
      generatedValue: difference.leftValue,
      referenceValue: difference.rightValue,
    })),
  };
}

export function compareInstrumentPatches(options: {
  left: ComparableInstrumentPatch;
  right: ComparableInstrumentPatch;
}): InstrumentPatchSimilarity {
  const dimensions = collectPatchSimilarityDimensions(
    options.left,
    options.right
  );
  const dimensionEntries = Object.entries(dimensions);
  const similarityScore =
    dimensionEntries.reduce((total, [, score]) => total + score, 0) /
    Math.max(1, dimensionEntries.length);

  return {
    similarityScore,
    familyMatches: options.left.family === options.right.family,
    waveformMatches: options.left.waveform === options.right.waveform,
    dimensions,
    prominentDifferences: collectProminentDifferences(
      options.left,
      options.right,
      dimensions
    ),
  };
}

export function resolveProceduralInstrumentTimbre(options: {
  family: InstrumentFamily;
  brightness: number;
  harmonicSignal: number;
  filterSignal: number;
}): ProceduralInstrumentTimbre {
  const template = resolveInstrumentPatchRecipe(options.family).timbre;
  const brightness = clamp(options.brightness, 0.5, 1.4);
  const cutoffBase = interpolate(
    template.cutoffMinHz,
    template.cutoffMaxHz,
    clamp(options.filterSignal, 0, 1)
  );

  const noiseMix =
    template.noiseMix === undefined
      ? undefined
      : clamp(
          template.noiseMix *
            (0.92 + clamp(options.harmonicSignal, 0, 1) * 0.16),
          0,
          0.4
        );

  return {
    harmonicWaveform: template.harmonicWaveform,
    harmonicRatio: Math.max(
      0.5,
      template.harmonicRatio *
        (0.94 + clamp(options.harmonicSignal, 0, 1) * 0.12)
    ),
    filterType: template.filterType,
    filterCutoffHz: cutoffBase * (0.86 + (brightness - 0.5) * 0.42),
    filterQ: interpolate(
      template.qMin,
      template.qMax,
      clamp(options.filterSignal, 0, 1)
    ),
    pitchSweepSemitones: template.pitchSweepSemitones,
    pitchSweepDurationMs: template.pitchSweepDurationMs,
    fundamentalGainMultiplier: template.fundamentalGainMultiplier,
    attackPeakGainMultiplier: template.attackPeakGainMultiplier,
    bodySustainLevel: template.bodySustainLevel,
    harmonicBodyLevel: template.harmonicBodyLevel,
    harmonicReleaseLeadMs: template.harmonicReleaseLeadMs,
    transientMix: template.transientMix,
    transientDurationMs: template.transientDurationMs,
    transientFilterType: template.transientFilterType,
    transientFilterCutoffHz:
      template.transientCutoffMinHz === undefined ||
      template.transientCutoffMaxHz === undefined
        ? undefined
        : interpolate(
            template.transientCutoffMinHz,
            template.transientCutoffMaxHz,
            clamp(options.filterSignal, 0, 1)
          ),
    transientFilterQ:
      template.transientQMin === undefined ||
      template.transientQMax === undefined
        ? undefined
        : interpolate(
            template.transientQMin,
            template.transientQMax,
            clamp(options.filterSignal, 0, 1)
          ),
    noiseMix,
    noiseBurstRate: template.noiseBurstRate,
    noiseBurstDepth: template.noiseBurstDepth,
    noiseFilterType: template.noiseFilterType,
    noiseFilterCutoffHz:
      template.noiseCutoffMinHz === undefined ||
      template.noiseCutoffMaxHz === undefined
        ? undefined
        : interpolate(
            template.noiseCutoffMinHz,
            template.noiseCutoffMaxHz,
            clamp(options.filterSignal, 0, 1)
          ),
    noiseFilterQ:
      template.noiseQMin === undefined || template.noiseQMax === undefined
        ? undefined
        : interpolate(
            template.noiseQMin,
            template.noiseQMax,
            clamp(options.filterSignal, 0, 1)
          ),
  };
}

export function resolveRegisterShapedInstrumentTimbre(options: {
  timbre: ProceduralInstrumentTimbre;
  frequencyHz: number;
}): ProceduralInstrumentTimbre {
  const registerSignal = resolveRegisterSignal(options.frequencyHz);
  const lowWeight = clamp((0.35 - registerSignal) / 0.35, 0, 1);
  const highWeight = clamp((registerSignal - 0.65) / 0.35, 0, 1);
  const cutoffMultiplier = 1 - lowWeight * 0.18 + highWeight * 0.22;
  const harmonicRatioMultiplier = 1 - lowWeight * 0.08 + highWeight * 0.14;
  const filterQMultiplier = 1 + lowWeight * 0.06 + highWeight * 0.14;
  const noiseMixMultiplier = 1 - lowWeight * 0.08 + highWeight * 0.12;
  const transientMixMultiplier = 1 - lowWeight * 0.06 + highWeight * 0.1;
  const fundamentalMultiplier = 1 + lowWeight * 0.08 - highWeight * 0.05;
  const harmonicBodyMultiplier = 1 + lowWeight * 0.08 - highWeight * 0.08;

  return {
    ...options.timbre,
    harmonicRatio: Math.max(
      0.5,
      options.timbre.harmonicRatio * harmonicRatioMultiplier
    ),
    filterCutoffHz: Math.max(
      60,
      options.timbre.filterCutoffHz * cutoffMultiplier
    ),
    filterQ: clamp(options.timbre.filterQ * filterQMultiplier, 0.1, 24),
    fundamentalGainMultiplier:
      options.timbre.fundamentalGainMultiplier === undefined
        ? undefined
        : clamp(
            options.timbre.fundamentalGainMultiplier * fundamentalMultiplier,
            0.5,
            2
          ),
    harmonicBodyLevel:
      options.timbre.harmonicBodyLevel === undefined
        ? undefined
        : clamp(
            options.timbre.harmonicBodyLevel * harmonicBodyMultiplier,
            0,
            1
          ),
    transientMix:
      options.timbre.transientMix === undefined
        ? undefined
        : clamp(options.timbre.transientMix * transientMixMultiplier, 0, 0.5),
    transientFilterCutoffHz:
      options.timbre.transientFilterCutoffHz === undefined
        ? undefined
        : Math.max(
            80,
            options.timbre.transientFilterCutoffHz * cutoffMultiplier
          ),
    noiseMix:
      options.timbre.noiseMix === undefined
        ? undefined
        : clamp(options.timbre.noiseMix * noiseMixMultiplier, 0, 0.4),
    noiseFilterCutoffHz:
      options.timbre.noiseFilterCutoffHz === undefined
        ? undefined
        : Math.max(80, options.timbre.noiseFilterCutoffHz * cutoffMultiplier),
  };
}

export function resolveVelocityShapedInstrumentTimbre(options: {
  timbre: ProceduralInstrumentTimbre;
  velocity: number;
}): ProceduralInstrumentTimbre {
  const velocitySignal = clamp((options.velocity - 24) / 103, 0, 1);
  const cutoffMultiplier = 0.84 + velocitySignal * 0.36;
  const harmonicRatioMultiplier = 0.92 + velocitySignal * 0.18;
  const filterQMultiplier = 1.06 - velocitySignal * 0.12;
  const attackPeakMultiplier = 0.96 + velocitySignal * 0.14;
  const bodySustainMultiplier = 1.04 - velocitySignal * 0.08;
  const harmonicBodyMultiplier = 1.04 - velocitySignal * 0.12;
  const transientMixMultiplier = 0.68 + velocitySignal * 0.62;
  const noiseMixMultiplier = 0.72 + velocitySignal * 0.52;

  return {
    ...options.timbre,
    harmonicRatio: Math.max(
      0.5,
      options.timbre.harmonicRatio * harmonicRatioMultiplier
    ),
    filterCutoffHz: Math.max(
      60,
      options.timbre.filterCutoffHz * cutoffMultiplier
    ),
    filterQ: clamp(options.timbre.filterQ * filterQMultiplier, 0.1, 24),
    attackPeakGainMultiplier:
      options.timbre.attackPeakGainMultiplier === undefined
        ? undefined
        : clamp(
            options.timbre.attackPeakGainMultiplier * attackPeakMultiplier,
            0.75,
            2
          ),
    bodySustainLevel:
      options.timbre.bodySustainLevel === undefined
        ? undefined
        : clamp(
            options.timbre.bodySustainLevel * bodySustainMultiplier,
            0.2,
            1
          ),
    harmonicBodyLevel:
      options.timbre.harmonicBodyLevel === undefined
        ? undefined
        : clamp(
            options.timbre.harmonicBodyLevel * harmonicBodyMultiplier,
            0,
            1
          ),
    transientMix:
      options.timbre.transientMix === undefined
        ? undefined
        : clamp(options.timbre.transientMix * transientMixMultiplier, 0, 0.5),
    transientFilterCutoffHz:
      options.timbre.transientFilterCutoffHz === undefined
        ? undefined
        : Math.max(
            80,
            options.timbre.transientFilterCutoffHz * cutoffMultiplier
          ),
    noiseMix:
      options.timbre.noiseMix === undefined
        ? undefined
        : clamp(options.timbre.noiseMix * noiseMixMultiplier, 0, 0.4),
    noiseFilterCutoffHz:
      options.timbre.noiseFilterCutoffHz === undefined
        ? undefined
        : Math.max(80, options.timbre.noiseFilterCutoffHz * cutoffMultiplier),
  };
}

function interpolate(min: number, max: number, signal: number): number {
  return min + (max - min) * signal;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveRegisterSignal(frequencyHz: number): number {
  const safeFrequency = Math.max(27.5, frequencyHz);
  const normalizedOctaves = (Math.log2(safeFrequency / 27.5) - 2) / 4;
  return clamp(normalizedOctaves, 0, 1);
}

function createKnownGoodInstrumentPatch(
  patch: KnownGoodInstrumentPatch
): KnownGoodInstrumentPatch {
  return Object.freeze({
    ...patch,
    timbre: Object.freeze({
      ...patch.timbre,
    }),
  });
}

function collectPatchSimilarityDimensions(
  left: ComparableInstrumentPatch,
  right: ComparableInstrumentPatch
): Readonly<Record<string, number>> {
  return {
    attackMs: scoreLinearSimilarity(left.attackMs, right.attackMs, 80),
    releaseMs: scoreLinearSimilarity(left.releaseMs, right.releaseMs, 320),
    detuneCents: scoreLinearSimilarity(left.detuneCents, right.detuneCents, 12),
    harmonicGain: scoreLinearSimilarity(
      left.harmonicGain,
      right.harmonicGain,
      0.3
    ),
    pulseRate: scoreLinearSimilarity(left.pulseRate, right.pulseRate, 4),
    brightness: scoreLinearSimilarity(left.brightness, right.brightness, 0.6),
    harmonicRatio: scoreLinearSimilarity(
      left.timbre.harmonicRatio,
      right.timbre.harmonicRatio,
      5.5
    ),
    filterCutoffHz: scoreFrequencySimilarity(
      left.timbre.filterCutoffHz,
      right.timbre.filterCutoffHz
    ),
    filterQ: scoreLinearSimilarity(
      left.timbre.filterQ,
      right.timbre.filterQ,
      3
    ),
    noiseMix: scoreOptionalLinearSimilarity(
      left.timbre.noiseMix,
      right.timbre.noiseMix,
      0.4
    ),
    transientMix: scoreOptionalLinearSimilarity(
      left.timbre.transientMix,
      right.timbre.transientMix,
      0.5
    ),
    bodySustainLevel: scoreOptionalLinearSimilarity(
      left.timbre.bodySustainLevel,
      right.timbre.bodySustainLevel,
      1
    ),
    fundamentalGainMultiplier: scoreOptionalLinearSimilarity(
      left.timbre.fundamentalGainMultiplier,
      right.timbre.fundamentalGainMultiplier,
      1
    ),
    harmonicBodyLevel: scoreOptionalLinearSimilarity(
      left.timbre.harmonicBodyLevel,
      right.timbre.harmonicBodyLevel,
      1
    ),
  };
}

function scoreLinearSimilarity(
  value: number,
  reference: number,
  allowedDelta: number
): number {
  return 1 - clamp(Math.abs(value - reference) / allowedDelta, 0, 1);
}

function scoreOptionalLinearSimilarity(
  value: number | undefined,
  reference: number | undefined,
  allowedDelta: number
): number {
  if (value === undefined && reference === undefined) {
    return 1;
  }
  return scoreLinearSimilarity(value ?? 0, reference ?? 0, allowedDelta);
}

function scoreFrequencySimilarity(value: number, reference: number): number {
  const octaveDistance = Math.abs(
    Math.log2(Math.max(value, 1) / Math.max(reference, 1))
  );
  return 1 - clamp(octaveDistance / 6, 0, 1);
}

function collectProminentDifferences(
  left: ComparableInstrumentPatch,
  right: ComparableInstrumentPatch,
  dimensions: Record<string, number>
): readonly Readonly<{
  key: string;
  similarity: number;
  leftValue: number;
  rightValue: number;
}>[] {
  const valueMap = {
    attackMs: [left.attackMs, right.attackMs],
    releaseMs: [left.releaseMs, right.releaseMs],
    detuneCents: [left.detuneCents, right.detuneCents],
    harmonicGain: [left.harmonicGain, right.harmonicGain],
    pulseRate: [left.pulseRate, right.pulseRate],
    brightness: [left.brightness, right.brightness],
    harmonicRatio: [left.timbre.harmonicRatio, right.timbre.harmonicRatio],
    filterCutoffHz: [left.timbre.filterCutoffHz, right.timbre.filterCutoffHz],
    filterQ: [left.timbre.filterQ, right.timbre.filterQ],
    noiseMix: [left.timbre.noiseMix ?? 0, right.timbre.noiseMix ?? 0],
    transientMix: [
      left.timbre.transientMix ?? 0,
      right.timbre.transientMix ?? 0,
    ],
    bodySustainLevel: [
      left.timbre.bodySustainLevel ?? 0,
      right.timbre.bodySustainLevel ?? 0,
    ],
    fundamentalGainMultiplier: [
      left.timbre.fundamentalGainMultiplier ?? 0,
      right.timbre.fundamentalGainMultiplier ?? 0,
    ],
    harmonicBodyLevel: [
      left.timbre.harmonicBodyLevel ?? 0,
      right.timbre.harmonicBodyLevel ?? 0,
    ],
  } as const;

  return Object.entries(dimensions)
    .map(([key, similarity]) => {
      const values = valueMap[key as keyof typeof valueMap];
      return {
        key,
        similarity,
        leftValue: values?.[0] ?? 0,
        rightValue: values?.[1] ?? 0,
      };
    })
    .sort((left, right) => left.similarity - right.similarity)
    .slice(0, 3);
}
