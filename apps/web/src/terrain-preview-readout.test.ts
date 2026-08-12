import { describe, expect, it } from 'vitest';
import type { OverworldSignals } from '@bworlds/plugin-api';
import {
  resolveTerrainPreviewBiomeId,
  resolveTerrainPreviewReadout,
  resolveTerrainPreviewReadoutFromSignals,
} from './terrain-preview-readout.ts';

const BASE_SIGNALS: OverworldSignals = {
  continent: 0.64,
  elevation: 0.34,
  moisture: 0.44,
  riverSignal: 0.12,
  roadSignal: 0.08,
};

describe('terrain preview readout', () => {
  it('derives stable preview biome ids from tile kind and terrain signals', () => {
    expect(resolveTerrainPreviewBiomeId('forest', BASE_SIGNALS)).toBe('forest');
    expect(
      resolveTerrainPreviewBiomeId('forest', {
        ...BASE_SIGNALS,
        moisture: 0.84,
      })
    ).toBe('wetland');
    expect(
      resolveTerrainPreviewBiomeId('plains', {
        ...BASE_SIGNALS,
        moisture: 0.14,
        continent: 0.72,
      })
    ).toBe('desert');
    expect(resolveTerrainPreviewBiomeId('plains', BASE_SIGNALS)).toBe('plains');
    expect(
      resolveTerrainPreviewBiomeId('mountain', {
        ...BASE_SIGNALS,
        elevation: 0.82,
        moisture: 0.22,
      })
    ).toBe('alpine');
  });

  it('resolves dominant terrain layers from explicit signals with biome-aware splat inputs', () => {
    const wetForest = resolveTerrainPreviewReadoutFromSignals({
      seed: 'preview-readout-seed',
      x: 12,
      y: -4,
      kind: 'forest',
      signals: {
        ...BASE_SIGNALS,
        moisture: 0.82,
        riverSignal: 0.64,
      },
    });
    const dryPlains = resolveTerrainPreviewReadoutFromSignals({
      seed: 'preview-readout-seed',
      x: 48,
      y: 18,
      kind: 'plains',
      signals: {
        ...BASE_SIGNALS,
        moisture: 0.14,
        elevation: 0.2,
      },
    });

    expect(wetForest.biomeId).toBe('wetland');
    expect(wetForest.dominantLayerId).toMatch(/grass|soil|leaf/);
    expect(dryPlains.biomeId).toBe('desert');
    expect(dryPlains.dominantLayerId).not.toBeNull();
  });

  it('builds deterministic readouts from the shared preview terrain sampler', () => {
    const first = resolveTerrainPreviewReadout({
      seed: 'preview-readout-seed',
      x: 128,
      y: -64,
      kind: 'forest',
    });
    const second = resolveTerrainPreviewReadout({
      seed: 'preview-readout-seed',
      x: 128,
      y: -64,
      kind: 'forest',
    });

    expect(first).toEqual(second);
    expect(first.biomeId.length).toBeGreaterThan(0);
    expect(first.dominantLayerId).not.toBeNull();
  });
});
