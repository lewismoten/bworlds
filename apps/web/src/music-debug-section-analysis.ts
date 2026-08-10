import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugSectionMotifMatch = {
  sectionId: string;
  sectionLabel: string;
  matchCount: number;
};

export type MusicDebugHarmonyChordDetection = {
  sectionId: string;
  sectionLabel: string;
  chordLabels: string[];
};

export type MusicDebugSectionLayerActivity = {
  sectionId: string;
  sectionLabel: string;
  roleCounts: Record<ProceduralMusicRole, number>;
  soundingTimePercentageByRole: Record<ProceduralMusicRole, number>;
  averageDurationMsByRole: Record<ProceduralMusicRole, number>;
};

export type MusicDebugSectionLayerComparison = {
  sectionId: string;
  sectionLabel: string;
  matchesPlan: boolean;
  matchedRules: string[];
  mismatchRules: string[];
};

const MUSIC_DEBUG_PITCH_CLASS_LABELS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export function createMusicDebugSectionMotifMatches(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  leadMotif: readonly number[];
}): MusicDebugSectionMotifMatch[] {
  const targetPattern = createIntervalPattern(options.leadMotif);
  return options.sections.map((section) => {
    const leadDegrees = collectSectionScaleDegrees({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      section,
      role: 'lead',
    });
    return {
      sectionId: section.id,
      sectionLabel: section.label,
      matchCount:
        targetPattern.length === 0
          ? 0
          : countIntervalPatternMatches(leadDegrees, targetPattern),
    };
  });
}

export function createMusicDebugHarmonyChordDetections(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
}): MusicDebugHarmonyChordDetection[] {
  return options.sections.map((section) => ({
    sectionId: section.id,
    sectionLabel: section.label,
    chordLabels: collectHarmonyChordLabels({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      section,
    }),
  }));
}

export function createMusicDebugSectionLayerActivity(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
}): MusicDebugSectionLayerActivity[] {
  const songStartMs = options.notes[0]?.startMs ?? 0;
  return options.sections.map((section) => {
    const sectionStart = songStartMs + section.startOffsetMs;
    const sectionEnd = sectionStart + section.durationMs;
    const roleCounts = createEmptyRoleMetrics();
    const cumulativeDurationMs = createEmptyRoleMetrics();

    for (const note of options.notes) {
      if (note.startMs < sectionStart || note.startMs >= sectionEnd) {
        continue;
      }
      roleCounts[note.role] += 1;
      const clippedDurationMs = Math.max(
        0,
        Math.min(note.startMs + note.durationMs, sectionEnd) - note.startMs
      );
      cumulativeDurationMs[note.role] += clippedDurationMs;
    }

    const soundingTimePercentageByRole = createEmptyRoleMetrics();
    const averageDurationMsByRole = createEmptyRoleMetrics();
    for (const role of PROCEDURAL_MUSIC_ROLES) {
      soundingTimePercentageByRole[role] =
        section.durationMs <= 0
          ? 0
          : (resolveSectionRoleCoverageMs(
              options.notes,
              sectionStart,
              sectionEnd,
              role
            ) /
              section.durationMs) *
            100;
      averageDurationMsByRole[role] =
        roleCounts[role] > 0
          ? cumulativeDurationMs[role] / roleCounts[role]
          : 0;
    }

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      roleCounts,
      soundingTimePercentageByRole,
      averageDurationMsByRole,
    };
  });
}

export function createMusicDebugSectionLayerComparisons(options: {
  activities: readonly MusicDebugSectionLayerActivity[];
}): MusicDebugSectionLayerComparison[] {
  const activityById = new Map(
    options.activities.map((activity) => [activity.sectionId, activity])
  );
  const fullStackBaseline =
    activityById.get('a') ?? options.activities[0] ?? null;

  return options.activities.map((activity) => {
    const matchedRules: string[] = [];
    const mismatchRules: string[] = [];
    const baseline = fullStackBaseline;
    const hasRole = (role: ProceduralMusicRole) =>
      activity.roleCounts[role] > 0;

    switch (activity.sectionId) {
      case 'intro':
        pushRuleResult(
          activity.roleCounts.percussion === 0,
          'percussion stays absent',
          matchedRules,
          mismatchRules
        );
        pushRuleResult(
          baseline === null ||
            activity.roleCounts.bass < baseline.roleCounts.bass ||
            activity.soundingTimePercentageByRole.bass <
              baseline.soundingTimePercentageByRole.bass,
          'bass stays thinner than the full stack',
          matchedRules,
          mismatchRules
        );
        break;
      case 'a':
        pushRuleResult(
          PROCEDURAL_MUSIC_ROLES.every((role) => hasRole(role)),
          'all four roles stay active',
          matchedRules,
          mismatchRules
        );
        break;
      case 'a-prime':
        pushRuleResult(
          PROCEDURAL_MUSIC_ROLES.every((role) => hasRole(role)),
          'all four roles stay active',
          matchedRules,
          mismatchRules
        );
        pushRuleResult(
          baseline === null ||
            activity.soundingTimePercentageByRole.lead >=
              baseline.soundingTimePercentageByRole.lead,
          'lead stays at least as forward as Section A',
          matchedRules,
          mismatchRules
        );
        break;
      case 'b':
        pushRuleResult(
          hasRole('harmony'),
          'harmony remains present',
          matchedRules,
          mismatchRules
        );
        pushRuleResult(
          baseline === null ||
            activity.soundingTimePercentageByRole.harmony <
              baseline.soundingTimePercentageByRole.harmony,
          'harmony occupancy lightens from Section A',
          matchedRules,
          mismatchRules
        );
        break;
      case 'variation':
        pushRuleResult(
          hasRole('lead'),
          'lead remains present',
          matchedRules,
          mismatchRules
        );
        pushRuleResult(
          baseline === null ||
            activity.soundingTimePercentageByRole.percussion <
              baseline.soundingTimePercentageByRole.percussion,
          'percussion occupancy thins from Section A',
          matchedRules,
          mismatchRules
        );
        pushRuleResult(
          baseline === null ||
            activity.averageDurationMsByRole.lead >
              baseline.averageDurationMsByRole.lead,
          'lead durations stretch beyond Section A',
          matchedRules,
          mismatchRules
        );
        break;
      case 'return':
        pushRuleResult(
          PROCEDURAL_MUSIC_ROLES.every((role) => hasRole(role)),
          'all four roles return',
          matchedRules,
          mismatchRules
        );
        break;
      case 'outro':
        pushRuleResult(
          activity.roleCounts.percussion === 0,
          'percussion drops out',
          matchedRules,
          mismatchRules
        );
        pushRuleResult(
          baseline === null ||
            activity.soundingTimePercentageByRole.lead <
              baseline.soundingTimePercentageByRole.lead,
          'lead recedes from Section A',
          matchedRules,
          mismatchRules
        );
        break;
      default:
        break;
    }

    return {
      sectionId: activity.sectionId,
      sectionLabel: activity.sectionLabel,
      matchesPlan: mismatchRules.length === 0,
      matchedRules,
      mismatchRules,
    };
  });
}

function resolveSectionRoleCoverageMs(
  notes: readonly ProceduralMusicNote[],
  sectionStartMs: number,
  sectionEndMs: number,
  role: ProceduralMusicRole
): number {
  const boundaries: Array<{ atMs: number; delta: number }> = [];

  for (const note of notes) {
    if (note.role !== role) {
      continue;
    }
    const startMs = Math.max(note.startMs, sectionStartMs);
    const endMs = Math.min(note.startMs + note.durationMs, sectionEndMs);
    if (startMs >= endMs) {
      continue;
    }
    boundaries.push({ atMs: startMs, delta: 1 }, { atMs: endMs, delta: -1 });
  }

  boundaries.sort((left, right) => {
    if (left.atMs === right.atMs) {
      return right.delta - left.delta;
    }
    return left.atMs - right.atMs;
  });

  let activeCount = 0;
  let previousAtMs: number | null = null;
  let totalCoverageMs = 0;

  for (const boundary of boundaries) {
    if (
      previousAtMs !== null &&
      activeCount > 0 &&
      boundary.atMs > previousAtMs
    ) {
      totalCoverageMs += boundary.atMs - previousAtMs;
    }
    activeCount += boundary.delta;
    previousAtMs = boundary.atMs;
  }

  return totalCoverageMs;
}

function pushRuleResult(
  condition: boolean,
  rule: string,
  matchedRules: string[],
  mismatchRules: string[]
): void {
  if (condition) {
    matchedRules.push(rule);
  } else {
    mismatchRules.push(rule);
  }
}

const PROCEDURAL_MUSIC_ROLES = [
  'bass',
  'harmony',
  'lead',
  'percussion',
] as const satisfies readonly ProceduralMusicRole[];

function createEmptyRoleMetrics(): Record<ProceduralMusicRole, number> {
  return {
    bass: 0,
    harmony: 0,
    lead: 0,
    percussion: 0,
  };
}

function collectSectionScaleDegrees(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  section: ProceduralMusicSongSection;
  role: ProceduralMusicRole;
}): number[] {
  const degrees: number[] = [];
  const sectionStartMs = options.notes[0]?.startMs ?? 0;
  const sectionStart = sectionStartMs + options.section.startOffsetMs;
  const sectionEnd = sectionStart + options.section.durationMs;

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (!diagnostic || note.role !== options.role) {
      continue;
    }
    if (
      note.startMs < sectionStart ||
      note.startMs >= sectionEnd ||
      diagnostic.scaleDegree === null
    ) {
      continue;
    }
    degrees.push(diagnostic.scaleDegree - 1);
  }

  return degrees;
}

function collectHarmonyChordLabels(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  section: ProceduralMusicSongSection;
}): string[] {
  const groups = new Map<number, string>();
  const sectionStartMs = options.notes[0]?.startMs ?? 0;
  const sectionStart = sectionStartMs + options.section.startOffsetMs;
  const sectionEnd = sectionStart + options.section.durationMs;

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (
      !diagnostic ||
      note.role !== 'harmony' ||
      diagnostic.midiNote === null
    ) {
      continue;
    }
    if (note.startMs < sectionStart || note.startMs >= sectionEnd) {
      continue;
    }
    const pitchClassLabel = resolvePitchClassLabel(diagnostic.midiNote);
    const existing = groups.get(note.startMs);
    groups.set(
      note.startMs,
      existing ? `${existing},${pitchClassLabel}` : pitchClassLabel
    );
  }

  const labelCounts = new Map<string, number>();
  for (const group of groups.values()) {
    const dedupedLabel = normalizeChordLabel(group);
    if (!dedupedLabel) {
      continue;
    }
    labelCounts.set(dedupedLabel, (labelCounts.get(dedupedLabel) ?? 0) + 1);
  }

  return Array.from(labelCounts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    })
    .slice(0, 3)
    .map(([label, count]) => `${label} x${count}`);
}

function normalizeChordLabel(group: string): string | null {
  const pitchClasses = Array.from(new Set(group.split(','))).filter(Boolean);
  if (pitchClasses.length < 2) {
    return null;
  }
  return pitchClasses.join('-');
}

function createIntervalPattern(degrees: readonly number[]): number[] {
  const pattern: number[] = [];
  for (let index = 1; index < degrees.length; index += 1) {
    pattern.push(degrees[index]! - degrees[index - 1]!);
  }
  return pattern;
}

function countIntervalPatternMatches(
  degrees: readonly number[],
  targetPattern: readonly number[]
): number {
  if (degrees.length < targetPattern.length + 1) {
    return 0;
  }

  let matches = 0;
  for (
    let startIndex = 0;
    startIndex <= degrees.length - (targetPattern.length + 1);
    startIndex += 1
  ) {
    let matched = true;
    for (
      let patternIndex = 0;
      patternIndex < targetPattern.length;
      patternIndex += 1
    ) {
      const actualInterval =
        degrees[startIndex + patternIndex + 1]! -
        degrees[startIndex + patternIndex]!;
      if (actualInterval !== targetPattern[patternIndex]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      matches += 1;
    }
  }
  return matches;
}

function resolvePitchClassLabel(midiNote: number) {
  const normalizedPitchClass = ((midiNote % 12) + 12) % 12;
  return MUSIC_DEBUG_PITCH_CLASS_LABELS[normalizedPitchClass] ?? 'C';
}
