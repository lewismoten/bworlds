import { describe, expect, it, vi } from 'vitest';

describe('vitest test setup', () => {
  it('intentionally leaves fake timers and mocks active inside one test', () => {
    vi.useFakeTimers();
    vi.spyOn(Date, 'now').mockReturnValue(123);

    expect(Date.now()).toBe(123);
  });

  it('restores fake timers and mocks before the next test starts', async () => {
    expect(Date.now()).not.toBe(123);

    let fired = false;
    await awaitRealTimer(() => {
      fired = true;
    });

    expect(fired).toBe(true);
  });
});

function awaitRealTimer(callback: () => void): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      callback();
      resolve();
    }, 0);
  });
}
