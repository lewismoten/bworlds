import type { MusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugMeasureStartOffsetMs } from './music-debug-chord-cues.ts';

const DEFAULT_MAX_MEASURE_LABELS = 24;
const BEATS_PER_MEASURE = 4;

export type MusicDebugMeasureMarker = {
  measureNumber: number;
  startOffsetMs: number;
  endOffsetMs: number;
  centerOffsetMs: number;
  label: string | null;
};

export type MusicDebugBeatSubdivisionMarker = {
  measureNumber: number;
  beatNumber: 2 | 3 | 4;
  offsetMs: number;
};

export function resolveMusicDebugMeasureMarkers(
  snapshot: MusicDebugSnapshot,
  maxLabels = DEFAULT_MAX_MEASURE_LABELS
): MusicDebugMeasureMarker[] {
  const markers: MusicDebugMeasureMarker[] = [];
  const labelStride = resolveMusicDebugMeasureLabelStride(
    snapshot.measureCount,
    maxLabels
  );

  for (
    let measureNumber = 1;
    measureNumber <= snapshot.measureCount;
    measureNumber += 1
  ) {
    const startOffsetMs = resolveMusicDebugMeasureStartOffsetMs(
      snapshot,
      measureNumber
    );
    const endOffsetMs =
      measureNumber >= snapshot.measureCount
        ? snapshot.durationMs
        : resolveMusicDebugMeasureStartOffsetMs(snapshot, measureNumber + 1);
    markers.push({
      measureNumber,
      startOffsetMs,
      endOffsetMs,
      centerOffsetMs: startOffsetMs + (endOffsetMs - startOffsetMs) * 0.5,
      label:
        measureNumber === 1 ||
        measureNumber === snapshot.measureCount ||
        (measureNumber - 1) % labelStride === 0
          ? `${measureNumber}`
          : null,
    });
  }

  return markers;
}

export function resolveMusicDebugBeatSubdivisionMarkers(
  snapshot: MusicDebugSnapshot
): MusicDebugBeatSubdivisionMarker[] {
  const markers: MusicDebugBeatSubdivisionMarker[] = [];
  const measureMarkers = resolveMusicDebugMeasureMarkers(snapshot);

  for (const measure of measureMarkers) {
    const measureDurationMs = Math.max(
      1,
      measure.endOffsetMs - measure.startOffsetMs
    );
    for (let beatNumber = 2 as const; beatNumber <= 4; beatNumber += 1) {
      markers.push({
        measureNumber: measure.measureNumber,
        beatNumber,
        offsetMs:
          measure.startOffsetMs +
          (measureDurationMs * (beatNumber - 1)) / BEATS_PER_MEASURE,
      });
    }
  }

  return markers;
}

function resolveMusicDebugMeasureLabelStride(
  measureCount: number,
  maxLabels: number
): number {
  const safeMeasureCount = Math.max(1, measureCount);
  const safeMaxLabels = Math.max(2, maxLabels);
  return Math.max(1, Math.ceil(safeMeasureCount / safeMaxLabels));
}
