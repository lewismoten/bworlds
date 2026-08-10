import type { MusicDebugPitchClassLabel } from './music-debug-pitch-class.ts';
import { resolveMusicDebugPitchClassLabel } from './music-debug-pitch-class.ts';
import { getProceduralScaleDegreeSemitones } from './procedural-music-scale.ts';
import type { ProceduralMusicSong } from './procedural-music-song.ts';
import type {
  ProceduralInstrumentBank,
} from './procedural-music-sound-bank.ts';
import type {
  ProceduralMusicNote,
} from './procedural-music.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];
type PitchedRole = Exclude<ProceduralMusicRole, 'percussion'>;

export type MusicDebugSongDnaValidation = {
  isValidForMidiExport: boolean;
  messages: string[];
};

const PITCHED_ROLES: readonly PitchedRole[] = ['bass', 'harmony', 'lead'];

export function validateMusicDebugSongDna(options: {
  songDna: ProceduralMusicSong['dna'];
  rootMidiNote: number;
  modePitchOffsets: readonly number[];
  instrumentBank: ProceduralInstrumentBank;
  roleCounts: Record<ProceduralMusicRole, number>;
  outOfModeNotesByRole: Record<ProceduralMusicRole, number>;
  dominantPitchClassesByRole: Record<
    ProceduralMusicRole,
    readonly MusicDebugPitchClassLabel[]
  >;
}): MusicDebugSongDnaValidation {
  const messages: string[] = [];

  if (options.songDna.rootMidiNote !== options.rootMidiNote) {
    messages.push(
      `SongDNA root MIDI ${options.songDna.rootMidiNote} does not match shared scale root ${options.rootMidiNote}.`
    );
  }

  if (options.songDna.themeId !== options.instrumentBank.themeId) {
    messages.push(
      `SongDNA theme ${options.songDna.themeId} does not match instrument bank theme ${options.instrumentBank.themeId}.`
    );
  }

  for (const role of PITCHED_ROLES) {
    const roleNoteCount = options.roleCounts[role];
    if (roleNoteCount <= 0) {
      continue;
    }
    const dominantPitchClasses = options.dominantPitchClassesByRole[role];
    if (dominantPitchClasses.length === 0) {
      messages.push(`SongDNA ${role} track has no dominant pitch center.`);
      continue;
    }
    if (options.outOfModeNotesByRole[role] > roleNoteCount / 2) {
      messages.push(
        `SongDNA ${role} track has more out-of-mode notes than in-mode notes.`
      );
    }
  }

  const expectedPitchCenters = resolveExpectedSongPitchCenters({
    rootMidiNote: options.rootMidiNote,
    modePitchOffsets: options.modePitchOffsets,
    progression: options.songDna.progression,
  });
  for (const role of PITCHED_ROLES) {
    if (options.roleCounts[role] <= 0) {
      continue;
    }
    const dominantPitchClasses = options.dominantPitchClassesByRole[role];
    if (
      dominantPitchClasses.length > 0 &&
      !dominantPitchClasses.some((pitchClass) =>
        expectedPitchCenters.has(pitchClass)
      )
    ) {
      messages.push(
        `SongDNA ${role} track drifted away from the shared tonal centers ${formatPitchCenters(expectedPitchCenters)}.`
      );
    }
  }

  return {
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

function resolveExpectedSongPitchCenters(options: {
  rootMidiNote: number;
  modePitchOffsets: readonly number[];
  progression: readonly number[];
}): Set<MusicDebugPitchClassLabel> {
  const pitchCenters = new Set<MusicDebugPitchClassLabel>([
    resolveMusicDebugPitchClassLabel(options.rootMidiNote),
  ]);

  for (let index = 0; index < options.progression.length; index += 1) {
    const progressionDegree = options.progression[index] ?? 0;
    for (const chordDegreeOffset of CHORD_DEGREE_OFFSETS) {
      const chordToneMidiNote =
        options.rootMidiNote +
        getProceduralScaleDegreeSemitones(
          options.modePitchOffsets,
          progressionDegree + chordDegreeOffset
        );
      pitchCenters.add(resolveMusicDebugPitchClassLabel(chordToneMidiNote));
    }
  }

  return pitchCenters;
}

function formatPitchCenters(
  pitchCenters: ReadonlySet<MusicDebugPitchClassLabel>
): string {
  return [...pitchCenters].join(', ');
}

const CHORD_DEGREE_OFFSETS = [0, 2, 4] as const;
