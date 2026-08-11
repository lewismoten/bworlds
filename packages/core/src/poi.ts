import {
  appendHashSeedLabel,
  appendHashSeedPart,
  hash2DWithSeed,
  registerHashLabel,
  registerHashLabels,
} from './hash.ts';

const POI_NAME_PREFIX_SET_LABEL = registerHashLabel('name-prefix-set');
const POI_NAME_SUFFIX_SET_LABEL = registerHashLabel('name-suffix-set');
const POI_NAME_PREFIX_LABEL = registerHashLabel('prefix');
const POI_NAME_SUFFIX_LABEL = registerHashLabel('suffix');
const POI_NAME_TAIL_LABEL = registerHashLabel('tail');
const POI_NAME_FORM_LABEL = registerHashLabel('form');
const POI_NAME_NOUN_LABEL = registerHashLabel('noun');

const POI_NAME_TYPE_LABELS = registerHashLabels([
  'town',
  'cave',
  'dungeon',
  'tower',
  'ruins',
  'quarry',
  'lighthouse',
  'ship',
  'observatory',
  'station',
] as const);

const registeredPoiNameTypeLabels = new Map<string, number>(
  Object.entries(POI_NAME_TYPE_LABELS)
);

function pickFrom<T>(list: readonly T[], seedValue: number): T {
  return list[Math.floor(seedValue * list.length) % list.length];
}

export function getRegionalPoiNameStyle(
  seedHash: number,
  x: number,
  y: number
): {
  regionX: number;
  regionY: number;
  prefixes: string[];
  suffixes: string[];
} {
  const regionX = Math.floor(x / 48);
  const regionY = Math.floor(y / 48);
  const prefixSets = [
    ['Ash', 'Briar', 'Cinder', 'Dawn', 'Elder', 'Frost'],
    ['Green', 'High', 'Low', 'Moss', 'Oak', 'Stone'],
    ['Red', 'Silver', 'Sun', 'Thorn', 'West', 'Wind'],
    ['Moon', 'Raven', 'River', 'Storm', 'Vale', 'Wild'],
  ];
  const suffixSets = [
    ['ford', 'gate', 'grove', 'hollow', 'mere', 'watch'],
    ['barrow', 'crest', 'fell', 'hearth', 'rest', 'run'],
    ['bridge', 'field', 'keep', 'pass', 'reach', 'ward'],
    ['den', 'depths', 'hall', 'rift', 'spire', 'way'],
  ];
  const prefixSetSeed = appendHashSeedLabel(
    seedHash,
    POI_NAME_PREFIX_SET_LABEL
  );
  const suffixSetSeed = appendHashSeedLabel(
    seedHash,
    POI_NAME_SUFFIX_SET_LABEL
  );

  return {
    regionX,
    regionY,
    prefixes:
      prefixSets[
        Math.floor(
          hash2DWithSeed(prefixSetSeed, regionX, regionY) * prefixSets.length
        )
      ],
    suffixes:
      suffixSets[
        Math.floor(
          hash2DWithSeed(suffixSetSeed, regionX, regionY) * suffixSets.length
        )
      ],
  };
}

export type PoiNameType =
  | (
      | 'town'
      | 'cave'
      | 'dungeon'
      | 'ruins'
      | 'quarry'
      | 'lighthouse'
      | 'ship'
      | 'observatory'
      | 'station'
    )
  | (string & {});
export function generatePoiName(
  seedHash: number,
  type: PoiNameType,
  x: number,
  y: number
) {
  const style = getRegionalPoiNameStyle(seedHash, x, y);
  const typeSeed = appendHashSeedLabel(seedHash, getPoiNameTypeLabel(type));
  const stemSeed = appendHashSeedPart(appendHashSeedPart(typeSeed, x), y);
  const prefixSeed = appendHashSeedLabel(stemSeed, POI_NAME_PREFIX_LABEL);
  const suffixSeed = appendHashSeedLabel(stemSeed, POI_NAME_SUFFIX_LABEL);
  const tailSeed = appendHashSeedLabel(stemSeed, POI_NAME_TAIL_LABEL);
  const formSeed = appendHashSeedLabel(stemSeed, POI_NAME_FORM_LABEL);
  const nounSeed = appendHashSeedLabel(stemSeed, POI_NAME_NOUN_LABEL);
  const prefix = pickFrom(style.prefixes, hash2DWithSeed(prefixSeed, x, y));
  const suffix = pickFrom(style.suffixes, hash2DWithSeed(suffixSeed, y, x));

  if (type === 'town') {
    const forms = [
      `${prefix}${suffix}`,
      `${prefix} ${suffix}`,
      `${prefix}${pickFrom(
        ['haven', 'stead', 'wick', 'port'],
        hash2DWithSeed(tailSeed, x + y, y)
      )}`,
    ];
    return pickFrom(forms, hash2DWithSeed(formSeed, x - y, y - x));
  }

  if (type === 'cave') {
    const nouns = ['Cave', 'Grotto', 'Hollow', 'Mouth', 'Den', 'Sink'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'dungeon') {
    const nouns = ['Barrow', 'Crypt', 'Depths', 'Hall', 'Vault', 'Warren'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'tower') {
    const nouns = ['Tower', 'Watch', 'Spire', 'Keep', 'Lookout', 'Crown'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'ruins') {
    const nouns = ['Ruins', 'Forum', 'Temple', 'Sanctum', 'Court', 'Stones'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'quarry') {
    const nouns = ['Quarry', 'Cut', 'Excavation', 'Pit', 'Works', 'Stone'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'lighthouse') {
    const nouns = ['Beacon', 'Light', 'Watch', 'Lantern', 'Signal', 'Point'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'ship') {
    const nouns = ['Mariner', 'Brig', 'Galleon', 'Hulk', 'Harbor', 'Mast'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'observatory') {
    const nouns = ['Observatory', 'Dome', 'Lens', 'Crown', 'Apex', 'Spire'];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  if (type === 'station') {
    const nouns = [
      'Station',
      'Depot',
      'Platform',
      'Junction',
      'Terminal',
      'Rail',
    ];
    return `${prefix} ${pickFrom(nouns, hash2DWithSeed(nounSeed, x, y))}`;
  }

  return `${prefix}${suffix}`;
}

export function registerPoiNameType(type: string): number {
  const knownTypeLabel = registeredPoiNameTypeLabels.get(type);
  if (knownTypeLabel !== undefined) {
    return knownTypeLabel;
  }

  const typeLabel = registerHashLabel(type);
  registeredPoiNameTypeLabels.set(type, typeLabel);
  return typeLabel;
}

function getPoiNameTypeLabel(type: PoiNameType): number {
  const knownTypeLabel = registeredPoiNameTypeLabels.get(type);
  if (knownTypeLabel !== undefined) {
    return knownTypeLabel;
  }
  throw new Error(
    `Unknown point-of-interest name type "${type}". Register it with registerPoiNameType() during setup.`
  );
}
