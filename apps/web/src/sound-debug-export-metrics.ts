import {
  createWavExportMetrics,
  DEFAULT_WAV_EXPORT_WARNING_BYTE_LIMIT,
  type WavExportMetrics,
} from './wav-export-metrics.ts';

export const SOUND_DEBUG_EXPORT_WARNING_BYTE_LIMIT =
  DEFAULT_WAV_EXPORT_WARNING_BYTE_LIMIT;

export type SoundDebugExportMetrics = WavExportMetrics;

export function createSoundDebugWavExportMetrics(options: {
  sampleCount: number;
  sampleRate: number;
  warningByteLimit?: number;
}): SoundDebugExportMetrics {
  return createWavExportMetrics({
    sampleCount: options.sampleCount,
    sampleRate: options.sampleRate,
    warningByteLimit: options.warningByteLimit,
  });
}
