import { getProceduralScaleDegreeSemitones } from './procedural-music-scale.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

export function stateLeadMotifInFirstASection(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
  leadMotif: readonly number[];
  theme: {
    rootHz: number;
    rootMidiNote: number;
    scale: readonly number[];
    noteDurationMs: number;
  };
}): ProceduralMusicNote[] {
  const sectionA = options.sections.find((section) => section.id === 'a');
  if (!sectionA || options.leadMotif.length === 0) {
    return [...options.notes];
  }

  const phraseDurationMs = Math.max(1, Math.round(sectionA.durationMs / 2));
  const phraseStartMs = options.songStartMs + sectionA.startOffsetMs;
  const phraseEndMs = phraseStartMs + phraseDurationMs;
  const updatedNotes = [...options.notes];
  let motifIndex = 0;

  for (let index = 0; index < updatedNotes.length; index += 1) {
    const note = updatedNotes[index]!;
    if (
      note.role !== 'lead' ||
      note.startMs < phraseStartMs ||
      note.startMs >= phraseEndMs
    ) {
      continue;
    }
    const motifDegree = options.leadMotif[motifIndex];
    if (motifDegree === undefined) {
      break;
    }
    const targetSemitones = alignMotifSemitonesToLeadRegister({
      motifDegreeOffset: motifDegree,
      note,
      theme: options.theme,
    });
    updatedNotes[index] = {
      ...note,
      frequency: resolveProceduralMidiNoteFrequency(
        options.theme.rootMidiNote + targetSemitones
      ),
      durationMs: Math.max(
        note.durationMs,
        Math.round(options.theme.noteDurationMs * 0.94)
      ),
      volume: note.volume * 1.08,
    };
    motifIndex += 1;
  }

  return updatedNotes;
}

function alignMotifSemitonesToLeadRegister(options: {
  motifDegreeOffset: number;
  note: ProceduralMusicNote;
  theme: {
    rootHz: number;
    scale: readonly number[];
  };
}): number {
  const targetBaseSemitones = getProceduralScaleDegreeSemitones(
    options.theme.scale,
    options.motifDegreeOffset
  );
  const currentSemitones = Math.round(
    Math.log2(
      options.note.frequency / Math.max(options.theme.rootHz, Number.EPSILON)
    ) * 12
  );
  const octaveCandidates = [-24, -12, 0, 12, 24].map(
    (octaveShift) => targetBaseSemitones + octaveShift
  );

  return octaveCandidates.reduce((best, candidate) =>
    Math.abs(candidate - currentSemitones) < Math.abs(best - currentSemitones)
      ? candidate
      : best
  );
}
