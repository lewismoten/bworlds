import { describe, expect, it, vi } from 'vitest';

describe('vitest test setup', () => {
  let leakedTimeoutFired = false;
  let leakedIntervalCount = 0;

  it('intentionally leaves fake timers and mocks active inside one test', () => {
    vi.useFakeTimers();
    vi.spyOn(Date, 'now').mockReturnValue(123);

    expect(Date.now()).toBe(123);
  });

  it('intentionally leaves real timers active inside one test', () => {
    setTimeout(() => {
      leakedTimeoutFired = true;
    }, 0);
    setInterval(() => {
      leakedIntervalCount += 1;
    }, 0);
  });

  it('restores fake timers and mocks before the next test starts', async () => {
    expect(Date.now()).not.toBe(123);

    let fired = false;
    await awaitRealTimer(() => {
      fired = true;
    });

    expect(fired).toBe(true);
  });

  it('clears leaked real timers before the next test starts', async () => {
    await awaitRealTimer(() => {});

    expect(leakedTimeoutFired).toBe(false);
    expect(leakedIntervalCount).toBe(0);
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
