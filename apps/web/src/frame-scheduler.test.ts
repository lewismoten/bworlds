import { describe, expect, it, vi } from 'vitest';
import {
  createAnimationFrameRunner,
  getAnimationFrameDelta,
  runAnimationFrameStep,
} from './frame-scheduler.ts';

describe('frame scheduler', () => {
  it('uses a small bootstrap delta for the first visible frame', () => {
    expect(getAnimationFrameDelta(120, 0)).toBe(16.67);
  });

  it('clamps long frame gaps to the budgeted maximum', () => {
    expect(getAnimationFrameDelta(250, 200)).toBe(33.34);
    expect(getAnimationFrameDelta(215, 200)).toBe(15);
  });

  it('queues the next frame before running visible frame work', () => {
    const callOrder: string[] = [];

    const result = runAnimationFrameStep({
      timestamp: 100,
      lastFrameTimestamp: 80,
      pageHidden: false,
      requestNextFrame: () => {
        callOrder.push('schedule');
      },
      runFrame: (deltaMs) => {
        callOrder.push(`run:${deltaMs}`);
        return 'rendered';
      },
    });

    expect(callOrder).toEqual(['schedule', 'run:20']);
    expect(result).toEqual({
      lastFrameTimestamp: 100,
      skipped: false,
      frameResult: 'rendered',
    });
  });

  it('still queues the next frame when the current frame returns early', () => {
    const requestNextFrame = vi.fn();
    const runFrame = vi.fn(() => undefined);

    const result = runAnimationFrameStep({
      timestamp: 100,
      lastFrameTimestamp: 90,
      pageHidden: false,
      requestNextFrame,
      runFrame,
    });

    expect(requestNextFrame).toHaveBeenCalledTimes(1);
    expect(runFrame).toHaveBeenCalledWith(10);
    expect(result.skipped).toBe(false);
  });

  it('does not schedule or run frames while the page is hidden', () => {
    const requestNextFrame = vi.fn();
    const runFrame = vi.fn();

    const result = runAnimationFrameStep({
      timestamp: 100,
      lastFrameTimestamp: 90,
      pageHidden: true,
      requestNextFrame,
      runFrame,
    });

    expect(requestNextFrame).not.toHaveBeenCalled();
    expect(runFrame).not.toHaveBeenCalled();
    expect(result).toEqual({
      lastFrameTimestamp: 0,
      skipped: true,
    });
  });

  it('queues the next frame before propagating frame errors', () => {
    const requestNextFrame = vi.fn();

    expect(() =>
      runAnimationFrameStep({
        timestamp: 100,
        lastFrameTimestamp: 90,
        pageHidden: false,
        requestNextFrame,
        runFrame: () => {
          throw new Error('boom');
        },
      })
    ).toThrow('boom');

    expect(requestNextFrame).toHaveBeenCalledTimes(1);
  });

  it('can reuse a stable frame runner across animation frames', () => {
    const requestNextFrame = vi.fn();
    const runFrame = vi.fn((deltaMs: number) => `frame:${deltaMs}`);
    const runScheduledFrame = createAnimationFrameRunner(requestNextFrame, runFrame);

    expect(runScheduledFrame(100, 80, false)).toEqual({
      lastFrameTimestamp: 100,
      skipped: false,
      frameResult: 'frame:20',
    });
    expect(runScheduledFrame(140, 100, true)).toEqual({
      lastFrameTimestamp: 0,
      skipped: true,
    });

    expect(requestNextFrame).toHaveBeenCalledTimes(1);
    expect(runFrame).toHaveBeenCalledTimes(1);
    expect(runFrame).toHaveBeenCalledWith(20);
  });
});
