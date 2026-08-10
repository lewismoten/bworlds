import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type ProceduralSongLayerTreatment = {
  muted: boolean;
  volumeMultiplier: number;
  durationMultiplier: number;
  releaseMultiplier: number;
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
  switch (section.id) {
    case 'intro':
      return {
        muted:
          note.role === 'percussion' ||
          (note.role === 'bass' && noteIndexInSection % 2 === 1),
        volumeMultiplier: note.role === 'lead' ? 0.84 : 0.68,
        durationMultiplier: note.role === 'harmony' ? 1.14 : 1,
        releaseMultiplier: 1.12,
      };
    case 'a-prime':
      return {
        muted: false,
        volumeMultiplier: note.role === 'lead' ? 1.06 : 1,
        durationMultiplier: note.role === 'harmony' ? 1.08 : 1,
        releaseMultiplier: 1,
      };
    case 'b':
      return {
        muted: note.role === 'harmony' && noteIndexInSection % 5 === 0,
        volumeMultiplier:
          note.role === 'lead' ? 1.08 : note.role === 'percussion' ? 0.9 : 1,
        durationMultiplier: note.role === 'bass' ? 1.1 : 1,
        releaseMultiplier: 1,
      };
    case 'variation':
      return {
        muted: note.role === 'percussion' && noteIndexInSection % 4 === 0,
        volumeMultiplier: note.role === 'harmony' ? 0.92 : 1,
        durationMultiplier:
          note.role === 'lead' ? 1.78 : note.role === 'harmony' ? 1.1 : 1,
        releaseMultiplier: note.role === 'lead' ? 1.18 : 1,
      };
    case 'return':
      return {
        muted: false,
        volumeMultiplier: note.role === 'lead' ? 0.94 : 0.98,
        durationMultiplier: 1,
        releaseMultiplier: 1,
      };
    case 'outro':
      return {
        muted:
          note.role === 'percussion' ||
          (note.role === 'lead' && noteIndexInSection % 2 === 1),
        volumeMultiplier: 0.72,
        durationMultiplier: note.role === 'harmony' ? 1.2 : 1.08,
        releaseMultiplier: 1.24,
      };
    case 'a':
    default:
      return {
        muted: false,
        volumeMultiplier: 1,
        durationMultiplier: 1,
        releaseMultiplier: 1,
      };
  }
}
