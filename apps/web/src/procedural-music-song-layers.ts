import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type ProceduralSongLayerTreatment = {
  muted: boolean;
  volumeMultiplier: number;
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
      return `${section.label}: lighter harmony`;
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
  section: ProceduralMusicSongSection,
  note: Pick<ProceduralMusicNote, 'role'>,
  noteIndexInSection: number
): ProceduralSongLayerTreatment {
  const harmonyLeadSpace = resolveHarmonyLeadSpaceConfig(section.id, note.role);

  switch (section.id) {
    case 'intro':
      return {
        muted:
          note.role === 'percussion' ||
          (note.role === 'bass' && noteIndexInSection % 2 === 1),
        volumeMultiplier: note.role === 'lead' ? 0.84 : 0.68,
        durationMultiplier:
          note.role === 'harmony'
            ? 1.14 * harmonyLeadSpace.durationMultiplier
            : 1,
        releaseMultiplier: 1.12,
      };
    case 'a-prime':
      return {
        muted: shouldMuteHarmonyForLeadSpace(
          harmonyLeadSpace,
          noteIndexInSection
        ),
        volumeMultiplier:
          note.role === 'lead'
            ? 1.06
            : note.role === 'harmony'
              ? harmonyLeadSpace.volumeMultiplier
              : 1,
        durationMultiplier:
          note.role === 'lead'
            ? 1.08
            : note.role === 'harmony'
              ? 1.08 * harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: 1,
      };
    case 'b':
      return {
        muted:
          shouldMuteHarmonyForLeadSpace(harmonyLeadSpace, noteIndexInSection) ||
          (note.role === 'harmony' && noteIndexInSection % 2 === 0),
        volumeMultiplier:
          note.role === 'lead'
            ? 1.08
            : note.role === 'percussion'
              ? 0.88
              : note.role === 'harmony'
                ? harmonyLeadSpace.volumeMultiplier
                : 1,
        durationMultiplier:
          note.role === 'bass'
            ? 1.06
            : note.role === 'harmony'
              ? harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: 1,
      };
    case 'variation':
      return {
        muted:
          (note.role === 'percussion' && noteIndexInSection % 4 === 0) ||
          shouldMuteHarmonyForLeadSpace(harmonyLeadSpace, noteIndexInSection),
        volumeMultiplier:
          note.role === 'harmony' ? harmonyLeadSpace.volumeMultiplier : 1,
        durationMultiplier:
          note.role === 'lead'
            ? 1.78
            : note.role === 'harmony'
              ? 1.1 * harmonyLeadSpace.durationMultiplier
              : 1,
        releaseMultiplier: note.role === 'lead' ? 1.18 : 1,
      };
    case 'return':
      return {
        muted: false,
        volumeMultiplier:
          note.role === 'lead'
            ? 0.94
            : note.role === 'harmony'
              ? harmonyLeadSpace.volumeMultiplier
              : 1.02,
        durationMultiplier:
          note.role === 'harmony'
            ? harmonyLeadSpace.durationMultiplier
            : note.role === 'bass'
              ? 1.06
              : 1,
        releaseMultiplier:
          note.role === 'harmony' ? 1.08 : note.role === 'lead' ? 1.02 : 1,
      };
    case 'outro':
      return {
        muted:
          note.role === 'percussion' ||
          (note.role === 'lead' && noteIndexInSection % 2 === 1),
        volumeMultiplier: 0.72,
        durationMultiplier:
          note.role === 'harmony'
            ? 1.2 * harmonyLeadSpace.durationMultiplier
            : 1.08,
        releaseMultiplier: 1.24,
      };
    case 'a':
    default:
      return {
        muted: false,
        volumeMultiplier:
          note.role === 'harmony' ? harmonyLeadSpace.volumeMultiplier : 1,
        durationMultiplier:
          note.role === 'harmony' ? harmonyLeadSpace.durationMultiplier : 1,
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
