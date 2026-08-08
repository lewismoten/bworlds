export type DebouncedPersistenceController = {
  schedule(): void;
  flush(): void;
  pending(): boolean;
};

export function createDebouncedPersistence(
  callback: () => void,
  delayMs = 150
): DebouncedPersistenceController {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  function clearPendingTimer() {
    if (timeoutHandle === null) {
      return;
    }
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }

  function flush() {
    if (timeoutHandle === null) {
      return;
    }
    clearPendingTimer();
    callback();
  }

  return {
    schedule() {
      clearPendingTimer();
      timeoutHandle = setTimeout(() => {
        timeoutHandle = null;
        callback();
      }, delayMs);
    },
    flush,
    pending() {
      return timeoutHandle !== null;
    },
  };
}
