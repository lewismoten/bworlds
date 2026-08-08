import { describe, expect, it, vi } from 'vitest';
import {
  attemptAutoEnterOverworldPoi,
  shouldAutoEnterOnArrival,
} from './overworld-auto-enter.ts';

describe('overworld auto enter', () => {
  it('auto-enters a town after arriving on its overworld tile', () => {
    const interact = vi.fn(() => true);
    const state = {
      player: { x: 4, y: 6, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'town', poi: { type: 'town', name: 'Oakcross' } };
      },
      getCurrentMap() {
        return {
          getAction() {
            return {
              type: 'enter',
              context: {
                id: 'town:4:6:0',
                label: 'Oakcross',
                type: 'town',
                depth: 1,
                origin: { x: 4, y: 6 },
              },
              spawn: { x: 0, y: 11 },
            };
          },
        };
      },
      interact,
    };

    expect(attemptAutoEnterOverworldPoi(state as never)).toBe(true);
    expect(interact).toHaveBeenCalledTimes(1);
  });

  it('does not auto-enter non-town arrivals or non-enter actions', () => {
    const interact = vi.fn(() => true);
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'plains', poi: { type: 'cave', name: 'Moss Hollow' } };
      },
      getCurrentMap() {
        return {
          getAction() {
            return {
              type: 'enter',
              context: {
                id: 'cave:0:0:0',
                label: 'Moss Hollow',
                type: 'cave',
                depth: 1,
                origin: { x: 0, y: 0 },
              },
            };
          },
        };
      },
      interact,
    };

    expect(
      shouldAutoEnterOnArrival(state as never, {
        type: 'enter',
        context: { type: 'cave' },
      } as never)
    ).toBe(false);
    expect(attemptAutoEnterOverworldPoi(state as never)).toBe(false);
    expect(interact).not.toHaveBeenCalled();
  });
});
