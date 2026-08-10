import type { MusicDebugSectionLayerActivity } from './music-debug-section-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugSectionRoleProminence = {
  attackDensityPerSecond: number;
  averageVolume: number;
  averageMidiNote: number | null;
  densityScore: number;
  volumeScore: number;
  registerScore: number;
  competitionPenalty: number;
  prominenceScore: number;
};

export type MusicDebugSectionProminence = {
  sectionId: string;
  sectionLabel: string;
  roles: Record<ProceduralMusicRole, MusicDebugSectionRoleProminence>;
};

const PROCEDURAL_MUSIC_ROLES: readonly ProceduralMusicRole[] = [
  'bass',
  'harmony',
  'lead',
  'percussion',
];

export function createMusicDebugSectionProminence(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  activities: readonly MusicDebugSectionLayerActivity[];
}): MusicDebugSectionProminence[] {
  const songStartMs = options.notes[0]?.startMs ?? 0;
  const rawProminence = options.sections.map((section) => {
    const sectionStartMs = songStartMs + section.startOffsetMs;
    const sectionEndMs = sectionStartMs + section.durationMs;
    const notesByRole = collectNotesByRole(
      options.notes,
      sectionStartMs,
      sectionEndMs
    );
    const activity =
      options.activities.find(
        (candidate) => candidate.sectionId === section.id
      ) ?? null;

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      roles: createRoleProminenceMap((role) => {
        const roleNotes = notesByRole[role];
        const noteCount = roleNotes.length;
        const attackDensityPerSecond =
          section.durationMs <= 0 ? 0 : noteCount / (section.durationMs / 1000);
        const averageVolume =
          noteCount === 0
            ? 0
            : roleNotes.reduce((sum, note) => sum + note.volume, 0) / noteCount;
        const averageMidiNote =
          role === 'percussion' || noteCount === 0
            ? null
            : roleNotes.reduce(
                (sum, note) => sum + resolveMidiNote(note.frequency),
                0
              ) / noteCount;
        const competitionPenalty =
          activity === null ? 0 : resolveCompetitionPenalty(activity, role);

        return {
          attackDensityPerSecond,
          averageVolume,
          averageMidiNote,
          densityScore: 0,
          volumeScore: 0,
          registerScore: 0,
          competitionPenalty,
          prominenceScore: 0,
        };
      }),
    };
  });

  return rawProminence.map((section) => ({
    sectionId: section.sectionId,
    sectionLabel: section.sectionLabel,
    roles: createRoleProminenceMap((role) => {
      const raw = section.roles[role];
      const densityScore =
        normalizeRoleMetric(
          rawProminence,
          section.sectionId,
          role,
          (entry) => entry.attackDensityPerSecond
        ) * 45;
      const volumeScore =
        normalizeRoleMetric(
          rawProminence,
          section.sectionId,
          role,
          (entry) => entry.averageVolume
        ) * 35;
      const registerScore =
        role === 'percussion'
          ? 0
          : normalizeRoleMetric(
              rawProminence,
              section.sectionId,
              role,
              (entry) => entry.averageMidiNote ?? 0
            ) * 20;
      const prominenceScore =
        densityScore + volumeScore + registerScore - raw.competitionPenalty;

      return {
        ...raw,
        densityScore,
        volumeScore,
        registerScore,
        prominenceScore,
      };
    }),
  }));
}

function collectNotesByRole(
  notes: readonly ProceduralMusicNote[],
  sectionStartMs: number,
  sectionEndMs: number
): Record<ProceduralMusicRole, ProceduralMusicNote[]> {
  const notesByRole: Record<ProceduralMusicRole, ProceduralMusicNote[]> = {
    bass: [],
    harmony: [],
    lead: [],
    percussion: [],
  };

  for (const note of notes) {
    if (note.startMs < sectionStartMs || note.startMs >= sectionEndMs) {
      continue;
    }
    notesByRole[note.role].push(note);
  }

  return notesByRole;
}

function createRoleProminenceMap<T>(
  createValue: (role: ProceduralMusicRole) => T
): Record<ProceduralMusicRole, T> {
  return {
    bass: createValue('bass'),
    harmony: createValue('harmony'),
    lead: createValue('lead'),
    percussion: createValue('percussion'),
  };
}

function normalizeRoleMetric(
  sections: readonly {
    sectionId: string;
    roles: Record<ProceduralMusicRole, MusicDebugSectionRoleProminence>;
  }[],
  sectionId: string,
  role: ProceduralMusicRole,
  readValue: (entry: MusicDebugSectionRoleProminence) => number
): number {
  const values = sections.map((section) => readValue(section.roles[role]));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue;
  if (range <= Number.EPSILON) {
    return 0.5;
  }
  const currentValue = readValue(
    sections.find((section) => section.sectionId === sectionId)!.roles[role]
  );
  return (currentValue - minValue) / range;
}

function resolveCompetitionPenalty(
  activity: MusicDebugSectionLayerActivity,
  role: ProceduralMusicRole
): number {
  const competingRoles = PROCEDURAL_MUSIC_ROLES.filter(
    (candidateRole) => candidateRole !== role
  );
  const totalCompetingOccupancy = competingRoles.reduce(
    (sum, candidateRole) =>
      sum + activity.soundingTimePercentageByRole[candidateRole],
    0
  );
  return totalCompetingOccupancy / Math.max(1, competingRoles.length) / 5;
}

function resolveMidiNote(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(Math.max(frequency, 1) / 440));
}
