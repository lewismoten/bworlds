import { describe, expect, it } from 'vitest';
import {
  getMapTileReliefStrength,
  getMapTileSymbolGlyph,
  resolveMapTileSymbolDescriptor,
} from './map-tile-symbols.ts';

describe('map tile symbols', () => {
  it('uses tuned glyphs with a name fallback for unmapped kinds', () => {
    expect(getMapTileSymbolGlyph('mountain', 'Mountain')).toBe('^');
    expect(getMapTileSymbolGlyph('custom-obelisk', 'obelisk')).toBe('O');
    expect(getMapTileSymbolGlyph('', '')).toBe('?');
  });

  it('derives relief strength from shared decorated tile surface heights', () => {
    expect(
      getMapTileReliefStrength({ kind: 'plains', surfaceHeight: 0.18 })
    ).toBeCloseTo(0.5, 1);
    expect(
      getMapTileReliefStrength({ kind: 'mountain', surfaceHeight: 0.3 })
    ).toBe(0);
    expect(getMapTileReliefStrength({ kind: 'plains' })).toBe(0);
  });

  it('derives representative symbol annotations from shared runtime state', () => {
    expect(
      resolveMapTileSymbolDescriptor({
        tile: {
          kind: 'rail',
          train: {
            x: 0,
            y: 0,
            direction: 'forward',
            progress: 0.5,
          },
        },
        tileDefinition: {
          name: 'Rail',
          color: '#475569',
          miniColor: '#94a3b8',
        },
      })
    ).toEqual({
      glyph: '=',
      color: '#94a3b8',
      annotation: 'TRN',
      reliefStrength: 0,
    });

    expect(
      resolveMapTileSymbolDescriptor({
        tile: {
          kind: 'ocean',
          boat: {
            x: 0,
            y: 0,
            direction: 'forward',
            progress: 0.25,
          },
        },
      })
    ).toEqual({
      glyph: '~',
      color: '#d9e8f4',
      annotation: 'BOT',
      reliefStrength: 0,
    });

    expect(
      resolveMapTileSymbolDescriptor({
        tile: {
          kind: 'plains',
          surfaceHeight: 0.2,
        },
      })
    ).toEqual({
      glyph: '.',
      color: '#d9e8f4',
      annotation: 'RLF',
      reliefStrength: expect.closeTo(0.5555555556, 5),
    });
  });
});
