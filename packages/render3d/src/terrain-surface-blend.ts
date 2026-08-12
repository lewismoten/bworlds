import type { Kind } from '@bworlds/plugin-api';

export type TerrainSurfaceBlendCategory =
  'plains' | 'road' | 'forest' | 'shore' | 'mountain' | 'water' | 'other';

export type TerrainSurfaceBlendSignature = {
  center: TerrainSurfaceBlendCategory;
  north: TerrainSurfaceBlendCategory;
  east: TerrainSurfaceBlendCategory;
  south: TerrainSurfaceBlendCategory;
  west: TerrainSurfaceBlendCategory;
};

export function shouldUseTerrainSurfaceBlend(kind: Kind): boolean {
  const category = resolveTerrainSurfaceBlendCategory(kind);
  return category !== 'water' && category !== 'other';
}

export function resolveTerrainSurfaceBlendCategory(
  kind: Kind
): TerrainSurfaceBlendCategory {
  const normalizedKind = kind.toLowerCase();
  if (
    normalizedKind === 'ocean' ||
    normalizedKind === 'river' ||
    normalizedKind === 'water'
  ) {
    return 'water';
  }
  if (
    normalizedKind === 'road' ||
    normalizedKind === 'path' ||
    normalizedKind.includes('road') ||
    normalizedKind.includes('trail')
  ) {
    return 'road';
  }
  if (
    normalizedKind === 'plains' ||
    normalizedKind === 'grass' ||
    normalizedKind.includes('field') ||
    normalizedKind.includes('farm') ||
    normalizedKind.includes('garden')
  ) {
    return 'plains';
  }
  if (normalizedKind === 'forest' || normalizedKind.includes('wood')) {
    return 'forest';
  }
  if (normalizedKind === 'shore' || normalizedKind === 'sand') {
    return 'shore';
  }
  if (
    normalizedKind === 'mountain' ||
    normalizedKind === 'rock' ||
    normalizedKind.includes('cliff')
  ) {
    return 'mountain';
  }
  return 'other';
}

export function createTerrainSurfaceBlendSignature(params: {
  centerKind: Kind;
  northKind: Kind;
  eastKind: Kind;
  southKind: Kind;
  westKind: Kind;
}): string | null {
  if (!shouldUseTerrainSurfaceBlend(params.centerKind)) {
    return null;
  }

  const signature = {
    center: resolveTerrainSurfaceBlendCategory(params.centerKind),
    north: resolveTerrainSurfaceBlendCategory(params.northKind),
    east: resolveTerrainSurfaceBlendCategory(params.eastKind),
    south: resolveTerrainSurfaceBlendCategory(params.southKind),
    west: resolveTerrainSurfaceBlendCategory(params.westKind),
  } satisfies TerrainSurfaceBlendSignature;

  return [
    signature.center,
    signature.north,
    signature.east,
    signature.south,
    signature.west,
  ].join(':');
}

export function createTerrainSurfaceBlendMaterial<
  TTexture extends {
    colorSpace?: unknown;
    needsUpdate?: boolean;
    magFilter?: unknown;
    minFilter?: unknown;
    anisotropy?: number;
    generateMipmaps?: boolean;
    wrapS?: unknown;
    wrapT?: unknown;
  },
  TMaterial,
>(params: {
  three: {
    CanvasTexture: new (canvas: HTMLCanvasElement) => TTexture;
    MeshStandardMaterial: new (options?: Record<string, unknown>) => TMaterial;
    SRGBColorSpace: unknown;
    LinearFilter: unknown;
    LinearMipmapLinearFilter: unknown;
    ClampToEdgeWrapping: unknown;
  };
  signature: string;
}): TMaterial {
  const parsed = parseTerrainSurfaceBlendSignature(params.signature);
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error(
      'Unable to create 2D canvas context for terrain surface blending.'
    );
  }

  paintTerrainSurfaceBlend(context, parsed, canvas.width, canvas.height);

  const texture = new params.three.CanvasTexture(canvas);
  texture.colorSpace = params.three.SRGBColorSpace;
  texture.magFilter = params.three.LinearFilter;
  texture.minFilter = params.three.LinearMipmapLinearFilter;
  texture.anisotropy = 2;
  texture.generateMipmaps = true;
  texture.wrapS = params.three.ClampToEdgeWrapping;
  texture.wrapT = params.three.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return new params.three.MeshStandardMaterial({
    map: texture,
    roughness: parsed.center === 'road' ? 0.98 : 0.92,
    metalness: 0.03,
  });
}

function parseTerrainSurfaceBlendSignature(
  signature: string
): TerrainSurfaceBlendSignature {
  const [center, north, east, south, west] = signature.split(':');
  return {
    center: asCategory(center),
    north: asCategory(north),
    east: asCategory(east),
    south: asCategory(south),
    west: asCategory(west),
  };
}

function asCategory(value: string | undefined): TerrainSurfaceBlendCategory {
  switch (value) {
    case 'plains':
    case 'road':
    case 'forest':
    case 'shore':
    case 'mountain':
    case 'water':
      return value;
    default:
      return 'other';
  }
}

function paintTerrainSurfaceBlend(
  context: CanvasRenderingContext2D,
  signature: TerrainSurfaceBlendSignature,
  width: number,
  height: number
): void {
  context.fillStyle = getTerrainSurfaceBlendColor(signature.center);
  context.fillRect(0, 0, width, height);
  paintTerrainSurfaceNoise(context, signature, width, height);

  const edgeWidth = Math.max(4, Math.floor(width * 0.22));
  paintEdgeGradient(
    context,
    signature.north,
    'north',
    width,
    height,
    edgeWidth
  );
  paintEdgeGradient(context, signature.east, 'east', width, height, edgeWidth);
  paintEdgeGradient(
    context,
    signature.south,
    'south',
    width,
    height,
    edgeWidth
  );
  paintEdgeGradient(context, signature.west, 'west', width, height, edgeWidth);

  if (signature.center === 'road') {
    context.fillStyle = 'rgba(210, 186, 116, 0.28)';
    context.fillRect(width * 0.18, height * 0.44, width * 0.64, height * 0.12);
  }
}

function paintTerrainSurfaceNoise(
  context: CanvasRenderingContext2D,
  signature: TerrainSurfaceBlendSignature,
  width: number,
  height: number
): void {
  const seed = hashSignature(
    `${signature.center}:${signature.north}:${signature.east}:${signature.south}:${signature.west}`
  );
  const fleckCount = 18;
  for (let index = 0; index < fleckCount; index += 1) {
    const value = hashNumber(seed, index);
    const x = Math.floor((value % 1) * width);
    const y = Math.floor((hashNumber(seed, index + 29) % 1) * height);
    const radius = 1 + Math.floor((hashNumber(seed, index + 47) % 1) * 2);
    context.fillStyle =
      index % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    context.fillRect(x, y, radius, radius);
  }
}

function paintEdgeGradient(
  context: CanvasRenderingContext2D,
  category: TerrainSurfaceBlendCategory,
  direction: 'north' | 'east' | 'south' | 'west',
  width: number,
  height: number,
  edgeWidth: number
): void {
  if (category === 'other' || category === 'water') {
    return;
  }

  let gradient: CanvasGradient;
  switch (direction) {
    case 'north':
      gradient = context.createLinearGradient(0, 0, 0, edgeWidth);
      gradient.addColorStop(0, `${getTerrainSurfaceBlendColor(category)}cc`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, edgeWidth);
      break;
    case 'east':
      gradient = context.createLinearGradient(width, 0, width - edgeWidth, 0);
      gradient.addColorStop(0, `${getTerrainSurfaceBlendColor(category)}cc`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(width - edgeWidth, 0, edgeWidth, height);
      break;
    case 'south':
      gradient = context.createLinearGradient(0, height, 0, height - edgeWidth);
      gradient.addColorStop(0, `${getTerrainSurfaceBlendColor(category)}cc`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, height - edgeWidth, width, edgeWidth);
      break;
    case 'west':
      gradient = context.createLinearGradient(0, 0, edgeWidth, 0);
      gradient.addColorStop(0, `${getTerrainSurfaceBlendColor(category)}cc`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, edgeWidth, height);
      break;
  }
}

function getTerrainSurfaceBlendColor(
  category: TerrainSurfaceBlendCategory
): string {
  switch (category) {
    case 'plains':
      return '#7fb069';
    case 'road':
      return '#8a5a19';
    case 'forest':
      return '#5e7d47';
    case 'shore':
      return '#cdb985';
    case 'mountain':
      return '#8e877f';
    case 'water':
      return '#5f95c7';
    case 'other':
      return '#8a806d';
  }
}

function hashSignature(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashNumber(seed: number, salt: number): number {
  const mixed = Math.imul(seed ^ (salt * 374761393), 668265263) >>> 0;
  return (mixed & 0xfffffff) / 0xfffffff;
}
