function clampSample(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-1, Math.min(1, value));
}

export function buildSoundDebugWaveformMarkup(
  samples: Float32Array,
  options: {
    width?: number;
    height?: number;
    samplePoints?: number;
  } = {}
): string {
  const width = options.width ?? 720;
  const height = options.height ?? 180;
  const samplePoints = Math.max(12, options.samplePoints ?? 144);
  const midY = height / 2;
  const amplitude = height * 0.38;
  const points: string[] = [];

  for (let pointIndex = 0; pointIndex < samplePoints; pointIndex += 1) {
    const start = Math.floor((pointIndex / samplePoints) * samples.length);
    const end = Math.max(
      start + 1,
      Math.floor(((pointIndex + 1) / samplePoints) * samples.length)
    );
    let total = 0;
    let count = 0;

    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      total += clampSample(samples[sampleIndex] ?? 0);
      count += 1;
    }

    const average = count > 0 ? total / count : 0;
    const x = (pointIndex / Math.max(1, samplePoints - 1)) * width;
    const y = midY - average * amplitude;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <rect width="${width}" height="${height}" rx="18" ry="18"></rect>
      <path class="sound-debug-waveform-axis" d="M0 ${midY.toFixed(2)} H${width}"></path>
      <polyline class="sound-debug-waveform-shape" points="${points.join(' ')}"></polyline>
    </svg>
  `;
}
