import type {
  CompassDisplayMode,
  CelestialEventMode,
  InspectorTab,
  MinimapDisplayMode,
  ModelPreviewMode,
  TimekeeperDisplayMode,
} from './time-controls.ts';
import {
  parsePlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';

type SessionViewMode = '2d' | '3d';

type SessionWorldContext = {
  id: string;
  depth: number;
  origin?: {
    x: number;
    y: number;
  };
  label?: string;
  type?: string;
  [key: string]: unknown;
};

export type SavedSession = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds?: string[];
  stack: SessionWorldContext[];
  viewMode?: SessionViewMode;
  timekeeperDisplayMode?: TimekeeperDisplayMode;
  compassDisplayMode?: CompassDisplayMode;
  minimapDisplayMode?: MinimapDisplayMode;
  minimapZoom?: number;
  timeOffsetMs?: number;
  timeFrozen?: boolean;
  frozenWorldTimeMs?: number | null;
  inspectorTab?: InspectorTab;
  modelPreviewMode?: ModelPreviewMode;
  celestialEventMode?: CelestialEventMode;
  compassHeadingAngle?: number | null;
  playerPlacedPois?: PlayerPlacedPoiLike[];
};

export type SessionSnapshot = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds: string[];
  stack: SessionWorldContext[];
  viewMode: SessionViewMode;
  timekeeperDisplayMode: TimekeeperDisplayMode;
  compassDisplayMode: CompassDisplayMode;
  minimapDisplayMode: MinimapDisplayMode;
  minimapZoom: number;
  timeOffsetMs: number;
  timeFrozen: boolean;
  frozenWorldTimeMs: number | null;
  inspectorTab: InspectorTab;
  modelPreviewMode: ModelPreviewMode;
  celestialEventMode: CelestialEventMode;
  compassHeadingAngle: number | null;
  playerPlacedPois: PlayerPlacedPoiLike[];
};

export function serializeSessionSnapshot(snapshot: SessionSnapshot): string {
  return JSON.stringify(snapshot);
}

export function parseSavedSession(raw: string | null): SavedSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.player?.x !== 'number' ||
      typeof parsed?.player?.y !== 'number' ||
      typeof parsed?.player?.facing !== 'number'
    ) {
      return null;
    }
    if (!Array.isArray(parsed?.stack) || parsed.stack.length === 0) {
      return null;
    }
    if (
      typeof parsed?.timekeeperDisplayMode !== 'undefined' &&
      parsed.timekeeperDisplayMode !== 'hidden' &&
      parsed.timekeeperDisplayMode !== 'time' &&
      parsed.timekeeperDisplayMode !== 'time-date' &&
      parsed.timekeeperDisplayMode !== 'graphical'
    ) {
      return null;
    }
    if (
      typeof parsed?.compassDisplayMode !== 'undefined' &&
      parsed.compassDisplayMode !== 'hidden' &&
      parsed.compassDisplayMode !== 'letters' &&
      parsed.compassDisplayMode !== 'graphical'
    ) {
      return null;
    }
    if (
      typeof parsed?.minimapDisplayMode !== 'undefined' &&
      parsed.minimapDisplayMode !== 'hidden' &&
      parsed.minimapDisplayMode !== 'graphical'
    ) {
      return null;
    }
    if (
      typeof parsed?.minimapZoom !== 'undefined' &&
      typeof parsed.minimapZoom !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.inspectorTab !== 'undefined' &&
      parsed.inspectorTab !== 'timekeeper' &&
      parsed.inspectorTab !== 'model' &&
      parsed.inspectorTab !== 'events' &&
      parsed.inspectorTab !== 'compass'
    ) {
      return null;
    }
    if (
      typeof parsed?.modelPreviewMode !== 'undefined' &&
      parsed.modelPreviewMode !== 'world' &&
      parsed.modelPreviewMode !== 'solar-system' &&
      parsed.modelPreviewMode !== 'split'
    ) {
      return null;
    }
    if (
      typeof parsed?.celestialEventMode !== 'undefined' &&
      parsed.celestialEventMode !== 'auto' &&
      parsed.celestialEventMode !== 'aurora' &&
      parsed.celestialEventMode !== 'meteor-shower' &&
      parsed.celestialEventMode !== 'comet' &&
      parsed.celestialEventMode !== 'eclipse'
    ) {
      return null;
    }
    if (
      typeof parsed?.timeFrozen !== 'undefined' &&
      typeof parsed.timeFrozen !== 'boolean'
    ) {
      return null;
    }
    if (
      typeof parsed?.timeOffsetMs !== 'undefined' &&
      typeof parsed.timeOffsetMs !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.frozenWorldTimeMs !== 'undefined' &&
      parsed.frozenWorldTimeMs !== null &&
      typeof parsed.frozenWorldTimeMs !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.compassHeadingAngle !== 'undefined' &&
      parsed.compassHeadingAngle !== null &&
      typeof parsed.compassHeadingAngle !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.playerPlacedPois !== 'undefined' &&
      parsePlayerPlacedPois(parsed.playerPlacedPois) === null
    ) {
      return null;
    }
    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    return parsed as SavedSession;
  } catch {
    return null;
  }
}
