import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  registerHashSeeds,
} from '@bworlds/core/hash';
import {
  resolveProceduralCompositionStep,
  resolveProceduralHarmonyVoicing,
  resolveProceduralInstrumentSemitones,
} from './procedural-music-harmony.ts';
import {
  compareInstrumentPatches,
  type InstrumentPatchSimilarity,
  resolveInstrumentPatchRecipe,
  resolveProceduralInstrumentTimbre,
  resolveRegisterShapedInstrumentTimbre,
  resolveVelocityShapedInstrumentTimbre,
  type InstrumentFamily,
  type MusicWaveform,
  type ProceduralInstrumentTimbre,
} from './music-instrument-timbres.ts';
import {
  resolveMusicThemeVocabulary,
  type MusicRegionThemeId,
  type MusicThemeVocabulary,
} from './procedural-music-vocabulary.ts';
import {
  resolveProceduralThemeMotif,
  type ProceduralThemeMotif,
} from './procedural-music-theme-motif.ts';
import { resolveProceduralMusicLocationMemory } from './procedural-music-location-memory.ts';
import { applyGentleProceduralMusicCompression } from './procedural-music-dynamics.ts';
import { normalizeProceduralMusicLoudness } from './procedural-music-loudness.ts';
import { resolveProceduralMeterAccent } from './procedural-music-meter.ts';
import { createProceduralPercussionNotes } from './procedural-music-percussion.ts';
import { resolveProceduralTrackContext } from './procedural-music-track-context.ts';
import {
  resolveMusicSpaceProfile,
  type MusicSpaceProfile,
} from './procedural-music-space.ts';
import { shouldUsePhraseBoundaryRest } from './procedural-music-rest-pattern.ts';
import {
  normalizeProceduralLeadSemitones,
  resolveProceduralNoteFrequency,
  resolveProceduralNoteHarmonicGain,
  resolveProceduralNoteVelocity,
} from './procedural-music-note-shaping.ts';
import { resolveProceduralRhythmicGridStep } from './procedural-music-rhythm-grid.ts';
import { resolveProceduralRootMidiNote } from './procedural-music-scale.ts';
import {
  PROCEDURAL_MODE_FORMAL_MAJOR,
  PROCEDURAL_MODE_HOLLOW_MINOR,
  PROCEDURAL_MODE_JAGGED_MINOR,
  PROCEDURAL_MODE_MAJOR_PENTATONIC,
  PROCEDURAL_MODE_MIXOLYDIAN,
  PROCEDURAL_MODE_NATURAL_MINOR,
  PROCEDURAL_MODE_SUSPENDED_PENTATONIC,
} from './procedural-music-modes.ts';
type MusicPosition = { x: number; y: number };
type TileKind = string;
type ContextType = string;
type WeatherKind = string;
type InstrumentRole = 'lead' | 'harmony' | 'bass' | 'percussion';
export type MusicEncounterMode = 'ambient' | 'battle' | 'boss';
export type ProceduralInstrumentRole = InstrumentRole;
type NonPercussionInstrumentRole = Exclude<InstrumentRole, 'percussion'>;

export type SoundBankInstrumentNoteRange = {
  minMidiNote: number;
  maxMidiNote: number;
};

export type SoundBankInstrumentDefinition = {
  id: string;
  role: ProceduralInstrumentRole;
  generalMidiProgramNumber: number | null;
  generalMidiInstrumentName: string;
  generalMidiFamilyName: string;
  supportedRoles: readonly ProceduralInstrumentRole[];
  recommendedMidiRange: SoundBankInstrumentNoteRange;
  preferredMidiRange: SoundBankInstrumentNoteRange;
  defaultVelocity: number;
  defaultNoteDurationMs: number;
};

type MusicRegionTheme = {
  id: MusicRegionThemeId;
  rootHz: number;
  rootMidiNote: number;
  scale: number[];
  noteDurationMs: number;
  baseVolume: number;
  stepPattern: number[];
  rhythmPattern: number[];
  vocabulary: MusicThemeVocabulary;
  motif: ProceduralThemeMotif;
};

const MUSIC_THEME_SEEDS = registerHashSeeds([
  'frontier-plains',
  'deep-forest',
  'coastal-shore',
  'town-square',
  'ridge-pass',
  'cavern-echo',
  'interior-hall',
] as const);
const MUSIC_ROLE_SEEDS = registerHashSeeds([
  'lead',
  'harmony',
  'bass',
  'percussion',
] as const);
const MUSIC_PROPERTY_SEEDS = registerHashSeeds([
  'octave',
  'waveform',
  'attack',
  'release',
  'detune',
  'harmonics',
  'pulse',
  'brightness',
  'family',
  'rest',
] as const);
const musicContextSeedCache = new Map<string, number>();

export type ProceduralInstrument = {
  id: string;
  role: ProceduralInstrumentRole;
  family: InstrumentFamily;
  waveform: MusicWaveform;
  timbre: ProceduralInstrumentTimbre;
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
  rolePatchDistinctness: ProceduralInstrumentRolePatchDistinctness;
};

export type ProceduralInstrumentRolePatchComparison =
  InstrumentPatchSimilarity &
    Readonly<{
      leftRole: NonPercussionInstrumentRole;
      rightRole: NonPercussionInstrumentRole;
    }>;

export type ProceduralInstrumentRolePatchDistinctness = Readonly<{
  isValid: boolean;
  rejectedComparisons: readonly ProceduralInstrumentRolePatchComparison[];
  comparisons: readonly ProceduralInstrumentRolePatchComparison[];
}>;

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

const ROLE_PATCH_SIMILARITY_REJECTION_THRESHOLD = 0.94;

function getMusicContextSeed(label: string): number {
  const cached = musicContextSeedCache.get(label);
  if (cached !== undefined) {
    return cached;
  }

  const seed = registerHashLabel(label);
  musicContextSeedCache.set(label, seed);
  return seed;
}

function getThemeSeed(themeId: MusicRegionThemeId): number {
  return MUSIC_THEME_SEEDS[themeId];
}

function getThemeRoleSeed(
  themeId: MusicRegionThemeId,
  role: InstrumentRole
): number {
  return appendHashSeedLabel(getThemeSeed(themeId), MUSIC_ROLE_SEEDS[role]);
}

function getThemePropertySeed(
  themeId: MusicRegionThemeId,
  property: keyof typeof MUSIC_PROPERTY_SEEDS
): number {
  return appendHashSeedLabel(
    getThemeSeed(themeId),
    MUSIC_PROPERTY_SEEDS[property]
  );
}

function getRolePropertySeed(
  themeId: MusicRegionThemeId,
  role: InstrumentRole,
  property: keyof typeof MUSIC_PROPERTY_SEEDS
): number {
  return appendHashSeedLabel(
    getThemeRoleSeed(themeId, role),
    MUSIC_PROPERTY_SEEDS[property]
  );
}

function getRoleContextPropertySeed(
  themeId: MusicRegionThemeId,
  role: InstrumentRole,
  property: keyof typeof MUSIC_PROPERTY_SEEDS,
  contextLabel: string
): number {
  return appendHashSeedLabel(
    getRolePropertySeed(themeId, role, property),
    getMusicContextSeed(contextLabel)
  );
}

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
  lastLeadSemitones: number | null;
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
  velocity?: number;
  waveform: MusicWaveform;
  timbre: ProceduralInstrumentTimbre;
  attackMs: number;
  releaseMs: number;
  detuneCents: number;
  harmonicGain: number;
  pulseRate: number;
  space?: MusicSpaceProfile;
  emitter?: MusicPosition;
  listener?: MusicPosition;
};

export type MusicSink = {
  getAudioState?(): AudioContextState | 'idle' | 'unavailable';
  getAudioSampleRate?(): number | null;
  getOutputLatencySeconds?(): number | null;
  getMasterGain?(): number;
  setMasterGain?(value: number): number;
  isMuted?(): boolean;
  setMuted?(value: boolean): boolean;
  resume?(): void;
  play(note: ProceduralMusicNote): void;
  stopAll?(): void;
  dispose?(): void;
  getActiveSourceCount?(): number;
};

export type MusicController = {
  resume(): void;
  stopAll(): void;
  getActiveSourceCount(): number;
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
  combatIntensity?: number;
  prioritySoundIntensity?: number;
  dialogueIntensity?: number;
  encounterMode?: MusicEncounterMode;
  dayProgress: number;
  yearProgress?: number;
  clusterX?: number;
  clusterY?: number;
  allowLeadAccidentals?: boolean;
  emitter?: MusicPosition;
  listener?: MusicPosition;
  nearbyPoi?: NearbyPoiMusicLike | null;
};

const THEME_LIBRARY: Record<MusicRegionThemeId, MusicRegionTheme> = {
  'frontier-plains': {
    id: 'frontier-plains',
    rootHz: 196,
    rootMidiNote: resolveProceduralRootMidiNote(196),
    scale: [...PROCEDURAL_MODE_MIXOLYDIAN],
    noteDurationMs: 360,
    baseVolume: 0.028,
    stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
    rhythmPattern: [1, 0.75, 1.25, 1, 1.5, 0.75, 1, 1.25],
    vocabulary: resolveMusicThemeVocabulary('frontier-plains'),
    motif: resolveProceduralThemeMotif({ themeId: 'frontier-plains' }),
  },
  'deep-forest': {
    id: 'deep-forest',
    rootHz: 174.61,
    rootMidiNote: resolveProceduralRootMidiNote(174.61),
    scale: [...PROCEDURAL_MODE_NATURAL_MINOR],
    noteDurationMs: 440,
    baseVolume: 0.026,
    stepPattern: [0, 2, 3, 5, 3, 2, 1, 0],
    rhythmPattern: [1.25, 0.75, 1, 1.25, 0.75, 1, 1.5, 0.75],
    vocabulary: resolveMusicThemeVocabulary('deep-forest'),
    motif: resolveProceduralThemeMotif({ themeId: 'deep-forest' }),
  },
  'coastal-shore': {
    id: 'coastal-shore',
    rootHz: 220,
    rootMidiNote: resolveProceduralRootMidiNote(220),
    scale: [...PROCEDURAL_MODE_SUSPENDED_PENTATONIC],
    noteDurationMs: 420,
    baseVolume: 0.027,
    stepPattern: [0, 2, 4, 5, 4, 2, 0, 2],
    rhythmPattern: [1, 1.25, 0.75, 1, 1.25, 0.75, 1.5, 0.75],
    vocabulary: resolveMusicThemeVocabulary('coastal-shore'),
    motif: resolveProceduralThemeMotif({ themeId: 'coastal-shore' }),
  },
  'town-square': {
    id: 'town-square',
    rootHz: 246.94,
    rootMidiNote: resolveProceduralRootMidiNote(246.94),
    scale: [...PROCEDURAL_MODE_MAJOR_PENTATONIC],
    noteDurationMs: 300,
    baseVolume: 0.024,
    stepPattern: [0, 2, 4, 5, 4, 2, 5, 4],
    rhythmPattern: [1, 0.5, 1, 0.5, 1.25, 0.75, 1, 1.5],
    vocabulary: resolveMusicThemeVocabulary('town-square'),
    motif: resolveProceduralThemeMotif({ themeId: 'town-square' }),
  },
  'ridge-pass': {
    id: 'ridge-pass',
    rootHz: 185,
    rootMidiNote: resolveProceduralRootMidiNote(185),
    scale: [...PROCEDURAL_MODE_JAGGED_MINOR],
    noteDurationMs: 380,
    baseVolume: 0.024,
    stepPattern: [0, 1, 3, 4, 3, 1, 0, 4],
    rhythmPattern: [1.5, 0.75, 1, 1.25, 0.75, 1, 1.25, 0.75],
    vocabulary: resolveMusicThemeVocabulary('ridge-pass'),
    motif: resolveProceduralThemeMotif({ themeId: 'ridge-pass' }),
  },
  'cavern-echo': {
    id: 'cavern-echo',
    rootHz: 130.81,
    rootMidiNote: resolveProceduralRootMidiNote(130.81),
    scale: [...PROCEDURAL_MODE_HOLLOW_MINOR],
    noteDurationMs: 520,
    baseVolume: 0.03,
    stepPattern: [0, 2, 4, 2, 5, 2, 1, 0],
    rhythmPattern: [1.5, 1, 0.75, 1.25, 1, 0.75, 1.5, 0.75],
    vocabulary: resolveMusicThemeVocabulary('cavern-echo'),
    motif: resolveProceduralThemeMotif({ themeId: 'cavern-echo' }),
  },
  'interior-hall': {
    id: 'interior-hall',
    rootHz: 233.08,
    rootMidiNote: resolveProceduralRootMidiNote(233.08),
    scale: [...PROCEDURAL_MODE_FORMAL_MAJOR],
    noteDurationMs: 340,
    baseVolume: 0.022,
    stepPattern: [0, 2, 4, 2, 5, 4, 2, 1],
    rhythmPattern: [1, 0.75, 1, 1.25, 0.75, 1, 1.25, 1],
    vocabulary: resolveMusicThemeVocabulary('interior-hall'),
    motif: resolveProceduralThemeMotif({ themeId: 'interior-hall' }),
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
  poiType?: string,
  clusterX = 0,
  clusterY = 0
): MusicRegionTheme {
  const resolvedKind = poiType ?? tileKind;
  let theme = THEME_LIBRARY['frontier-plains'];
  if (
    contextType === 'cave' ||
    contextType === 'dungeon' ||
    resolvedKind === 'cave' ||
    resolvedKind === 'dungeon'
  ) {
    theme = THEME_LIBRARY['cavern-echo'];
  } else if (
    contextType === 'building' ||
    resolvedKind === 'floor' ||
    resolvedKind === 'shop' ||
    resolvedKind === 'stairsUp' ||
    resolvedKind === 'stairsDown'
  ) {
    theme = THEME_LIBRARY['interior-hall'];
  } else if (contextType === 'town' || resolvedKind === 'town') {
    theme = THEME_LIBRARY['town-square'];
  } else if (resolvedKind === 'forest') {
    theme = THEME_LIBRARY['deep-forest'];
  } else if (
    resolvedKind === 'shore' ||
    resolvedKind === 'dock' ||
    resolvedKind === 'ocean' ||
    resolvedKind === 'ship' ||
    resolvedKind === 'lighthouse'
  ) {
    theme = THEME_LIBRARY['coastal-shore'];
  } else if (
    resolvedKind === 'mountain' ||
    resolvedKind === 'observatory' ||
    resolvedKind === 'quarry'
  ) {
    theme = THEME_LIBRARY['ridge-pass'];
  }

  const locationMemory = resolveProceduralMusicLocationMemory({
    contextType,
    tileKind: resolvedKind,
    clusterX,
    clusterY,
  });

  return {
    ...theme,
    vocabulary: resolveMusicThemeVocabulary(theme.id, clusterX, clusterY),
    motif: {
      ...resolveProceduralThemeMotif({
        themeId: theme.id,
        contextType,
        tileKind: resolvedKind,
        clusterX,
        clusterY,
      }),
      recognitionDegreeOffsets: locationMemory.recognitionDegreeOffsets,
      recognitionLabel: locationMemory.recognitionLabel,
    },
  };
}

export function resolveMusicThemeById(
  themeId: MusicRegionThemeId
): MusicRegionTheme {
  return THEME_LIBRARY[themeId];
}

export function resolveMusicMood(options: {
  dayProgress: number;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
  combatIntensity?: number;
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
  const combatIntensity = clamp(options.combatIntensity ?? 0, 0, 1);

  return {
    tempoMultiplier:
      (atNight ? 0.82 : atDawnOrDusk ? 0.93 : 1.04 - rainPenalty) +
      combatIntensity * 0.22,
    brightness:
      (atNight ? 0.78 : atDawnOrDusk ? 0.9 : 1.08 - rainPenalty) -
      combatIntensity * 0.06,
    volumeMultiplier:
      (options.weatherKind === 'heavy-rain' ? 0.82 : atNight ? 0.88 : 1) +
      combatIntensity * 0.08,
  };
}

export function resolveMusicArrangement(options: {
  dayProgress: number;
  yearProgress?: number;
  weatherKind?: WeatherKind;
  weatherIntensity?: number;
  combatIntensity?: number;
  encounterMode?: MusicEncounterMode;
}): MusicArrangement {
  const dayProgress = normalizeWrappedProgress(options.dayProgress);
  const season = resolveSeason(options.yearProgress ?? 0);
  const combatIntensity = clamp(options.combatIntensity ?? 0, 0, 1);
  const atNight = dayProgress < 0.2 || dayProgress > 0.8;
  const atDawnOrDusk =
    (dayProgress >= 0.18 && dayProgress <= 0.3) ||
    (dayProgress >= 0.7 && dayProgress <= 0.82);
  const heavyWeather =
    options.weatherKind === 'heavy-rain' ||
    (options.weatherIntensity ?? 0) >= 0.85;

  if (
    options.encounterMode === 'battle' ||
    options.encounterMode === 'boss' ||
    combatIntensity >= 0.35
  ) {
    return {
      roleProfiles: {
        lead: {
          volumeMultiplier: 1.04,
          durationMultiplier: 0.94,
          releaseMultiplier: 0.88,
          harmonicGainMultiplier: 1.08,
          pulseRateMultiplier: 1.08,
          brightnessMultiplier: 0.96,
        },
        harmony: {
          volumeMultiplier: 0.92,
          durationMultiplier: 0.9,
          releaseMultiplier: 0.84,
          harmonicGainMultiplier: 1.12,
          pulseRateMultiplier: 1.02,
          brightnessMultiplier: 0.92,
        },
        bass: {
          volumeMultiplier: 1.1,
          durationMultiplier: 0.96,
          releaseMultiplier: 0.9,
          harmonicGainMultiplier: 1.14,
          pulseRateMultiplier: 1.08,
          brightnessMultiplier: 0.82,
          octaveShiftSemitones: -12,
        },
        percussion: {
          volumeMultiplier: 1.28,
          durationMultiplier: 0.88,
          releaseMultiplier: 0.82,
          harmonicGainMultiplier: 1.22,
          pulseRateMultiplier: 1.26,
          brightnessMultiplier: 0.94,
        },
      },
    };
  }

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
          volumeMultiplier: 0.26,
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
          volumeMultiplier: 0.54,
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
          volumeMultiplier: 0.2,
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
          volumeMultiplier: 0.5,
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
        volumeMultiplier: 0.62,
        durationMultiplier: 1,
        releaseMultiplier: 1,
        harmonicGainMultiplier: 1,
        pulseRateMultiplier: 1,
        brightnessMultiplier: 1,
      },
    },
  };
}

export function resolveMusicEncounterMode(options: {
  combatIntensity?: number;
}): MusicEncounterMode {
  const combatIntensity = clamp(options.combatIntensity ?? 0, 0, 1);
  if (combatIntensity >= 0.85) {
    return 'boss';
  }
  if (combatIntensity >= 0.35) {
    return 'battle';
  }
  return 'ambient';
}

export function getMusicRegionSignature(options: {
  tileKind?: TileKind;
  contextType?: ContextType;
  clusterX?: number;
  clusterY?: number;
}): string {
  const theme = resolveMusicTheme(
    options.tileKind,
    options.contextType,
    undefined,
    options.clusterX ?? 0,
    options.clusterY ?? 0
  );
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
      combatIntensity: options.combatIntensity,
      clusterX: options.clusterX,
      clusterY: options.clusterY,
      allowLeadAccidentals: options.allowLeadAccidentals,
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
    stopAll() {
      sink.stopAll?.();
    },
    getActiveSourceCount() {
      return sink.getActiveSourceCount?.() ?? 0;
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
      const duckingGain = resolveMusicDuckingGain(
        options.prioritySoundIntensity ?? 0,
        options.dialogueIntensity ?? 0
      );
      const ambientScheduled = scheduleThemeLayerNotes(
        {
          ...options,
          gainMultiplier: gains.ambientGain * duckingGain,
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
          combatIntensity: options.combatIntensity,
          clusterX: options.nearbyPoi.clusterX,
          clusterY: options.nearbyPoi.clusterY,
          allowLeadAccidentals: options.allowLeadAccidentals,
          emitter: options.nearbyPoi.emitter,
          listener: options.nearbyPoi.listener ?? options.listener,
          gainMultiplier: gains.poiGain * duckingGain,
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

export function getMusicUpdateSignature(
  options: MusicUpdateOptions
): MusicUpdateSignatureState {
  return {
    ambient: [
      options.tileKind ?? '',
      options.contextType ?? '',
      Math.round(options.dayProgress * 96),
      Math.round((options.yearProgress ?? 0) * 96),
      options.weatherKind ?? '',
      Math.round((options.weatherIntensity ?? 0) * 10),
      Math.round(clamp(options.combatIntensity ?? 0, 0, 1) * 100),
      Math.round(clamp(options.prioritySoundIntensity ?? 0, 0, 1) * 100),
      Math.round(clamp(options.dialogueIntensity ?? 0, 0, 1) * 100),
      options.encounterMode ?? 'ambient',
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
          Math.round(clamp(options.combatIntensity ?? 0, 0, 1) * 100),
          Math.round(clamp(options.prioritySoundIntensity ?? 0, 0, 1) * 100),
          Math.round(clamp(options.dialogueIntensity ?? 0, 0, 1) * 100),
          options.encounterMode ?? 'ambient',
          options.nearbyPoi.clusterX ?? 0,
          options.nearbyPoi.clusterY ?? 0,
          Math.round(clamp(options.nearbyPoi.mix ?? 0, 0, 1) * 100),
        ].join('|')
      : '',
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

export function resolvePoiMusicBlendGains(mix: number): {
  ambientGain: number;
  poiGain: number;
} {
  const clampedMix = clamp(mix, 0, 1);
  return {
    ambientGain: Math.cos((clampedMix * Math.PI) / 2),
    poiGain: Math.sin((clampedMix * Math.PI) / 2),
  };
}

function createThemeNotes(options: {
  startMs: number;
  theme: MusicRegionTheme;
  instrumentBank: ProceduralInstrumentBank;
  mood: MusicMood;
  arrangement: MusicArrangement;
  stepIndex: number;
  clusterX: number;
  clusterY: number;
  previousLeadSemitones?: number | null;
  allowLeadAccidentals?: boolean;
  tileKind?: TileKind;
  contextType?: ContextType;
  emitter?: MusicPosition;
  listener?: MusicPosition;
}): ProceduralMusicNote[] {
  const role = selectInstrumentRole(options.stepIndex);
  const instrument = options.instrumentBank.instruments[role];
  const arrangementProfile = options.arrangement.roleProfiles[role];
  const meterAccent = resolveProceduralMeterAccent(role, options.stepIndex);
  const trackContext = resolveProceduralTrackContext({
    theme: options.theme,
    stepIndex: options.stepIndex,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
    tempoMultiplier: options.mood.tempoMultiplier,
    allowLeadAccidentals: options.allowLeadAccidentals,
  });
  const composition = trackContext.composition;
  const resolvedSemitones = resolveProceduralInstrumentSemitones({
    theme: options.theme,
    role,
    stepIndex: options.stepIndex,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
    allowLeadAccidentals: options.allowLeadAccidentals,
    chord: composition.chord,
  });
  const semitones =
    role === 'lead'
      ? normalizeProceduralLeadSemitones({
          targetSemitones: resolvedSemitones,
          melodyRangeSemitones: options.theme.vocabulary.melodyRangeSemitones,
          previousLeadSemitones: options.previousLeadSemitones,
        })
      : resolvedSemitones;
  const resolvedOctaveBoost = resolveThemeNoteOctaveBoost({
    role,
    composition,
    themeId: options.theme.id,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
    stepIndex: options.stepIndex,
  });
  const octaveBoost =
    role === 'lead' &&
    options.previousLeadSemitones !== null &&
    options.previousLeadSemitones !== undefined &&
    Math.abs(semitones + resolvedOctaveBoost - options.previousLeadSemitones) >
      12
      ? 0
      : resolvedOctaveBoost;
  const voiceSemitones =
    role === 'harmony'
      ? resolveProceduralHarmonyVoicing({
          theme: options.theme,
          stepIndex: options.stepIndex,
          clusterX: options.clusterX,
          clusterY: options.clusterY,
          chord: trackContext.harmonicState.chord,
          previousChord: trackContext.harmonicState.previousChord,
        })
      : [semitones];
  if (role === 'percussion') {
    return createProceduralPercussionNotes({
      themeId: options.theme.id,
      stepIndex: options.stepIndex,
      phraseStep: trackContext.phraseState.phraseCycleStep,
      cadence: trackContext.phraseState.cadence,
      chordChange: trackContext.harmonicState.chordChange,
      startMs: options.startMs,
      stepDurationMs: trackContext.rhythmicGrid.stepDurationMs,
      rootMidiNote: options.theme.rootMidiNote,
      baseInstrumentId: instrument.id,
      baseVolume:
        options.theme.baseVolume *
        options.mood.volumeMultiplier *
        arrangementProfile.volumeMultiplier *
        meterAccent.volumeMultiplier *
        resolveCompositionVolumeMultiplier(role, composition) *
        0.6,
      baseAttackMs: instrument.attackMs,
      baseReleaseMs:
        instrument.releaseMs * arrangementProfile.releaseMultiplier,
      baseDetuneCents: instrument.detuneCents,
      baseHarmonicGain: resolveProceduralNoteHarmonicGain({
        baseHarmonicGain: instrument.harmonicGain,
        harmonicGainMultiplier: arrangementProfile.harmonicGainMultiplier,
        moodBrightness: options.mood.brightness,
        brightnessMultiplier: arrangementProfile.brightnessMultiplier,
      }),
      basePulseRate:
        instrument.pulseRate *
        arrangementProfile.pulseRateMultiplier *
        meterAccent.pulseRateMultiplier,
      brightness: instrument.brightness,
      clusterX: options.clusterX,
      clusterY: options.clusterY,
      space: resolveMusicSpaceProfile({
        tileKind: options.tileKind,
        contextType: options.contextType,
      }),
      emitter: options.emitter,
      listener: options.listener,
    });
  }
  const voiceVolumeScale =
    role === 'harmony' ? 1.2 / Math.max(1, voiceSemitones.length) : 1;
  return voiceSemitones.map((voiceSemitone, voiceIndex) => {
    const frequency = resolveProceduralNoteFrequency({
      rootMidiNote: options.theme.rootMidiNote,
      semitones: voiceSemitone + octaveBoost,
      role,
      octaveShiftSemitones: arrangementProfile.octaveShiftSemitones,
    });
    const volume =
      options.theme.baseVolume *
      options.mood.volumeMultiplier *
      arrangementProfile.volumeMultiplier *
      meterAccent.volumeMultiplier *
      resolveCompositionVolumeMultiplier(role, composition) *
      (role === 'bass' ? 0.8 : role === 'harmony' ? 0.72 : 1) *
      voiceVolumeScale;
    const velocity = resolveProceduralNoteVelocity({
      volume,
      role,
    });
    const timbre = resolveVelocityShapedInstrumentTimbre({
      timbre: resolveRegisterShapedInstrumentTimbre({
        timbre: instrument.timbre,
        frequencyHz: frequency,
      }),
      velocity,
    });

    return {
      themeId: options.theme.id,
      instrumentId:
        role === 'harmony'
          ? `${instrument.id}:voice-${voiceIndex}`
          : instrument.id,
      role,
      startMs: options.startMs,
      durationMs:
        options.theme.noteDurationMs *
        (role === 'bass' ? 1.08 : role === 'harmony' ? 1.18 : 0.92) *
        arrangementProfile.durationMultiplier *
        meterAccent.durationMultiplier *
        resolveCompositionDurationMultiplier(role, composition),
      frequency,
      volume,
      velocity,
      waveform: arrangementProfile.waveformOverride ?? instrument.waveform,
      timbre,
      attackMs: instrument.attackMs,
      releaseMs: instrument.releaseMs * arrangementProfile.releaseMultiplier,
      detuneCents: instrument.detuneCents,
      harmonicGain: resolveProceduralNoteHarmonicGain({
        baseHarmonicGain: instrument.harmonicGain,
        harmonicGainMultiplier: arrangementProfile.harmonicGainMultiplier,
        moodBrightness: options.mood.brightness,
        brightnessMultiplier: arrangementProfile.brightnessMultiplier,
      }),
      pulseRate:
        instrument.pulseRate *
        arrangementProfile.pulseRateMultiplier *
        meterAccent.pulseRateMultiplier,
      space: resolveMusicSpaceProfile({
        tileKind: options.tileKind,
        contextType: options.contextType,
      }),
      emitter: options.emitter,
      listener: options.listener,
    };
  });
}

function resolveThemeNoteOctaveBoost(options: {
  role: InstrumentRole;
  composition: ReturnType<typeof resolveProceduralCompositionStep>;
  themeId: MusicRegionThemeId;
  clusterX: number;
  clusterY: number;
  stepIndex: number;
}): number {
  if (options.role === 'bass' || options.role === 'percussion') {
    return 0;
  }
  if (options.role === 'harmony') {
    return hash2DWithSeed(
      getThemePropertySeed(options.themeId, 'octave'),
      options.clusterX + options.stepIndex,
      options.clusterY
    ) > 0.9
      ? 12
      : 0;
  }
  if (
    options.composition.contourStep.stage !== 'climax' &&
    options.composition.contourStep.stage !== 'rise'
  ) {
    return 0;
  }
  if (options.composition.motifDegreeOffset < 2) {
    return 0;
  }

  return hash2DWithSeed(
    getThemePropertySeed(options.themeId, 'octave'),
    options.clusterX + options.stepIndex,
    options.clusterY
  ) > 0.965
    ? 12
    : 0;
}

function scheduleThemeLayerNotes(
  options: {
    nowMs: number;
    tileKind?: TileKind;
    contextType?: ContextType;
    poiType?: string;
    weatherKind?: WeatherKind;
    weatherIntensity?: number;
    combatIntensity?: number;
    dayProgress: number;
    yearProgress?: number;
    clusterX?: number;
    clusterY?: number;
    allowLeadAccidentals?: boolean;
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
    options.poiType,
    options.clusterX ?? 0,
    options.clusterY ?? 0
  );
  const instrumentBank = createProceduralInstrumentBank(
    theme,
    options.clusterX ?? 0,
    options.clusterY ?? 0,
    options
  );
  const mood = resolveMusicMood({
    dayProgress: options.dayProgress,
    weatherKind: options.weatherKind,
    weatherIntensity: options.weatherIntensity,
    combatIntensity: options.combatIntensity,
  });
  const arrangement = resolveMusicArrangement({
    dayProgress: options.dayProgress,
    yearProgress: options.yearProgress,
    weatherKind: options.weatherKind,
    weatherIntensity: options.weatherIntensity,
    combatIntensity: options.combatIntensity,
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
    previousState?.regionSignature === regionSignature
      ? previousState.stepIndex
      : 0;
  let previousLeadSemitones =
    previousState?.regionSignature === regionSignature
      ? previousState.lastLeadSemitones
      : null;
  let nextNoteAtMs =
    previousState?.regionSignature === regionSignature
      ? Math.max(previousState.nextNoteAtMs, options.nowMs)
      : options.nowMs;
  const notes: ProceduralMusicNote[] = [];

  while (nextNoteAtMs < options.nowMs + LOOKAHEAD_MS) {
    const role = selectInstrumentRole(stepIndex);
    const arrangementProfile = arrangement.roleProfiles[role];
    const stepDurationMs = resolveProceduralRhythmicGridStep({
      theme,
      stepIndex,
      tempoMultiplier: mood.tempoMultiplier,
    }).stepDurationMs;
    const shouldRest =
      role !== 'bass' &&
      shouldRestAtThemeStep(theme, role, stepIndex, clusterX, clusterY);
    const shouldSkipRole =
      shouldRest ||
      (typeof arrangementProfile.skipEvery === 'number' &&
        arrangementProfile.skipEvery > 1 &&
        stepIndex % arrangementProfile.skipEvery === 0);

    if (!shouldSkipRole) {
      const createdNotes = createThemeNotes({
        startMs: nextNoteAtMs,
        theme,
        instrumentBank,
        mood,
        arrangement,
        stepIndex,
        clusterX,
        clusterY,
        previousLeadSemitones,
        allowLeadAccidentals: options.allowLeadAccidentals,
        tileKind: options.poiType ?? options.tileKind,
        contextType: options.contextType,
        emitter: options.emitter,
        listener: options.listener,
      });
      for (const note of createdNotes) {
        notes.push({
          ...note,
          volume: note.volume * options.gainMultiplier,
        });
      }
      if (role === 'lead' && createdNotes[0]) {
        previousLeadSemitones = Math.round(
          12 *
            Math.log2(
              createdNotes[0].frequency /
                resolveProceduralNoteFrequency({
                  rootMidiNote: theme.rootMidiNote,
                  semitones: 0,
                  role: 'lead',
                })
            )
        );
      }
    }
    nextNoteAtMs += stepDurationMs;
    stepIndex += 1;
  }

  applyGentleProceduralMusicCompression(notes);

  return {
    notes: normalizeProceduralMusicLoudness(notes),
    state: {
      nextNoteAtMs,
      stepIndex,
      regionSignature,
      lastLeadSemitones: previousLeadSemitones,
    },
  };
}

export function createProceduralInstrumentBank(
  theme: MusicRegionTheme,
  clusterX: number,
  clusterY: number,
  options?: ProceduralInstrumentBankOptions
): ProceduralInstrumentBank {
  const roleVariants: Record<InstrumentRole, number> = {
    lead: 0,
    harmony: 0,
    bass: 0,
    percussion: 0,
  };

  let instruments = createProceduralInstrumentBankInstruments(
    theme,
    clusterX,
    clusterY,
    options,
    roleVariants
  );
  let rolePatchDistinctness =
    resolveProceduralInstrumentRolePatchDistinctness(instruments);

  for (
    let attempt = 0;
    attempt < 8 && !rolePatchDistinctness.isValid;
    attempt += 1
  ) {
    const rejectedComparison = rolePatchDistinctness.rejectedComparisons[0];
    if (!rejectedComparison) {
      break;
    }
    const roleToAdjust = selectRoleVariantAdjustment(rejectedComparison);
    roleVariants[roleToAdjust] += 1;
    instruments = createProceduralInstrumentBankInstruments(
      theme,
      clusterX,
      clusterY,
      options,
      roleVariants
    );
    rolePatchDistinctness =
      resolveProceduralInstrumentRolePatchDistinctness(instruments);
  }

  return {
    themeId: theme.id,
    instruments,
    rolePatchDistinctness,
  };
}

function createProceduralInstrumentBankInstruments(
  theme: MusicRegionTheme,
  clusterX: number,
  clusterY: number,
  options: ProceduralInstrumentBankOptions | undefined,
  roleVariants: Record<InstrumentRole, number>
): Record<InstrumentRole, ProceduralInstrument> {
  return {
    lead: createProceduralInstrument(
      theme,
      'lead',
      clusterX,
      clusterY,
      options,
      roleVariants.lead
    ),
    harmony: createProceduralInstrument(
      theme,
      'harmony',
      clusterX,
      clusterY,
      options,
      roleVariants.harmony
    ),
    bass: createProceduralInstrument(
      theme,
      'bass',
      clusterX,
      clusterY,
      options,
      roleVariants.bass
    ),
    percussion: createProceduralInstrument(
      theme,
      'percussion',
      clusterX,
      clusterY,
      options,
      roleVariants.percussion
    ),
  };
}

function createProceduralInstrument(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  clusterX: number,
  clusterY: number,
  options?: ProceduralInstrumentBankOptions,
  variantIndex = 0
): ProceduralInstrument {
  const family = resolveInstrumentFamily(
    theme,
    role,
    clusterX,
    clusterY,
    options,
    variantIndex
  );
  const patchRecipe = resolveInstrumentPatchRecipe(family);
  const [variantX, variantY] = resolveInstrumentVariantCoordinates(
    clusterX,
    clusterY,
    variantIndex
  );
  const waveformList = patchRecipe.waveformOptions;
  const waveform =
    waveformList[
      Math.floor(
        hash2DWithSeed(
          getRolePropertySeed(theme.id, role, 'waveform'),
          variantX,
          variantY
        ) * waveformList.length
      )
    ] ?? waveformList[0];
  const brightnessSignal = hash2DWithSeed(
    getRolePropertySeed(theme.id, role, 'brightness'),
    variantX,
    variantY
  );
  const brightness = interpolatePatchRange(
    patchRecipe.brightnessRange,
    brightnessSignal
  );
  const timbre = resolveProceduralInstrumentTimbre({
    family,
    brightness,
    harmonicSignal: hash2DWithSeed(
      getRolePropertySeed(theme.id, role, 'harmonics'),
      variantX,
      variantY
    ),
    filterSignal: hash2DWithSeed(
      getThemePropertySeed(theme.id, 'brightness'),
      variantX + role.length,
      variantY - role.length
    ),
  });
  const attackMs = Math.round(
    interpolatePatchRange(
      patchRecipe.attackMsRange,
      hash2DWithSeed(
        getRolePropertySeed(theme.id, role, 'attack'),
        variantX,
        variantY
      )
    )
  );
  const releaseMs = Math.round(
    interpolatePatchRange(
      patchRecipe.releaseMsRange,
      hash2DWithSeed(
        getRolePropertySeed(theme.id, role, 'release'),
        variantX,
        variantY
      )
    )
  );
  const detuneCents = interpolatePatchRange(
    patchRecipe.detuneCentsRange,
    hash2DWithSeed(
      getRolePropertySeed(theme.id, role, 'detune'),
      variantX,
      variantY
    )
  );
  const harmonicGain = interpolatePatchRange(
    patchRecipe.harmonicGainRange,
    hash2DWithSeed(
      getRolePropertySeed(theme.id, role, 'harmonics'),
      variantX,
      variantY
    )
  );
  const pulseRate = interpolatePatchRange(
    patchRecipe.pulseRateRange,
    hash2DWithSeed(
      getRolePropertySeed(theme.id, role, 'pulse'),
      variantX,
      variantY
    )
  );
  return {
    id: `${theme.id}:${role}:${clusterX}:${clusterY}`,
    role,
    family,
    waveform,
    timbre,
    attackMs,
    releaseMs,
    detuneCents,
    harmonicGain,
    pulseRate,
    brightness,
  };
}

export function resolveProceduralInstrumentRolePatchDistinctness(
  instruments: Record<InstrumentRole, ProceduralInstrument>
): ProceduralInstrumentRolePatchDistinctness {
  const rolePairs: Array<
    [NonPercussionInstrumentRole, NonPercussionInstrumentRole]
  > = [
    ['lead', 'harmony'],
    ['lead', 'bass'],
    ['harmony', 'bass'],
  ];
  const comparisons = rolePairs.map(([leftRole, rightRole]) => ({
    leftRole,
    rightRole,
    ...compareInstrumentPatches({
      left: instruments[leftRole],
      right: instruments[rightRole],
    }),
  }));
  const rejectedComparisons = comparisons
    .filter(
      (comparison) =>
        comparison.similarityScore >= ROLE_PATCH_SIMILARITY_REJECTION_THRESHOLD
    )
    .sort((left, right) => right.similarityScore - left.similarityScore);

  return {
    isValid: rejectedComparisons.length === 0,
    rejectedComparisons,
    comparisons,
  };
}

function interpolatePatchRange(
  range: { min: number; max: number },
  signal: number
): number {
  return range.min + (range.max - range.min) * signal;
}

function resolveInstrumentFamily(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  clusterX: number,
  clusterY: number,
  options?: ProceduralInstrumentBankOptions,
  variantIndex = 0
): InstrumentFamily {
  const families = resolveInstrumentFamilyPool(theme, role, options);
  const familyContextKey = resolveInstrumentFamilyContextKey(
    theme,
    role,
    options
  );
  const index = Math.floor(
    hash2DWithSeed(
      getRoleContextPropertySeed(theme.id, role, 'family', familyContextKey),
      clusterX,
      clusterY
    ) * families.length
  );
  return families[(index + variantIndex) % families.length] ?? families[0];
}

function resolveInstrumentVariantCoordinates(
  clusterX: number,
  clusterY: number,
  variantIndex: number
): [number, number] {
  if (variantIndex === 0) {
    return [clusterX, clusterY];
  }
  return [clusterX + variantIndex * 37, clusterY - variantIndex * 29];
}

function selectRoleVariantAdjustment(
  comparison: ProceduralInstrumentRolePatchComparison
): InstrumentRole {
  if (comparison.rightRole === 'harmony' || comparison.leftRole === 'harmony') {
    return 'harmony';
  }
  return comparison.rightRole === 'bass' ? 'bass' : comparison.rightRole;
}

function resolveInstrumentFamilyPool(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  options?: ProceduralInstrumentBankOptions
): readonly InstrumentFamily[] {
  const vocabularyFamilies = theme.vocabulary.instrumentFamilies[role];
  const season = resolveSeason(options?.yearProgress ?? 0.25);
  const normalizedDayProgress = normalizeWrappedProgress(
    options?.dayProgress ?? 0.5
  );
  const atNight = normalizedDayProgress < 0.2 || normalizedDayProgress > 0.8;
  const weatherBand =
    options?.weatherKind === 'heavy-rain' ||
    (options?.weatherIntensity ?? 0) >= 0.8
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
  return vocabularyFamilies.length > 0
    ? vocabularyFamilies
    : INSTRUMENT_FAMILY_LIBRARY[role];
}

function resolveInstrumentFamilyContextKey(
  theme: MusicRegionTheme,
  role: InstrumentRole,
  options?: ProceduralInstrumentBankOptions
): string {
  const season = resolveSeason(options?.yearProgress ?? 0.25);
  const normalizedDayProgress = normalizeWrappedProgress(
    options?.dayProgress ?? 0.5
  );
  const dayPhase =
    normalizedDayProgress < 0.2 || normalizedDayProgress > 0.8
      ? 'night'
      : normalizedDayProgress < 0.32 || normalizedDayProgress > 0.68
        ? 'twilight'
        : 'day';
  const weatherBand =
    options?.weatherKind === 'heavy-rain' ||
    (options?.weatherIntensity ?? 0) >= 0.8
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

function shouldRestAtThemeStep(
  theme: MusicRegionTheme,
  role: Exclude<InstrumentRole, 'bass'>,
  stepIndex: number,
  clusterX: number,
  clusterY: number
): boolean {
  if (role === 'percussion' || stepIndex < 2) {
    return false;
  }
  const phraseStep = stepIndex % theme.stepPattern.length;
  if (phraseStep === 0 || phraseStep === theme.stepPattern.length - 1) {
    return false;
  }
  if (role === 'lead' || role === 'harmony') {
    return shouldUsePhraseBoundaryRest({
      themeId: theme.id,
      role,
      phraseStep,
      phraseLength: theme.stepPattern.length,
      clusterX,
      clusterY,
    });
  }
  const restChance = 0.14;
  const variation = hash2DWithSeed(
    getRolePropertySeed(theme.id, role, 'rest'),
    clusterX + stepIndex,
    clusterY
  );
  return variation > 1 - restChance;
}

function resolveCompositionVolumeMultiplier(
  role: InstrumentRole,
  composition: ReturnType<typeof resolveProceduralCompositionStep>
): number {
  if (role === 'percussion') {
    if (composition.cadence === 'answer') {
      return 1.22;
    }
    if (composition.cadence === 'question') {
      return 0.82;
    }
    return composition.chord.progressionIndex % 2 === 0 ? 1.12 : 0.94;
  }
  if (role === 'harmony') {
    return composition.contourStep.stage === 'climax' ? 1.08 : 1;
  }
  if (role === 'bass') {
    return composition.chord.progressionIndex === 0 ? 1.06 : 0.98;
  }

  return 1;
}

function resolveCompositionDurationMultiplier(
  role: InstrumentRole,
  composition: ReturnType<typeof resolveProceduralCompositionStep>
): number {
  if (role === 'percussion') {
    if (composition.cadence === 'answer') {
      return 1.12;
    }
    if (composition.cadence === 'question') {
      return 0.88;
    }
    return composition.chord.progressionIndex % 2 === 0 ? 1.04 : 0.92;
  }
  if (role === 'harmony') {
    return composition.contourStep.stage === 'resolve' ? 1.08 : 1;
  }

  return 1;
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

function resolveMusicDuckingGain(
  prioritySoundIntensity: number,
  dialogueIntensity: number
): number {
  const clampedPriority = clamp(prioritySoundIntensity, 0, 1);
  const clampedDialogue = clamp(dialogueIntensity, 0, 1);
  return clamp(1 - clampedPriority * 0.42 - clampedDialogue * 0.12, 0.3, 1);
}
