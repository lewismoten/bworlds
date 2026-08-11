import { getProceduralScaleDegreeSemitones } from './procedural-music-scale.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';
import { resolveProceduralChordTimeline } from './procedural-music-chord-timeline.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

type ProceduralMusicSongMotifTheme = {
  id?: string;
  rootHz: number;
  rootMidiNote: number;
  scale: readonly number[];
  noteDurationMs: number;
  stepPatternLength?: number;
  clusterX?: number;
  clusterY?: number;
};

export type ProceduralMusicSongExpectedMotifCoverage = {
  sectionId: ProceduralMusicSongSection['id'];
  sectionLabel: string;
  exactMatchCount: number;
  variedMatchCount: number;
  matchCount: number;
  expectedMatchKind: 'exact' | 'varied';
  minimumMatchCount: number;
  needsRegeneration: boolean;
};

type ProceduralMusicSongPhraseWindow = {
  phraseStartMs: number;
  phraseDurationMs: number;
  sectionEndMs: number;
  phraseStartMeasure: number;
};

const MOTIF_PROMINENCE_VOLUME_MULTIPLIER = 1.12;
const MOTIF_PROMINENCE_VELOCITY_BONUS = 8;
const FILLER_DEEMPHASIS_VOLUME_MULTIPLIER = 0.94;
const FILLER_DEEMPHASIS_VELOCITY_PENALTY = 4;

export function stateLeadMotifInFirstASection(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
  leadMotif: readonly number[];
  theme: ProceduralMusicSongMotifTheme;
}): ProceduralMusicNote[] {
  const updatedNotes = [...options.notes];
  applyLeadMotifPhraseStatements(updatedNotes, options);
  applyLeadMotifVariationInAprimeSection(updatedNotes, options);
  applyLeadMotifFragmentsInLaterSections(updatedNotes, options);
  applyLeadMotifReturnNearEnding(updatedNotes, options);
  updatedNotes.sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }
    return left.durationMs - right.durationMs;
  });
  return regenerateSectionsMissingExpectedLeadMotifMatches(
    updatedNotes,
    options
  );
}

export function regenerateSectionsMissingExpectedLeadMotifMatches(
  notes: readonly ProceduralMusicNote[],
  options: {
    sections: readonly ProceduralMusicSongSection[];
    songStartMs: number;
    leadMotif: readonly number[];
    theme: ProceduralMusicSongMotifTheme;
  }
): ProceduralMusicNote[] {
  const regeneratedNotes = [...notes];

  for (let pass = 0; pass < 2; pass += 1) {
    const expectedCoverage = collectExpectedLeadMotifCoverage({
      notes: regeneratedNotes,
      sections: options.sections,
      songStartMs: options.songStartMs,
      leadMotif: options.leadMotif,
      theme: options.theme,
    });
    const shouldRepairSectionA = expectedCoverage.some(
      (coverage) => coverage.sectionId === 'a' && coverage.needsRegeneration
    );
    const shouldRepairSectionAPrime = expectedCoverage.some(
      (coverage) =>
        coverage.sectionId === 'a-prime' && coverage.needsRegeneration
    );

    if (!shouldRepairSectionA && !shouldRepairSectionAPrime) {
      break;
    }
    if (shouldRepairSectionA) {
      applyLeadMotifPhraseStatements(regeneratedNotes, options);
    }
    if (shouldRepairSectionAPrime) {
      applyLeadMotifVariationInAprimeSection(regeneratedNotes, options);
    }
  }

  return regeneratedNotes;
}

export function collectExpectedLeadMotifCoverage(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
  leadMotif: readonly number[];
  theme: {
    rootHz: number;
    scale: readonly number[];
  };
}): ProceduralMusicSongExpectedMotifCoverage[] {
  const expectedSections = [
    {
      sectionId: 'a' as const,
      expectedMatchKind: 'exact' as const,
      minimumMatchCount: 2,
    },
    {
      sectionId: 'a-prime' as const,
      expectedMatchKind: 'varied' as const,
      minimumMatchCount: 1,
    },
  ];

  return expectedSections.flatMap((expectedSection) => {
    const section = options.sections.find(
      (candidate) => candidate.id === expectedSection.sectionId
    );
    if (!section) {
      return [];
    }

    const leadDegrees = collectSectionLeadScaleDegrees({
      notes: options.notes,
      section,
      songStartMs: options.songStartMs,
      theme: options.theme,
    });
    const normalizedLeadMotif = options.leadMotif.map((degree) =>
      mod(degree, options.theme.scale.length)
    );
    const exactMatchCount = countExactMotifMatches(
      leadDegrees,
      normalizedLeadMotif
    );
    const variedMatchCount = countVariedIntervalPatternMatches(
      leadDegrees,
      normalizedLeadMotif
    );
    const actualMatchCount =
      expectedSection.expectedMatchKind === 'exact'
        ? exactMatchCount
        : variedMatchCount;

    return [
      {
        sectionId: section.id,
        sectionLabel: section.label,
        exactMatchCount,
        variedMatchCount,
        matchCount: exactMatchCount + variedMatchCount,
        expectedMatchKind: expectedSection.expectedMatchKind,
        minimumMatchCount: expectedSection.minimumMatchCount,
        needsRegeneration: actualMatchCount < expectedSection.minimumMatchCount,
      },
    ];
  });
}

function applyLeadMotifPhraseStatements(
  notes: ProceduralMusicNote[],
  options: {
    sections: readonly ProceduralMusicSongSection[];
    songStartMs: number;
    leadMotif: readonly number[];
    theme: ProceduralMusicSongMotifTheme;
  }
): void {
  const sectionA = options.sections.find((section) => section.id === 'a');
  if (!sectionA || options.leadMotif.length === 0) {
    return;
  }
  applyMotifToPhraseWindow(notes, {
    ...resolveSongSectionPhraseWindow(sectionA, options.songStartMs, 0),
    leadMotif: options.leadMotif,
    theme: options.theme,
  });
  applyMotifToPhraseWindow(notes, {
    ...resolveSongSectionPhraseWindow(sectionA, options.songStartMs, 1),
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
    theme: ProceduralMusicSongMotifTheme;
  }
): void {
  const sectionAPrime = options.sections.find(
    (section) => section.id === 'a-prime'
  );
  if (!sectionAPrime || options.leadMotif.length === 0) {
    return;
  }
  const firstPhraseWindow = resolveSongSectionPhraseWindow(
    sectionAPrime,
    options.songStartMs,
    0
  );
  const transposedMotif = resolveChordAwareMotifDegrees({
    leadMotif: options.leadMotif,
    ...firstPhraseWindow,
    theme: options.theme,
  });

  applyMotifToPhraseWindow(notes, {
    ...firstPhraseWindow,
    leadMotif: transposedMotif,
    theme: options.theme,
  });
  applyMotifToPhraseWindow(notes, {
    ...resolveSongSectionPhraseWindow(sectionAPrime, options.songStartMs, 1),
    leadMotif: transposedMotif,
    theme: options.theme,
  });
}

function applyLeadMotifFragmentsInLaterSections(
  notes: ProceduralMusicNote[],
  options: {
    sections: readonly ProceduralMusicSongSection[];
    songStartMs: number;
    leadMotif: readonly number[];
    theme: ProceduralMusicSongMotifTheme;
  }
): void {
  const fragmentPlans = [
    {
      sectionId: 'b' as const,
      fragment: options.leadMotif.slice(
        0,
        Math.min(3, options.leadMotif.length)
      ),
    },
    {
      sectionId: 'variation' as const,
      fragment: options.leadMotif.slice(
        Math.max(0, options.leadMotif.length - 3)
      ),
    },
  ];

  for (const plan of fragmentPlans) {
    const section = options.sections.find(
      (candidate) => candidate.id === plan.sectionId
    );
    if (!section || plan.fragment.length < 2) {
      continue;
    }
    const phraseWindow = resolveSongSectionPhraseWindow(
      section,
      options.songStartMs,
      0
    );
    const fragmentMotif = resolveChordAwareMotifDegrees({
      leadMotif: plan.fragment,
      ...phraseWindow,
      theme: options.theme,
      fallbackTranspositionDegree: 0,
    });

    applyMotifToPhraseWindow(notes, {
      ...phraseWindow,
      leadMotif: fragmentMotif,
      theme: options.theme,
    });
  }
}

function applyLeadMotifReturnNearEnding(
  notes: ProceduralMusicNote[],
  options: {
    sections: readonly ProceduralMusicSongSection[];
    songStartMs: number;
    leadMotif: readonly number[];
    theme: ProceduralMusicSongMotifTheme;
  }
): void {
  const returnSection =
    options.sections.find((section) => section.id === 'return') ??
    options.sections.find((section) => section.id === 'outro');
  if (!returnSection || options.leadMotif.length === 0) {
    return;
  }

  applyMotifToPhraseWindow(notes, {
    ...resolveSongSectionPhraseWindow(returnSection, options.songStartMs, 0),
    leadMotif: options.leadMotif,
    theme: options.theme,
  });
}

function applyMotifToPhraseWindow(
  notes: ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
    sectionEndMs: number;
    phraseStartMeasure: number;
    leadMotif: readonly number[];
    theme: ProceduralMusicSongMotifTheme;
  }
): void {
  const phraseEndMs = options.phraseStartMs + options.phraseDurationMs;
  const rhythmTemplate = resolveLeadMotifRhythmTemplate({
    phraseStartMs: options.phraseStartMs,
    phraseDurationMs: options.phraseDurationMs,
    sectionEndMs: options.sectionEndMs,
    motifLength: options.leadMotif.length,
    noteDurationMs: options.theme.noteDurationMs,
  });
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
    const rhythmStep = rhythmTemplate[motifIndex];
    if (!rhythmStep) {
      break;
    }
    const targetSemitones = alignMotifSemitonesToLeadRegister({
      motifDegreeOffset: motifDegree,
      referenceFrequency,
      theme: options.theme,
    });
    notes[index] = {
      ...note,
      startMs: rhythmStep.startMs,
      frequency: resolveProceduralMidiNoteFrequency(
        options.theme.rootMidiNote + targetSemitones
      ),
      durationMs: rhythmStep.durationMs,
      volume: clampNormalizedScalar(
        note.volume * MOTIF_PROMINENCE_VOLUME_MULTIPLIER
      ),
      velocity:
        note.velocity === undefined
          ? undefined
          : clampMidiVelocity(note.velocity + MOTIF_PROMINENCE_VELOCITY_BONUS),
    };
    motifIndex += 1;
  }

  preserveLeadMotifStatementLane(notes, {
    phraseStartMs: options.phraseStartMs,
    phraseEndMs,
    protectedThroughMs:
      (rhythmTemplate.at(Math.max(0, motifIndex - 1))?.startMs ??
        options.phraseStartMs) +
      (rhythmTemplate.at(Math.max(0, motifIndex - 1))?.durationMs ?? 0),
    motifLength: motifIndex,
    noteDurationMs: options.theme.noteDurationMs,
  });
}

function resolveLeadMotifRhythmTemplate(options: {
  phraseStartMs: number;
  phraseDurationMs: number;
  sectionEndMs: number;
  motifLength: number;
  noteDurationMs: number;
}): Array<{
  startMs: number;
  durationMs: number;
}> {
  if (options.motifLength <= 0) {
    return [];
  }

  const measureDurationMs = Math.max(1, options.phraseDurationMs / 8);
  const attackMeasureOffsets = [0, 0.5, 1, 1.75];
  const durationMeasureRatios = [0.34, 0.28, 0.38, 0.52];
  const steps: Array<{
    startMs: number;
    durationMs: number;
  }> = [];

  for (let motifIndex = 0; motifIndex < options.motifLength; motifIndex += 1) {
    const attackOffsetMs =
      measureDurationMs *
      (attackMeasureOffsets[motifIndex] ??
        attackMeasureOffsets[attackMeasureOffsets.length - 1] ??
        motifIndex * 0.5);
    const startMs = Math.round(options.phraseStartMs + attackOffsetMs);
    const maxDurationMs = Math.max(
      1,
      Math.floor(options.sectionEndMs - startMs)
    );
    const durationMs = Math.min(
      maxDurationMs,
      Math.max(
        Math.round(options.noteDurationMs * 0.94),
        Math.round(
          measureDurationMs *
            (durationMeasureRatios[motifIndex] ??
              durationMeasureRatios[durationMeasureRatios.length - 1] ??
              0.34)
        )
      )
    );
    steps.push({
      startMs,
      durationMs,
    });
  }

  return steps;
}

function resolveSongSectionPhraseWindow(
  section: ProceduralMusicSongSection,
  songStartMs: number,
  phraseIndex: 0 | 1
): ProceduralMusicSongPhraseWindow {
  const phraseDurationMs = Math.max(1, Math.round(section.durationMs / 2));
  const phraseStartMs =
    songStartMs + section.startOffsetMs + phraseDurationMs * phraseIndex;

  return {
    phraseStartMs,
    phraseDurationMs,
    sectionEndMs: songStartMs + section.startOffsetMs + section.durationMs,
    phraseStartMeasure:
      section.startMeasure +
      Math.floor((section.measureCount / 2) * phraseIndex),
  };
}

function resolveChordAwareMotifDegrees(options: {
  leadMotif: readonly number[];
  phraseStartMeasure: number;
  phraseStartMs: number;
  phraseDurationMs: number;
  sectionEndMs: number;
  theme: ProceduralMusicSongMotifTheme;
  fallbackTranspositionDegree?: number;
}): number[] {
  const scaleLength = Math.max(1, options.theme.scale.length);
  if (
    options.leadMotif.length === 0 ||
    !options.theme.id ||
    !options.theme.stepPatternLength
  ) {
    return options.leadMotif.map((degree) =>
      mod(degree + (options.fallbackTranspositionDegree ?? 1), scaleLength)
    );
  }

  const rhythmTemplate = resolveLeadMotifRhythmTemplate({
    phraseStartMs: options.phraseStartMs,
    phraseDurationMs: options.phraseDurationMs,
    sectionEndMs: options.sectionEndMs,
    motifLength: options.leadMotif.length,
    noteDurationMs: options.theme.noteDurationMs,
  });
  const measureDurationMs = Math.max(1, options.phraseDurationMs / 8);
  const chordTimeline = resolveProceduralChordTimeline({
    themeId: options.theme.id,
    themeStepCount: options.theme.stepPatternLength,
    clusterX: options.theme.clusterX ?? 0,
    clusterY: options.theme.clusterY ?? 0,
  });
  const degreeCounts = new Map<number, number>();
  const orderedDegrees: number[] = [];

  for (const step of rhythmTemplate) {
    const measureOffset = Math.floor(
      Math.max(0, step.startMs - options.phraseStartMs) / measureDurationMs
    );
    const degreeIndex = resolveChordDegreeAtMeasure(
      chordTimeline,
      options.phraseStartMeasure + measureOffset
    );
    degreeCounts.set(degreeIndex, (degreeCounts.get(degreeIndex) ?? 0) + 1);
    if (!orderedDegrees.includes(degreeIndex)) {
      orderedDegrees.push(degreeIndex);
    }
  }

  const transpositionDegree =
    orderedDegrees
      .filter((degreeIndex) => degreeIndex !== 0)
      .sort((left, right) => {
        const leftCount = degreeCounts.get(left) ?? 0;
        const rightCount = degreeCounts.get(right) ?? 0;
        return (
          rightCount - leftCount ||
          orderedDegrees.indexOf(left) - orderedDegrees.indexOf(right)
        );
      })[0] ??
    options.fallbackTranspositionDegree ??
    1;

  return options.leadMotif.map((degree) =>
    mod(degree + transpositionDegree, scaleLength)
  );
}

function resolveChordDegreeAtMeasure(
  chordTimeline: readonly {
    degreeIndex: number;
    startMeasure: number;
    endMeasure: number;
  }[],
  measure: number
): number {
  if (chordTimeline.length === 0) {
    return 0;
  }

  const phraseMeasureCount = Math.max(
    1,
    ...chordTimeline.map((entry) => entry.endMeasure)
  );
  const normalizedMeasure = ((measure - 1) % phraseMeasureCount) + 1;
  return (
    chordTimeline.find(
      (entry) =>
        normalizedMeasure >= entry.startMeasure &&
        normalizedMeasure <= entry.endMeasure
    )?.degreeIndex ??
    chordTimeline[0]?.degreeIndex ??
    0
  );
}

function preserveLeadMotifStatementLane(
  notes: ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseEndMs: number;
    protectedThroughMs: number;
    motifLength: number;
    noteDurationMs: number;
  }
): void {
  if (options.motifLength <= 0) {
    return;
  }

  const statementGapMs = Math.max(1, Math.round(options.noteDurationMs * 0.18));
  let displacedStartMs = Math.min(
    options.phraseEndMs - 1,
    options.protectedThroughMs + statementGapMs
  );
  let protectedLeadCount = 0;

  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (
      note.role !== 'lead' ||
      note.startMs < options.phraseStartMs ||
      note.startMs >= options.phraseEndMs
    ) {
      continue;
    }
    if (protectedLeadCount < options.motifLength) {
      protectedLeadCount += 1;
      continue;
    }
    if (note.startMs >= displacedStartMs) {
      continue;
    }
    const nextStartMs = Math.min(
      options.phraseEndMs - 1,
      Math.max(displacedStartMs, note.startMs)
    );
    notes[index] = {
      ...note,
      startMs: nextStartMs,
      durationMs: Math.min(
        note.durationMs,
        Math.max(1, Math.floor(options.phraseEndMs - nextStartMs))
      ),
      volume: clampNormalizedScalar(
        note.volume * FILLER_DEEMPHASIS_VOLUME_MULTIPLIER
      ),
      velocity:
        note.velocity === undefined
          ? undefined
          : clampMidiVelocity(
              note.velocity - FILLER_DEEMPHASIS_VELOCITY_PENALTY
            ),
    };
    displacedStartMs = Math.min(
      options.phraseEndMs - 1,
      nextStartMs + statementGapMs
    );
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
  const octaveCandidates = [-12, 0, 12].map(
    (octaveShift) => targetBaseSemitones + octaveShift
  );

  const bestCandidate = octaveCandidates.reduce((best, candidate) =>
    Math.abs(candidate - currentSemitones) < Math.abs(best - currentSemitones)
      ? candidate
      : best
  );

  return Math.abs(bestCandidate - currentSemitones) > 7
    ? targetBaseSemitones
    : bestCandidate;
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

function collectSectionLeadScaleDegrees(options: {
  notes: readonly ProceduralMusicNote[];
  section: ProceduralMusicSongSection;
  songStartMs: number;
  theme: {
    rootHz: number;
    scale: readonly number[];
  };
}): number[] {
  const sectionStartMs = options.songStartMs + options.section.startOffsetMs;
  const sectionEndMs = sectionStartMs + options.section.durationMs;
  const leadDegrees: number[] = [];

  for (const note of options.notes) {
    if (
      note.role !== 'lead' ||
      note.startMs < sectionStartMs ||
      note.startMs >= sectionEndMs
    ) {
      continue;
    }
    const scaleDegree = resolveScaleDegreeFromFrequency(
      note.frequency,
      options.theme
    );
    if (scaleDegree !== null) {
      leadDegrees.push(mod(scaleDegree, options.theme.scale.length));
    }
  }

  return leadDegrees;
}

function resolveScaleDegreeFromFrequency(
  frequency: number,
  theme: {
    rootHz: number;
    scale: readonly number[];
  }
): number | null {
  const relativeSemitones = Math.round(
    Math.log2(frequency / Math.max(theme.rootHz, Number.EPSILON)) * 12
  );
  const pitchClass = normalizePitchClass(relativeSemitones);
  const octave = Math.floor(relativeSemitones / 12);

  for (let index = 0; index < theme.scale.length; index += 1) {
    const offset = theme.scale[index];
    if (offset === undefined || offset >= 12) {
      continue;
    }
    if (normalizePitchClass(offset) === pitchClass) {
      return octave * theme.scale.length + index;
    }
  }

  return null;
}

function countExactMotifMatches(
  sequence: readonly number[],
  targetMotif: readonly number[]
): number {
  if (targetMotif.length === 0 || sequence.length < targetMotif.length) {
    return 0;
  }

  let matches = 0;
  for (
    let startIndex = 0;
    startIndex <= sequence.length - targetMotif.length;
    startIndex += 1
  ) {
    let exactMatch = true;
    for (let offset = 0; offset < targetMotif.length; offset += 1) {
      if (sequence[startIndex + offset] !== targetMotif[offset]) {
        exactMatch = false;
        break;
      }
    }
    if (exactMatch) {
      matches += 1;
    }
  }

  return matches;
}

function countVariedIntervalPatternMatches(
  sequence: readonly number[],
  targetMotif: readonly number[]
): number {
  if (targetMotif.length === 0 || sequence.length < targetMotif.length) {
    return 0;
  }

  const targetPattern = createIntervalPattern(targetMotif);
  if (targetPattern.length === 0) {
    return 0;
  }

  let matches = 0;
  for (
    let startIndex = 0;
    startIndex <= sequence.length - targetMotif.length;
    startIndex += 1
  ) {
    const phrase = sequence.slice(startIndex, startIndex + targetMotif.length);
    if (phrasesMatchExactly(phrase, targetMotif)) {
      continue;
    }
    if (phrasesMatchExactly(createIntervalPattern(phrase), targetPattern)) {
      matches += 1;
    }
  }

  return matches;
}

function createIntervalPattern(sequence: readonly number[]): number[] {
  if (sequence.length < 2) {
    return [];
  }
  const pattern: number[] = [];

  for (let index = 1; index < sequence.length; index += 1) {
    pattern.push(sequence[index]! - sequence[index - 1]!);
  }

  return pattern;
}

function phrasesMatchExactly(
  left: readonly number[],
  right: readonly number[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function normalizePitchClass(semitone: number): number {
  return ((Math.round(semitone) % 12) + 12) % 12;
}

function mod(value: number, divisor: number): number {
  if (divisor <= 0) {
    return value;
  }
  return ((value % divisor) + divisor) % divisor;
}

function clampNormalizedScalar(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampMidiVelocity(value: number): number {
  return Math.max(1, Math.min(127, Math.round(value)));
}
