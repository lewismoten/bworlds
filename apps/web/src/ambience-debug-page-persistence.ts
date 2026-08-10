import { createDebouncedPersistence } from './debounced-persistence.ts';
import {
  loadHmrState,
  saveHmrState,
  type HmrStateContext,
} from './hmr-state.ts';
import { normalizeAmbienceDebugPresetId } from './ambience-debug.ts';

const AMBIENCE_DEBUG_PAGE_STORAGE_KEY = 'bworlds:ambience-debug-page';

export type AmbienceDebugPagePersistenceState = {
  presetId: string;
  scrollY: number;
};

export type AmbienceDebugPagePersistenceStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>;

export function createAmbienceDebugPagePersistenceController(options: {
  storage: AmbienceDebugPagePersistenceStorage | null;
  key?: string;
  debounceDelayMs?: number;
  hmr?: HmrStateContext | null;
  hmrKey?: string;
}): {
  save(state: AmbienceDebugPagePersistenceState): void;
  flush(): void;
} {
  const key = options.key ?? AMBIENCE_DEBUG_PAGE_STORAGE_KEY;
  const hmrKey = options.hmrKey ?? key;
  let pendingState: AmbienceDebugPagePersistenceState | null = null;
  const debouncedPersistence = createDebouncedPersistence(() => {
    if (!options.storage || !pendingState) {
      return;
    }
    options.storage.setItem(key, JSON.stringify(pendingState));
  }, options.debounceDelayMs ?? 120);

  return {
    save(state) {
      pendingState = normalizeAmbienceDebugPagePersistenceState(state);
      saveHmrState(options.hmr, hmrKey, pendingState);
      debouncedPersistence.schedule();
    },
    flush() {
      debouncedPersistence.flush();
    },
  };
}

export function loadAmbienceDebugPagePersistenceState(
  storage: AmbienceDebugPagePersistenceStorage | null,
  key = AMBIENCE_DEBUG_PAGE_STORAGE_KEY,
  hmr?: HmrStateContext | null,
  hmrKey = key
): AmbienceDebugPagePersistenceState | null {
  const hmrState = loadHmrState<AmbienceDebugPagePersistenceState>(hmr, hmrKey);
  if (hmrState) {
    return normalizeAmbienceDebugPagePersistenceState(hmrState);
  }
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return normalizeAmbienceDebugPagePersistenceState(
      JSON.parse(raw) as Partial<AmbienceDebugPagePersistenceState>
    );
  } catch {
    return null;
  }
}

function normalizeAmbienceDebugPagePersistenceState(
  value: Partial<AmbienceDebugPagePersistenceState> | null | undefined
): AmbienceDebugPagePersistenceState {
  return {
    presetId: normalizeAmbienceDebugPresetId(value?.presetId),
    scrollY: Math.max(0, Math.round(value?.scrollY ?? 0)),
  };
}
