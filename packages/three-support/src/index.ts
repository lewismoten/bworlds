import type { ThreeHostLike, ThreeTextureLike } from '@bworlds/plugin-api';

export function createCanvasTexture(
  three: ThreeHostLike,
  canvas: HTMLCanvasElement,
  options: {
    repeatX?: number;
    repeatY?: number;
    wrap?: boolean;
  } = {}
): ThreeTextureLike {
  const texture = new three.CanvasTexture(canvas);
  texture.colorSpace = three.SRGBColorSpace;
  texture.magFilter = three.NearestFilter;
  texture.minFilter = three.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  if (options.wrap !== false) {
    texture.wrapS = three.RepeatWrapping;
    texture.wrapT = three.RepeatWrapping;
  }

  if (
    typeof options.repeatX === 'number' &&
    typeof options.repeatY === 'number' &&
    texture.repeat
  ) {
    texture.repeat.set(options.repeatX, options.repeatY);
  }

  return texture;
}
