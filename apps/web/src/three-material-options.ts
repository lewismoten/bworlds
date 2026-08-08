export function compactThreeMaterialOptions<T extends Record<string, unknown>>(
  options: T
): T {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as T;
}

export function resolveThreeColor(
  color: string | undefined,
  fallback: string
): string {
  return typeof color === 'string' && color.length > 0 ? color : fallback;
}
