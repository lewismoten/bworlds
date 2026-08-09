export type PageScrollStateStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function normalizePageScrollY(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

export function loadPersistedPageScrollY(
  storage: PageScrollStateStorage | null,
  key: string
): number {
  if (!storage) {
    return 0;
  }
  const raw = storage.getItem(key);
  if (!raw) {
    return 0;
  }
  try {
    const parsed = JSON.parse(raw) as { scrollY?: unknown };
    return normalizePageScrollY(parsed.scrollY);
  } catch {
    return 0;
  }
}

export function savePersistedPageScrollY(
  storage: PageScrollStateStorage | null,
  key: string,
  scrollY: number
): void {
  if (!storage) {
    return;
  }
  storage.setItem(
    key,
    JSON.stringify({
      scrollY: normalizePageScrollY(scrollY),
    })
  );
}

export function restorePersistedPageScrollY(
  scrollY: number,
  environment: {
    requestAnimationFrame?: typeof globalThis.requestAnimationFrame;
    scrollTo?: typeof globalThis.scrollTo;
    setTimeout?: typeof globalThis.setTimeout;
  } = {}
): void {
  const normalizedScrollY = normalizePageScrollY(scrollY);
  if (normalizedScrollY <= 0) {
    return;
  }
  const schedule =
    environment.requestAnimationFrame?.bind(globalThis) ??
    ((callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 0));
  const scrollTo =
    environment.scrollTo?.bind(globalThis) ??
    globalThis.scrollTo?.bind(globalThis);
  const scheduleTimeout =
    environment.setTimeout?.bind(globalThis) ??
    globalThis.setTimeout?.bind(globalThis);
  if (!scrollTo) {
    return;
  }
  const applyScrollRestore = () => {
    scrollTo(0, normalizedScrollY);
  };
  schedule(() => {
    applyScrollRestore();
    schedule(() => {
      applyScrollRestore();
    });
  });
  scheduleTimeout?.(() => {
    applyScrollRestore();
  }, 48);
}
