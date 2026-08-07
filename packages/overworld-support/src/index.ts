import { hash2D, octaveNoise2D, ridgedNoise2D } from '@bworlds/core';
import type {
  ClassifyOverworldTileContext,
  OverworldSignals,
  PluginRegistryLike,
  Seed,
} from '@bworlds/plugin-api';

export type OverworldTerrainSignalSampler = (
  x: number,
  y: number
) => OverworldSignals;

export function createOverworldTerrainSignalSampler(
  seed: Seed
): OverworldTerrainSignalSampler {
  return function sampleTerrainSignals(x: number, y: number): OverworldSignals {
    const scaledX = x / 160;
    const scaledY = y / 160;
    return {
      continent: octaveNoise2D(`${seed}:continent`, scaledX, scaledY, {
        octaves: 5,
        persistence: 0.55,
      }),
      elevation: octaveNoise2D(`${seed}:elevation`, x / 45, y / 45, {
        octaves: 4,
        persistence: 0.5,
      }),
      moisture: octaveNoise2D(`${seed}:moisture`, x / 65, y / 65, {
        octaves: 4,
        persistence: 0.6,
      }),
      riverSignal: ridgedNoise2D(`${seed}:river`, x / 75, y / 75, {
        octaves: 3,
        persistence: 0.52,
      }),
      roadSignal: ridgedNoise2D(`${seed}:road`, x / 42, y / 42, {
        octaves: 2,
        persistence: 0.6,
      }),
    };
  };
}

export function isNearOverworldLand(signals: OverworldSignals): boolean {
  return signals.continent > 0.45 && signals.continent < 0.9;
}

export function createOverworldGenerationContext({
  seed,
  x,
  y,
  tile,
  plugins,
  sampleTerrainSignals,
}: {
  seed: Seed;
  x: number;
  y: number;
  tile: ClassifyOverworldTileContext['tile'];
  plugins: PluginRegistryLike;
  sampleTerrainSignals: OverworldTerrainSignalSampler;
}): ClassifyOverworldTileContext {
  const signals = sampleTerrainSignals(x, y);
  const anchors = plugins.resolveOverworldAnchors({
    seed,
    x,
    y,
    sampleTerrainSignals,
  });

  return {
    seed,
    x,
    y,
    tile,
    nearLand: isNearOverworldLand(signals),
    townChance: hash2D(`${seed}:town`, x, y),
    caveChance: hash2D(`${seed}:cave`, x, y),
    dungeonChance: hash2D(`${seed}:dungeon`, x, y),
    signChance: hash2D(`${seed}:sign`, x, y),
    signals,
    sampleTerrainSignals,
    townAnchors: anchors.townAnchors,
    bridgeAnchors: anchors.bridgeAnchors,
    poiAnchors: anchors.poiAnchors,
  };
}
