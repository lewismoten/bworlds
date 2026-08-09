import type { RenderBudgetDetailLevel } from '@bworlds/plugin-api';

const FULL_DETAIL_DRAW_CALL_WARNING_MIN_DRAW_CALLS = 16;
const LOW_DETAIL_DRAW_CALL_WARNING_MIN_DRAW_CALLS = 12;
const FULL_DETAIL_DRAW_CALL_WARNING_MIN_TRIANGLES_PER_DRAW_CALL = 8;
const LOW_DETAIL_DRAW_CALL_WARNING_MIN_TRIANGLES_PER_DRAW_CALL = 6;
const FULL_DETAIL_MATERIAL_GROUP_WARNING_MIN_GROUPS = 6;
const LOW_DETAIL_MATERIAL_GROUP_WARNING_MIN_GROUPS = 3;
const FULL_DETAIL_MATERIAL_GROUP_WARNING_MIN_TRIANGLES_PER_GROUP = 48;
const LOW_DETAIL_MATERIAL_GROUP_WARNING_MIN_TRIANGLES_PER_GROUP = 32;

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

export function getTileModelPerformanceWarnings(
  stats: {
    drawCallCount: number;
    triangleCount: number;
    maxGeometryGroupCount: number;
  },
  detailLevel: RenderBudgetDetailLevel = 'full'
): string[] {
  const warnings = [
    getTileModelDrawCallRatioWarning(stats, detailLevel),
    getTileModelMaterialGroupWarning(stats, detailLevel),
  ];

  return warnings.filter((warning): warning is string => typeof warning === 'string');
}
