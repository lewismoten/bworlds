import type {
  NearbyAmbientKind,
  NearbyAmbientLayer,
  NearbyAmbientProfile,
} from './nearby-ambient.ts';
import type { SoundPosition } from './procedural-sound-effect-generator.ts';
import {
  resolveAmbientDayPhase,
  resolveAmbientSeason,
  type AmbientDayPhase,
  type AmbientSeason,
} from './ambient-cycle.ts';

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
    mountain: ['gusts', 'stone', 'highland-birds'],
    cave: ['drips', 'echo', 'underground-wind'],
    settlement: [],
    ruins: [],
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

function resolveAmbientIdentityVariants(
  kind: NearbyAmbientKind,
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  switch (kind) {
    case 'forest':
      if (season === 'winter') {
        return ['winter-quiet'];
      }
      if (dayPhase === 'dawn') {
        return ['dawn-birds'];
      }
      if (dayPhase === 'night') {
        return season === 'spring'
          ? ['spring-frogs', 'owl']
          : ['night-crickets', 'owl'];
      }
      if (season === 'spring') {
        return ['spring-frogs', 'wildlife'];
      }
      if (season === 'summer') {
        return ['summer-insects', 'canopy'];
      }
      if (dayPhase === 'dusk') {
        return ['branches', 'wildlife'];
      }
      return AMBIENT_IDENTITY_VARIANTS.forest;
    case 'plains':
      if (season === 'winter') {
        return ['winter-quiet'];
      }
      if (dayPhase === 'dawn') {
        return ['dawn-birds'];
      }
      if (dayPhase === 'night') {
        return ['night-crickets'];
      }
      if (season === 'spring') {
        return ['spring-frogs'];
      }
      if (season === 'summer') {
        return ['summer-insects'];
      }
      return ['breeze', 'wildlife'];
    case 'settlement':
      switch (dayPhase) {
        case 'dawn':
          return ['rooster-bells'];
        case 'day':
          return ['market'];
        case 'dusk':
          return ['tavern'];
        case 'night':
          return ['quiet-lanterns'];
      }
      break;
    default:
      return AMBIENT_IDENTITY_VARIANTS[kind];
  }
  return AMBIENT_IDENTITY_VARIANTS[kind];
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
  let cadenceMultiplier = 1;
  let volumeMultiplier = 1;

  if (
    options.kind === 'forest' ||
    options.kind === 'plains' ||
    options.kind === 'settlement'
  ) {
    if (options.dayPhase === 'night') {
      cadenceMultiplier *= 1.22;
      volumeMultiplier *= 0.72;
    } else if (options.dayPhase === 'dusk') {
      cadenceMultiplier *= 1.08;
      volumeMultiplier *= 0.9;
    }
  }

  if (options.season === 'winter') {
    if (options.kind === 'forest' || options.kind === 'plains') {
      cadenceMultiplier *= 1.16;
      volumeMultiplier *= 0.82;
    }
  } else if (options.season === 'summer') {
    if (options.identityVariant === 'summer-insects') {
      cadenceMultiplier *= 0.92;
      volumeMultiplier *= 1.08;
    }
  } else if (options.season === 'spring') {
    if (options.identityVariant === 'spring-frogs') {
      cadenceMultiplier *= 0.95;
      volumeMultiplier *= 1.06;
    }
  }

  return {
    cadenceMultiplier,
    volumeMultiplier,
  };
}
