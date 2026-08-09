import type { SoundEffectController } from './sound-effects.ts';
import {
  resolveAmbientDayPhase,
  resolveAmbientSeason,
} from './ambient-cycle.ts';

type SoundUpdateOptions = Parameters<SoundEffectController['update']>[0];
type NearbyTrainLike = NonNullable<SoundUpdateOptions['nearbyTrain']>;
type NearbyPaddleBoatLike = NonNullable<SoundUpdateOptions['nearbyPaddleBoat']>;
type NearbyAmbientLike = NonNullable<SoundUpdateOptions['nearbyAmbient']>;

type SoundUpdateSignatureState = {
  ambient: string;
  traffic: string;
};

export type SoundUpdatePayloadInput = {
  nowMs: number;
  walking: boolean;
  isJumping: boolean;
  viewMode: SoundUpdateOptions['viewMode'];
  ambianceEnabled?: SoundUpdateOptions['ambianceEnabled'];
  tileKind?: SoundUpdateOptions['tileKind'];
  dayProgress?: number;
  yearProgress?: number;
  weatherKind?: SoundUpdateOptions['weatherKind'];
  weatherIntensity?: SoundUpdateOptions['weatherIntensity'];
  windStrength?: SoundUpdateOptions['windStrength'];
  emitterX: number;
  emitterY: number;
  listenerX: number;
  listenerY: number;
  nearbyTrain:
    | (Omit<NearbyTrainLike, 'listener'> & {
        emitter?: { x: number; y: number };
      })
    | null;
  nearbyPaddleBoat:
    | (Omit<NearbyPaddleBoatLike, 'listener'> & {
        emitter?: { x: number; y: number };
      })
    | null;
  nearbyAmbient:
    | (Omit<NearbyAmbientLike, 'listener'> & {
        emitter?: { x: number; y: number };
      })
    | null;
};

export function createSoundUpdatePayloadBuilder(): (
  input: SoundUpdatePayloadInput
) => SoundUpdateOptions {
  const payload: SoundUpdateOptions = {
    nowMs: 0,
    walking: false,
    isJumping: false,
    viewMode: '2d',
    ambianceEnabled: true,
    dayProgress: 0.5,
    yearProgress: 0.5,
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
    nearbyTrain: null,
    nearbyPaddleBoat: null,
    nearbyAmbient: null,
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
  const nearbyAmbientPayload: NearbyAmbientLike = {
    kind: 'ocean',
    intensity: undefined,
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
    altitude: undefined,
    blendedLayers: undefined,
  };
  const nearbyAmbientBlendPayload: NonNullable<
    NearbyAmbientLike['blendedLayers']
  > = [];

  return (input) => {
    payload.nowMs = input.nowMs;
    payload.walking = input.walking;
    payload.isJumping = input.isJumping;
    payload.viewMode = input.viewMode;
    payload.ambianceEnabled = input.ambianceEnabled ?? true;
    payload.tileKind = input.tileKind;
    payload.dayProgress = input.dayProgress ?? 0.5;
    payload.yearProgress = input.yearProgress ?? 0.5;
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
      nearbyPaddleBoatPayload.whistlePhase =
        input.nearbyPaddleBoat.whistlePhase;
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

    if (input.nearbyAmbient) {
      nearbyAmbientPayload.kind = input.nearbyAmbient.kind;
      nearbyAmbientPayload.intensity = input.nearbyAmbient.intensity;
      nearbyAmbientPayload.altitude = input.nearbyAmbient.altitude;
      if (nearbyAmbientPayload.emitter) {
        nearbyAmbientPayload.emitter.x = input.nearbyAmbient.emitter?.x ?? 0;
        nearbyAmbientPayload.emitter.y = input.nearbyAmbient.emitter?.y ?? 0;
      }
      if (nearbyAmbientPayload.listener) {
        nearbyAmbientPayload.listener.x = input.listenerX;
        nearbyAmbientPayload.listener.y = input.listenerY;
      }
      nearbyAmbientBlendPayload.length = 0;
      for (
        let index = 0;
        index < (input.nearbyAmbient.blendedLayers?.length ?? 0);
        index += 1
      ) {
        const layer = input.nearbyAmbient.blendedLayers?.[index];
        if (!layer) {
          continue;
        }
        nearbyAmbientBlendPayload.push({
          kind: layer.kind,
          intensity: layer.intensity,
          altitude: layer.altitude,
          emitter: {
            x: layer.emitter.x,
            y: layer.emitter.y,
          },
        });
      }
      nearbyAmbientPayload.blendedLayers =
        nearbyAmbientBlendPayload.length > 0
          ? nearbyAmbientBlendPayload
          : undefined;
      payload.nearbyAmbient = nearbyAmbientPayload;
    } else {
      payload.nearbyAmbient = null;
    }

    return payload;
  };
}

export function getSoundUpdateInputSignature(
  input: Pick<
    SoundUpdatePayloadInput,
    | 'walking'
    | 'isJumping'
    | 'viewMode'
    | 'ambianceEnabled'
    | 'tileKind'
    | 'dayProgress'
    | 'yearProgress'
    | 'weatherKind'
    | 'weatherIntensity'
    | 'windStrength'
    | 'nearbyTrain'
    | 'nearbyPaddleBoat'
    | 'nearbyAmbient'
  >
): SoundUpdateSignatureState {
  return {
    ambient: [
      input.walking ? 1 : 0,
      input.isJumping ? 1 : 0,
      input.viewMode,
      input.ambianceEnabled === false ? 0 : 1,
      input.tileKind ?? '',
      resolveAmbientDayPhase(input.dayProgress),
      resolveAmbientSeason(input.yearProgress),
      input.weatherKind ?? '',
      Math.round((input.weatherIntensity ?? 0) * 10),
      Math.round((input.windStrength ?? 0) * 10),
    ].join('|'),
    traffic: [
      input.nearbyTrain
        ? Math.round((input.nearbyTrain.progress ?? 0) * 100)
        : '',
      input.nearbyPaddleBoat
        ? Math.round((input.nearbyPaddleBoat.progress ?? 0) * 100)
        : '',
      input.nearbyPaddleBoat?.whistlePhase ?? '',
      input.nearbyAmbient
        ? [
            `${input.nearbyAmbient.kind}:${Math.round((input.nearbyAmbient.intensity ?? 0) * 100)}:${Math.round(input.nearbyAmbient.emitter?.x ?? 0)}:${Math.round(input.nearbyAmbient.emitter?.y ?? 0)}:h:${Math.round((input.nearbyAmbient.altitude ?? 0) * 100)}`,
            ...(input.nearbyAmbient.blendedLayers ?? []).map(
              (layer) =>
                `${layer.kind}:${Math.round((layer.intensity ?? 0) * 100)}:${Math.round(layer.emitter?.x ?? 0)}:${Math.round(layer.emitter?.y ?? 0)}:h:${Math.round((layer.altitude ?? 0) * 100)}`
            ),
          ].join(',')
        : '',
    ].join('|'),
  };
}
