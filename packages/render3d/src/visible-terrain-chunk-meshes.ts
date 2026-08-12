import * as THREE from 'three';

export type VisibleTerrainChunkMeshRenderable = {
  key: string;
  cacheKey: string;
  chunkX: number;
  chunkY: number;
  geometry: THREE.BufferGeometry;
  materialBucketKey: string;
  materialBucketChunkIds: readonly string[];
};

export function syncVisibleTerrainChunkMeshes(
  root: THREE.Group,
  renderables: Iterable<VisibleTerrainChunkMeshRenderable>,
  deps: {
    createMaterial(
      renderable: VisibleTerrainChunkMeshRenderable
    ): THREE.Material;
  }
): void {
  const nextRenderables = [...renderables];
  const meshCache = getVisibleTerrainChunkMeshCache(root);
  const materialCache = getVisibleTerrainChunkMaterialCache(root);
  const nextMeshKeys = new Set(
    nextRenderables.map((renderable) => renderable.cacheKey)
  );
  const nextMaterialKeys = new Set(
    nextRenderables.map((renderable) => renderable.materialBucketKey)
  );

  for (const [cacheKey, mesh] of meshCache) {
    if (nextMeshKeys.has(cacheKey)) {
      continue;
    }
    root.remove(mesh);
    meshCache.delete(cacheKey);
  }

  for (const [materialBucketKey, material] of materialCache) {
    if (nextMaterialKeys.has(materialBucketKey)) {
      continue;
    }
    material.dispose();
    materialCache.delete(materialBucketKey);
  }

  while (root.children.length > 0) {
    root.remove(root.children[0]!);
  }

  for (const renderable of nextRenderables) {
    let material = materialCache.get(renderable.materialBucketKey);
    if (!material) {
      material = deps.createMaterial(renderable);
      materialCache.set(renderable.materialBucketKey, material);
    }
    let mesh = meshCache.get(renderable.cacheKey);
    if (!mesh) {
      mesh = new THREE.Mesh(renderable.geometry, material);
      mesh.receiveShadow = true;
      meshCache.set(renderable.cacheKey, mesh);
    } else {
      mesh.geometry = renderable.geometry;
      mesh.material = material;
    }
    mesh.userData = {
      ...(mesh.userData ?? {}),
      visibleTerrainChunk: true,
      chunkKey: renderable.key,
      chunkX: renderable.chunkX,
      chunkY: renderable.chunkY,
      materialBucketKey: renderable.materialBucketKey,
      materialBucketChunkIds: [...renderable.materialBucketChunkIds],
    };
    root.add(mesh);
  }
}

function getVisibleTerrainChunkMeshCache(root: THREE.Group) {
  const userData = root.userData as {
    visibleTerrainChunkMeshCache?: Map<string, THREE.Mesh>;
  };
  if (!userData.visibleTerrainChunkMeshCache) {
    userData.visibleTerrainChunkMeshCache = new Map<string, THREE.Mesh>();
  }
  return userData.visibleTerrainChunkMeshCache;
}

function getVisibleTerrainChunkMaterialCache(root: THREE.Group) {
  const userData = root.userData as {
    visibleTerrainChunkMaterialCache?: Map<string, THREE.Material>;
  };
  if (!userData.visibleTerrainChunkMaterialCache) {
    userData.visibleTerrainChunkMaterialCache = new Map<
      string,
      THREE.Material
    >();
  }
  return userData.visibleTerrainChunkMaterialCache;
}
