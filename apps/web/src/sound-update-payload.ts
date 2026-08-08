import type { SoundEffectController } from './sound-effects.ts';

type SoundUpdateOptions = Parameters<SoundEffectController['update']>[0];
type NearbyTrainLike = NonNullable<SoundUpdateOptions['nearbyTrain']>;
type NearbyPaddleBoatLike = NonNullable<SoundUpdateOptions['nearbyPaddleBoat']>;

type SoundUpdatePayloadInput = {
  nowMs: number;
  walking: boolean;
  isJumping: boolean;
  viewMode: SoundUpdateOptions['viewMode'];
  tileKind?: SoundUpdateOptions['tileKind'];
  weatherKind?: SoundUpdateOptions['weatherKind'];
  weatherIntensity?: SoundUpdateOptions['weatherIntensity'];
  windStrength?: SoundUpdateOptions['windStrength'];
  emitterX: number;
  emitterY: number;
  listenerX: number;
  listenerY: number;
  nearbyTrain: (Omit<NearbyTrainLike, 'listener'> & {
    emitter?: { x: number; y: number };
  }) | null;
  nearbyPaddleBoat: (Omit<NearbyPaddleBoatLike, 'listener'> & {
    emitter?: { x: number; y: number };
  }) | null;
};

export function createSoundUpdatePayloadBuilder(): (
  input: SoundUpdatePayloadInput
) => SoundUpdateOptions {
  const payload: SoundUpdateOptions = {
    nowMs: 0,
    walking: false,
    isJumping: false,
    viewMode: '2d',
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
    nearbyTrain: null,
    nearbyPaddleBoat: null,
  };
  const nearbyTrainPayload: NearbyTrainLike = {
    progress: undefined,
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
  };
  const nearbyPaddleBoatPayload: NearbyPaddleBoatLike = {
    progress: undefined,
    whistlePhase: undefined,
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
  };

  return (input) => {
    payload.nowMs = input.nowMs;
    payload.walking = input.walking;
    payload.isJumping = input.isJumping;
    payload.viewMode = input.viewMode;
    payload.tileKind = input.tileKind;
    payload.weatherKind = input.weatherKind;
    payload.weatherIntensity = input.weatherIntensity;
    payload.windStrength = input.windStrength;
    if (payload.emitter) {
      payload.emitter.x = input.emitterX;
      payload.emitter.y = input.emitterY;
    }
    if (payload.listener) {
      payload.listener.x = input.listenerX;
      payload.listener.y = input.listenerY;
    }

    if (input.nearbyTrain) {
      nearbyTrainPayload.progress = input.nearbyTrain.progress;
      if (nearbyTrainPayload.emitter) {
        nearbyTrainPayload.emitter.x = input.nearbyTrain.emitter?.x ?? 0;
        nearbyTrainPayload.emitter.y = input.nearbyTrain.emitter?.y ?? 0;
      }
      if (nearbyTrainPayload.listener) {
        nearbyTrainPayload.listener.x = input.listenerX;
        nearbyTrainPayload.listener.y = input.listenerY;
      }
      payload.nearbyTrain = nearbyTrainPayload;
    } else {
      payload.nearbyTrain = null;
    }

    if (input.nearbyPaddleBoat) {
      nearbyPaddleBoatPayload.progress = input.nearbyPaddleBoat.progress;
      nearbyPaddleBoatPayload.whistlePhase = input.nearbyPaddleBoat.whistlePhase;
      if (nearbyPaddleBoatPayload.emitter) {
        nearbyPaddleBoatPayload.emitter.x =
          input.nearbyPaddleBoat.emitter?.x ?? 0;
        nearbyPaddleBoatPayload.emitter.y =
          input.nearbyPaddleBoat.emitter?.y ?? 0;
      }
      if (nearbyPaddleBoatPayload.listener) {
        nearbyPaddleBoatPayload.listener.x = input.listenerX;
        nearbyPaddleBoatPayload.listener.y = input.listenerY;
      }
      payload.nearbyPaddleBoat = nearbyPaddleBoatPayload;
    } else {
      payload.nearbyPaddleBoat = null;
    }

    return payload;
  };
}
