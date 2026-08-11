import type { MusicDebugSnapshot } from './music-debug.ts';

export function createMusicDebugSnapshotSignature(
  snapshot: Pick<
    MusicDebugSnapshot,
    | 'theme'
    | 'songDna'
    | 'notes'
    | 'sectionLayerComparisons'
    | 'sectionMotifMatches'
  >
): string {
  const noteSignature = snapshot.notes
    .map(
      (note) =>
        `${note.role}:${note.startMs}:${note.durationMs}:${Math.round(note.frequency * 100)}:${note.velocity}:${note.instrumentId}`
    )
    .join('|');
  const layerSignature = snapshot.sectionLayerComparisons
    .map(
      (comparison) =>
        `${comparison.sectionId}:${comparison.sectionLabel}:${comparison.matchesPlan}:${comparison.matchedRules.join(',')}:${comparison.mismatchRules.join(',')}`
    )
    .join('|');
  const motifSignature = snapshot.sectionMotifMatches
    .map(
      (match) =>
        `${match.sectionId}:${match.sectionLabel}:${match.exactMatchCount}:${match.variedMatchCount}:${match.matchCount}`
    )
    .join('|');

  return [
    snapshot.theme.id,
    snapshot.songDna.identityId,
    noteSignature,
    layerSignature,
    motifSignature,
  ].join('\n');
}
