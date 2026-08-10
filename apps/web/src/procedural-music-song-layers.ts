import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type ProceduralSongLayerTreatment = {
  muted: boolean;
  volumeMultiplier: number;
  velocityMultiplier: number;
  durationMultiplier: number;
  releaseMultiplier: number;
};

type HarmonyLeadSpaceConfig = {
  muteEvery: number;
  durationMultiplier: number;
  volumeMultiplier: number;
};

export function describeSongSectionLayerArrangement(
  section: Pick<ProceduralMusicSongSection, 'id' | 'label'>
): string {
  switch (section.id) {
    case 'intro':
      return `${section.label}: no percussion, thin bass`;
    case 'a-prime':
      return `${section.label}: lead-forward reprise`;
    case 'b':
      return `${section.label}: lighter harmony, thinner percussion`;
    case 'variation':
      return `${section.label}: thinner percussion, stretched lead`;
    case 'return':
      return `${section.label}: full layer return`;
    case 'outro':
      return `${section.label}: no percussion, fading lead`;
    case 'a':
    default:
      return `${section.label}: full layer stack`;
  }
}

export function resolveSongSectionLayerTreatment(
  context: Pick<
    ProceduralMusicSongSectionContext,
    'section' | 'note' | 'noteIndexInSection' | 'measureIndex'
  >
): ProceduralSongLayerTreatment {
  const harmonyLeadSpace = resolveHarmonyLeadSpaceConfig(
    context.section.id,
    context.note.role
  );

  switch (context.section.id) {
    case 'intro':
      return {
        muted:
          context.note.role === 'percussion' ||
          (context.note.role === 'bass' &&
            context.noteIndexInSection % 2 === 1),
        volumeMultiplier: context.note.role === 'lead' ? 0.84 : 0.68,
        velocityMultiplier: context.note.role === 'percussion' ? 0.78 : 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? 1.14 * harmonyLeadSpace.durationMultiplier
            : 1,
        releaseMultiplier: 1.12,
      };
    case 'a-prime':
      return {
        muted: shouldMuteHarmonyForLeadSpace(
          harmonyLeadSpace,
          context.noteIndexInSection
        ),
        volumeMultiplier:
          context.note.role === 'lead'
            ? 1.06
            : context.note.role === 'harmony'
              ? harmonyLeadSpace.volumeMultiplier
              : 1,
        velocityMultiplier: context.note.role === 'percussion' ? 1.08 : 1,
        durationMultiplier:
          context.note.role === 'lead'
            ? 1.08
            : context.note.role === 'harmony'
              ? 1.08 * harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: 1,
      };
    case 'b':
      return {
        muted:
          shouldMuteHarmonyForLeadSpace(
            harmonyLeadSpace,
            context.noteIndexInSection
          ) ||
          (context.note.role === 'percussion' &&
            context.measureIndex % 2 === 1) ||
          (context.note.role === 'harmony' &&
            context.noteIndexInSection % 2 === 0),
        volumeMultiplier:
          context.note.role === 'lead'
            ? 1.08
            : context.note.role === 'percussion'
              ? 0.68
              : context.note.role === 'harmony'
                ? harmonyLeadSpace.volumeMultiplier
                : 1,
        velocityMultiplier: context.note.role === 'percussion' ? 0.84 : 1,
        durationMultiplier:
          context.note.role === 'bass'
            ? 1.06
            : context.note.role === 'harmony'
              ? harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: 1,
      };
    case 'variation':
      return {
        muted:
          (context.note.role === 'percussion' &&
            (context.noteIndexInSection % 4 === 0 ||
              context.noteIndexInSection % 5 === 4)) ||
          shouldMuteHarmonyForLeadSpace(
            harmonyLeadSpace,
            context.noteIndexInSection
          ),
        volumeMultiplier:
          context.note.role === 'harmony'
            ? harmonyLeadSpace.volumeMultiplier
            : 1,
        velocityMultiplier: context.note.role === 'percussion' ? 1.18 : 1,
        durationMultiplier:
          context.note.role === 'lead'
            ? 1.78
            : context.note.role === 'harmony'
              ? 1.1 * harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: context.note.role === 'lead' ? 1.18 : 1,
      };
    case 'return':
      return {
        muted: false,
        volumeMultiplier:
          context.note.role === 'lead'
            ? 0.94
            : context.note.role === 'harmony'
              ? harmonyLeadSpace.volumeMultiplier
              : 1.02,
        velocityMultiplier: context.note.role === 'percussion' ? 1.1 : 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? harmonyLeadSpace.durationMultiplier
            : context.note.role === 'bass'
              ? 1.06
              : 1,
        releaseMultiplier:
          context.note.role === 'harmony'
            ? 1.08
            : context.note.role === 'lead'
              ? 1.02
              : 1,
      };
    case 'outro':
      return {
        muted:
          context.note.role === 'percussion' ||
          (context.note.role === 'lead' &&
            context.noteIndexInSection % 2 === 1),
        volumeMultiplier: 0.72,
        velocityMultiplier: context.note.role === 'percussion' ? 0.76 : 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? 1.2 * harmonyLeadSpace.durationMultiplier
            : 1.08,
        releaseMultiplier: 1.24,
      };
    case 'a':
    default:
      return {
        muted: false,
        volumeMultiplier:
          context.note.role === 'harmony'
            ? harmonyLeadSpace.volumeMultiplier
            : 1,
        velocityMultiplier: 1,
        durationMultiplier:
          context.note.role === 'harmony'
            ? harmonyLeadSpace.durationMultiplier
            : 1,
        releaseMultiplier: 1,
      };
  }
}

function resolveHarmonyLeadSpaceConfig(
  sectionId: ProceduralMusicSongSection['id'],
  role: ProceduralMusicNote['role']
): HarmonyLeadSpaceConfig {
  if (role !== 'harmony') {
    return {
      muteEvery: 0,
      durationMultiplier: 1,
      volumeMultiplier: 1,
    };
  }

  switch (sectionId) {
    case 'intro':
      return {
        muteEvery: 0,
        durationMultiplier: 0.94,
        volumeMultiplier: 0.96,
      };
    case 'a':
      return {
        muteEvery: 0,
        durationMultiplier: 0.88,
        volumeMultiplier: 0.9,
      };
    case 'a-prime':
      return {
        muteEvery: 4,
        durationMultiplier: 0.64,
        volumeMultiplier: 0.9,
      };
    case 'b':
      return {
        muteEvery: 2,
        durationMultiplier: 0.5,
        volumeMultiplier: 0.74,
      };
    case 'variation':
      return {
        muteEvery: 4,
        durationMultiplier: 0.62,
        volumeMultiplier: 0.84,
      };
    case 'return':
      return {
        muteEvery: 0,
        durationMultiplier: 1.02,
        volumeMultiplier: 1.04,
      };
    case 'outro':
      return {
        muteEvery: 0,
        durationMultiplier: 0.92,
        volumeMultiplier: 0.94,
      };
    default:
      return {
        muteEvery: 0,
        durationMultiplier: 1,
        volumeMultiplier: 1,
      };
  }
}

function shouldMuteHarmonyForLeadSpace(
  config: HarmonyLeadSpaceConfig,
  noteIndexInSection: number
): boolean {
  return config.muteEvery > 0 && noteIndexInSection % config.muteEvery === 0;
}
