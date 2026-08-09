import { getTextureDimensions } from './texture-dimension-stats.ts';

export function getTextureMemoryEstimateBytes(texture: unknown): number {
  const { width, height } = getTextureDimensions(texture);
  if (width <= 0 || height <= 0) {
    return 0;
  }

  const baseBytes = width * height * 4;
  const usesMipmaps = (texture as { generateMipmaps?: boolean }).generateMipmaps !== false;
  return usesMipmaps ? Math.round((baseBytes * 4) / 3) : baseBytes;
}
