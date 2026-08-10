import type { ProceduralMusicNote } from './procedural-music.ts';
import { resolveVelocityShapedInstrumentTimbre } from './music-instrument-timbres.ts';
import { resolveMusicThemeById } from './procedural-music.ts';
import { isProceduralSemitoneInMode } from './procedural-music-scale.ts';
import { resolveSongHarmonySustainMultiplier } from './procedural-music-harmony-sustain.ts';
import { createProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';
import { resolveSongSectionLayerTreatment } from './procedural-music-song-layers.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

const SEMITONE_RATIO = 2 ** (1 / 12);

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

  switch (section.id) {
    case 'intro':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          layerTreatment.durationMultiplier * harmonySustainMultiplier,
        releaseMultiplier: layerTreatment.releaseMultiplier,
      });
    case 'a-prime':
      return transformAprimeSectionNote(
        note,
        noteIndexInSection,
        layerTreatment,
        harmonySustainMultiplier
      );
    case 'b':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          layerTreatment.durationMultiplier * harmonySustainMultiplier,
      });
    case 'variation':
      return transformVariationSectionNote(
        note,
        noteIndexInSection,
        layerTreatment,
        harmonySustainMultiplier
      );
    case 'return':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier: harmonySustainMultiplier,
      });
    case 'outro':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier:
          layerTreatment.durationMultiplier * harmonySustainMultiplier,
        releaseMultiplier: layerTreatment.releaseMultiplier,
      });
    case 'a':
    default:
      return scaleSongNote(note, {
        velocityMultiplier: layerTreatment.velocityMultiplier,
        durationMultiplier: harmonySustainMultiplier,
      });
  }
}

function transformAprimeSectionNote(
  note: ProceduralMusicNote,
  noteIndexInSection: number,
  layerTreatment: ReturnType<typeof resolveSongSectionLayerTreatment>,
  harmonySustainMultiplier: number
): ProceduralMusicNote {
  const preserveRepairPitch = isGeneratedLeadRepairNote(note);
  const phrasePosition = noteIndexInSection % 8;
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
      layerTreatment.durationMultiplier * harmonySustainMultiplier,
    startOffsetMs: rhythmShiftMs,
    transposeSemitones: endingOffsetSemitones,
  });
}

function transformVariationSectionNote(
  note: ProceduralMusicNote,
  noteIndexInSection: number,
  layerTreatment: ReturnType<typeof resolveSongSectionLayerTreatment>,
  harmonySustainMultiplier: number
): ProceduralMusicNote {
  const preserveRepairPitch = isGeneratedLeadRepairNote(note);
  const phrasePosition = noteIndexInSection % 8;
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
      layerTreatment.durationMultiplier * harmonySustainMultiplier,
    releaseMultiplier: layerTreatment.releaseMultiplier,
    startOffsetMs: rhythmShiftMs,
    transposeSemitones,
  });
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

function isGeneratedLeadRepairNote(
  note: Pick<ProceduralMusicNote, 'instrumentId'>
): boolean {
  return note.instrumentId.includes(':measure-');
}
