import { describe, expect, it } from 'vitest';
import {
  getInteractionPrompt,
  getInteractionPromptFromResolvedState,
} from './interaction-prompt.ts';

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

  it('shows a talk prompt for npc interactions', () => {
    const state = {
      player: { x: 7, y: -2 },
      getCurrentContext() {
        return { id: 'town:4:6:0', label: 'Oakcross', type: 'town', depth: 1 };
      },
      getCurrentTile() {
        return { kind: 'npc', poi: { type: 'npc', name: 'Lyra' } };
      },
      getCurrentMap() {
        return {
          getAction() {
            return {
              type: 'enter',
              context: {
                id: 'npc:lyra',
                label: 'Lyra',
                type: 'npc',
                depth: 2,
              },
            };
          },
          getExit() {
            return null;
          },
        };
      },
    };

    expect(getInteractionPrompt(state as never)).toBe('Press Enter to talk to Lyra');
  });

  it('shows a descend prompt for deeper entrance tiles', () => {
    const state = {
      player: { x: 3, y: 9 },
      getCurrentContext() {
        return { id: 'tower:1', label: 'Old Tower', type: 'tower', depth: 1 };
      },
      getCurrentTile() {
        return { kind: 'stairs-down', poi: { type: 'cave', name: 'Moss Hollow' } };
      },
      getCurrentMap() {
        return {
          getAction() {
            return {
              type: 'deepen',
              context: {
                id: 'cave:3:9:2',
                label: 'Moss Hollow',
                type: 'cave',
                depth: 2,
              },
            };
          },
          getExit() {
            return null;
          },
        };
      },
    };

    expect(getInteractionPrompt(state as never)).toBe(
      'Press Enter to descend into Moss Hollow'
    );
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

  it('can build a prompt from pre-resolved tile and context state', () => {
    expect(
      getInteractionPromptFromResolvedState({
        player: { x: 4, y: 6 },
        tile: { kind: 'town', poi: { type: 'town', name: 'Oakcross' } },
        contextLabel: 'Overworld',
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
      } as never)
    ).toBe('Press Enter to enter Oakcross');
  });
});
