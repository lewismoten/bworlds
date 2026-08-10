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
  noiseMix?: number;
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

type InstrumentTimbreTemplate = {
  harmonicWaveform: MusicWaveform;
  harmonicRatio: number;
  filterType: BiquadFilterType;
  cutoffMinHz: number;
  cutoffMaxHz: number;
  qMin: number;
  qMax: number;
  noiseMix?: number;
  noiseFilterType?: BiquadFilterType;
  noiseCutoffMinHz?: number;
  noiseCutoffMaxHz?: number;
  noiseQMin?: number;
  noiseQMax?: number;
};

const INSTRUMENT_PATCH_RECIPES: Record<InstrumentFamily, InstrumentPatchRecipe> =
  {
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
      harmonicWaveform: 'square',
      harmonicRatio: 2.4,
      filterType: 'bandpass',
      cutoffMinHz: 900,
      cutoffMaxHz: 2400,
      qMin: 1.4,
      qMax: 3,
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

export function resolveInstrumentPatchRecipe(
  family: InstrumentFamily
): InstrumentPatchRecipe {
  return INSTRUMENT_PATCH_RECIPES[family];
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
          template.noiseMix * (0.92 + clamp(options.harmonicSignal, 0, 1) * 0.16),
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
    noiseMix,
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

function interpolate(min: number, max: number, signal: number): number {
  return min + (max - min) * signal;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
