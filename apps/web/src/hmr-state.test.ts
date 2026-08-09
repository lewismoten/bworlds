import { describe, expect, it } from 'vitest';

import { loadHmrState, saveHmrState } from './hmr-state.ts';

describe('hmr state', () => {
  it('loads null when a hot slot has not been populated', () => {
    expect(loadHmrState({ data: {} }, 'missing')).toBeNull();
    expect(loadHmrState(null, 'missing')).toBeNull();
  });

  it('round-trips state through the hot data bag', () => {
    const hot = { data: {} as Record<string, unknown> };

    saveHmrState(hot, 'page', {
      scrollY: 120,
      playing: true,
    });

    expect(
      loadHmrState<{ scrollY: number; playing: boolean }>(hot, 'page')
    ).toEqual({
      scrollY: 120,
      playing: true,
    });
  });
});
