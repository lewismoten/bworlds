export const DEBUG_SNAPSHOT_SAMPLE_INTERVAL_MS = 250;

export function shouldCollectDebugSnapshot(options: {
  debugInspectorVisible: boolean;
  hasDebugSummary: boolean;
  hasGps: boolean;
  nowMs: number;
  lastSampleNowMs: number | null;
  sampleIntervalMs?: number;
}): boolean {
  if (!options.debugInspectorVisible || !options.hasDebugSummary || !options.hasGps) {
    return false;
  }
  if (options.lastSampleNowMs === null) {
    return true;
  }
  return (
    options.nowMs - options.lastSampleNowMs >=
    (options.sampleIntervalMs ?? DEBUG_SNAPSHOT_SAMPLE_INTERVAL_MS)
  );
}
