import { describe, expect, it, vi } from 'vitest';

import { createCycleFrameCache } from './cycle-frame-cache.ts';

describe('cycle frame cache', () => {
  it('reuses the resolved cycle within the same time slice and environment refs', () => {
    const cycleConfig = {};
    const celestialOverrides = {};
    const resolveCycle = vi.fn((input) => ({
      key: `${input.timeMs}`,
    }));
    const resolveCachedCycle = createCycleFrameCache(resolveCycle, 50);

    const first = resolveCachedCycle({
      timeMs: 100,
      cycleConfig,
      celestialOverrides,
    });
    const second = resolveCachedCycle({
      timeMs: 149,
      cycleConfig,
      celestialOverrides,
    });

    expect(second).toBe(first);
    expect(resolveCycle).toHaveBeenCalledTimes(1);
  });

  it('refreshes when the time slice changes', () => {
    const cycleConfig = {};
    const celestialOverrides = {};
    const resolveCycle = vi.fn((input) => ({
      key: `${input.timeMs}`,
    }));
    const resolveCachedCycle = createCycleFrameCache(resolveCycle, 50);

    const first = resolveCachedCycle({
      timeMs: 149,
      cycleConfig,
      celestialOverrides,
    });
    const second = resolveCachedCycle({
      timeMs: 150,
      cycleConfig,
      celestialOverrides,
    });

    expect(second).not.toBe(first);
    expect(resolveCycle).toHaveBeenCalledTimes(2);
  });

  it('refreshes when the cycle config or celestial override ref changes', () => {
    const resolveCycle = vi.fn((input) => ({
      key: `${input.timeMs}`,
    }));
    const resolveCachedCycle = createCycleFrameCache(resolveCycle, 50);
    const cycleConfigA = {};
    const cycleConfigB = {};
    const celestialOverridesA = {};
    const celestialOverridesB = {};

    resolveCachedCycle({
      timeMs: 100,
      cycleConfig: cycleConfigA,
      celestialOverrides: celestialOverridesA,
    });
    resolveCachedCycle({
      timeMs: 120,
      cycleConfig: cycleConfigB,
      celestialOverrides: celestialOverridesA,
    });
    resolveCachedCycle({
      timeMs: 140,
      cycleConfig: cycleConfigB,
      celestialOverrides: celestialOverridesB,
    });

    expect(resolveCycle).toHaveBeenCalledTimes(3);
  });
});
