import type { ThreeObject3DLike } from './types';

export const RENDER_PARTICLE_EMITTER_USER_DATA_KEY = 'renderParticleEmitter';

export interface RenderParticleEmitterMetadata {
  particleCount?: number;
  label?: string;
}

type RenderParticleEmitterTarget = Pick<ThreeObject3DLike, 'userData'>;

export function markRenderParticleEmitter<TTarget extends RenderParticleEmitterTarget>(
  target: TTarget,
  metadata: RenderParticleEmitterMetadata = {}
): TTarget {
  target.userData = {
    ...(target.userData ?? {}),
    [RENDER_PARTICLE_EMITTER_USER_DATA_KEY]: {
      ...(typeof metadata.particleCount === 'number'
        ? { particleCount: metadata.particleCount }
        : {}),
      ...(typeof metadata.label === 'string' ? { label: metadata.label } : {}),
    },
  };
  return target;
}

export function getRenderParticleEmitterMetadata(
  target: RenderParticleEmitterTarget | null | undefined
): RenderParticleEmitterMetadata | null {
  const metadata = target?.userData?.[RENDER_PARTICLE_EMITTER_USER_DATA_KEY];
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const particleCount = (metadata as { particleCount?: unknown }).particleCount;
  const label = (metadata as { label?: unknown }).label;
  if (
    particleCount != null &&
    (typeof particleCount !== 'number' || !Number.isFinite(particleCount))
  ) {
    return null;
  }
  return {
    ...(typeof particleCount === 'number' ? { particleCount } : {}),
    ...(typeof label === 'string' ? { label } : {}),
  };
}

export function hasRenderParticleEmitterMetadata(
  target: RenderParticleEmitterTarget | null | undefined
): boolean {
  return target?.userData?.[RENDER_PARTICLE_EMITTER_USER_DATA_KEY] != null;
}
