export type ProceduralMeterPosition = {
  beatIndex: 0 | 1 | 2 | 3;
  beatNumber: 1 | 2 | 3 | 4;
  isStrongBeat: boolean;
};

export function resolveProceduralMeterPosition(
  stepIndex: number
): ProceduralMeterPosition {
  const beatIndex = ((stepIndex % 4) + 4) % 4;
  return {
    beatIndex: beatIndex as ProceduralMeterPosition['beatIndex'],
    beatNumber: (beatIndex + 1) as ProceduralMeterPosition['beatNumber'],
    isStrongBeat: beatIndex === 0 || beatIndex === 2,
  };
}

export function resolveProceduralMeterAccent(
  role: 'lead' | 'harmony' | 'bass' | 'percussion',
  stepIndex: number
): {
  volumeMultiplier: number;
  durationMultiplier: number;
  pulseRateMultiplier: number;
} {
  const meter = resolveProceduralMeterPosition(stepIndex);
  if (meter.isStrongBeat) {
    return {
      volumeMultiplier: role === 'lead' ? 1.16 : role === 'bass' ? 1.14 : 1.06,
      durationMultiplier: role === 'bass' ? 1.1 : role === 'lead' ? 1.04 : 1.02,
      pulseRateMultiplier: role === 'percussion' ? 1.12 : 1.04,
    };
  }

  return {
    volumeMultiplier: role === 'lead' ? 0.94 : role === 'harmony' ? 0.96 : 0.98,
    durationMultiplier: role === 'percussion' ? 0.92 : 0.98,
    pulseRateMultiplier: role === 'percussion' ? 0.94 : 0.98,
  };
}
