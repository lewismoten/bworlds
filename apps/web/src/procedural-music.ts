import { hash2D } from '@bworlds/core';

type MusicWaveform = OscillatorType;
type MusicPosition = { x: number; y: number };
type TileKind = string;
type ContextType = string;
type WeatherKind = string;

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
  waveform: MusicWaveform;
  noteDurationMs: number;
  baseVolume: number;
  stepPattern: number[];
};

type MusicMood = {
  tempoMultiplier: number;
  brightness: number;
  volumeMultiplier: number;
};

type MusicSchedulerState = {
  nextNoteAtMs: number;
  stepIndex: number;
  regionSignature: string;
};

export type ProceduralMusicNote = {
  themeId: MusicRegionThemeId;
  startMs: number;
  durationMs: number;
  frequency: number;
  volume: number;
  waveform: MusicWaveform;
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

export type MusicUpdateOptions = {
  nowMs: number;
  tileKind?: TileKind;
  contextType?: ContextType;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
  dayProgress: number;
  clusterX?: number;
  clusterY?: number;
  emitter?: MusicPosition;
  listener?: MusicPosition;
};

const THEME_LIBRARY: Record<MusicRegionThemeId, MusicRegionTheme> = {
  'frontier-plains': {
    id: 'frontier-plains',
    rootHz: 196,
    scale: [0, 3, 5, 7, 10, 12],
    waveform: 'triangle',
    noteDurationMs: 360,
    baseVolume: 0.028,
    stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
  },
  'deep-forest': {
    id: 'deep-forest',
    rootHz: 174.61,
    scale: [0, 2, 3, 7, 8, 10, 12],
    waveform: 'sine',
    noteDurationMs: 440,
    baseVolume: 0.026,
    stepPattern: [0, 2, 3, 5, 3, 2, 1, 0],
  },
  'coastal-shore': {
    id: 'coastal-shore',
    rootHz: 220,
    scale: [0, 2, 5, 7, 9, 12],
    waveform: 'triangle',
    noteDurationMs: 420,
    baseVolume: 0.027,
    stepPattern: [0, 2, 4, 5, 4, 2, 0, 2],
  },
  'town-square': {
    id: 'town-square',
    rootHz: 246.94,
    scale: [0, 2, 4, 7, 9, 12],
    waveform: 'square',
    noteDurationMs: 300,
    baseVolume: 0.024,
    stepPattern: [0, 2, 4, 5, 4, 2, 5, 4],
  },
  'ridge-pass': {
    id: 'ridge-pass',
    rootHz: 185,
    scale: [0, 3, 5, 6, 10, 12],
    waveform: 'sawtooth',
    noteDurationMs: 380,
    baseVolume: 0.024,
    stepPattern: [0, 1, 3, 4, 3, 1, 0, 4],
  },
  'cavern-echo': {
    id: 'cavern-echo',
    rootHz: 130.81,
    scale: [0, 3, 5, 7, 8, 12],
    waveform: 'sine',
    noteDurationMs: 520,
    baseVolume: 0.03,
    stepPattern: [0, 2, 4, 2, 5, 2, 1, 0],
  },
  'interior-hall': {
    id: 'interior-hall',
    rootHz: 233.08,
    scale: [0, 2, 4, 7, 11, 12],
    waveform: 'triangle',
    noteDurationMs: 340,
    baseVolume: 0.022,
    stepPattern: [0, 2, 4, 2, 5, 4, 2, 1],
  },
};

const LOOKAHEAD_MS = 900;

export function resolveMusicTheme(
  tileKind?: TileKind,
  contextType?: ContextType
): MusicRegionTheme {
  if (contextType === 'cave' || contextType === 'dungeon') {
    return THEME_LIBRARY['cavern-echo'];
  }
  if (
    contextType === 'building' ||
    tileKind === 'floor' ||
    tileKind === 'shop' ||
    tileKind === 'stairsUp' ||
    tileKind === 'stairsDown'
  ) {
    return THEME_LIBRARY['interior-hall'];
  }
  if (contextType === 'town' || tileKind === 'town') {
    return THEME_LIBRARY['town-square'];
  }
  if (tileKind === 'forest') {
    return THEME_LIBRARY['deep-forest'];
  }
  if (tileKind === 'shore' || tileKind === 'dock' || tileKind === 'ocean') {
    return THEME_LIBRARY['coastal-shore'];
  }
  if (tileKind === 'mountain' || tileKind === 'observatory') {
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
  const theme = resolveMusicTheme(options.tileKind, options.contextType);
  const mood = resolveMusicMood({
    dayProgress: options.dayProgress,
    weatherKind: options.weatherKind,
    weatherIntensity: options.weatherIntensity,
  });
  const regionSignature = getMusicRegionSignature(options);
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
    const note = createThemeNote({
      startMs: nextNoteAtMs,
      theme,
      mood,
      stepIndex,
      clusterX,
      clusterY,
      emitter: options.emitter,
      listener: options.listener,
    });
    notes.push(note);
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

export function createMusicController(sink: MusicSink): MusicController {
  let schedulerState: MusicSchedulerState | undefined;

  return {
    resume() {
      sink.resume?.();
    },
    update(options) {
      const scheduled = scheduleProceduralMusicNotes(options, schedulerState);
      schedulerState = scheduled.state;
      scheduled.notes.forEach((note) => {
        sink.play(note);
      });
    },
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
      const gain = context.createGain();
      const panner = typeof context.createStereoPanner === 'function'
        ? (context.createStereoPanner() as StereoPannerNodeLike)
        : null;
      const startAt = context.currentTime + Math.max(0, (note.startMs - nowMs) / 1000);
      const durationSeconds = note.durationMs / 1000;

      oscillator.type = note.waveform;
      oscillator.frequency.setValueAtTime(note.frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(
        note.frequency * 0.985,
        startAt + durationSeconds
      );
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        note.volume * spatial.gainMultiplier,
        startAt + durationSeconds * 0.12
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + durationSeconds
      );

      oscillator.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(spatial.pan, startAt);
        gain.connect(panner);
        panner.connect(context.destination);
      } else {
        gain.connect(context.destination);
      }

      oscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
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

function createThemeNote(options: {
  startMs: number;
  theme: MusicRegionTheme;
  mood: MusicMood;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  emitter?: MusicPosition;
  listener?: MusicPosition;
}): ProceduralMusicNote {
  const patternIndex =
    options.theme.stepPattern[
      options.stepIndex % options.theme.stepPattern.length
    ] ?? 0;
  const scaleIndex = patternIndex % options.theme.scale.length;
  const semitones = options.theme.scale[scaleIndex] ?? 0;
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
    startMs: options.startMs,
    durationMs: options.theme.noteDurationMs * 0.92,
    frequency:
      options.theme.rootHz *
      Math.pow(2, (semitones + octaveBoost) / 12) *
      options.mood.brightness,
    volume: options.theme.baseVolume * options.mood.volumeMultiplier,
    waveform: options.theme.waveform,
    emitter: options.emitter,
    listener: options.listener,
  };
}

function normalizeWrappedProgress(value: number): number {
  return ((value % 1) + 1) % 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
