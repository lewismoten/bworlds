import type * as THREE from 'three';

type MaterialLike = THREE.Material & Record<string, unknown>;

export function countEquivalentShareableMaterials(
  materials: Iterable<THREE.Material>
): number {
  const signatureCounts = new Map<string, number>();

  for (const material of materials) {
    const signature = getMaterialEquivalenceSignature(material);
    signatureCounts.set(signature, (signatureCounts.get(signature) ?? 0) + 1);
  }

  let equivalentCount = 0;
  for (const count of signatureCounts.values()) {
    if (count > 1) {
      equivalentCount += count - 1;
    }
  }

  return equivalentCount;
}

export function countColorVariantShareableMaterials(
  materials: Iterable<THREE.Material>
): number {
  const groupedSignatures = new Map<string, Map<string, number>>();

  for (const material of materials) {
    const baseSignature = getMaterialColorVariantSignature(material);
    const exactSignature = getMaterialEquivalenceSignature(material);
    let exactCounts = groupedSignatures.get(baseSignature);
    if (!exactCounts) {
      exactCounts = new Map<string, number>();
      groupedSignatures.set(baseSignature, exactCounts);
    }
    exactCounts.set(exactSignature, (exactCounts.get(exactSignature) ?? 0) + 1);
  }

  let colorVariantCount = 0;
  for (const exactCounts of groupedSignatures.values()) {
    if (exactCounts.size <= 1) {
      continue;
    }
    for (const count of exactCounts.values()) {
      colorVariantCount += count;
    }
  }

  return colorVariantCount;
}

export function getMaterialEquivalenceSignature(material: THREE.Material): string {
  return getMaterialSignature(material, {
    includeColorVariation: true,
  });
}

export function getMaterialColorVariantSignature(material: THREE.Material): string {
  return getMaterialSignature(material, {
    includeColorVariation: false,
  });
}

function getMaterialSignature(
  material: THREE.Material,
  {
    includeColorVariation,
  }: {
    includeColorVariation: boolean;
  }
): string {
  const candidate = material as MaterialLike;
  const entries: string[] = [
    `type:${candidate.type ?? ''}`,
    `transparent:${candidate.transparent === true ? 1 : 0}`,
    `opacity:${normalizeUnknownNumber(candidate.opacity)}`,
    `alphaTest:${normalizeUnknownNumber(candidate.alphaTest)}`,
    `side:${normalizeUnknownNumber(candidate.side)}`,
    `fog:${candidate.fog === false ? 0 : 1}`,
    `depthWrite:${candidate.depthWrite === false ? 0 : 1}`,
    `color:${includeColorVariation ? getColorLikeKey(candidate.color) : ''}`,
    `emissive:${includeColorVariation ? getColorLikeKey(candidate.emissive) : ''}`,
    `emissiveIntensity:${includeColorVariation ? normalizeUnknownNumber(candidate.emissiveIntensity) : ''}`,
    `roughness:${normalizeUnknownNumber(candidate.roughness)}`,
    `metalness:${normalizeUnknownNumber(candidate.metalness)}`,
    `map:${getObjectReferenceKey(candidate.map)}`,
    `alphaMap:${getObjectReferenceKey(candidate.alphaMap)}`,
    `emissiveMap:${getObjectReferenceKey(candidate.emissiveMap)}`,
    `normalMap:${getObjectReferenceKey(candidate.normalMap)}`,
    `roughnessMap:${getObjectReferenceKey(candidate.roughnessMap)}`,
    `metalnessMap:${getObjectReferenceKey(candidate.metalnessMap)}`,
    `vertexShader:${normalizeUnknownString(candidate.vertexShader)}`,
    `fragmentShader:${normalizeUnknownString(candidate.fragmentShader)}`,
    `uniforms:${getUniformSignature(candidate.uniforms)}`,
  ];

  return entries.join('|');
}

const objectReferenceIds = new WeakMap<object, number>();
let nextObjectReferenceId = 1;

function getObjectReferenceKey(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  let id = objectReferenceIds.get(value);
  if (!id) {
    id = nextObjectReferenceId;
    nextObjectReferenceId += 1;
    objectReferenceIds.set(value, id);
  }
  return `${id}`;
}

function getColorLikeKey(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  const color = value as {
    getHexString?: () => string;
    r?: unknown;
    g?: unknown;
    b?: unknown;
  };
  if (typeof color.getHexString === 'function') {
    return color.getHexString();
  }
  const red = normalizeUnknownNumber(color.r);
  const green = normalizeUnknownNumber(color.g);
  const blue = normalizeUnknownNumber(color.b);
  return red || green || blue ? `${red},${green},${blue}` : '';
}

function getUniformSignature(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return '';
  }
  const uniforms = value as Record<string, { value?: unknown }>;
  return Object.keys(uniforms)
    .sort()
    .map((key) => `${key}:${getUniformValueSignature(uniforms[key]?.value)}`)
    .join(',');
}

function getUniformValueSignature(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => getUniformValueSignature(entry)).join(',');
  }
  return getObjectReferenceKey(value);
}

function normalizeUnknownNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value}` : '';
}

function normalizeUnknownString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
