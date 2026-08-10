export type ProceduralMusicSongSectionId =
  'intro' | 'a' | 'a-prime' | 'b' | 'variation' | 'return' | 'outro';

export type ProceduralMusicSongSectionTemplate = {
  id: ProceduralMusicSongSectionId;
  label: string;
  baseDurationMs: number;
  measureCount: number;
  loopEligible: boolean;
  occupancy: Partial<
    Record<
      'bass' | 'harmony' | 'lead' | 'percussion',
      {
        minPercentage?: number;
        maxPercentage?: number;
      }
    >
  >;
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
      occupancy: {
        bass: { minPercentage: 15, maxPercentage: 25 },
        harmony: { minPercentage: 70, maxPercentage: 95 },
        lead: { minPercentage: 30, maxPercentage: 55 },
        percussion: { minPercentage: 0, maxPercentage: 0 },
      },
    },
    {
      id: 'a',
      label: 'Section A',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 70, maxPercentage: 85 },
        lead: { minPercentage: 40, maxPercentage: 60 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'a-prime',
      label: "Section A'",
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 45, maxPercentage: 70 },
        lead: { minPercentage: 45, maxPercentage: 65 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'b',
      label: 'Section B',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 30, maxPercentage: 45 },
        lead: { minPercentage: 40, maxPercentage: 55 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'variation',
      label: 'Variation',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 45, maxPercentage: 65 },
        lead: { minPercentage: 60, maxPercentage: 85 },
        percussion: { minPercentage: 0, maxPercentage: 8 },
      },
    },
    {
      id: 'return',
      label: 'Return',
      baseDurationMs: 16_000,
      measureCount: 8,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 70, maxPercentage: 90 },
        lead: { minPercentage: 40, maxPercentage: 60 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'outro',
      label: 'Outro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 80, maxPercentage: 100 },
        lead: { minPercentage: 20, maxPercentage: 40 },
        percussion: { minPercentage: 0, maxPercentage: 0 },
      },
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
      occupancy: {
        bass: { minPercentage: 15, maxPercentage: 25 },
        harmony: { minPercentage: 50, maxPercentage: 65 },
        lead: { minPercentage: 30, maxPercentage: 35 },
        percussion: { minPercentage: 0, maxPercentage: 0 },
      },
    },
    {
      id: 'a',
      label: 'Section A',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 25, maxPercentage: 40 },
        harmony: { minPercentage: 45, maxPercentage: 55 },
        lead: { minPercentage: 30, maxPercentage: 38 },
        percussion: { minPercentage: 5, maxPercentage: 10 },
      },
    },
    {
      id: 'b',
      label: 'Section B',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 30, maxPercentage: 40 },
        harmony: { minPercentage: 20, maxPercentage: 30 },
        lead: { minPercentage: 30, maxPercentage: 38 },
        percussion: { minPercentage: 5, maxPercentage: 10 },
      },
    },
    {
      id: 'a-prime',
      label: "Section A'",
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 25, maxPercentage: 40 },
        harmony: { minPercentage: 30, maxPercentage: 40 },
        lead: { minPercentage: 30, maxPercentage: 40 },
        percussion: { minPercentage: 5, maxPercentage: 10 },
      },
    },
    {
      id: 'return',
      label: 'Return',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 25, maxPercentage: 40 },
        harmony: { minPercentage: 45, maxPercentage: 55 },
        lead: { minPercentage: 30, maxPercentage: 38 },
        percussion: { minPercentage: 5, maxPercentage: 10 },
      },
    },
    {
      id: 'outro',
      label: 'Outro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
      occupancy: {
        bass: { minPercentage: 30, maxPercentage: 40 },
        harmony: { minPercentage: 55, maxPercentage: 70 },
        lead: { minPercentage: 15, maxPercentage: 25 },
        percussion: { minPercentage: 0, maxPercentage: 0 },
      },
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
      occupancy: {
        bass: { minPercentage: 10, maxPercentage: 35 },
        harmony: { minPercentage: 70, maxPercentage: 100 },
        lead: { minPercentage: 35, maxPercentage: 60 },
        percussion: { minPercentage: 0, maxPercentage: 0 },
      },
    },
    {
      id: 'a',
      label: 'Section A',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 70, maxPercentage: 90 },
        lead: { minPercentage: 40, maxPercentage: 65 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'variation',
      label: 'Variation',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 45, maxPercentage: 65 },
        lead: { minPercentage: 60, maxPercentage: 85 },
        percussion: { minPercentage: 0, maxPercentage: 8 },
      },
    },
    {
      id: 'b',
      label: 'Section B',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 30, maxPercentage: 55 },
        lead: { minPercentage: 40, maxPercentage: 60 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'return',
      label: 'Return',
      baseDurationMs: 24_000,
      measureCount: 16,
      loopEligible: true,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 70, maxPercentage: 90 },
        lead: { minPercentage: 40, maxPercentage: 60 },
        percussion: { minPercentage: 5, maxPercentage: 15 },
      },
    },
    {
      id: 'outro',
      label: 'Outro',
      baseDurationMs: 8_000,
      measureCount: 8,
      loopEligible: false,
      occupancy: {
        bass: { minPercentage: 20, maxPercentage: 40 },
        harmony: { minPercentage: 80, maxPercentage: 100 },
        lead: { minPercentage: 20, maxPercentage: 40 },
        percussion: { minPercentage: 0, maxPercentage: 0 },
      },
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
