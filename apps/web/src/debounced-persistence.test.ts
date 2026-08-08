import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDebouncedPersistence } from './debounced-persistence.ts';

describe('debounced persistence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('coalesces repeated schedules into one delayed callback', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const persistence = createDebouncedPersistence(callback, 150);

    persistence.schedule();
    vi.advanceTimersByTime(100);
    persistence.schedule();
    vi.advanceTimersByTime(149);

    expect(callback).not.toHaveBeenCalled();
    expect(persistence.pending()).toBe(true);

    vi.advanceTimersByTime(1);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(persistence.pending()).toBe(false);
  });

  it('flushes pending work immediately and cancels the timer', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const persistence = createDebouncedPersistence(callback, 150);

    persistence.schedule();
    expect(persistence.pending()).toBe(true);

    persistence.flush();
    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(persistence.pending()).toBe(false);
  });

  it('ignores flush when nothing is pending', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const persistence = createDebouncedPersistence(callback, 150);

    persistence.flush();
    vi.advanceTimersByTime(500);

    expect(callback).not.toHaveBeenCalled();
    expect(persistence.pending()).toBe(false);
  });
});
