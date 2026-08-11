import type { MusicDebugCadenceValidation } from './music-debug-cadence-validation.ts';
import type { MusicDebugDensityValidation } from './music-debug-density-validation.ts';
import type {
  MusicDebugBassProgressionDetection,
  MusicDebugHarmonyChordDetection,
} from './music-debug-section-analysis.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export type MusicDebugSectionValidationStatus = 'pass' | 'fail';

export type MusicDebugSectionValidationSummary = {
  sectionId: string;
  sectionLabel: string;
  harmony: MusicDebugSectionValidationStatus;
  bass: MusicDebugSectionValidationStatus;
  cadence: MusicDebugSectionValidationStatus;
  density: MusicDebugSectionValidationStatus;
  overall: MusicDebugSectionValidationStatus;
  reasons: string[];
};

export function createMusicDebugSectionValidationSummary(options: {
  sections: readonly ProceduralMusicSongSection[];
  harmonyChordDetections: readonly MusicDebugHarmonyChordDetection[];
  bassProgressionDetections: readonly MusicDebugBassProgressionDetection[];
  cadenceValidation: MusicDebugCadenceValidation;
  densityValidation: MusicDebugDensityValidation;
}): MusicDebugSectionValidationSummary[] {
  const harmonyBySection = new Map(
    options.harmonyChordDetections.map((detection) => [
      detection.sectionId,
      detection,
    ])
  );
  const bassBySection = new Map(
    options.bassProgressionDetections.map((detection) => [
      detection.sectionId,
      detection,
    ])
  );
  const densityBySection = new Map(
    options.densityValidation.sections.map((section) => [
      section.sectionId,
      section,
    ])
  );
  const cadenceBySection = new Map(
    options.cadenceValidation.detections.map((detection) => [
      detection.sectionId,
      detection,
    ])
  );

  return options.sections.map((section) => {
    const harmonyDetection = harmonyBySection.get(section.id) ?? null;
    const bassDetection = bassBySection.get(section.id) ?? null;
    const densitySection = densityBySection.get(section.id) ?? null;
    const cadenceDetection = cadenceBySection.get(section.id) ?? null;
    const harmony = resolveHarmonyStatus(harmonyDetection);
    const bass = resolveBassStatus(bassDetection);
    const cadence = resolveCadenceStatus(cadenceDetection);
    const density = densitySection?.matchesPlan === false ? 'fail' : 'pass';
    const reasons = [
      ...createHarmonyReasons(harmonyDetection),
      ...createBassReasons(bassDetection),
      ...createCadenceReasons(cadenceDetection),
      ...(densitySection?.messages ?? []),
    ];

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      harmony,
      bass,
      cadence,
      density,
      overall:
        harmony === 'fail' ||
        bass === 'fail' ||
        cadence === 'fail' ||
        density === 'fail'
          ? 'fail'
          : 'pass',
      reasons,
    };
  });
}

function resolveHarmonyStatus(
  detection: MusicDebugHarmonyChordDetection | null
): MusicDebugSectionValidationStatus {
  if (
    detection !== null &&
    (detection.driftWindows.length > 0 || !detection.followsPlannedProgression)
  ) {
    return 'fail';
  }
  return 'pass';
}

function resolveBassStatus(
  detection: MusicDebugBassProgressionDetection | null
): MusicDebugSectionValidationStatus {
  if (
    detection !== null &&
    (detection.driftWindows.length > 0 || !detection.followsPlannedProgression)
  ) {
    return 'fail';
  }
  return 'pass';
}

function resolveCadenceStatus(
  detection: MusicDebugCadenceValidation['detections'][number] | null
): MusicDebugSectionValidationStatus {
  if (
    detection !== null &&
    (!detection.matchesCadenceTarget || !detection.matchesHarmony)
  ) {
    return 'fail';
  }
  return 'pass';
}

function createHarmonyReasons(
  detection: MusicDebugHarmonyChordDetection | null
): string[] {
  if (detection === null) {
    return [];
  }
  if (detection.driftWindows.length > 0) {
    return detection.driftWindows.map((window) => {
      const measureLabel =
        window.startMeasure === window.endMeasure
          ? `m${window.startMeasure}`
          : `m${window.startMeasure}-${window.endMeasure}`;
      return `harmony ${measureLabel} ${window.detectedLabel ?? 'missing'} vs ${window.plannedLabel}`;
    });
  }
  if (!detection.followsPlannedProgression) {
    return [
      `harmony seq ${detection.detectedChordLabels.join('>') || 'missing'} vs ${detection.plannedChordLabels.join('>') || 'unplanned'}`,
    ];
  }
  return [];
}

function createBassReasons(
  detection: MusicDebugBassProgressionDetection | null
): string[] {
  if (detection === null) {
    return [];
  }
  if (detection.driftWindows.length > 0) {
    return detection.driftWindows.map((window) => {
      const measureLabel =
        window.startMeasure === window.endMeasure
          ? `m${window.startMeasure}`
          : `m${window.startMeasure}-${window.endMeasure}`;
      return `bass ${measureLabel} ${window.detectedLabel ?? 'missing'} vs ${window.plannedLabel}`;
    });
  }
  if (!detection.followsPlannedProgression) {
    return [
      `bass seq ${detection.detectedRootLabels.join('>') || 'missing'} vs ${detection.plannedRootLabels.join('>') || 'unplanned'}`,
    ];
  }
  return [];
}

function createCadenceReasons(
  detection: MusicDebugCadenceValidation['detections'][number] | null
): string[] {
  if (detection === null) {
    return [];
  }
  const reasons: string[] = [];
  if (!detection.matchesCadenceTarget) {
    reasons.push(
      `${detection.kind} cadence target m${detection.measureNumber ?? '?'}`
    );
  }
  if (!detection.matchesHarmony) {
    reasons.push(
      `${detection.kind} cadence harmony m${detection.measureNumber ?? '?'}`
    );
  }
  return reasons;
}
