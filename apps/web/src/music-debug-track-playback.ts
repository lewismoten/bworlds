import {
  MUSIC_DEBUG_DISPLAY_ROLE_ORDER,
  normalizeMusicDebugDisplayRoles,
  type MusicDebugDisplayRole,
} from './music-debug-role-display.ts';

export type MusicDebugTrackPlaybackState = {
  soloRoles: readonly MusicDebugDisplayRole[];
  mutedRoles: readonly MusicDebugDisplayRole[];
};

export const DEFAULT_MUSIC_DEBUG_TRACK_PLAYBACK_STATE: MusicDebugTrackPlaybackState =
  {
    soloRoles: [],
    mutedRoles: [],
  };

export function normalizeMusicDebugTrackPlaybackState(
  value: Partial<MusicDebugTrackPlaybackState> | null | undefined
): MusicDebugTrackPlaybackState {
  return {
    soloRoles: normalizeMusicDebugDisplayRoles(value?.soloRoles),
    mutedRoles: normalizeMusicDebugDisplayRoles(value?.mutedRoles),
  };
}

export function toggleMusicDebugTrackSoloRole(
  state: MusicDebugTrackPlaybackState,
  role: MusicDebugDisplayRole
): MusicDebugTrackPlaybackState {
  const nextSoloRoles = state.soloRoles.includes(role)
    ? state.soloRoles.filter((entry) => entry !== role)
    : [...state.soloRoles, role];
  return {
    soloRoles: nextSoloRoles,
    mutedRoles: state.mutedRoles.filter((entry) => entry !== role),
  };
}

export function toggleMusicDebugTrackMutedRole(
  state: MusicDebugTrackPlaybackState,
  role: MusicDebugDisplayRole
): MusicDebugTrackPlaybackState {
  const nextMutedRoles = state.mutedRoles.includes(role)
    ? state.mutedRoles.filter((entry) => entry !== role)
    : [...state.mutedRoles, role];
  return {
    soloRoles: state.soloRoles.filter((entry) => entry !== role),
    mutedRoles: nextMutedRoles,
  };
}

export function resolveMusicDebugAudibleTrackRoles(
  state: MusicDebugTrackPlaybackState,
  availableRoles: readonly MusicDebugDisplayRole[] = MUSIC_DEBUG_DISPLAY_ROLE_ORDER
): readonly MusicDebugDisplayRole[] {
  const availableRoleSet = new Set(availableRoles);
  const soloRoles = state.soloRoles.filter((role) =>
    availableRoleSet.has(role)
  );
  if (soloRoles.length > 0) {
    return soloRoles;
  }

  const mutedRoleSet = new Set(
    state.mutedRoles.filter((role) => availableRoleSet.has(role))
  );
  if (mutedRoleSet.size === 0) {
    return [...availableRoles];
  }

  return availableRoles.filter((role) => !mutedRoleSet.has(role));
}
