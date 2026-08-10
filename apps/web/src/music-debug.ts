import {
  createProceduralInstrumentBank,
  type MusicSink,
  createWebAudioMusicSink,
  resolveMusicEncounterMode,
  resolveMusicArrangement,
  resolveMusicMood,
  resolveMusicTheme,
  type MusicEncounterMode,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import {
  resolveProceduralLeadContour,
  resolveProceduralChordProgression,
  resolveProceduralLeadMotif,
  resolveProceduralLeadPhraseCadence,
} from './procedural-music-harmony.ts';
import { resolveProceduralChordTimeline } from './procedural-music-chord-timeline.ts';
import { describeProceduralChordProgression } from './procedural-music-chord-progression.ts';
import {
  createProceduralMusicSong,
  type ProceduralMusicSong,
} from './procedural-music-song.ts';
import { resolveProceduralMusicBlueprintMeasureCount } from './procedural-music-blueprint.ts';
import { randomizeDebugCoordinatePair } from './debug-seed.ts';
import { buildMusicDebugInstrumentPanelMarkup } from './music-debug-instrument-panel.ts';
import {
  createMusicDebugLyrics,
  type MusicDebugLyricLine,
} from './music-debug-lyrics.ts';
import { describeSongSectionLayerArrangement } from './procedural-music-song-layers.ts';
import { createProceduralScaleMap } from './procedural-music-scale.ts';
import {
  createMusicDebugScheduledPlaybackNote,
  MUSIC_DEBUG_PLAYBACK_SCHEDULE_AHEAD_MS,
  MUSIC_DEBUG_PLAYBACK_SCHEDULE_TICK_MS,
  MUSIC_DEBUG_PLAYBACK_SCHEDULE_WINDOW_MS,
} from './music-debug-playback-profile.ts';
import {
  MUSIC_DEBUG_FULL_SONG_BUTTON_LABEL,
  MUSIC_DEBUG_LOOP_TOGGLE_LABEL,
} from './music-debug-playback-intent.ts';
import { resolveMusicDebugTempoBpm } from './music-debug-tempo.ts';
import {
  analyzeMusicDebugPitches,
  describeMusicDebugAccidentalReason,
  type MusicDebugAccidentalReason,
  type MusicDebugNotePitchDiagnostic,
  type MusicDebugPitchValidation,
} from './music-debug-note-analysis.ts';
import type { MusicDebugPitchClassLabel } from './music-debug-pitch-class.ts';
import {
  type MusicDebugTimingValidation,
  validateMusicDebugTiming,
} from './music-debug-timing-validation.ts';
import {
  formatMusicDebugTrackSoundingSummary,
  createMusicDebugTrackStats,
  formatMusicDebugTrackPitchSummary,
  formatMusicDebugTrackTimingSummary,
  type MusicDebugTrackStats,
} from './music-debug-track-stats.ts';
import {
  createMusicDebugIntervalComparison,
  formatMusicDebugIntervalComparison,
  type MusicDebugIntervalComparison,
} from './music-debug-interval-analysis.ts';
import {
  createMusicDebugPhraseRepetitionAnalysis,
  formatMusicDebugPhraseRepetitionAnalysis,
  type MusicDebugPhraseRepetitionAnalysis,
} from './music-debug-phrase-repetition.ts';
import {
  MUSIC_DEBUG_MIDI_EXPORT_VARIANTS,
  formatMusicDebugMidiExportVariantLabel,
} from './music-debug-midi-export-variant.ts';
import {
  validateMusicDebugMotifPresence,
  type MusicDebugMotifValidation,
} from './music-debug-motif-validation.ts';
import {
  countMusicDebugExactMotifMatches,
  countMusicDebugVariedMotifMatches,
} from './music-debug-motif-match.ts';
import {
  createMusicDebugLeadContourAnalysis,
  type MusicDebugLeadContourAnalysis,
} from './music-debug-lead-contour.ts';
import {
  createMusicDebugBassProgressionDetections,
  createMusicDebugHarmonyChordDetections,
  createMusicDebugSectionLayerActivity,
  createMusicDebugSectionLayerComparisons,
  createMusicDebugSectionMotifMatches,
  type MusicDebugBassProgressionDetection,
  type MusicDebugHarmonyChordDetection,
  type MusicDebugSectionLayerActivity,
  type MusicDebugSectionLayerComparison,
  type MusicDebugSectionMotifMatch,
} from './music-debug-section-analysis.ts';
import {
  createMusicDebugSectionProminence,
  type MusicDebugSectionProminence,
} from './music-debug-section-prominence.ts';
import {
  createMusicDebugMidiExportAudit,
  type MusicDebugMidiAudit,
} from './music-debug-midi-audit.ts';
import {
  validateMusicDebugCadences,
  type MusicDebugCadenceDetection,
  type MusicDebugCadenceValidation,
} from './music-debug-cadence-validation.ts';
import {
  validateMusicDebugDensity,
  type MusicDebugDensityValidation,
  type MusicDebugSectionDensityValidation,
} from './music-debug-density-validation.ts';
import {
  validateMusicDebugPercussion,
  type MusicDebugPercussionValidation,
} from './music-debug-percussion-validation.ts';
import {
  validateMusicDebugSongDna,
  type MusicDebugSongDnaValidation,
} from './music-debug-song-dna-validation.ts';

export type MusicDebugTileKind =
  | 'plains'
  | 'forest'
  | 'shore'
  | 'town'
  | 'mountain'
  | 'cave'
  | 'floor'
  | 'ruins'
  | 'tower'
  | 'stronghold'
  | 'observatory'
  | 'lighthouse';
export type MusicDebugContextType =
  'overworld' | 'town' | 'building' | 'cave' | 'dungeon';
export type MusicDebugWeatherKind =
  'clear' | 'fog' | 'light-rain' | 'heavy-rain';

export type MusicDebugOptions = {
  tileKind: MusicDebugTileKind;
  contextType: MusicDebugContextType;
  encounterMode: MusicEncounterMode;
  weatherKind: MusicDebugWeatherKind;
  weatherIntensity: number;
  combatIntensity: number;
  dayProgress: number;
  yearProgress: number;
  clusterX: number;
  clusterY: number;
};

export type MusicDebugSnapshot = {
  options: MusicDebugOptions;
  theme: ReturnType<typeof resolveMusicTheme>;
  mood: ReturnType<typeof resolveMusicMood>;
  arrangement: ReturnType<typeof resolveMusicArrangement>;
  instrumentBank: ReturnType<typeof createProceduralInstrumentBank>;
  songDna: ProceduralMusicSong['dna'];
  chordProgression: number[];
  leadMotif: number[];
  leadContour: string[];
  leadPhraseCadence: string[];
  song: ProceduralMusicSong;
  notes: ProceduralMusicNote[];
  durationMs: number;
  resolvedBpm: number;
  measureCount: number;
  scaleMap: ReturnType<typeof createProceduralScaleMap>;
  blueprintLabel: string;
  vocabularySummary: string[];
  sharedMotif: number[];
  sectionLayerArrangement: string[];
  sectionLayerActivity: MusicDebugSectionLayerActivity[];
  sectionProminence: MusicDebugSectionProminence[];
  sectionLayerComparisons: MusicDebugSectionLayerComparison[];
  lyrics: MusicDebugLyricLine[];
  loopStartOffsetMs: number;
  loopEndOffsetMs: number;
  leadMaxLeapSemitones: number;
  accidentalNoteCount: number;
  roleCounts: Record<ProceduralMusicNote['role'], number>;
  notePitchDiagnostics: MusicDebugNotePitchDiagnostic[];
  outOfModeNotesByRole: Record<ProceduralMusicNote['role'], number>;
  blackKeyNotesByRole: Record<ProceduralMusicNote['role'], number>;
  dominantPitchClassesByRole: Record<
    ProceduralMusicNote['role'],
    readonly MusicDebugPitchClassLabel[]
  >;
  trackStats: Record<ProceduralMusicNote['role'], MusicDebugTrackStats>;
  intervalComparison: MusicDebugIntervalComparison;
  phraseRepetition: MusicDebugPhraseRepetitionAnalysis;
  leadContourAnalysis: MusicDebugLeadContourAnalysis;
  sectionMotifMatches: MusicDebugSectionMotifMatch[];
  motifValidation: MusicDebugMotifValidation;
  harmonyChordDetections: MusicDebugHarmonyChordDetection[];
  bassProgressionDetections: MusicDebugBassProgressionDetection[];
  cadenceDetections: MusicDebugCadenceDetection[];
  cadenceValidation: MusicDebugCadenceValidation;
  densityValidation: MusicDebugDensityValidation;
  percussionValidation: MusicDebugPercussionValidation;
  songDnaValidation: MusicDebugSongDnaValidation;
  densitySections: MusicDebugSectionDensityValidation[];
  midiAudit: MusicDebugMidiAudit;
  midiExportValidation: MusicDebugPitchValidation;
  timingValidation: MusicDebugTimingValidation;
};

export type MusicDebugTheme = MusicDebugSnapshot['theme'];

export type MusicDebugTimelineLayout = {
  width: number;
  height: number;
  leftPad: number;
  rightPad: number;
  topPad: number;
  bottomPad: number;
  trackHeight: number;
  roleOrder: ProceduralMusicNote['role'][];
};

export type MusicDebugSongPlayback = {
  prepare?(): void;
  play(
    snapshot: MusicDebugSnapshot,
    region?: MusicDebugPlaybackRegion | null
  ): number | void;
  stop(): void;
};

type MusicDebugSongPlaybackOptions = {
  now?: () => number;
  scheduleAheadMs?: number;
  scheduleWindowMs?: number;
  scheduleTickMs?: number;
  scheduleTimeout?: typeof setTimeout;
  clearScheduledTimeout?: typeof clearTimeout;
};

const musicDebugSnapshotCache = new Map<string, MusicDebugSnapshot>();

export type MusicDebugPlaybackRegion = {
  startOffsetMs: number;
  endOffsetMs: number;
};

export const DEFAULT_MUSIC_DEBUG_OPTIONS: MusicDebugOptions = {
  tileKind: 'forest',
  contextType: 'overworld',
  encounterMode: 'ambient',
  weatherKind: 'clear',
  weatherIntensity: 0,
  combatIntensity: 0,
  dayProgress: 0.5,
  yearProgress: 0.25,
  clusterX: 0,
  clusterY: 0,
};

function clampMusicDebugProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampMusicDebugWeatherIntensity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampMusicDebugCombatIntensity(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizeMusicDebugOptions(
  value: Partial<MusicDebugOptions> | null | undefined
): MusicDebugOptions {
  return {
    tileKind: normalizeTileKind(value?.tileKind),
    contextType: normalizeContextType(value?.contextType),
    encounterMode: normalizeEncounterMode(value?.encounterMode),
    weatherKind: normalizeWeatherKind(value?.weatherKind),
    weatherIntensity: clampMusicDebugWeatherIntensity(
      value?.weatherIntensity ?? DEFAULT_MUSIC_DEBUG_OPTIONS.weatherIntensity
    ),
    combatIntensity: clampMusicDebugCombatIntensity(
      value?.combatIntensity ?? DEFAULT_MUSIC_DEBUG_OPTIONS.combatIntensity
    ),
    dayProgress: clampMusicDebugProgress(
      value?.dayProgress ?? DEFAULT_MUSIC_DEBUG_OPTIONS.dayProgress
    ),
    yearProgress: clampMusicDebugProgress(
      value?.yearProgress ?? DEFAULT_MUSIC_DEBUG_OPTIONS.yearProgress
    ),
    clusterX: Math.round(
      value?.clusterX ?? DEFAULT_MUSIC_DEBUG_OPTIONS.clusterX
    ),
    clusterY: Math.round(
      value?.clusterY ?? DEFAULT_MUSIC_DEBUG_OPTIONS.clusterY
    ),
  };
}

export function createMusicDebugSnapshot(
  rawOptions?: Partial<MusicDebugOptions> | null,
  nowMs = 0
): MusicDebugSnapshot {
  const options = normalizeMusicDebugOptions(rawOptions);
  const theme = resolveMusicTheme(
    options.tileKind,
    options.contextType,
    undefined,
    options.clusterX,
    options.clusterY
  );
  const mood = resolveMusicMood({
    dayProgress: options.dayProgress,
    weatherKind:
      options.weatherKind === 'clear' ? undefined : options.weatherKind,
    weatherIntensity: options.weatherIntensity,
    combatIntensity: options.combatIntensity,
  });
  const arrangement = resolveMusicArrangement({
    dayProgress: options.dayProgress,
    yearProgress: options.yearProgress,
    encounterMode: options.encounterMode,
    weatherKind:
      options.weatherKind === 'clear' ? undefined : options.weatherKind,
    weatherIntensity: options.weatherIntensity,
    combatIntensity: options.combatIntensity,
  });
  const instrumentBank = createProceduralInstrumentBank(
    theme,
    options.clusterX,
    options.clusterY,
    options
  );
  const chordProgression = [
    ...resolveProceduralChordProgression(
      theme,
      options.clusterX,
      options.clusterY
    ),
  ];
  const chordTimeline = resolveProceduralChordTimeline({
    themeId: theme.id,
    themeStepCount: theme.stepPattern.length,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
  });
  const leadMotif = [
    ...resolveProceduralLeadMotif(theme, options.clusterX, options.clusterY)
      .degreeOffsets,
  ];
  const leadContour = resolveProceduralLeadContour(
    theme,
    options.clusterX,
    options.clusterY
  ).map((step) => `${step.stage}:${step.degreeOffset}`);
  const leadPhraseCadence = Array.from(
    { length: Math.max(1, theme.stepPattern.length) },
    (_, stepIndex) => resolveProceduralLeadPhraseCadence(theme, stepIndex)
  );
  const song = createProceduralMusicSong({
    nowMs,
    tileKind: options.tileKind,
    contextType: options.contextType,
    weatherKind:
      options.weatherKind === 'clear' ? undefined : options.weatherKind,
    weatherIntensity: options.weatherIntensity,
    combatIntensity: options.combatIntensity,
    encounterMode: options.encounterMode,
    dayProgress: options.dayProgress,
    yearProgress: options.yearProgress,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
  });
  const durationMs = song.durationMs;
  const resolvedBpm = resolveMusicDebugTempoBpm({
    blueprint: song.blueprint,
    durationMs,
  });
  const scaleMap = createProceduralScaleMap({
    rootMidiNote: theme.rootMidiNote,
    scale: theme.scale,
  });
  const measureCount = resolveProceduralMusicBlueprintMeasureCount(
    song.blueprint
  );
  const lyrics = createMusicDebugLyrics({
    leadFamily: instrumentBank.instruments.lead.family,
    sections: song.sections,
    songDna: song.dna,
  });
  const roleCounts: MusicDebugSnapshot['roleCounts'] = {
    lead: 0,
    harmony: 0,
    bass: 0,
    percussion: 0,
  };
  let leadMaxLeapSemitones = 0;
  let previousLeadFrequency: number | null = null;

  for (const note of song.notes) {
    roleCounts[note.role] += 1;
    if (note.role !== 'lead') {
      continue;
    }
    if (previousLeadFrequency !== null) {
      const leapSemitones =
        Math.abs(Math.log2(note.frequency / previousLeadFrequency)) * 12;
      leadMaxLeapSemitones = Math.max(leadMaxLeapSemitones, leapSemitones);
    }
    previousLeadFrequency = note.frequency;
  }
  const midiExportValidation = analyzeMusicDebugPitches({
    notes: song.notes,
    rootHz: theme.rootHz,
    modePitchOffsets: scaleMap.modePitchOffsets,
    encounterMode: song.dna.encounterMode,
    themeId: theme.id,
  });
  const timingValidation = validateMusicDebugTiming({
    durationMs,
    measureCount,
    resolvedBpm,
    loopStartOffsetMs: song.loopStartOffsetMs,
    loopEndOffsetMs: song.loopEndOffsetMs,
    song,
  });
  const trackStats = createMusicDebugTrackStats({
    notes: song.notes,
    diagnostics: midiExportValidation.notePitchDiagnostics,
    songDurationMs: durationMs,
  });
  const intervalComparison = createMusicDebugIntervalComparison({
    notes: song.notes,
    diagnostics: midiExportValidation.notePitchDiagnostics,
    preferredIntervals: theme.vocabulary.preferredIntervals,
    role: 'lead',
  });
  const phraseRepetition = createMusicDebugPhraseRepetitionAnalysis({
    notes: song.notes,
    notePitchDiagnostics: midiExportValidation.notePitchDiagnostics,
    sections: song.sections,
    songDurationMs: durationMs,
    role: 'lead',
  });
  const leadContourAnalysis = createMusicDebugLeadContourAnalysis({
    theme,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
    songStartMs: song.startMs,
    sections: song.sections,
    notes: song.notes,
    diagnostics: midiExportValidation.notePitchDiagnostics,
  });
  const sectionMotifMatches = createMusicDebugSectionMotifMatches({
    notes: song.notes,
    notePitchDiagnostics: midiExportValidation.notePitchDiagnostics,
    sections: song.sections,
    leadMotif,
    scaleLength: theme.scale.length,
  });
  const leadDegrees = collectMusicDebugLeadScaleDegrees({
    notes: song.notes,
    diagnostics: midiExportValidation.notePitchDiagnostics,
    scaleLength: theme.scale.length,
  });
  const motifValidation = validateMusicDebugMotifPresence({
    leadMotif,
    sectionMotifMatches,
    overallExactMatchCount: countMusicDebugExactMotifMatches(
      leadDegrees,
      leadMotif
    ),
    overallVariedMatchCount: countMusicDebugVariedMotifMatches(
      leadDegrees,
      leadMotif
    ),
  });
  const harmonyChordDetections = createMusicDebugHarmonyChordDetections({
    notes: song.notes,
    notePitchDiagnostics: midiExportValidation.notePitchDiagnostics,
    sections: song.sections,
    scale: theme.scale,
    rootMidiNote: theme.rootMidiNote,
    chordTimeline,
  });
  const bassProgressionDetections = createMusicDebugBassProgressionDetections({
    notes: song.notes,
    notePitchDiagnostics: midiExportValidation.notePitchDiagnostics,
    sections: song.sections,
    scale: theme.scale,
    rootMidiNote: theme.rootMidiNote,
    chordTimeline,
  });
  const cadenceValidation = validateMusicDebugCadences({
    notes: song.notes,
    sections: song.sections,
    songStartMs: song.startMs,
    rootMidiNote: theme.rootMidiNote,
    scale: theme.scale,
  });
  const sectionLayerActivity = createMusicDebugSectionLayerActivity({
    notes: song.notes,
    sections: song.sections,
  });
  const sectionProminence = createMusicDebugSectionProminence({
    notes: song.notes,
    sections: song.sections,
    activities: sectionLayerActivity,
  });
  const sectionLayerComparisons = createMusicDebugSectionLayerComparisons({
    activities: sectionLayerActivity,
    blueprint: song.blueprint,
    prominence: sectionProminence,
  });
  const densityValidation = validateMusicDebugDensity({
    sections: song.sections,
    activities: sectionLayerActivity,
  });
  const percussionValidation = validateMusicDebugPercussion({
    notes: song.notes,
    sections: song.sections,
    songStartMs: song.startMs,
  });
  const songDnaValidation = validateMusicDebugSongDna({
    songDna: song.dna,
    rootMidiNote: scaleMap.rootMidiNote,
    modePitchOffsets: scaleMap.modePitchOffsets,
    instrumentBank,
    roleCounts,
    outOfModeNotesByRole: midiExportValidation.outOfModeNotesByRole,
    dominantPitchClassesByRole: midiExportValidation.dominantPitchClassesByRole,
  });
  const snapshotBase = {
    options,
    theme,
    mood,
    arrangement,
    instrumentBank,
    songDna: song.dna,
    chordProgression,
    leadMotif,
    leadContour,
    leadPhraseCadence,
    song,
    notes: song.notes,
    durationMs,
    resolvedBpm,
    measureCount,
    scaleMap,
    blueprintLabel: song.blueprint.label,
    vocabularySummary: [],
    sharedMotif: [...theme.motif.sharedDegreeOffsets],
    sectionLayerArrangement: [],
    sectionLayerActivity: [],
    sectionProminence: [],
    sectionLayerComparisons: [],
    lyrics,
    loopStartOffsetMs: song.loopStartOffsetMs,
    loopEndOffsetMs: song.loopEndOffsetMs,
    leadMaxLeapSemitones,
    accidentalNoteCount: midiExportValidation.accidentalNoteCount,
    roleCounts,
    notePitchDiagnostics: midiExportValidation.notePitchDiagnostics,
    outOfModeNotesByRole: midiExportValidation.outOfModeNotesByRole,
    blackKeyNotesByRole: midiExportValidation.blackKeyNotesByRole,
    dominantPitchClassesByRole: midiExportValidation.dominantPitchClassesByRole,
    trackStats,
    intervalComparison,
    phraseRepetition,
    leadContourAnalysis,
    sectionMotifMatches,
    motifValidation,
    harmonyChordDetections,
    bassProgressionDetections,
    cadenceDetections: cadenceValidation.detections,
    cadenceValidation,
    densityValidation,
    percussionValidation,
    songDnaValidation,
    densitySections: densityValidation.sections,
    midiExportValidation,
    timingValidation,
  };
  const midiAudit = createMusicDebugMidiExportAudit({
    ...snapshotBase,
    vocabularySummary: [
      `Biome ${theme.vocabulary.biomeLabel}`,
      `Region ${theme.vocabulary.regionLabel}`,
      `Mode ${theme.vocabulary.modeLabel}`,
      `Tempo ${theme.vocabulary.tempoBandLabel}`,
      `Range ${theme.vocabulary.melodyRangeLabel}`,
      `Rhythm ${theme.vocabulary.rhythmDensityLabel}`,
      `Intervals (${theme.vocabulary.preferredIntervalUnit}) ${theme.vocabulary.preferredIntervals.join(', ')}`,
      `Motif ${theme.vocabulary.motifLabel}`,
    ],
    sharedMotif: [...theme.motif.sharedDegreeOffsets],
    sectionLayerArrangement: song.sections.map((section) =>
      describeSongSectionLayerArrangement(section)
    ),
    sectionLayerActivity,
    sectionProminence,
    sectionLayerComparisons,
    midiAudit: {
      exportedBpm: null,
      exportedDurationMs: 0,
      exportedMeasureCount: 0,
      exportedNoteCountsByRole: {},
      exportedPitchClassCountsByRole: {
        bass: {},
        harmony: {},
        lead: {},
        percussion: {},
      },
      exportedMotifExactMatchCount: 0,
      exportedMotifVariedMatchCount: 0,
      markerLabels: [],
      sectionsMatchPlannedMarkers: true,
      mismatchMessages: [],
      warningMessages: [],
      isConsistent: true,
    },
  } as MusicDebugSnapshot);

  return {
    ...snapshotBase,
    vocabularySummary: [
      `Biome ${theme.vocabulary.biomeLabel}`,
      `Region ${theme.vocabulary.regionLabel}`,
      `Mode ${theme.vocabulary.modeLabel}`,
      `Tempo ${theme.vocabulary.tempoBandLabel}`,
      `Range ${theme.vocabulary.melodyRangeLabel}`,
      `Rhythm ${theme.vocabulary.rhythmDensityLabel}`,
      `Intervals (${theme.vocabulary.preferredIntervalUnit}) ${theme.vocabulary.preferredIntervals.join(', ')}`,
      `Motif ${theme.vocabulary.motifLabel}`,
    ],
    sharedMotif: [...theme.motif.sharedDegreeOffsets],
    sectionLayerArrangement: song.sections.map((section) =>
      describeSongSectionLayerArrangement(section)
    ),
    sectionLayerActivity,
    sectionProminence,
    sectionLayerComparisons,
    midiAudit,
  };
}

export function createCachedMusicDebugSnapshot(
  rawOptions?: Partial<MusicDebugOptions> | null
): MusicDebugSnapshot {
  const options = normalizeMusicDebugOptions(rawOptions);
  const cacheKey = JSON.stringify(options);
  const cached = musicDebugSnapshotCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const snapshot = createMusicDebugSnapshot(options, 0);
  musicDebugSnapshotCache.set(cacheKey, snapshot);
  return snapshot;
}

export function randomizeMusicDebugSeed(
  rawOptions?: Partial<MusicDebugOptions> | null,
  random = Math.random
): MusicDebugOptions {
  const options = normalizeMusicDebugOptions(rawOptions);
  const randomized = randomizeDebugCoordinatePair(
    {
      x: options.clusterX,
      y: options.clusterY,
    },
    random
  );
  return {
    ...options,
    clusterX: randomized.x,
    clusterY: randomized.y,
  };
}

export function buildMusicDebugMarkup(
  snapshot: MusicDebugSnapshot = createMusicDebugSnapshot()
): string {
  return buildMusicDebugShellMarkup(
    snapshot.options,
    buildMusicDebugSummaryMarkup(snapshot)
  );
}

export function buildMusicDebugShellMarkup(
  rawOptions?: Partial<MusicDebugOptions> | null,
  summaryMarkup = buildMusicDebugPendingSummaryMarkup()
): string {
  const options = normalizeMusicDebugOptions(rawOptions);

  return `
    <main class="music-debug-shell">
      <section class="music-debug-hero">
        <nav class="music-debug-breadcrumbs" aria-label="Breadcrumb">
          <a href="/debug/">/debug/</a>
          <span>/music/</span>
        </nav>
        <p class="music-debug-kicker">bworlds</p>
        <h1>Music Laboratory</h1>
        <p class="music-debug-lede">
          Generate, visualize, and audition the current procedural score layers for a chosen biome, season, time of day, and weather state.
        </p>
      </section>
      <section class="music-debug-layout">
        <form id="music-debug-form" class="music-debug-card music-debug-form">
          <div class="music-debug-grid">
            <label>
              <span>Tile</span>
              <select name="tileKind">
                ${buildSelectOptions(
                  [
                    'plains',
                    'forest',
                    'shore',
                    'town',
                    'mountain',
                    'cave',
                    'floor',
                    'ruins',
                    'tower',
                    'stronghold',
                    'observatory',
                    'lighthouse',
                  ],
                  options.tileKind
                )}
              </select>
            </label>
            <label>
              <span>Context</span>
              <select name="contextType">
                ${buildSelectOptions(
                  ['overworld', 'town', 'building', 'cave', 'dungeon'],
                  options.contextType
                )}
              </select>
            </label>
            <label>
              <span>Encounter</span>
              <select name="encounterMode">
                ${buildSelectOptions(
                  ['ambient', 'battle', 'boss'],
                  options.encounterMode
                )}
              </select>
            </label>
            <label>
              <span>Weather</span>
              <select name="weatherKind">
                ${buildSelectOptions(
                  ['clear', 'fog', 'light-rain', 'heavy-rain'],
                  options.weatherKind
                )}
              </select>
            </label>
            <label>
              <span>Weather Intensity</span>
              <input name="weatherIntensity" type="range" min="0" max="1" step="0.05" value="${options.weatherIntensity}" />
            </label>
            <label>
              <span>Combat Intensity</span>
              <input name="combatIntensity" type="range" min="0" max="1" step="0.05" value="${options.combatIntensity}" />
            </label>
            <label>
              <span>Day Progress</span>
              <input name="dayProgress" type="range" min="0" max="1" step="0.01" value="${options.dayProgress}" />
            </label>
            <label>
              <span>Year Progress</span>
              <input name="yearProgress" type="range" min="0" max="1" step="0.01" value="${options.yearProgress}" />
            </label>
            <label>
              <span>Cluster X</span>
              <input name="clusterX" type="number" step="1" value="${options.clusterX}" />
            </label>
            <label>
              <span>Cluster Y</span>
              <input name="clusterY" type="number" step="1" value="${options.clusterY}" />
            </label>
          </div>
          <div class="music-debug-actions">
            <button id="music-debug-generate" type="submit">Generate</button>
            <button id="music-debug-randomize" type="button">🎲 Generate</button>
            <button id="music-debug-play" type="button">${MUSIC_DEBUG_FULL_SONG_BUTTON_LABEL}</button>
            <div class="music-debug-export-controls">
              <button id="music-debug-download" type="button">Download MIDI</button>
              <button id="music-debug-download-bundle" type="button">Download Export ZIP</button>
              <label class="music-debug-export-label">
                <span class="sr-only">MIDI export variant</span>
                <select id="music-debug-export-variant" name="exportVariant">
                  ${MUSIC_DEBUG_MIDI_EXPORT_VARIANTS.map(
                    (variant) =>
                      `<option value="${variant}">${formatMusicDebugMidiExportVariantLabel(
                        variant
                      )}</option>`
                  ).join('')}
                </select>
              </label>
            </div>
            <label class="music-debug-toggle">
              <input id="music-debug-loop" type="checkbox" />
              <span>${MUSIC_DEBUG_LOOP_TOGGLE_LABEL}</span>
            </label>
          </div>
        </form>
        <section class="music-debug-card">
          <div class="music-debug-transport">
            <div class="music-debug-transport-summary">
              <span id="music-debug-current-time">0:00 / --:--</span>
              <span id="music-debug-current-section">Not playing</span>
            </div>
            <div id="music-debug-section-buttons" class="music-debug-section-buttons"></div>
          </div>
          <canvas id="music-debug-timeline" width="960" height="320"></canvas>
          <div id="music-debug-summary">${summaryMarkup}</div>
        </section>
      </section>
    </main>
  `;
}

export function buildMusicDebugPendingSummaryMarkup(): string {
  return `
    <div class="music-debug-role-counts">
      <span>Generating preview...</span>
    </div>
  `;
}

export function buildMusicDebugSummaryMarkup(
  snapshot: MusicDebugSnapshot
): string {
  return `
    <div class="music-debug-summary-grid">
      <div><dt>Theme</dt><dd>${snapshot.theme.id}</dd></div>
      <div><dt>Root Hz</dt><dd>${snapshot.theme.rootHz.toFixed(2)}</dd></div>
      <div><dt>Root MIDI</dt><dd>${snapshot.scaleMap.rootMidiNote}</dd></div>
      <div><dt>Scheduled Notes</dt><dd>${snapshot.notes.length}</dd></div>
      <div><dt>Song Length</dt><dd>${formatMusicDebugDuration(snapshot.durationMs)}</dd></div>
      <div><dt>Measures</dt><dd>${snapshot.measureCount}</dd></div>
      <div><dt>MIDI Measures</dt><dd>${snapshot.midiAudit.exportedMeasureCount}</dd></div>
      <div><dt>MIDI Sections</dt><dd>${snapshot.midiAudit.sectionsMatchPlannedMarkers ? 'ok' : snapshot.midiAudit.markerLabels.join(' / ') || 'missing'}</dd></div>
      <div><dt>Blueprint</dt><dd>${snapshot.blueprintLabel}</dd></div>
      <div><dt>Loop Range</dt><dd>${formatMusicDebugLoopRange(snapshot.loopStartOffsetMs, snapshot.loopEndOffsetMs)}</dd></div>
      <div><dt>Timing Check</dt><dd>${snapshot.timingValidation.isValidForMidiExport ? 'ok' : (snapshot.timingValidation.messages[0] ?? 'invalid')}</dd></div>
      <div><dt>Encounter</dt><dd>${snapshot.options.encounterMode}</dd></div>
      <div><dt>Tempo</dt><dd>${snapshot.mood.tempoMultiplier.toFixed(2)}x</dd></div>
      <div><dt>Resolved BPM</dt><dd>${snapshot.resolvedBpm.toFixed(1)}</dd></div>
      <div><dt>MIDI BPM</dt><dd>${snapshot.midiAudit.exportedBpm?.toFixed(1) ?? 'n/a'}</dd></div>
      <div><dt>Brightness</dt><dd>${snapshot.mood.brightness.toFixed(2)}x</dd></div>
      <div><dt>Combat</dt><dd>${snapshot.options.combatIntensity.toFixed(2)}</dd></div>
      <div><dt>Mode</dt><dd>${snapshot.theme.vocabulary.modeLabel}</dd></div>
      <div><dt>Mode Offsets</dt><dd>${snapshot.scaleMap.modePitchOffsets.join(', ')}</dd></div>
      <div><dt>Region</dt><dd>${snapshot.theme.vocabulary.regionLabel}</dd></div>
      <div><dt>Location</dt><dd>${snapshot.songDna.recognitionLabel}</dd></div>
      <div><dt>Rhythm</dt><dd>${snapshot.theme.vocabulary.rhythmDensityLabel}</dd></div>
      <div><dt>Preferred Intervals</dt><dd>${snapshot.theme.vocabulary.preferredIntervals.join(', ')} ${snapshot.theme.vocabulary.preferredIntervalUnit}</dd></div>
      <div><dt>Interval Match</dt><dd>${snapshot.intervalComparison.preferredMatchCount}/${snapshot.intervalComparison.totalIntervalCount} (${Math.round(snapshot.intervalComparison.preferredMatchPercentage)}%)</dd></div>
      <div><dt>Phrase Similarity</dt><dd>${Math.round(snapshot.phraseRepetition.averageSimilarityPercentage)}% avg across ${snapshot.phraseRepetition.phraseCount} phrases</dd></div>
      <div><dt>Motif Check</dt><dd>${snapshot.motifValidation.isValidForMidiExport ? 'ok' : (snapshot.motifValidation.messages[0] ?? 'invalid')}</dd></div>
      <div><dt>Lead Max Leap</dt><dd>${snapshot.leadMaxLeapSemitones.toFixed(1)} st</dd></div>
      <div><dt>Accidentals</dt><dd>${snapshot.accidentalNoteCount} chromatic notes outside ${snapshot.theme.vocabulary.modeLabel}</dd></div>
      <div><dt>Out-of-Mode</dt><dd>B ${snapshot.outOfModeNotesByRole.bass} / H ${snapshot.outOfModeNotesByRole.harmony} / L ${snapshot.outOfModeNotesByRole.lead}</dd></div>
      <div><dt>Black Keys</dt><dd>${snapshot.midiExportValidation.blackKeyNoteCount} total; B ${snapshot.blackKeyNotesByRole.bass} / H ${snapshot.blackKeyNotesByRole.harmony} / L ${snapshot.blackKeyNotesByRole.lead}</dd></div>
      <div><dt>Pitch Centers</dt><dd>B ${formatMusicDebugPitchCenters(snapshot.dominantPitchClassesByRole.bass)} / H ${formatMusicDebugPitchCenters(snapshot.dominantPitchClassesByRole.harmony)} / L ${formatMusicDebugPitchCenters(snapshot.dominantPitchClassesByRole.lead)}</dd></div>
    </div>
    <div class="music-debug-role-counts">
      <span>SongDNA ${snapshot.songDna.identityId} / ${snapshot.songDna.locationIdentityId} / ${snapshot.songDna.variantLabel} / ${snapshot.songDna.blueprintId} / ${snapshot.songDna.meterLabel}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Vocabulary ${snapshot.vocabularySummary.join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Bass ${snapshot.roleCounts.bass}</span>
      <span>Harmony ${snapshot.roleCounts.harmony}</span>
      <span>Lead ${snapshot.roleCounts.lead}</span>
      <span>Percussion ${snapshot.roleCounts.percussion}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Accidental Rules ${formatMusicDebugAccidentalRuleSummary(snapshot.midiExportValidation.accidentalReasonCounts)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Accidental Notes ${formatMusicDebugAccidentalExamples(snapshot.notePitchDiagnostics)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Track Pitch ${formatMusicDebugTrackPitchSummary(snapshot.trackStats).join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Track Sounding ${formatMusicDebugTrackSoundingSummary(snapshot.trackStats).join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Track Timing ${formatMusicDebugTrackTimingSummary(snapshot.trackStats).join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Interval Match ${formatMusicDebugIntervalComparison(snapshot.intervalComparison)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Phrase Similarity ${formatMusicDebugPhraseRepetitionAnalysis(snapshot.phraseRepetition)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Motif Matches ${formatMusicDebugSectionMotifMatches(snapshot.sectionMotifMatches)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Motif Validation ${snapshot.motifValidation.isValidForMidiExport ? 'ok' : snapshot.motifValidation.messages.join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Harmony Chords ${formatMusicDebugHarmonyChordDetections(snapshot.harmonyChordDetections)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Bass Progression ${formatMusicDebugBassProgressionDetections(snapshot.bassProgressionDetections)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Cadence Check ${formatMusicDebugCadenceValidationSummary(snapshot.cadenceValidation)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Density Check ${formatMusicDebugDensityValidationSummary(snapshot.densityValidation)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Percussion Check ${formatMusicDebugPercussionValidationSummary(snapshot.percussionValidation)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>SongDNA Check ${formatMusicDebugSongDnaValidationSummary(snapshot.songDnaValidation)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>MIDI Audit ${formatMusicDebugMidiAuditSummary(snapshot.midiAudit)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Section Measures ${snapshot.song.sections.map((section) => `${section.label} ${section.startMeasure}-${section.endMeasure}`).join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Sections ${snapshot.song.sections.map((section) => section.label).join(' / ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Layer Mix ${snapshot.sectionLayerArrangement.join(' | ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Actual Layers ${formatMusicDebugSectionLayerActivity(snapshot.sectionLayerActivity)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Layer Check ${formatMusicDebugSectionLayerComparisons(snapshot.sectionLayerComparisons)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Chords ${describeProceduralChordProgression(snapshot.theme.scale, snapshot.chordProgression).join(' - ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Shared Motif ${snapshot.sharedMotif.map((degree) => degree + 1).join(' - ')} (${snapshot.theme.motif.adaptationLabel})</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Lead Motif ${snapshot.leadMotif.map((degree) => degree + 1).join(' - ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Location Motif ${formatMusicDebugDegreeMotif(snapshot.songDna.locationRecognitionMotif)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Faction Motifs ${formatMusicDebugFactionMotifs(snapshot.songDna.factionMotifs)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Faction Interaction ${formatMusicDebugDegreeMotif(snapshot.songDna.factionInteractionMotif)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>NPC Motifs ${formatMusicDebugNpcMotifs(snapshot.songDna.importantNpcMotifs)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Lead Contour ${snapshot.leadContour.join(' / ')}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Lead Contour Check ${formatMusicDebugLeadContourSummary(snapshot.leadContourAnalysis)}</span>
    </div>
    <div class="music-debug-role-counts">
      <span>Lead Cadence ${snapshot.leadPhraseCadence.join(' / ')}</span>
    </div>
    ${buildMusicDebugInstrumentPanelMarkup(snapshot)}
  `;
}

function formatMusicDebugMidiAuditSummary(audit: MusicDebugMidiAudit): string {
  if (!audit.isConsistent) {
    return [...audit.mismatchMessages, ...audit.criticalWarningMessages].join(
      ' | '
    );
  }
  if (audit.warningMessages.length > 0) {
    return `ok with warnings: ${audit.warningMessages.join(' | ')}`;
  }
  return 'ok';
}

function formatMusicDebugBassProgressionDetections(
  detections: readonly MusicDebugBassProgressionDetection[]
): string {
  if (detections.length === 0) {
    return 'missing';
  }
  return detections
    .map((detection) => {
      const detected = detection.detectedRootLabels.join(' > ') || 'missing';
      const planned = detection.plannedRootLabels.join(' > ') || 'unplanned';
      const status = detection.followsPlannedProgression ? 'ok' : 'drift';
      return `${detection.sectionLabel}: ${detected} (${status} vs ${planned})`;
    })
    .join(' | ');
}

function formatMusicDebugCadenceValidationSummary(
  validation: MusicDebugCadenceValidation
): string {
  if (!validation.isValidForMidiExport) {
    return validation.messages.join(' | ');
  }
  return validation.detections
    .map((detection) => {
      const measure =
        detection.measureNumber === null ? '?' : `${detection.measureNumber}`;
      const lead =
        detection.leadNoteLabel ?? detection.leadPitchLabel ?? 'missing';
      const bass =
        detection.bassNoteLabel ?? detection.bassPitchLabel ?? 'missing';
      const harmony = detection.harmonyPitchLabels.join('-') || 'open';
      return `${detection.sectionLabel} ${detection.kind} m${measure} L${lead} B${bass} @ ${harmony}`;
    })
    .join(' | ');
}

function formatMusicDebugDensityValidationSummary(
  validation: MusicDebugDensityValidation
): string {
  if (!validation.isValidForMidiExport) {
    return validation.messages.join(' | ');
  }
  return validation.sections
    .map((section) => {
      const densities = [
        `B${section.noteDensityByRole.bass.toFixed(1)}`,
        `H${section.noteDensityByRole.harmony.toFixed(1)}`,
        `L${section.noteDensityByRole.lead.toFixed(1)}`,
        `P${section.noteDensityByRole.percussion.toFixed(1)}`,
      ].join('/');
      return `${section.sectionLabel} ${densities}`;
    })
    .join(' | ');
}

function formatMusicDebugPercussionValidationSummary(
  validation: MusicDebugPercussionValidation
): string {
  if (!validation.isValidForMidiExport) {
    return validation.messages.join(' | ');
  }
  return 'ok';
}

function formatMusicDebugSongDnaValidationSummary(
  validation: MusicDebugSongDnaValidation
): string {
  if (!validation.isValidForMidiExport) {
    return validation.messages.join(' | ');
  }
  return 'ok';
}

function formatMusicDebugLeadContourSummary(
  analysis: MusicDebugLeadContourAnalysis
): string {
  if (!analysis.matchesPlannedContour && analysis.messages.length > 0) {
    return analysis.messages.join(' | ');
  }
  const status = analysis.matchesPlannedContour ? 'ok' : 'drift';
  return `${status}; in-range ${analysis.inRangePointCount}, out-of-range ${analysis.outOfRangePointCount}, missing ${analysis.missingPointCount}, climax ${analysis.climaxNearPlannedPeak ? 'near peak' : 'off peak'}, ending ${analysis.finalResolvesToTonic ? 'tonic' : 'drifted'}`;
}

function formatMusicDebugAccidentalRuleSummary(
  reasonCounts: Record<MusicDebugAccidentalReason, number>
): string {
  const parts: string[] = [];
  for (const reason of [
    'chromatic-passing',
    'harmonic-color',
    'lower-approach',
    'upper-approach',
    'unsupported-chromatic-leap',
    'unresolved-chromatic',
  ] as const) {
    const count = reasonCounts[reason];
    if (!count) {
      continue;
    }
    parts.push(`${describeMusicDebugAccidentalReason(reason)} ${count}`);
  }
  return parts.length > 0 ? parts.join(' / ') : 'none';
}

function formatMusicDebugSectionLayerActivity(
  sections: readonly MusicDebugSectionLayerActivity[]
): string {
  if (sections.length === 0) {
    return 'none';
  }
  return sections
    .map((section) => {
      const counts = [
        `B${section.roleCounts.bass}`,
        `H${section.roleCounts.harmony}`,
        `L${section.roleCounts.lead}`,
        `P${section.roleCounts.percussion}`,
      ].join('/');
      const coverage = [
        `B${Math.round(section.soundingTimePercentageByRole.bass)}%`,
        `H${Math.round(section.soundingTimePercentageByRole.harmony)}%`,
        `L${Math.round(section.soundingTimePercentageByRole.lead)}%`,
        `P${Math.round(section.soundingTimePercentageByRole.percussion)}%`,
      ].join('/');
      return `${section.sectionLabel} ${counts} @ ${coverage}`;
    })
    .join(' | ');
}

function formatMusicDebugSectionLayerComparisons(
  comparisons: readonly MusicDebugSectionLayerComparison[]
): string {
  if (comparisons.length === 0) {
    return 'none';
  }
  return comparisons
    .map((comparison) =>
      comparison.matchesPlan
        ? `${comparison.sectionLabel} ok`
        : `${comparison.sectionLabel} mismatch: ${comparison.mismatchRules.join(', ')}`
    )
    .join(' | ');
}

function formatMusicDebugAccidentalExamples(
  diagnostics: readonly MusicDebugNotePitchDiagnostic[]
): string {
  const accidentalNotes = diagnostics.filter(
    (diagnostic) => !diagnostic.inMode
  );
  if (accidentalNotes.length === 0) {
    return 'none';
  }
  return accidentalNotes
    .slice(0, 6)
    .map((diagnostic) => {
      const roleLabel = diagnostic.role[0]?.toUpperCase() ?? '?';
      return `${roleLabel}${diagnostic.noteIndex + 1} MIDI ${diagnostic.midiNote ?? '?'} ${diagnostic.accidentalRuleLabel ?? diagnostic.accidentalReason}`;
    })
    .join(' / ');
}

function formatMusicDebugPitchCenters(
  pitchClasses: readonly MusicDebugPitchClassLabel[]
): string {
  return pitchClasses.length > 0 ? pitchClasses.join(', ') : 'none';
}

function formatMusicDebugSectionMotifMatches(
  matches: readonly MusicDebugSectionMotifMatch[]
): string {
  if (matches.length === 0) {
    return 'none';
  }
  return matches
    .map((entry) => `${entry.sectionLabel} ${entry.matchCount}`)
    .join(' | ');
}

function formatMusicDebugHarmonyChordDetections(
  detections: readonly MusicDebugHarmonyChordDetection[]
): string {
  if (detections.length === 0) {
    return 'none';
  }
  return detections
    .map(
      (entry) =>
        `${entry.sectionLabel} ${entry.chordLabels.join(', ') || 'none'}`
    )
    .join(' | ');
}

export function resolveMusicDebugPlaybackRegion(
  snapshot: MusicDebugSnapshot,
  region?: MusicDebugPlaybackRegion | null
): MusicDebugPlaybackRegion {
  const startOffsetMs = clampTimelineOffset(
    region?.startOffsetMs ?? 0,
    snapshot.durationMs
  );
  const endOffsetMs = clampTimelineOffset(
    region?.endOffsetMs ?? snapshot.durationMs,
    snapshot.durationMs
  );

  return {
    startOffsetMs,
    endOffsetMs: Math.max(startOffsetMs, endOffsetMs),
  };
}

export function resolveMusicDebugPlaybackDurationMs(
  snapshot: MusicDebugSnapshot,
  region?: MusicDebugPlaybackRegion | null
): number {
  const resolved = resolveMusicDebugPlaybackRegion(snapshot, region);
  return Math.max(0, resolved.endOffsetMs - resolved.startOffsetMs);
}

export function createMusicDebugSongPlayback(
  sink: MusicSink = createWebAudioMusicSink(),
  options: MusicDebugSongPlaybackOptions = {}
): MusicDebugSongPlayback {
  const now = options.now ?? performance.now.bind(performance);
  const scheduleAheadMs =
    options.scheduleAheadMs ?? MUSIC_DEBUG_PLAYBACK_SCHEDULE_AHEAD_MS;
  const scheduleWindowMs = Math.max(
    scheduleAheadMs,
    options.scheduleWindowMs ?? MUSIC_DEBUG_PLAYBACK_SCHEDULE_WINDOW_MS
  );
  const scheduleTickMs = Math.max(
    8,
    options.scheduleTickMs ?? MUSIC_DEBUG_PLAYBACK_SCHEDULE_TICK_MS
  );
  const scheduleTimeout = options.scheduleTimeout ?? setTimeout;
  const clearScheduledTimeout = options.clearScheduledTimeout ?? clearTimeout;
  let scheduledBatchHandle: ReturnType<typeof setTimeout> | null = null;
  let playbackGeneration = 0;

  function clearScheduledBatch(): void {
    if (scheduledBatchHandle === null) {
      return;
    }
    clearScheduledTimeout(scheduledBatchHandle);
    scheduledBatchHandle = null;
  }

  return {
    prepare() {
      sink.resume?.();
    },
    play(snapshot, region) {
      playbackGeneration += 1;
      clearScheduledBatch();
      const playbackRegion = resolveMusicDebugPlaybackRegion(snapshot, region);
      const playbackStartMs = now() + scheduleAheadMs;
      const offsetMs = snapshot.song.startMs + playbackRegion.startOffsetMs;
      const endMs = snapshot.song.startMs + playbackRegion.endOffsetMs;
      let noteIndex = findFirstMusicDebugNoteIndex(snapshot.notes, offsetMs);
      const generation = playbackGeneration;
      sink.resume?.();

      const scheduleBatch = () => {
        if (generation !== playbackGeneration) {
          return;
        }
        scheduledBatchHandle = null;

        const windowEndMs = now() + scheduleWindowMs;
        while (noteIndex < snapshot.notes.length) {
          const note = snapshot.notes[noteIndex]!;
          if (note.startMs >= endMs) {
            return;
          }
          const scheduledStartMs = playbackStartMs + (note.startMs - offsetMs);
          if (scheduledStartMs > windowEndMs) {
            break;
          }
          sink.play(
            createMusicDebugScheduledPlaybackNote(note, scheduledStartMs)
          );
          noteIndex += 1;
        }

        if (noteIndex >= snapshot.notes.length) {
          return;
        }

        const nextNote = snapshot.notes[noteIndex]!;
        if (nextNote.startMs >= endMs) {
          return;
        }
        const nextScheduledStartMs =
          playbackStartMs + (nextNote.startMs - offsetMs);
        const delayMs = Math.max(
          0,
          Math.min(
            scheduleTickMs,
            nextScheduledStartMs - now() - scheduleAheadMs
          )
        );
        scheduledBatchHandle = scheduleTimeout(scheduleBatch, delayMs);
      };

      scheduleBatch();
      return playbackStartMs;
    },
    stop() {
      playbackGeneration += 1;
      clearScheduledBatch();
      sink.stopAll?.();
    },
  };
}

export function formatMusicDebugDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatMusicDebugLoopRange(
  startOffsetMs: number,
  endOffsetMs: number
): string {
  return `${formatMusicDebugDuration(startOffsetMs)} - ${formatMusicDebugDuration(endOffsetMs)}`;
}

function buildSelectOptions(
  values: readonly string[],
  selectedValue: string
): string {
  return values
    .map((value) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${value}"${selected}>${value}</option>`;
    })
    .join('');
}

function normalizeTileKind(
  value: MusicDebugOptions['tileKind'] | undefined
): MusicDebugTileKind {
  if (
    value === 'forest' ||
    value === 'shore' ||
    value === 'town' ||
    value === 'mountain' ||
    value === 'cave' ||
    value === 'floor' ||
    value === 'ruins' ||
    value === 'tower' ||
    value === 'stronghold' ||
    value === 'observatory' ||
    value === 'lighthouse'
  ) {
    return value;
  }
  return 'plains';
}

function normalizeContextType(
  value: MusicDebugOptions['contextType'] | undefined
): MusicDebugContextType {
  if (
    value === 'town' ||
    value === 'building' ||
    value === 'cave' ||
    value === 'dungeon'
  ) {
    return value;
  }
  return 'overworld';
}

function normalizeEncounterMode(
  value: MusicDebugOptions['encounterMode'] | undefined
): MusicEncounterMode {
  if (value === 'battle' || value === 'boss') {
    return value;
  }
  if (value === 'ambient') {
    return value;
  }
  return resolveMusicEncounterMode({
    combatIntensity: DEFAULT_MUSIC_DEBUG_OPTIONS.combatIntensity,
  });
}

function normalizeWeatherKind(
  value: MusicDebugOptions['weatherKind'] | undefined
): MusicDebugWeatherKind {
  if (value === 'fog' || value === 'light-rain' || value === 'heavy-rain') {
    return value;
  }
  return 'clear';
}

function clampTimelineOffset(value: number, durationMs: number): number {
  return Math.min(durationMs, Math.max(0, Math.round(value)));
}

function findFirstMusicDebugNoteIndex(
  notes: readonly ProceduralMusicNote[],
  startMs: number
): number {
  let low = 0;
  let high = notes.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const note = notes[middle]!;
    if (note.startMs < startMs) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function collectMusicDebugLeadScaleDegrees(options: {
  notes: readonly ProceduralMusicNote[];
  diagnostics: readonly MusicDebugNotePitchDiagnostic[];
  scaleLength: number;
}): number[] {
  const degrees: number[] = [];

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.diagnostics[index];
    if (
      note.role !== 'lead' ||
      diagnostic?.scaleDegree === null ||
      diagnostic?.scaleDegree === undefined
    ) {
      continue;
    }
    degrees.push(mod(diagnostic.scaleDegree - 1, options.scaleLength));
  }

  return degrees;
}

function mod(value: number, divisor: number): number {
  if (divisor <= 0) {
    return value;
  }
  return ((value % divisor) + divisor) % divisor;
}

function formatMusicDebugNpcMotifs(
  motifs: MusicDebugSnapshot['songDna']['importantNpcMotifs']
): string {
  if (motifs.length === 0) {
    return 'none';
  }

  return motifs
    .map(
      (motif) =>
        `${motif.npcName} (${motif.professionLabel}) ${motif.motifDegreeOffsets
          .map((degree) => degree + 1)
          .join(' - ')}`
    )
    .join(' | ');
}

function formatMusicDebugFactionMotifs(
  motifs: MusicDebugSnapshot['songDna']['factionMotifs']
): string {
  if (motifs.length === 0) {
    return 'none';
  }

  return motifs
    .map(
      (motif) =>
        `${motif.factionName} ${formatMusicDebugDegreeMotif(
          motif.motifDegreeOffsets
        )}`
    )
    .join(' | ');
}

function formatMusicDebugDegreeMotif(motif: readonly number[]): string {
  if (motif.length === 0) {
    return 'none';
  }

  return motif.map((degree) => degree + 1).join(' - ');
}
