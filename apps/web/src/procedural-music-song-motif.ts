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
  const updatedNotes = [...options.notes];
  applyLeadMotifPhraseStatements(updatedNotes, options);
  applyLeadMotifVariationInAprimeSection(updatedNotes, options);

  return updatedNotes;
}

function applyLeadMotifPhraseStatements(
  notes: ProceduralMusicNote[],
  options: {
    sections: readonly ProceduralMusicSongSection[];
    songStartMs: number;
    leadMotif: readonly number[];
    theme: {
      rootHz: number;
      rootMidiNote: number;
      scale: readonly number[];
      noteDurationMs: number;
    };
  }
): void {
  const sectionA = options.sections.find((section) => section.id === 'a');
  if (!sectionA || options.leadMotif.length === 0) {
    return;
  }

  const phraseDurationMs = Math.max(1, Math.round(sectionA.durationMs / 2));
  const phraseStartMs = options.songStartMs + sectionA.startOffsetMs;
  const sectionEndMs = phraseStartMs + sectionA.durationMs;

  applyMotifToPhraseWindow(notes, {
    phraseStartMs,
    phraseDurationMs,
    sectionEndMs,
    leadMotif: options.leadMotif,
    theme: options.theme,
  });
  applyMotifToPhraseWindow(notes, {
    phraseStartMs: phraseStartMs + phraseDurationMs,
    phraseDurationMs,
    sectionEndMs,
    leadMotif: options.leadMotif,
    theme: options.theme,
  });
}

function applyLeadMotifVariationInAprimeSection(
  notes: ProceduralMusicNote[],
  options: {
    sections: readonly ProceduralMusicSongSection[];
    songStartMs: number;
    leadMotif: readonly number[];
    theme: {
      rootHz: number;
      rootMidiNote: number;
      scale: readonly number[];
      noteDurationMs: number;
    };
  }
): void {
  const sectionAPrime = options.sections.find(
    (section) => section.id === 'a-prime'
  );
  if (!sectionAPrime || options.leadMotif.length === 0) {
    return;
  }

  const phraseDurationMs = Math.max(
    1,
    Math.round(sectionAPrime.durationMs / 2)
  );
  const phraseStartMs = options.songStartMs + sectionAPrime.startOffsetMs;
  const sectionEndMs = phraseStartMs + sectionAPrime.durationMs;
  const transposedMotif = options.leadMotif.map((degree) => degree + 1);

  applyMotifToPhraseWindow(notes, {
    phraseStartMs,
    phraseDurationMs,
    sectionEndMs,
    leadMotif: transposedMotif,
    theme: options.theme,
  });
  applyMotifToPhraseWindow(notes, {
    phraseStartMs: phraseStartMs + phraseDurationMs,
    phraseDurationMs,
    sectionEndMs,
    leadMotif: transposedMotif,
    theme: options.theme,
  });
}

function applyMotifToPhraseWindow(
  notes: ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
    sectionEndMs: number;
    leadMotif: readonly number[];
    theme: {
      rootHz: number;
      rootMidiNote: number;
      scale: readonly number[];
      noteDurationMs: number;
    };
  }
): void {
  const phraseEndMs = options.phraseStartMs + options.phraseDurationMs;
  let motifIndex = 0;

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (
      note.role !== 'lead' ||
      note.startMs < options.phraseStartMs ||
      note.startMs >= phraseEndMs
    ) {
      continue;
    }
    const motifDegree = options.leadMotif[motifIndex];
    if (motifDegree === undefined) {
      break;
    }
    const referenceFrequency =
      resolvePreviousLeadFrequency(notes, index) ?? note.frequency;
    const targetSemitones = alignMotifSemitonesToLeadRegister({
      motifDegreeOffset: motifDegree,
      referenceFrequency,
      theme: options.theme,
    });
    notes[index] = {
      ...note,
      frequency: resolveProceduralMidiNoteFrequency(
        options.theme.rootMidiNote + targetSemitones
      ),
      durationMs: Math.min(
        Math.max(
          note.durationMs,
          Math.round(options.theme.noteDurationMs * 0.94)
        ),
        Math.max(1, Math.floor(options.sectionEndMs - note.startMs))
      ),
    };
    motifIndex += 1;
  }
}

function alignMotifSemitonesToLeadRegister(options: {
  motifDegreeOffset: number;
  referenceFrequency: number;
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
      options.referenceFrequency /
        Math.max(options.theme.rootHz, Number.EPSILON)
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

function resolvePreviousLeadFrequency(
  notes: readonly ProceduralMusicNote[],
  noteIndex: number
): number | null {
  for (let index = noteIndex - 1; index >= 0; index -= 1) {
    const candidate = notes[index];
    if (candidate?.role === 'lead') {
      return candidate.frequency;
    }
  }
  return null;
}
