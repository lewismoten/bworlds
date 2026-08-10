import { describe, expect, it } from 'vitest';
import {
  createAmbienceDebugPagePersistenceController,
  loadAmbienceDebugPagePersistenceState,
} from './ambience-debug-page-persistence.ts';

describe('ambience debug page persistence', () => {
  it('normalizes saved preset ids and scroll positions', () => {
    const storage = new Map<string, string>();
    const controller = createAmbienceDebugPagePersistenceController({
      storage: {
        getItem(key) {
          return storage.get(key) ?? null;
        },
        setItem(key, value) {
          storage.set(key, value);
        },
      },
    });

    controller.save({
      presetId: 'desert-day',
      scrollY: 42.2,
    });
    controller.flush();

    expect(
      loadAmbienceDebugPagePersistenceState({
        getItem(key) {
          return storage.get(key) ?? null;
        },
        setItem() {},
      })
    ).toEqual({
      presetId: 'desert-day',
      scrollY: 42,
    });
  });
});
