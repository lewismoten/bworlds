import { describe, expect, it } from 'vitest';

import { resolveAmbientPlaybackLayers } from './ambient-soundscape.ts';

describe('ambient soundscape', () => {
  it('keeps a primary ambient layer and blended secondary layers', () => {
    const layers = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.9,
        emitter: { x: 2, y: 0 },
        blendedLayers: [
          {
            kind: 'ocean',
            intensity: 0.58,
            emitter: { x: 3, y: 0 },
          },
        ],
      },
      listener: { x: 0, y: 0 },
      nowMs: 0,
    });

    expect(layers).toHaveLength(2);
    expect(layers[0]).toEqual(
      expect.objectContaining({
        kind: 'forest',
        intensity: 0.9,
        cadenceMultiplier: 1,
        volumeMultiplier: 1,
        listener: { x: 0, y: 0 },
      })
    );
    expect(layers[1]).toEqual(
      expect.objectContaining({
        kind: 'ocean',
        intensity: 0.58,
        cadenceMultiplier: 1.18,
      })
    );
    expect(layers[0]?.signature).not.toBe(layers[1]?.signature);
  });

  it('cycles biome identity variants over time for repeated ambience', () => {
    const first = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'ocean',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
      },
      nowMs: 0,
    })[0];
    const second = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'ocean',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
      },
      nowMs: 4_500,
    })[0];

    expect(first?.identityVariant).toBeTruthy();
    expect(second?.identityVariant).toBeTruthy();
    expect(first?.identityVariant).not.toBe(second?.identityVariant);
  });
});
