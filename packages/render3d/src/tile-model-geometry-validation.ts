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
