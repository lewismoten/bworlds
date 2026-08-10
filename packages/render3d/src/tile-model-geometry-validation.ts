import type * as THREE from 'three';

type TraversableObjectLike = Pick<THREE.Object3D, 'children' | 'type'> & {
  geometry?: unknown;
};

const STANDARD_GEOMETRY_ATTRIBUTE_NAMES = new Set([
  'position',
  'normal',
  'uv',
  'uv1',
  'uv2',
  'uv3',
  'color',
  'tangent',
  'skinIndex',
  'skinWeight',
]);

export function getGeometryVertexCount(geometry: unknown): number {
  const positionAttribute = (
    geometry as {
      attributes?: {
        position?: {
          count?: unknown;
          array?: ArrayLike<unknown>;
          itemSize?: unknown;
        };
      };
    }
  )?.attributes?.position;
  if (typeof positionAttribute?.count === 'number') {
    return positionAttribute.count;
  }
  const itemSize =
    typeof positionAttribute?.itemSize === 'number' &&
    positionAttribute.itemSize > 0
      ? positionAttribute.itemSize
      : 3;
  if (typeof positionAttribute?.array?.length === 'number') {
    return Math.floor(positionAttribute.array.length / itemSize);
  }
  return 0;
}

export function getGeometryIndexCount(geometry: unknown): number {
  const indexArray = (
    geometry as {
      index?: {
        count?: unknown;
        array?: ArrayLike<unknown>;
      };
    }
  )?.index;
  if (typeof indexArray?.count === 'number') {
    return indexArray.count;
  }
  if (typeof indexArray?.array?.length === 'number') {
    return indexArray.array.length;
  }
  return 0;
}

export function countInvalidGeometryCoordinateSets(
  root: TraversableObjectLike
): number {
  const geometries = new Set<unknown>();
  let invalidGeometryCount = 0;

  traverseSceneGraph(root, (child) => {
    if (!child.geometry || geometries.has(child.geometry)) {
      return;
    }
    geometries.add(child.geometry);
    if (hasInvalidGeometryPositionCoordinates(child.geometry)) {
      invalidGeometryCount += 1;
    }
  });

  return invalidGeometryCount;
}

export function countPointVertices(root: TraversableObjectLike): number {
  let pointVertexCount = 0;

  traverseSceneGraph(root, (child) => {
    if (child.type !== 'Points') {
      return;
    }
    pointVertexCount += getGeometryVertexCount(child.geometry);
  });

  return pointVertexCount;
}

export function countLineSegments(root: TraversableObjectLike): number {
  let lineSegmentCount = 0;

  traverseSceneGraph(root, (child) => {
    if (!isLineObjectType(child.type)) {
      return;
    }
    const vertexCount = getGeometryVertexCount(child.geometry);
    if (child.type === 'LineSegments') {
      lineSegmentCount += Math.floor(vertexCount / 2);
      return;
    }
    if (child.type === 'LineLoop') {
      lineSegmentCount += vertexCount > 1 ? vertexCount : 0;
      return;
    }
    lineSegmentCount += Math.max(0, vertexCount - 1);
  });

  return lineSegmentCount;
}

export function countGeometriesExceedingBounds(
  root: TraversableObjectLike,
  maximumAxisSpan: number
): number {
  const geometries = new Set<unknown>();
  let oversizedGeometryCount = 0;

  traverseSceneGraph(root, (child) => {
    if (!child.geometry || geometries.has(child.geometry)) {
      return;
    }
    geometries.add(child.geometry);
    if (geometryExceedsMaximumAxisSpan(child.geometry, maximumAxisSpan)) {
      oversizedGeometryCount += 1;
    }
  });

  return oversizedGeometryCount;
}

export function countIndexedVertices(root: TraversableObjectLike): number {
  let indexedVertexCount = 0;
  const geometries = new Set<unknown>();

  traverseSceneGraph(root, (child) => {
    if (!child.geometry || geometries.has(child.geometry)) {
      return;
    }
    geometries.add(child.geometry);
    indexedVertexCount += getGeometryIndexCount(child.geometry);
  });

  return indexedVertexCount;
}

export type GeometryAttributeBudgetStats = {
  maxAttributeCount: number;
  maxCustomAttributeCount: number;
  maxVertexAttributeByteSize: number;
};

export type GeometryStructureBudgetStats = {
  maxGeometryGroupCount: number;
  maxGeometryDrawRangeCount: number;
};

export function countUltraDenseTinyGeometries(
  root: TraversableObjectLike,
  {
    maximumAxisSpan,
    minimumTriangleCount,
  }: {
    maximumAxisSpan: number;
    minimumTriangleCount: number;
  }
): number {
  const geometries = new Set<unknown>();
  let denseGeometryCount = 0;

  traverseSceneGraph(root, (child) => {
    if (
      !child.geometry ||
      geometries.has(child.geometry) ||
      !isTriangleGeometryObjectType(child.type)
    ) {
      return;
    }
    geometries.add(child.geometry);
    if (
      geometryIsUltraDenseWithinTinyBounds(child.geometry, {
        maximumAxisSpan,
        minimumTriangleCount,
      })
    ) {
      denseGeometryCount += 1;
    }
  });

  return denseGeometryCount;
}

export function countInvalidGeometryIndexTypes(
  root: TraversableObjectLike
): number {
  const geometries = new Set<unknown>();
  let invalidGeometryIndexTypeCount = 0;

  traverseSceneGraph(root, (child) => {
    if (!child.geometry || geometries.has(child.geometry)) {
      return;
    }
    geometries.add(child.geometry);
    if (hasInvalidGeometryIndexType(child.geometry)) {
      invalidGeometryIndexTypeCount += 1;
    }
  });

  return invalidGeometryIndexTypeCount;
}

export function getGeometryAttributeBudgetStats(
  root: TraversableObjectLike
): GeometryAttributeBudgetStats {
  const geometries = new Set<unknown>();
  let maxAttributeCount = 0;
  let maxCustomAttributeCount = 0;
  let maxVertexAttributeByteSize = 0;

  traverseSceneGraph(root, (child) => {
    if (!child.geometry || geometries.has(child.geometry)) {
      return;
    }
    geometries.add(child.geometry);
    const attributeNames = getGeometryAttributeNames(child.geometry);
    maxAttributeCount = Math.max(maxAttributeCount, attributeNames.length);
    maxCustomAttributeCount = Math.max(
      maxCustomAttributeCount,
      attributeNames.filter(
        (name) => !STANDARD_GEOMETRY_ATTRIBUTE_NAMES.has(name)
      ).length
    );
    maxVertexAttributeByteSize = Math.max(
      maxVertexAttributeByteSize,
      getGeometryVertexAttributeByteSize(child.geometry)
    );
  });

  return {
    maxAttributeCount,
    maxCustomAttributeCount,
    maxVertexAttributeByteSize,
  };
}

export function getGeometryStructureBudgetStats(
  root: TraversableObjectLike
): GeometryStructureBudgetStats {
  const geometries = new Set<unknown>();
  let maxGeometryGroupCount = 0;
  let maxGeometryDrawRangeCount = 0;

  traverseSceneGraph(root, (child) => {
    if (!child.geometry || geometries.has(child.geometry)) {
      return;
    }
    geometries.add(child.geometry);
    maxGeometryGroupCount = Math.max(
      maxGeometryGroupCount,
      getGeometryGroupCount(child.geometry)
    );
    maxGeometryDrawRangeCount = Math.max(
      maxGeometryDrawRangeCount,
      getGeometryDrawRangeCount(child.geometry)
    );
  });

  return {
    maxGeometryGroupCount,
    maxGeometryDrawRangeCount,
  };
}

export function countGeometryTriangles(root: TraversableObjectLike): number {
  let triangleCount = 0;
  const geometries = new Set<unknown>();

  traverseSceneGraph(root, (child) => {
    if (
      !child.geometry ||
      geometries.has(child.geometry) ||
      !isTriangleGeometryObjectType(child.type)
    ) {
      return;
    }
    geometries.add(child.geometry);
    triangleCount += getGeometryTriangleCount(child.geometry);
  });

  return triangleCount;
}

export function getMaxGeometryTriangleCount(
  root: TraversableObjectLike
): number {
  let maximumTriangleCount = 0;
  const geometries = new Set<unknown>();

  traverseSceneGraph(root, (child) => {
    if (
      !child.geometry ||
      geometries.has(child.geometry) ||
      !isTriangleGeometryObjectType(child.type)
    ) {
      return;
    }
    geometries.add(child.geometry);
    maximumTriangleCount = Math.max(
      maximumTriangleCount,
      getGeometryTriangleCount(child.geometry)
    );
  });

  return maximumTriangleCount;
}

function hasInvalidGeometryPositionCoordinates(geometry: unknown): boolean {
  const positionArray = (
    geometry as {
      attributes?: {
        position?: {
          array?: ArrayLike<unknown>;
        };
      };
    }
  )?.attributes?.position?.array;
  if (!positionArray || typeof positionArray.length !== 'number') {
    return false;
  }
  for (let index = 0; index < positionArray.length; index += 1) {
    const value = positionArray[index];
    if (typeof value === 'number' && Number.isFinite(value)) {
      continue;
    }
    return true;
  }
  return false;
}

function geometryExceedsMaximumAxisSpan(
  geometry: unknown,
  maximumAxisSpan: number
): boolean {
  const positionArray = (
    geometry as {
      attributes?: {
        position?: {
          array?: ArrayLike<unknown>;
          itemSize?: unknown;
        };
      };
    }
  )?.attributes?.position?.array;
  if (!positionArray || typeof positionArray.length !== 'number') {
    return false;
  }
  const itemSize = getGeometryPositionItemSize(geometry);
  if (itemSize < 3) {
    return false;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (
    let index = 0;
    index <= positionArray.length - itemSize;
    index += itemSize
  ) {
    const x = positionArray[index];
    const y = positionArray[index + 1];
    const z = positionArray[index + 2];
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof z !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      return false;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return (
    maxX - minX > maximumAxisSpan ||
    maxY - minY > maximumAxisSpan ||
    maxZ - minZ > maximumAxisSpan
  );
}

function getGeometryPositionItemSize(geometry: unknown): number {
  const itemSize = (
    geometry as {
      attributes?: {
        position?: {
          itemSize?: unknown;
        };
      };
    }
  )?.attributes?.position?.itemSize;
  return typeof itemSize === 'number' && itemSize > 0 ? itemSize : 3;
}

function getGeometryTriangleCount(geometry: unknown): number {
  const indexCount = getGeometryIndexCount(geometry);
  if (indexCount > 0) {
    return Math.floor(indexCount / 3);
  }
  return Math.floor(getGeometryVertexCount(geometry) / 3);
}

function geometryIsUltraDenseWithinTinyBounds(
  geometry: unknown,
  {
    maximumAxisSpan,
    minimumTriangleCount,
  }: {
    maximumAxisSpan: number;
    minimumTriangleCount: number;
  }
): boolean {
  const triangleCount = getGeometryTriangleCount(geometry);
  if (triangleCount < minimumTriangleCount) {
    return false;
  }
  const bounds = getGeometryAxisAlignedBounds(geometry);
  if (!bounds) {
    return false;
  }
  const occupiedSpan = Math.max(bounds.spanX, bounds.spanY, bounds.spanZ);
  if (occupiedSpan <= 0.000001) {
    return false;
  }
  return (
    bounds.spanX <= maximumAxisSpan &&
    bounds.spanY <= maximumAxisSpan &&
    bounds.spanZ <= maximumAxisSpan
  );
}

function hasInvalidGeometryIndexType(geometry: unknown): boolean {
  const vertexCount = getGeometryVertexCount(geometry);
  const indexArray = (
    geometry as {
      index?: {
        array?: ArrayLike<unknown> & { BYTES_PER_ELEMENT?: number };
      };
    }
  )?.index?.array;
  if (
    !indexArray ||
    typeof indexArray.length !== 'number' ||
    vertexCount <= 0
  ) {
    return false;
  }
  const bytesPerElement =
    typeof indexArray.BYTES_PER_ELEMENT === 'number'
      ? indexArray.BYTES_PER_ELEMENT
      : undefined;
  if (vertexCount <= 0xff) {
    return false;
  }
  if (vertexCount <= 0xffff) {
    return bytesPerElement === 1;
  }
  return bytesPerElement != null && bytesPerElement < 4;
}

function getGeometryGroupCount(geometry: unknown): number {
  const groups = (
    geometry as {
      groups?: unknown;
    }
  )?.groups;
  return Array.isArray(groups) ? groups.length : 0;
}

function getGeometryDrawRangeCount(geometry: unknown): number {
  const drawRange = (
    geometry as {
      drawRange?: {
        start?: unknown;
        count?: unknown;
      };
    }
  )?.drawRange;
  if (
    typeof drawRange?.start === 'number' &&
    typeof drawRange?.count === 'number' &&
    Number.isFinite(drawRange.start) &&
    Number.isFinite(drawRange.count) &&
    drawRange.count >= 0
  ) {
    return 1;
  }
  return 0;
}

function getGeometryAxisAlignedBounds(geometry: unknown): {
  spanX: number;
  spanY: number;
  spanZ: number;
} | null {
  const positionArray = (
    geometry as {
      attributes?: {
        position?: {
          array?: ArrayLike<unknown>;
          itemSize?: unknown;
        };
      };
    }
  )?.attributes?.position?.array;
  if (!positionArray || typeof positionArray.length !== 'number') {
    return null;
  }
  const itemSize = getGeometryPositionItemSize(geometry);
  if (itemSize < 3) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (
    let index = 0;
    index <= positionArray.length - itemSize;
    index += itemSize
  ) {
    const x = positionArray[index];
    const y = positionArray[index + 1];
    const z = positionArray[index + 2];
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof z !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      return null;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return {
    spanX: maxX - minX,
    spanY: maxY - minY,
    spanZ: maxZ - minZ,
  };
}

function getGeometryAttributeNames(geometry: unknown): string[] {
  return Object.keys(
    (
      geometry as {
        attributes?: Record<string, unknown>;
      }
    )?.attributes ?? {}
  );
}

function getGeometryVertexAttributeByteSize(geometry: unknown): number {
  const attributes = (
    geometry as {
      attributes?: Record<
        string,
        { array?: ArrayLike<unknown> & { byteLength?: number } }
      >;
    }
  )?.attributes;
  let totalBytes = 0;
  for (const attribute of Object.values(attributes ?? {})) {
    totalBytes += getArrayLikeByteLength(attribute?.array);
  }
  return totalBytes;
}

function traverseSceneGraph(
  root: TraversableObjectLike,
  callback: (child: TraversableObjectLike) => void
): void {
  const visit = (node: TraversableObjectLike) => {
    callback(node);
    const children = (node.children ?? []) as TraversableObjectLike[];
    for (const child of children) {
      visit(child);
    }
  };
  visit(root);
}

function isLineObjectType(type: string): boolean {
  return type === 'Line' || type === 'LineLoop' || type === 'LineSegments';
}

function isTriangleGeometryObjectType(type: string): boolean {
  return type.endsWith('Mesh');
}

function getArrayLikeByteLength(
  arrayLike: (ArrayLike<unknown> & { byteLength?: number }) | undefined
): number {
  if (!arrayLike) {
    return 0;
  }
  if (typeof arrayLike.byteLength === 'number') {
    return arrayLike.byteLength;
  }
  if (typeof arrayLike.length !== 'number') {
    return 0;
  }
  return arrayLike.length * 4;
}
