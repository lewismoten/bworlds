import { describe, expect, it } from 'vitest';

import {
  resolveKnownGoodInstrumentPatch,
  type KnownGoodInstrumentPatchComparison,
  type KnownGoodInstrumentPatchRole,
} from './music-instrument-timbres.ts';
import {
  collectMusicDebugPatchQualityWarnings,
  resolveMusicDebugPatchQualityTone,
} from './music-debug-patch-quality.ts';
import type {
  ProceduralInstrument,
  ProceduralInstrumentBank,
} from './procedural-music-sound-bank.ts';

describe('music debug patch quality', () => {
  it('returns no warnings for instruments that match their reference targets', () => {
    expect(
      collectMusicDebugPatchQualityWarnings(createInstrumentBank())
    ).toEqual([]);
  });

  it('warns when a generated patch drifts away from its target reference', () => {
    const instrumentBank = createInstrumentBank({
      lead: {
        similarityScore: 0.58,
        familyMatches: false,
        waveformMatches: false,
        prominentDifferences: [
          {
            key: 'brightness',
            similarity: 0.2,
            generatedValue: 1.3,
            referenceValue: 0.9,
          },
          {
            key: 'timbre.noiseMix',
            similarity: 0.15,
            generatedValue: 0.32,
            referenceValue: 0.05,
          },
        ],
      },
    });

    const [warning] = collectMusicDebugPatchQualityWarnings(instrumentBank);
    const leadComparison =
      instrumentBank.instruments.lead.knownGoodPatchComparison;

    expect(resolveMusicDebugPatchQualityTone(leadComparison)).toBe('failure');
    expect(warning).toMatchObject({
      role: 'lead',
      severity: 'failure',
    });
    expect(warning?.message).toContain(
      'Lead patch sounds unlike its target reference'
    );
    expect(warning?.message).toContain(
      'family differs from the reference patch'
    );
    expect(warning?.message).toContain(
      'Largest differences: brightness, noise mix.'
    );
  });
});

function createInstrumentBank(
  overrides: Partial<
    Record<
      keyof ProceduralInstrumentBank['instruments'],
      Partial<KnownGoodInstrumentPatchComparison>
    >
  > = {}
): Pick<ProceduralInstrumentBank, 'instruments'> {
  return {
    instruments: {
      lead: createInstrument('lead', overrides.lead),
      harmony: createInstrument('harmony', overrides.harmony),
      bass: createInstrument('bass', overrides.bass),
      percussion: createInstrument('percussion', overrides.percussion),
    },
  };
}

function createInstrument(
  role: KnownGoodInstrumentPatchRole,
  comparisonOverride: Partial<KnownGoodInstrumentPatchComparison> | undefined
): ProceduralInstrument {
  const referencePatch = resolveKnownGoodInstrumentPatch(role);

  return {
    knownGoodPatchComparison: {
      role,
      referenceLabel: referencePatch.label,
      similarityScore: 1,
      familyMatches: true,
      waveformMatches: true,
      dimensions: {},
      prominentDifferences: [],
      ...comparisonOverride,
    },
  } as ProceduralInstrument;
}
