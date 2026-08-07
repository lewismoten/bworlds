import { describe, expect, it } from 'vitest';
import { paintPlainsBackdrop } from './index.ts';

describe('paint support', () => {
  it('paints a plains backdrop through the provided fillRect helper', () => {
    const calls: Array<[number, number, number, number, string]> = [];

    paintPlainsBackdrop({
      context: {} as CanvasRenderingContext2D,
      x: 2,
      y: 3,
      motif: {
        seed: 7,
        int(min) {
          return min;
        },
      },
      fillRect(_context, x, y, width, height, color) {
        calls.push([x, y, width, height, color]);
      },
    });

    expect(calls[0]).toEqual([2, 3, 16, 16, '#7fb069']);
    expect(calls.some((call) => call[4] === '#4f7f3c')).toBe(true);
  });
});
