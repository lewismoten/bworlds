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

type FrameLoopCycleProgress = {
  dayProgress: number;
  yearProgress: number;
  moonMidnightOrbitProgress?: number;
  sunriseProgress: number;
  sunsetProgress: number;
  daylightDuration: number;
};

type FrameLoopActivityOptions = {
  nowMs?: number;
  timeFrozen: boolean;
  tabHidden?: boolean;
  keys: Iterable<string>;
  isJumping: boolean;
  compassVelocity: number;
  headingVisualAngle: number | null;
  headingTargetAngle: number | null;
  headBobOffset?: number;
  headBobIntensity?: number;
  previewInteracting?: boolean;
  compassDragging?: boolean;
  hmrNoticeVisibleUntilMs?: number | null;
  displayedCycle: FrameLoopCycleProgress;
  actualCycle: FrameLoopCycleProgress;
};

type FrameLoopActivity = {
  tabHidden: boolean;
  hasMovementInput: boolean;
  isJumping: boolean;
  isTimeRunning: boolean;
  isCompassSettling: boolean;
  isHeadingSettling: boolean;
  isHeadBobSettling: boolean;
  isDialSettling: boolean;
  previewInteracting: boolean;
  compassDragging: boolean;
  hmrNoticeVisible: boolean;
};

type SimulationStepOptions = {
  timeFrozen: boolean;
  keys: Iterable<string>;
  isJumping: boolean;
};

export function hasActiveMovementInput(keys: Iterable<string>): boolean {
  for (const key of keys) {
    if (ACTIVE_MOVEMENT_KEYS.has(key)) {
      return true;
    }
  }
  return false;
}

export function getWrappedProgressDelta(
  current: number,
  target: number
): number {
  let delta = target - current;
  if (delta > 0.5) delta -= 1;
  if (delta < -0.5) delta += 1;
  return delta;
}

export function isWrappedProgressAnimating(
  current: number,
  target: number,
  threshold = 0.002
): boolean {
  return Math.abs(getWrappedProgressDelta(current, target)) > threshold;
}

export function isAngleAnimating(
  current: number | null,
  target: number | null,
  threshold = 0.01
): boolean {
  if (typeof current !== 'number' || typeof target !== 'number') {
    return false;
  }
  return Math.abs(getCompassDelta(current, target)) > threshold;
}

export function getFrameLoopActivity(
  options: FrameLoopActivityOptions
): FrameLoopActivity {
  const displayedMoonProgress =
    options.displayedCycle.moonMidnightOrbitProgress ?? 0;
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
      options.displayedCycle.daylightDuration -
        options.actualCycle.daylightDuration
    ) > 0.002;

  return {
    tabHidden: options.tabHidden ?? false,
    hasMovementInput: hasActiveMovementInput(options.keys),
    isJumping: options.isJumping,
    isTimeRunning: !options.timeFrozen,
    isCompassSettling: Math.abs(options.compassVelocity) > 0.001,
    isHeadingSettling: isAngleAnimating(
      options.headingVisualAngle,
      options.headingTargetAngle
    ),
    isHeadBobSettling:
      Math.abs(options.headBobOffset ?? 0) > 0.0005 ||
      (options.headBobIntensity ?? 0) > 0.0005,
    isDialSettling: dialSettling,
    previewInteracting: options.previewInteracting ?? false,
    compassDragging: options.compassDragging ?? false,
    hmrNoticeVisible:
      typeof options.hmrNoticeVisibleUntilMs === 'number' &&
      (options.nowMs ?? 0) < options.hmrNoticeVisibleUntilMs,
  };
}

export function shouldAdvanceSimulation(
  options: SimulationStepOptions
): boolean {
  return shouldAdvanceSimulationState(
    options.timeFrozen,
    options.keys,
    options.isJumping
  );
}

export function shouldAdvanceSimulationState(
  timeFrozen: boolean,
  keys: Iterable<string>,
  isJumping: boolean
): boolean {
  return !timeFrozen || isJumping || hasActiveMovementInput(keys);
}

export function shouldContinueFrameLoop(
  activity: ReturnType<typeof getFrameLoopActivity>
) {
  if (activity.tabHidden) {
    return false;
  }
  return (
    activity.hasMovementInput ||
    activity.isJumping ||
    activity.isTimeRunning ||
    activity.isCompassSettling ||
    activity.isHeadingSettling ||
    activity.isHeadBobSettling ||
    activity.isDialSettling ||
    activity.previewInteracting ||
    activity.compassDragging ||
    activity.hmrNoticeVisible
  );
}
