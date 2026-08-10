
export function createPlayer(
  overrides: {
    x?: number;
    y?: number;
    facing?: number;
  } = {}
) {
  return {
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    facing: overrides.facing ?? 0,
  };
}
