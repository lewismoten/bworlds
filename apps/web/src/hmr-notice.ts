export type HmrNoticePhase = 'before-update' | 'after-update';

export function getHmrNoticeText(phase: HmrNoticePhase): string {
  if (phase === 'before-update') {
    return 'Vite is updating this page. World state may refresh for a moment.';
  }
  return 'Vite finished updating the page.';
}

export function getHmrNoticeVisibleUntil(
  now: number,
  durationMs = 8000
): number {
  return now + durationMs;
}

export function shouldShowHmrNotice(
  visibleUntilMs: number | null,
  now: number
): boolean {
  return typeof visibleUntilMs === 'number' && now < visibleUntilMs;
}
