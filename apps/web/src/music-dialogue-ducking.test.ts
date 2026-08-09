import { describe, expect, it } from 'vitest';

import { resolveDialogueMusicDuckingIntensity } from './music-dialogue-ducking.ts';

describe('music dialogue ducking', () => {
  it('treats npc talk prompts as active dialogue ducking moments', () => {
    expect(
      resolveDialogueMusicDuckingIntensity('Press Enter to talk to Lyra')
    ).toBe(1);
  });

  it('ignores non-dialogue interaction prompts', () => {
    expect(
      resolveDialogueMusicDuckingIntensity('Press Enter to enter Oakcross')
    ).toBe(0);
    expect(resolveDialogueMusicDuckingIntensity('')).toBe(0);
  });
});
