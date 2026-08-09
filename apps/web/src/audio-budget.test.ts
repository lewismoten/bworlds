import { describe, expect, it } from 'vitest';

import {
  MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS,
  MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES,
} from './audio-budget.ts';

describe('audio budget', () => {
  it('defines stable procedural audio caps for sounds and music', () => {
    expect(MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES).toBe(10);
    expect(MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS).toBe(24);
    expect(MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS).toBeGreaterThan(
      MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES
    );
  });
});
