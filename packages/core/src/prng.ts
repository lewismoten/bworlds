const UINT32_RANGE = 2 ** 32;
const SPLITMIX32_INCREMENT = 0x9e3779b9;
const SPLITMIX32_MIX_1 = 0x21f0aaad;
const SPLITMIX32_MIX_2 = 0x735a2d97;

// SplitMix32-style PRNG based on Tommy Ettinger's CC0/public-domain example.
// JavaScript state-coercion fix based on a correction by GitHub user oisyn.
// Intended for deterministic procedural generation; not cryptographically secure.
// See: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c

export function createRandom(seed: number) {
  let state = seed >>> 0;

  return (): number => {
    state = (state + SPLITMIX32_INCREMENT) >>> 0;
    let value = state;
    value ^= value >>> 16;
    value = Math.imul(value, SPLITMIX32_MIX_1);
    value ^= value >>> 15;
    value = Math.imul(value, SPLITMIX32_MIX_2);
    value ^= value >>> 15;
    return (value >>> 0) / UINT32_RANGE;
  };
}
