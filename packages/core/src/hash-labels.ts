const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;
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

function mixHashCharacter(hash: number, charCode: number): number {
  hash ^= charCode;
  return Math.imul(hash, FNV_PRIME);
}
