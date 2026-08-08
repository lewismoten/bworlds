import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, getDaylightCycleState } from '@bworlds/core';
import { getNextInspectorTab, getTimePresetProgress } from './time-controls.ts';

describe('time controls', () => {
  it('maps sunrise and sunset presets to the current seasonal cycle markers', () => {
    const cycle = getDaylightCycleState(
      DEFAULT_DAY_LENGTH_MS * Math.floor(64 * 0.25),
      {
        dayLengthMs: DEFAULT_DAY_LENGTH_MS,
        yearLengthDays: 64,
      }
    );

    expect(getTimePresetProgress(cycle, 'dawn')).toBe(cycle.sunriseProgress);
    expect(getTimePresetProgress(cycle, 'dusk')).toBe(cycle.sunsetProgress);
    expect(getTimePresetProgress(cycle, 'noon')).toBe(0.5);
    expect(getTimePresetProgress(cycle, 'midnight')).toBe(0);
  });

  it('normalizes the inspector tab id to a supported tab', () => {
    expect(getNextInspectorTab('compass')).toBe('compass');
    expect(getNextInspectorTab('model')).toBe('model');
    expect(getNextInspectorTab('timekeeper')).toBe('timekeeper');
    expect(getNextInspectorTab('unknown')).toBe('timekeeper');
  });
});
