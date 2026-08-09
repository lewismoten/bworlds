import type { SoundEffectController } from './sound-effects.ts';
import {
  createSoundUpdatePayloadBuilder,
  getSoundUpdateInputSignature,
  type SoundUpdatePayloadInput,
} from './sound-update-payload.ts';

type SoundUpdateOptions = Parameters<SoundEffectController['update']>[0];

const DEFAULT_SOUND_UPDATE_INTERVAL_MS = 50;

export function createSoundUpdateGate(
  minimumUpdateIntervalMs = DEFAULT_SOUND_UPDATE_INTERVAL_MS
): (input: SoundUpdatePayloadInput) => SoundUpdateOptions | null {
  const buildPayload = createSoundUpdatePayloadBuilder();
  let lastAmbientSignature = '';
  let lastTrafficSignature = '';
  let lastUpdateAtMs = Number.NEGATIVE_INFINITY;

  return (input) => {
    const nextSignature = getSoundUpdateInputSignature(input);
    const signatureChanged =
      nextSignature.ambient !== lastAmbientSignature ||
      nextSignature.traffic !== lastTrafficSignature;
    if (
      !signatureChanged &&
      input.nowMs - lastUpdateAtMs < minimumUpdateIntervalMs
    ) {
      return null;
    }

    lastAmbientSignature = nextSignature.ambient;
    lastTrafficSignature = nextSignature.traffic;
    lastUpdateAtMs = input.nowMs;
    return buildPayload(input);
  };
}
