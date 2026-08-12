import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { syncVisibleTerrainChunkMeshes } from './visible-terrain-chunk-meshes.ts';

describe('visible terrain chunk meshes', () => {
  it('reuses one shared material instance for compatible chunk renderables', () => {
    const root = new THREE.Group();
    const createMaterial = vi.fn(() => new THREE.MeshBasicMaterial());

    syncVisibleTerrainChunkMeshes(
      root,
      [
        createRenderable('0:0', 'cache-a', 'bucket-shared'),
        createRenderable('1:0', 'cache-b', 'bucket-shared'),
      ],
      {
        createMaterial,
      }
    );

    expect(createMaterial).toHaveBeenCalledTimes(1);
    expect(root.children).toHaveLength(2);
    const first = root.children[0] as THREE.Mesh;
    const second = root.children[1] as THREE.Mesh;
    expect(first.material).toBe(second.material);
    expect(first.userData).toMatchObject({
      visibleTerrainChunk: true,
      chunkKey: '0:0',
      materialBucketKey: 'bucket-shared',
    });
  });

  it('reuses mesh identity across repeated syncs and disposes stale bucket materials', () => {
    const root = new THREE.Group();
    const disposed: string[] = [];
    const createMaterial = vi.fn(
      (renderable: { materialBucketKey: string }) => {
        const material = new THREE.MeshBasicMaterial();
        material.dispose = vi.fn(() => {
          disposed.push(renderable.materialBucketKey);
        });
        return material;
      }
    );

    syncVisibleTerrainChunkMeshes(
      root,
      [
        createRenderable('0:0', 'cache-a', 'bucket-a'),
        createRenderable('1:0', 'cache-b', 'bucket-b'),
      ],
      {
        createMaterial,
      }
    );

    const firstMesh = root.children[0] as THREE.Mesh;
    const secondMesh = root.children[1] as THREE.Mesh;

    syncVisibleTerrainChunkMeshes(
      root,
      [createRenderable('1:0', 'cache-b', 'bucket-b')],
      {
        createMaterial,
      }
    );

    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(secondMesh);
    expect(root.children[0]).not.toBe(firstMesh);
    expect(disposed).toEqual(['bucket-a']);
    expect(createMaterial).toHaveBeenCalledTimes(2);

    syncVisibleTerrainChunkMeshes(
      root,
      [createRenderable('1:0', 'cache-b', 'bucket-b')],
      {
        createMaterial,
      }
    );

    expect(root.children[0]).toBe(secondMesh);
    expect(createMaterial).toHaveBeenCalledTimes(2);
  });
});

function createRenderable(
  key: string,
  cacheKey: string,
  materialBucketKey: string
) {
  return {
    key,
    cacheKey,
    chunkX: Number(key.split(':')[0]),
    chunkY: Number(key.split(':')[1]),
    geometry: new THREE.BufferGeometry(),
    materialBucketKey,
    materialBucketChunkIds: [key],
  };
}
