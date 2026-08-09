import {
  appendHashSeedLabel,
  appendHashSeedPart,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  normalizeHash,
  resolveHashSeed,
  registerHashLabel,
} from './hash.ts';
import { describe, expect, it } from 'vitest';

describe("normalizeHash", () => {
  it("maps zero to zero", () => {
    expect(normalizeHash(0)).toBe(0);
  });

  it("keeps the maximum uint32 below one", () => {
    const value = normalizeHash(0xFFFFFFFF);

    expect(value).toBeLessThan(1);
    expect(value).toBe(0xFFFFFFFF / 2 ** 32);
  });

  it("wraps 2^32 back to zero", () => {
    expect(normalizeHash(2 ** 32)).toBe(0);
  });

  it("treats -1 as the maximum uint32", () => {
    expect(normalizeHash(-1)).toBe(0xFFFFFFFF / 2 ** 32);
  });
});

describe('hash seeds', () => {
  it('keeps registered labels deterministic', () => {
    const seedHash = registerHashLabel('seed');

    expect(hash2D(seedHash, 4, 9)).toBe(hash2D(seedHash, 4, 9));
    expect(hash2D(registerHashLabel('seed'), 4, 9)).toBe(hash2D(seedHash, 4, 9));
  });

  it('normalizes numeric seeds at the boundary', () => {
    const seedHash = registerHashLabel('seed');

    expect(createHashSeed(seedHash)).toBe(seedHash >>> 0);
    expect(hash2DWithSeed(seedHash, 4, 9)).toBe(hash2D(seedHash, 4, 9));
  });

  it('resolves string and numeric seeds through one boundary helper', () => {
    const seedHash = registerHashLabel('seed');

    expect(resolveHashSeed('seed')).toBe(seedHash);
    expect(resolveHashSeed(seedHash)).toBe(seedHash >>> 0);
    expect(createHashSeed(0)).toBe(0);
    expect(createHashSeed(0xFFFFFFFF)).toBe(0xFFFFFFFF);
    expect(createHashSeed(0x100000000)).toBe(0);
    expect(createHashSeed(-1)).toBe(0xFFFFFFFF);
  });

  it('keeps composed numeric seed paths deterministic', () => {
    const baseSeed = registerHashLabel('seed');
    const seededHash = appendHashSeedLabel(
      baseSeed,
      registerHashLabel('river-control')
    );
    const nestedSeed = appendHashSeedLabel(
      seededHash,
      registerHashLabel('angle-delta')
    );
    const tileSeed = appendHashSeedPart(baseSeed, -14);

    expect(hash2DWithSeed(seededHash, 4, 9)).toBe(
      hash2DWithSeed(
        appendHashSeedLabel(baseSeed, registerHashLabel('river-control')),
        4,
        9
      )
    );
    expect(hash2DWithSeed(nestedSeed, -12, 7)).toBe(hash2DWithSeed(nestedSeed, -12, 7));
    expect(hash2DWithSeed(appendHashSeedPart(tileSeed, 0), -27, 0)).toBe(
      hash2DWithSeed(appendHashSeedPart(tileSeed, 0), -27, 0)
    );
  });
});
