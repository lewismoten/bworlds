import { describe, expect, it } from 'vitest';
import { getTownBuildingPlots, getTownProfile } from './index.ts';

describe('town support', () => {
  it('derives deterministic town levels, population, and building counts', () => {
    const profile = getTownProfile(3, 7);

    expect(profile).toEqual(getTownProfile(3, 7));
    expect(profile.level).toBeGreaterThanOrEqual(1);
    expect(profile.level).toBeLessThanOrEqual(4);
    expect(profile.population).toBeGreaterThan(profile.buildingCount);
  });

  it('returns a building mix that matches the shared town profile counts', () => {
    const profile = getTownProfile(3, 7);
    const plots = getTownBuildingPlots(3, 7);

    expect(plots).toHaveLength(profile.buildingCount);
    expect(
      plots.filter((plot) => plot.role === 'professional')
    ).toHaveLength(profile.professionalBuildings);
    expect(
      plots.filter((plot) => plot.role === 'residential')
    ).toHaveLength(profile.residentialBuildings);
  });

  it('scales building counts upward for at least some higher-level towns', () => {
    const signatures = new Set(
      [
        [1, 1],
        [12, -4],
        [25, 9],
        [48, -16],
        [120, -80],
      ].map(([x, y]) => {
        const profile = getTownProfile(x, y);
        return `${profile.level}:${profile.buildingCount}:${profile.population}`;
      })
    );

    expect(signatures.size).toBeGreaterThan(1);
  });
});
