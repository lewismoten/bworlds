import type * as THREE from 'three';

type MaterialLike = THREE.Material & Record<string, unknown>;

export function getMaterialDefineSignature(material: THREE.Material): string {
  const defines = (material as MaterialLike).defines;
  if (!defines || typeof defines !== 'object') {
    return '';
  }

  const entries = Object.entries(defines as Record<string, unknown>)
    .filter(([, value]) => value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}:${normalizeDefineValue(value)}`);
  if (entries.length === 0) {
    return '';
  }

  return `${(material as MaterialLike).type ?? ''}|${entries.join(',')}`;
}

export function countUniqueMaterialDefineSignatures(
  materials: Iterable<THREE.Material>
): number {
  const signatures = new Set<string>();

  for (const material of materials) {
    const signature = getMaterialDefineSignature(material);
    if (!signature) {
      continue;
    }
    signatures.add(signature);
  }

  return signatures.size;
}

function normalizeDefineValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  return '';
}
