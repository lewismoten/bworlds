import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import {
  formatMusicDebugDisplayRoleLabel,
  MUSIC_DEBUG_DISPLAY_ROLE_ORDER,
} from './music-debug-role-display.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugSectionVelocityRoleStats = {
  noteCount: number;
  minVelocity: number | null;
  maxVelocity: number | null;
  averageVelocity: number;
  dynamicRange: number;
};

export type MusicDebugSectionVelocityStats = {
  sectionId: string;
  sectionLabel: string;
  velocityByRole: Record<
    ProceduralMusicRole,
    MusicDebugSectionVelocityRoleStats
  >;
};

export function createMusicDebugSectionVelocityStats(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
}): MusicDebugSectionVelocityStats[] {
  return options.sections.map((section) => {
    const velocityByRole = createEmptyVelocityStatsByRole();
    const velocityTotalsByRole: Partial<Record<ProceduralMusicRole, number>> =
      {};

    for (const note of options.notes) {
      if (
        note.startMs < section.startOffsetMs ||
        note.startMs >= section.startOffsetMs + section.durationMs ||
        typeof note.velocity !== 'number' ||
        !Number.isFinite(note.velocity)
      ) {
        continue;
      }
      const velocityLevel = Math.round(note.velocity);
      const roleStats = velocityByRole[note.role];
      roleStats.noteCount += 1;
      roleStats.minVelocity =
        roleStats.minVelocity === null
          ? velocityLevel
          : Math.min(roleStats.minVelocity, velocityLevel);
      roleStats.maxVelocity =
        roleStats.maxVelocity === null
          ? velocityLevel
          : Math.max(roleStats.maxVelocity, velocityLevel);
      velocityTotalsByRole[note.role] =
        (velocityTotalsByRole[note.role] ?? 0) + velocityLevel;
    }

    for (const role of MUSIC_DEBUG_DISPLAY_ROLE_ORDER) {
      const roleStats = velocityByRole[role];
      roleStats.averageVelocity =
        roleStats.noteCount > 0
          ? (velocityTotalsByRole[role] ?? 0) / roleStats.noteCount
          : 0;
      roleStats.dynamicRange =
        roleStats.minVelocity === null || roleStats.maxVelocity === null
          ? 0
          : roleStats.maxVelocity - roleStats.minVelocity;
    }

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      velocityByRole,
    };
  });
}

export function formatMusicDebugSectionVelocitySummary(
  stats: readonly MusicDebugSectionVelocityStats[]
): string {
  return stats
    .map((section) => {
      const roleSummaries = MUSIC_DEBUG_DISPLAY_ROLE_ORDER.map((role) => {
        const roleStats = section.velocityByRole[role];
        if (roleStats.noteCount === 0 || roleStats.minVelocity === null) {
          return `${formatMusicDebugDisplayRoleLabel(role)} n/a`;
        }
        return `${formatMusicDebugDisplayRoleLabel(role)} ${roleStats.minVelocity}-${roleStats.maxVelocity ?? roleStats.minVelocity} dyn ${roleStats.dynamicRange} avg ${Math.round(roleStats.averageVelocity)}`;
      });
      return `${section.sectionLabel} ${roleSummaries.join(' / ')}`;
    })
    .join(' | ');
}

function createEmptyVelocityStatsByRole(): Record<
  ProceduralMusicRole,
  MusicDebugSectionVelocityRoleStats
> {
  return {
    lead: createEmptyVelocityStats(),
    harmony: createEmptyVelocityStats(),
    bass: createEmptyVelocityStats(),
    percussion: createEmptyVelocityStats(),
  };
}

function createEmptyVelocityStats(): MusicDebugSectionVelocityRoleStats {
  return {
    noteCount: 0,
    minVelocity: null,
    maxVelocity: null,
    averageVelocity: 0,
    dynamicRange: 0,
  };
}
