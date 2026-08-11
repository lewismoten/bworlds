import type { MusicDebugCadenceValidation } from './music-debug-cadence-validation.ts';
import type { MusicDebugLeadContourAnalysis } from './music-debug-lead-contour.ts';
import type { MusicDebugMotifValidation } from './music-debug-motif-validation.ts';

export type MusicDebugPhraseIntentComponentScore = {
  label: 'motif' | 'contour' | 'cadence';
  score: number;
  summary: string;
};

export type MusicDebugPhraseIntentScore = {
  motif: MusicDebugPhraseIntentComponentScore;
  contour: MusicDebugPhraseIntentComponentScore;
  cadence: MusicDebugPhraseIntentComponentScore;
  overallScore: number;
};

export function createMusicDebugPhraseIntentScore(options: {
  motifValidation: MusicDebugMotifValidation;
  leadContourAnalysis: MusicDebugLeadContourAnalysis;
  cadenceValidation: MusicDebugCadenceValidation;
}): MusicDebugPhraseIntentScore {
  const motif = createMotifIntentComponent(options.motifValidation);
  const contour = createContourIntentComponent(options.leadContourAnalysis);
  const cadence = createCadenceIntentComponent(options.cadenceValidation);

  return {
    motif,
    contour,
    cadence,
    overallScore: roundIntentScore(
      (motif.score + contour.score + cadence.score) / 3
    ),
  };
}

export function formatMusicDebugPhraseIntentScore(
  score: MusicDebugPhraseIntentScore
): string {
  return [
    `${capitalizeIntentLabel(score.motif.label)} ${formatIntentPercentage(score.motif.score)}`,
    `${capitalizeIntentLabel(score.contour.label)} ${formatIntentPercentage(score.contour.score)}`,
    `${capitalizeIntentLabel(score.cadence.label)} ${formatIntentPercentage(score.cadence.score)}`,
    `Overall ${formatIntentPercentage(score.overallScore)}`,
  ].join(' | ');
}

function createMotifIntentComponent(
  motifValidation: MusicDebugMotifValidation
): MusicDebugPhraseIntentComponentScore {
  const score =
    motifValidation.totalMatchCount <= 0
      ? 0
      : roundIntentScore(
          (motifValidation.exactMatchCount + motifValidation.variedMatchCount * 0.75) /
            motifValidation.totalMatchCount
        );

  return {
    label: 'motif',
    score,
    summary:
      motifValidation.totalMatchCount <= 0
        ? 'no motif statements detected'
        : `${motifValidation.exactMatchCount} exact / ${motifValidation.variedMatchCount} varied`,
  };
}

function createContourIntentComponent(
  contourAnalysis: MusicDebugLeadContourAnalysis
): MusicDebugPhraseIntentComponentScore {
  const pointCount = Math.max(1, contourAnalysis.points.length);
  const inRangeRatio = contourAnalysis.inRangePointCount / pointCount;
  const climaxBonus = contourAnalysis.climaxNearPlannedPeak ? 0.15 : 0;
  const cadenceBonus = contourAnalysis.finalResolvesToTonic ? 0.15 : 0;
  const score = roundIntentScore(
    Math.min(1, inRangeRatio * 0.7 + climaxBonus + cadenceBonus)
  );

  return {
    label: 'contour',
    score,
    summary: `${contourAnalysis.inRangePointCount}/${contourAnalysis.points.length} checkpoints in range${contourAnalysis.climaxNearPlannedPeak ? ', climax aligned' : ''}${contourAnalysis.finalResolvesToTonic ? ', final tonic' : ''}`,
  };
}

function createCadenceIntentComponent(
  cadenceValidation: MusicDebugCadenceValidation
): MusicDebugPhraseIntentComponentScore {
  const detectionCount = Math.max(1, cadenceValidation.detections.length);
  const matchedCadenceCount = cadenceValidation.detections.filter(
    (detection) => detection.matchesCadenceTarget && detection.matchesHarmony
  ).length;
  const score = roundIntentScore(matchedCadenceCount / detectionCount);

  return {
    label: 'cadence',
    score,
    summary: `${matchedCadenceCount}/${cadenceValidation.detections.length} cadence checkpoints matched`,
  };
}

function roundIntentScore(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000;
}

function formatIntentPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function capitalizeIntentLabel(
  label: MusicDebugPhraseIntentComponentScore['label']
): string {
  return label[0]!.toUpperCase() + label.slice(1);
}
