import { createDebouncedPersistence } from './debounced-persistence.ts';
import {
  normalizeMusicDebugOptions,
  type MusicDebugOptions,
  type MusicDebugSnapshot,
} from './music-debug.ts';
import { clampMusicDebugPreviewOffset } from './music-debug-transport.ts';

const MUSIC_DEBUG_PAGE_STORAGE_KEY = 'bworlds:music-debug-page';

export type MusicDebugPagePersistenceState = {
  options: MusicDebugOptions;
  loopEnabled: boolean;
  previewOffsetMs: number;
  shouldResume: boolean;
};

export type MusicDebugPagePersistenceStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>;

export type MusicDebugPagePersistenceController = {
  save(state: MusicDebugPagePersistenceState): void;
  flush(): void;
};

export function createMusicDebugPagePersistenceController(options: {
  storage: MusicDebugPagePersistenceStorage | null;
  key?: string;
  debounceDelayMs?: number;
}): MusicDebugPagePersistenceController {
  const key = options.key ?? MUSIC_DEBUG_PAGE_STORAGE_KEY;
  let pendingState: MusicDebugPagePersistenceState | null = null;
  const debouncedPersistence = createDebouncedPersistence(() => {
    if (!options.storage || !pendingState) {
      return;
    }
    options.storage.setItem(
      key,
      JSON.stringify({
        ...pendingState,
        options: normalizeMusicDebugOptions(pendingState.options),
      })
    );
  }, options.debounceDelayMs ?? 120);

  return {
    save(state) {
      pendingState = normalizeMusicDebugPagePersistenceState(state);
      debouncedPersistence.schedule();
    },
    flush() {
      debouncedPersistence.flush();
    },
  };
}

export function loadMusicDebugPagePersistenceState(
  storage: MusicDebugPagePersistenceStorage | null,
  key = MUSIC_DEBUG_PAGE_STORAGE_KEY
): MusicDebugPagePersistenceState | null {
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return normalizeMusicDebugPagePersistenceState(
      JSON.parse(raw) as Partial<MusicDebugPagePersistenceState>
    );
  } catch {
    return null;
  }
}

export function normalizeMusicDebugPagePersistenceState(
  value:
    | (Partial<Omit<MusicDebugPagePersistenceState, 'options'>> & {
        options?: Partial<MusicDebugOptions>;
      })
    | null
    | undefined
): MusicDebugPagePersistenceState {
  return {
    options: normalizeMusicDebugOptions(value?.options),
    loopEnabled: value?.loopEnabled === true,
    previewOffsetMs: Math.max(0, Math.round(value?.previewOffsetMs ?? 0)),
    shouldResume: value?.shouldResume === true,
  };
}

export function resolveMusicDebugPlaybackResumeOffset(options: {
  snapshot: MusicDebugSnapshot;
  previewOffsetMs: number;
}): number {
  const clampedOffsetMs = clampMusicDebugPreviewOffset(
    options.snapshot,
    options.previewOffsetMs
  );
  if (clampedOffsetMs >= options.snapshot.durationMs) {
    return 0;
  }
  return clampedOffsetMs;
}
