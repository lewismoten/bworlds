import { describe, expect, it } from 'vitest';
import { parseSavedSession, serializeSessionSnapshot } from './session-state.ts';

describe('session state', () => {
  it('round-trips frozen time, active tab, and compass heading state', () => {
    const raw = serializeSessionSnapshot({
      player: {
        x: 12.5,
        y: -4.25,
        facing: Math.PI / 3,
      },
      packIds: ['default-content-pack'],
      stack: [{ id: 'overworld', depth: 0 }],
      viewMode: '3d',
      timeOffsetMs: 42000,
      timeFrozen: true,
      frozenWorldTimeMs: 123456,
      inspectorTab: 'compass',
      modelPreviewMode: 'split',
      celestialEventMode: 'aurora',
      compassHeadingAngle: -Math.PI / 2,
    });

    expect(parseSavedSession(raw)).toEqual(
      expect.objectContaining({
        timeOffsetMs: 42000,
        timeFrozen: true,
        frozenWorldTimeMs: 123456,
        inspectorTab: 'compass',
        compassHeadingAngle: -Math.PI / 2,
      })
    );
  });

  it('rejects invalid persisted inspector tabs and event modes', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          inspectorTab: 'invalid',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          celestialEventMode: 'invalid',
        })
      )
    ).toBeNull();
  });

  it('rejects malformed frozen time and heading values', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          timeFrozen: 'yes',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          compassHeadingAngle: 'north',
        })
      )
    ).toBeNull();
  });
});
