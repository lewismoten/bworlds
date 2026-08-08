import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, getDaylightCycleState } from '@bworlds/core';
import {
  cycleViewMode,
  getNextCompassDisplayMode,
  getNextCelestialEventMode,
  getNextInspectorTab,
  getNextMinimapDisplayMode,
  getNextModelPreviewMode,
  getNextTimekeeperDisplayMode,
  getNextViewMode,
  getTimePresetProgress,
  getViewModeToggleLabel,
  isInspectorSectionVisible,
  isModelPreviewVisible,
} from './time-controls.ts';

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
    expect(getNextInspectorTab('events')).toBe('events');
    expect(getNextInspectorTab('model')).toBe('model');
    expect(getNextInspectorTab('timekeeper')).toBe('timekeeper');
    expect(getNextInspectorTab('unknown')).toBe('timekeeper');
  });

  it('normalizes the model preview mode to a supported layout', () => {
    expect(getNextModelPreviewMode('world')).toBe('world');
    expect(getNextModelPreviewMode('solar-system')).toBe('solar-system');
    expect(getNextModelPreviewMode('split')).toBe('split');
    expect(getNextModelPreviewMode('unknown')).toBe('split');
  });

  it('normalizes and cycles the viewport view mode with next-mode labels', () => {
    expect(getNextViewMode('2d')).toBe('2d');
    expect(getNextViewMode('3d')).toBe('3d');
    expect(getNextViewMode('text')).toBe('text');
    expect(getNextViewMode('unknown')).toBe('2d');
    expect(cycleViewMode('2d')).toBe('3d');
    expect(cycleViewMode('3d')).toBe('text');
    expect(cycleViewMode('text')).toBe('2d');
    expect(getViewModeToggleLabel('2d')).toBe('Switch to 3D');
    expect(getViewModeToggleLabel('3d')).toBe('Switch to Text');
    expect(getViewModeToggleLabel('text')).toBe('Switch to 2D');
  });

  it('normalizes the viewport timekeeper mode to a supported display', () => {
    expect(getNextTimekeeperDisplayMode('hidden')).toBe('hidden');
    expect(getNextTimekeeperDisplayMode('time')).toBe('time');
    expect(getNextTimekeeperDisplayMode('time-date')).toBe('time-date');
    expect(getNextTimekeeperDisplayMode('graphical')).toBe('graphical');
    expect(getNextTimekeeperDisplayMode('unknown')).toBe('time-date');
  });

  it('normalizes the viewport compass mode to a supported display', () => {
    expect(getNextCompassDisplayMode('hidden')).toBe('hidden');
    expect(getNextCompassDisplayMode('letters')).toBe('letters');
    expect(getNextCompassDisplayMode('graphical')).toBe('graphical');
    expect(getNextCompassDisplayMode('unknown')).toBe('letters');
  });

  it('normalizes the viewport minimap mode to a supported display', () => {
    expect(getNextMinimapDisplayMode('hidden')).toBe('hidden');
    expect(getNextMinimapDisplayMode('graphical')).toBe('graphical');
    expect(getNextMinimapDisplayMode('unknown')).toBe('hidden');
  });

  it('normalizes the celestial event mode to a supported override', () => {
    expect(getNextCelestialEventMode('auto')).toBe('auto');
    expect(getNextCelestialEventMode('aurora')).toBe('aurora');
    expect(getNextCelestialEventMode('meteor-shower')).toBe('meteor-shower');
    expect(getNextCelestialEventMode('comet')).toBe('comet');
    expect(getNextCelestialEventMode('eclipse')).toBe('eclipse');
    expect(getNextCelestialEventMode('unknown')).toBe('auto');
  });

  it('shows only the active inspector section and reserves the viewport compass for compass mode', () => {
    expect(isInspectorSectionVisible('timekeeper', 'timekeeper')).toBe(true);
    expect(isInspectorSectionVisible('timekeeper', 'model')).toBe(false);
    expect(isInspectorSectionVisible('timekeeper', 'events')).toBe(false);
    expect(isInspectorSectionVisible('timekeeper', 'compass')).toBe(false);
    expect(isInspectorSectionVisible('timekeeper', 'viewport-compass')).toBe(false);
    expect(isInspectorSectionVisible('compass', 'viewport-compass')).toBe(true);
  });

  it('can focus one model preview or show both together', () => {
    expect(isModelPreviewVisible('split', 'world')).toBe(true);
    expect(isModelPreviewVisible('split', 'solar-system')).toBe(true);
    expect(isModelPreviewVisible('world', 'world')).toBe(true);
    expect(isModelPreviewVisible('world', 'solar-system')).toBe(false);
    expect(isModelPreviewVisible('solar-system', 'solar-system')).toBe(true);
  });
});
