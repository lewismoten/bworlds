import type { ProceduralMusicNote } from './procedural-music.ts';
import { resolveVelocityShapedInstrumentTimbre } from './music-instrument-timbres.ts';
import { resolveMusicThemeById } from './procedural-music.ts';
import { isProceduralSemitoneInMode } from './procedural-music-scale.ts';
import { resolveSongHarmonySustainMultiplier } from './procedural-music-harmony-sustain.ts';
import { createProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';
import { resolveSongSectionLayerTreatment } from './procedural-music-song-layers.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

const SEMITONE_RATIO = 2 ** (1 / 12);
const NEUTRAL_SECTION_LEAD_RHYTHM_IDENTITY = {
  startOffsetMs: [0, 0, 0, 0, 0, 0, 0, 0],
  durationMultiplier: [1, 1, 1, 1, 1, 1, 1, 1],
  releaseMultiplier: [1, 1, 1, 1, 1, 1, 1, 1],
} as const;

export function transformSongSectionNote(
  note: ProceduralMusicNote,
  section: ProceduralMusicSongSection,
  noteIndexInSection: number,
  songStartMs: number
): ProceduralMusicNote | null {
  const sectionContext = createProceduralMusicSongSectionContext({
    section,
    note,
    noteIndexInSection,
    songStartMs,
  });
  const layerTreatment = resolveSongSectionLayerTreatment(sectionContext);
  if (layerTreatment.muted) {
    return null;
  }
  const harmonySustainMultiplier =
    note.role === 'harmony'
      ? resolveSongHarmonySustainMultiplier(sectionContext)
      : 1;
  const leadRhythmIdentity = resolveSectionLeadRhythmIdentity(section.id);
  const leadRhythmOptions =
    note.role === 'lead'
      ? resolveLeadRhythmIdentityOptions({
          rhythmIdentity: leadRhythmIdentity,
          phrasePosition: sectionContext.phrasePosition,
          preserveRepairPitch: sectionContext.isGeneratedRepairNote,
        })
      : null;

  switch (section.id) {
    case 'intro':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          layerTreatment.durationMultiplier *
          harmonySustainMultiplier *
          (leadRhythmOptions?.durationMultiplier ?? 1),
        releaseMultiplier:
          layerTreatment.releaseMultiplier *
          (leadRhythmOptions?.releaseMultiplier ?? 1),
        startOffsetMs: leadRhythmOptions?.startOffsetMs,
      });
    case 'a-prime':
      return transformAprimeSectionNote(
        note,
        sectionContext.phrasePosition,
        sectionContext.isGeneratedRepairNote,
        layerTreatment,
        harmonySustainMultiplier,
        leadRhythmOptions
      );
    case 'b':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          layerTreatment.durationMultiplier *
          harmonySustainMultiplier *
          (leadRhythmOptions?.durationMultiplier ?? 1),
        releaseMultiplier: leadRhythmOptions?.releaseMultiplier,
        startOffsetMs: leadRhythmOptions?.startOffsetMs,
      });
    case 'variation':
      return transformVariationSectionNote(
        note,
        sectionContext.phrasePosition,
        sectionContext.isGeneratedRepairNote,
        layerTreatment,
        harmonySustainMultiplier,
        leadRhythmOptions
      );
    case 'return':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          harmonySustainMultiplier *
          (leadRhythmOptions?.durationMultiplier ?? 1),
        releaseMultiplier: leadRhythmOptions?.releaseMultiplier,
        startOffsetMs: leadRhythmOptions?.startOffsetMs,
      });
    case 'outro':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          layerTreatment.durationMultiplier *
          harmonySustainMultiplier *
          (leadRhythmOptions?.durationMultiplier ?? 1),
        releaseMultiplier:
          layerTreatment.releaseMultiplier *
          (leadRhythmOptions?.releaseMultiplier ?? 1),
        startOffsetMs: leadRhythmOptions?.startOffsetMs,
      });
    case 'a':
    default:
      return scaleSongNote(note, {
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          harmonySustainMultiplier *
          (leadRhythmOptions?.durationMultiplier ?? 1),
        releaseMultiplier: leadRhythmOptions?.releaseMultiplier,
        startOffsetMs: leadRhythmOptions?.startOffsetMs,
      });
  }
}

function transformAprimeSectionNote(
  note: ProceduralMusicNote,
  phrasePosition: number,
  preserveRepairPitch: boolean,
  layerTreatment: ReturnType<typeof resolveSongSectionLayerTreatment>,
  harmonySustainMultiplier: number,
  leadRhythmOptions: {
    startOffsetMs: number;
    durationMultiplier: number;
    releaseMultiplier: number;
  } | null
): ProceduralMusicNote {
  const endingOffsetSemitones =
    !preserveRepairPitch && note.role === 'lead' && phrasePosition >= 6
      ? phrasePosition === 6
        ? 2
        : 3
      : note.role === 'harmony' && phrasePosition === 7
        ? 2
        : 0;
  const rhythmShiftMs =
    !preserveRepairPitch && note.role === 'lead' && phrasePosition >= 4
      ? (phrasePosition - 3) * 18
      : 0;

  return scaleSongNote(note, {
    volumeMultiplier: layerTreatment.volumeMultiplier,
    velocityMultiplier: layerTreatment.velocityMultiplier,
    durationMultiplier:
      layerTreatment.durationMultiplier *
      harmonySustainMultiplier *
      (leadRhythmOptions?.durationMultiplier ?? 1),
    releaseMultiplier: leadRhythmOptions?.releaseMultiplier,
    startOffsetMs: rhythmShiftMs + (leadRhythmOptions?.startOffsetMs ?? 0),
    transposeSemitones: endingOffsetSemitones,
  });
}

function transformVariationSectionNote(
  note: ProceduralMusicNote,
  phrasePosition: number,
  preserveRepairPitch: boolean,
  layerTreatment: ReturnType<typeof resolveSongSectionLayerTreatment>,
  harmonySustainMultiplier: number,
  leadRhythmOptions: {
    startOffsetMs: number;
    durationMultiplier: number;
    releaseMultiplier: number;
  } | null
): ProceduralMusicNote {
  const transposeSemitones =
    !preserveRepairPitch && note.role === 'lead'
      ? ([0, 0, 2, 0, 3, 2, 0, -2][phrasePosition] ?? 0)
      : note.role === 'harmony' && phrasePosition >= 6
        ? -2
        : 0;
  const rhythmShiftMs =
    !preserveRepairPitch && note.role === 'lead'
      ? ([0, 24, 48, 72, 0, 24, 48, 96][phrasePosition] ?? 0)
      : note.role === 'harmony'
        ? ([0, 0, 22, 22, 0, 0, 44, 44][phrasePosition] ?? 0)
        : 0;

  return scaleSongNote(note, {
    volumeMultiplier: layerTreatment.volumeMultiplier,
    velocityMultiplier: layerTreatment.velocityMultiplier,
    durationMultiplier:
      layerTreatment.durationMultiplier *
      harmonySustainMultiplier *
      (leadRhythmOptions?.durationMultiplier ?? 1),
    releaseMultiplier:
      layerTreatment.releaseMultiplier *
      (leadRhythmOptions?.releaseMultiplier ?? 1),
    startOffsetMs: rhythmShiftMs + (leadRhythmOptions?.startOffsetMs ?? 0),
    transposeSemitones,
  });
}

function resolveSectionLeadRhythmIdentity(
  sectionId: ProceduralMusicSongSection['id']
): {
  startOffsetMs: readonly number[];
  durationMultiplier: readonly number[];
  releaseMultiplier: readonly number[];
} {
  switch (sectionId) {
    case 'intro':
      return {
        startOffsetMs: [0, 10, 0, 16, 0, 22, 0, 34],
        durationMultiplier: [1.16, 0.94, 1.1, 0.92, 1.12, 0.95, 1.16, 1.22],
        releaseMultiplier: [1.08, 1, 1.04, 1, 1.08, 1, 1.1, 1.16],
      };
    case 'a':
      return NEUTRAL_SECTION_LEAD_RHYTHM_IDENTITY;
    case 'a-prime':
      return {
        startOffsetMs: [0, 0, 0, 0, 18, 36, 54, 78],
        durationMultiplier: [1, 1, 1, 1, 1.02, 1.04, 1.06, 1.1],
        releaseMultiplier: [1, 1, 1, 1, 1.02, 1.04, 1.08, 1.1],
      };
    case 'b':
      return {
        startOffsetMs: [0, -12, 14, 0, 22, -10, 20, 0],
        durationMultiplier: [0.98, 1.06, 0.94, 1.08, 0.96, 1.04, 0.98, 1.1],
        releaseMultiplier: [1, 1.04, 0.98, 1.06, 1, 1.02, 1.02, 1.08],
      };
    case 'variation':
      return {
        startOffsetMs: [0, 24, 48, 72, 0, 24, 48, 96],
        durationMultiplier: [1.08, 1.06, 1.04, 1.02, 1.1, 1.08, 1.06, 1.14],
        releaseMultiplier: [1.04, 1.06, 1.08, 1.1, 1.08, 1.1, 1.12, 1.16],
      };
    case 'return':
      return {
        startOffsetMs: [0, 0, -14, 0, 0, 0, -10, 0],
        durationMultiplier: [1.08, 1.02, 0.98, 1.04, 1.08, 1.02, 1, 1.1],
        releaseMultiplier: [1.04, 1.02, 1, 1.04, 1.06, 1.02, 1, 1.08],
      };
    case 'outro':
      return {
        startOffsetMs: [0, 0, 0, 14, 0, 0, 20, 34],
        durationMultiplier: [1.1, 1.02, 1.06, 1.12, 1.14, 1.08, 1.16, 1.24],
        releaseMultiplier: [1.06, 1.02, 1.04, 1.08, 1.1, 1.08, 1.14, 1.2],
      };
    default:
      return NEUTRAL_SECTION_LEAD_RHYTHM_IDENTITY;
  }
}

function resolveLeadRhythmIdentityOptions(options: {
  rhythmIdentity: {
    startOffsetMs: readonly number[];
    durationMultiplier: readonly number[];
    releaseMultiplier: readonly number[];
  };
  phrasePosition: number;
  preserveRepairPitch: boolean;
}): {
  startOffsetMs: number;
  durationMultiplier: number;
  releaseMultiplier: number;
} {
  if (options.preserveRepairPitch) {
    return {
      startOffsetMs: 0,
      durationMultiplier: 1,
      releaseMultiplier: 1,
    };
  }

  const patternIndex = options.phrasePosition % 8;
  return {
    startOffsetMs: options.rhythmIdentity.startOffsetMs[patternIndex] ?? 0,
    durationMultiplier:
      options.rhythmIdentity.durationMultiplier[patternIndex] ?? 1,
    releaseMultiplier:
      options.rhythmIdentity.releaseMultiplier[patternIndex] ?? 1,
  };
}

function scaleSongNote(
  note: ProceduralMusicNote,
  options: {
    volumeMultiplier?: number;
    velocityMultiplier?: number;
    durationMultiplier?: number;
    releaseMultiplier?: number;
    startOffsetMs?: number;
    transposeSemitones?: number;
  }
): ProceduralMusicNote {
  const durationMultiplier = options.durationMultiplier ?? 1;
  const releaseMultiplier = options.releaseMultiplier ?? 1;
  const transposeSemitones = options.transposeSemitones ?? 0;
  const nextVelocity =
    note.velocity === undefined
      ? undefined
      : Math.max(
          1,
          Math.min(
            127,
            Math.round(note.velocity * (options.velocityMultiplier ?? 1))
          )
        );
  const frequency =
    transposeSemitones === 0
      ? note.frequency
      : transposeSongNoteFrequencyInMode(note, transposeSemitones);
  return {
    ...note,
    startMs: note.startMs + (options.startOffsetMs ?? 0),
    durationMs: Math.max(24, Math.round(note.durationMs * durationMultiplier)),
    frequency,
    volume: note.volume * (options.volumeMultiplier ?? 1),
    velocity: nextVelocity,
    timbre:
      nextVelocity === undefined
        ? note.timbre
        : resolveVelocityShapedInstrumentTimbre({
            timbre: note.timbre,
            velocity: nextVelocity,
          }),
    releaseMs: Math.max(12, Math.round(note.releaseMs * releaseMultiplier)),
  };
}

function transposeSongNoteFrequencyInMode(
  note: ProceduralMusicNote,
  transposeSemitones: number
): number {
  if (note.role === 'percussion') {
    return note.frequency;
  }

  const theme = resolveMusicThemeById(note.themeId);
  const currentRelativeSemitones = Math.round(
    Math.log2(note.frequency / Math.max(theme.rootHz, Number.EPSILON)) * 12
  );
  const targetSemitones = currentRelativeSemitones + transposeSemitones;
  const resolvedSemitones = resolveNearestInModeSemitone(
    theme.scale,
    targetSemitones
  );

  return theme.rootHz * SEMITONE_RATIO ** resolvedSemitones;
}

function resolveNearestInModeSemitone(
  scale: readonly number[],
  targetSemitones: number
): number {
  if (isProceduralSemitoneInMode(scale, targetSemitones)) {
    return targetSemitones;
  }

  for (let distance = 1; distance <= 2; distance += 1) {
    const downward = targetSemitones - distance;
    if (isProceduralSemitoneInMode(scale, downward)) {
      return downward;
    }
    const upward = targetSemitones + distance;
    if (isProceduralSemitoneInMode(scale, upward)) {
      return upward;
    }
  }

  return targetSemitones;
}
