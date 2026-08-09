import type * as THREE from 'three';

export type ObjectMaterialLike = object;

export function getObjectMaterials(
  node: THREE.Object3D & {
    material?: THREE.Material | THREE.Material[];
  }
): THREE.Material[];
export function getObjectMaterials<TMaterial extends ObjectMaterialLike>(
  node: THREE.Object3D & {
    material?: TMaterial | TMaterial[];
  }
): TMaterial[] {
  if (!node.material) {
    return [];
  }
  return Array.isArray(node.material) ? node.material : [node.material];
}

export function collectUniqueObjectMaterials<TMaterial extends ObjectMaterialLike>(
  root: Pick<THREE.Object3D, 'traverse'>
): TMaterial[] {
  const uniqueMaterials = new Set<TMaterial>();

  root.traverse((child) => {
    const renderable = child as THREE.Object3D & {
      material?: TMaterial | TMaterial[];
    };
    for (const material of getObjectMaterials(renderable) as TMaterial[]) {
      uniqueMaterials.add(material);
    }
  });

  return Array.from(uniqueMaterials);
}
