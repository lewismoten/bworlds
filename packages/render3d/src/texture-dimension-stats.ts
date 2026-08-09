export type TextureDimensions = {
  width: number;
  height: number;
};

export function getTextureDimensions(texture: unknown): TextureDimensions {
  const image = (texture as {
    image?: {
      width?: number;
      height?: number;
      videoWidth?: number;
      videoHeight?: number;
    };
  }).image;
  const width = normalizeTextureDimension(image?.width ?? image?.videoWidth);
  const height = normalizeTextureDimension(image?.height ?? image?.videoHeight);
  return {
    width,
    height,
  };
}

export function getTexturePixelCount(texture: unknown): number {
  const { width, height } = getTextureDimensions(texture);
  return width > 0 && height > 0 ? width * height : 0;
}

function normalizeTextureDimension(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}
