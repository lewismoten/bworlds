import type { ProceduralMusicNote } from './procedural-music.ts';

export type MusicDebugDisplayRole = ProceduralMusicNote['role'];

const MUSIC_DEBUG_ROLE_LABELS: Record<MusicDebugDisplayRole, string> = {
  lead: 'Melody',
  harmony: 'Harmony',
  bass: 'Bass',
  percussion: 'Percussion',
};

const MUSIC_DEBUG_ROLE_COLORS: Record<MusicDebugDisplayRole, string> = {
  lead: '#ffcc33',
  harmony: '#58c46b',
  bass: '#4f8cff',
  percussion: '#ff5a5f',
};

export const MUSIC_DEBUG_DISPLAY_ROLE_ORDER: readonly MusicDebugDisplayRole[] =
  ['lead', 'harmony', 'bass', 'percussion'];

export function formatMusicDebugDisplayRoleLabel(
  role: MusicDebugDisplayRole
): string {
  return MUSIC_DEBUG_ROLE_LABELS[role];
}

export function resolveMusicDebugDisplayRoleColor(
  role: MusicDebugDisplayRole
): string {
  return MUSIC_DEBUG_ROLE_COLORS[role];
}
