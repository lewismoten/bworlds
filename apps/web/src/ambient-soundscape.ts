import type {
  NearbyAmbientKind,
  NearbyAmbientLayer,
  NearbyAmbientProfile,
} from './nearby-ambient.ts';
import type { SoundPosition } from './procedural-sound-effect-generator.ts';

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

const AMBIENT_IDENTITY_VARIANTS: Record<NearbyAmbientKind, readonly string[]> =
  {
    ocean: ['surf', 'shoreline', 'seabirds', 'gusts'],
    river: [],
    forest: ['canopy', 'insects', 'branches', 'wildlife'],
    plains: [],
    mountain: [],
    cave: [],
    settlement: [],
    ruins: [],
  };

export function resolveAmbientPlaybackLayers(options: {
  profile: NearbyAmbientProfile | null;
  listener?: SoundPosition;
  nowMs: number;
}): AmbientPlaybackLayer[] {
  const profile = options.profile;
  if (!profile) {
    return [];
  }
  const primary = createAmbientPlaybackLayer({
    kind: profile.kind,
    intensity: profile.intensity,
    emitter: profile.emitter,
    listener: options.listener,
    layerIndex: 0,
    nowMs: options.nowMs,
    cadenceMultiplier: 1,
    volumeMultiplier: 1,
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
}): AmbientPlaybackLayer {
  const identityVariant = resolveAmbientIdentityVariant(
    options.kind,
    options.emitter,
    options.layerIndex,
    options.nowMs
  );
  const emitterX = Math.round(options.emitter.x);
  const emitterY = Math.round(options.emitter.y);
  return {
    kind: options.kind,
    intensity: options.intensity,
    emitter: options.emitter,
    listener: options.listener,
    identityVariant,
    cadenceMultiplier: options.cadenceMultiplier,
    volumeMultiplier: Math.max(0.3, options.volumeMultiplier),
    signature: [
      options.kind,
      emitterX,
      emitterY,
      identityVariant ?? '',
      Math.round(options.intensity * 100),
    ].join(':'),
  };
}

function resolveAmbientIdentityVariant(
  kind: NearbyAmbientKind,
  emitter: SoundPosition,
  layerIndex: number,
  nowMs: number
): string | undefined {
  const variants = AMBIENT_IDENTITY_VARIANTS[kind];
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
