import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  collectMusicDebugPatchQualityWarnings,
  resolveMusicDebugPatchQualityTone,
} from './music-debug-patch-quality.ts';

describe('music debug patch quality', () => {
  it('returns no warnings for instruments that match their reference targets', () => {
    const snapshot = withPerfectPatchComparisons(
      createMusicDebugSnapshot({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 4,
        clusterY: -1,
      })
    );

    expect(
      collectMusicDebugPatchQualityWarnings(snapshot.instrumentBank)
    ).toEqual([]);
  });

  it('warns when a generated patch drifts away from its target reference', () => {
    const snapshot = withPerfectPatchComparisons(
      createMusicDebugSnapshot({
        tileKind: 'town',
        contextType: 'town',
        clusterX: 3,
        clusterY: -2,
      })
    );
    const warningSnapshot = {
      ...snapshot,
      instrumentBank: {
        ...snapshot.instrumentBank,
        instruments: {
          ...snapshot.instrumentBank.instruments,
          lead: {
            ...snapshot.instrumentBank.instruments.lead,
            knownGoodPatchComparison: {
              ...snapshot.instrumentBank.instruments.lead
                .knownGoodPatchComparison,
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
          },
        },
      },
    };

    const [warning] = collectMusicDebugPatchQualityWarnings(
      warningSnapshot.instrumentBank
    );

    expect(
      resolveMusicDebugPatchQualityTone(
        warningSnapshot.instrumentBank.instruments.lead.knownGoodPatchComparison
      )
    ).toBe('failure');
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

function withPerfectPatchComparisons(
  snapshot: ReturnType<typeof createMusicDebugSnapshot>
): ReturnType<typeof createMusicDebugSnapshot> {
  return {
    ...snapshot,
    instrumentBank: {
      ...snapshot.instrumentBank,
      instruments: {
        lead: toPerfectPatchComparison(
          snapshot.instrumentBank.instruments.lead
        ),
        harmony: toPerfectPatchComparison(
          snapshot.instrumentBank.instruments.harmony
        ),
        bass: toPerfectPatchComparison(
          snapshot.instrumentBank.instruments.bass
        ),
        percussion: toPerfectPatchComparison(
          snapshot.instrumentBank.instruments.percussion
        ),
      },
    },
  };
}

function toPerfectPatchComparison<
  T extends ReturnType<
    typeof createMusicDebugSnapshot
  >['instrumentBank']['instruments'][keyof ReturnType<
    typeof createMusicDebugSnapshot
  >['instrumentBank']['instruments']],
>(instrument: T): T {
  return {
    ...instrument,
    knownGoodPatchComparison: {
      ...instrument.knownGoodPatchComparison,
      similarityScore: 1,
      familyMatches: true,
      waveformMatches: true,
      prominentDifferences: [],
    },
  };
}
