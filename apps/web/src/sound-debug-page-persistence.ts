import { createDebouncedPersistence } from './debounced-persistence.ts';
import {
  loadHmrState,
  saveHmrState,
  type HmrStateContext,
} from './hmr-state.ts';
import { normalizeSoundDebugPresetId } from './sound-debug.ts';

const SOUND_DEBUG_PAGE_STORAGE_KEY = 'bworlds:sound-debug-page';

export type SoundDebugPagePersistenceState = {
  presetId: string;
  scrollY: number;
};

export type SoundDebugPagePersistenceStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>;

export function createSoundDebugPagePersistenceController(options: {
  storage: SoundDebugPagePersistenceStorage | null;
  key?: string;
  debounceDelayMs?: number;
  hmr?: HmrStateContext | null;
  hmrKey?: string;
}): {
  save(state: SoundDebugPagePersistenceState): void;
  flush(): void;
} {
  const key = options.key ?? SOUND_DEBUG_PAGE_STORAGE_KEY;
  const hmrKey = options.hmrKey ?? key;
  let pendingState: SoundDebugPagePersistenceState | null = null;
  const debouncedPersistence = createDebouncedPersistence(() => {
    if (!options.storage || !pendingState) {
      return;
    }
    options.storage.setItem(key, JSON.stringify(pendingState));
  }, options.debounceDelayMs ?? 120);

  return {
    save(state) {
      pendingState = normalizeSoundDebugPagePersistenceState(state);
      saveHmrState(options.hmr, hmrKey, pendingState);
      debouncedPersistence.schedule();
    },
    flush() {
      debouncedPersistence.flush();
    },
  };
}

export function loadSoundDebugPagePersistenceState(
  storage: SoundDebugPagePersistenceStorage | null,
  key = SOUND_DEBUG_PAGE_STORAGE_KEY,
  hmr?: HmrStateContext | null,
  hmrKey = key
): SoundDebugPagePersistenceState | null {
  const hmrState = loadHmrState<SoundDebugPagePersistenceState>(hmr, hmrKey);
  if (hmrState) {
    return normalizeSoundDebugPagePersistenceState(hmrState);
  }
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return normalizeSoundDebugPagePersistenceState(
      JSON.parse(raw) as Partial<SoundDebugPagePersistenceState>
    );
  } catch {
    return null;
  }
}

function normalizeSoundDebugPagePersistenceState(
  value: Partial<SoundDebugPagePersistenceState> | null | undefined
): SoundDebugPagePersistenceState {
  return {
    presetId: normalizeSoundDebugPresetId(value?.presetId),
    scrollY: Math.max(0, Math.round(value?.scrollY ?? 0)),
  };
}
