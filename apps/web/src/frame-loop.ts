import { getCompassDelta } from './compass.ts';

const ACTIVE_MOVEMENT_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'w',
  'a',
  's',
  'd',
  'q',
  'e',
]);

export function hasActiveMovementInput(keys: Iterable<string>) {
  for (const key of keys) {
    if (ACTIVE_MOVEMENT_KEYS.has(key)) {
      return true;
    }
  }
  return false;
}

export function getWrappedProgressDelta(current: number, target: number) {
  let delta = target - current;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

export function isWrappedProgressAnimating(
  current: number,
  target: number,
  threshold = 0.002
) {
  return Math.abs(getWrappedProgressDelta(current, target)) > threshold;
}

export function isAngleAnimating(
  current: number | null,
  target: number | null,
  threshold = 0.01
) {
  if (typeof current !== 'number' || typeof target !== 'number') {
    return false;
  }
  return Math.abs(getCompassDelta(current, target)) > threshold;
}

export function getFrameLoopActivity(options: {
  nowMs?: number;
  timeFrozen: boolean;
  keys: Iterable<string>;
  isJumping: boolean;
  compassVelocity: number;
  headingVisualAngle: number | null;
  headingTargetAngle: number | null;
  previewInteracting?: boolean;
  compassDragging?: boolean;
  hmrNoticeVisibleUntilMs?: number | null;
  displayedCycle: {
    dayProgress: number;
    yearProgress: number;
    moonMidnightOrbitProgress?: number;
    sunriseProgress: number;
    sunsetProgress: number;
    daylightDuration: number;
  };
  actualCycle: {
    dayProgress: number;
    yearProgress: number;
    moonMidnightOrbitProgress?: number;
    sunriseProgress: number;
    sunsetProgress: number;
    daylightDuration: number;
  };
}) {
  const displayedMoonProgress = options.displayedCycle.moonMidnightOrbitProgress ?? 0;
  const actualMoonProgress = options.actualCycle.moonMidnightOrbitProgress ?? 0;
  const dialSettling =
    isWrappedProgressAnimating(
      options.displayedCycle.dayProgress,
      options.actualCycle.dayProgress
    ) ||
    isWrappedProgressAnimating(
      options.displayedCycle.yearProgress,
      options.actualCycle.yearProgress
    ) ||
    isWrappedProgressAnimating(displayedMoonProgress, actualMoonProgress) ||
    isWrappedProgressAnimating(
      options.displayedCycle.sunriseProgress,
      options.actualCycle.sunriseProgress
    ) ||
    isWrappedProgressAnimating(
      options.displayedCycle.sunsetProgress,
      options.actualCycle.sunsetProgress
    ) ||
    Math.abs(
      options.displayedCycle.daylightDuration - options.actualCycle.daylightDuration
    ) > 0.002;

  return {
    hasMovementInput: hasActiveMovementInput(options.keys),
    isJumping: options.isJumping,
    isTimeRunning: !options.timeFrozen,
    isCompassSettling: Math.abs(options.compassVelocity) > 0.001,
    isHeadingSettling: isAngleAnimating(
      options.headingVisualAngle,
      options.headingTargetAngle
    ),
    isDialSettling: dialSettling,
    previewInteracting: options.previewInteracting ?? false,
    compassDragging: options.compassDragging ?? false,
    hmrNoticeVisible:
      typeof options.hmrNoticeVisibleUntilMs === 'number' &&
      (options.nowMs ?? 0) < options.hmrNoticeVisibleUntilMs,
  };
}

export function shouldContinueFrameLoop(
  activity: ReturnType<typeof getFrameLoopActivity>
) {
  return (
    activity.hasMovementInput ||
    activity.isJumping ||
    activity.isTimeRunning ||
    activity.isCompassSettling ||
    activity.isHeadingSettling ||
    activity.isDialSettling ||
    activity.previewInteracting ||
    activity.compassDragging ||
    activity.hmrNoticeVisible
  );
}
