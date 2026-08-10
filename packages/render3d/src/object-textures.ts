import type * as THREE from 'three';
import { collectMaterialTexturesInto } from './material-texture-collector.ts';
import { getObjectMaterials } from './object-materials.ts';

export function collectUniqueObjectTextures(
  root: Pick<THREE.Object3D, 'traverse'>
): unknown[] {
  const uniqueTextures = new Set<unknown>();
  const materialTexturesBuffer: unknown[] = [];

  root.traverse((child) => {
    const renderable = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
    };
    const materials = getObjectMaterials(renderable);
    for (let index = 0; index < materials.length; index += 1) {
      const textures = collectMaterialTexturesInto(
        materials[index]!,
        materialTexturesBuffer
      );
      for (
        let textureIndex = 0;
        textureIndex < textures.length;
        textureIndex += 1
      ) {
        uniqueTextures.add(textures[textureIndex]);
      }
    }
  });

  return Array.from(uniqueTextures);
}
