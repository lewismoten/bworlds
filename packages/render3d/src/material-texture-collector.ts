import * as THREE from 'three';

export function collectMaterialTexturesInto(
  material: THREE.Material,
  target: unknown[]
): unknown[] {
  target.length = 0;

  for (const key in material) {
    if (!Object.prototype.hasOwnProperty.call(material, key)) {
      continue;
    }
    const value = (material as Record<string, unknown>)[key];
    if (isTextureLike(value)) {
      target.push(value);
    }
  }

  return target;
}

function isTextureLike(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const texture = value as {
    image?: unknown;
    colorSpace?: unknown;
    needsUpdate?: boolean;
    repeat?: unknown;
  };
  return (
    texture.image != null ||
    texture.colorSpace != null ||
    texture.needsUpdate != null ||
    texture.repeat != null
  );
}
