import type { NearbyAmbientKind } from './nearby-ambient.ts';
import type { AmbientDayPhase, AmbientSeason } from './ambient-cycle.ts';

const BASE_AMBIENT_IDENTITY_VARIANTS: Record<
  NearbyAmbientKind,
  readonly string[]
> = {
  ocean: ['surf', 'shoreline', 'seabirds', 'gusts', 'water-splashes'],
  river: ['current', 'water-splashes'],
  forest: ['canopy', 'insects', 'branches', 'wildlife', 'vegetation-rustle'],
  plains: ['breeze', 'wildlife', 'vegetation-rustle'],
  desert: ['sand-wind', 'sand-shift', 'sparse-calls'],
  snowfield: ['winter-quiet', 'ice-creaks', 'winter-gusts', 'muffled-open'],
  swamp: [
    'marsh-insects',
    'frogs',
    'water-movement',
    'bubbles',
    'wading-birds',
  ],
  volcanic: ['rumble', 'steam-vents', 'stone-cracks', 'lava-pops'],
  mountain: ['gusts', 'stone', 'highland-birds', 'falling-rocks'],
  cave: ['drips', 'echo', 'underground-wind'],
  magical: ['arcane-hum', 'astral-chimes', 'void-whispers'],
  settlement: ['market'],
  ruins: ['mystery-hint', 'landmark-hint'],
};

export function resolveAmbientIdentityVariants(
  kind: NearbyAmbientKind,
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  switch (kind) {
    case 'forest':
      return resolveForestVariants(dayPhase, season);
    case 'plains':
      return resolvePlainsVariants(dayPhase, season);
    case 'desert':
      return resolveDesertVariants(dayPhase, season);
    case 'snowfield':
      return resolveSnowfieldVariants(dayPhase, season);
    case 'swamp':
      return resolveSwampVariants(dayPhase, season);
    case 'volcanic':
      return resolveVolcanicVariants(dayPhase);
    case 'settlement':
      return resolveSettlementVariants(dayPhase);
    case 'mountain':
      return resolveMountainVariants(dayPhase, season);
    case 'magical':
      return resolveMagicalVariants(dayPhase, season);
    case 'river':
      return ['current', 'water-splashes'];
    case 'ocean':
      return ['surf', 'shoreline', 'seabirds', 'water-splashes'];
    case 'ruins':
      return season === 'autumn'
        ? ['mystery-hint', 'landmark-hint', 'migrating-birds']
        : ['mystery-hint', 'landmark-hint'];
    default:
      return BASE_AMBIENT_IDENTITY_VARIANTS[kind];
  }
}

export function resolveAmbientIdentityVariantModifiers(options: {
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
    options.kind === 'desert' ||
    options.kind === 'snowfield' ||
    options.kind === 'swamp' ||
    options.kind === 'volcanic' ||
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

  switch (options.identityVariant) {
    case 'nearby-birds':
      cadenceMultiplier *= 0.94;
      volumeMultiplier *= 1.08;
      break;
    case 'distant-birds':
      cadenceMultiplier *= 1.4;
      volumeMultiplier *= 0.72;
      break;
    case 'animal-calls':
      cadenceMultiplier *= 1.5;
      volumeMultiplier *= 0.84;
      break;
    case 'branch-creak':
    case 'falling-rocks':
    case 'water-splashes':
      cadenceMultiplier *= 1.65;
      volumeMultiplier *= 0.9;
      break;
    case 'vegetation-rustle':
      cadenceMultiplier *= 1.18;
      volumeMultiplier *= 0.88;
      break;
    case 'mystery-hint':
    case 'landmark-hint':
      cadenceMultiplier *= 2.3;
      volumeMultiplier *= 0.7;
      break;
    case 'migrating-birds':
      cadenceMultiplier *= 1.9;
      volumeMultiplier *= 0.78;
      break;
    case 'autumn-leaves':
      cadenceMultiplier *= 1.22;
      volumeMultiplier *= 0.92;
      break;
    case 'ice-creaks':
      cadenceMultiplier *= 1.78;
      volumeMultiplier *= 0.84;
      break;
    case 'winter-gusts':
      cadenceMultiplier *= 1.08;
      volumeMultiplier *= 1.04;
      break;
    case 'muffled-open':
      cadenceMultiplier *= 1.26;
      volumeMultiplier *= 0.76;
      break;
    case 'arcane-hum':
      cadenceMultiplier *= 1.28;
      volumeMultiplier *= 0.92;
      break;
    case 'astral-chimes':
      cadenceMultiplier *= 1.54;
      volumeMultiplier *= 0.86;
      break;
    case 'void-whispers':
      cadenceMultiplier *= 1.82;
      volumeMultiplier *= 0.74;
      break;
    case 'glass-resonance':
      cadenceMultiplier *= 1.36;
      volumeMultiplier *= 0.9;
      break;
    case 'ether-wind':
      cadenceMultiplier *= 1.14;
      volumeMultiplier *= 0.96;
      break;
    case 'marsh-insects':
      cadenceMultiplier *= 0.9;
      volumeMultiplier *= 1.08;
      break;
    case 'frogs':
      cadenceMultiplier *= 1.04;
      volumeMultiplier *= 1.02;
      break;
    case 'water-movement':
      cadenceMultiplier *= 1.18;
      volumeMultiplier *= 0.94;
      break;
    case 'bubbles':
      cadenceMultiplier *= 1.42;
      volumeMultiplier *= 0.82;
      break;
    case 'wading-birds':
      cadenceMultiplier *= 1.22;
      volumeMultiplier *= 0.88;
      break;
    case 'rumble':
      cadenceMultiplier *= 1.42;
      volumeMultiplier *= 1.08;
      break;
    case 'steam-vents':
      cadenceMultiplier *= 1.12;
      volumeMultiplier *= 0.96;
      break;
    case 'stone-cracks':
      cadenceMultiplier *= 1.56;
      volumeMultiplier *= 0.9;
      break;
    case 'lava-pops':
      cadenceMultiplier *= 1.24;
      volumeMultiplier *= 0.94;
      break;
    case 'summer-insects':
    case 'heat-insects':
      cadenceMultiplier *= 0.92;
      volumeMultiplier *= 1.08;
      break;
    case 'desert-insects':
      cadenceMultiplier *= 0.96;
      volumeMultiplier *= 1.04;
      break;
    case 'night-insects':
      cadenceMultiplier *= 1.04;
      volumeMultiplier *= 0.96;
      break;
    case 'sand-wind':
      cadenceMultiplier *= 0.98;
      volumeMultiplier *= 1.06;
      break;
    case 'sand-shift':
      cadenceMultiplier *= 1.32;
      volumeMultiplier *= 0.88;
      break;
    case 'sparse-calls':
      cadenceMultiplier *= 1.82;
      volumeMultiplier *= 0.78;
      break;
    case 'spring-frogs':
      cadenceMultiplier *= 0.95;
      volumeMultiplier *= 1.06;
      break;
    default:
      break;
  }

  if (options.season === 'winter') {
    if (options.kind === 'forest' || options.kind === 'plains') {
      cadenceMultiplier *= 1.16;
      volumeMultiplier *= 0.82;
    }
  }

  return {
    cadenceMultiplier,
    volumeMultiplier,
  };
}

function resolveForestVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (season === 'winter') {
    return ['winter-quiet', 'mystery-hint'];
  }
  if (dayPhase === 'dawn') {
    return season === 'autumn'
      ? ['dawn-birds', 'migrating-birds', 'vegetation-rustle']
      : ['dawn-birds', 'nearby-birds', 'distant-birds'];
  }
  if (dayPhase === 'night') {
    return season === 'spring'
      ? ['spring-frogs', 'owl', 'animal-calls']
      : ['night-crickets', 'owl', 'animal-calls'];
  }
  if (season === 'spring') {
    return ['spring-frogs', 'nearby-birds', 'vegetation-rustle'];
  }
  if (season === 'summer') {
    return ['summer-insects', 'nearby-birds', 'distant-birds', 'branch-creak'];
  }
  if (season === 'autumn') {
    return ['autumn-leaves', 'distant-birds', 'branch-creak', 'animal-calls'];
  }
  if (dayPhase === 'dusk') {
    return ['branches', 'distant-birds', 'animal-calls'];
  }
  return BASE_AMBIENT_IDENTITY_VARIANTS.forest;
}

function resolvePlainsVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (season === 'winter') {
    return ['winter-quiet', 'distant-birds'];
  }
  if (dayPhase === 'dawn') {
    return season === 'autumn'
      ? ['dawn-birds', 'migrating-birds']
      : ['dawn-birds', 'nearby-birds', 'distant-birds'];
  }
  if (dayPhase === 'night') {
    return ['night-crickets', 'animal-calls'];
  }
  if (season === 'spring') {
    return ['spring-frogs', 'nearby-birds', 'vegetation-rustle'];
  }
  if (season === 'summer') {
    return ['summer-insects', 'nearby-birds', 'distant-birds'];
  }
  if (season === 'autumn') {
    return ['autumn-leaves', 'migrating-birds', 'animal-calls'];
  }
  return ['breeze', 'nearby-birds', 'distant-birds', 'animal-calls'];
}

function resolveMagicalVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (season === 'winter') {
    return ['void-whispers', 'glass-resonance', 'arcane-hum'];
  }
  if (dayPhase === 'dawn') {
    return ['astral-chimes', 'glass-resonance', 'arcane-hum'];
  }
  if (dayPhase === 'night') {
    return ['void-whispers', 'astral-chimes', 'arcane-hum'];
  }
  if (dayPhase === 'dusk') {
    return ['astral-chimes', 'ether-wind', 'void-whispers'];
  }
  return ['arcane-hum', 'glass-resonance', 'ether-wind'];
}

function resolveDesertVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (dayPhase === 'night') {
    return ['night-insects', 'sand-wind', 'sparse-calls'];
  }
  if (dayPhase === 'dawn' || dayPhase === 'dusk') {
    return ['sand-wind', 'desert-insects', 'sparse-calls'];
  }
  if (season === 'summer') {
    return ['heat-insects', 'sand-wind', 'sand-shift'];
  }
  return BASE_AMBIENT_IDENTITY_VARIANTS.desert;
}

function resolveSnowfieldVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (dayPhase === 'night') {
    return ['winter-quiet', 'ice-creaks', 'mystery-hint'];
  }
  if (dayPhase === 'dawn') {
    return ['winter-gusts', 'ice-creaks', 'distant-birds'];
  }
  if (season === 'spring') {
    return ['ice-creaks', 'muffled-open', 'distant-birds'];
  }
  return ['winter-quiet', 'winter-gusts', 'muffled-open'];
}

function resolveSwampVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (dayPhase === 'night') {
    return ['frogs', 'marsh-insects', 'bubbles'];
  }
  if (dayPhase === 'dawn') {
    return season === 'spring'
      ? ['frogs', 'wading-birds', 'water-movement']
      : ['wading-birds', 'water-movement', 'marsh-insects'];
  }
  if (season === 'spring') {
    return ['frogs', 'marsh-insects', 'water-movement'];
  }
  return ['marsh-insects', 'water-movement', 'bubbles'];
}

function resolveVolcanicVariants(dayPhase: AmbientDayPhase): readonly string[] {
  if (dayPhase === 'night') {
    return ['lava-pops', 'rumble', 'mystery-hint'];
  }
  if (dayPhase === 'dawn' || dayPhase === 'dusk') {
    return ['steam-vents', 'stone-cracks', 'rumble'];
  }
  return ['rumble', 'steam-vents', 'lava-pops'];
}

function resolveSettlementVariants(
  dayPhase: AmbientDayPhase
): readonly string[] {
  switch (dayPhase) {
    case 'dawn':
      return ['rooster-bells'];
    case 'day':
      return ['market', 'nearby-birds'];
    case 'dusk':
      return ['tavern'];
    case 'night':
      return ['quiet-lanterns'];
  }
}

function resolveMountainVariants(
  dayPhase: AmbientDayPhase,
  season: AmbientSeason
): readonly string[] {
  if (dayPhase === 'night') {
    return ['gusts', 'animal-calls', 'mystery-hint'];
  }
  if (season === 'autumn') {
    return ['highland-birds', 'falling-rocks', 'migrating-birds'];
  }
  return ['gusts', 'stone', 'highland-birds', 'falling-rocks'];
}
