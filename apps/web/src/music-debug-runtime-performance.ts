import type { RuntimePerformanceSnapshot } from './runtime-performance-tracking.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

export function buildMusicDebugRuntimePerformanceWorldSeed(
  snapshot: Pick<MusicDebugSnapshot, 'theme' | 'options' | 'durationMs'>
): string {
  return [
    'music-debug',
    snapshot.theme.id,
    snapshot.options.contextType,
    snapshot.options.tileKind,
    snapshot.options.clusterX,
    snapshot.options.clusterY,
    snapshot.options.encounterMode,
    snapshot.durationMs,
  ].join(':');
}

export function buildMusicDebugRuntimePerformanceContext(
  snapshot: Pick<MusicDebugSnapshot, 'options'>
): RuntimePerformanceSnapshot['context'] {
  return {
    id: `${snapshot.options.contextType}:${snapshot.options.tileKind}:${snapshot.options.clusterX}:${snapshot.options.clusterY}`,
    label: `${snapshot.options.contextType} ${snapshot.options.tileKind}`,
    depth: 0,
  };
}
