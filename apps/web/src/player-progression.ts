export const DEFAULT_PLAYER_LEVEL = 1;
export const MAX_PLAYER_LEVEL = 99;

export function normalizePlayerLevel(level: number | undefined): number {
  if (!Number.isFinite(level)) {
    return DEFAULT_PLAYER_LEVEL;
  }

  return Math.min(
    MAX_PLAYER_LEVEL,
    Math.max(DEFAULT_PLAYER_LEVEL, Math.round(level ?? DEFAULT_PLAYER_LEVEL))
  );
}

export function getPlayerLevelChange(
  previousLevel: number | undefined,
  nextLevel: number | undefined
): 'level-up' | 'level-down' | null {
  const previous = normalizePlayerLevel(previousLevel);
  const next = normalizePlayerLevel(nextLevel);

  if (next > previous) {
    return 'level-up';
  }
  if (next < previous) {
    return 'level-down';
  }
  return null;
}
