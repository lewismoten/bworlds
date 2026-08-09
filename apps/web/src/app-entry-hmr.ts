export type AppBootstrapCallback = () => void | Promise<void>;

export type AppEntryHmrContext = {
  accept(callback?: () => void): void;
};

export function registerAppEntryHmr(
  _bootstrap: AppBootstrapCallback,
  hot: AppEntryHmrContext | null | undefined
): void {
  if (!hot) {
    return;
  }
  // Keep the shared entrypoint as the HMR boundary without forcing a full
  // bootstrap on every accepted update. The active page module should own its
  // own stateful refresh path so gameplay, scroll position, and debug controls
  // are not torn down for unrelated edits elsewhere in the graph.
  hot.accept(() => {});
}
