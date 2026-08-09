import { describe, expect, it, vi } from 'vitest';
import {
  createEnabledMusicController,
  createEnabledSoundEffectController,
} from './audio-controller-gates.ts';
import type { MusicController } from './procedural-music.ts';
import type { SoundEffectController } from './sound-effects.ts';

describe('audio controller gates', () => {
  it('suppresses sound effect triggers and updates while sound is disabled', () => {
    const controller: SoundEffectController = {
      resume: vi.fn(),
      getActiveSourceCount: vi.fn(() => 3),
      getRecentCombatIntensity: vi.fn(() => 0.4),
      getRecentPrioritySoundIntensity: vi.fn(() => 0.6),
      triggerProgression: vi.fn(),
      triggerInteraction: vi.fn(),
      triggerJump: vi.fn(),
      triggerBlockedMovement: vi.fn(),
      triggerCombat: vi.fn(),
      update: vi.fn(),
    };
    let enabled = false;
    const gated = createEnabledSoundEffectController(controller, () => enabled);

    gated.resume();
    gated.triggerJump({ nowMs: 1 });
    gated.update({
      nowMs: 2,
      walking: true,
      isJumping: false,
      viewMode: '3d',
    });

    expect(controller.resume).not.toHaveBeenCalled();
    expect(controller.triggerJump).not.toHaveBeenCalled();
    expect(controller.update).not.toHaveBeenCalled();
    expect(gated.getActiveSourceCount()).toBe(3);
    expect(gated.getRecentCombatIntensity(12)).toBe(0.4);
    expect(gated.getRecentPrioritySoundIntensity(12)).toBe(0.6);

    enabled = true;
    gated.resume();
    gated.triggerJump({ nowMs: 3 });
    gated.update({
      nowMs: 4,
      walking: true,
      isJumping: false,
      viewMode: '3d',
    });

    expect(controller.resume).toHaveBeenCalledTimes(1);
    expect(controller.triggerJump).toHaveBeenCalledTimes(1);
    expect(controller.update).toHaveBeenCalledTimes(1);
  });

  it('suppresses music scheduling while music is disabled', () => {
    const controller: MusicController = {
      resume: vi.fn(),
      getActiveSourceCount: vi.fn(() => 5),
      update: vi.fn(),
    };
    let enabled = false;
    const gated = createEnabledMusicController(controller, () => enabled);

    gated.resume();
    gated.update({
      nowMs: 10,
      dayProgress: 0.5,
    });

    expect(controller.resume).not.toHaveBeenCalled();
    expect(controller.update).not.toHaveBeenCalled();
    expect(gated.getActiveSourceCount()).toBe(5);

    enabled = true;
    gated.resume();
    gated.update({
      nowMs: 20,
      dayProgress: 0.75,
    });

    expect(controller.resume).toHaveBeenCalledTimes(1);
    expect(controller.update).toHaveBeenCalledTimes(1);
  });
});
