type AnimationFrameStepOptions<T> = {
  timestamp: number;
  lastFrameTimestamp: number;
  pageHidden: boolean;
  requestNextFrame: () => void;
  runFrame: (deltaMs: number) => T;
};

type AnimationFrameStepResult<T> = {
  lastFrameTimestamp: number;
  skipped: boolean;
  frameResult?: T;
};

type AnimationFrameRunner<T> = (
  timestamp: number,
  lastFrameTimestamp: number,
  pageHidden: boolean
) => AnimationFrameStepResult<T>;

export function getAnimationFrameDelta(
  timestamp: number,
  lastFrameTimestamp: number
): number {
  if (lastFrameTimestamp === 0) {
    return 16.67;
  }
  return Math.min(timestamp - lastFrameTimestamp, 33.34);
}

export function runAnimationFrameStep<T>(
  options: AnimationFrameStepOptions<T>
): AnimationFrameStepResult<T> {
  if (options.pageHidden) {
    return {
      lastFrameTimestamp: 0,
      skipped: true,
    };
  }

  // Queue the next visible frame before running work so early returns or
  // budget-limited generation never stall the RAF chain.
  options.requestNextFrame();

  return {
    lastFrameTimestamp: options.timestamp,
    skipped: false,
    frameResult: options.runFrame(
      getAnimationFrameDelta(options.timestamp, options.lastFrameTimestamp)
    ),
  };
}

export function createAnimationFrameRunner<T>(
  requestNextFrame: () => void,
  runFrame: (deltaMs: number) => T
): AnimationFrameRunner<T> {
  return (timestamp, lastFrameTimestamp, pageHidden) =>
    runAnimationFrameStep({
      timestamp,
      lastFrameTimestamp,
      pageHidden,
      requestNextFrame,
      runFrame,
    });
}
