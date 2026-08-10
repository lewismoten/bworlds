import type { MusicDebugSectionLayerActivity } from './music-debug-section-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

type MusicDebugDensityRange = {
  minNotesPerMeasure?: number;
  maxNotesPerMeasure?: number;
};

export type MusicDebugSectionDensityValidation = {
  sectionId: string;
  sectionLabel: string;
  noteDensityByRole: Record<ProceduralMusicRole, number>;
  matchesPlan: boolean;
  messages: string[];
};

export type MusicDebugDensityValidation = {
  sections: MusicDebugSectionDensityValidation[];
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugDensity(options: {
  sections: readonly ProceduralMusicSongSection[];
  activities: readonly MusicDebugSectionLayerActivity[];
}): MusicDebugDensityValidation {
  const sectionChecks = options.sections.map((section) => {
    const activity =
      options.activities.find((entry) => entry.sectionId === section.id) ??
      null;
    const noteDensityByRole = createEmptyRoleDensityMap();
    const messages: string[] = [];

    for (const role of MUSIC_DEBUG_DENSITY_ROLES) {
      const noteCount = activity?.roleCounts[role] ?? 0;
      const notesPerMeasure =
        section.measureCount > 0 ? noteCount / section.measureCount : 0;
      noteDensityByRole[role] = notesPerMeasure;
      const range = resolveSectionRoleDensityRange(section.id, role);

      if (
        range.minNotesPerMeasure !== undefined &&
        notesPerMeasure < range.minNotesPerMeasure
      ) {
        messages.push(
          `${role} density ${notesPerMeasure.toFixed(2)} stayed below ${range.minNotesPerMeasure.toFixed(2)} notes/measure`
        );
      }
      if (
        range.maxNotesPerMeasure !== undefined &&
        notesPerMeasure > range.maxNotesPerMeasure
      ) {
        messages.push(
          `${role} density ${notesPerMeasure.toFixed(2)} exceeded ${range.maxNotesPerMeasure.toFixed(2)} notes/measure`
        );
      }
    }

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      noteDensityByRole,
      matchesPlan: messages.length === 0,
      messages,
    };
  });

  const messages = sectionChecks.flatMap((check) =>
    check.messages.map((message) => `${check.sectionLabel}: ${message}`)
  );

  return {
    sections: sectionChecks,
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

function resolveSectionRoleDensityRange(
  sectionId: ProceduralMusicSongSection['id'],
  role: ProceduralMusicRole
): MusicDebugDensityRange {
  const sectionRanges = SECTION_ROLE_DENSITY_RANGES[sectionId] ?? {};
  return sectionRanges[role] ?? DEFAULT_ROLE_DENSITY_RANGES[role];
}

function createEmptyRoleDensityMap(): Record<ProceduralMusicRole, number> {
  return {
    bass: 0,
    harmony: 0,
    lead: 0,
    percussion: 0,
  };
}

const MUSIC_DEBUG_DENSITY_ROLES: readonly ProceduralMusicRole[] = [
  'bass',
  'harmony',
  'lead',
  'percussion',
];

const DEFAULT_ROLE_DENSITY_RANGES: Record<
  ProceduralMusicRole,
  MusicDebugDensityRange
> = {
  bass: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 2.5 },
  harmony: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 4.5 },
  lead: { minNotesPerMeasure: 1, maxNotesPerMeasure: 6 },
  percussion: { minNotesPerMeasure: 0, maxNotesPerMeasure: 6 },
};

const SECTION_ROLE_DENSITY_RANGES: Partial<
  Record<
    ProceduralMusicSongSection['id'],
    Partial<Record<ProceduralMusicRole, MusicDebugDensityRange>>
  >
> = {
  intro: {
    bass: { minNotesPerMeasure: 0.125, maxNotesPerMeasure: 1.5 },
    harmony: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 3.5 },
    lead: { minNotesPerMeasure: 1, maxNotesPerMeasure: 4.5 },
    percussion: { minNotesPerMeasure: 0, maxNotesPerMeasure: 0 },
  },
  a: {
    bass: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 2.5 },
    harmony: { minNotesPerMeasure: 0.75, maxNotesPerMeasure: 4.5 },
    lead: { minNotesPerMeasure: 1.5, maxNotesPerMeasure: 6 },
    percussion: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 4.5 },
  },
  'a-prime': {
    bass: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 2.5 },
    harmony: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 3.5 },
    lead: { minNotesPerMeasure: 1.5, maxNotesPerMeasure: 6 },
    percussion: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 4.5 },
  },
  b: {
    bass: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 2.5 },
    harmony: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 3 },
    lead: { minNotesPerMeasure: 1.25, maxNotesPerMeasure: 5.5 },
    percussion: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 4.5 },
  },
  variation: {
    bass: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 2.5 },
    harmony: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 3.5 },
    lead: { minNotesPerMeasure: 1, maxNotesPerMeasure: 4.5 },
    percussion: { minNotesPerMeasure: 0.125, maxNotesPerMeasure: 4 },
  },
  return: {
    bass: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 2.5 },
    harmony: { minNotesPerMeasure: 0.75, maxNotesPerMeasure: 4.5 },
    lead: { minNotesPerMeasure: 1.5, maxNotesPerMeasure: 6 },
    percussion: { minNotesPerMeasure: 0.5, maxNotesPerMeasure: 4.5 },
  },
  outro: {
    bass: { minNotesPerMeasure: 0.125, maxNotesPerMeasure: 2 },
    harmony: { minNotesPerMeasure: 0.25, maxNotesPerMeasure: 3.5 },
    lead: { minNotesPerMeasure: 0.75, maxNotesPerMeasure: 4 },
    percussion: { minNotesPerMeasure: 0, maxNotesPerMeasure: 0 },
  },
};
