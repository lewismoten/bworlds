import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicBlueprint } from './procedural-music-blueprint.ts';
import type { ProceduralChordTimelineEntry } from './procedural-music-chord-timeline.ts';
import type { MusicDebugSectionProminence } from './music-debug-section-prominence.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import {
  countMusicDebugExactMotifMatches,
  countMusicDebugVariedMotifMatches,
} from './music-debug-motif-match.ts';
import { getProceduralScaleDegreeSemitones } from './procedural-music-scale.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugSectionMotifMatch = {
  sectionId: string;
  sectionLabel: string;
  exactMatchCount: number;
  variedMatchCount: number;
  matchCount: number;
};

export type MusicDebugHarmonyChordDetection = {
  sectionId: string;
  sectionLabel: string;
  chordLabels: string[];
  detectedChordLabels: string[];
  plannedChordLabels: string[];
  followsPlannedProgression: boolean;
  driftWindows: MusicDebugProgressionDriftWindow[];
};

export type MusicDebugBassProgressionDetection = {
  sectionId: string;
  sectionLabel: string;
  detectedRootLabels: string[];
  plannedRootLabels: string[];
  followsPlannedProgression: boolean;
  driftWindows: MusicDebugProgressionDriftWindow[];
};

export type MusicDebugProgressionDriftWindow = {
  startMeasure: number;
  endMeasure: number;
  detectedLabel: string | null;
  detectedNoteLabels: string[];
  plannedLabel: string;
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

const OCCUPANCY_VALIDATION_EPSILON_PERCENTAGE = 1;

export function createMusicDebugSectionMotifMatches(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  leadMotif: readonly number[];
  scaleLength: number;
}): MusicDebugSectionMotifMatch[] {
  return options.sections.map((section) => {
    const leadDegrees = collectSectionScaleDegrees({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      section,
      role: 'lead',
      scaleLength: options.scaleLength,
    });
    const exactMatchCount = countMusicDebugExactMotifMatches(
      leadDegrees,
      options.leadMotif
    );
    const variedMatchCount = countMusicDebugVariedMotifMatches(
      leadDegrees,
      options.leadMotif
    );

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      exactMatchCount,
      variedMatchCount,
      matchCount: exactMatchCount + variedMatchCount,
    };
  });
}

export function createMusicDebugHarmonyChordDetections(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  scale?: readonly number[];
  rootMidiNote?: number;
  chordTimeline?: readonly ProceduralChordTimelineEntry[];
}): MusicDebugHarmonyChordDetection[] {
  return options.sections.map((section) => {
    const chordWindows = collectSectionChordWindows(
      section,
      options.chordTimeline ?? []
    );
    const detectedChordLabels = collectOrderedHarmonyChordLabels({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      section,
    });
    const plannedChordLabels =
      options.scale && options.chordTimeline
        ? collectPlannedSectionChordLabels({
            section,
            scale: options.scale,
            rootMidiNote: options.rootMidiNote ?? 60,
            chordTimeline: options.chordTimeline,
          })
        : [];
    const driftWindows =
      options.scale && options.chordTimeline
        ? collectHarmonyChordDriftWindows({
            notes: options.notes,
            notePitchDiagnostics: options.notePitchDiagnostics,
            section,
            scale: options.scale,
            rootMidiNote: options.rootMidiNote ?? 60,
            chordTimeline: options.chordTimeline,
            chordWindows,
          })
        : [];

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      chordLabels: collectHarmonyChordLabels({
        notes: options.notes,
        notePitchDiagnostics: options.notePitchDiagnostics,
        section,
      }),
      detectedChordLabels,
      plannedChordLabels,
      followsPlannedProgression:
        plannedChordLabels.length === 0
          ? detectedChordLabels.length > 0
          : doesDetectedChordSequenceFollowPlan(
              detectedChordLabels,
              plannedChordLabels
            ),
      driftWindows,
    };
  });
}

export function createMusicDebugBassProgressionDetections(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  scale?: readonly number[];
  rootMidiNote?: number;
  chordTimeline?: readonly ProceduralChordTimelineEntry[];
}): MusicDebugBassProgressionDetection[] {
  return options.sections.map((section) => {
    const chordWindows = collectSectionChordWindows(
      section,
      options.chordTimeline ?? []
    );
    const plannedRootLabels =
      options.scale && options.chordTimeline
        ? collectPlannedSectionRootLabels({
            section,
            scale: options.scale,
            rootMidiNote: options.rootMidiNote ?? 60,
            chordTimeline: options.chordTimeline,
          })
        : [];
    const detectedRootLabels =
      options.chordTimeline && options.chordTimeline.length > 0
        ? collectDetectedSectionBassRootLabels({
            notes: options.notes,
            notePitchDiagnostics: options.notePitchDiagnostics,
            section,
            chordTimeline: options.chordTimeline,
            chordWindows,
          })
        : collectOrderedBassRootLabels({
            notes: options.notes,
            notePitchDiagnostics: options.notePitchDiagnostics,
            section,
          });
    const driftWindows =
      options.scale && options.chordTimeline
        ? collectBassRootDriftWindows({
            notes: options.notes,
            notePitchDiagnostics: options.notePitchDiagnostics,
            section,
            scale: options.scale,
            rootMidiNote: options.rootMidiNote ?? 60,
            chordTimeline: options.chordTimeline,
            chordWindows,
          })
        : [];

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      detectedRootLabels,
      plannedRootLabels,
      followsPlannedProgression:
        plannedRootLabels.length === 0
          ? detectedRootLabels.length > 0
          : doesDetectedRootSequenceFollowPlan(
              detectedRootLabels,
              plannedRootLabels
            ),
      driftWindows,
    };
  });
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
  blueprint?: ProceduralMusicBlueprint;
  prominence?: readonly MusicDebugSectionProminence[];
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
    const blueprintSection =
      options.blueprint?.sections.find(
        (section) => section.id === activity.sectionId
      ) ?? null;
    const baselineProminence =
      options.prominence?.find((section) => section.sectionId === 'a') ?? null;
    const sectionProminence =
      options.prominence?.find(
        (section) => section.sectionId === activity.sectionId
      ) ?? null;

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
        pushRuleResult(
          baselineProminence === null ||
            sectionProminence === null ||
            sectionProminence.roles.lead.prominenceScore >
              baselineProminence.roles.lead.prominenceScore,
          'lead prominence exceeds Section A',
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
        pushRuleResult(
          baselineProminence === null ||
            sectionProminence === null ||
            sectionProminence.roles.harmony.prominenceScore <
              baselineProminence.roles.harmony.prominenceScore,
          'harmony prominence stays below Section A',
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

    if (blueprintSection) {
      validateBlueprintOccupancy(
        activity,
        blueprintSection.occupancy,
        matchedRules,
        mismatchRules
      );
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

function validateBlueprintOccupancy(
  activity: MusicDebugSectionLayerActivity,
  occupancy: NonNullable<
    ProceduralMusicBlueprint['sections'][number]['occupancy']
  >,
  matchedRules: string[],
  mismatchRules: string[]
): void {
  for (const role of PROCEDURAL_MUSIC_ROLES) {
    const occupancyTarget = occupancy[role];
    if (!occupancyTarget) {
      continue;
    }
    const actualPercentage = activity.soundingTimePercentageByRole[role];
    if (
      occupancyTarget.minPercentage !== undefined &&
      actualPercentage <
        occupancyTarget.minPercentage - OCCUPANCY_VALIDATION_EPSILON_PERCENTAGE
    ) {
      mismatchRules.push(
        `${role} occupancy ${Math.round(actualPercentage)}% stayed below blueprint minimum ${occupancyTarget.minPercentage}%`
      );
      continue;
    }
    if (
      occupancyTarget.maxPercentage !== undefined &&
      actualPercentage >
        occupancyTarget.maxPercentage + OCCUPANCY_VALIDATION_EPSILON_PERCENTAGE
    ) {
      mismatchRules.push(
        `${role} occupancy ${Math.round(actualPercentage)}% exceeded blueprint maximum ${occupancyTarget.maxPercentage}%`
      );
      continue;
    }
    matchedRules.push(`${role} occupancy stays inside blueprint range`);
  }
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
  scaleLength: number;
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
    degrees.push(mod(diagnostic.scaleDegree - 1, options.scaleLength));
  }

  return degrees;
}

function mod(value: number, divisor: number): number {
  if (divisor <= 0) {
    return value;
  }
  return ((value % divisor) + divisor) % divisor;
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

function collectOrderedHarmonyChordLabels(options: {
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
      diagnostic.midiNote === null ||
      note.startMs < sectionStart ||
      note.startMs >= sectionEnd
    ) {
      continue;
    }

    const pitchClassLabel = resolvePitchClassLabel(diagnostic.midiNote);
    const existing = groups.get(note.startMs);
    groups.set(
      note.startMs,
      existing ? `${existing},${pitchClassLabel}` : pitchClassLabel
    );
  }

  const orderedLabels = Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, group]) => normalizeChordLabel(group))
    .filter((label): label is string => Boolean(label));

  return collapseConsecutiveChordLabels(orderedLabels);
}

function collectPlannedSectionChordLabels(options: {
  section: ProceduralMusicSongSection;
  scale: readonly number[];
  rootMidiNote: number;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
}): string[] {
  if (options.chordTimeline.length === 0) {
    return [];
  }

  const phraseMeasureCount = Math.max(
    1,
    ...options.chordTimeline.map((entry) => entry.endMeasure)
  );
  const labels: string[] = [];

  for (
    let measure = options.section.startMeasure;
    measure <= options.section.endMeasure;
    measure += 1
  ) {
    const normalizedMeasure = ((measure - 1) % phraseMeasureCount) + 1;
    const timelineEntry = options.chordTimeline.find(
      (entry) =>
        normalizedMeasure >= entry.startMeasure &&
        normalizedMeasure <= entry.endMeasure
    );
    if (!timelineEntry) {
      continue;
    }
    labels.push(
      createPlannedChordLabel(
        options.scale,
        options.rootMidiNote,
        timelineEntry.degreeIndex
      )
    );
  }

  return collapseConsecutiveChordLabels(labels);
}

function collectPlannedSectionRootLabels(options: {
  section: ProceduralMusicSongSection;
  scale: readonly number[];
  rootMidiNote: number;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
}): string[] {
  if (options.chordTimeline.length === 0) {
    return [];
  }

  const labels: string[] = [];
  for (const window of collectSectionChordWindows(
    options.section,
    options.chordTimeline
  )) {
    labels.push(
      resolvePitchClassLabel(
        options.rootMidiNote +
          getProceduralScaleDegreeSemitones(options.scale, window.degreeIndex)
      )
    );
  }

  return collapseConsecutiveChordLabels(labels);
}

function collapseConsecutiveChordLabels(labels: readonly string[]): string[] {
  const collapsed: string[] = [];
  for (const label of labels) {
    if (label.length === 0 || collapsed[collapsed.length - 1] === label) {
      continue;
    }
    collapsed.push(label);
  }
  return collapsed;
}

function collectOrderedBassRootLabels(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  section: ProceduralMusicSongSection;
}): string[] {
  const sectionStartMs = options.notes[0]?.startMs ?? 0;
  const sectionStart = sectionStartMs + options.section.startOffsetMs;
  const sectionEnd = sectionStart + options.section.durationMs;
  const labels: string[] = [];

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (
      !diagnostic ||
      note.role !== 'bass' ||
      diagnostic.midiNote === null ||
      note.startMs < sectionStart ||
      note.startMs >= sectionEnd
    ) {
      continue;
    }
    labels.push(resolvePitchClassLabel(diagnostic.midiNote));
  }

  return collapseConsecutiveChordLabels(labels);
}

function collectDetectedSectionBassRootLabels(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  section: ProceduralMusicSongSection;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
  chordWindows?: ReadonlyArray<{
    degreeIndex: number;
    sectionStartMeasure: number;
    sectionEndMeasure: number;
  }>;
}): string[] {
  const sectionStartMs = options.notes[0]?.startMs ?? 0;
  const sectionStart = sectionStartMs + options.section.startOffsetMs;
  const measureDurationMs =
    options.section.measureCount > 0
      ? options.section.durationMs / options.section.measureCount
      : options.section.durationMs;
  const labels: string[] = [];

  for (const window of options.chordWindows ??
    collectSectionChordWindows(options.section, options.chordTimeline)) {
    const startMs =
      sectionStart + (window.sectionStartMeasure - 1) * measureDurationMs;
    const endMs = sectionStart + window.sectionEndMeasure * measureDurationMs;
    const label = detectBassRootLabelForWindow({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      startMs,
      endMs,
    });
    if (label) {
      labels.push(label);
    }
  }

  return collapseConsecutiveChordLabels(labels);
}

function collectHarmonyChordDriftWindows(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  section: ProceduralMusicSongSection;
  scale: readonly number[];
  rootMidiNote: number;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
  chordWindows: ReadonlyArray<{
    degreeIndex: number;
    sectionStartMeasure: number;
    sectionEndMeasure: number;
  }>;
}): MusicDebugProgressionDriftWindow[] {
  const sectionStartMs = options.notes[0]?.startMs ?? 0;
  const sectionStart = sectionStartMs + options.section.startOffsetMs;
  const measureDurationMs =
    options.section.measureCount > 0
      ? options.section.durationMs / options.section.measureCount
      : options.section.durationMs;
  const drifts: MusicDebugProgressionDriftWindow[] = [];

  for (const window of options.chordWindows) {
    const plannedLabel = createPlannedChordLabel(
      options.scale,
      options.rootMidiNote,
      window.degreeIndex
    );
    const startMs =
      sectionStart + (window.sectionStartMeasure - 1) * measureDurationMs;
    const endMs = sectionStart + window.sectionEndMeasure * measureDurationMs;
    const detectedLabel = detectHarmonyChordLabelForWindow({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      startMs,
      endMs,
    });
    if (
      detectedLabel !== null &&
      !doesDetectedChordLabelFitPlannedChord(detectedLabel, plannedLabel)
    ) {
      drifts.push({
        startMeasure:
          options.section.startMeasure + window.sectionStartMeasure - 1,
        endMeasure: options.section.startMeasure + window.sectionEndMeasure - 1,
        detectedLabel,
        detectedNoteLabels: resolveHarmonyNoteLabelsForWindow({
          notes: options.notes,
          notePitchDiagnostics: options.notePitchDiagnostics,
          startMs,
          endMs,
        }),
        plannedLabel,
      });
    }
  }

  return drifts;
}

function collectBassRootDriftWindows(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  section: ProceduralMusicSongSection;
  scale: readonly number[];
  rootMidiNote: number;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
  chordWindows: ReadonlyArray<{
    degreeIndex: number;
    sectionStartMeasure: number;
    sectionEndMeasure: number;
  }>;
}): MusicDebugProgressionDriftWindow[] {
  const sectionStartMs = options.notes[0]?.startMs ?? 0;
  const sectionStart = sectionStartMs + options.section.startOffsetMs;
  const measureDurationMs =
    options.section.measureCount > 0
      ? options.section.durationMs / options.section.measureCount
      : options.section.durationMs;
  const drifts: MusicDebugProgressionDriftWindow[] = [];

  for (const window of options.chordWindows) {
    const plannedLabel = resolvePitchClassLabel(
      options.rootMidiNote +
        getProceduralScaleDegreeSemitones(options.scale, window.degreeIndex)
    );
    const startMs =
      sectionStart + (window.sectionStartMeasure - 1) * measureDurationMs;
    const endMs = sectionStart + window.sectionEndMeasure * measureDurationMs;
    const detectedLabel = detectBassRootLabelForWindow({
      notes: options.notes,
      notePitchDiagnostics: options.notePitchDiagnostics,
      startMs,
      endMs,
    });
    if (detectedLabel !== null && detectedLabel !== plannedLabel) {
      drifts.push({
        startMeasure:
          options.section.startMeasure + window.sectionStartMeasure - 1,
        endMeasure: options.section.startMeasure + window.sectionEndMeasure - 1,
        detectedLabel,
        detectedNoteLabels: resolveBassNoteLabelsForWindow({
          notes: options.notes,
          notePitchDiagnostics: options.notePitchDiagnostics,
          startMs,
          endMs,
        }),
        plannedLabel,
      });
    }
  }

  return drifts;
}

function detectHarmonyChordLabelForWindow(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  startMs: number;
  endMs: number;
}): string | null {
  const groups = new Map<number, string>();

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (
      !diagnostic ||
      note.role !== 'harmony' ||
      diagnostic.midiNote === null ||
      note.startMs >= options.endMs ||
      note.startMs + note.durationMs <= options.startMs
    ) {
      continue;
    }

    const overlapStartMs = Math.max(note.startMs, options.startMs);
    const existing = groups.get(overlapStartMs);
    const pitchClassLabel = resolvePitchClassLabel(diagnostic.midiNote);
    groups.set(
      overlapStartMs,
      existing ? `${existing},${pitchClassLabel}` : pitchClassLabel
    );
  }

  const orderedLabels = Array.from(groups.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, group]) => normalizeChordLabel(group))
    .filter((label): label is string => Boolean(label));

  return orderedLabels[0] ?? null;
}

function resolveHarmonyNoteLabelsForWindow(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  startMs: number;
  endMs: number;
}): string[] {
  const noteLabels = new Map<number, Set<string>>();

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (
      !diagnostic ||
      note.role !== 'harmony' ||
      diagnostic.midiNote === null ||
      note.startMs >= options.endMs ||
      note.startMs + note.durationMs <= options.startMs
    ) {
      continue;
    }

    const overlapStartMs = Math.max(note.startMs, options.startMs);
    let labelsAtStart = noteLabels.get(overlapStartMs);
    if (!labelsAtStart) {
      labelsAtStart = new Set<string>();
      noteLabels.set(overlapStartMs, labelsAtStart);
    }
    labelsAtStart.add(formatMidiNoteLabel(diagnostic.midiNote));
  }

  const earliestLabels = [...noteLabels.entries()].sort(
    (left, right) => left[0] - right[0]
  )[0]?.[1];
  return earliestLabels ? [...earliestLabels].sort(compareNoteLabels) : [];
}

function resolveBassNoteLabelsForWindow(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  startMs: number;
  endMs: number;
}): string[] {
  let earliestStartMs = Number.POSITIVE_INFINITY;
  const labels: string[] = [];

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (
      !diagnostic ||
      note.role !== 'bass' ||
      diagnostic.midiNote === null ||
      note.startMs >= options.endMs ||
      note.startMs + note.durationMs <= options.startMs
    ) {
      continue;
    }
    if (note.startMs < earliestStartMs) {
      earliestStartMs = note.startMs;
      labels.length = 0;
    }
    if (note.startMs === earliestStartMs) {
      labels.push(formatMidiNoteLabel(diagnostic.midiNote));
    }
  }

  return [...new Set(labels)].sort(compareNoteLabels);
}

function detectBassRootLabelForWindow(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  startMs: number;
  endMs: number;
}): string | null {
  let earliestStartMs = Number.POSITIVE_INFINITY;
  let bestLabel: string | null = null;
  let bestDuration = -1;

  for (let index = 0; index < options.notes.length; index += 1) {
    const note = options.notes[index]!;
    const diagnostic = options.notePitchDiagnostics[index];
    if (
      !diagnostic ||
      note.role !== 'bass' ||
      diagnostic.midiNote === null ||
      note.startMs >= options.endMs ||
      note.startMs + note.durationMs <= options.startMs
    ) {
      continue;
    }
    const overlapStartMs = Math.max(note.startMs, options.startMs);
    const overlapEndMs = Math.min(
      note.startMs + note.durationMs,
      options.endMs
    );
    if (overlapEndMs <= overlapStartMs) {
      continue;
    }
    const label = resolvePitchClassLabel(diagnostic.midiNote);
    const overlapDurationMs = overlapEndMs - overlapStartMs;
    if (
      note.startMs < earliestStartMs ||
      (note.startMs === earliestStartMs && overlapDurationMs > bestDuration) ||
      (note.startMs === earliestStartMs &&
        overlapDurationMs === bestDuration &&
        bestLabel !== null &&
        label.localeCompare(bestLabel) < 0)
    ) {
      bestLabel = label;
      bestDuration = overlapDurationMs;
      earliestStartMs = note.startMs;
    }
  }

  return bestLabel;
}

function collectSectionChordWindows(
  section: ProceduralMusicSongSection,
  chordTimeline: readonly ProceduralChordTimelineEntry[]
): Array<{
  degreeIndex: number;
  sectionStartMeasure: number;
  sectionEndMeasure: number;
}> {
  if (chordTimeline.length === 0) {
    return [];
  }

  const phraseMeasureCount = Math.max(
    1,
    ...chordTimeline.map((entry) => entry.endMeasure)
  );
  const windows: Array<{
    degreeIndex: number;
    sectionStartMeasure: number;
    sectionEndMeasure: number;
  }> = [];

  for (
    let measure = section.startMeasure;
    measure <= section.endMeasure;
    measure += 1
  ) {
    const normalizedMeasure = ((measure - 1) % phraseMeasureCount) + 1;
    const timelineEntry = chordTimeline.find(
      (entry) =>
        normalizedMeasure >= entry.startMeasure &&
        normalizedMeasure <= entry.endMeasure
    );
    if (!timelineEntry) {
      continue;
    }
    const sectionMeasure = measure - section.startMeasure + 1;
    const previous = windows[windows.length - 1];
    if (
      previous &&
      previous.degreeIndex === timelineEntry.degreeIndex &&
      previous.sectionEndMeasure === sectionMeasure - 1
    ) {
      previous.sectionEndMeasure = sectionMeasure;
      continue;
    }
    windows.push({
      degreeIndex: timelineEntry.degreeIndex,
      sectionStartMeasure: sectionMeasure,
      sectionEndMeasure: sectionMeasure,
    });
  }

  return windows;
}

function createPlannedChordLabel(
  scale: readonly number[],
  rootMidiNote: number,
  degreeIndex: number
): string {
  const semitones = [
    getProceduralScaleDegreeSemitones(scale, degreeIndex),
    getProceduralScaleDegreeSemitones(scale, degreeIndex + 2),
    getProceduralScaleDegreeSemitones(scale, degreeIndex + 4),
  ];
  return semitones
    .map((semitone) => resolvePitchClassLabel(rootMidiNote + semitone))
    .join('-');
}

function doesDetectedChordSequenceFollowPlan(
  detectedChordLabels: readonly string[],
  plannedChordLabels: readonly string[]
): boolean {
  if (detectedChordLabels.length === 0 || plannedChordLabels.length === 0) {
    return false;
  }

  let planIndex = 0;
  for (const detectedLabel of detectedChordLabels) {
    while (
      planIndex < plannedChordLabels.length &&
      !doesDetectedChordLabelFitPlannedChord(
        detectedLabel,
        plannedChordLabels[planIndex] ?? ''
      )
    ) {
      planIndex += 1;
    }
    if (planIndex >= plannedChordLabels.length) {
      return false;
    }
    planIndex += 1;
  }

  return true;
}

function doesDetectedRootSequenceFollowPlan(
  detectedRootLabels: readonly string[],
  plannedRootLabels: readonly string[]
): boolean {
  if (detectedRootLabels.length === 0 || plannedRootLabels.length === 0) {
    return false;
  }

  let planIndex = 0;
  for (const detectedLabel of detectedRootLabels) {
    while (
      planIndex < plannedRootLabels.length &&
      detectedLabel !== plannedRootLabels[planIndex]
    ) {
      planIndex += 1;
    }
    if (planIndex >= plannedRootLabels.length) {
      return false;
    }
    planIndex += 1;
  }

  return true;
}

function doesDetectedChordLabelFitPlannedChord(
  detectedLabel: string,
  plannedLabel: string
): boolean {
  const detectedPitchClasses = new Set(
    detectedLabel.split('-').filter((label) => label.length > 0)
  );
  const plannedPitchClasses = new Set(
    plannedLabel.split('-').filter((label) => label.length > 0)
  );
  if (detectedPitchClasses.size === 0 || plannedPitchClasses.size === 0) {
    return false;
  }

  for (const pitchClass of detectedPitchClasses) {
    if (!plannedPitchClasses.has(pitchClass)) {
      return false;
    }
  }

  return true;
}

function normalizeChordLabel(group: string): string | null {
  const pitchClasses = Array.from(new Set(group.split(','))).filter(Boolean);
  if (pitchClasses.length < 2) {
    return null;
  }
  return pitchClasses.join('-');
}

function resolvePitchClassLabel(midiNote: number) {
  const normalizedPitchClass = ((midiNote % 12) + 12) % 12;
  return MUSIC_DEBUG_PITCH_CLASS_LABELS[normalizedPitchClass] ?? 'C';
}

function formatMidiNoteLabel(midiNote: number): string {
  return `${resolvePitchClassLabel(midiNote)}${Math.floor(midiNote / 12) - 1}`;
}

function compareNoteLabels(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true });
}
