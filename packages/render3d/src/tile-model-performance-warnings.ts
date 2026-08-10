import type { RenderBudgetDetailLevel } from '@bworlds/plugin-api';

const FULL_DETAIL_DRAW_CALL_WARNING_MIN_DRAW_CALLS = 16;
const LOW_DETAIL_DRAW_CALL_WARNING_MIN_DRAW_CALLS = 12;
const FULL_DETAIL_DRAW_CALL_WARNING_MIN_TRIANGLES_PER_DRAW_CALL = 8;
const LOW_DETAIL_DRAW_CALL_WARNING_MIN_TRIANGLES_PER_DRAW_CALL = 6;
const FULL_DETAIL_MATERIAL_GROUP_WARNING_MIN_GROUPS = 6;
const LOW_DETAIL_MATERIAL_GROUP_WARNING_MIN_GROUPS = 3;
const FULL_DETAIL_MATERIAL_GROUP_WARNING_MIN_TRIANGLES_PER_GROUP = 48;
const LOW_DETAIL_MATERIAL_GROUP_WARNING_MIN_TRIANGLES_PER_GROUP = 32;
const FULL_DETAIL_TINY_MESH_WARNING_MIN_MESHES = 12;
const LOW_DETAIL_TINY_MESH_WARNING_MIN_MESHES = 6;
const FULL_DETAIL_TINY_MESH_WARNING_MIN_MATERIALS = 4;
const LOW_DETAIL_TINY_MESH_WARNING_MIN_MATERIALS = 2;
const FULL_DETAIL_TINY_MESH_WARNING_MIN_TRIANGLES_PER_MESH = 24;
const LOW_DETAIL_TINY_MESH_WARNING_MIN_TRIANGLES_PER_MESH = 16;
const TINY_MESH_WARNING_MAX_SHARED_MATERIAL_RATIO = 0.5;
const FULL_DETAIL_INSTANCING_WARNING_MIN_MESHES = 12;
const LOW_DETAIL_INSTANCING_WARNING_MIN_MESHES = 6;
const FULL_DETAIL_INSTANCING_WARNING_MIN_SHARED_GEOMETRY = 6;
const LOW_DETAIL_INSTANCING_WARNING_MIN_SHARED_GEOMETRY = 3;
const FULL_DETAIL_INSTANCING_WARNING_MIN_RENDERABLES = 12;
const LOW_DETAIL_INSTANCING_WARNING_MIN_RENDERABLES = 6;
const INSTANCING_WARNING_MAX_INSTANCED_RATIO = 0.25;
const FULL_DETAIL_PER_INSTANCE_MATERIAL_WARNING_MIN_MESHES = 10;
const LOW_DETAIL_PER_INSTANCE_MATERIAL_WARNING_MIN_MESHES = 5;
const PER_INSTANCE_MATERIAL_WARNING_MIN_UNIQUE_MATERIAL_RATIO = 0.8;
const PER_INSTANCE_MATERIAL_WARNING_MAX_SHARED_MATERIAL_RATIO = 0.25;
const FULL_DETAIL_EQUIVALENT_MATERIAL_WARNING_MIN_COUNT = 3;
const LOW_DETAIL_EQUIVALENT_MATERIAL_WARNING_MIN_COUNT = 2;
const FULL_DETAIL_COLOR_VARIANT_MATERIAL_WARNING_MIN_COUNT = 3;
const LOW_DETAIL_COLOR_VARIANT_MATERIAL_WARNING_MIN_COUNT = 2;

export function getTileModelDrawCallRatioWarning(
  {
    drawCallCount,
    triangleCount,
  }: {
    drawCallCount: number;
    triangleCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumDrawCalls =
    detailLevel === 'low'
      ? LOW_DETAIL_DRAW_CALL_WARNING_MIN_DRAW_CALLS
      : FULL_DETAIL_DRAW_CALL_WARNING_MIN_DRAW_CALLS;
  if (drawCallCount < minimumDrawCalls) {
    return null;
  }

  const minimumTrianglesPerDrawCall =
    detailLevel === 'low'
      ? LOW_DETAIL_DRAW_CALL_WARNING_MIN_TRIANGLES_PER_DRAW_CALL
      : FULL_DETAIL_DRAW_CALL_WARNING_MIN_TRIANGLES_PER_DRAW_CALL;
  const trianglesPerDrawCall =
    drawCallCount > 0 ? triangleCount / drawCallCount : 0;
  if (trianglesPerDrawCall >= minimumTrianglesPerDrawCall) {
    return null;
  }

  return `drawCallCount ${drawCallCount} for triangleCount ${triangleCount} (${trianglesPerDrawCall.toFixed(1)} triangles/draw call)`;
}

export function getTileModelMaterialGroupWarning(
  {
    maxGeometryGroupCount,
    triangleCount,
  }: {
    maxGeometryGroupCount: number;
    triangleCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumGroups =
    detailLevel === 'low'
      ? LOW_DETAIL_MATERIAL_GROUP_WARNING_MIN_GROUPS
      : FULL_DETAIL_MATERIAL_GROUP_WARNING_MIN_GROUPS;
  if (maxGeometryGroupCount < minimumGroups) {
    return null;
  }

  const minimumTrianglesPerGroup =
    detailLevel === 'low'
      ? LOW_DETAIL_MATERIAL_GROUP_WARNING_MIN_TRIANGLES_PER_GROUP
      : FULL_DETAIL_MATERIAL_GROUP_WARNING_MIN_TRIANGLES_PER_GROUP;
  const trianglesPerGroup =
    maxGeometryGroupCount > 0 ? triangleCount / maxGeometryGroupCount : 0;
  if (trianglesPerGroup >= minimumTrianglesPerGroup) {
    return null;
  }

  return `maxGeometryGroupCount ${maxGeometryGroupCount} for triangleCount ${triangleCount} (${trianglesPerGroup.toFixed(1)} triangles/group)`;
}

export function getTileModelTinyMeshWarning(
  {
    meshCount,
    materialCount,
    sharedMaterialCount,
    triangleCount,
  }: {
    meshCount: number;
    materialCount: number;
    sharedMaterialCount: number;
    triangleCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumMeshes =
    detailLevel === 'low'
      ? LOW_DETAIL_TINY_MESH_WARNING_MIN_MESHES
      : FULL_DETAIL_TINY_MESH_WARNING_MIN_MESHES;
  if (meshCount < minimumMeshes) {
    return null;
  }

  const minimumMaterials =
    detailLevel === 'low'
      ? LOW_DETAIL_TINY_MESH_WARNING_MIN_MATERIALS
      : FULL_DETAIL_TINY_MESH_WARNING_MIN_MATERIALS;
  if (materialCount < minimumMaterials) {
    return null;
  }

  const minimumTrianglesPerMesh =
    detailLevel === 'low'
      ? LOW_DETAIL_TINY_MESH_WARNING_MIN_TRIANGLES_PER_MESH
      : FULL_DETAIL_TINY_MESH_WARNING_MIN_TRIANGLES_PER_MESH;
  const trianglesPerMesh = meshCount > 0 ? triangleCount / meshCount : 0;
  if (trianglesPerMesh >= minimumTrianglesPerMesh) {
    return null;
  }

  const sharedMaterialRatio =
    meshCount > 0 ? sharedMaterialCount / meshCount : 0;
  if (sharedMaterialRatio > TINY_MESH_WARNING_MAX_SHARED_MATERIAL_RATIO) {
    return null;
  }

  return `meshCount ${meshCount} with materialCount ${materialCount} and sharedMaterialCount ${sharedMaterialCount} for triangleCount ${triangleCount} (${trianglesPerMesh.toFixed(1)} triangles/mesh)`;
}

export function getTileModelInstancingWarning(
  {
    meshCount,
    instancedMeshCount,
    renderedInstanceCount,
    sharedGeometryCount,
  }: {
    meshCount: number;
    instancedMeshCount: number;
    renderedInstanceCount: number;
    sharedGeometryCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumMeshes =
    detailLevel === 'low'
      ? LOW_DETAIL_INSTANCING_WARNING_MIN_MESHES
      : FULL_DETAIL_INSTANCING_WARNING_MIN_MESHES;
  if (meshCount < minimumMeshes) {
    return null;
  }

  const minimumSharedGeometry =
    detailLevel === 'low'
      ? LOW_DETAIL_INSTANCING_WARNING_MIN_SHARED_GEOMETRY
      : FULL_DETAIL_INSTANCING_WARNING_MIN_SHARED_GEOMETRY;
  if (sharedGeometryCount < minimumSharedGeometry) {
    return null;
  }

  const renderableCount = meshCount + renderedInstanceCount;
  const minimumRenderables =
    detailLevel === 'low'
      ? LOW_DETAIL_INSTANCING_WARNING_MIN_RENDERABLES
      : FULL_DETAIL_INSTANCING_WARNING_MIN_RENDERABLES;
  if (renderableCount < minimumRenderables) {
    return null;
  }

  const instancedRatio =
    renderableCount > 0 ? renderedInstanceCount / renderableCount : 0;
  if (instancedRatio > INSTANCING_WARNING_MAX_INSTANCED_RATIO) {
    return null;
  }

  return `meshCount ${meshCount} with sharedGeometryCount ${sharedGeometryCount} and instancedMeshCount ${instancedMeshCount} (renderedInstanceCount ${renderedInstanceCount}) suggests instancing repeated parts`;
}

export function getTileModelPerInstanceMaterialWarning(
  {
    meshCount,
    materialCount,
    sharedMaterialCount,
  }: {
    meshCount: number;
    materialCount: number;
    sharedMaterialCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumMeshes =
    detailLevel === 'low'
      ? LOW_DETAIL_PER_INSTANCE_MATERIAL_WARNING_MIN_MESHES
      : FULL_DETAIL_PER_INSTANCE_MATERIAL_WARNING_MIN_MESHES;
  if (meshCount < minimumMeshes) {
    return null;
  }

  const uniqueMaterialRatio = meshCount > 0 ? materialCount / meshCount : 0;
  if (
    uniqueMaterialRatio <
    PER_INSTANCE_MATERIAL_WARNING_MIN_UNIQUE_MATERIAL_RATIO
  ) {
    return null;
  }

  const sharedMaterialRatio =
    meshCount > 0 ? sharedMaterialCount / meshCount : 0;
  if (
    sharedMaterialRatio >
    PER_INSTANCE_MATERIAL_WARNING_MAX_SHARED_MATERIAL_RATIO
  ) {
    return null;
  }

  return `materialCount ${materialCount} for meshCount ${meshCount} with sharedMaterialCount ${sharedMaterialCount} suggests per-instance materials`;
}

export function getTileModelEquivalentMaterialWarning(
  {
    clonedMaterialCount,
    materialCount,
  }: {
    clonedMaterialCount: number;
    materialCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumCount =
    detailLevel === 'low'
      ? LOW_DETAIL_EQUIVALENT_MATERIAL_WARNING_MIN_COUNT
      : FULL_DETAIL_EQUIVALENT_MATERIAL_WARNING_MIN_COUNT;
  if (clonedMaterialCount < minimumCount) {
    return null;
  }
  return `clonedMaterialCount ${clonedMaterialCount} across materialCount ${materialCount} suggests equivalent materials could be shared`;
}

export function getTileModelColorVariantMaterialWarning(
  {
    colorVariantMaterialCount,
    materialCount,
  }: {
    colorVariantMaterialCount: number;
    materialCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string | null {
  const minimumCount =
    detailLevel === 'low'
      ? LOW_DETAIL_COLOR_VARIANT_MATERIAL_WARNING_MIN_COUNT
      : FULL_DETAIL_COLOR_VARIANT_MATERIAL_WARNING_MIN_COUNT;
  if (colorVariantMaterialCount < minimumCount) {
    return null;
  }
  return `colorVariantMaterialCount ${colorVariantMaterialCount} across materialCount ${materialCount} suggests instance, vertex, or uniform color variation instead of separate materials`;
}

export function getTileModelPerformanceWarnings(
  stats: {
    drawCallCount: number;
    triangleCount: number;
    maxGeometryGroupCount: number;
    meshCount: number;
    instancedMeshCount: number;
    renderedInstanceCount: number;
    materialCount: number;
    sharedMaterialCount: number;
    clonedMaterialCount: number;
    colorVariantMaterialCount: number;
    sharedGeometryCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string[] {
  const warnings = [
    getTileModelDrawCallRatioWarning(stats, detailLevel),
    getTileModelMaterialGroupWarning(stats, detailLevel),
    getTileModelTinyMeshWarning(stats, detailLevel),
    getTileModelInstancingWarning(stats, detailLevel),
    getTileModelPerInstanceMaterialWarning(stats, detailLevel),
    getTileModelEquivalentMaterialWarning(stats, detailLevel),
    getTileModelColorVariantMaterialWarning(stats, detailLevel),
  ];

  return warnings.filter(
    (warning): warning is string => typeof warning === 'string'
  );
}
