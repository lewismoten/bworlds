import { hash2D } from '@bworlds/core';

type MusicWaveform = OscillatorType;
type MusicPosition = { x: number; y: number };
type TileKind = string;
type ContextType = string;
type WeatherKind = string;
type InstrumentRole = 'lead' | 'harmony' | 'bass' | 'percussion';
type InstrumentFamily =
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

type MusicRegionThemeId =
  | 'frontier-plains'
  | 'deep-forest'
  | 'coastal-shore'
  | 'town-square'
  | 'ridge-pass'
  | 'cavern-echo'
  | 'interior-hall';

type MusicRegionTheme = {
  id: MusicRegionThemeId;
  rootHz: number;
  scale: number[];
  noteDurationMs: number;
  baseVolume: number;
  stepPattern: number[];
};

export type ProceduralInstrument = {
  id: string;
  role: InstrumentRole;
  family: InstrumentFamily;
  waveform: MusicWaveform;
  attackMs: number;
  releaseMs: number;
  detuneCents: number;
  harmonicGain: number;
  pulseRate: number;
  brightness: number;
};

export type ProceduralInstrumentBank = {
  themeId: MusicRegionThemeId;
  instruments: Record<InstrumentRole, ProceduralInstrument>;
};

type ProceduralInstrumentBankOptions = {
  tileKind?: TileKind;
  contextType?: ContextType;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
  dayProgress?: number;
  yearProgress?: number;
};

type MusicMood = {
  tempoMultiplier: number;
  brightness: number;
  volumeMultiplier: number;
};

type MusicArrangementRoleProfile = {
  volumeMultiplier: number;
  durationMultiplier: number;
  releaseMultiplier: number;
  harmonicGainMultiplier: number;
  pulseRateMultiplier: number;
  brightnessMultiplier: number;
  octaveShiftSemitones?: number;
  waveformOverride?: MusicWaveform;
  skipEvery?: number;
};

type MusicArrangement = {
  roleProfiles: Record<InstrumentRole, MusicArrangementRoleProfile>;
};

type MusicSchedulerState = {
  nextNoteAtMs: number;
  stepIndex: number;
  regionSignature: string;
};

type MusicUpdateSignatureState = {
  ambient: string;
  poi: string;
};

export type ProceduralMusicNote = {
  themeId: MusicRegionThemeId;
  instrumentId: string;
  role: InstrumentRole;
  startMs: number;
  durationMs: number;
  frequency: number;
  volume: number;
  waveform: MusicWaveform;
  attackMs: number;
  releaseMs: number;
  detuneCents: number;
  harmonicGain: number;
  pulseRate: number;
  emitter?: MusicPosition;
  listener?: MusicPosition;
};

export type MusicSink = {
  resume?(): void;
  play(note: ProceduralMusicNote): void;
};

export type MusicController = {
  resume(): void;
  update(options: MusicUpdateOptions): void;
};

export type NearbyPoiMusicLike = {
  tileKind?: TileKind;
  poiType?: string;
  contextType?: ContextType;
  mix: number;
  clusterX?: number;
  clusterY?: number;
  emitter?: MusicPosition;
  listener?: MusicPosition;
};

export type MusicUpdateOptions = {
  nowMs: number;
  tileKind?: TileKind;
  contextType?: ContextType;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
  dayProgress: number;
  yearProgress?: number;
  clusterX?: number;
  clusterY?: number;
  emitter?: MusicPosition;
  listener?: MusicPosition;
  nearbyPoi?: NearbyPoiMusicLike | null;
};

const THEME_LIBRARY: Record<MusicRegionThemeId, MusicRegionTheme> = {
  'frontier-plains': {
    id: 'frontier-plains',
    rootHz: 196,
    scale: [0, 3, 5, 7, 10, 12],
    noteDurationMs: 360,
    baseVolume: 0.028,
    stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
  },
  'deep-forest': {
    id: 'deep-forest',
    rootHz: 174.61,
    scale: [0, 2, 3, 7, 8, 10, 12],
    noteDurationMs: 440,
    baseVolume: 0.026,
    stepPattern: [0, 2, 3, 5, 3, 2, 1, 0],
  },
  'coastal-shore': {
    id: 'coastal-shore',
    rootHz: 220,
    scale: [0, 2, 5, 7, 9, 12],
    noteDurationMs: 420,
    baseVolume: 0.027,
    stepPattern: [0, 2, 4, 5, 4, 2, 0, 2],
  },
  'town-square': {
    id: 'town-square',
    rootHz: 246.94,
    scale: [0, 2, 4, 7, 9, 12],
    noteDurationMs: 300,
    baseVolume: 0.024,
    stepPattern: [0, 2, 4, 5, 4, 2, 5, 4],
  },
  'ridge-pass': {
    id: 'ridge-pass',
    rootHz: 185,
    scale: [0, 3, 5, 6, 10, 12],
    noteDurationMs: 380,
    baseVolume: 0.024,
    stepPattern: [0, 1, 3, 4, 3, 1, 0, 4],
  },
  'cavern-echo': {
    id: 'cavern-echo',
    rootHz: 130.81,
    scale: [0, 3, 5, 7, 8, 12],
    noteDurationMs: 520,
    baseVolume: 0.03,
    stepPattern: [0, 2, 4, 2, 5, 2, 1, 0],
  },
  'interior-hall': {
    id: 'interior-hall',
    rootHz: 233.08,
    scale: [0, 2, 4, 7, 11, 12],
    noteDurationMs: 340,
    baseVolume: 0.022,
    stepPattern: [0, 2, 4, 2, 5, 4, 2, 1],
  },
};

const LOOKAHEAD_MS = 900;
const MUSIC_SCHEDULE_LEAD_MS = 240;
const INSTRUMENT_FAMILY_LIBRARY: Record<
  InstrumentRole,
  readonly InstrumentFamily[]
> = {
  lead: ['vocals', 'lead-guitar', 'violin', 'flute', 'trumpet', 'synth-lead'],
  harmony: ['piano', 'guitar', 'organ', 'strings', 'synth-pad'],
  bass: ['bass-guitar', 'upright-bass', 'bass-synth', 'tuba'],
  percussion: ['kick', 'snare', 'cymbals', 'shaker', 'hand-percussion'],
};

export function resolveMusicTheme(
  tileKind?: TileKind,
  contextType?: ContextType,
  poiType?: string
): MusicRegionTheme {
  const resolvedKind = poiType ?? tileKind;
  if (
    contextType === 'cave' ||
    contextType === 'dungeon' ||
    resolvedKind === 'cave' ||
    resolvedKind === 'dungeon'
  ) {
    return THEME_LIBRARY['cavern-echo'];
  }
  if (
    contextType === 'building' ||
    resolvedKind === 'floor' ||
    resolvedKind === 'shop' ||
    resolvedKind === 'stairsUp' ||
    resolvedKind === 'stairsDown'
  ) {
    return THEME_LIBRARY['interior-hall'];
  }
  if (contextType === 'town' || resolvedKind === 'town') {
    return THEME_LIBRARY['town-square'];
  }
  if (resolvedKind === 'forest') {
    return THEME_LIBRARY['deep-forest'];
  }
  if (
    resolvedKind === 'shore' ||
    resolvedKind === 'dock' ||
    resolvedKind === 'ocean' ||
    resolvedKind === 'ship' ||
    resolvedKind === 'lighthouse'
  ) {
    return THEME_LIBRARY['coastal-shore'];
  }
  if (
    resolvedKind === 'mountain' ||
    resolvedKind === 'observatory' ||
    resolvedKind === 'quarry'
  ) {
    return THEME_LIBRARY['ridge-pass'];
  }
  return THEME_LIBRARY['frontier-plains'];
}

export function resolveMusicMood(options: {
  dayProgress: number;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
}): MusicMood {
  const dayProgress = normalizeWrappedProgress(options.dayProgress);
  const atNight = dayProgress < 0.2 || dayProgress > 0.8;
  const atDawnOrDusk =
    (dayProgress >= 0.18 && dayProgress <= 0.3) ||
    (dayProgress >= 0.7 && dayProgress <= 0.82);
  const rainPenalty =
    options.weatherKind === 'light-rain' || options.weatherKind === 'heavy-rain'
      ? 0.08 + (options.weatherIntensity ?? 0) * 0.08
      : options.weatherKind === 'fog'
        ? 0.06
        : 0;

  return {
    tempoMultiplier: atNight ? 0.82 : atDawnOrDusk ? 0.93 : 1.04 - rainPenalty,
    brightness: atNight ? 0.78 : atDawnOrDusk ? 0.9 : 1.08 - rainPenalty,
    volumeMultiplier:
      options.weatherKind === 'heavy-rain' ? 0.82 : atNight ? 0.88 : 1,
  };
}

export function resolveMusicArrangement(options: {
  dayProgress: number;
  yearProgress?: number;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
}): MusicArrangement {
  const dayProgress = normalizeWrappedProgress(options.dayProgress);
  const season = resolveSeason(options.yearProgress ?? 0);
  const atNight = dayProgress < 0.2 || dayProgress > 0.8;
  const atDawnOrDusk =
    (dayProgress >= 0.18 && dayProgress <= 0.3) ||
    (dayProgress >= 0.7 && dayProgress <= 0.82);
  const heavyWeather =
    options.weatherKind === 'heavy-rain' || (options.weatherIntensity ?? 0) >= 0.85;

  if (season === 'winter') {
    return {
      roleProfiles: {
        lead: {
          volumeMultiplier: 0.92,
          durationMultiplier: 1.16,
          releaseMultiplier: 1.55,
          harmonicGainMultiplier: 1.32,
          pulseRateMultiplier: 0.72,
          brightnessMultiplier: 1.08,
          octaveShiftSemitones: 12,
          waveformOverride: 'triangle',
        },
        harmony: {
          volumeMultiplier: 0.68,
          durationMultiplier: 1.34,
          releaseMultiplier: 1.8,
          harmonicGainMultiplier: 1.4,
          pulseRateMultiplier: 0.62,
          brightnessMultiplier: 1.06,
          octaveShiftSemitones: 12,
          waveformOverride: 'sine',
          skipEvery: 2,
        },
        bass: {
          volumeMultiplier: 0.82,
          durationMultiplier: 1.12,
          releaseMultiplier: 1.24,
          harmonicGainMultiplier: 0.96,
          pulseRateMultiplier: 0.82,
          brightnessMultiplier: 0.94,
        },
        percussion: {
          volumeMultiplier: 0.32,
          durationMultiplier: 0.88,
          releaseMultiplier: 1.22,
          harmonicGainMultiplier: 1.24,
          pulseRateMultiplier: 0.56,
          brightnessMultiplier: 1.02,
          waveformOverride: 'triangle',
          skipEvery: 4,
        },
      },
    };
  }

  if (atNight) {
    return {
      roleProfiles: {
        lead: {
          volumeMultiplier: 0.9,
          durationMultiplier: 1.08,
          releaseMultiplier: 1.35,
          harmonicGainMultiplier: 1.1,
          pulseRateMultiplier: 0.92,
          brightnessMultiplier: 0.92,
        },
        harmony: {
          volumeMultiplier: 0.58,
          durationMultiplier: 1.22,
          releaseMultiplier: 1.7,
          harmonicGainMultiplier: 1.16,
          pulseRateMultiplier: 0.84,
          brightnessMultiplier: 0.82,
        },
        bass: {
          volumeMultiplier: 0.94,
          durationMultiplier: 1.12,
          releaseMultiplier: 1.28,
          harmonicGainMultiplier: 1,
          pulseRateMultiplier: 0.92,
          brightnessMultiplier: 0.88,
        },
        percussion: {
          volumeMultiplier: 0.22,
          durationMultiplier: 0.92,
          releaseMultiplier: 0.88,
          harmonicGainMultiplier: 0.72,
          pulseRateMultiplier: 0.76,
          brightnessMultiplier: 0.76,
          skipEvery: 2,
        },
      },
    };
  }

  if (atDawnOrDusk || heavyWeather) {
    return {
      roleProfiles: {
        lead: {
          volumeMultiplier: 0.96,
          durationMultiplier: 1.02,
          releaseMultiplier: 1.08,
          harmonicGainMultiplier: 1.04,
          pulseRateMultiplier: 0.96,
          brightnessMultiplier: 0.96,
        },
        harmony: {
          volumeMultiplier: 0.84,
          durationMultiplier: 1.12,
          releaseMultiplier: 1.24,
          harmonicGainMultiplier: 1.08,
          pulseRateMultiplier: 0.92,
          brightnessMultiplier: 0.9,
        },
        bass: {
          volumeMultiplier: 0.92,
          durationMultiplier: 1.06,
          releaseMultiplier: 1.1,
          harmonicGainMultiplier: 1,
          pulseRateMultiplier: 0.96,
          brightnessMultiplier: 0.94,
        },
        percussion: {
          volumeMultiplier: 0.72,
          durationMultiplier: 0.96,
          releaseMultiplier: 0.94,
          harmonicGainMultiplier: 0.88,
          pulseRateMultiplier: 0.9,
          brightnessMultiplier: 0.9,
          skipEvery: heavyWeather ? 2 : undefined,
        },
      },
    };
  }

  return {
    roleProfiles: {
      lead: {
        volumeMultiplier: 1,
        durationMultiplier: 1,
        releaseMultiplier: 1,
        harmonicGainMultiplier: 1,
        pulseRateMultiplier: 1,
        brightnessMultiplier: 1,
      },
      harmony: {
        volumeMultiplier: 1,
        durationMultiplier: 1,
        releaseMultiplier: 1,
        harmonicGainMultiplier: 1,
        pulseRateMultiplier: 1,
        brightnessMultiplier: 1,
      },
      bass: {
        volumeMultiplier: 1,
        durationMultiplier: 1,
        releaseMultiplier: 1,
        harmonicGainMultiplier: 1,
        pulseRateMultiplier: 1,
        brightnessMultiplier: 1,
      },
      percussion: {
        volumeMultiplier: 1,
        durationMultiplier: 1,
        releaseMultiplier: 1,
        harmonicGainMultiplier: 1,
        pulseRateMultiplier: 1,
        brightnessMultiplier: 1,
      },
    },
  };
}

export function getMusicRegionSignature(options: {
  tileKind?: TileKind;
  contextType?: ContextType;
  clusterX?: number;
  clusterY?: number;
}): string {
  const theme = resolveMusicTheme(options.tileKind, options.contextType);
  return [
    theme.id,
    options.contextType ?? 'overworld',
    options.clusterX ?? 0,
    options.clusterY ?? 0,
  ].join(':');
}

export function scheduleProceduralMusicNotes(
  options: MusicUpdateOptions,
  previousState?: MusicSchedulerState
): { notes: ProceduralMusicNote[]; state: MusicSchedulerState } {
  return scheduleThemeLayerNotes(
    {
      nowMs: options.nowMs,
      tileKind: options.tileKind,
      contextType: options.contextType,
      dayProgress: options.dayProgress,
      yearProgress: options.yearProgress,
      weatherKind: options.weatherKind,
      weatherIntensity: options.weatherIntensity,
      clusterX: options.clusterX,
      clusterY: options.clusterY,
      emitter: options.emitter,
      listener: options.listener,
      gainMultiplier: 1,
    },
    previousState
  );
}

export function createMusicController(sink: MusicSink): MusicController {
  let ambientSchedulerState: MusicSchedulerState | undefined;
  let poiSchedulerState: MusicSchedulerState | undefined;
  let lastUpdateSignature: MusicUpdateSignatureState | undefined;
  let nextUpdateAtMs = 0;

  return {
    resume() {
      sink.resume?.();
    },
    update(options) {
      const updateSignature = getMusicUpdateSignature(options);
      const signatureChanged =
        !lastUpdateSignature ||
        lastUpdateSignature.ambient !== updateSignature.ambient ||
        lastUpdateSignature.poi !== updateSignature.poi;
      if (!signatureChanged && options.nowMs < nextUpdateAtMs) {
        return;
      }

      const poiMix = clamp(options.nearbyPoi?.mix ?? 0, 0, 1);
      const gains = resolvePoiMusicBlendGains(poiMix);
      const ambientScheduled = scheduleThemeLayerNotes(
        {
          ...options,
          gainMultiplier: gains.ambientGain,
        },
        ambientSchedulerState
      );
      ambientSchedulerState = ambientScheduled.state;
      ambientScheduled.notes.forEach((note) => {
        sink.play(note);
      });

      if (!options.nearbyPoi || poiMix <= 0.001) {
        poiSchedulerState = undefined;
        lastUpdateSignature = updateSignature;
        nextUpdateAtMs = Math.max(
          options.nowMs,
          ambientScheduled.state.nextNoteAtMs - MUSIC_SCHEDULE_LEAD_MS
        );
        return;
      }

      const poiScheduled = scheduleThemeLayerNotes(
        {
          nowMs: options.nowMs,
          tileKind: options.nearbyPoi.tileKind,
          contextType: options.nearbyPoi.contextType,
          poiType: options.nearbyPoi.poiType,
          dayProgress: options.dayProgress,
          yearProgress: options.yearProgress,
          weatherKind: options.weatherKind,
          weatherIntensity: options.weatherIntensity,
          clusterX: options.nearbyPoi.clusterX,
          clusterY: options.nearbyPoi.clusterY,
          emitter: options.nearbyPoi.emitter,
          listener: options.nearbyPoi.listener ?? options.listener,
          gainMultiplier: gains.poiGain,
          signaturePrefix: 'poi',
        },
        poiSchedulerState
      );
      poiSchedulerState = poiScheduled.state;
      poiScheduled.notes.forEach((note) => {
        sink.play(note);
      });
      lastUpdateSignature = updateSignature;
      nextUpdateAtMs = Math.max(
        options.nowMs,
        Math.min(
          ambientScheduled.state.nextNoteAtMs,
          poiScheduled.state.nextNoteAtMs
        ) - MUSIC_SCHEDULE_LEAD_MS
      );
    },
  };
}

export function getMusicUpdateSignature(options: MusicUpdateOptions): MusicUpdateSignatureState {
  return {
    ambient: [
      options.tileKind ?? '',
      options.contextType ?? '',
      Math.round(options.dayProgress * 96),
      Math.round((options.yearProgress ?? 0) * 96),
      options.weatherKind ?? '',
      Math.round((options.weatherIntensity ?? 0) * 10),
      options.clusterX ?? 0,
      options.clusterY ?? 0,
    ].join('|'),
    poi: options.nearbyPoi
      ? [
          options.nearbyPoi.tileKind ?? '',
          options.nearbyPoi.contextType ?? '',
          options.nearbyPoi.poiType ?? '',
          Math.round(options.dayProgress * 96),
          Math.round((options.yearProgress ?? 0) * 96),
          options.weatherKind ?? '',
          Math.round((options.weatherIntensity ?? 0) * 10),
          options.nearbyPoi.clusterX ?? 0,
          options.nearbyPoi.clusterY ?? 0,
          Math.round(clamp(options.nearbyPoi.mix ?? 0, 0, 1) * 100),
        ].join('|')
      : '',
  };
}

type AudioContextCtor = new () => AudioContext;
type StereoPannerNodeLike = StereoPannerNode;

export function createWebAudioMusicSink(): MusicSink {
  let audioContext: AudioContext | null = null;

  function getAudioContext(): AudioContext | null {
    if (audioContext) {
      return audioContext;
    }
    const globalCtor = globalThis as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const ContextCtor = globalCtor.AudioContext ?? globalCtor.webkitAudioContext;
    if (!ContextCtor) {
      return null;
    }
    audioContext = new ContextCtor();
    return audioContext;
  }

  return {
    resume() {
      const context = getAudioContext();
      if (!context || context.state === 'running') {
        return;
      }
      void context.resume();
    },
    play(note) {
      const context = getAudioContext();
      if (!context) {
        return;
      }
      const nowMs = performance.now();
      const spatial = getMusicSpatialMix(note.emitter, note.listener);
  const oscillator = context.createOscillator();
      const harmonicOscillator = context.createOscillator();
      const gain = context.createGain();
      const harmonicGain = context.createGain();
      const panner = typeof context.createStereoPanner === 'function'
        ? (context.createStereoPanner() as StereoPannerNodeLike)
        : null;
      const startAt = context.currentTime + Math.max(0, (note.startMs - nowMs) / 1000);
      const durationSeconds = note.durationMs / 1000;

      oscillator.type = note.waveform;
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      oscillator.detune.setValueAtTime(note.detuneCents, startAt);
      harmonicOscillator.type = note.waveform;
      harmonicOscillator.frequency.setValueAtTime(note.frequency * 2, startAt);
      harmonicOscillator.detune.setValueAtTime(note.detuneCents * 0.5, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(
        note.frequency * (0.985 + note.pulseRate * 0.002),
        startAt + durationSeconds
      );
      harmonicOscillator.frequency.exponentialRampToValueAtTime(
        note.frequency * 2 * (0.992 + note.pulseRate * 0.001),
        startAt + durationSeconds
      );
      gain.gain.setValueAtTime(0.0001, startAt);
      harmonicGain.gain.setValueAtTime(0.0001, startAt);
      const sustainVolume = note.volume * spatial.gainMultiplier;
      gain.gain.exponentialRampToValueAtTime(
        sustainVolume,
        startAt + note.attackMs / 1000
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        sustainVolume * note.harmonicGain,
        startAt + note.attackMs / 1000
      );
      gain.gain.exponentialRampToValueAtTime(
        sustainVolume * 0.74,
        startAt + Math.max(durationSeconds - note.releaseMs / 1000, note.attackMs / 1000)
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        sustainVolume * note.harmonicGain * 0.68,
        startAt + Math.max(durationSeconds - note.releaseMs / 1000, note.attackMs / 1000)
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + durationSeconds
      );
      harmonicGain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + durationSeconds
      );

      oscillator.connect(gain);
      harmonicOscillator.connect(harmonicGain);
      if (panner) {
        panner.pan.setValueAtTime(spatial.pan, startAt);
        gain.connect(panner);
        harmonicGain.connect(panner);
        panner.connect(context.destination);
      } else {
        gain.connect(context.destination);
        harmonicGain.connect(context.destination);
      }

      oscillator.start(startAt);
      harmonicOscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
      harmonicOscillator.stop(startAt + durationSeconds);
    },
  };
}

export function getMusicSpatialMix(
  emitter?: MusicPosition,
  listener?: MusicPosition
): { gainMultiplier: number; pan: number } {
  if (!emitter || !listener) {
    return { gainMultiplier: 1, pan: 0 };
  }
  const deltaX = emitter.x - listener.x;
  const deltaY = emitter.y - listener.y;
  const distance = Math.hypot(deltaX, deltaY);
  return {
    gainMultiplier: 1 / (1 + distance * 0.45),
    pan: clamp(deltaX / 7, -1, 1),
  };
}

export function resolvePoiMusicMix(
  distance: number,
  innerRadius = 1.5,
  outerRadius = 7
): number {
  if (distance <= innerRadius) {
    return 1;
  }
  if (distance >= outerRadius) {
    return 0;
  }
  const normalized = (outerRadius - distance) / (outerRadius - innerRadius);
  return clamp(normalized, 0, 1);
}

export function resolvePoiMusicBlendGains(
  mix: number
): { ambientGain: number; poiGain: number } {
  const clampedMix = clamp(mix, 0, 1);
  return {
    ambientGain: Math.cos((clampedMix * Math.PI) / 2),
    poiGain: Math.sin((clampedMix * Math.PI) / 2),
  };
}

function createThemeNote(options: {
  startMs: number;
  theme: MusicRegionTheme;
  instrumentBank: ProceduralInstrumentBank;
  mood: MusicMood;
  arrangement: MusicArrangement;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  emitter?: MusicPosition;
  listener?: MusicPosition;
}): ProceduralMusicNote {
  const role = selectInstrumentRole(options.stepIndex);
  const instrument = options.instrumentBank.instruments[role];
  const arrangementProfile = options.arrangement.roleProfiles[role];
  const semitones = resolveInstrumentSemitones(
    options.theme,
    role,
    options.stepIndex
  );
  const octaveBoost =
    hash2D(
      `${options.theme.id}:octave`,
      options.clusterX + options.stepIndex,
      options.clusterY
    ) > 0.84
      ? 12
      : 0;
  return {
    themeId: options.theme.id,
    instrumentId: instrument.id,
    role,
    startMs: options.startMs,
    durationMs:
      options.theme.noteDurationMs *
      (role === 'bass'
        ? 1.08
        : role === 'harmony'
          ? 1.18
          : role === 'percussion'
            ? 0.34
            : 0.92) *
      arrangementProfile.durationMultiplier,
    frequency:
      options.theme.rootHz *
      Math.pow(
        2,
        (semitones + octaveBoost + (arrangementProfile.octaveShiftSemitones ?? 0)) / 12
      ) *
      options.mood.brightness *
      arrangementProfile.brightnessMultiplier *
      (role === 'bass'
        ? 0.5
        : role === 'harmony'
          ? 0.76
          : role === 'percussion'
            ? 1.9
            : 1),
    volume:
      options.theme.baseVolume *
      options.mood.volumeMultiplier *
      arrangementProfile.volumeMultiplier *
      (role === 'bass'
        ? 0.86
        : role === 'harmony'
          ? 0.72
          : role === 'percussion'
            ? 0.52
            : 1),
    waveform: arrangementProfile.waveformOverride ?? instrument.waveform,
    attackMs: instrument.attackMs,
    releaseMs: instrument.releaseMs * arrangementProfile.releaseMultiplier,
    detuneCents: instrument.detuneCents,
    harmonicGain: instrument.harmonicGain * arrangementProfile.harmonicGainMultiplier,
    pulseRate: instrument.pulseRate * arrangementProfile.pulseRateMultiplier,
    emitter: options.emitter,
    listener: options.listener,
  };
}

function scheduleThemeLayerNotes(
  options: {
    nowMs: number;
    tileKind?: TileKind;
    contextType?: ContextType;
    poiType?: string;
    weatherKind?: WeatherKind;
    weatherIntensity?: number;
    dayProgress: number;
    yearProgress?: number;
    clusterX?: number;
    clusterY?: number;
    emitter?: MusicPosition;
    listener?: MusicPosition;
    gainMultiplier: number;
    signaturePrefix?: string;
  },
  previousState?: MusicSchedulerState
): { notes: ProceduralMusicNote[]; state: MusicSchedulerState } {
  const theme = resolveMusicTheme(
    options.tileKind,
    options.contextType,
    options.poiType
  );
  const instrumentBank = createProceduralInstrumentBank(
    theme,
    options.clusterX ?? 0,
    options.clusterY ?? 0
  );
  const mood = resolveMusicMood({
    dayProgress: options.dayProgress,
    weatherKind: options.weatherKind,
    weatherIntensity: options.weatherIntensity,
  });
  const arrangement = resolveMusicArrangement({
    dayProgress: options.dayProgress,
    yearProgress: options.yearProgress,
    weatherKind: options.weatherKind,
    weatherIntensity: options.weatherIntensity,
  });
  const regionSignature = [
    options.signaturePrefix ?? 'ambient',
    getMusicRegionSignature({
      tileKind: options.tileKind ?? options.poiType,
      contextType: options.contextType,
      clusterX: options.clusterX,
      clusterY: options.clusterY,
    }),
  ].join(':');
  const clusterX = options.clusterX ?? 0;
  const clusterY = options.clusterY ?? 0;
  let stepIndex =
    previousState?.regionSignature === regionSignature ? previousState.stepIndex : 0;
  let nextNoteAtMs =
    previousState?.regionSignature === regionSignature
      ? Math.max(previousState.nextNoteAtMs, options.nowMs)
      : options.nowMs;
  const notes: ProceduralMusicNote[] = [];

  while (nextNoteAtMs < options.nowMs + LOOKAHEAD_MS) {
    const role = selectInstrumentRole(stepIndex);
    const arrangementProfile = arrangement.roleProfiles[role];
    const shouldSkipRole =
      typeof arrangementProfile.skipEvery === 'number' &&
      arrangementProfile.skipEvery > 1 &&
      stepIndex % arrangementProfile.skipEvery === 0;

    const note = createThemeNote({
      startMs: nextNoteAtMs,
      theme,
      instrumentBank,
      mood,
      arrangement,
      stepIndex,
      clusterX,
      clusterY,
      emitter: options.emitter,
      listener: options.listener,
    });
    if (!shouldSkipRole) {
      notes.push({
        ...note,
        volume: note.volume * options.gainMultiplier,
      });
    }
    nextNoteAtMs += theme.noteDurationMs / mood.tempoMultiplier;
    stepIndex += 1;
  }

  return {
    notes,
    state: {
      nextNoteAtMs,
      stepIndex,
      regionSignature,
    },
  };
}

export function createProceduralInstrumentBank(
  theme: MusicRegionTheme,
  clusterX: number,
  clusterY: number,
  options?: ProceduralInstrumentBankOptions
): ProceduralInstrumentBank {
  return {
    themeId: theme.id,
    instruments: {
      lead: createProceduralInstrument(theme, 'lead', clusterX, clusterY, options),
      harmony: createProceduralInstrument(theme, 'harmony', clusterX, clusterY, options),
      bass: createProceduralInstrument(theme, 'bass', clusterX, clusterY, options),
      percussion: createProceduralInstrument(theme, 'percussion', clusterX, clusterY, options),
    },
  };
}

function createProceduralInstrument(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  clusterX: number,
  clusterY: number,
  options?: ProceduralInstrumentBankOptions
): ProceduralInstrument {
  const seedKey = `${theme.id}:${role}`;
  const family = resolveInstrumentFamily(theme, role, clusterX, clusterY, options);
  const waveformOptions: Record<InstrumentRole, MusicWaveform[]> = {
    lead: ['triangle', 'sine', 'sawtooth'],
    harmony: ['triangle', 'sawtooth', 'square'],
    bass: ['sine', 'triangle', 'square'],
    percussion: ['square', 'sawtooth', 'triangle'],
  };
  const waveformList = waveformOptions[role];
  const waveform =
    waveformList[
      Math.floor(hash2D(`${seedKey}:waveform`, clusterX, clusterY) * waveformList.length)
    ] ?? waveformList[0];
  const attackMsBase =
    role === 'lead' ? 28 : role === 'bass' ? 36 : role === 'harmony' ? 52 : 8;
  const releaseMsBase =
    role === 'lead' ? 130 : role === 'bass' ? 180 : role === 'harmony' ? 220 : 48;
  return {
    id: `${theme.id}:${role}:${clusterX}:${clusterY}`,
    role,
    family,
    waveform,
    attackMs: attackMsBase + Math.round(hash2D(`${seedKey}:attack`, clusterX, clusterY) * 24),
    releaseMs:
      releaseMsBase + Math.round(hash2D(`${seedKey}:release`, clusterX, clusterY) * 40),
    detuneCents:
      (hash2D(`${seedKey}:detune`, clusterX, clusterY) - 0.5) *
      (role === 'percussion' ? 10 : 16),
    harmonicGain:
      0.12 +
      hash2D(`${seedKey}:harmonics`, clusterX, clusterY) *
        (role === 'bass' ? 0.16 : role === 'percussion' ? 0.08 : 0.28),
    pulseRate:
      0.6 +
      hash2D(`${seedKey}:pulse`, clusterX, clusterY) *
        (role === 'percussion' ? 3.2 : role === 'harmony' ? 1.1 : 1.4),
    brightness:
      0.82 + hash2D(`${seedKey}:brightness`, clusterX, clusterY) * 0.34,
  };
}

function resolveInstrumentFamily(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  clusterX: number,
  clusterY: number,
  options?: ProceduralInstrumentBankOptions
): InstrumentFamily {
  const families = resolveInstrumentFamilyPool(theme, role, options);
  const familyContextKey = resolveInstrumentFamilyContextKey(theme, role, options);
  const index = Math.floor(
    hash2D(`${theme.id}:${role}:family:${familyContextKey}`, clusterX, clusterY) *
      families.length
  );
  return families[index] ?? families[0];
}

function resolveInstrumentFamilyPool(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  options?: ProceduralInstrumentBankOptions
): readonly InstrumentFamily[] {
  const season = resolveSeason(options?.yearProgress ?? 0.25);
  const normalizedDayProgress = normalizeWrappedProgress(options?.dayProgress ?? 0.5);
  const atNight = normalizedDayProgress < 0.2 || normalizedDayProgress > 0.8;
  const weatherBand =
    options?.weatherKind === 'heavy-rain' || (options?.weatherIntensity ?? 0) >= 0.8
      ? 'storm'
      : options?.weatherKind === 'light-rain' || options?.weatherKind === 'fog'
        ? 'soft-weather'
        : 'clear';
  const locationBand =
    options?.contextType ??
    options?.tileKind ??
    (theme.id === 'town-square'
      ? 'town'
      : theme.id === 'cavern-echo'
        ? 'cave'
        : theme.id === 'interior-hall'
          ? 'interior'
          : 'overworld');

  if (role === 'lead') {
    if (season === 'winter') {
      return ['violin', 'flute', 'trumpet', 'synth-lead'];
    }
    if (atNight) {
      return ['flute', 'violin', 'synth-lead', 'vocals'];
    }
    if (locationBand === 'town' || locationBand === 'interior') {
      return ['vocals', 'flute', 'trumpet', 'lead-guitar'];
    }
  }
  if (role === 'harmony') {
    if (locationBand === 'town' || locationBand === 'interior') {
      return ['piano', 'guitar', 'organ'];
    }
    if (weatherBand !== 'clear') {
      return ['organ', 'strings', 'synth-pad'];
    }
    return ['strings', 'synth-pad', 'guitar'];
  }
  if (role === 'bass') {
    if (season === 'winter') {
      return ['upright-bass', 'tuba', 'bass-synth'];
    }
    if (locationBand === 'cave') {
      return ['upright-bass', 'tuba'];
    }
  }
  if (role === 'percussion') {
    if (weatherBand === 'storm') {
      return ['snare', 'cymbals', 'hand-percussion'];
    }
    if (atNight) {
      return ['shaker', 'hand-percussion', 'cymbals'];
    }
  }
  return INSTRUMENT_FAMILY_LIBRARY[role];
}

function resolveInstrumentFamilyContextKey(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  options?: ProceduralInstrumentBankOptions
): string {
  const season = resolveSeason(options?.yearProgress ?? 0.25);
  const normalizedDayProgress = normalizeWrappedProgress(options?.dayProgress ?? 0.5);
  const dayPhase =
    normalizedDayProgress < 0.2 || normalizedDayProgress > 0.8
      ? 'night'
      : normalizedDayProgress < 0.32 || normalizedDayProgress > 0.68
        ? 'twilight'
        : 'day';
  const weatherBand =
    options?.weatherKind === 'heavy-rain' || (options?.weatherIntensity ?? 0) >= 0.8
      ? 'storm'
      : options?.weatherKind === 'light-rain' || options?.weatherKind === 'fog'
        ? 'soft-weather'
        : 'clear';
  const locationBand =
    options?.contextType ??
    options?.tileKind ??
    (theme.id === 'town-square'
      ? 'town'
      : theme.id === 'cavern-echo'
        ? 'cave'
        : theme.id === 'interior-hall'
          ? 'interior'
          : 'overworld');

  if (role === 'lead') {
    if (season === 'winter') {
      return `${locationBand}:winter-bells`;
    }
    if (dayPhase === 'night') {
      return `${locationBand}:night-air`;
    }
  }
  if (role === 'harmony') {
    if (locationBand === 'town' || locationBand === 'interior') {
      return `${locationBand}:settled`;
    }
    if (weatherBand !== 'clear') {
      return `${locationBand}:${weatherBand}`;
    }
  }
  if (role === 'bass') {
    if (season === 'winter') {
      return `${locationBand}:winter-foundation`;
    }
    if (locationBand === 'cave') {
      return 'cave:depth';
    }
  }
  if (role === 'percussion') {
    if (weatherBand === 'storm') {
      return `${locationBand}:storm-kit`;
    }
    if (dayPhase === 'night') {
      return `${locationBand}:night-rhythm`;
    }
  }
  return `${locationBand}:${dayPhase}:${season}:${weatherBand}`;
}

function selectInstrumentRole(stepIndex: number): InstrumentRole {
  const phase = stepIndex % 8;
  if (phase === 0 || phase === 4) {
    return 'bass';
  }
  if (phase === 1 || phase === 5) {
    return 'harmony';
  }
  if (phase === 2 || phase === 6) {
    return 'lead';
  }
  return 'percussion';
}

function resolveInstrumentSemitones(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  stepIndex: number
): number {
  const patternIndex =
    theme.stepPattern[stepIndex % theme.stepPattern.length] ?? 0;
  const scaleIndex = patternIndex % theme.scale.length;
  const leadSemitones = theme.scale[scaleIndex] ?? 0;

  if (role === 'bass') {
    return theme.scale[0] ?? 0;
  }
  if (role === 'harmony') {
    const harmonyIndex =
      (patternIndex + 2 + Math.floor(stepIndex / theme.stepPattern.length)) %
      theme.scale.length;
    return theme.scale[harmonyIndex] ?? leadSemitones;
  }
  if (role === 'percussion') {
    return [0, 7, 12, 3][stepIndex % 4] ?? 0;
  }
  return leadSemitones;
}

function normalizeWrappedProgress(value: number): number {
  return ((value % 1) + 1) % 1;
}

function resolveSeason(
  yearProgress: number
): 'winter' | 'spring' | 'summer' | 'autumn' {
  const normalizedYearProgress = normalizeWrappedProgress(yearProgress);
  if (normalizedYearProgress < 0.125 || normalizedYearProgress >= 0.875) {
    return 'winter';
  }
  if (normalizedYearProgress < 0.375) {
    return 'spring';
  }
  if (normalizedYearProgress < 0.625) {
    return 'summer';
  }
  return 'autumn';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
