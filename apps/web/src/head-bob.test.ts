import { describe, expect, it } from 'vitest';
import {
  advanceHeadBobState,
  DEFAULT_HEAD_BOB_STATE,
  isHeadBobAnimating,
} from './head-bob.ts';

describe('head bob', () => {
  it('builds a subtle walking offset while movement continues', () => {
    let state = DEFAULT_HEAD_BOB_STATE;
    for (let index = 0; index < 8; index += 1) {
      state = advanceHeadBobState(state, {
        deltaMs: 16.67,
        walking: true,
      });
    }

    expect(state.intensity).toBeGreaterThan(0);
    expect(Math.abs(state.offset)).toBeGreaterThan(0);
  });

  it('settles back to rest after walking stops', () => {
    let state = DEFAULT_HEAD_BOB_STATE;
    for (let index = 0; index < 8; index += 1) {
      state = advanceHeadBobState(state, {
        deltaMs: 16.67,
        walking: true,
      });
    }
    for (let index = 0; index < 20; index += 1) {
      state = advanceHeadBobState(state, {
        deltaMs: 16.67,
        walking: false,
      });
    }

    expect(state.intensity).toBe(0);
    expect(state.offset).toBe(0);
    expect(isHeadBobAnimating(state)).toBe(false);
  });
});
