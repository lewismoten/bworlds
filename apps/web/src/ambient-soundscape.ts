import type {
  NearbyAmbientKind,
  NearbyAmbientProfile,
} from './nearby-ambient.ts';
import type { SoundPosition } from './procedural-sound-effect-generator.ts';
import {
  resolveAmbientDayPhase,
  resolveAmbientSeason,
  type AmbientDayPhase,
  type AmbientSeason,
} from './ambient-cycle.ts';
import {
  resolveAmbientIdentityVariantModifiers,
  resolveAmbientIdentityVariants,
} from './ambient-presets.ts';
import { resolveAmbientAltitudeInfluence } from './ambient-altitude-influence.ts';
import { resolveAmbientNearbyTerrainInfluence } from './ambient-terrain-influence.ts';

export type AmbientPlaybackLayer = {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: SoundPosition;
  listener?: SoundPosition;
  altitude?: number;
  identityVariant?: string;
  cadenceMultiplier: number;
  volumeMultiplier: number;
  signature: string;
};

export function resolveAmbientPlaybackLayers(options: {
  profile: NearbyAmbientProfile | null;
  listener?: SoundPosition;
  nowMs: number;
  dayProgress?: number;
  yearProgress?: number;
}): AmbientPlaybackLayer[] {
  const profile = options.profile;
  if (!profile) {
    return [];
  }
  const dayPhase = resolveAmbientDayPhase(options.dayProgress);
  const season = resolveAmbientSeason(options.yearProgress);
  const primary = createAmbientPlaybackLayer({
    kind: profile.kind,
    intensity: profile.intensity,
    emitter: profile.emitter,
    altitude: profile.altitude,
    listener: options.listener,
    layerIndex: 0,
    nowMs: options.nowMs,
    cadenceMultiplier: 1,
    volumeMultiplier: 1,
    nearbyKinds: (profile.blendedLayers ?? []).map((layer) => layer.kind),
    dayPhase,
    season,
  });
  const blendedKinds = (profile.blendedLayers ?? []).map((layer) => layer.kind);
  const blendedLayers = (profile.blendedLayers ?? []).map((layer, index) => {
    const nearbyKinds = [
      profile.kind,
      ...blendedKinds.filter(
        (candidateKind, candidateIndex) => candidateIndex !== index
      ),
    ];
    return createAmbientPlaybackLayer({
      kind: layer.kind,
      intensity: layer.intensity,
      emitter: layer.emitter,
      altitude: layer.altitude,
      listener: options.listener,
      layerIndex: index + 1,
      nowMs: options.nowMs,
      cadenceMultiplier: 1.18 + index * 0.08,
      volumeMultiplier: 0.62 - index * 0.08,
      nearbyKinds,
      dayPhase,
      season,
    });
  });
  return [primary, ...blendedLayers];
}

function createAmbientPlaybackLayer(options: {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: SoundPosition;
  altitude?: number;
  listener?: SoundPosition;
  layerIndex: number;
  nowMs: number;
  cadenceMultiplier: number;
  volumeMultiplier: number;
  nearbyKinds: readonly NearbyAmbientKind[];
  dayPhase: AmbientDayPhase;
  season: AmbientSeason;
}): AmbientPlaybackLayer {
  const identityVariant = resolveAmbientIdentityVariant(
    options.kind,
    options.emitter,
    options.layerIndex,
    options.nowMs,
    options.dayPhase,
    options.season
  );
  const layerModifiers = resolveAmbientLayerModifiers({
    kind: options.kind,
    dayPhase: options.dayPhase,
    season: options.season,
    identityVariant,
  });
  const terrainInfluence = resolveAmbientNearbyTerrainInfluence({
    kind: options.kind,
    nearbyKinds: options.nearbyKinds,
  });
  const altitudeInfluence = resolveAmbientAltitudeInfluence({
    kind: options.kind,
    altitude: options.altitude,
  });
  const emitterX = Math.round(options.emitter.x);
  const emitterY = Math.round(options.emitter.y);
  return {
    kind: options.kind,
    intensity: options.intensity,
    emitter: options.emitter,
    altitude: options.altitude,
    listener: options.listener,
    identityVariant,
    cadenceMultiplier:
      options.cadenceMultiplier *
      layerModifiers.cadenceMultiplier *
      terrainInfluence.cadenceMultiplier *
      altitudeInfluence.cadenceMultiplier,
    volumeMultiplier: Math.max(
      0.3,
      options.volumeMultiplier *
        layerModifiers.volumeMultiplier *
        terrainInfluence.volumeMultiplier *
        altitudeInfluence.volumeMultiplier
    ),
    signature: [
      options.kind,
      emitterX,
      emitterY,
      identityVariant ?? '',
      options.dayPhase,
      options.season,
      Math.round(options.intensity * 100),
      terrainInfluence.signatureSuffix,
      altitudeInfluence.signatureSuffix,
    ].join(':'),
  };
}

function resolveAmbientIdentityVariant(
  kind: NearbyAmbientKind,
  emitter: SoundPosition,
  layerIndex: number,
  nowMs: number,
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): string | undefined {
  const variants = resolveAmbientIdentityVariants(kind, dayPhase, season);
  if (variants.length === 0) {
    return undefined;
  }
  const cadencePhase = Math.floor(nowMs / 2200);
  const hash =
    Math.abs(
      Math.round(emitter.x) * 31 +
        Math.round(emitter.y) * 17 +
        layerIndex * 13 +
        cadencePhase
    ) % variants.length;
  return variants[hash];
}

function resolveAmbientLayerModifiers(options: {
  kind: NearbyAmbientKind;
  dayPhase: AmbientDayPhase;
  season: AmbientSeason;
  identityVariant?: string;
}): {
  cadenceMultiplier: number;
  volumeMultiplier: number;
} {
  return resolveAmbientIdentityVariantModifiers(options);
}
