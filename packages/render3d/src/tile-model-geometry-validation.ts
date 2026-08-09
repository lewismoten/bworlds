import type * as THREE from 'three';

type TraversableObjectLike = Pick<THREE.Object3D, 'children' | 'type'> & {
  geometry?: unknown;
};

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
    typeof positionAttribute?.itemSize === 'number' && positionAttribute.itemSize > 0
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

export function getMaxGeometryTriangleCount(root: TraversableObjectLike): number {
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

  for (let index = 0; index <= positionArray.length - itemSize; index += itemSize) {
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
