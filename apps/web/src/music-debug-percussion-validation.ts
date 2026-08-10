import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import {
  resolvePercussionFamilyFromInstrumentId,
  resolvePercussionVoiceIdFromInstrumentId,
} from './procedural-music-percussion.ts';

export type MusicDebugPercussionValidation = {
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugPercussion(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
}): MusicDebugPercussionValidation {
  const messages: string[] = [];
  const activityBySection = new Map<
    string,
    {
      noteCount: number;
      soundingPercentage: number;
      families: Set<string>;
    }
  >();
  const percussionVoiceIds = new Set<string>();

  for (const section of options.sections) {
    const sectionStartMs = options.songStartMs + section.startOffsetMs;
    const sectionEndMs = sectionStartMs + section.durationMs;
    let noteCount = 0;
    let cumulativeDurationMs = 0;
    const families = new Set<string>();

    for (const note of options.notes) {
      if (note.role !== 'percussion') {
        continue;
      }
      const voiceId = resolvePercussionVoiceIdFromInstrumentId(
        note.instrumentId
      );
      if (voiceId) {
        percussionVoiceIds.add(voiceId);
      }
      if (note.startMs < sectionStartMs || note.startMs >= sectionEndMs) {
        continue;
      }
      const family = resolvePercussionFamilyFromInstrumentId(note.instrumentId);
      if (family) {
        families.add(family);
      }
      noteCount += 1;
      cumulativeDurationMs += Math.max(
        0,
        Math.min(note.startMs + note.durationMs, sectionEndMs) - note.startMs
      );
    }

    activityBySection.set(section.id, {
      noteCount,
      families,
      soundingPercentage:
        section.durationMs <= 0
          ? 0
          : (cumulativeDurationMs / section.durationMs) * 100,
    });

    if ((section.id === 'intro' || section.id === 'outro') && noteCount > 0) {
      messages.push(`${section.label} should not contain percussion notes.`);
    }
  }

  const sectionA = activityBySection.get('a');
  const variation = activityBySection.get('variation');
  if (
    sectionA &&
    variation &&
    variation.noteCount > 0 &&
    variation.soundingPercentage >= sectionA.soundingPercentage
  ) {
    messages.push('Variation percussion should stay thinner than Section A.');
  }
  if (
    options.notes.some((note) => note.role === 'percussion') &&
    percussionVoiceIds.size <= 1
  ) {
    messages.push('Percussion should use more than one drum voice.');
  }
  for (const sectionId of ['a', 'return'] as const) {
    const section = options.sections.find((entry) => entry.id === sectionId);
    const activity = activityBySection.get(sectionId);
    if (!section || !activity || activity.noteCount === 0) {
      continue;
    }
    if (activity.families.size < 3) {
      messages.push(
        `${section.label} should use at least three percussion roles.`
      );
    }
  }

  return {
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}
