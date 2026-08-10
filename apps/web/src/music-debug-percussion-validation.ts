import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import { resolvePercussionVoiceIdFromInstrumentId } from './procedural-music-percussion.ts';

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
    { noteCount: number; soundingPercentage: number }
  >();
  const percussionVoiceIds = new Set<string>();

  for (const section of options.sections) {
    const sectionStartMs = options.songStartMs + section.startOffsetMs;
    const sectionEndMs = sectionStartMs + section.durationMs;
    let noteCount = 0;
    let cumulativeDurationMs = 0;

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
      noteCount += 1;
      cumulativeDurationMs += Math.max(
        0,
        Math.min(note.startMs + note.durationMs, sectionEndMs) - note.startMs
      );
    }

    activityBySection.set(section.id, {
      noteCount,
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

  return {
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}
