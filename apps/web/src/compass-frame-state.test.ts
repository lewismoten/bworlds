import { describe, expect, it, vi } from 'vitest';
import { resolveCompassFrameState } from './compass-frame-state.ts';

describe('compass frame state', () => {
  it('does not resolve compass angles when no compass canvas is visible', () => {
    const resolveFacingAngle = vi.fn(() => 1);
    const resolveHeadingAngle = vi.fn(() => 2);

    expect(
      resolveCompassFrameState({
        miniVisible: false,
        fullVisible: false,
        resolveFacingAngle,
        resolveHeadingAngle,
      })
    ).toBeNull();
    expect(resolveFacingAngle).not.toHaveBeenCalled();
    expect(resolveHeadingAngle).not.toHaveBeenCalled();
  });

  it('resolves the displayed compass angles only once when either compass is visible', () => {
    const resolveFacingAngle = vi.fn(() => 1.25);
    const resolveHeadingAngle = vi.fn(() => -0.4);

    expect(
      resolveCompassFrameState({
        miniVisible: true,
        fullVisible: true,
        resolveFacingAngle,
        resolveHeadingAngle,
      })
    ).toEqual({
      displayedFacingAngle: 1.25,
      displayedHeadingAngle: -0.4,
    });
    expect(resolveFacingAngle).toHaveBeenCalledTimes(1);
    expect(resolveHeadingAngle).toHaveBeenCalledTimes(1);
  });
});
