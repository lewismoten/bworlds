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
};

type InstrumentTimbreTemplate = {
  harmonicWaveform: MusicWaveform;
  harmonicRatio: number;
  filterType: BiquadFilterType;
  cutoffMinHz: number;
  cutoffMaxHz: number;
  qMin: number;
  qMax: number;
};

const INSTRUMENT_TIMBRE_TEMPLATES: Record<
  InstrumentFamily,
  InstrumentTimbreTemplate
> = {
  vocals: {
    harmonicWaveform: 'triangle',
    harmonicRatio: 2,
    filterType: 'bandpass',
    cutoffMinHz: 900,
    cutoffMaxHz: 2100,
    qMin: 0.8,
    qMax: 2.2,
  },
  'lead-guitar': {
    harmonicWaveform: 'square',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 1800,
    cutoffMaxHz: 3800,
    qMin: 0.7,
    qMax: 1.8,
  },
  violin: {
    harmonicWaveform: 'sawtooth',
    harmonicRatio: 2,
    filterType: 'bandpass',
    cutoffMinHz: 1400,
    cutoffMaxHz: 3200,
    qMin: 0.9,
    qMax: 2.4,
  },
  flute: {
    harmonicWaveform: 'sine',
    harmonicRatio: 2,
    filterType: 'highpass',
    cutoffMinHz: 600,
    cutoffMaxHz: 1400,
    qMin: 0.5,
    qMax: 1.4,
  },
  trumpet: {
    harmonicWaveform: 'square',
    harmonicRatio: 3,
    filterType: 'bandpass',
    cutoffMinHz: 1200,
    cutoffMaxHz: 2800,
    qMin: 0.7,
    qMax: 1.9,
  },
  'synth-lead': {
    harmonicWaveform: 'sawtooth',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 2200,
    cutoffMaxHz: 5600,
    qMin: 0.4,
    qMax: 1.3,
  },
  piano: {
    harmonicWaveform: 'triangle',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 1200,
    cutoffMaxHz: 3000,
    qMin: 0.5,
    qMax: 1.2,
  },
  guitar: {
    harmonicWaveform: 'square',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 1500,
    cutoffMaxHz: 3200,
    qMin: 0.5,
    qMax: 1.6,
  },
  organ: {
    harmonicWaveform: 'square',
    harmonicRatio: 1,
    filterType: 'lowpass',
    cutoffMinHz: 900,
    cutoffMaxHz: 1800,
    qMin: 0.3,
    qMax: 0.8,
  },
  strings: {
    harmonicWaveform: 'sawtooth',
    harmonicRatio: 2,
    filterType: 'bandpass',
    cutoffMinHz: 1000,
    cutoffMaxHz: 2400,
    qMin: 0.8,
    qMax: 2,
  },
  'synth-pad': {
    harmonicWaveform: 'triangle',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 700,
    cutoffMaxHz: 1600,
    qMin: 0.2,
    qMax: 0.8,
  },
  'bass-guitar': {
    harmonicWaveform: 'square',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 260,
    cutoffMaxHz: 620,
    qMin: 0.4,
    qMax: 1.1,
  },
  'upright-bass': {
    harmonicWaveform: 'triangle',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 180,
    cutoffMaxHz: 460,
    qMin: 0.4,
    qMax: 1,
  },
  'bass-synth': {
    harmonicWaveform: 'sawtooth',
    harmonicRatio: 2,
    filterType: 'lowpass',
    cutoffMinHz: 320,
    cutoffMaxHz: 900,
    qMin: 0.6,
    qMax: 1.4,
  },
  tuba: {
    harmonicWaveform: 'triangle',
    harmonicRatio: 1,
    filterType: 'bandpass',
    cutoffMinHz: 220,
    cutoffMaxHz: 520,
    qMin: 0.7,
    qMax: 1.6,
  },
  kick: {
    harmonicWaveform: 'sine',
    harmonicRatio: 0.5,
    filterType: 'lowpass',
    cutoffMinHz: 90,
    cutoffMaxHz: 180,
    qMin: 0.6,
    qMax: 1.2,
  },
  snare: {
    harmonicWaveform: 'square',
    harmonicRatio: 2.4,
    filterType: 'bandpass',
    cutoffMinHz: 900,
    cutoffMaxHz: 2400,
    qMin: 1.4,
    qMax: 3,
  },
  cymbals: {
    harmonicWaveform: 'square',
    harmonicRatio: 6,
    filterType: 'highpass',
    cutoffMinHz: 2600,
    cutoffMaxHz: 5600,
    qMin: 0.8,
    qMax: 2.1,
  },
  shaker: {
    harmonicWaveform: 'triangle',
    harmonicRatio: 4,
    filterType: 'highpass',
    cutoffMinHz: 1800,
    cutoffMaxHz: 4200,
    qMin: 0.9,
    qMax: 2.4,
  },
  'hand-percussion': {
    harmonicWaveform: 'square',
    harmonicRatio: 3,
    filterType: 'bandpass',
    cutoffMinHz: 700,
    cutoffMaxHz: 1800,
    qMin: 1,
    qMax: 2.3,
  },
};

export function resolveProceduralInstrumentTimbre(options: {
  family: InstrumentFamily;
  brightness: number;
  harmonicSignal: number;
  filterSignal: number;
}): ProceduralInstrumentTimbre {
  const template = INSTRUMENT_TIMBRE_TEMPLATES[options.family];
  const brightness = clamp(options.brightness, 0.5, 1.4);
  const cutoffBase = interpolate(
    template.cutoffMinHz,
    template.cutoffMaxHz,
    clamp(options.filterSignal, 0, 1)
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
  };
}

function interpolate(min: number, max: number, signal: number): number {
  return min + (max - min) * signal;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
