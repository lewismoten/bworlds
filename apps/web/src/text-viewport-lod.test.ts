import { describe, expect, it, vi } from 'vitest';

import type { TextViewportGrid } from '@bworlds/render2d';

import {
  annotateTextViewportGridWithVisibleTileLods,
  formatVisibleTileLodAnnotation,
} from './text-viewport-lod.ts';

describe('text viewport lod annotations', () => {
  it('formats compact rendered lod labels for text viewport tiles', () => {
    expect(formatVisibleTileLodAnnotation('full')).toBe('F');
    expect(formatVisibleTileLodAnnotation('low')).toBe('L');
    expect(formatVisibleTileLodAnnotation('')).toBeUndefined();
    expect(formatVisibleTileLodAnnotation(null)).toBeUndefined();
  });

  it('annotates text viewport cells with the renderer visible-tile lod state', () => {
    const grid: TextViewportGrid = {
      rows: [
        [
          {
            glyph: '@',
            color: '#ffbf69',
            kind: 'player',
            worldX: 4,
            worldY: 7,
          },
          {
            glyph: '^',
            color: '#cbd5e1',
            kind: 'mountain',
            worldX: 5,
            worldY: 7,
          },
        ],
      ],
      centerColumn: 0,
      centerRow: 0,
    };
    const renderer3d = {
      getVisibleTileDebugInfo: vi.fn((worldX: number, worldY: number) => {
        if (worldX === 4 && worldY === 7) {
          return { renderedDetailLevel: 'full' };
        }
        if (worldX === 5 && worldY === 7) {
          return { renderedDetailLevel: 'low' };
        }
        return null;
      }),
    };

    expect(
      annotateTextViewportGridWithVisibleTileLods(grid, renderer3d as never)
    ).toEqual({
      ...grid,
      rows: [
        [
          {
            ...grid.rows[0]![0],
            annotation: 'F',
          },
          {
            ...grid.rows[0]![1],
            annotation: 'L',
          },
        ],
      ],
    });
  });
});
