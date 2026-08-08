import { describe, expect, it, vi } from 'vitest';
import {
  createSoundEffectController,
  getSurfaceAudioProfile,
  shouldPlayBlockedMovementSound,
  type ProceduralSoundEffect,
} from './sound-effects.ts';

describe('sound effects', () => {
  it('schedules footsteps on a cadence while walking in 3d', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });
    controller.update({
      nowMs: 100,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });
    controller.update({
      nowMs: 280,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });

    expect(played.map((effect) => effect.kind)).toEqual([
      'footstep',
      'footstep',
    ]);
    expect(played[0]?.waveform).toBe('square');
  });

  it('plays jump and landing sounds once around a jump arc', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerJump({ nowMs: 10, tileKind: 'cave-floor' });
    controller.update({
      nowMs: 15,
      walking: false,
      isJumping: true,
      viewMode: '3d',
      tileKind: 'cave-floor',
    });
    controller.update({
      nowMs: 240,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'cave-floor',
    });

    expect(played.map((effect) => effect.kind)).toEqual(['jump', 'landing']);
    expect(played[0]?.frequency).toBeGreaterThan(played[1]?.frequency ?? 0);
  });

  it('does not emit movement sounds outside 3d mode', () => {
    const play = vi.fn();
    const controller = createSoundEffectController({ play });

    controller.update({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '2d',
      tileKind: 'bridge',
    });

    expect(play).not.toHaveBeenCalled();
  });

  it('plays a debounced blocked-movement cue when walking into forest trees', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerBlockedMovement({ nowMs: 100, tileKind: 'forest' });
    controller.triggerBlockedMovement({ nowMs: 180, tileKind: 'forest' });
    controller.triggerBlockedMovement({ nowMs: 320, tileKind: 'forest' });

    expect(played.map((effect) => effect.kind)).toEqual([
      'blocked',
      'blocked',
    ]);
    expect(played[0]?.waveform).toBe('sawtooth');
  });

  it('provides cave and bridge audio profiles for later surface-specific effects', () => {
    expect(getSurfaceAudioProfile('cave-floor')).toEqual(
      expect.objectContaining({
        cadenceMs: 330,
        waveform: 'triangle',
      })
    );
    expect(getSurfaceAudioProfile('bridge')).toEqual(
      expect.objectContaining({
        cadenceMs: 290,
        waveform: 'square',
      })
    );
  });

  it('limits blocked-movement tree impacts to forest collisions for now', () => {
    expect(shouldPlayBlockedMovementSound('forest')).toBe(true);
    expect(shouldPlayBlockedMovementSound('road')).toBe(false);
    expect(shouldPlayBlockedMovementSound(undefined)).toBe(false);
  });
});
