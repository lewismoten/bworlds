import { describe, expect, it, vi } from 'vitest';

import {
  createTreeDebugPagePersistenceController,
  loadTreeDebugPagePersistenceState,
  normalizeTreeDebugPagePersistenceState,
} from './tree-debug-page-persistence.ts';

describe('tree debug page persistence', () => {
  it('normalizes partial persisted tree page state safely', () => {
    expect(
      normalizeTreeDebugPagePersistenceState({
        scrollY: -12,
        options: {
          tileX: 12.8,
          speciesMode: 'pine',
        },
      })
    ).toEqual(
      expect.objectContaining({
        scrollY: 0,
        options: expect.objectContaining({
          tileX: 13,
          speciesMode: 'pine',
          tileY: 6,
        }),
      })
    );
  });

  it('round-trips tree page state through the storage controller', () => {
    vi.useFakeTimers();
    const saved = new Map<string, string>();
    const hot = { data: {} as Record<string, unknown> };
    const controller = createTreeDebugPagePersistenceController({
      storage: {
        getItem(key) {
          return saved.get(key) ?? null;
        },
        setItem(key, value) {
          saved.set(key, value);
        },
      },
      debounceDelayMs: 60,
      hmr: hot,
    });

    controller.save({
      scrollY: 280,
      options: {
        tileX: -14,
        tileY: 33,
        yearProgress: 0.7,
        detailLevel: 'low',
        consumer: 'gameplay',
        speciesMode: 'birch',
        treeIndex: 4,
      },
    });

    vi.advanceTimersByTime(60);

    expect(
      loadTreeDebugPagePersistenceState(
        {
          getItem(key) {
            return saved.get(key) ?? null;
          },
          setItem() {},
        },
        'bworlds:tree-debug-page',
        hot
      )
    ).toEqual(
      expect.objectContaining({
        scrollY: 280,
        options: expect.objectContaining({
          tileX: -14,
          tileY: 33,
          speciesMode: 'birch',
        }),
      })
    );
  });

  it('prefers hot tree state over stale storage during vite updates', () => {
    const storage = {
      getItem() {
        return JSON.stringify({
          scrollY: 20,
          options: {
            tileX: 1,
            tileY: 2,
            speciesMode: 'oak',
          },
        });
      },
      setItem() {},
    };
    const hot = {
      data: {
        'bworlds:tree-debug-page': {
          scrollY: 280,
          options: {
            tileX: -14,
            tileY: 33,
            yearProgress: 0.7,
            detailLevel: 'low',
            consumer: 'gameplay',
            speciesMode: 'birch',
            treeIndex: 4,
          },
        },
      } as Record<string, unknown>,
    };

    expect(
      loadTreeDebugPagePersistenceState(storage, 'bworlds:tree-debug-page', hot)
    ).toEqual(
      expect.objectContaining({
        scrollY: 280,
        options: expect.objectContaining({
          tileX: -14,
          tileY: 33,
          speciesMode: 'birch',
        }),
      })
    );
  });
});
