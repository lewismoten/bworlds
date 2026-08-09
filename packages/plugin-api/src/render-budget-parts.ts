import type { ThreeObject3DLike } from './types';

export const RENDER_BUDGET_PART_USER_DATA_KEY = 'renderBudgetPart';

export interface RenderBudgetPartMetadata {
  optional: boolean;
  priority: number;
  label?: string;
}

type RenderBudgetPartTarget = Pick<ThreeObject3DLike, 'userData'>;

export function setRenderBudgetPartMetadata<TTarget extends RenderBudgetPartTarget>(
  target: TTarget,
  metadata: RenderBudgetPartMetadata
): TTarget {
  target.userData = {
    ...(target.userData ?? {}),
    [RENDER_BUDGET_PART_USER_DATA_KEY]: {
      optional: metadata.optional,
      priority: metadata.priority,
      ...(typeof metadata.label === 'string' ? { label: metadata.label } : {}),
    },
  };
  return target;
}

export function getRenderBudgetPartMetadata(
  target: RenderBudgetPartTarget | null | undefined
): RenderBudgetPartMetadata | null {
  const metadata = getRawRenderBudgetPartMetadata(target);
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const optional = (metadata as { optional?: unknown }).optional;
  const priority = (metadata as { priority?: unknown }).priority;
  const label = (metadata as { label?: unknown }).label;
  if (optional !== true && optional !== false) {
    return null;
  }
  if (typeof priority !== 'number' || !Number.isFinite(priority)) {
    return null;
  }
  return {
    optional,
    priority,
    ...(typeof label === 'string' ? { label } : {}),
  };
}

export function hasRenderBudgetPartMetadata(
  target: RenderBudgetPartTarget | null | undefined
): boolean {
  return getRawRenderBudgetPartMetadata(target) != null;
}

function getRawRenderBudgetPartMetadata(
  target: RenderBudgetPartTarget | null | undefined
): unknown {
  return target?.userData?.[RENDER_BUDGET_PART_USER_DATA_KEY];
}
