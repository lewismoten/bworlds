import { describe, expect, it } from 'vitest';

import {
  createSoundDebugWavExportMetrics,
  SOUND_DEBUG_EXPORT_WARNING_BYTE_LIMIT,
} from './sound-debug-export-metrics.ts';

describe('sound debug export metrics', () => {
  it('reports wav duration and byte size labels for preview exports', () => {
    expect(
      createSoundDebugWavExportMetrics({
        sampleCount: 24_000,
        sampleRate: 48_000,
      })
    ).toEqual({
      durationSeconds: 0.5,
      durationLabel: '0.5s',
      byteLength: 48_044,
      byteLengthLabel: '46.9 KB',
      warningByteLimit: SOUND_DEBUG_EXPORT_WARNING_BYTE_LIMIT,
      warningByteLimitLabel: '96.0 KB',
      exceedsWarningLimit: false,
    });
  });

  it('flags preview exports that exceed the warning budget', () => {
    const metrics = createSoundDebugWavExportMetrics({
      sampleCount: 60_000,
      sampleRate: 48_000,
    });

    expect(metrics.durationLabel).toBe('1.3s');
    expect(metrics.byteLengthLabel).toBe('117.2 KB');
    expect(metrics.exceedsWarningLimit).toBe(true);
  });
});
