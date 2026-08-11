import { describe, expect, it, vi } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
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
) {
  const snapshot = createMusicDebugSnapshot({
    tileKind: 'forest',
    contextType: 'overworld',
    clusterX: 2,
    clusterY: -1,
  });

  return {
    ...snapshot,
    instrumentBank: {
      ...snapshot.instrumentBank,
      instruments: {
        lead: createInstrument(
          snapshot.instrumentBank.instruments.lead,
          'lead',
          overrides.lead
        ),
        harmony: createInstrument(
          snapshot.instrumentBank.instruments.harmony,
          'harmony',
          overrides.harmony
        ),
        bass: createInstrument(
          snapshot.instrumentBank.instruments.bass,
          'bass',
          overrides.bass
        ),
        percussion: createInstrument(
          snapshot.instrumentBank.instruments.percussion,
          'percussion',
          overrides.percussion
        ),
      },
    },
  };
}

function createInstrument(
  instrument: ProceduralInstrument,
  role: KnownGoodInstrumentPatchRole,
  comparisonOverride: Partial<KnownGoodInstrumentPatchComparison> | undefined
): ProceduralInstrument {
  return {
    ...instrument,
    knownGoodPatchComparison: {
      ...instrument.knownGoodPatchComparison,
      role,
      similarityScore: 1,
      familyMatches: true,
      waveformMatches: true,
      prominentDifferences: [],
      ...comparisonOverride,
    },
  };
}
