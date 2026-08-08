import type {
  MusicUpdateOptions,
  NearbyPoiMusicLike,
} from './procedural-music.ts';

type MusicUpdatePayloadInput = {
  nowMs: number;
  tileKind?: MusicUpdateOptions['tileKind'];
  contextType?: MusicUpdateOptions['contextType'];
  weatherKind?: MusicUpdateOptions['weatherKind'];
  weatherIntensity?: MusicUpdateOptions['weatherIntensity'];
  dayProgress: number;
  clusterX: number;
  clusterY: number;
  emitterX: number;
  emitterY: number;
  listenerX: number;
  listenerY: number;
  nearbyPoi: (Omit<NearbyPoiMusicLike, 'listener'> & {
    emitter?: { x: number; y: number };
  }) | null;
};

export function createMusicUpdatePayloadBuilder(): (
  input: MusicUpdatePayloadInput
) => MusicUpdateOptions {
  const payload: MusicUpdateOptions = {
    nowMs: 0,
    dayProgress: 0,
    clusterX: 0,
    clusterY: 0,
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
    nearbyPoi: null,
  };
  const nearbyPoiPayload: NearbyPoiMusicLike = {
    mix: 0,
    clusterX: 0,
    clusterY: 0,
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
  };

  return (input) => {
    payload.nowMs = input.nowMs;
    payload.tileKind = input.tileKind;
    payload.contextType = input.contextType;
    payload.weatherKind = input.weatherKind;
    payload.weatherIntensity = input.weatherIntensity;
    payload.dayProgress = input.dayProgress;
    payload.clusterX = input.clusterX;
    payload.clusterY = input.clusterY;
    if (payload.emitter) {
      payload.emitter.x = input.emitterX;
      payload.emitter.y = input.emitterY;
    }
    if (payload.listener) {
      payload.listener.x = input.listenerX;
      payload.listener.y = input.listenerY;
    }

    if (!input.nearbyPoi) {
      payload.nearbyPoi = null;
      return payload;
    }

    nearbyPoiPayload.tileKind = input.nearbyPoi.tileKind;
    nearbyPoiPayload.poiType = input.nearbyPoi.poiType;
    nearbyPoiPayload.contextType = input.nearbyPoi.contextType;
    nearbyPoiPayload.mix = input.nearbyPoi.mix;
    nearbyPoiPayload.clusterX = input.nearbyPoi.clusterX;
    nearbyPoiPayload.clusterY = input.nearbyPoi.clusterY;
    if (nearbyPoiPayload.emitter) {
      nearbyPoiPayload.emitter.x = input.nearbyPoi.emitter?.x ?? 0;
      nearbyPoiPayload.emitter.y = input.nearbyPoi.emitter?.y ?? 0;
    }
    if (nearbyPoiPayload.listener) {
      nearbyPoiPayload.listener.x = input.listenerX;
      nearbyPoiPayload.listener.y = input.listenerY;
    }
    payload.nearbyPoi = nearbyPoiPayload;
    return payload;
  };
}
