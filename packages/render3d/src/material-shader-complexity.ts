import type * as THREE from 'three';

type MaterialLike = THREE.Material & Record<string, unknown>;

export const MATERIAL_SHADER_COMPLEXITY_SIMPLE = 1;
export const MATERIAL_SHADER_COMPLEXITY_LIT = 2;
export const MATERIAL_SHADER_COMPLEXITY_CUSTOM = 3;

export function getMaterialShaderComplexityClass(material: THREE.Material): number {
  const candidate = material as MaterialLike;
  if (usesCustomShaders(candidate)) {
    return MATERIAL_SHADER_COMPLEXITY_CUSTOM;
  }
  if (usesLitMaterialModel(candidate)) {
    return MATERIAL_SHADER_COMPLEXITY_LIT;
  }
  return MATERIAL_SHADER_COMPLEXITY_SIMPLE;
}

export function getMaxMaterialShaderComplexityClass(
  materials: Iterable<THREE.Material>
): number {
  let maxClass = 0;

  for (const material of materials) {
    maxClass = Math.max(maxClass, getMaterialShaderComplexityClass(material));
  }

  return maxClass;
}

function usesCustomShaders(material: MaterialLike): boolean {
  return (
    material.type === 'ShaderMaterial' ||
    material.type === 'RawShaderMaterial' ||
    typeof material.vertexShader === 'string' ||
    typeof material.fragmentShader === 'string'
  );
}

function usesLitMaterialModel(material: MaterialLike): boolean {
  return (
    material.type === 'MeshStandardMaterial' ||
    material.type === 'MeshPhysicalMaterial' ||
    material.type === 'MeshPhongMaterial' ||
    material.type === 'MeshLambertMaterial' ||
    material.type === 'MeshToonMaterial' ||
    material.type === 'MeshMatcapMaterial'
  );
}
