import type {
  ThreeBufferGeometryLike,
  ThreeGeometryLike,
  ThreeHostLike,
  ThreeMaterialLike,
  ThreeMeshLike,
  ThreeTextureLike,
} from '@bworlds/plugin-api';
import { hash2D } from '@bworlds/core';

type TextureHostLike<TTexture> = {
  CanvasTexture: new (canvas: HTMLCanvasElement) => TTexture;
  SRGBColorSpace: unknown;
  NearestFilter: unknown;
  RepeatWrapping: unknown;
};

type StandardMaterialHostLike<TTexture, TMaterial> = TextureHostLike<TTexture> & {
  MeshStandardMaterial: new (options?: Record<string, unknown>) => TMaterial;
};

type BasicMaterialHostLike<TMaterial> = {
  MeshBasicMaterial: new (options?: Record<string, unknown>) => TMaterial;
};

type PlaneMeshHostLike<TMaterial, TMesh> = BasicMaterialHostLike<TMaterial> & {
  PlaneGeometry: new (width: number, height: number) => ThreeGeometryLike;
  Mesh: new (geometry?: ThreeGeometryLike, material?: TMaterial) => TMesh;
};

const mountainTerrainMaterialCache = new WeakMap<
  object,
  {
    mountainMaterial: ThreeMaterialLike;
    snowMaterial: ThreeMaterialLike;
  }
>();

export function createCanvasTexture<TTexture extends ThreeTextureLike>(
  three: TextureHostLike<TTexture>,
  canvas: HTMLCanvasElement,
  options: {
    repeatX?: number;
    repeatY?: number;
    wrap?: boolean;
  } = {}
): TTexture {
  const texture = new three.CanvasTexture(canvas);
  texture.colorSpace = three.SRGBColorSpace;
  texture.magFilter = three.NearestFilter;
  texture.minFilter = three.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  if (options.wrap !== false) {
    texture.wrapS = three.RepeatWrapping;
    texture.wrapT = three.RepeatWrapping;
  }

  if (
    typeof options.repeatX === 'number' &&
    typeof options.repeatY === 'number' &&
    texture.repeat
  ) {
    texture.repeat.set(options.repeatX, options.repeatY);
  }

  return texture;
}

export function createPaintedCanvasTexture<TTexture extends ThreeTextureLike>(
  three: TextureHostLike<TTexture>,
  options: {
    width: number;
    height: number;
    repeatX?: number;
    repeatY?: number;
    wrap?: boolean;
    paint: (
      context: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => void;
  }
): TTexture {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to create 2D canvas context for texture painting.');
  }

  options.paint(context, canvas);
  return createCanvasTexture(three, canvas, {
    repeatX: options.repeatX,
    repeatY: options.repeatY,
    wrap: options.wrap,
  });
}

export function getOrCreatePaintedCanvasTexture(
  cache: Map<string, ThreeTextureLike>,
  key: string,
  three: TextureHostLike<ThreeTextureLike>,
  options: {
    width: number;
    height: number;
    repeatX?: number;
    repeatY?: number;
    wrap?: boolean;
    paint: (
      context: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => void;
  }
): ThreeTextureLike {
  if (!cache.has(key)) {
    cache.set(key, createPaintedCanvasTexture(three, options));
  }
  return cache.get(key)!;
}

export function getOrCreatePaintedCanvasTextureTyped<TTexture extends ThreeTextureLike>(
  cache: Map<string, TTexture>,
  key: string,
  three: TextureHostLike<TTexture>,
  options: {
    width: number;
    height: number;
    repeatX?: number;
    repeatY?: number;
    wrap?: boolean;
    paint: (
      context: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => void;
  }
): TTexture {
  if (!cache.has(key)) {
    cache.set(key, createPaintedCanvasTexture(three, options));
  }
  return cache.get(key)!;
}

export function createPaintedStandardMaterial(
  three: StandardMaterialHostLike<ThreeTextureLike, ThreeMaterialLike>,
  options: {
    color?: string;
    roughness?: number;
    metalness?: number;
    emissive?: string;
    emissiveIntensity?: number;
    transparent?: boolean;
    opacity?: number;
    side?: unknown;
    width: number;
    height: number;
    repeatX?: number;
    repeatY?: number;
    wrap?: boolean;
    paint: (
      context: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement
    ) => void;
  }
): ThreeMaterialLike {
  const texture = createPaintedCanvasTexture(three, options);
  return new three.MeshStandardMaterial(compactMaterialOptions({
    color: options.color ?? '#ffffff',
    map: texture,
    roughness: options.roughness,
    metalness: options.metalness,
    emissive: options.emissive,
    emissiveIntensity: options.emissiveIntensity,
    transparent: options.transparent,
    opacity: options.opacity,
    side: options.side,
  }));
}

export function createBasicMaterial(
  three: BasicMaterialHostLike<ThreeMaterialLike>,
  options: {
    color?: string;
    map?: ThreeTextureLike;
    transparent?: boolean;
    depthWrite?: boolean;
    side?: unknown;
  } = {}
) {
  return new three.MeshBasicMaterial(compactMaterialOptions({
    color: options.color,
    map: options.map,
    transparent: options.transparent,
    depthWrite: options.depthWrite,
    side: options.side,
  }));
}

export function createTexturedPlaneMesh<
  TTexture extends ThreeTextureLike,
  TMaterial extends ThreeMaterialLike = ThreeMaterialLike,
  TMesh extends ThreeMeshLike = ThreeMeshLike,
>(
  three: PlaneMeshHostLike<TMaterial, TMesh>,
  options: {
    width: number;
    height: number;
    texture: TTexture;
    transparent?: boolean;
    depthWrite?: boolean;
    color?: string;
  }
): TMesh {
  return new three.Mesh(
    new three.PlaneGeometry(options.width, options.height),
    createBasicMaterial(three, {
      map: options.texture,
      transparent: options.transparent ?? true,
      depthWrite: options.depthWrite ?? false,
      color: options.color,
    }) as TMaterial
  );
}

export interface PathPointLike {
  x: number;
  y: number;
  z: number;
  clone(): PathPointLike & {
    addScaledVector(vector: PathPointLike, scalar: number): PathPointLike;
  };
  distanceTo(other: PathPointLike): number;
}

function compactMaterialOptions<T extends Record<string, unknown>>(options: T): T {
  return Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  ) as T;
}

export function createQuadraticBezierPoints(
  three: ThreeHostLike,
  start: PathPointLike,
  control: PathPointLike,
  end: PathPointLike,
  segments: number
) {
  const curve = new three.QuadraticBezierCurve3(start, control, end);
  return curve.getPoints(segments);
}

export function createCubicBezierPoints(
  three: ThreeHostLike,
  start: PathPointLike,
  controlA: PathPointLike,
  controlB: PathPointLike,
  end: PathPointLike,
  segments: number
) {
  const curve = new three.CubicBezierCurve3(start, controlA, controlB, end);
  return curve.getPoints(segments);
}

export function createRibbonMesh(
  three: ThreeHostLike,
  points: PathPointLike[],
  width: number,
  material: ThreeMaterialLike,
  options: {
    widthJitter?: number;
    widthNoise?: (index: number, total: number) => number;
    yOffset?: number;
  } = {}
) {
  const geometry: ThreeBufferGeometryLike = new three.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let distance = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = new three.Vector3()
      .subVectors(next, previous)
      .setY(0)
      .normalize();
    const normal = new three.Vector3(-tangent.z, 0, tangent.x).normalize();
    const widthNoise =
      typeof options.widthNoise === 'function'
        ? options.widthNoise(index, points.length)
        : 1;
    const halfWidth =
      width * widthNoise * (1 + (options.widthJitter ?? 0)) * 0.5;
    const left = point.clone().addScaledVector(normal, halfWidth);
    const right = point.clone().addScaledVector(normal, -halfWidth);
    if (options.yOffset) {
      left.y += options.yOffset;
      right.y += options.yOffset;
    }
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    if (index > 0) {
      distance += point.distanceTo(previous);
    }
    uvs.push(0, distance, 1, distance);
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const base = index * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  geometry.setAttribute(
    'position',
    new three.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('uv', new three.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new three.Mesh(geometry, material);
}

export function createMountainTerrainMaterials(three: ThreeHostLike) {
  if (!mountainTerrainMaterialCache.has(three)) {
    const texture = createPaintedCanvasTexture(three, {
      width: 64,
      height: 64,
      repeatX: 1.4,
      repeatY: 1.4,
      paint(context, canvas) {
        context.fillStyle = '#6b7280';
        context.fillRect(0, 0, canvas.width, canvas.height);

        for (let row = 0; row < canvas.height; row += 4) {
          const shade = 90 + ((row * 7) % 55);
          context.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 12})`;
          context.fillRect(0, row, canvas.width, 2);
        }

        for (let index = 0; index < 180; index += 1) {
          const x = Math.floor(
            hash2D('mountain-texture-x', index, 0) * canvas.width
          );
          const y = Math.floor(
            hash2D('mountain-texture-y', index, 0) * canvas.height
          );
          const length =
            2 + Math.floor(hash2D('mountain-texture-l', index, 0) * 6);
          const brightness =
            110 + Math.floor(hash2D('mountain-texture-b', index, 0) * 70);
          context.fillStyle = `rgba(${brightness}, ${brightness + 4}, ${brightness + 10}, 0.35)`;
          context.fillRect(x, y, length, 1);
        }

        for (let index = 0; index < 120; index += 1) {
          const x = Math.floor(
            hash2D('mountain-crack-x', index, 0) * canvas.width
          );
          const y = Math.floor(
            hash2D('mountain-crack-y', index, 0) * canvas.height
          );
          const depth =
            1 + Math.floor(hash2D('mountain-crack-l', index, 0) * 4);
          context.fillStyle = 'rgba(39, 48, 58, 0.32)';
          context.fillRect(x, y, 1, depth);
        }
      },
    });

    mountainTerrainMaterialCache.set(three, {
      mountainMaterial: new three.MeshStandardMaterial({
        color: '#dbe4ea',
        map: texture,
        roughness: 0.96,
        metalness: 0.02,
        flatShading: true,
      }),
      snowMaterial: new three.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.88,
        metalness: 0.02,
        flatShading: true,
      }),
    });
  }

  return mountainTerrainMaterialCache.get(three)!;
}
