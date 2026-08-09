import { createDebouncedPersistence } from './debounced-persistence.ts';
import {
  loadHmrState,
  saveHmrState,
  type HmrStateContext,
} from './hmr-state.ts';
import {
  normalizeTreeDebugOptions,
  type TreeDebugOptions,
} from './tree-debug.ts';

const TREE_DEBUG_PAGE_STORAGE_KEY = 'bworlds:tree-debug-page';

export type TreeDebugPagePersistenceState = {
  options: TreeDebugOptions;
  scrollY: number;
};

export type TreeDebugPagePersistenceStorage = Pick<
  Storage,
  'getItem' | 'setItem'
>;

export type TreeDebugPagePersistenceController = {
  save(state: TreeDebugPagePersistenceState): void;
  flush(): void;
};

export function createTreeDebugPagePersistenceController(options: {
  storage: TreeDebugPagePersistenceStorage | null;
  key?: string;
  debounceDelayMs?: number;
  hmr?: HmrStateContext | null;
  hmrKey?: string;
}): TreeDebugPagePersistenceController {
  const key = options.key ?? TREE_DEBUG_PAGE_STORAGE_KEY;
  const hmrKey = options.hmrKey ?? key;
  let pendingState: TreeDebugPagePersistenceState | null = null;
  const debouncedPersistence = createDebouncedPersistence(() => {
    if (!options.storage || !pendingState) {
      return;
    }
    options.storage.setItem(key, JSON.stringify(pendingState));
  }, options.debounceDelayMs ?? 120);

  return {
    save(state) {
      pendingState = normalizeTreeDebugPagePersistenceState(state);
      saveHmrState(options.hmr, hmrKey, pendingState);
      debouncedPersistence.schedule();
    },
    flush() {
      debouncedPersistence.flush();
    },
  };
}

export function loadTreeDebugPagePersistenceState(
  storage: TreeDebugPagePersistenceStorage | null,
  key = TREE_DEBUG_PAGE_STORAGE_KEY,
  hmr?: HmrStateContext | null,
  hmrKey = key
): TreeDebugPagePersistenceState | null {
  const hmrState = loadHmrState<TreeDebugPagePersistenceState>(hmr, hmrKey);
  if (hmrState) {
    return normalizeTreeDebugPagePersistenceState(hmrState);
  }
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }
  try {
    return normalizeTreeDebugPagePersistenceState(
      JSON.parse(raw) as Partial<TreeDebugPagePersistenceState>
    );
  } catch {
    return null;
  }
}

export function normalizeTreeDebugPagePersistenceState(
  value:
    | (Partial<Omit<TreeDebugPagePersistenceState, 'options'>> & {
        options?: Partial<TreeDebugOptions>;
      })
    | null
    | undefined
): TreeDebugPagePersistenceState {
  return {
    options: normalizeTreeDebugOptions(value?.options),
    scrollY: Math.max(0, Math.round(value?.scrollY ?? 0)),
  };
}
