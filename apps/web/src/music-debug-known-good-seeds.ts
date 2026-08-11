import type { MusicDebugOptions } from './music-debug.ts';

export type MusicDebugKnownGoodSeed = {
  id: string;
  label: string;
  purpose: string;
  options: Partial<MusicDebugOptions>;
};

export const MUSIC_DEBUG_KNOWN_GOOD_SEEDS: readonly MusicDebugKnownGoodSeed[] =
  [
    {
      id: 'plains-midi-audit-baseline',
      label: 'Plains MIDI Audit Baseline',
      purpose:
        'Regression baseline for the exact-duration plains MIDI audit export checks.',
      options: {
        tileKind: 'plains',
        contextType: 'overworld',
        encounterMode: 'ambient',
        clusterX: -6,
        clusterY: -6,
      },
    },
    {
      id: 'plains-motif-baseline',
      label: 'Plains Motif Baseline',
      purpose:
        'Regression baseline for shared motif reuse and exact-versus-varied motif counters.',
      options: {
        tileKind: 'plains',
        contextType: 'overworld',
        encounterMode: 'ambient',
        clusterX: 0,
        clusterY: 0,
        dayProgress: 0.45,
        yearProgress: 0.25,
      },
    },
    {
      id: 'forest-structure-baseline',
      label: 'Forest Structure Baseline',
      purpose:
        'Regression baseline for section layer-plan rules, chord validation, and debug summaries.',
      options: {
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 4,
        clusterY: -1,
      },
    },
    {
      id: 'town-blueprint-baseline',
      label: 'Town Blueprint Baseline',
      purpose:
        'Regression baseline for settled blueprint occupancy comparisons and town arrangement balance.',
      options: {
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
        dayProgress: 0.25,
        yearProgress: 0.75,
      },
    },
  ];

export function resolveMusicDebugKnownGoodSeed(
  id: string
): MusicDebugKnownGoodSeed {
  const seed = MUSIC_DEBUG_KNOWN_GOOD_SEEDS.find((entry) => entry.id === id);
  if (!seed) {
    throw new Error(`Unknown music debug known-good seed: ${id}`);
  }
  return seed;
}
