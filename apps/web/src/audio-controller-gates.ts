import type { MusicController } from './procedural-music.ts';
import type { SoundEffectController } from './sound-effects.ts';

type EnabledResolver = () => boolean;

export function createEnabledSoundEffectController(
  controller: SoundEffectController,
  isEnabled: EnabledResolver
): SoundEffectController {
  return {
    resume() {
      if (!isEnabled()) {
        return;
      }
      controller.resume();
    },
    stopAll() {
      controller.stopAll();
    },
    getActiveSourceCount() {
      return controller.getActiveSourceCount();
    },
    getRecentCombatIntensity(nowMs) {
      return controller.getRecentCombatIntensity(nowMs);
    },
    getRecentPrioritySoundIntensity(nowMs) {
      return controller.getRecentPrioritySoundIntensity(nowMs);
    },
    triggerProgression(options) {
      if (!isEnabled()) {
        return;
      }
      controller.triggerProgression(options);
    },
    triggerInteraction(options) {
      if (!isEnabled()) {
        return;
      }
      controller.triggerInteraction(options);
    },
    triggerJump(options) {
      if (!isEnabled()) {
        return;
      }
      controller.triggerJump(options);
    },
    triggerBlockedMovement(options) {
      if (!isEnabled()) {
        return;
      }
      controller.triggerBlockedMovement(options);
    },
    triggerCombat(options) {
      if (!isEnabled()) {
        return;
      }
      controller.triggerCombat(options);
    },
    update(options) {
      if (!isEnabled()) {
        return;
      }
      controller.update(options);
    },
  };
}

export function createEnabledMusicController(
  controller: MusicController,
  isEnabled: EnabledResolver
): MusicController {
  return {
    resume() {
      if (!isEnabled()) {
        return;
      }
      controller.resume();
    },
    stopAll() {
      controller.stopAll();
    },
    getActiveSourceCount() {
      return controller.getActiveSourceCount();
    },
    update(options) {
      if (!isEnabled()) {
        return;
      }
      controller.update(options);
    },
  };
}
