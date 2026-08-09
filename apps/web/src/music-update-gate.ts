import type { MusicUpdateOptions } from './procedural-music.ts';
import {
  createMusicUpdatePayloadBuilder,
  getMusicUpdateInputSignature,
  type MusicUpdatePayloadInput,
} from './music-update-payload.ts';

const DEFAULT_MUSIC_UPDATE_INTERVAL_MS = 120;

export function createMusicUpdateGate(
  minimumUpdateIntervalMs = DEFAULT_MUSIC_UPDATE_INTERVAL_MS
): (input: MusicUpdatePayloadInput) => MusicUpdateOptions | null {
  const buildPayload = createMusicUpdatePayloadBuilder();
  let lastAmbientSignature = '';
  let lastPoiSignature = '';
  let lastUpdateAtMs = Number.NEGATIVE_INFINITY;

  return (input) => {
    const nextSignature = getMusicUpdateInputSignature(input);
    const signatureChanged =
      nextSignature.ambient !== lastAmbientSignature ||
      nextSignature.poi !== lastPoiSignature;
    if (
      !signatureChanged &&
      input.nowMs - lastUpdateAtMs < minimumUpdateIntervalMs
    ) {
      return null;
    }

    lastAmbientSignature = nextSignature.ambient;
    lastPoiSignature = nextSignature.poi;
    lastUpdateAtMs = input.nowMs;
    return buildPayload(input);
  };
}
