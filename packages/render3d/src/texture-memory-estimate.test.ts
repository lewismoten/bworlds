import { describe, expect, it } from 'vitest';
import {
  getDecodedTextureMemoryEstimateBytes,
  getGpuTextureMemoryEstimateBytes,
  getTextureMemoryEstimateBytes,
} from './texture-memory-estimate.ts';

describe('texture memory estimate', () => {
  it('estimates decoded rgba texture bytes without mipmaps', () => {
    expect(
      getDecodedTextureMemoryEstimateBytes({
        image: {
          width: 32,
          height: 16,
        },
        generateMipmaps: false,
      })
    ).toBe(2048);
  });

  it('includes mipmap overhead by default', () => {
    expect(
      getDecodedTextureMemoryEstimateBytes({
        image: {
          width: 32,
          height: 16,
        },
      })
    ).toBe(2731);
  });

  it('returns zero when a texture has no usable dimensions', () => {
    expect(getDecodedTextureMemoryEstimateBytes({})).toBe(0);
    expect(
      getDecodedTextureMemoryEstimateBytes({
        image: {
          width: 0,
          height: 16,
        },
      })
    ).toBe(0);
  });

  it('tracks gpu texture bytes separately from decoded texture bytes', () => {
    const texture = {
      image: {
        width: 32,
        height: 16,
      },
    };

    expect(getGpuTextureMemoryEstimateBytes(texture)).toBe(2731);
    expect(getTextureMemoryEstimateBytes(texture)).toBe(
      getDecodedTextureMemoryEstimateBytes(texture)
    );
  });
});
