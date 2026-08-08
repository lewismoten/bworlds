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
import { normalizePlayerLevel } from './player-progression.ts';
import {
  parseSavedCharacterProfile,
  type SavedCharacterProfile,
} from './character-storage.ts';

type SessionViewMode = '2d' | '3d' | 'text';

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
  characterProfile?: SavedCharacterProfile;
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds?: string[];
  stack: SessionWorldContext[];
  viewMode?: SessionViewMode;
  worldSeed?: string;
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
  cameraPitch?: number;
  playerLevel?: number;
  playerProfession?: string;
  completedQuestIds?: string[];
  playerPlacedPois?: PlayerPlacedPoiLike[];
};

export type SessionSnapshot = {
  characterProfile?: SavedCharacterProfile;
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds: string[];
  stack: SessionWorldContext[];
  viewMode: SessionViewMode;
  worldSeed: string;
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
  cameraPitch: number;
  playerLevel: number;
  playerProfession?: string;
  completedQuestIds: string[];
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
      typeof parsed?.viewMode !== 'undefined' &&
      parsed.viewMode !== '2d' &&
      parsed.viewMode !== '3d' &&
      parsed.viewMode !== 'text'
    ) {
      return null;
    }
    if (
      typeof parsed?.characterProfile !== 'undefined' &&
      parseSavedCharacterProfile(JSON.stringify(parsed.characterProfile)) === null
    ) {
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
      parsed.inspectorTab !== 'compass' &&
      parsed.inspectorTab !== 'sextant' &&
      parsed.inspectorTab !== 'debug'
    ) {
      return null;
    }
    if (
      typeof parsed?.worldSeed !== 'undefined' &&
      typeof parsed.worldSeed !== 'string'
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
      typeof parsed?.cameraPitch !== 'undefined' &&
      typeof parsed.cameraPitch !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.playerLevel !== 'undefined' &&
      typeof parsed.playerLevel !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.playerProfession !== 'undefined' &&
      typeof parsed.playerProfession !== 'string'
    ) {
      return null;
    }
    if (
      typeof parsed?.completedQuestIds !== 'undefined' &&
      (!Array.isArray(parsed.completedQuestIds) ||
        parsed.completedQuestIds.some((value: unknown) => typeof value !== 'string'))
    ) {
      return null;
    }
    if (
      typeof parsed?.playerPlacedPois !== 'undefined' &&
      parsePlayerPlacedPois(parsed.playerPlacedPois) === null
    ) {
      return null;
    }
    if (typeof parsed?.characterProfile !== 'undefined') {
      parsed.characterProfile = parseSavedCharacterProfile(
        JSON.stringify(parsed.characterProfile)
      );
    }
    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    if (typeof parsed?.playerLevel !== 'undefined') {
      parsed.playerLevel = normalizePlayerLevel(parsed.playerLevel);
    }
    return parsed as SavedSession;
  } catch {
    return null;
  }
}
