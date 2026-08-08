import type { WorldContextLike } from '@bworlds/plugin-api';

export type SavedSession = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds?: string[];
  stack: WorldContextLike[];
  viewMode?: string;
  timeOffsetMs?: number;
  timeFrozen?: boolean;
  frozenWorldTimeMs?: number | null;
  inspectorTab?: string;
  modelPreviewMode?: string;
  celestialEventMode?: string;
  compassHeadingAngle?: number | null;
};

export type SessionSnapshot = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds: string[];
  stack: WorldContextLike[];
  viewMode: string;
  timeOffsetMs: number;
  timeFrozen: boolean;
  frozenWorldTimeMs: number | null;
  inspectorTab: string;
  modelPreviewMode: string;
  celestialEventMode: string;
  compassHeadingAngle: number | null;
};

export function serializeSessionSnapshot(snapshot: SessionSnapshot) {
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
      parsed.celestialEventMode !== 'comet'
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
    return parsed as SavedSession;
  } catch {
    return null;
  }
}
