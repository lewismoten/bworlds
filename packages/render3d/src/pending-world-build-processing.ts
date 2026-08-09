export function shouldProcessPendingWorldBuildEntryWithinBudget(
  flushStartMs: number,
  currentMs: number,
  processedEntryCount: number,
  pendingBuildBudgetMs: number,
  maxPendingBuildTiles: number,
  minimumEntriesPerFlush = 1
): boolean {
  if (processedEntryCount >= maxPendingBuildTiles) {
    return false;
  }
  if (processedEntryCount < minimumEntriesPerFlush) {
    return true;
  }
  return currentMs - flushStartMs < pendingBuildBudgetMs;
}
