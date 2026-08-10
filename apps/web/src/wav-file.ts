function writeAscii(target: Uint8Array, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    target[offset + index] = value.charCodeAt(index);
  }
}

export function encodeMonoPcm16Wav(options: {
  samples: Float32Array;
  sampleRate: number;
}): Uint8Array {
  const frameCount = options.samples.length;
  const bytesPerSample = 2;
  const dataByteLength = frameCount * bytesPerSample;
  const wav = new Uint8Array(44 + dataByteLength);
  const view = new DataView(wav.buffer);

  writeAscii(wav, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(wav, 8, 'WAVE');
  writeAscii(wav, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, Math.max(1, Math.round(options.sampleRate)), true);
  view.setUint32(
    28,
    Math.max(1, Math.round(options.sampleRate)) * bytesPerSample,
    true
  );
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(wav, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let byteOffset = 44;
  for (let index = 0; index < frameCount; index += 1) {
    const sample = Math.max(-1, Math.min(1, options.samples[index] ?? 0));
    const pcm =
      sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
    view.setInt16(byteOffset, pcm, true);
    byteOffset += bytesPerSample;
  }

  return wav;
}
