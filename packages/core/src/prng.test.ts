import { createRandom } from './prng.ts';
import { describe, expect, it } from 'vitest';

describe('createRandom', () => {
  it('returns values in [0, 1)', () => {
    const random = createRandom(12345);
    for (let index = 0; index < 10_000; index += 1) {
      const value = random();
      if (value < 0 || value >= 1) {
        throw new Error(`Value ${value} at index ${index} is outside [0, 1)`);
      }
    }
  });

  it('produces the same sequence for the same seed', () => {
    const a = createRandom(12345);
    const b = createRandom(12345);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = createRandom(12345);
    const b = createRandom(54321);

    const valuesA = Array.from({ length: 20 }, () => a());
    const valuesB = Array.from({ length: 20 }, () => b());

    expect(valuesA).not.toEqual(valuesB);
  });

  it('normalizes negative seeds as uint32 values', () => {
    const a = createRandom(-1);
    const b = createRandom(0xffffffff);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('wraps seeds larger than uint32', () => {
    const a = createRandom(0x100000000);
    const b = createRandom(0);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('wraps uint32 overflow consistently', () => {
    const a = createRandom(0x100000001);
    const b = createRandom(1);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('truncates fractional seeds through uint32 coercion', () => {
    const a = createRandom(123.999);
    const b = createRandom(123);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('treats NaN as zero', () => {
    const a = createRandom(NaN);
    const b = createRandom(0);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('treats positive infinity as zero', () => {
    const a = createRandom(Infinity);
    const b = createRandom(0);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('treats negative infinity as zero', () => {
    const a = createRandom(-Infinity);
    const b = createRandom(0);

    for (let index = 0; index < 100; index += 1) {
      expect(a()).toBe(b());
    }
  });

  it('does not return the same value repeatedly', () => {
    const random = createRandom(12345);
    const values = new Set(Array.from({ length: 100 }, () => random()));

    expect(values.size).toBeGreaterThan(90);
  });

  it('advances internal state on every call', () => {
    const random = createRandom(12345);

    const first = random();
    const second = random();
    const third = random();

    expect(second).not.toBe(first);
    expect(third).not.toBe(second);
  });
});
