import { describe, expect, it } from 'vitest';
import { resetStateToOverworld } from './overworld-travel.ts';

describe('overworld travel', () => {
  it('resets nested poi context stacks before teleporting to the overworld', () => {
    const state = {
      stack: [
        {
          id: 'overworld',
          label: 'Overworld',
          type: 'overworld',
          depth: 0,
          origin: { x: 0, y: 0 },
        },
        {
          id: 'town:4:5',
          label: 'Oakcross',
          type: 'town',
          depth: 1,
          origin: { x: 4, y: 5 },
          returnTo: { x: 4, y: 5, facing: 0 },
        },
        {
          id: 'building:inn',
          label: 'Oakcross Inn',
          type: 'building',
          depth: 2,
          origin: { x: 1, y: 2 },
          returnTo: { x: 1, y: 4, facing: Math.PI / 2 },
        },
      ],
      player: {
        x: 2,
        y: 2,
        facing: Math.PI * 3,
      },
    };

    resetStateToOverworld(state, { x: 28, y: -14 });

    expect(state.stack).toEqual([
      {
        id: 'overworld',
        label: 'Overworld',
        type: 'overworld',
        depth: 0,
        origin: { x: 0, y: 0 },
      },
    ]);
    expect(state.player).toEqual({
      x: 28,
      y: -14,
      facing: Math.PI,
    });
  });

  it('allows callers to replace the facing direction when resetting to overworld', () => {
    const state = {
      stack: [{ id: 'town:1:1', depth: 1 }],
      player: {
        x: 0,
        y: 0,
        facing: 0,
      },
    };

    resetStateToOverworld(state, { x: 3, y: 9 }, -Math.PI / 2);

    expect(state.player.facing).toBe(Math.PI * 1.5);
  });
});
