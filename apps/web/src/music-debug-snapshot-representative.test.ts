import { describe, expect, it } from 'vitest';
import {
  FOREST_KNOWN_GOOD_SNAPSHOT,
  TOWN_KNOWN_GOOD_SNAPSHOT,
} from './testing/music-debug-test-support.ts';

describe('music debug representative snapshots', () => {
  it("keeps Section A' lead prominence above Section A in representative snapshots", () => {
    for (const snapshot of [FOREST_KNOWN_GOOD_SNAPSHOT, TOWN_KNOWN_GOOD_SNAPSHOT]) {
      const prominenceById = new Map(
        snapshot.sectionProminence.map((section) => [
          section.sectionId,
          section,
        ])
      );
      const sectionA = prominenceById.get('a');
      const sectionAPrime = prominenceById.get('a-prime');

      expect(sectionA).toBeDefined();
      expect(sectionAPrime).toBeDefined();
      expect(sectionAPrime!.roles.lead.prominenceScore).toBeGreaterThan(
        sectionA!.roles.lead.prominenceScore
      );
    }
  }, 10_000);

  it('keeps Section B harmony prominence below Section A in representative snapshots', () => {
    for (const snapshot of [FOREST_KNOWN_GOOD_SNAPSHOT, TOWN_KNOWN_GOOD_SNAPSHOT]) {
      const prominenceById = new Map(
        snapshot.sectionProminence.map((section) => [
          section.sectionId,
          section,
        ])
      );
      const sectionA = prominenceById.get('a');
      const sectionB = prominenceById.get('b');

      if (!sectionB) {
        continue;
      }

      expect(sectionA).toBeDefined();
      expect(sectionB.roles.harmony.prominenceScore).toBeLessThan(
        sectionA!.roles.harmony.prominenceScore
      );
    }
  }, 10_000);

  it('reports stable section-plan rule matches for representative snapshots', () => {
    const snapshot = FOREST_KNOWN_GOOD_SNAPSHOT;
    const comparisonsById = new Map(
      snapshot.sectionLayerComparisons.map((comparison) => [
        comparison.sectionId,
        comparison,
      ])
    );
    const intro = comparisonsById.get('intro');
    const sectionA = comparisonsById.get('a');
    const variation = comparisonsById.get('variation');
    const sectionReturn = comparisonsById.get('return');
    const outro = comparisonsById.get('outro');

    expect(snapshot.sectionLayerComparisons).toHaveLength(
      snapshot.song.sections.length
    );
    expect(intro?.matchedRules).toContain('percussion stays absent');
    expect(sectionA?.matchedRules).toContain('all four roles stay active');
    expect(variation?.matchedRules).toContain('lead remains present');
    expect(sectionReturn?.matchedRules).toContain('all four roles return');
    expect(outro?.matchedRules).toContain('percussion drops out');
  });

  it('keeps settled blueprint occupancy comparisons stable for the representative town snapshot', () => {
    const snapshot = TOWN_KNOWN_GOOD_SNAPSHOT;

    expect(snapshot.sectionLayerComparisons).toHaveLength(
      snapshot.song.sections.length
    );
    expect(
      snapshot.sectionLayerComparisons.filter(
        (comparison) => comparison.matchesPlan
      )
    ).toHaveLength(0);
    expect(snapshot.sectionLayerComparisons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectionId: 'intro',
          mismatchRules: ['lead occupancy 42% exceeded blueprint maximum 35%'],
        }),
        expect.objectContaining({
          sectionId: 'b',
          mismatchRules: [
            'harmony occupancy 18% stayed below blueprint minimum 20%',
            'lead occupancy 48% exceeded blueprint maximum 38%',
            'percussion occupancy 3% stayed below blueprint minimum 5%',
          ],
        }),
        expect.objectContaining({
          sectionId: 'a',
          mismatchRules: ['lead occupancy 44% exceeded blueprint maximum 38%'],
        }),
        expect.objectContaining({
          sectionId: 'a-prime',
          mismatchRules: ['lead occupancy 44% exceeded blueprint maximum 40%'],
        }),
        expect.objectContaining({
          sectionId: 'return',
          mismatchRules: ['lead occupancy 45% exceeded blueprint maximum 38%'],
        }),
        expect.objectContaining({
          sectionId: 'outro',
          mismatchRules: [
            'harmony occupancy 41% stayed below blueprint minimum 55%',
          ],
        }),
      ])
    );
  });
});
