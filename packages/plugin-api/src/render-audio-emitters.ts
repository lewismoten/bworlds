import type { ThreeObject3DLike } from './types';

export const RENDER_AUDIO_EMITTER_USER_DATA_KEY = 'renderAudioEmitter';

export interface RenderAudioEmitterMetadata {
  count?: number;
  label?: string;
}

type RenderAudioEmitterTarget = Pick<ThreeObject3DLike, 'userData'>;

export function markRenderAudioEmitter<TTarget extends RenderAudioEmitterTarget>(
  target: TTarget,
  metadata: RenderAudioEmitterMetadata = {}
): TTarget {
  const normalizedCount =
    typeof metadata.count === 'number' && Number.isFinite(metadata.count)
      ? Math.max(1, Math.floor(metadata.count))
      : 1;
  target.userData = {
    ...(target.userData ?? {}),
    [RENDER_AUDIO_EMITTER_USER_DATA_KEY]: {
      count: normalizedCount,
      ...(typeof metadata.label === 'string' ? { label: metadata.label } : {}),
    },
  };
  return target;
}

export function getRenderAudioEmitterMetadata(
  target: RenderAudioEmitterTarget | null | undefined
): RenderAudioEmitterMetadata | null {
  const metadata = target?.userData?.[RENDER_AUDIO_EMITTER_USER_DATA_KEY];
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

export function hasRenderAudioEmitterMetadata(
  target: RenderAudioEmitterTarget | null | undefined
): boolean {
  return target?.userData?.[RENDER_AUDIO_EMITTER_USER_DATA_KEY] != null;
}
