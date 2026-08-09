import { describe, expect, it } from 'vitest';
import { getTextureMemoryEstimateBytes } from './texture-memory-estimate.ts';

describe('texture memory estimate', () => {
  it('estimates decoded rgba texture bytes without mipmaps', () => {
    expect(
      getTextureMemoryEstimateBytes({
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
      getTextureMemoryEstimateBytes({
        image: {
          width: 32,
          height: 16,
        },
      })
    ).toBe(2731);
  });

  it('returns zero when a texture has no usable dimensions', () => {
    expect(getTextureMemoryEstimateBytes({})).toBe(0);
    expect(
      getTextureMemoryEstimateBytes({
        image: {
          width: 0,
          height: 16,
        },
      })
    ).toBe(0);
  });
});
