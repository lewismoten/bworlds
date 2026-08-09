export type HmrStateStore = Record<string, unknown>;

export type HmrStateContext = {
  data: HmrStateStore;
};

export function loadHmrState<T>(
  hot: HmrStateContext | null | undefined,
  key: string
): T | null {
  if (!hot || !(key in hot.data)) {
    return null;
  }
  return (hot.data[key] as T | null) ?? null;
}

export function saveHmrState<T>(
  hot: HmrStateContext | null | undefined,
  key: string,
  value: T
): T {
  if (hot) {
    hot.data[key] = value;
  }
  return value;
}
