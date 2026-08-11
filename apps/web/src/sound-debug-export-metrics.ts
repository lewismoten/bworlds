export const SOUND_DEBUG_EXPORT_WARNING_BYTE_LIMIT = 96 * 1024;
const WAV_HEADER_BYTE_LENGTH = 44;
const PCM16_MONO_BYTES_PER_SAMPLE = 2;

export type SoundDebugExportMetrics = Readonly<{
  durationSeconds: number;
  durationLabel: string;
  byteLength: number;
  byteLengthLabel: string;
  warningByteLimit: number;
  warningByteLimitLabel: string;
  exceedsWarningLimit: boolean;
}>;

export function createSoundDebugWavExportMetrics(options: {
  sampleCount: number;
  sampleRate: number;
  warningByteLimit?: number;
}): SoundDebugExportMetrics {
  const sampleCount = Math.max(0, Math.round(options.sampleCount));
  const sampleRate = Math.max(1, Math.round(options.sampleRate));
  const warningByteLimit = Math.max(
    1,
    Math.round(
      options.warningByteLimit ?? SOUND_DEBUG_EXPORT_WARNING_BYTE_LIMIT
    )
  );
  const durationSeconds = sampleCount / sampleRate;
  const byteLength =
    WAV_HEADER_BYTE_LENGTH + sampleCount * PCM16_MONO_BYTES_PER_SAMPLE;

  return {
    durationSeconds,
    durationLabel: formatSoundDebugDuration(durationSeconds),
    byteLength,
    byteLengthLabel: formatSoundDebugByteLength(byteLength),
    warningByteLimit,
    warningByteLimitLabel: formatSoundDebugByteLength(warningByteLimit),
    exceedsWarningLimit: byteLength > warningByteLimit,
  };
}

export function formatSoundDebugDuration(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '0.0s';
  }
  if (durationSeconds < 10) {
    return `${durationSeconds.toFixed(1)}s`;
  }
  return `${durationSeconds.toFixed(0)}s`;
}

export function formatSoundDebugByteLength(byteLength: number): string {
  const normalized = Math.max(0, Math.round(byteLength));
  if (normalized < 1024) {
    return `${normalized} B`;
  }
  if (normalized < 1024 * 1024) {
    return `${(normalized / 1024).toFixed(1)} KB`;
  }
  return `${(normalized / (1024 * 1024)).toFixed(2)} MB`;
}
