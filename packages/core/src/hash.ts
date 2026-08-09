const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const HASH_PART_SEPARATOR = 58;
const HASH_LABEL_CACHE_LIMIT = 4096;
const UINT32_RANGE = 2 ** 32;

const registeredHashLabels = new Map<string, number>();

export type HashSeed = number;

export function registerHashLabel(label: string): number {
  const cached = registeredHashLabels.get(label);
  if (cached !== undefined) {
    return cached;
  }

  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < label.length; index += 1) {
    hash = mixHashCharacter(hash, label.charCodeAt(index));
  }

  const normalizedHash = hash >>> 0;
  registeredHashLabels.set(label, normalizedHash);
  if (registeredHashLabels.size > HASH_LABEL_CACHE_LIMIT) {
    const oldest = registeredHashLabels.keys().next().value;
    if (oldest !== undefined) {
      registeredHashLabels.delete(oldest);
    }
  }
  return normalizedHash;
}

export function createHashSeed(seed: number): HashSeed {
  return seed >>> 0;
}

export function resolveHashSeed(seed: number | string): HashSeed {
  return typeof seed === 'number' ? createHashSeed(seed) : registerHashLabel(seed);
}

export function appendHashSeedPart(seedHash: HashSeed, value: number): HashSeed {
  return appendHashSeedNumber(seedHash, value);
}

export function appendHashSeedLabel(seedHash: HashSeed, labelHash: number): HashSeed {
  return mixHashNumber(mixHashCharacter(seedHash >>> 0, HASH_PART_SEPARATOR), labelHash);
}

export function appendHashSeedNumber(seedHash: HashSeed, value: number): HashSeed {
  return mixHashNumber(mixHashCharacter(seedHash >>> 0, HASH_PART_SEPARATOR), value);
}

export function hash2D(seedHash: HashSeed, x: number, y: number): number {
  return hash2DWithSeed(seedHash, x, y);
}

export function hash2DWithSeed(seedHash: number, x: number, y: number): number {
  let hash = appendHashSeedNumber(seedHash, x);
  hash = appendHashSeedNumber(hash, y);
  return normalizeHash(hash);
}

export function normalizeHash(hash: number): number {
  return (hash >>> 0) / UINT32_RANGE;
}

function mixHashCharacter(hash: number, charCode: number): number {
  hash ^= charCode;
  return Math.imul(hash, FNV_PRIME);
}

function mixHashNumber(hash: number, value: number): number {
  let normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
  hash = mixHashCharacter(hash, normalized & 255);
  normalized >>= 8;
  hash = mixHashCharacter(hash, normalized & 255);
  normalized >>= 8;
  hash = mixHashCharacter(hash, normalized & 255);
  normalized >>= 8;
  return mixHashCharacter(hash, normalized & 255);
}
