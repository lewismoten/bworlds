import { describe, expect, it, vi } from 'vitest';

import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  buildMusicDebugPatchWarningPreflightMessage,
  confirmMusicDebugExportPreflight,
} from './music-debug-export-preflight.ts';
import type {
  KnownGoodInstrumentPatchComparison,
  KnownGoodInstrumentPatchRole,
} from './music-instrument-timbres.ts';
import type {
  ProceduralInstrument,
  ProceduralInstrumentBank,
} from './procedural-music-sound-bank.ts';

describe('music debug export preflight', () => {
  it('skips the preflight prompt when no patch-quality warnings exist', () => {
    const snapshot = createSnapshotWithPatchWarnings();

    expect(buildMusicDebugPatchWarningPreflightMessage(snapshot)).toBeNull();
    expect(
      confirmMusicDebugExportPreflight(snapshot, {
        confirm: vi.fn(),
      })
    ).toBe(true);
  });

  it('builds a warning prompt and respects the export confirmation result', () => {
    const snapshot = createSnapshotWithPatchWarnings({
      lead: {
        similarityScore: 0.58,
        familyMatches: false,
        waveformMatches: false,
        prominentDifferences: [
          {
            key: 'brightness',
            similarity: 0.2,
            generatedValue: 1.25,
            referenceValue: 0.9,
          },
        ],
      },
    });
    const confirm = vi.fn(() => false);

    const message = buildMusicDebugPatchWarningPreflightMessage(snapshot);

    expect(message).toContain(
      'Patch quality warnings were detected before export.'
    );
    expect(message).toContain('Lead patch sounds unlike its target reference');
    expect(confirmMusicDebugExportPreflight(snapshot, { confirm })).toBe(false);
    expect(confirm).toHaveBeenCalledWith(message);
  });
});

function createSnapshotWithPatchWarnings(
  overrides: Partial<
    Record<
      keyof ProceduralInstrumentBank['instruments'],
      Partial<KnownGoodInstrumentPatchComparison>
    >
  > = {}
): Pick<MusicDebugSnapshot, 'instrumentBank'> {
  return {
    instrumentBank: {
      themeId: 'deep-forest',
      rolePatchDistinctness: {
        isValid: true,
        rejectedComparisons: [],
        comparisons: [],
      },
      instruments: {
        lead: createInstrument('lead', overrides.lead),
        harmony: createInstrument('harmony', overrides.harmony),
        bass: createInstrument('bass', overrides.bass),
        percussion: createInstrument('percussion', overrides.percussion),
      },
    },
  };
}

function createInstrument(
  role: KnownGoodInstrumentPatchRole,
  comparisonOverride: Partial<KnownGoodInstrumentPatchComparison> | undefined
): ProceduralInstrument {
  return {
    knownGoodPatchComparison: {
      role,
      referenceLabel: `${role} reference`,
      similarityScore: 1,
      familyMatches: true,
      waveformMatches: true,
      dimensions: {},
      prominentDifferences: [],
      ...comparisonOverride,
    },
  } as ProceduralInstrument;
}
