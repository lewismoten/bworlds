import type { getDaylightCycleState } from '@bworlds/core';

type DaylightCycleLike = ReturnType<typeof getDaylightCycleState>;

export type TimePreset = 'dawn' | 'noon' | 'dusk' | 'midnight';
export type InspectorTab = 'timekeeper' | 'model' | 'compass';
export type InspectorSection = InspectorTab | 'viewport-compass';
export type ModelPreviewMode = 'world' | 'solar-system' | 'split';

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
  if (tabId === 'model' || tabId === 'compass') {
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
