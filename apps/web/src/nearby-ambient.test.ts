import { describe, expect, it } from 'vitest';
import {
  findNearbyAmbientProfile,
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
