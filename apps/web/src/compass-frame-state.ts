export type CompassFrameState = {
  displayedFacingAngle: number;
  displayedHeadingAngle: number;
};

export function resolveCompassFrameState(options: {
  miniVisible: boolean;
  fullVisible: boolean;
  resolveFacingAngle: () => number;
  resolveHeadingAngle: () => number;
}): CompassFrameState | null {
  if (!options.miniVisible && !options.fullVisible) {
    return null;
  }

  return {
    displayedFacingAngle: options.resolveFacingAngle(),
    displayedHeadingAngle: options.resolveHeadingAngle(),
  };
}
