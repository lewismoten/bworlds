export function createRandomDebugCoordinate(random = Math.random): number {
  return Math.round((random() * 2 - 1) * 9_999);
}

export function randomizeDebugCoordinatePair<
  TOptions extends {
    x: number;
    y: number;
  },
>(options: TOptions, random = Math.random): TOptions {
  return {
    ...options,
    x: createRandomDebugCoordinate(random),
    y: createRandomDebugCoordinate(random),
  };
}
