import { describe, expect, it } from 'vitest';

import {
  getTextureDimensions,
  getTexturePixelCount,
} from './texture-dimension-stats.ts';

describe('texture dimension stats', () => {
  it('reads texture dimensions from image width and height', () => {
    expect(
      getTextureDimensions({
        image: {
          width: 64,
          height: 32,
        },
      })
    ).toEqual({
      width: 64,
      height: 32,
    });
    expect(
      getTexturePixelCount({
        image: {
          width: 64,
          height: 32,
        },
      })
    ).toBe(2048);
  });

  it('falls back to video dimensions and ignores invalid values', () => {
    expect(
      getTextureDimensions({
        image: {
          videoWidth: 1920,
          videoHeight: 1080,
        },
      })
    ).toEqual({
      width: 1920,
      height: 1080,
    });

    expect(
      getTextureDimensions({
        image: {
          width: -4,
          height: Number.NaN,
        },
      })
    ).toEqual({
      width: 0,
      height: 0,
    });
    expect(getTexturePixelCount({ image: { width: 0, height: 12 } })).toBe(0);
  });
});
