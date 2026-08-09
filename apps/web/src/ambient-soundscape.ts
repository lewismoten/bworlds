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

export type AmbientPlaybackLayer = {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: SoundPosition;
  listener?: SoundPosition;
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
    listener: options.listener,
    layerIndex: 0,
    nowMs: options.nowMs,
    cadenceMultiplier: 1,
    volumeMultiplier: 1,
    dayPhase,
    season,
  });
  const blendedLayers = (profile.blendedLayers ?? []).map((layer, index) =>
    createAmbientPlaybackLayer({
      kind: layer.kind,
      intensity: layer.intensity,
      emitter: layer.emitter,
      listener: options.listener,
      layerIndex: index + 1,
      nowMs: options.nowMs,
      cadenceMultiplier: 1.18 + index * 0.08,
      volumeMultiplier: 0.62 - index * 0.08,
      dayPhase,
      season,
    })
  );
  return [primary, ...blendedLayers];
}

function createAmbientPlaybackLayer(options: {
  kind: NearbyAmbientKind;
  intensity: number;
  emitter: SoundPosition;
  listener?: SoundPosition;
  layerIndex: number;
  nowMs: number;
  cadenceMultiplier: number;
  volumeMultiplier: number;
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
  const emitterX = Math.round(options.emitter.x);
  const emitterY = Math.round(options.emitter.y);
  return {
    kind: options.kind,
    intensity: options.intensity,
    emitter: options.emitter,
    listener: options.listener,
    identityVariant,
    cadenceMultiplier:
      options.cadenceMultiplier * layerModifiers.cadenceMultiplier,
    volumeMultiplier: Math.max(
      0.3,
      options.volumeMultiplier * layerModifiers.volumeMultiplier
    ),
    signature: [
      options.kind,
      emitterX,
      emitterY,
      identityVariant ?? '',
      options.dayPhase,
      options.season,
      Math.round(options.intensity * 100),
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
