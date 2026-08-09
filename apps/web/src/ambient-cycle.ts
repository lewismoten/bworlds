export type AmbientDayPhase = 'dawn' | 'day' | 'dusk' | 'night';
export type AmbientSeason = 'winter' | 'spring' | 'summer' | 'autumn';

export function normalizeAmbientProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return ((value % 1) + 1) % 1;
}

export function resolveAmbientDayPhase(
  dayProgress: number | undefined
): AmbientDayPhase {
  const progress = normalizeAmbientProgress(dayProgress ?? 0.5);
  if (progress < 0.2 || progress >= 0.85) {
    return 'night';
  }
  if (progress < 0.3) {
    return 'dawn';
  }
  if (progress < 0.72) {
    return 'day';
  }
  return 'dusk';
}

export function resolveAmbientSeason(
  yearProgress: number | undefined
): AmbientSeason {
  const progress = normalizeAmbientProgress(yearProgress ?? 0.5);
  if (progress < 0.125 || progress >= 0.875) {
    return 'winter';
  }
  if (progress < 0.375) {
    return 'spring';
  }
  if (progress < 0.625) {
    return 'summer';
  }
  return 'autumn';
}
