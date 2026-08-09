import { registerHashLabel, registerHashLabels } from './hash-labels.ts';

const FNV_PRIME = 16777619;
const HASH_PART_SEPARATOR = 58;
const UINT32_RANGE = 2 ** 32;

export type HashSeed = number;
export { registerHashLabel, registerHashLabels } from './hash-labels.ts';

export function registerHashSeed(label: string): HashSeed {
  return registerHashLabel(label);
}

export function registerHashSeeds<const TLabels extends readonly string[]>(
  labels: TLabels
): { [K in TLabels[number]]: HashSeed } {
  return registerHashLabels(labels);
}

export function createHashSeed(seed: number): HashSeed {
  return seed >>> 0;
}

export function resolveHashSeed(seed: HashSeed): HashSeed {
  return createHashSeed(seed);
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
