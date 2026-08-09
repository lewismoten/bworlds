import { describe, expect, it } from 'vitest';
import {
  findNearbyAmbientProfile,
  resolveAmbientBiologicalActivity,
  resolveAmbientSourceDensityThreshold,
  shouldAdvertiseBaseAmbientSource,
} from './nearby-ambient.ts';

describe('nearby ambient', () => {
  it('finds the nearest eligible ambient tile source', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: -1, y: 1 },
        getCurrentTile(x: number, y: number) {
          if (x === -1 && y === 1) {
            return { kind: 'forest' };
          }
          if (x === 4 && y === 0) {
            return { kind: 'ocean' };
          }
          return { kind: 'plains' };
        },
      },
      centerX: -1,
      centerY: 1,
      searchRadius: 0,
    });

    expect(profile).toEqual({
      kind: 'forest',
      intensity: 1,
      emitter: { x: -1, y: 1 },
    });
  });

  it('prefers POI ambience over a base tile when both are audible', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: 0, y: 0 },
        getCurrentTile(x: number, y: number) {
          if (x === 0 && y === 0) {
            return { kind: 'forest' };
          }
          if (x === 2 && y === 0) {
            return { kind: 'plains', poi: { type: 'town' } };
          }
          return { kind: 'plains' };
        },
      },
      centerX: 0,
      centerY: 0,
      searchRadius: 5,
    });

    expect(profile).toEqual({
      kind: 'settlement',
      intensity: expect.closeTo(1 - 2 / 6, 6),
      emitter: { x: 2, y: 0 },
    });
  });

  it('combines dense nearby ambient sources into one stronger profile', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: 2, y: -3 },
        getCurrentTile(x: number, y: number) {
          if (x === 2 && y >= -4 && y <= -2) {
            return { kind: 'forest' };
          }
          return { kind: 'plains' };
        },
      },
      centerX: 2,
      centerY: -3,
      searchRadius: 1,
    });

    expect(profile).toEqual({
      kind: 'forest',
      intensity: 1,
      emitter: { x: 2, y: -3 },
    });
  });

  it('keeps secondary biome layers so ambience can blend across boundaries', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: 2.25, y: -3 },
        getCurrentTile(x: number, y: number) {
          if (x <= 2) {
            return { kind: 'forest' };
          }
          if (x >= 3) {
            return { kind: 'shore' };
          }
          return { kind: 'plains' };
        },
      },
      centerX: 2,
      centerY: -3,
      searchRadius: 1,
    });

    expect(profile).toEqual(
      expect.objectContaining({
        kind: 'forest',
        blendedLayers: [
          expect.objectContaining({
            kind: 'ocean',
          }),
        ],
      })
    );
  });

  it('gives unknown POI types a safe fallback ambience family', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: 4, y: 4 },
        getCurrentTile(x: number, y: number) {
          if (x === 5 && y === 4) {
            return { kind: 'plains', poi: { type: 'skyport' } };
          }
          return { kind: 'plains' };
        },
      },
      centerX: 4,
      centerY: 4,
      searchRadius: 4,
    });

    expect(profile).toEqual({
      kind: 'settlement',
      intensity: expect.closeTo(1 - 1 / 5, 6),
      emitter: { x: 5, y: 4 },
    });
  });

  it('uses deterministic sparse selection for generic base terrain ambience', () => {
    expect(shouldAdvertiseBaseAmbientSource('plains', 0, 0)).toBe(false);
    expect(shouldAdvertiseBaseAmbientSource('plains', 0, 1)).toBe(false);
    expect(shouldAdvertiseBaseAmbientSource('plains', 0, -1)).toBe(true);
    expect(shouldAdvertiseBaseAmbientSource('plains', 0, -1)).toBe(true);
  });

  it('increases source density for biologically active biomes', () => {
    expect(resolveAmbientBiologicalActivity('forest')).toBeGreaterThan(
      resolveAmbientBiologicalActivity('ruins')
    );
    expect(resolveAmbientSourceDensityThreshold('forest')).toBeGreaterThan(
      resolveAmbientSourceDensityThreshold('ruins')
    );
    expect(shouldAdvertiseBaseAmbientSource('forest', -4, -3)).toBe(true);
    expect(shouldAdvertiseBaseAmbientSource('ruins', -4, -3)).toBe(false);
  });

  it('softens base-tile intensity in less active areas', () => {
    const forestProfile = findNearbyAmbientProfile({
      state: {
        player: { x: -11, y: -6 },
        getCurrentTile() {
          return { kind: 'forest' };
        },
      },
      centerX: -11,
      centerY: -6,
      searchRadius: 0,
    });
    const ruinsProfile = findNearbyAmbientProfile({
      state: {
        player: { x: -11, y: -6 },
        getCurrentTile() {
          return { kind: 'ruins' };
        },
      },
      centerX: -11,
      centerY: -6,
      searchRadius: 0,
    });

    expect(forestProfile?.intensity).toBe(1);
    expect(ruinsProfile?.intensity).toBeLessThan(0.7);
  });

  it('maps snow and ice tiles into a dedicated snowfield ambience family', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: -2, y: -4 },
        getCurrentTile(x: number, y: number) {
          if (x === -2 && y === -4) {
            return { kind: 'snow' };
          }
          if (x === -1 && y === -4) {
            return { kind: 'ice' };
          }
          return { kind: 'plains' };
        },
      },
      centerX: -2,
      centerY: -4,
      searchRadius: 1,
    });

    expect(resolveAmbientBiologicalActivity('snowfield')).toBeLessThan(
      resolveAmbientBiologicalActivity('plains')
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: 'snowfield',
      })
    );
  });

  it('maps ashlands tiles into a dedicated volcanic ambience family', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: -1, y: -8 },
        getCurrentTile(x: number, y: number) {
          if (x === -1 && y === -8) {
            return { kind: 'ashlands' };
          }
          return { kind: 'plains' };
        },
      },
      centerX: -1,
      centerY: -8,
      searchRadius: 0,
    });

    expect(resolveAmbientBiologicalActivity('volcanic')).toBeLessThan(
      resolveAmbientBiologicalActivity('mountain')
    );
    expect(profile).toEqual({
      kind: 'volcanic',
      intensity: expect.any(Number),
      emitter: { x: -1, y: -8 },
    });
  });

  it('returns null when no nearby base tiles or POIs advertise ambience', () => {
    const profile = findNearbyAmbientProfile({
      state: {
        player: { x: 0, y: 0 },
        getCurrentTile() {
          return { kind: 'plains' };
        },
      },
      centerX: 0,
      centerY: 0,
      searchRadius: 0,
    });

    expect(profile).toBeNull();
  });
});
