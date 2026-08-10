import type * as THREE from 'three';
import { getRenderParticleEmitterMetadata } from '@bworlds/plugin-api';
import {
  getGeometryIndexCount,
  getGeometryVertexCount,
} from './tile-model-geometry-validation.ts';

type TraversableObjectLike = Pick<THREE.Object3D, 'children' | 'type'> & {
  geometry?: unknown;
  material?: unknown;
  castShadow?: boolean;
  isLight?: boolean;
  userData?: Record<string, unknown>;
};

export type TileModelSafetyPrecheckLimits = {
  object3dCount: number;
  groupCount: number;
  meshCount: number;
  instancedMeshCount: number;
  pointsCount: number;
  particleEmitterCount: number;
  lineObjectCount: number;
  spriteCount: number;
  geometryCount: number;
  pointVertexCount: number;
  lineSegmentCount: number;
  indexedVertexCount: number;
  maxGeometryVertexCount: number;
  maxGeometryTriangleCount: number;
  triangleCount: number;
  lightCount: number;
  shadowLightCount: number;
};

export type TileModelSafetyPrecheckStats = {
  object3dCount: number;
  groupCount: number;
  meshCount: number;
  instancedMeshCount: number;
  pointsCount: number;
  particleEmitterCount: number;
  lineObjectCount: number;
  spriteCount: number;
  geometryCount: number;
  pointVertexCount: number;
  lineSegmentCount: number;
  indexedVertexCount: number;
  maxGeometryVertexCount: number;
  maxGeometryTriangleCount: number;
  triangleCount: number;
  lightCount: number;
  shadowLightCount: number;
};

export type TileModelSafetyPrecheckViolation = {
  metric: keyof TileModelSafetyPrecheckLimits;
  actual: number;
  limit: number;
};

export function runTileModelSafetyPrecheck(
  root: TraversableObjectLike,
  limits: TileModelSafetyPrecheckLimits
): {
  exceeded: boolean;
  stats: TileModelSafetyPrecheckStats;
  violations: TileModelSafetyPrecheckViolation[];
} {
  const stats: TileModelSafetyPrecheckStats = {
    object3dCount: 0,
    groupCount: 0,
    meshCount: 0,
    instancedMeshCount: 0,
    pointsCount: 0,
    particleEmitterCount: 0,
    lineObjectCount: 0,
    spriteCount: 0,
    geometryCount: 0,
    pointVertexCount: 0,
    lineSegmentCount: 0,
    indexedVertexCount: 0,
    maxGeometryVertexCount: 0,
    maxGeometryTriangleCount: 0,
    triangleCount: 0,
    lightCount: 0,
    shadowLightCount: 0,
  };
  const geometries = new Set<unknown>();
  const stack: TraversableObjectLike[] = [root];

  while (stack.length > 0) {
    const child = stack.pop() as TraversableObjectLike;
    stats.object3dCount += 1;
    if (child.type === 'Group') {
      stats.groupCount += 1;
    }
    if (child.type === 'InstancedMesh') {
      stats.instancedMeshCount += 1;
    }
    if (child.type === 'Points') {
      stats.pointsCount += 1;
      stats.pointVertexCount += getGeometryVertexCount(child.geometry);
    }
    if (isLineObjectType(child.type)) {
      stats.lineObjectCount += 1;
      const vertexCount = getGeometryVertexCount(child.geometry);
      if (child.type === 'LineSegments') {
        stats.lineSegmentCount += Math.floor(vertexCount / 2);
      } else if (child.type === 'LineLoop') {
        stats.lineSegmentCount += vertexCount > 1 ? vertexCount : 0;
      } else {
        stats.lineSegmentCount += Math.max(0, vertexCount - 1);
      }
    }
    if (child.type === 'Sprite') {
      stats.spriteCount += 1;
    }
    if (child.isLight) {
      stats.lightCount += 1;
      if (child.castShadow) {
        stats.shadowLightCount += 1;
      }
    }
    if (getRenderParticleEmitterMetadata(child)) {
      stats.particleEmitterCount += 1;
    }
    if (child.geometry && child.material) {
      stats.meshCount += 1;
    }
    if (child.geometry && !geometries.has(child.geometry)) {
      geometries.add(child.geometry);
      stats.geometryCount += 1;
      const vertexCount = getGeometryVertexCount(child.geometry);
      stats.maxGeometryVertexCount = Math.max(
        stats.maxGeometryVertexCount,
        vertexCount
      );
      const indexCount = getGeometryIndexCount(child.geometry);
      stats.indexedVertexCount += indexCount;
      if (isTriangleGeometryObjectType(child.type)) {
        const triangleCount =
          indexCount > 0
            ? Math.floor(indexCount / 3)
            : Math.floor(vertexCount / 3);
        stats.maxGeometryTriangleCount = Math.max(
          stats.maxGeometryTriangleCount,
          triangleCount
        );
        stats.triangleCount += triangleCount;
      }
    }

    const violations = collectSafetyViolations(stats, limits);
    if (violations.length > 0) {
      return {
        exceeded: true,
        stats,
        violations,
      };
    }

    const children = child.children as TraversableObjectLike[];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push(children[index]);
    }
  }

  return {
    exceeded: false,
    stats,
    violations: [],
  };
}

function collectSafetyViolations(
  stats: TileModelSafetyPrecheckStats,
  limits: TileModelSafetyPrecheckLimits
): TileModelSafetyPrecheckViolation[] {
  const metrics: Array<keyof TileModelSafetyPrecheckLimits> = [
    'object3dCount',
    'groupCount',
    'meshCount',
    'instancedMeshCount',
    'pointsCount',
    'particleEmitterCount',
    'lineObjectCount',
    'spriteCount',
    'geometryCount',
    'pointVertexCount',
    'lineSegmentCount',
    'indexedVertexCount',
    'maxGeometryVertexCount',
    'maxGeometryTriangleCount',
    'triangleCount',
    'lightCount',
    'shadowLightCount',
  ];

  for (const metric of metrics) {
    const actual = stats[metric];
    const limit = limits[metric];
    if (actual > limit) {
      return [{ metric, actual, limit }];
    }
  }

  return [];
}

function isLineObjectType(type: string): boolean {
  return type === 'Line' || type === 'LineLoop' || type === 'LineSegments';
}

function isTriangleGeometryObjectType(type: string): boolean {
  return type.endsWith('Mesh');
}
