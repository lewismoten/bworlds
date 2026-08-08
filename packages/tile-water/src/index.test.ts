import { describe, expect, it } from 'vitest';
import { isSingleTileRiverCandidate } from './index.ts';

describe('tile water', () => {
  describe('isSingleTileRiverCandidate', () => {
    it('keeps the centerline of a north-south river channel', () => {
      expect(
        isSingleTileRiverCandidate({
          riverSignal: 0.84,
          north: 0.8,
          east: 0.62,
          south: 0.79,
          west: 0.6,
        })
      ).toBe(true);
    });

    it('rejects a shoulder tile in a two-tile-wide river band', () => {
      expect(
        isSingleTileRiverCandidate({
          riverSignal: 0.79,
          north: 0.78,
          east: 0.82,
          south: 0.77,
          west: 0.58,
        })
      ).toBe(false);
    });

    it('keeps turning river bends when the centerline remains strongest', () => {
      expect(
        isSingleTileRiverCandidate({
          riverSignal: 0.81,
          north: 0.77,
          east: 0.76,
          south: 0.55,
          west: 0.54,
        })
      ).toBe(true);
    });

    it('falls back to isolated high-confidence river signals', () => {
      expect(
        isSingleTileRiverCandidate({
          riverSignal: 0.79,
          north: 0.51,
          east: 0.46,
          south: 0.49,
          west: 0.44,
        })
      ).toBe(true);
    });
  });
});
