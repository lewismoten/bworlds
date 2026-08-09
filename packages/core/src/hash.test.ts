import { normalizeHash } from "./hash";
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