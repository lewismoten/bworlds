import type { ThreeObject3DLike } from './types';

export const RENDER_MODEL_ATTACHMENT_USER_DATA_KEY = 'renderModelAttachment';

export interface RenderModelAttachmentMetadata {
  count?: number;
  label?: string;
}

type RenderModelAttachmentTarget = Pick<ThreeObject3DLike, 'userData'>;

export function markRenderModelAttachment<TTarget extends RenderModelAttachmentTarget>(
  target: TTarget,
  metadata: RenderModelAttachmentMetadata = {}
): TTarget {
  const normalizedCount =
    typeof metadata.count === 'number' && Number.isFinite(metadata.count)
      ? Math.max(1, Math.floor(metadata.count))
      : 1;
  target.userData = {
    ...(target.userData ?? {}),
    [RENDER_MODEL_ATTACHMENT_USER_DATA_KEY]: {
      count: normalizedCount,
      ...(typeof metadata.label === 'string' ? { label: metadata.label } : {}),
    },
  };
  return target;
}

export function getRenderModelAttachmentMetadata(
  target: RenderModelAttachmentTarget | null | undefined
): RenderModelAttachmentMetadata | null {
  const metadata = target?.userData?.[RENDER_MODEL_ATTACHMENT_USER_DATA_KEY];
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const count = (metadata as { count?: unknown }).count;
  const label = (metadata as { label?: unknown }).label;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 1) {
    return null;
  }
  return {
    count: Math.floor(count),
    ...(typeof label === 'string' ? { label } : {}),
  };
}

export function hasRenderModelAttachmentMetadata(
  target: RenderModelAttachmentTarget | null | undefined
): boolean {
  return target?.userData?.[RENDER_MODEL_ATTACHMENT_USER_DATA_KEY] != null;
}
