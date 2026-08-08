import { describe, expect, it } from 'vitest';
import { getInteractionPrompt } from './interaction-prompt.ts';

describe('interaction prompt', () => {
  it('shows an enter prompt for enterable overworld poi tiles', () => {
    const state = {
      player: { x: 4, y: 6 },
      getCurrentContext() {
        return { id: 'overworld', label: 'Overworld', type: 'overworld', depth: 0 };
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
              },
            };
          },
          getExit() {
            return null;
          },
        };
      },
    };

    expect(getInteractionPrompt(state as never)).toBe('Press Enter to enter Oakcross');
  });

  it('shows an exit prompt for exit tiles and prefers it over enter actions', () => {
    const state = {
      player: { x: 0, y: 11 },
      getCurrentContext() {
        return { id: 'town:4:6:0', label: 'Oakcross', type: 'town', depth: 1 };
      },
      getCurrentTile() {
        return { kind: 'door', note: 'Town gate.' };
      },
      getCurrentMap() {
        return {
          getAction() {
            return {
              type: 'enter',
              context: {
                id: 'building:one',
                label: 'Inn',
                type: 'building',
                depth: 2,
              },
            };
          },
          getExit() {
            return {
              type: 'exit',
              spawn: { x: 4, y: 6 },
            };
          },
        };
      },
    };

    expect(getInteractionPrompt(state as never)).toBe('Press X to exit Oakcross');
  });

  it('returns no prompt when the current tile has no interaction', () => {
    const state = {
      player: { x: 0, y: 0 },
      getCurrentContext() {
        return { id: 'overworld', label: 'Overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile() {
        return { kind: 'plains' };
      },
      getCurrentMap() {
        return {
          getAction() {
            return null;
          },
          getExit() {
            return null;
          },
        };
      },
    };

    expect(getInteractionPrompt(state as never)).toBe('');
  });
});
