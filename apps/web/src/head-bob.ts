export type HeadBobState = {
  phase: number;
  intensity: number;
  offset: number;
};

export const DEFAULT_HEAD_BOB_STATE: HeadBobState = {
  phase: 0,
  intensity: 0,
  offset: 0,
};

const HEAD_BOB_FREQUENCY = 0.021;
const HEAD_BOB_AMPLITUDE = 0.022;
const HEAD_BOB_RAMP_UP = 0.012;
const HEAD_BOB_RAMP_DOWN = 0.009;

export function advanceHeadBobState(
  state: HeadBobState,
  {
    deltaMs,
    walking,
    enabled = true,
  }: {
    deltaMs: number;
    walking: boolean;
    enabled?: boolean;
  }
): HeadBobState {
  if (!enabled) {
    return DEFAULT_HEAD_BOB_STATE;
  }

  const nextIntensity = walking
    ? Math.min(1, state.intensity + deltaMs * HEAD_BOB_RAMP_UP)
    : Math.max(0, state.intensity - deltaMs * HEAD_BOB_RAMP_DOWN);
  const nextPhase = walking
    ? state.phase + deltaMs * HEAD_BOB_FREQUENCY
    : state.phase;
  const nextOffset =
    nextIntensity <= 0.0001
      ? 0
      : Math.sin(nextPhase) * HEAD_BOB_AMPLITUDE * nextIntensity;

  return {
    phase: nextPhase,
    intensity: nextIntensity,
    offset: nextOffset,
  };
}

export function isHeadBobAnimating(
  state: Pick<HeadBobState, 'intensity' | 'offset'>
): boolean {
  return Math.abs(state.offset) > 0.0005 || state.intensity > 0.0005;
}
