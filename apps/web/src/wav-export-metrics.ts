export const DEFAULT_WAV_EXPORT_WARNING_BYTE_LIMIT = 96 * 1024;
const WAV_HEADER_BYTE_LENGTH = 44;
const PCM16_MONO_BYTES_PER_SAMPLE = 2;

export type WavExportMetrics = Readonly<{
  durationSeconds: number;
  durationLabel: string;
  byteLength: number;
  byteLengthLabel: string;
  warningByteLimit: number;
  warningByteLimitLabel: string;
  exceedsWarningLimit: boolean;
}>;

export function createWavExportMetrics(options: {
  sampleCount: number;
  sampleRate: number;
  warningByteLimit?: number;
}): WavExportMetrics {
  const sampleCount = Math.max(0, Math.round(options.sampleCount));
  const sampleRate = Math.max(1, Math.round(options.sampleRate));
  const warningByteLimit = Math.max(
    1,
    Math.round(
      options.warningByteLimit ?? DEFAULT_WAV_EXPORT_WARNING_BYTE_LIMIT
    )
  );
  const durationSeconds = sampleCount / sampleRate;
  const byteLength =
    WAV_HEADER_BYTE_LENGTH + sampleCount * PCM16_MONO_BYTES_PER_SAMPLE;

  return {
    durationSeconds,
    durationLabel: formatWavExportDuration(durationSeconds),
    byteLength,
    byteLengthLabel: formatWavExportByteLength(byteLength),
    warningByteLimit,
    warningByteLimitLabel: formatWavExportByteLength(warningByteLimit),
    exceedsWarningLimit: byteLength > warningByteLimit,
  };
}

function formatWavExportDuration(durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return '0.0s';
  }
  if (durationSeconds < 10) {
    return `${durationSeconds.toFixed(1)}s`;
  }
  return `${durationSeconds.toFixed(0)}s`;
}

function formatWavExportByteLength(byteLength: number): string {
  const normalized = Math.max(0, Math.round(byteLength));
  if (normalized < 1024) {
    return `${normalized} B`;
  }
  if (normalized < 1024 * 1024) {
    return `${(normalized / 1024).toFixed(1)} KB`;
  }
  return `${(normalized / (1024 * 1024)).toFixed(2)} MB`;
}
