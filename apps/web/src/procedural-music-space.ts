export type MusicSpaceProfile = {
  id: 'outdoor-air' | 'settlement-hall' | 'stone-landmark' | 'cavern-echo';
  label: string;
  wetGain: number;
  delayMs: number;
  toneHz: number;
};

export function resolveMusicSpaceProfile(options: {
  tileKind?: string;
  contextType?: string;
}): MusicSpaceProfile {
  if (
    options.contextType === 'cave' ||
    options.contextType === 'dungeon' ||
    options.tileKind === 'cave' ||
    options.tileKind === 'dungeon'
  ) {
    return {
      id: 'cavern-echo',
      label: 'cavern echo',
      wetGain: 0.34,
      delayMs: 148,
      toneHz: 1_650,
    };
  }

  if (
    options.contextType === 'building' ||
    options.contextType === 'town' ||
    options.tileKind === 'floor' ||
    options.tileKind === 'shop' ||
    options.tileKind === 'town'
  ) {
    return {
      id: 'settlement-hall',
      label: 'settlement hall',
      wetGain: 0.22,
      delayMs: 92,
      toneHz: 2_100,
    };
  }

  if (
    options.tileKind === 'ruins' ||
    options.tileKind === 'tower' ||
    options.tileKind === 'stronghold' ||
    options.tileKind === 'observatory' ||
    options.tileKind === 'lighthouse' ||
    options.tileKind === 'quarry'
  ) {
    return {
      id: 'stone-landmark',
      label: 'stone chamber',
      wetGain: 0.26,
      delayMs: 116,
      toneHz: 1_900,
    };
  }

  return {
    id: 'outdoor-air',
    label: 'open air',
    wetGain: 0.12,
    delayMs: 58,
    toneHz: 2_600,
  };
}
