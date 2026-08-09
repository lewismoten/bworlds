import { normalizeAngle } from '@bworlds/core';

export type OverworldTravelStateLike = {
  stack: Array<{
    id: string;
    label?: string;
    type?: string;
    depth: number;
    origin?: { x: number; y: number };
    [key: string]: unknown;
  }>;
  player: {
    x: number;
    y: number;
    facing: number;
  };
};

export function resetStateToOverworld(
  state: OverworldTravelStateLike,
  destination: { x: number; y: number },
  facing = state.player.facing
): void {
  state.stack = [
    {
      id: 'overworld',
      label: 'Overworld',
      type: 'overworld',
      depth: 0,
      origin: { x: 0, y: 0 },
    },
  ];
  state.player.x = destination.x;
  state.player.y = destination.y;
  state.player.facing = normalizeAngle(facing);
}
