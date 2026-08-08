import { describe, expect, it } from 'vitest';
import {
  assembleTreasureMapFragments,
  createTreasureMap,
  createTreasureMapFragmentInventoryItem,
  createTreasureMapInventoryItem,
  renderTreasureMapRows,
  splitTreasureMapIntoFragments,
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

  it('splits a treasure map into deterministic fragments and reassembles them in any order', () => {
    const map = createTreasureMap({
      seed: 'treasure-seed',
      digSite: { x: 22, y: -3 },
      sampleOverworld(x, y) {
        if (x < 20) {
          return { kind: 'forest' };
        }
        if (y < -3) {
          return { kind: 'mountain' };
        }
        return { kind: 'plains' };
      },
      width: 15,
      height: 11,
    });

    const fragments = splitTreasureMapIntoFragments(map, 3);
    const assembly = assembleTreasureMapFragments([
      fragments[2],
      fragments[0],
      fragments[1],
    ]);

    expect(fragments).toHaveLength(3);
    expect(fragments.map((fragment) => fragment.rows.length)).toEqual([4, 4, 3]);
    expect(fragments.filter((fragment) => fragment.gpsLabel)).toHaveLength(1);
    expect(assembly).toEqual({
      complete: true,
      mapId: expect.any(String),
      fragmentCount: 3,
      recoveredRows: map.rows,
      missingFragmentIndices: [],
      gpsLabel: map.gpsLabel,
    });
  });

  it('reports missing fragments and preserves fragment payloads on inventory items', () => {
    const map = createTreasureMap({
      seed: 'treasure-seed',
      digSite: { x: 5, y: 12 },
      sampleOverworld() {
        return { kind: 'plains' };
      },
    });
    const fragments = splitTreasureMapIntoFragments(map, 4);
    const item = createTreasureMapFragmentInventoryItem({
      id: 'treasure:fragment:1',
      fragment: fragments[1],
    });
    const assembly = assembleTreasureMapFragments([
      fragments[3],
      fragments[1],
    ]);

    expect(assembly.complete).toBe(false);
    expect(assembly.missingFragmentIndices).toEqual([0, 2]);
    expect(assembly.recoveredRows).toEqual([
      ...fragments[1].rows,
      ...fragments[3].rows,
    ]);
    expect(item).toEqual(
      expect.objectContaining({
        id: 'treasure:fragment:1',
        kind: 'treasure-map-fragment',
        treasureMapFragment: fragments[1],
      })
    );
  });
});
