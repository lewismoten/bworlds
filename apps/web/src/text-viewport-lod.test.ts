import { describe, expect, it, vi } from 'vitest';

import type { TextViewportGrid } from '@bworlds/render2d';

import {
  annotateTextViewportGridWithVisibleTileLods,
  formatVisibleTileLodAnnotation,
} from './text-viewport-lod.ts';

describe('text viewport lod annotations', () => {
  it('formats compact rendered lod labels for text viewport tiles', () => {
    expect(
      formatVisibleTileLodAnnotation({ renderedDetailLevel: 'full' })
    ).toBe('F');
    expect(formatVisibleTileLodAnnotation({ renderedDetailLevel: 'low' })).toBe(
      'L'
    );
    expect(
      formatVisibleTileLodAnnotation({ renderedDetailLevel: '' })
    ).toBeUndefined();
    expect(formatVisibleTileLodAnnotation(null)).toBeUndefined();
  });

  it('formats cached availability labels when that mode is enabled', () => {
    expect(
      formatVisibleTileLodAnnotation(
        { renderedDetailLevel: 'full', cachedDetailLevel: 'full' },
        { showCachedAvailability: true }
      )
    ).toBe('CF');
    expect(
      formatVisibleTileLodAnnotation(
        { renderedDetailLevel: 'low', cachedDetailLevel: 'low' },
        { showCachedAvailability: true }
      )
    ).toBe('CL');
    expect(
      formatVisibleTileLodAnnotation(
        { renderedDetailLevel: 'full', cachedDetailLevel: null },
        { showCachedAvailability: true }
      )
    ).toBeUndefined();
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
          return { renderedDetailLevel: 'full', cachedDetailLevel: 'full' };
        }
        if (worldX === 5 && worldY === 7) {
          return { renderedDetailLevel: 'low', cachedDetailLevel: 'low' };
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

  it('can switch annotations to cached model availability labels', () => {
    const grid: TextViewportGrid = {
      rows: [
        [
          {
            glyph: '.',
            color: '#84cc16',
            kind: 'plains',
            worldX: 1,
            worldY: 2,
          },
          {
            glyph: '^',
            color: '#cbd5e1',
            kind: 'mountain',
            worldX: 2,
            worldY: 2,
          },
        ],
      ],
      centerColumn: 0,
      centerRow: 0,
    };
    const renderer3d = {
      getVisibleTileDebugInfo: vi.fn((worldX: number) => {
        if (worldX === 1) {
          return { renderedDetailLevel: 'full', cachedDetailLevel: 'low' };
        }
        return { renderedDetailLevel: 'low', cachedDetailLevel: null };
      }),
    };

    expect(
      annotateTextViewportGridWithVisibleTileLods(grid, renderer3d as never, {
        showCachedAvailability: true,
      })
    ).toEqual({
      ...grid,
      rows: [
        [
          {
            ...grid.rows[0]![0],
            annotation: 'CL',
          },
          {
            ...grid.rows[0]![1],
            annotation: undefined,
          },
        ],
      ],
    });
  });
});
