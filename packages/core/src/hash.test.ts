import {
  appendHashSeedLabel,
  appendHashSeedPart,
  createHashSeed,
  hash2D,
  hash2DWithSeed,
  normalizeHash,
  resolveHashSeed,
  registerHashLabel,
  registerHashSeed,
  registerHashSeeds,
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

  it('normalizes numeric seeds through the numeric boundary helper', () => {
    const seedHash = registerHashLabel('seed');

    expect(createHashSeed(0)).toBe(0);
    expect(createHashSeed(0xFFFFFFFF)).toBe(0xFFFFFFFF);
    expect(createHashSeed(0x100000000)).toBe(0);
    expect(createHashSeed(-1)).toBe(0xFFFFFFFF);
    expect(createHashSeed(seedHash)).toBe(seedHash >>> 0);
  });

  it('passes numeric seeds through the shared hash boundary helper', () => {
    expect(resolveHashSeed(0x100000000)).toBe(0);
    expect(resolveHashSeed(-1)).toBe(0xFFFFFFFF);
  });

  it('registers setup-time seeds through the shared hash module cache', () => {
    const labels = registerHashSeeds(['north', 'south'] as const);

    expect(labels.north).toBe(registerHashSeed('north'));
    expect(labels.south).toBe(registerHashSeed('south'));
    expect(hash2D(labels.north, 3, 4)).toBe(hash2D(registerHashLabel('north'), 3, 4));
  });

  it('keeps direct seed registration deterministic', () => {
    expect(registerHashSeed('weather-front')).toBe(registerHashSeed('weather-front'));
    expect(registerHashSeed('weather-front')).not.toBe(registerHashSeed('river-path'));
  });

  it('keeps explicit registered labels deterministic before appending them', () => {
    const baseSeed = registerHashLabel('dock-phase');
    const harborRunnerSeed = registerHashLabel('Harbor Runner');
    const crescentFerrySeed = registerHashLabel('Crescent Ferry');

    expect(appendHashSeedLabel(baseSeed, harborRunnerSeed)).toBe(
      appendHashSeedLabel(baseSeed, harborRunnerSeed)
    );
    expect(appendHashSeedLabel(baseSeed, harborRunnerSeed)).not.toBe(
      appendHashSeedLabel(baseSeed, crescentFerrySeed)
    );
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
