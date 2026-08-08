import { describe, expect, it } from 'vitest';
import {
  createTreasureMap,
  createTreasureMapInventoryItem,
  renderTreasureMapRows,
} from './index.ts';

describe('treasure map support', () => {
  it('builds a deterministic hand-drawn map with a path and off-center dig site', () => {
    const sampleOverworld = (x: number, y: number) => {
      if (x <= 8) {
        return { kind: 'ocean' };
      }
      if (y <= 6) {
        return { kind: 'forest' };
      }
      if (x >= 16) {
        return { kind: 'mountain' };
      }
      return { kind: 'plains' };
    };

    const first = createTreasureMap({
      seed: 'treasure-seed',
      digSite: { x: 14, y: 9 },
      sampleOverworld,
      width: 15,
      height: 11,
    });
    const second = createTreasureMap({
      seed: 'treasure-seed',
      digSite: { x: 14, y: 9 },
      sampleOverworld,
      width: 15,
      height: 11,
    });

    expect(second).toEqual(first);
    expect(first.gpsLabel).toMatch(/^N9 E\d+$/);
    expect(first.gpsLabel).not.toBe('N9 E14');
    expect(first.path.at(-1)).toEqual({ x: 14, y: 9 });
    expect(
      Math.hypot(
        first.pathEntry.x - first.digSite.x,
        first.pathEntry.y - first.digSite.y
      )
    ).toBeGreaterThanOrEqual(3);
    expect(first.rows.join('\n')).toContain('X');

    const digCell = first.cells.find((cell) => cell.isDigSite);
    expect(digCell).toBeDefined();
    expect(digCell?.x).not.toBe(Math.floor(first.width / 2));
  });

  it('renders path markers across the sketch and preserves the map on inventory items', () => {
    const map = createTreasureMap({
      seed: 'treasure-seed',
      digSite: { x: -4, y: 6 },
      sampleOverworld(x, y) {
        if (x < -4) {
          return { kind: 'river' };
        }
        if (y > 6) {
          return { kind: 'road' };
        }
        return { kind: 'plains' };
      },
      width: 13,
      height: 9,
    });

    const rows = renderTreasureMapRows(map);
    const item = createTreasureMapInventoryItem({
      id: 'treasure:one',
      map,
    });

    expect(rows.some((row) => row.includes(':') || row.includes('#'))).toBe(true);
    expect(item).toEqual(
      expect.objectContaining({
        id: 'treasure:one',
        kind: 'treasure-map',
        treasureMap: map,
      })
    );
  });
});
