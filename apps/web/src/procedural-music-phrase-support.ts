import type { ProceduralMusicNote } from './procedural-music.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';

type SupportRole = Extract<ProceduralMusicNote['role'], 'bass' | 'harmony'>;

const MIN_SUPPORT_DURATION_RATIO: Record<SupportRole, number> = {
  bass: 0.18,
  harmony: 0.3,
};

export function shapeProceduralPhraseSupportNotes(
  notes: readonly ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
  }
): ProceduralMusicNote[] {
  const shapedNotes = notes.map((note) => ({ ...note }));
  const measureDurationMs =
    options.phraseDurationMs / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const phraseEndMs = options.phraseStartMs + options.phraseDurationMs;

  extendSupportDurationsWithinMeasures(shapedNotes, {
    phraseStartMs: options.phraseStartMs,
    phraseEndMs,
    measureDurationMs,
  });
  anchorLeadRestWindows(shapedNotes, {
    phraseStartMs: options.phraseStartMs,
    phraseEndMs,
    measureDurationMs,
    minimumGapMs: Math.max(160, measureDurationMs * 0.18),
  });

  shapedNotes.sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }
    return left.durationMs - right.durationMs;
  });

  return shapedNotes;
}

function extendSupportDurationsWithinMeasures(
  notes: ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseEndMs: number;
    measureDurationMs: number;
  }
): void {
  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (note.role !== 'bass' && note.role !== 'harmony') {
      continue;
    }

    const role = note.role;
    const measureIndex = Math.max(
      0,
      Math.floor(
        (note.startMs - options.phraseStartMs) / options.measureDurationMs
      )
    );
    const measureEndMs = Math.min(
      options.phraseEndMs,
      options.phraseStartMs + (measureIndex + 1) * options.measureDurationMs
    );
    const nextSameRoleStartMs =
      findNextRoleStartMs(notes, role, note.startMs, index) ?? measureEndMs;
    const maxEndMs = Math.min(measureEndMs, nextSameRoleStartMs);
    const minimumDurationMs = Math.round(
      options.measureDurationMs * MIN_SUPPORT_DURATION_RATIO[role]
    );
    const desiredEndMs = Math.min(note.startMs + minimumDurationMs, maxEndMs);

    if (desiredEndMs > note.startMs + note.durationMs) {
      note.durationMs = desiredEndMs - note.startMs;
    }
  }
}

function anchorLeadRestWindows(
  notes: ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseEndMs: number;
    measureDurationMs: number;
    minimumGapMs: number;
  }
): void {
  const leadNotes = notes
    .filter((note) => note.role === 'lead')
    .sort((left, right) => left.startMs - right.startMs);
  const leadGaps = collectLeadRestGaps(leadNotes, {
    phraseStartMs: options.phraseStartMs,
    phraseEndMs: options.phraseEndMs,
    minimumGapMs: options.minimumGapMs,
  });

  for (const gap of leadGaps) {
    if (hasSupportAnchorDuringGap(notes, gap.startMs, gap.endMs)) {
      continue;
    }
    insertSupportAnchorNote(
      notes,
      gap.startMs,
      gap.endMs,
      options.phraseStartMs,
      options.phraseEndMs,
      options.measureDurationMs
    );
  }
}

function collectLeadRestGaps(
  leadNotes: readonly ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseEndMs: number;
    minimumGapMs: number;
  }
): Array<{ startMs: number; endMs: number }> {
  const gaps: Array<{ startMs: number; endMs: number }> = [];
  let cursorMs = options.phraseStartMs;

  for (const note of leadNotes) {
    if (note.startMs - cursorMs >= options.minimumGapMs) {
      gaps.push({ startMs: cursorMs, endMs: note.startMs });
    }
    cursorMs = Math.max(cursorMs, note.startMs + note.durationMs);
  }

  if (options.phraseEndMs - cursorMs >= options.minimumGapMs) {
    gaps.push({ startMs: cursorMs, endMs: options.phraseEndMs });
  }

  return gaps;
}

function hasSupportAnchorDuringGap(
  notes: readonly ProceduralMusicNote[],
  gapStartMs: number,
  gapEndMs: number
): boolean {
  const midpointMs = gapStartMs + (gapEndMs - gapStartMs) / 2;

  return notes.some(
    (note) =>
      (note.role === 'bass' || note.role === 'harmony') &&
      note.startMs <= midpointMs &&
      note.startMs + note.durationMs > midpointMs
  );
}

function insertSupportAnchorNote(
  notes: ProceduralMusicNote[],
  gapStartMs: number,
  gapEndMs: number,
  phraseStartMs: number,
  phraseEndMs: number,
  measureDurationMs: number
): void {
  let bestIndex = -1;
  let bestPriority = Number.POSITIVE_INFINITY;
  let bestStartMs = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (note.role !== 'harmony') {
      continue;
    }
    if (note.startMs > gapStartMs) {
      continue;
    }
    const noteEndMs = note.startMs + note.durationMs;
    const nextSameRoleStartMs = findNextRoleStartMs(
      notes,
      note.role,
      note.startMs,
      index
    );
    const measureIndex = Math.max(
      0,
      Math.floor((note.startMs - phraseStartMs) / measureDurationMs)
    );
    const measureEndMs = Math.min(
      phraseEndMs,
      phraseStartMs + (measureIndex + 1) * measureDurationMs
    );
    const maxExtendEndMs = Math.min(
      nextSameRoleStartMs ?? phraseEndMs,
      phraseEndMs,
      measureEndMs
    );
    if (maxExtendEndMs <= noteEndMs || maxExtendEndMs <= gapStartMs) {
      continue;
    }

    const measureStartMs = phraseStartMs + measureIndex * measureDurationMs;
    const priority =
      resolveRoleCoverageMs(notes, note.role, measureStartMs, measureEndMs) /
      Math.max(1, measureDurationMs);
    if (
      priority < bestPriority ||
      (priority === bestPriority && note.startMs > bestStartMs)
    ) {
      bestIndex = index;
      bestPriority = priority;
      bestStartMs = note.startMs;
    }
  }

  if (bestIndex < 0) {
    return;
  }

  const candidate = notes[bestIndex]!;
  const anchorDurationMs = Math.round(
    Math.max(72, Math.min(120, (gapEndMs - gapStartMs) * 0.18))
  );
  const anchorMidpointMs = gapStartMs + (gapEndMs - gapStartMs) * 0.5;
  const anchorStartMs = Math.round(
    Math.max(
      gapStartMs,
      Math.min(
        anchorMidpointMs - anchorDurationMs / 2,
        gapEndMs - anchorDurationMs
      )
    )
  );
  const anchorEndMs = Math.min(
    gapEndMs,
    phraseEndMs,
    anchorStartMs + anchorDurationMs
  );

  if (anchorEndMs <= anchorStartMs) {
    return;
  }

  notes.push({
    ...candidate,
    instrumentId: `${candidate.instrumentId}:anchor-${anchorStartMs}`,
    startMs: anchorStartMs,
    durationMs: anchorEndMs - anchorStartMs,
    volume: candidate.volume * 0.88,
  });
}

function resolveRoleCoverageMs(
  notes: readonly ProceduralMusicNote[],
  role: SupportRole,
  windowStartMs: number,
  windowEndMs: number
): number {
  let totalCoverageMs = 0;

  for (const note of notes) {
    if (note.role !== role) {
      continue;
    }
    const overlapMs =
      Math.min(windowEndMs, note.startMs + note.durationMs) -
      Math.max(windowStartMs, note.startMs);
    if (overlapMs > 0) {
      totalCoverageMs += overlapMs;
    }
  }

  return totalCoverageMs;
}

function findNextRoleStartMs(
  notes: readonly ProceduralMusicNote[],
  role: SupportRole,
  currentStartMs: number,
  currentIndex: number
): number | null {
  for (let index = currentIndex + 1; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (note.role === role && note.startMs > currentStartMs) {
      return note.startMs;
    }
  }

  return null;
}
