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
        listener: { x: 0, y: 0 },
      })
    );
    expect((layers[0]?.cadenceMultiplier ?? 0) > 0).toBe(true);
    expect((layers[0]?.volumeMultiplier ?? 0) > 0).toBe(true);
    expect(layers[1]).toEqual(
      expect.objectContaining({
        kind: 'ocean',
        intensity: 0.58,
      })
    );
    expect((layers[1]?.cadenceMultiplier ?? 0) > 1.18).toBe(true);
    expect(layers[1]?.signature).toContain('terrain:forest');
    expect(layers[0]?.signature).not.toBe(layers[1]?.signature);
  });

  it('lets nearby terrain subtly influence the primary ambient layer', () => {
    const isolatedForest = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.9,
        emitter: { x: 2, y: 0 },
      },
      listener: { x: 0, y: 0 },
      nowMs: 0,
    })[0];
    const coastalForest = resolveAmbientPlaybackLayers({
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
    })[0];

    expect(coastalForest?.cadenceMultiplier).toBeLessThan(
      isolatedForest?.cadenceMultiplier ?? Infinity
    );
    expect(coastalForest?.volumeMultiplier).toBeGreaterThan(
      isolatedForest?.volumeMultiplier ?? 0
    );
    expect(coastalForest?.signature).not.toBe(isolatedForest?.signature);
  });

  it('varies ambience according to altitude', () => {
    const lowForest = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.8,
        altitude: 0.02,
        emitter: { x: 2, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.5,
      yearProgress: 0.5,
    })[0];
    const highForest = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.8,
        altitude: 0.32,
        emitter: { x: 2, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.5,
      yearProgress: 0.5,
    })[0];
    const highMountain = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'mountain',
        intensity: 0.8,
        altitude: 0.32,
        emitter: { x: 6, y: 0 },
      },
      nowMs: 0,
    })[0];

    expect(highForest?.cadenceMultiplier).toBeGreaterThan(
      lowForest?.cadenceMultiplier ?? 0
    );
    expect(highForest?.volumeMultiplier).toBeLessThan(
      lowForest?.volumeMultiplier ?? Infinity
    );
    expect(highMountain?.volumeMultiplier).toBeGreaterThan(1);
    expect(highMountain?.signature).toContain('altitude:');
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

  it('shifts forest ambience from dawn birds to quieter nocturnal wildlife', () => {
    const dawn = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.24,
      yearProgress: 0.5,
    })[0];
    const night = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.92,
      yearProgress: 0.5,
    })[0];

    expect(['dawn-birds', 'nearby-birds', 'distant-birds']).toContain(
      dawn?.identityVariant
    );
    expect(['night-crickets', 'owl', 'animal-calls']).toContain(
      night?.identityVariant
    );
    expect((night?.volumeMultiplier ?? 0) < (dawn?.volumeMultiplier ?? 0)).toBe(
      true
    );
    expect(
      (night?.cadenceMultiplier ?? 0) > (dawn?.cadenceMultiplier ?? 0)
    ).toBe(true);
  });

  it('changes settlement ambience across dawn, day, evening, and night', () => {
    const dawn = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.24,
    })[0];
    const day = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.5,
    })[0];
    const dusk = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.8,
    })[0];
    const night = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.92,
    })[0];

    expect(dawn?.identityVariant).toBe('rooster-bells');
    expect(day?.identityVariant).toBe('market');
    expect(dusk?.identityVariant).toBe('tavern');
    expect(night?.identityVariant).toBe('quiet-lanterns');
    expect((night?.volumeMultiplier ?? 0) < (day?.volumeMultiplier ?? 0)).toBe(
      true
    );
  });

  it('changes plains and forest ambience with the season', () => {
    const springForest = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 3, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.5,
      yearProgress: 0.2,
    })[0];
    const summerPlains = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'plains',
        intensity: 0.7,
        emitter: { x: 5, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.5,
      yearProgress: 0.5,
    })[0];
    const winterForest = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 3, y: 0 },
      },
      nowMs: 0,
      dayProgress: 0.5,
      yearProgress: 0,
    })[0];

    expect(['spring-frogs', 'wildlife']).toContain(
      springForest?.identityVariant
    );
    expect(['summer-insects', 'nearby-birds', 'distant-birds']).toContain(
      summerPlains?.identityVariant
    );
    expect(['winter-quiet', 'mystery-hint']).toContain(
      winterForest?.identityVariant
    );
    expect(
      (winterForest?.volumeMultiplier ?? 0) <
        (springForest?.volumeMultiplier ?? 0)
    ).toBe(true);
  });

  it('introduces rarer migration, splash, and mystery variants for living ambient events', () => {
    const autumnForest = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 7, y: 0 },
      },
      nowMs: 2_200,
      dayProgress: 0.24,
      yearProgress: 0.7,
    })[0];
    const river = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'river',
        intensity: 0.7,
        emitter: { x: 8, y: 0 },
      },
      nowMs: 2_200,
    })[0];
    const ruins = resolveAmbientPlaybackLayers({
      profile: {
        kind: 'ruins',
        intensity: 0.7,
        emitter: { x: 9, y: 0 },
      },
      nowMs: 4_400,
      dayProgress: 0.92,
      yearProgress: 0.7,
    })[0];

    expect(
      ['dawn-birds', 'migrating-birds', 'vegetation-rustle'].includes(
        autumnForest?.identityVariant ?? ''
      )
    ).toBe(true);
    expect(['current', 'water-splashes']).toContain(river?.identityVariant);
    expect(['mystery-hint', 'landmark-hint', 'migrating-birds']).toContain(
      ruins?.identityVariant
    );
  });
});
