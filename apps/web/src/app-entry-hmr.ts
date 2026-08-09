export type AppBootstrapCallback = () => void | Promise<void>;

export type AppEntryHmrContext = {
  accept(callback: () => void): void;
};

export function registerAppEntryHmr(
  bootstrap: AppBootstrapCallback,
  hot: AppEntryHmrContext | null | undefined
): void {
  hot?.accept(() => {
    void bootstrap();
  });
}
