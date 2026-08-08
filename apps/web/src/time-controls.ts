import type { ViewMode } from '@bworlds/plugin-api';

type DaylightCycleLike = {
  sunriseProgress: number;
  sunsetProgress: number;
};

export type TimePreset = 'dawn' | 'noon' | 'dusk' | 'midnight';
export type InspectorTab = 'timekeeper' | 'model' | 'events' | 'compass';
export type InspectorSection = InspectorTab | 'viewport-compass';
export type ModelPreviewMode = 'world' | 'solar-system' | 'split';
export type TimekeeperDisplayMode =
  | 'hidden'
  | 'time'
  | 'time-date'
  | 'graphical';
export type CompassDisplayMode = 'hidden' | 'letters' | 'graphical';
export type MinimapDisplayMode = 'hidden' | 'graphical';
export type CelestialEventMode =
  | 'auto'
  | 'aurora'
  | 'meteor-shower'
  | 'comet'
  | 'eclipse';

export function getNextViewMode(modeId: string | undefined): ViewMode {
  if (modeId === '3d' || modeId === 'text') {
    return modeId;
  }
  return '2d';
}

export function cycleViewMode(mode: ViewMode): ViewMode {
  if (mode === '2d') {
    return '3d';
  }
  if (mode === '3d') {
    return 'text';
  }
  return '2d';
}

export function getViewModeToggleLabel(mode: ViewMode): string {
  const nextMode = cycleViewMode(mode);
  return `Switch to ${nextMode === 'text' ? 'Text' : nextMode.toUpperCase()}`;
}

export function getTimePresetProgress(
  cycle: DaylightCycleLike,
  preset: TimePreset
) {
  if (preset === 'dawn') {
    return cycle.sunriseProgress;
  }
  if (preset === 'dusk') {
    return cycle.sunsetProgress;
  }
  if (preset === 'noon') {
    return 0.5;
  }
  return 0;
}

export function getNextInspectorTab(tabId: string | undefined): InspectorTab {
  if (tabId === 'model' || tabId === 'events' || tabId === 'compass') {
    return tabId;
  }
  return 'timekeeper';
}

export function getNextModelPreviewMode(
  modeId: string | undefined
): ModelPreviewMode {
  if (modeId === 'world' || modeId === 'solar-system') {
    return modeId;
  }
  return 'split';
}

export function getNextTimekeeperDisplayMode(
  modeId: string | undefined
): TimekeeperDisplayMode {
  if (modeId === 'hidden' || modeId === 'time' || modeId === 'graphical') {
    return modeId;
  }
  return 'time-date';
}

export function getNextCompassDisplayMode(
  modeId: string | undefined
): CompassDisplayMode {
  if (modeId === 'hidden' || modeId === 'graphical') {
    return modeId;
  }
  return 'letters';
}

export function getNextMinimapDisplayMode(
  modeId: string | undefined
): MinimapDisplayMode {
  if (modeId === 'graphical') {
    return modeId;
  }
  return 'hidden';
}

export function getNextCelestialEventMode(
  modeId: string | undefined
): CelestialEventMode {
  if (
    modeId === 'aurora' ||
    modeId === 'meteor-shower' ||
    modeId === 'comet' ||
    modeId === 'eclipse'
  ) {
    return modeId;
  }
  return 'auto';
}

export function isInspectorSectionVisible(
  activeTab: InspectorTab,
  section: InspectorSection
) {
  if (section === 'viewport-compass') {
    return activeTab === 'compass';
  }
  return activeTab === section;
}

export function isModelPreviewVisible(
  activeMode: ModelPreviewMode,
  preview: 'world' | 'solar-system'
) {
  return activeMode === 'split' || activeMode === preview;
}
