import { createDebouncedPersistence } from './debounced-persistence.ts';

export type AppBootstrapCallback = () => void | Promise<void>;

export type AppEntryHmrContext = {
  accept(callback: () => void): void;
};

export function registerAppEntryHmr(
  bootstrap: AppBootstrapCallback,
  hot: AppEntryHmrContext | null | undefined
): void {
  if (!hot) {
    return;
  }

  let runningBootstrap: Promise<void> | null = null;
  let rerunRequestedWhileRunning = false;
  const debouncedBootstrap = createDebouncedPersistence(() => {
    if (runningBootstrap) {
      rerunRequestedWhileRunning = true;
      return;
    }
    runningBootstrap = Promise.resolve(bootstrap()).finally(() => {
      runningBootstrap = null;
      if (rerunRequestedWhileRunning) {
        rerunRequestedWhileRunning = false;
        debouncedBootstrap.schedule();
      }
    });
  }, 80);

  hot.accept(() => {
    debouncedBootstrap.schedule();
  });
}
