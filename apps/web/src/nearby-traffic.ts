type TrafficPosition = { x: number; y: number };

type TrafficTileLike = {
  x: number;
  y: number;
  progress?: number;
};

type TrafficStateLike = {
  player: { x: number; y: number };
  getCurrentTile(x: number, y: number): Record<string, unknown>;
};

export type NearbyTrafficProfile = {
  progress?: number;
  emitter: TrafficPosition;
};

export function findNearestTrafficProfile<TTraffic extends TrafficTileLike>(options: {
  state: TrafficStateLike;
  centerX: number;
  centerY: number;
  searchRadius: number;
  selectTraffic(tile: Record<string, unknown>): TTraffic | undefined;
}): NearbyTrafficProfile | null {
  const { state, centerX, centerY, searchRadius, selectTraffic } = options;
  let best:
    | null
    | {
        distance: number;
        progress?: number;
        emitter: TrafficPosition;
      } = null;

  for (let y = centerY - searchRadius; y <= centerY + searchRadius; y += 1) {
    for (let x = centerX - searchRadius; x <= centerX + searchRadius; x += 1) {
      const traffic = selectTraffic(state.getCurrentTile(x, y));
      if (!traffic) {
        continue;
      }
      const distance = Math.hypot(state.player.x - x, state.player.y - y);
      if (best && distance >= best.distance) {
        continue;
      }
      best = {
        distance,
        progress: traffic.progress,
        emitter: { x, y },
      };
    }
  }

  return best
    ? {
        progress: best.progress,
        emitter: best.emitter,
      }
    : null;
}
