import { getTownNpcPlacements } from '@bworlds/town-support';
import type { WorldStateLike } from '@bworlds/plugin-api';

type DebugWorldStateLike = Pick<WorldStateLike, 'getCurrentContext' | 'timeMs'>;

export function getActiveNpcCount(state: DebugWorldStateLike): number {
  const context = state.getCurrentContext();
  if (
    (context.type !== 'town' && context.type !== 'building') ||
    typeof context.origin?.x !== 'number' ||
    typeof context.origin?.y !== 'number'
  ) {
    return 0;
  }

  return getTownNpcPlacements(
    context.origin.x,
    context.origin.y,
    state.timeMs ?? 0
  ).length;
}
