const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
const HASH_PART_SEPARATOR = 58;
const HASH_LABEL_CACHE_LIMIT = 4096;

const registeredHashLabels = new Map<string, number>();

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

export function createHashSeed(seed: number | string): number {
  return typeof seed === 'number' ? seed >>> 0 : registerHashLabel(seed);
}

export function appendHashSeedPart(seedHash: number, value: number | string): number {
  return typeof value === 'number'
    ? appendHashSeedNumber(seedHash, value)
    : appendHashSeedLabel(seedHash, registerHashLabel(value));
}

export function appendHashSeedLabel(seedHash: number, labelHash: number): number {
  return mixHashNumber(mixHashCharacter(seedHash >>> 0, HASH_PART_SEPARATOR), labelHash);
}

export function appendHashSeedNumber(seedHash: number, value: number): number {
  return mixHashNumber(mixHashCharacter(seedHash >>> 0, HASH_PART_SEPARATOR), value);
}

export function hash2D(seed: number | string, x: number, y: number): number {
  return hash2DWithSeed(createHashSeed(seed), x, y);
}

export function hash2DWithSeed(seedHash: number, x: number, y: number): number {
  let hash = appendHashSeedNumber(seedHash, x);
  hash = appendHashSeedNumber(hash, y);
  return (hash >>> 0) / 4294967295;
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
