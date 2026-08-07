import { describe, expect, it } from 'vitest';
import {
  composeTilePainter,
  createPlainsBackedTilePainter,
  paintPlainsBackdrop,
} from './index.ts';

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

  it('creates plains-backed tile painters that add custom foreground details', () => {
    const calls: Array<[number, number, number, number, string]> = [];
    const paint = createPlainsBackedTilePainter(
      ({ context, x, y, fillRect }: any) => {
        fillRect(context, x + 4, y + 5, 3, 2, '#123456');
      }
    );

    expect(
      paint({
        context: {} as CanvasRenderingContext2D,
        kind: 'spec',
        definition: {
          name: 'Spec',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0,
        },
        x: 2,
        y: 3,
        motif: {
          seed: 7,
          int(min: number) {
            return min;
          },
        },
        tilePixelSize: 16,
        fillRect(_context, x, y, width, height, color) {
          calls.push([x, y, width, height, color]);
        },
        speckle() {},
      })
    ).toBe(true);

    expect(calls[0]).toEqual([2, 3, 16, 16, '#7fb069']);
    expect(calls).toContainEqual([6, 8, 3, 2, '#123456']);
  });

  it('composes tile painters so overlays can reuse a shared base painter', () => {
    const calls: string[] = [];
    const paint = composeTilePainter(
      () => {
        calls.push('base');
        return true;
      },
      () => {
        calls.push('overlay');
        return true;
      }
    );

    expect(
      paint({
        context: {} as CanvasRenderingContext2D,
        kind: 'spec',
        definition: {
          name: 'Spec',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0,
        },
        x: 0,
        y: 0,
        motif: {
          seed: 1,
          int(min: number) {
            return min;
          },
        },
        tilePixelSize: 16,
        fillRect() {},
        speckle() {},
      })
    ).toBe(true);

    expect(calls).toEqual(['base', 'overlay']);
  });
});
