export function fract(value: number): number {
  return value - Math.floor(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(
  edge0: number,
  edge1: number,
  value: number
): number {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function normalizeAngle(angle: number): number {
  const tau = Math.PI * 2;
  let next = angle % tau;
  if (next < 0) next += tau;
  return next;
}

export function normalizeTurns(value: number): number {
  return ((value % 1) + 1) % 1;
}

export function pickFrom<T>(list: readonly T[], seedValue: number): T {
  return list[Math.floor(seedValue * list.length) % list.length];
}