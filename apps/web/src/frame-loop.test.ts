import { describe, expect, it } from 'vitest';
import {
  getFrameLoopActivity,
  hasActiveMovementInput,
  isAngleAnimating,
  isWrappedProgressAnimating,
  shouldAdvanceSimulation,
  shouldContinueFrameLoop,
} from './frame-loop.ts';

describe('frame loop helpers', () => {
  it('detects movement-oriented keys that should wake the frame loop', () => {
    expect(hasActiveMovementInput(['w'])).toBe(true);
    expect(hasActiveMovementInput(['ArrowLeft'])).toBe(true);
    expect(hasActiveMovementInput(['Shift'])).toBe(false);
  });

  it('detects wrapped progress and angle easing that still need animation frames', () => {
    expect(isWrappedProgressAnimating(0.98, 0.01)).toBe(true);
    expect(isWrappedProgressAnimating(0.1, 0.101)).toBe(false);
    expect(isAngleAnimating(-Math.PI / 2, 0)).toBe(true);
    expect(isAngleAnimating(0, 0.002)).toBe(false);
  });

  it('keeps frames running while time is active or easing is unfinished', () => {
    const running = getFrameLoopActivity({
      nowMs: 1000,
      timeFrozen: false,
      tabHidden: false,
      keys: [],
      isJumping: false,
      compassVelocity: 0,
      headingVisualAngle: null,
      headingTargetAngle: null,
      headBobOffset: 0,
      headBobIntensity: 0,
      displayedCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
      actualCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
    });
    const easing = getFrameLoopActivity({
      nowMs: 1000,
      timeFrozen: true,
      tabHidden: false,
      keys: [],
      isJumping: false,
      compassVelocity: 0.004,
      headingVisualAngle: -Math.PI / 2,
      headingTargetAngle: 0,
      headBobOffset: 0,
      headBobIntensity: 0,
      displayedCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
      actualCycle: {
        dayProgress: 0.18,
        yearProgress: 0.22,
        moonMidnightOrbitProgress: 0.34,
        sunriseProgress: 0.28,
        sunsetProgress: 0.78,
        daylightDuration: 0.53,
      },
    });
    const idle = getFrameLoopActivity({
      nowMs: 1000,
      timeFrozen: true,
      tabHidden: false,
      keys: [],
      isJumping: false,
      compassVelocity: 0,
      headingVisualAngle: null,
      headingTargetAngle: null,
      headBobOffset: 0,
      headBobIntensity: 0,
      displayedCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
      actualCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
    });

    expect(shouldContinueFrameLoop(running)).toBe(true);
    expect(shouldContinueFrameLoop(easing)).toBe(true);
    expect(shouldContinueFrameLoop(idle)).toBe(false);
  });

  it('keeps frames alive while an hmr notice is still visible', () => {
    const notice = getFrameLoopActivity({
      nowMs: 1000,
      timeFrozen: true,
      tabHidden: false,
      keys: [],
      isJumping: false,
      compassVelocity: 0,
      headingVisualAngle: null,
      headingTargetAngle: null,
      headBobOffset: 0,
      headBobIntensity: 0,
      hmrNoticeVisibleUntilMs: 1500,
      displayedCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
      actualCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
    });

    expect(shouldContinueFrameLoop(notice)).toBe(true);
  });

  it('keeps frames alive while head bobbing is settling back to rest', () => {
    const settling = getFrameLoopActivity({
      nowMs: 1000,
      timeFrozen: true,
      tabHidden: false,
      keys: [],
      isJumping: false,
      compassVelocity: 0,
      headingVisualAngle: null,
      headingTargetAngle: null,
      headBobOffset: 0.004,
      headBobIntensity: 0.2,
      displayedCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
      actualCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
    });

    expect(settling.isHeadBobSettling).toBe(true);
    expect(shouldContinueFrameLoop(settling)).toBe(true);
  });

  it('suspends the frame loop while the browser tab is hidden', () => {
    const hidden = getFrameLoopActivity({
      nowMs: 1000,
      timeFrozen: false,
      tabHidden: true,
      keys: ['w'],
      isJumping: true,
      compassVelocity: 0.2,
      headingVisualAngle: 0,
      headingTargetAngle: Math.PI / 2,
      headBobOffset: 0.1,
      headBobIntensity: 0.3,
      displayedCycle: {
        dayProgress: 0.1,
        yearProgress: 0.2,
        moonMidnightOrbitProgress: 0.3,
        sunriseProgress: 0.25,
        sunsetProgress: 0.75,
        daylightDuration: 0.5,
      },
      actualCycle: {
        dayProgress: 0.18,
        yearProgress: 0.22,
        moonMidnightOrbitProgress: 0.34,
        sunriseProgress: 0.28,
        sunsetProgress: 0.78,
        daylightDuration: 0.53,
      },
    });

    expect(hidden.tabHidden).toBe(true);
    expect(hidden.hasMovementInput).toBe(true);
    expect(hidden.isTimeRunning).toBe(true);
    expect(shouldContinueFrameLoop(hidden)).toBe(false);
  });

  it('skips paused simulation work when only render-side easing remains', () => {
    expect(
      shouldAdvanceSimulation({
        timeFrozen: true,
        keys: [],
        isJumping: false,
      })
    ).toBe(false);
  });

  it('keeps paused simulation advancing for movement input or active jumps', () => {
    expect(
      shouldAdvanceSimulation({
        timeFrozen: true,
        keys: ['w'],
        isJumping: false,
      })
    ).toBe(true);
    expect(
      shouldAdvanceSimulation({
        timeFrozen: true,
        keys: [],
        isJumping: true,
      })
    ).toBe(true);
  });

  it('continues simulation normally while time is running', () => {
    expect(
      shouldAdvanceSimulation({
        timeFrozen: false,
        keys: [],
        isJumping: false,
      })
    ).toBe(true);
  });
});
