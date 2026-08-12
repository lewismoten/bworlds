import type {
  CompassDisplayMode,
  CelestialEventMode,
  InspectorTab,
  MinimapDisplayMode,
  ModelPreviewMode,
  TimekeeperDisplayMode,
} from './time-controls.ts';
import {
  isAudioCategoryVolumeMapLike,
  type AudioCategoryVolumes,
} from './audio-categories.ts';
import { normalizeAudioPreferences } from './audio-preferences.ts';
import {
  parsePlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';
import { normalizePlayerLevel } from './player-progression.ts';
import {
  parseSavedCharacterProfile,
  type SavedCharacterProfile,
} from './character-storage.ts';
import {
  parseInventoryItems,
  parseSavedInventoryProfile,
  type SavedInventoryProfile,
} from './inventory-storage.ts';
import {
  parseSavedWorldMapProfile,
  type SavedWorldMapProfile,
} from './world-map-storage.ts';
import { normalizeTeleportPins, type TeleportPin } from './teleport-pins.ts';

type SessionViewMode = '2d' | '3d' | 'text';

export const SESSION_STORAGE_KEY = 'bworlds:session';

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
  inventoryProfile?: SavedInventoryProfile;
  worldMapProfile?: SavedWorldMapProfile;
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
  musicEnabled?: boolean;
  soundEnabled?: boolean;
  ambianceEnabled?: boolean;
  runtimePerformanceTrackingEnabled?: boolean;
  categoryVolumes?: Partial<AudioCategoryVolumes>;
  compassHeadingAngle?: number | null;
  cameraPitch?: number;
  playerLevel?: number;
  playerProfession?: string;
  completedQuestIds?: string[];
  inventory?: import('@bworlds/plugin-api').InventoryItemLike[];
  playerPlacedPois?: PlayerPlacedPoiLike[];
  teleportPins?: TeleportPin[];
};

export type SessionSnapshot = {
  characterProfile?: SavedCharacterProfile;
  inventoryProfile?: SavedInventoryProfile;
  worldMapProfile?: SavedWorldMapProfile;
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
  musicEnabled: boolean;
  soundEnabled: boolean;
  ambianceEnabled: boolean;
  runtimePerformanceTrackingEnabled: boolean;
  categoryVolumes: AudioCategoryVolumes;
  compassHeadingAngle: number | null;
  cameraPitch: number;
  playerLevel: number;
  playerProfession?: string;
  completedQuestIds: string[];
  inventory: import('@bworlds/plugin-api').InventoryItemLike[];
  playerPlacedPois: PlayerPlacedPoiLike[];
  teleportPins: TeleportPin[];
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
      parseSavedCharacterProfile(JSON.stringify(parsed.characterProfile)) ===
        null
    ) {
      return null;
    }
    if (
      typeof parsed?.inventoryProfile !== 'undefined' &&
      parseSavedInventoryProfile(JSON.stringify(parsed.inventoryProfile)) ===
        null
    ) {
      return null;
    }
    if (
      typeof parsed?.worldMapProfile !== 'undefined' &&
      parseSavedWorldMapProfile(JSON.stringify(parsed.worldMapProfile)) === null
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
      parsed.minimapDisplayMode !== 'graphical' &&
      parsed.minimapDisplayMode !== 'heatmap'
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
      typeof parsed?.musicEnabled !== 'undefined' &&
      typeof parsed.musicEnabled !== 'boolean'
    ) {
      return null;
    }
    if (
      typeof parsed?.soundEnabled !== 'undefined' &&
      typeof parsed.soundEnabled !== 'boolean'
    ) {
      return null;
    }
    if (
      typeof parsed?.ambianceEnabled !== 'undefined' &&
      typeof parsed.ambianceEnabled !== 'boolean'
    ) {
      return null;
    }
    if (
      typeof parsed?.runtimePerformanceTrackingEnabled !== 'undefined' &&
      typeof parsed.runtimePerformanceTrackingEnabled !== 'boolean'
    ) {
      return null;
    }
    if (
      typeof parsed?.categoryVolumes !== 'undefined' &&
      !isAudioCategoryVolumeMapLike(parsed.categoryVolumes)
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
        parsed.completedQuestIds.some(
          (value: unknown) => typeof value !== 'string'
        ))
    ) {
      return null;
    }
    if (
      typeof parsed?.inventory !== 'undefined' &&
      parseInventoryItems(parsed.inventory) === null
    ) {
      return null;
    }
    if (
      typeof parsed?.playerPlacedPois !== 'undefined' &&
      parsePlayerPlacedPois(parsed.playerPlacedPois) === null
    ) {
      return null;
    }
    if (
      typeof parsed?.teleportPins !== 'undefined' &&
      (!Array.isArray(parsed.teleportPins) ||
        normalizeTeleportPins(parsed.teleportPins).length !==
          parsed.teleportPins.length)
    ) {
      return null;
    }
    if (typeof parsed?.characterProfile !== 'undefined') {
      parsed.characterProfile = parseSavedCharacterProfile(
        JSON.stringify(parsed.characterProfile)
      );
    }
    if (typeof parsed?.inventoryProfile !== 'undefined') {
      parsed.inventoryProfile = parseSavedInventoryProfile(
        JSON.stringify(parsed.inventoryProfile)
      );
    }
    if (typeof parsed?.worldMapProfile !== 'undefined') {
      parsed.worldMapProfile = parseSavedWorldMapProfile(
        JSON.stringify(parsed.worldMapProfile)
      );
    }
    if (typeof parsed?.inventory !== 'undefined') {
      parsed.inventory = parseInventoryItems(parsed.inventory);
    }
    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    if (typeof parsed?.teleportPins !== 'undefined') {
      parsed.teleportPins = normalizeTeleportPins(parsed.teleportPins);
    }
    if (typeof parsed?.playerLevel !== 'undefined') {
      parsed.playerLevel = normalizePlayerLevel(parsed.playerLevel);
    }
    const audioPreferences = normalizeAudioPreferences(parsed);

    return {
      ...parsed,
      musicEnabled: audioPreferences.musicEnabled,
      soundEnabled: audioPreferences.soundEnabled,
      ambianceEnabled: audioPreferences.ambianceEnabled,
      categoryVolumes: audioPreferences.categoryVolumes,
    } as SavedSession;
  } catch {
    return null;
  }
}
