export type ProceduralMusicSongSectionId =
  'intro' | 'a' | 'a-prime' | 'b' | 'variation' | 'return' | 'outro';

export type ProceduralMusicSongSectionTemplate = {
  id: ProceduralMusicSongSectionId;
  label: string;
  baseDurationMs: number;
  measureCount: number;
  loopEligible: boolean;
};

export type ProceduralMusicBlueprint = {
  id: 'exploration-cycle' | 'settled-chorus' | 'echoed-descent';
  label: string;
  sections: readonly ProceduralMusicSongSectionTemplate[];
};

const EXPLORATION_BLUEPRINT: ProceduralMusicBlueprint = {
  id: 'exploration-cycle',
  label: "Intro 8 / A16 / A'16 / B16 / Variation 16 / Return 8 / Outro 8",
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
    },
    {
      id: 'a',
      label: 'Section A',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'a-prime',
      label: "Section A'",
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'b',
      label: 'Section B',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'variation',
      label: 'Variation',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'return',
      label: 'Return',
      baseDurationMs: 16_000,
      measureCount: 8,
      loopEligible: true,
    },
    {
      id: 'outro',
      label: 'Outro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
    },
  ],
};

const SETTLED_BLUEPRINT: ProceduralMusicBlueprint = {
  id: 'settled-chorus',
  label: "Intro 8 / A16 / B16 / A'16 / Return 16 / Outro 8",
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
    },
    {
      id: 'a',
      label: 'Section A',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'b',
      label: 'Section B',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'a-prime',
      label: "Section A'",
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'return',
      label: 'Return',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'outro',
      label: 'Outro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
    },
  ],
};

const CAVERN_BLUEPRINT: ProceduralMusicBlueprint = {
  id: 'echoed-descent',
  label: 'Intro 8 / A16 / Variation 16 / B16 / Return 16 / Outro 8',
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
    },
    {
      id: 'a',
      label: 'Section A',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'variation',
      label: 'Variation',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'b',
      label: 'Section B',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'return',
      label: 'Return',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
    },
    {
      id: 'outro',
      label: 'Outro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
    },
  ],
};

export function resolveProceduralMusicBlueprintMeasureCount(
  blueprint: ProceduralMusicBlueprint
): number {
  return blueprint.sections.reduce(
    (total, section) => total + section.measureCount,
    0
  );
}

export function resolveProceduralMusicBlueprint(options: {
  tileKind?: string;
  contextType?: string;
  clusterX?: number;
  clusterY?: number;
}): ProceduralMusicBlueprint {
  const contextType = options.contextType ?? 'overworld';
  const tileKind = options.tileKind ?? 'plains';

  if (
    contextType === 'town' ||
    tileKind === 'town' ||
    contextType === 'building'
  ) {
    return SETTLED_BLUEPRINT;
  }
  if (
    contextType === 'cave' ||
    contextType === 'dungeon' ||
    tileKind === 'cave'
  ) {
    return CAVERN_BLUEPRINT;
  }
  return EXPLORATION_BLUEPRINT;
}
