import type { ProceduralSoundEffect } from './sound-effects.ts';

export const AUDIO_CATEGORIES = [
  'music',
  'ui',
  'speech',
  'combat',
  'environment',
  'creatures',
] as const;

export type AudioCategory = (typeof AUDIO_CATEGORIES)[number];

export type AudioCategoryVolumes = Record<AudioCategory, number>;

export const DEFAULT_AUDIO_CATEGORY_VOLUMES: AudioCategoryVolumes = {
  music: 1,
  ui: 1,
  speech: 1,
  combat: 1,
  environment: 1,
  creatures: 1,
};

const AUDIO_CATEGORY_LABELS: Record<AudioCategory, string> = {
  music: 'Music',
  ui: 'UI',
  speech: 'Speech',
  combat: 'Combat',
  environment: 'Environment',
  creatures: 'Creatures',
};

export function getAudioCategoryLabel(category: AudioCategory): string {
  return AUDIO_CATEGORY_LABELS[category];
}

export function normalizeAudioCategoryVolumes(
  value: Partial<Record<AudioCategory, unknown>> | null | undefined
): AudioCategoryVolumes {
  return {
    music: normalizeAudioCategoryVolume(value?.music),
    ui: normalizeAudioCategoryVolume(value?.ui),
    speech: normalizeAudioCategoryVolume(value?.speech),
    combat: normalizeAudioCategoryVolume(value?.combat),
    environment: normalizeAudioCategoryVolume(value?.environment),
    creatures: normalizeAudioCategoryVolume(value?.creatures),
  };
}

export function isAudioCategoryVolumeMapLike(
  value: unknown
): value is Partial<Record<AudioCategory, number>> {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  return AUDIO_CATEGORIES.every((category) => {
    const candidate = (value as Partial<Record<AudioCategory, unknown>>)[
      category
    ];
    return typeof candidate === 'undefined' || typeof candidate === 'number';
  });
}

export function normalizeAudioCategoryVolume(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 1;
  }
  return clamp(value, 0, 1);
}

export function resolveSoundEffectCategory(
  kind: ProceduralSoundEffect['kind']
): AudioCategory {
  switch (kind) {
    case 'combat-weapon':
    case 'combat-magic':
      return 'combat';
    case 'advancement':
    case 'open':
    case 'close':
    case 'blocked':
      return 'ui';
    case 'train-engine':
    case 'train-whistle':
    case 'paddle-calliope':
    case 'steam-whistle':
    case 'rain':
    case 'hail':
    case 'snowstorm':
    case 'wind':
    case 'ocean':
    case 'river-ambience':
    case 'forest-ambience':
    case 'plains-ambience':
    case 'mountain-ambience':
    case 'cave-ambience':
    case 'settlement-ambience':
    case 'ruins-ambience':
    case 'footstep':
    case 'jump':
    case 'landing':
      return 'environment';
    default:
      return 'environment';
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
